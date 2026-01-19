<?php
/**
 * Approve Order API
 * Allows admin to approve a pending order
 * Changes status from 'Pending Approval' to 'Waiting Payment'
 */

// Suppress PHP errors from output - send to error log instead
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json');
// When using credentials, we must specify the origin, not use *
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : 
          (isset($_SERVER['HTTP_REFERER']) ? parse_url($_SERVER['HTTP_REFERER'], PHP_URL_SCHEME) . '://' . parse_url($_SERVER['HTTP_REFERER'], PHP_URL_HOST) : '*');
header('Access-Control-Allow-Origin: ' . $origin);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../includes/db_functions.php';
require_once __DIR__ . '/../includes/session_helper.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Close any existing session first
if (session_status() !== PHP_SESSION_NONE) {
    session_write_close();
}

// Set cookie parameters BEFORE session name (critical for cookie path)
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/MatarixWEB/',
    'domain' => '',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax'
]);

// Start admin session with correct name
session_name('MATARIX_ADMIN_SESSION');
session_start();

// Debug logging
error_log("Approve Order - Session Name: " . session_name());
error_log("Approve Order - Session ID: " . session_id());
error_log("Approve Order - Session Status: " . session_status());
error_log("Approve Order - Cookies: " . json_encode($_COOKIE));
error_log("Approve Order - Session Data: " . json_encode($_SESSION));

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'User not authenticated. Please log in again.',
        'debug' => [
            'session_name' => session_name(),
            'session_id' => session_id(),
            'session_status' => session_status(),
            'has_user_id' => isset($_SESSION['user_id']),
            'has_logged_in' => isset($_SESSION['logged_in']),
            'session_keys' => array_keys($_SESSION ?? []),
            'cookies_received' => array_keys($_COOKIE ?? []),
            'admin_session_cookie' => $_COOKIE['MATARIX_ADMIN_SESSION'] ?? 'NOT SET'
        ]
    ]);
    exit;
}

// Check if user is admin
$userRole = $_SESSION['user_role'] ?? '';
if (!in_array($userRole, ['Admin', 'Store Employee'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Access denied. Only admins can approve orders.'
    ]);
    exit;
}

// Get request data
$data = json_decode(file_get_contents('php://input'), true);
$orderId = $data['order_id'] ?? null;

if (!$orderId) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Order ID is required'
    ]);
    exit;
}

$db = new DatabaseFunctions();
$pdo = $db->getConnection();

try {
    $pdo->beginTransaction();
    
    // Get current order status
    $stmt = $pdo->prepare("SELECT status FROM orders WHERE Order_ID = :order_id");
    $stmt->execute(['order_id' => (int)$orderId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Order not found'
        ]);
        exit;
    }
    
    // Check if order is in 'Pending Approval' status
    if ($order['status'] !== 'Pending Approval') {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Order is not pending approval. Current status: ' . $order['status']
        ]);
        exit;
    }
    
    // Update order status to 'Waiting Payment' and record approval
    $stmt = $pdo->prepare("
        UPDATE orders 
        SET status = 'Waiting Payment',
            approved_at = NOW(),
            approved_by = :admin_id,
            last_updated = NOW()
        WHERE Order_ID = :order_id
    ");
    $stmt->execute([
        'order_id' => (int)$orderId,
        'admin_id' => $_SESSION['user_id']
    ]);
    
    if ($stmt->rowCount() === 0) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to approve order'
        ]);
        exit;
    }
    
    $pdo->commit();
    
    // Get customer info for notifications
    $customerStmt = $pdo->prepare("SELECT u.User_ID, u.First_Name, u.Middle_Name, u.Last_Name FROM orders o JOIN users u ON o.User_ID = u.User_ID WHERE o.Order_ID = :order_id");
    $customerStmt->execute(['order_id' => (int)$orderId]);
    $customer = $customerStmt->fetch(PDO::FETCH_ASSOC);
    $customerName = trim(($customer['First_Name'] ?? '') . ' ' . ($customer['Middle_Name'] ?? '') . ' ' . ($customer['Last_Name'] ?? ''));
    $customerUserId = $customer['User_ID'] ?? null;
    
    // Create admin notification for order approved
    require_once __DIR__ . '/create_admin_activity_notification.php';
    createAdminActivityNotification($pdo, 'order_approved', [
        'order_id' => (int)$orderId,
        'customer_name' => $customerName,
        'message' => "Order #{$orderId} has been approved" . ($customerName ? " (Customer: {$customerName})" : '')
    ]);
    
    // Create customer notification for order approved
    if ($customerUserId) {
        require_once __DIR__ . '/create_customer_notification.php';
        createCustomerNotification($pdo, $customerUserId, 'order_approved', [
            'order_id' => (int)$orderId,
            'message' => "Your order #{$orderId} has been approved! You can now proceed with payment."
        ]);
        
        // Send SMS notification for order approved
        try {
            $phoneStmt = $pdo->prepare("SELECT Phone_Number FROM users WHERE User_ID = :user_id");
            $phoneStmt->execute(['user_id' => $customerUserId]);
            $phoneNumber = $phoneStmt->fetchColumn();
            
            if ($phoneNumber && !empty($phoneNumber)) {
                require_once __DIR__ . '/../includes/sms_sender.php';
                $smsSender = new SMSSender();
                $smsResult = $smsSender->sendOrderApprovedSMS($phoneNumber, (int)$orderId);
                
                if (!$smsResult['success']) {
                    error_log("SMS notification failed for order approval: " . $smsResult['message']);
                    // Don't fail the whole operation if SMS fails
                }
            }
        } catch (Exception $e) {
            error_log("SMS notification exception for order approval: " . $e->getMessage());
            // Don't fail the whole operation if SMS fails
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Order approved successfully. Customer can now proceed with payment.',
        'order_id' => $orderId,
        'new_status' => 'Waiting Payment'
    ]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Approve Order Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to approve order: ' . $e->getMessage()
    ]);
}
?>


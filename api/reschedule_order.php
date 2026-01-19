<?php
/**
 * Reschedule Order API
 * Allows customers to reschedule a cancelled order by updating the delivery date
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, PUT');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../includes/db_functions.php';
require_once __DIR__ . '/../includes/session_helper.php';

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

// Start customer session
session_name('MATARIX_CUSTOMER_SESSION');
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'User not authenticated. Please log in again.'
    ]);
    exit;
}

// Get request data
$data = json_decode(file_get_contents('php://input'), true);
$orderId = $data['order_id'] ?? null;
$availabilityDate = $data['availability_date'] ?? null;

// Validate input
if (!$orderId) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Order ID is required'
    ]);
    exit;
}

if (!$availabilityDate) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Availability date is required'
    ]);
    exit;
}

// Validate date format (YYYY-MM-DD)
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $availabilityDate)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid date format. Expected YYYY-MM-DD'
    ]);
    exit;
}

$db = new DatabaseFunctions();
$pdo = $db->getConnection();

try {
    $pdo->beginTransaction();
    
    $userId = $_SESSION['user_id'];
    
    // Verify order belongs to user and is cancelled
    $stmt = $pdo->prepare("
        SELECT o.Order_ID, o.status, o.User_ID, d.Delivery_ID
        FROM orders o
        LEFT JOIN deliveries d ON o.Order_ID = d.Order_ID
        WHERE o.Order_ID = :order_id AND o.User_ID = :user_id
    ");
    $stmt->execute([
        'order_id' => (int)$orderId,
        'user_id' => $userId
    ]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Order not found or you do not have permission to reschedule it'
        ]);
        exit;
    }
    
    // Check if order is cancelled (delivery status should be Cancelled)
    // We'll check the delivery status, but also allow rescheduling if order status is Cancelled
    $deliveryId = $order['Delivery_ID'] ?? null;
    $isCancelled = false;
    
    if ($deliveryId) {
        $stmt = $pdo->prepare("SELECT Delivery_Status FROM deliveries WHERE Delivery_ID = :delivery_id");
        $stmt->execute(['delivery_id' => $deliveryId]);
        $delivery = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($delivery && ($delivery['Delivery_Status'] === 'Cancelled' || $delivery['Delivery_Status'] === 'cancelled')) {
            $isCancelled = true;
        }
    }
    
    // Also check if order status indicates cancellation
    if ($order['status'] === 'Cancelled' || $order['status'] === 'cancelled') {
        $isCancelled = true;
    }
    
    if (!$isCancelled) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'This order cannot be rescheduled. Only cancelled orders can be rescheduled.'
        ]);
        exit;
    }
    
    // Update order availability_date
    $stmt = $pdo->prepare("
        UPDATE orders 
        SET availability_date = :availability_date,
            availability_time = NULL,
            status = 'Pending Approval',
            last_updated = NOW()
        WHERE Order_ID = :order_id
    ");
    $stmt->execute([
        'availability_date' => $availabilityDate,
        'order_id' => (int)$orderId
    ]);
    
    // Update or create order_availability_slots entry
    // First, check if slots exist
    $stmt = $pdo->prepare("SELECT slot_number FROM order_availability_slots WHERE order_id = :order_id");
    $stmt->execute(['order_id' => (int)$orderId]);
    $existingSlots = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($existingSlots)) {
        // Create new slot entry
        $stmt = $pdo->prepare("
            INSERT INTO order_availability_slots (order_id, slot_number, availability_date, availability_time, is_preferred)
            VALUES (:order_id, 1, :availability_date, NULL, 1)
        ");
        $stmt->execute([
            'order_id' => (int)$orderId,
            'availability_date' => $availabilityDate
        ]);
    } else {
        // Update existing preferred slot
        $stmt = $pdo->prepare("
            UPDATE order_availability_slots 
            SET availability_date = :availability_date,
                availability_time = NULL,
                is_preferred = 1
            WHERE order_id = :order_id AND slot_number = 1
        ");
        $stmt->execute([
            'availability_date' => $availabilityDate,
            'order_id' => (int)$orderId
        ]);
        
        // Mark other slots as not preferred
        $stmt = $pdo->prepare("
            UPDATE order_availability_slots 
            SET is_preferred = 0
            WHERE order_id = :order_id AND slot_number != 1
        ");
        $stmt->execute(['order_id' => (int)$orderId]);
    }
    
    // Update delivery status from Cancelled to Pending
    if ($deliveryId) {
        $stmt = $pdo->prepare("
            UPDATE deliveries 
            SET Delivery_Status = 'Pending',
                Updated_At = NOW()
            WHERE Delivery_ID = :delivery_id
        ");
        $stmt->execute(['delivery_id' => $deliveryId]);
    } else {
        // Create delivery record if it doesn't exist
        $stmt = $pdo->prepare("
            INSERT INTO deliveries (Order_ID, Delivery_Status, Created_At, Updated_At)
            VALUES (:order_id, 'Pending', NOW(), NOW())
        ");
        $stmt->execute(['order_id' => (int)$orderId]);
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Order rescheduled successfully. The order is now pending approval again.',
        'order_id' => $orderId,
        'availability_date' => $availabilityDate
    ]);
    
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Reschedule Order Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to reschedule order: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Reschedule Order Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to reschedule order: ' . $e->getMessage()
    ]);
}
?>


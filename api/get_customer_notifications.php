<?php
/**
 * Get Customer Notifications API
 * Returns notifications for customer users
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

require_once __DIR__ . '/../includes/db_functions.php';
require_once __DIR__ . '/../includes/session_helper.php';

// Start customer session
if (session_status() !== PHP_SESSION_NONE) {
    @session_write_close();
}

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/MatarixWEB/',
    'domain' => '',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_name('MATARIX_CUSTOMER_SESSION');
@session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated'
    ]);
    exit;
}

$userId = $_SESSION['user_id'];
$db = new DatabaseFunctions();
$pdo = $db->getConnection();

try {
    // Check if notifications table exists
    $checkTableStmt = $pdo->query("SHOW TABLES LIKE 'customer_notifications'");
    $tableExists = $checkTableStmt->rowCount() > 0;
    
    if (!$tableExists) {
        echo json_encode([
            'success' => true,
            'notifications' => [],
            'unread_count' => 0,
            'message' => 'Notifications table does not exist yet'
        ]);
        exit;
    }
    
    // Get all notifications (or unread only if specified)
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $unreadOnly = isset($_GET['unread_only']) && $_GET['unread_only'] === 'true';
    
    if ($unreadOnly) {
        $stmt = $pdo->prepare("
            SELECT 
                Notification_ID,
                Activity_Type,
                Order_ID,
                Message,
                Is_Read,
                Created_At
            FROM customer_notifications
            WHERE User_ID = :user_id AND Is_Read = 0
            ORDER BY Created_At DESC
            LIMIT :limit
        ");
    } else {
        $stmt = $pdo->prepare("
            SELECT 
                Notification_ID,
                Activity_Type,
                Order_ID,
                Message,
                Is_Read,
                Created_At
            FROM customer_notifications
            WHERE User_ID = :user_id
            ORDER BY Created_At DESC
            LIMIT :limit
        ");
    }
    $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format notifications
    $formattedNotifications = [];
    foreach ($notifications as $notification) {
        $formattedNotifications[] = [
            'id' => (int)$notification['Notification_ID'],
            'activity_type' => $notification['Activity_Type'] ?? 'order_approved',
            'order_id' => $notification['Order_ID'] ? (int)$notification['Order_ID'] : null,
            'message' => $notification['Message'],
            'is_read' => (bool)$notification['Is_Read'],
            'created_at' => $notification['Created_At']
        ];
    }
    
    // Get total unread count
    $countStmt = $pdo->prepare("SELECT COUNT(*) as unread_count FROM customer_notifications WHERE User_ID = :user_id AND Is_Read = 0");
    $countStmt->execute(['user_id' => $userId]);
    $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $unreadCount = (int)$countResult['unread_count'];
    
    echo json_encode([
        'success' => true,
        'notifications' => $formattedNotifications,
        'unread_count' => $unreadCount
    ]);
    
} catch (PDOException $e) {
    error_log("Get Customer Notifications Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch notifications: ' . $e->getMessage()
    ]);
}
?>

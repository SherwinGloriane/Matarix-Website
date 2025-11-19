<?php
/**
 * Get Delivery Status API
 * Returns delivery status for a specific order
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../includes/db_functions.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$orderId = isset($_GET['order_id']) ? (int)$_GET['order_id'] : null;
$userId = $_SESSION['user_id'];

if (!$orderId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Order ID is required']);
    exit;
}

$db = new DatabaseFunctions();
$pdo = $db->getConnection();

try {
    // First verify that the order belongs to the logged-in user
    $verifyStmt = $pdo->prepare("SELECT Order_ID FROM orders WHERE Order_ID = :order_id AND User_ID = :user_id");
    $verifyStmt->execute(['order_id' => $orderId, 'user_id' => $userId]);
    $orderExists = $verifyStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$orderExists) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access denied: Order does not belong to you']);
        exit;
    }
    
    // Get delivery status for the order (only if order belongs to user)
    $stmt = $pdo->prepare("
        SELECT 
            d.Delivery_ID,
            d.Order_ID,
            d.Delivery_Status,
            d.delivery_details,
            d.Created_At,
            d.Updated_At
        FROM deliveries d
        WHERE d.Order_ID = :order_id
        ORDER BY d.Created_At DESC
        LIMIT 1
    ");
    $stmt->execute(['order_id' => $orderId]);
    $delivery = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($delivery) {
        echo json_encode([
            'success' => true,
            'delivery' => $delivery
        ]);
    } else {
        // No delivery record found, return default status
        echo json_encode([
            'success' => true,
            'delivery' => [
                'Order_ID' => $orderId,
                'Delivery_Status' => 'Pending'
            ]
        ]);
    }
    
} catch (PDOException $e) {
    error_log("Get Delivery Status Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to fetch delivery status']);
}
?>


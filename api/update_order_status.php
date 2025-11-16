<?php
/**
 * Update Order Status API
 * Updates the status of an order
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../includes/db_functions.php';

$data = json_decode(file_get_contents('php://input'), true);
$orderId = $data['order_id'] ?? null;
$status = $data['status'] ?? null;

if (!$orderId || !$status) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Order ID and status are required'
    ]);
    exit;
}

$db = new DatabaseFunctions();
$pdo = $db->getConnection();

try {
    // Validate status value
    $validStatuses = ['Order Confirmed', 'Being Processed', 'On the Way', 'Completed'];
    if (!in_array($status, $validStatuses)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid status value. Must be one of: ' . implode(', ', $validStatuses)
        ]);
        exit;
    }
    
    $stmt = $pdo->prepare("
        UPDATE orders 
        SET status = :status,
            last_updated = NOW()
        WHERE Order_ID = :order_id
    ");
    $result = $stmt->execute([
        'status' => $status,
        'order_id' => (int)$orderId
    ]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Order status updated successfully',
            'order_id' => $orderId,
            'new_status' => $status
        ]);
    } else {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Order not found or no changes made'
        ]);
    }
    
} catch (PDOException $e) {
    error_log("Update Order Status Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update order status: ' . $e->getMessage()
    ]);
}
?>


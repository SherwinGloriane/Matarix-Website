<?php
/**
 * Update Payment Status API
 * Updates payment status and decreases stock when status changes to 'Paid'
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../includes/db_functions.php';

// Check if user is admin (optional)
// if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'Admin') {
//     http_response_code(403);
//     echo json_encode(['success' => false, 'message' => 'Access denied']);
//     exit;
// }

$data = json_decode(file_get_contents('php://input'), true);
$orderId = $data['order_id'] ?? null;
$paymentStatus = $data['payment_status'] ?? null; // 'Paid' or 'To Pay'

if (!$orderId || !$paymentStatus) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Order ID and payment status are required'
    ]);
    exit;
}

$db = new DatabaseFunctions();
$pdo = $db->getConnection();

try {
    $pdo->beginTransaction();
    
    // Get current payment status
    $stmt = $pdo->prepare("SELECT payment FROM orders WHERE Order_ID = :order_id");
    $stmt->execute(['order_id' => $orderId]);
    $currentOrder = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$currentOrder) {
        throw new Exception('Order not found');
    }
    
    $wasPaid = ($currentOrder['payment'] === 'Paid');
    
    // Map payment status values
    $orderPaymentStatus = ($paymentStatus === 'Paid') ? 'Paid' : 'To Pay';
    $transactionPaymentStatus = ($paymentStatus === 'Paid') ? 'Paid' : 'Pending';
    
    // Update order payment status
    $stmt = $pdo->prepare("
        UPDATE orders 
        SET payment = :payment_status,
            last_updated = NOW()
        WHERE Order_ID = :order_id
    ");
    $stmt->execute([
        'payment_status' => $orderPaymentStatus,
        'order_id' => (int)$orderId
    ]);
    
    if ($stmt->rowCount() === 0) {
        throw new Exception('Order not found');
    }
    
    // Update transaction payment status
    $stmt = $pdo->prepare("
        UPDATE transactions 
        SET Payment_Status = :payment_status,
            Updated_At = NOW()
        WHERE Order_ID = :order_id
    ");
    $stmt->execute([
        'payment_status' => $transactionPaymentStatus,
        'order_id' => (int)$orderId
    ]);
    
    // If changing to 'Paid', decrease stock
    // If changing from 'Paid' to 'To Pay', increase stock back
    if ($orderPaymentStatus === 'Paid' && !$wasPaid) {
        // Get order items
        $stmt = $pdo->prepare("
            SELECT Product_ID, Quantity 
            FROM transaction_items 
            WHERE Order_ID = :order_id
        ");
        $stmt->execute(['order_id' => $orderId]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decrease stock for each item
        foreach ($items as $item) {
            $stmt = $pdo->prepare("
                UPDATE products 
                SET stock_level = stock_level - :quantity
                WHERE Product_ID = :product_id
            ");
            $stmt->execute([
                'quantity' => $item['Quantity'],
                'product_id' => $item['Product_ID']
            ]);
            
            // Update stock status
            $stmt = $pdo->prepare("
                UPDATE products 
                SET stock_status = CASE
                    WHEN stock_level <= 0 THEN 'Out of Stock'
                    WHEN stock_level <= Minimum_Stock THEN 'Low Stock'
                    ELSE 'In Stock'
                END
                WHERE Product_ID = :product_id
            ");
            $stmt->execute(['product_id' => $item['Product_ID']]);
        }
    } else if ($orderPaymentStatus === 'To Pay' && $wasPaid) {
        // Increase stock back if changing from Paid to To Pay
        $stmt = $pdo->prepare("
            SELECT Product_ID, Quantity 
            FROM transaction_items 
            WHERE Order_ID = :order_id
        ");
        $stmt->execute(['order_id' => $orderId]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($items as $item) {
            $stmt = $pdo->prepare("
                UPDATE products 
                SET stock_level = stock_level + :quantity
                WHERE Product_ID = :product_id
            ");
            $stmt->execute([
                'quantity' => $item['Quantity'],
                'product_id' => $item['Product_ID']
            ]);
            
            // Update stock status
            $stmt = $pdo->prepare("
                UPDATE products 
                SET stock_status = CASE
                    WHEN stock_level <= 0 THEN 'Out of Stock'
                    WHEN stock_level <= Minimum_Stock THEN 'Low Stock'
                    ELSE 'In Stock'
                END
                WHERE Product_ID = :product_id
            ");
            $stmt->execute(['product_id' => $item['Product_ID']]);
        }
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Payment status updated successfully',
        'order_id' => $orderId,
        'payment_status' => $orderPaymentStatus,
        'stock_updated' => ($orderPaymentStatus === 'Paid' && !$wasPaid) || ($orderPaymentStatus === 'To Pay' && $wasPaid)
    ]);
    
} catch (Exception $e) {
    $pdo->rollBack();
    error_log("Update Payment Status Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update payment status: ' . $e->getMessage()
    ]);
}
?>


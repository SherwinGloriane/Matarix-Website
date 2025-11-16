<?php
/**
 * Get Orders API
 * Returns all orders for admin view
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../includes/db_functions.php';

// Check if user is admin (optional - can be removed if not needed)
// if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'Admin') {
//     http_response_code(403);
//     echo json_encode(['success' => false, 'message' => 'Access denied']);
//     exit;
// }

$db = new DatabaseFunctions();

try {
    $pdo = $db->getConnection();
    
    // Get all orders with user and transaction details
    $sql = "
        SELECT 
            o.Order_ID,
            o.User_ID,
            o.order_date,
            o.status,
            o.payment,
            o.amount,
            o.payment_method,
            o.last_updated,
            u.First_Name,
            u.Last_Name,
            u.email,
            u.Phone_Number,
            u.address,
            t.Transaction_ID,
            t.Payment_Status,
            t.proof_of_payment
        FROM orders o
        LEFT JOIN users u ON o.User_ID = u.User_ID
        LEFT JOIN transactions t ON t.Order_ID = o.Order_ID
        ORDER BY o.order_date DESC
    ";
    
    $stmt = $pdo->query($sql);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get order items for each order
    foreach ($orders as &$order) {
        $stmt = $pdo->prepare("
            SELECT 
                ti.Item_ID,
                ti.Product_ID,
                ti.Quantity,
                ti.Price,
                p.Product_Name,
                p.category
            FROM transaction_items ti
            JOIN products p ON ti.Product_ID = p.Product_ID
            WHERE ti.Order_ID = :order_id
        ");
        $stmt->execute(['order_id' => $order['Order_ID']]);
        $order['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format customer name
        $order['customer_name'] = trim(($order['First_Name'] ?? '') . ' ' . ($order['Last_Name'] ?? ''));
    }
    
    echo json_encode([
        'success' => true,
        'orders' => $orders
    ]);
    
} catch (PDOException $e) {
    error_log("Get Orders Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch orders'
    ]);
}
?>


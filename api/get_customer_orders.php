<?php
/**
 * Get Customer Orders API
 * Returns orders for the logged-in customer
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../includes/db_functions.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$userId = $_SESSION['user_id'];
$orderId = isset($_GET['order_id']) ? (int)$_GET['order_id'] : null;

$db = new DatabaseFunctions();

try {
    $pdo = $db->getConnection();
    
    if ($orderId) {
        // Get specific order
        $sql = "
            SELECT 
                o.Order_ID,
                o.order_date,
                o.status,
                o.payment,
                o.amount,
                o.payment_method,
                o.last_updated,
                t.Transaction_ID,
                t.Payment_Status,
                t.proof_of_payment,
                t.Payment_Method as transaction_payment_method
            FROM orders o
            LEFT JOIN transactions t ON t.Order_ID = o.Order_ID
            WHERE o.Order_ID = :order_id AND o.User_ID = :user_id
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['order_id' => $orderId, 'user_id' => $userId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Order not found']);
            exit;
        }
        
        // Get order items
        $stmt = $pdo->prepare("
            SELECT 
                ti.Item_ID,
                ti.Product_ID,
                ti.Quantity,
                ti.Price,
                p.Product_Name,
                p.category,
                p.length,
                p.Width,
                p.Unit
            FROM transaction_items ti
            JOIN products p ON ti.Product_ID = p.Product_ID
            WHERE ti.Order_ID = :order_id
        ");
        $stmt->execute(['order_id' => $orderId]);
        $order['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'order' => $order]);
    } else {
        // Get all orders for user
        $sql = "
            SELECT 
                o.Order_ID,
                o.order_date,
                o.status,
                o.payment,
                o.amount,
                o.payment_method,
                o.last_updated,
                t.Transaction_ID,
                t.Payment_Status,
                t.proof_of_payment
            FROM orders o
            LEFT JOIN transactions t ON t.Order_ID = o.Order_ID
            WHERE o.User_ID = :user_id
            ORDER BY o.order_date DESC
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['user_id' => $userId]);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'orders' => $orders]);
    }
    
} catch (PDOException $e) {
    error_log("Get Customer Orders Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to fetch orders']);
}
?>


<?php
/**
 * Create Order API
 * Creates a new order from cart items
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
    echo json_encode([
        'success' => false,
        'message' => 'User not authenticated'
    ]);
    exit;
}

// Get request data
$data = json_decode(file_get_contents('php://input'), true);
$cartItems = $data['cart_items'] ?? [];
$paymentMethod = $data['payment_method'] ?? 'On-Site'; // 'On-Site' or 'GCash'
$proofOfPayment = $data['proof_of_payment'] ?? null; // File path if GCash

if (empty($cartItems)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Cart is empty'
    ]);
    exit;
}

$db = new DatabaseFunctions();
$pdo = $db->getConnection();

try {
    $pdo->beginTransaction();
    
    // Calculate total amount
    $totalAmount = 0;
    foreach ($cartItems as $item) {
        $totalAmount += $item['price'] * $item['quantity'];
    }
    
    // Determine payment status
    // On-Site = To Pay, GCash with proof = Paid
    $paymentStatus = ($paymentMethod === 'On-Site' || empty($proofOfPayment)) ? 'To Pay' : 'Paid';
    
    // Create order
    $stmt = $pdo->prepare("
        INSERT INTO orders (User_ID, status, payment, amount, payment_method, order_date)
        VALUES (:user_id, 'Order Confirmed', :payment, :amount, :payment_method, NOW())
    ");
    $stmt->execute([
        'user_id' => $_SESSION['user_id'],
        'payment' => $paymentStatus,
        'amount' => $totalAmount,
        'payment_method' => $paymentMethod
    ]);
    
    $orderId = $pdo->lastInsertId();
    
    // Create transaction
    $stmt = $pdo->prepare("
        INSERT INTO transactions (Order_ID, Subtotal, Total, Payment_Method, Payment_Status, proof_of_payment)
        VALUES (:order_id, :subtotal, :total, :payment_method, :payment_status, :proof_of_payment)
    ");
    $stmt->execute([
        'order_id' => $orderId,
        'subtotal' => $totalAmount,
        'total' => $totalAmount, // No delivery fee
        'payment_method' => ($paymentMethod === 'On-Site') ? 'Cash on Delivery' : 'GCash',
        'payment_status' => ($paymentMethod === 'On-Site') ? 'Pending' : 'Paid',
        'proof_of_payment' => $proofOfPayment
    ]);
    
    $transactionId = $pdo->lastInsertId();
    
    // Create transaction items
    foreach ($cartItems as $item) {
        $stmt = $pdo->prepare("
            INSERT INTO transaction_items (Order_ID, Product_ID, Quantity, Price)
            VALUES (:order_id, :product_id, :quantity, :price)
        ");
        $stmt->execute([
            'order_id' => $orderId,
            'product_id' => $item['product_id'],
            'quantity' => $item['quantity'],
            'price' => $item['price']
        ]);
    }
    
    // If payment is already paid (GCash), decrease stock
    if ($paymentStatus === 'Paid') {
        foreach ($cartItems as $item) {
            $stmt = $pdo->prepare("
                UPDATE products 
                SET stock_level = stock_level - :quantity
                WHERE Product_ID = :product_id
            ");
            $stmt->execute([
                'quantity' => $item['quantity'],
                'product_id' => $item['product_id']
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
            $stmt->execute(['product_id' => $item['product_id']]);
        }
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Order created successfully',
        'order_id' => $orderId,
        'transaction_id' => $transactionId
    ]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Create Order Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to create order: ' . $e->getMessage()
    ]);
}
?>


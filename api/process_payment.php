<?php
/**
 * Process Payment API
 * Allows customer to select payment method and process payment for approved orders
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

require_once __DIR__ . '/../includes/db_functions.php';
require_once __DIR__ . '/../includes/session_helper.php';

if (session_status() === PHP_SESSION_NONE) {
    startSession('customer');
}

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
$orderId = $data['order_id'] ?? null;
$paymentMethod = $data['payment_method'] ?? null; // 'On-Site' or 'GCash'
$proofOfPayment = $data['proof_of_payment'] ?? null; // File path if GCash

// Debug logging
error_log("Process Payment - Order ID: " . $orderId);
error_log("Process Payment - Payment Method: " . $paymentMethod);
error_log("Process Payment - Proof of Payment: " . ($proofOfPayment ?? 'NULL'));

if (!$orderId || !$paymentMethod) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Order ID and payment method are required'
    ]);
    exit;
}

if (!in_array($paymentMethod, ['On-Site', 'GCash'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid payment method. Must be "On-Site" or "GCash"'
    ]);
    exit;
}

$db = new DatabaseFunctions();
$pdo = $db->getConnection();

try {
    $pdo->beginTransaction();
    
    // Get current order status and verify ownership
    $stmt = $pdo->prepare("
        SELECT Order_ID, User_ID, status, payment, payment_method 
        FROM orders 
        WHERE Order_ID = :order_id
    ");
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
    
    // Verify order belongs to logged-in user
    if ((int)$order['User_ID'] !== (int)$_SESSION['user_id']) {
        $pdo->rollBack();
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Access denied. This order does not belong to you.'
        ]);
        exit;
    }
    
    // Check if order is approved (not pending approval or rejected)
    if ($order['status'] === 'Pending Approval') {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Order is pending approval. Please wait for admin approval before proceeding with payment.'
        ]);
        exit;
    }
    
    if ($order['status'] === 'Rejected') {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'This order has been rejected and cannot be paid.'
        ]);
        exit;
    }
    
    // Determine payment status and order status based on payment method
    // On-Site: status = 'Waiting Payment', payment = 'To Pay'
    // GCash (with proof): status = 'Processing', payment = 'Paid'
    // GCash (without proof): status = 'Waiting Payment', payment = 'To Pay'
    if ($paymentMethod === 'On-Site') {
        $newOrderStatus = 'Waiting Payment';
        $newPaymentStatus = 'To Pay';
    } elseif ($paymentMethod === 'GCash' && !empty($proofOfPayment)) {
        $newOrderStatus = 'Processing';
        $newPaymentStatus = 'Paid';
    } else {
        // GCash without proof - wait for proof upload
        $newOrderStatus = 'Waiting Payment';
        $newPaymentStatus = 'To Pay';
    }
    
    // Update order with payment method and status
    $stmt = $pdo->prepare("
        UPDATE orders 
        SET payment_method = :payment_method,
            status = :status,
            payment = :payment,
            last_updated = NOW()
        WHERE Order_ID = :order_id
    ");
    $stmt->execute([
        'payment_method' => $paymentMethod,
        'status' => $newOrderStatus,
        'payment' => $newPaymentStatus,
        'order_id' => (int)$orderId
    ]);
    
    // Update transaction with payment method and status
    $transactionPaymentStatus = ($newPaymentStatus === 'Paid') ? 'Paid' : 'Pending';
    $transactionPaymentMethod = ($paymentMethod === 'On-Site') ? 'Cash on Delivery' : 'GCash';
    
    $stmt = $pdo->prepare("
        UPDATE transactions 
        SET Payment_Method = :payment_method,
            Payment_Status = :payment_status,
            proof_of_payment = :proof_of_payment,
            Updated_At = NOW()
        WHERE Order_ID = :order_id
    ");
    $proofOfPaymentValue = $proofOfPayment ?: null;
    
    // Debug logging before database update
    error_log("Updating transaction - Order ID: " . $orderId);
    error_log("Proof of Payment value: " . ($proofOfPaymentValue ?? 'NULL'));
    
    $stmt->execute([
        'payment_method' => $transactionPaymentMethod,
        'payment_status' => $transactionPaymentStatus,
        'proof_of_payment' => $proofOfPaymentValue,
        'order_id' => (int)$orderId
    ]);
    
    // Verify the update
    $verifyStmt = $pdo->prepare("SELECT proof_of_payment FROM transactions WHERE Order_ID = :order_id");
    $verifyStmt->execute(['order_id' => (int)$orderId]);
    $verifyResult = $verifyStmt->fetch(PDO::FETCH_ASSOC);
    error_log("Verified proof_of_payment in database: " . ($verifyResult['proof_of_payment'] ?? 'NULL'));
    
    // If payment is already paid (GCash with proof), decrease stock
    if ($newPaymentStatus === 'Paid' && $newOrderStatus === 'Processing') {
        $stmt = $pdo->prepare("
            SELECT Product_ID, Quantity 
            FROM transaction_items 
            WHERE Order_ID = :order_id
        ");
        $stmt->execute(['order_id' => (int)$orderId]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
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
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Payment method updated successfully' . ($newPaymentStatus === 'Paid' ? '. Payment confirmed!' : '.'),
        'order_id' => $orderId,
        'payment_method' => $paymentMethod,
        'payment_status' => $newPaymentStatus,
        'order_status' => $newOrderStatus
    ]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Process Payment Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to process payment: ' . $e->getMessage()
    ]);
}
?>


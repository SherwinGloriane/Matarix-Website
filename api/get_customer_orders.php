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

$userId = (int)$_SESSION['user_id']; // Ensure it's an integer
$orderId = isset($_GET['order_id']) ? (int)$_GET['order_id'] : null;

// Debug logging - log full session info
error_log("Get Customer Orders - Session User ID: $userId (type: " . gettype($_SESSION['user_id']) . "), Requested Order ID: " . ($orderId ?? 'null'));
error_log("Full session data: " . json_encode(['user_id' => $_SESSION['user_id'], 'user_email' => $_SESSION['user_email'] ?? 'N/A', 'user_role' => $_SESSION['user_role'] ?? 'N/A']));

$db = new DatabaseFunctions();

try {
    $pdo = $db->getConnection();
    
    if ($orderId) {
        // Get specific order - include User_ID for frontend verification
        $sql = "
            SELECT 
                o.Order_ID,
                o.User_ID,
                o.order_date,
                COALESCE(NULLIF(TRIM(o.status), ''), 'Waiting Payment') as status,
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
        
        // Debug: Log what we found
        if ($order) {
            error_log("Order found - Order ID: {$order['Order_ID']}, User ID in order: " . ($order['User_ID'] ?? 'N/A'));
        } else {
            // Log for debugging - check if order exists but belongs to different user
            $checkStmt = $pdo->prepare("SELECT User_ID FROM orders WHERE Order_ID = :order_id");
            $checkStmt->execute(['order_id' => $orderId]);
            $orderCheck = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($orderCheck) {
                // Order exists but belongs to different user
                error_log("Access denied: Order $orderId belongs to user {$orderCheck['User_ID']}, but session user is $userId");
                http_response_code(403);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Access denied: This order does not belong to you',
                    'debug' => [
                        'requested_order_id' => $orderId,
                        'session_user_id' => $userId,
                        'order_owner_id' => $orderCheck['User_ID']
                    ]
                ]);
            } else {
                // Order doesn't exist
                error_log("Order $orderId not found in database");
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Order not found']);
            }
            exit;
        }
        
        // Double-check: Verify the order actually belongs to this user (extra safety)
        $verifyStmt = $pdo->prepare("SELECT User_ID FROM orders WHERE Order_ID = :order_id");
        $verifyStmt->execute(['order_id' => $orderId]);
        $verifyOrder = $verifyStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$verifyOrder || (int)$verifyOrder['User_ID'] !== (int)$userId) {
            error_log("SECURITY CHECK FAILED: Order $orderId verification failed. Order User_ID: " . ($verifyOrder['User_ID'] ?? 'null') . ", Session User_ID: $userId");
            http_response_code(403);
            echo json_encode([
                'success' => false, 
                'message' => 'Access denied: Order ownership verification failed',
                'debug' => [
                    'requested_order_id' => $orderId,
                    'session_user_id' => $userId,
                    'order_owner_id' => $verifyOrder['User_ID'] ?? null
                ]
            ]);
            exit;
        }
        
        // Map old status values to new ones (COALESCE in SQL handles empty strings)
        $oldStatusMap = [
            'Order Confirmed' => 'Waiting Payment',
            'Being Processed' => 'Processing',
            'On the Way' => 'Ready',
            'Completed' => 'Ready'
        ];
        
        $rawStatus = trim($order['status'] ?? '');
        if (!empty($rawStatus) && isset($oldStatusMap[$rawStatus])) {
            $order['status'] = $oldStatusMap[$rawStatus];
        } elseif (empty($rawStatus)) {
            $order['status'] = 'Waiting Payment';
        } else {
            $order['status'] = $rawStatus;
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
        
        // Include session user_id in response for frontend verification
        echo json_encode([
            'success' => true, 
            'order' => $order,
            'session_user_id' => $userId // Include for verification
        ]);
    } else {
        // Get all orders for user
        $sql = "
            SELECT 
                o.Order_ID,
                o.order_date,
                COALESCE(NULLIF(TRIM(o.status), ''), 'Waiting Payment') as status,
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
        
        // Map old status values to new ones for all orders
        $oldStatusMap = [
            'Order Confirmed' => 'Waiting Payment',
            'Being Processed' => 'Processing',
            'On the Way' => 'Ready',
            'Completed' => 'Ready'
        ];
        
        foreach ($orders as &$order) {
            if (empty($order['status']) || trim($order['status']) === '') {
                $order['status'] = 'Waiting Payment';
            } else {
                $rawStatus = trim($order['status']);
                if (isset($oldStatusMap[$rawStatus])) {
                    $order['status'] = $oldStatusMap[$rawStatus];
                } else {
                    $order['status'] = $rawStatus;
                }
            }
        }
        unset($order); // Break reference
        
        // Include session user_id in response for frontend verification
        echo json_encode([
            'success' => true, 
            'orders' => $orders,
            'session_user_id' => $userId // Include for verification
        ]);
    }
    
} catch (PDOException $e) {
    error_log("Get Customer Orders Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to fetch orders']);
}
?>


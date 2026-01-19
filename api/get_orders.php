<?php
/**
 * Get Orders API
 * Returns all orders for admin view
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

require_once __DIR__ . '/../includes/db_functions.php';
require_once __DIR__ . '/../includes/session_helper.php';

if (session_status() === PHP_SESSION_NONE) {
    startSession('admin');
}

// Check if user is admin (optional - can be removed if not needed)
// if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'Admin') {
//     http_response_code(403);
//     echo json_encode(['success' => false, 'message' => 'Access denied']);
//     exit;
// }

$db = new DatabaseFunctions();

try {
    $pdo = $db->getConnection();
    
    // Check if order_id is provided (for single order view)
    $orderId = isset($_GET['order_id']) ? (int)$_GET['order_id'] : null;
    
    if ($orderId) {
        // Get single order with user and transaction details
        // Handle new order statuses and payment method fields
        $sql = "
            SELECT 
                o.Order_ID,
                o.User_ID,
                o.order_date,
                COALESCE(NULLIF(TRIM(o.status), ''), 'Pending Approval') as status,
                o.payment,
                o.amount,
                o.payment_method,
                o.rejection_reason,
                o.approved_at,
                o.rejected_at,
                o.approved_by,
                o.last_updated,
                o.availability_date,
                o.availability_time,
                u.First_Name,
                u.Last_Name,
                u.email,
                u.Phone_Number,
                u.address,
                t.Transaction_ID,
                t.Payment_Status,
                t.proof_of_payment,
                t.Payment_Method as transaction_payment_method
            FROM orders o
            LEFT JOIN users u ON o.User_ID = u.User_ID
            LEFT JOIN transactions t ON t.Order_ID = o.Order_ID
            WHERE o.Order_ID = :order_id
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['order_id' => $orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Order not found'
            ]);
            exit;
        }
        
        // Handle payment_method: if order is pending approval or rejected, set to null
        // Otherwise, use the payment_method from orders table (not transaction table)
        if ($order['status'] === 'Pending Approval' || $order['status'] === 'Rejected') {
            $order['payment_method'] = null;
        } else {
            // For approved orders, use payment_method from orders table
            // Only fall back to transaction_payment_method if orders.payment_method is null
            if (empty($order['payment_method']) || $order['payment_method'] === 'null' || $order['payment_method'] === 'NULL') {
                $order['payment_method'] = $order['transaction_payment_method'] ?? null;
            }
        }
        
        // Get order items with product details including dimensions and weight
        // Use LEFT JOIN to show items even if product was deleted
        $stmt = $pdo->prepare("
            SELECT 
                ti.Item_ID,
                ti.Product_ID,
                ti.Quantity,
                ti.Price,
                COALESCE(p.Product_Name, CONCAT('Deleted Product (ID: ', ti.Product_ID, ')')) as Product_Name,
                p.category,
                p.length,
                p.Width,
                p.Unit,
                p.weight,
                p.weight_unit,
                p.image_path
            FROM transaction_items ti
            LEFT JOIN products p ON ti.Product_ID = p.Product_ID
            WHERE ti.Order_ID = :order_id
            ORDER BY ti.Item_ID
        ");
        $stmt->execute(['order_id' => $orderId]);
        $order['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Fetch product variations for each item
        foreach ($order['items'] as &$item) {
            if ($item['Product_ID']) {
                $variationStmt = $pdo->prepare("
                    SELECT variation_name, variation_value 
                    FROM product_variations 
                    WHERE Product_ID = :product_id 
                    ORDER BY variation_name ASC, Variation_ID ASC
                ");
                $variationStmt->execute(['product_id' => $item['Product_ID']]);
                $variations = $variationStmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Format variations as a string (e.g., "Color: Red, Material: Sample")
                if (!empty($variations)) {
                    $variationStrings = [];
                    foreach ($variations as $variation) {
                        $variationStrings[] = $variation['variation_name'] . ': ' . $variation['variation_value'];
                    }
                    $item['variation'] = implode(', ', $variationStrings);
                } else {
                    $item['variation'] = null;
                }
            } else {
                $item['variation'] = null;
            }
        }
        unset($item); // Break reference
        
        // Debug logging for order items
        error_log("Order ID {$orderId} - Items count: " . count($order['items']));
        foreach ($order['items'] as $item) {
            error_log("Order ID {$orderId} - Item: Product_ID={$item['Product_ID']}, Product_Name={$item['Product_Name']}, Quantity={$item['Quantity']}, Price={$item['Price']}");
        }
        
        // Format customer name
        $order['customer_name'] = trim(($order['First_Name'] ?? '') . ' ' . ($order['Last_Name'] ?? ''));
        
        // Ensure address is included
        $order['address'] = $order['address'] ?? 'No address provided';
        
        // Ensure all fields have proper defaults
        $order['payment_method'] = $order['payment_method'] ?? null;
        $order['rejection_reason'] = $order['rejection_reason'] ?? null;
        $order['address'] = $order['address'] ?? 'No address provided';
        $order['Phone_Number'] = $order['Phone_Number'] ?? 'No phone number';
        
        echo json_encode([
            'success' => true,
            'order' => $order
        ]);
    } else {
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
                o.availability_date,
                o.availability_time,
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
                    COALESCE(p.Product_Name, CONCAT('Deleted Product (ID: ', ti.Product_ID, ')')) as Product_Name,
                    p.category,
                    p.length,
                    p.Width,
                    p.Unit,
                    p.weight,
                    p.weight_unit,
                    p.image_path
                FROM transaction_items ti
                LEFT JOIN products p ON ti.Product_ID = p.Product_ID
                WHERE ti.Order_ID = :order_id
                ORDER BY ti.Item_ID
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
    }
    
} catch (PDOException $e) {
    error_log("Get Orders Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch orders'
    ]);
}
?>


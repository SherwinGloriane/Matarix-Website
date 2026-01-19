<?php
/**
 * Create Order API
 * Creates a new order from cart items
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

require_once __DIR__ . '/../includes/db_functions.php';
require_once __DIR__ . '/../includes/session_helper.php';

// Close any existing session first
if (session_status() !== PHP_SESSION_NONE) {
    session_write_close();
}

// Set cookie parameters BEFORE session name (critical for cookie path)
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/MatarixWEB/',
    'domain' => '',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax'
]);

// Start customer session with correct name
session_name('MATARIX_CUSTOMER_SESSION');
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    // Debug logging
    error_log("Create Order - Authentication failed.");
    error_log("Create Order - Session Name: " . session_name());
    error_log("Create Order - Session ID: " . session_id());
    error_log("Create Order - Session keys: " . implode(', ', array_keys($_SESSION)));
    error_log("Create Order - Cookies received: " . print_r($_COOKIE, true));
    
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'User not authenticated. Please log in again.'
    ]);
    exit;
}

// Get request data
$data = json_decode(file_get_contents('php://input'), true);
$cartItems = $data['cart_items'] ?? [];
// Payment method is no longer selected during checkout - will be selected after approval
$availabilitySlots = $data['availability_slots'] ?? [];

// Validate cart items structure
if (!is_array($cartItems)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid cart items format. Expected an array.'
    ]);
    exit;
}

// Get database connection for validation (will be reused later)
$db = new DatabaseFunctions();
$pdo = $db->getConnection();

// Validate each cart item before processing
foreach ($cartItems as $index => $item) {
    if (!isset($item['product_id']) || !isset($item['quantity']) || !isset($item['price'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Invalid cart item at index $index. Missing required fields (product_id, quantity, price)."
        ]);
        exit;
    }
    
    $productId = (int)$item['product_id'];
    $quantity = (int)$item['quantity'];
    $price = (float)$item['price'];
    
    if ($productId <= 0 || $quantity <= 0 || $price < 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Invalid cart item at index $index. Product ID, quantity, and price must be positive values."
        ]);
        exit;
    }
    
    // Verify product exists and is available
    $productStmt = $pdo->prepare("SELECT Product_ID, stock_level, stock_status, price FROM products WHERE Product_ID = :product_id");
    $productStmt->execute(['product_id' => $productId]);
    $product = $productStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => "Product with ID $productId not found."
        ]);
        exit;
    }
    
    // Check stock availability
    if ($product['stock_status'] === 'Out of Stock' || $product['stock_level'] < $quantity) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Insufficient stock for product ID $productId. Available: {$product['stock_level']}, Requested: $quantity"
        ]);
        exit;
    }
}

// For backward compatibility, also check old format
$availabilityDate = $data['availability_date'] ?? null;
$availabilityTime = $data['availability_time'] ?? null;

// If new format (slots) is provided, use the preferred slot
if (!empty($availabilitySlots)) {
    $preferredSlot = null;
    foreach ($availabilitySlots as $slot) {
        if (isset($slot['is_preferred']) && $slot['is_preferred']) {
            $preferredSlot = $slot;
            break;
        }
    }
    // If no preferred slot found, use first slot
    if (!$preferredSlot && !empty($availabilitySlots)) {
        $preferredSlot = $availabilitySlots[0];
    }
    
    if ($preferredSlot) {
        $availabilityDate = $preferredSlot['date'] ?? null;
        $availabilityTime = $preferredSlot['time'] ?? null;
        // If time is not provided, set default to 9:00 AM
        if (empty($availabilityTime)) {
            $availabilityTime = '09:00:00';
        }
    }
}

// If time is still null, set default to 9:00 AM
if (empty($availabilityTime) && !empty($availabilityDate)) {
    $availabilityTime = '09:00:00';
}

// Empty cart check is already done in validation above
// Database connection is already initialized above

// Helper function to convert weight to kg
function convertWeightToKg($weight, $unit) {
    if (!$weight || $weight == 0) return 0;
    $weightValue = (float)$weight;
    switch (strtolower($unit ?? 'kg')) {
        case 'kg': return $weightValue;
        case 'g': return $weightValue / 1000;
        case 'lb': return $weightValue * 0.453592;
        case 'oz': return $weightValue * 0.0283495;
        case 'ton': return $weightValue * 1000;
        default: return $weightValue;
    }
}

try {
    $pdo->beginTransaction();
    
    // Calculate total amount and total weight
    $totalAmount = 0;
    $totalWeightKg = 0;
    $productDetailsMap = [];
    
    foreach ($cartItems as $item) {
        $totalAmount += $item['price'] * $item['quantity'];
        
        // Fetch product details for weight calculation
        $productStmt = $pdo->prepare("SELECT weight, weight_unit FROM products WHERE Product_ID = :product_id");
        $productStmt->execute(['product_id' => $item['product_id']]);
        $product = $productStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($product && $product['weight']) {
            $weightKg = convertWeightToKg($product['weight'], $product['weight_unit']);
            $totalWeightKg += $weightKg * $item['quantity'];
            $productDetailsMap[$item['product_id']] = $product;
        }
    }
    
    // Get minimum order settings
    $settingsStmt = $pdo->query("SELECT setting_key, setting_value FROM order_settings");
    $settings = [];
    while ($row = $settingsStmt->fetch(PDO::FETCH_ASSOC)) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    
    // Check if auto-calculate is enabled
    $autoCalculate = isset($settings['auto_calculate_from_fleet']) && $settings['auto_calculate_from_fleet'] == '1';
    $minWeightKg = (float)($settings['min_order_weight_kg'] ?? 200);
    
    if ($autoCalculate) {
        // Get smallest vehicle capacity
        $capacityStmt = $pdo->query("
            SELECT MIN(
                CASE capacity_unit
                    WHEN 'kg' THEN capacity
                    WHEN 'g' THEN capacity / 1000
                    WHEN 'lb' THEN capacity * 0.453592
                    WHEN 'oz' THEN capacity * 0.0283495
                    WHEN 'ton' THEN capacity * 1000
                    ELSE capacity
                END
            ) as min_capacity_kg
            FROM fleet
            WHERE capacity IS NOT NULL AND capacity > 0
        ");
        $capacityResult = $capacityStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($capacityResult && $capacityResult['min_capacity_kg']) {
            $smallestCapacity = (float)$capacityResult['min_capacity_kg'];
            $percentage = (float)($settings['min_order_weight_percentage'] ?? 25);
            // Calculate minimum: smallestCapacity * percentage / 100
            // Ensure at least 1kg (reasonable minimum)
            $minWeightKg = max(1, round($smallestCapacity * ($percentage / 100), 2));
        }
    }
    
    $minValue = (float)($settings['min_order_value'] ?? 0);
    $allowHeavySingleItems = !isset($settings['allow_heavy_single_items']) || $settings['allow_heavy_single_items'] == '1';
    
    // Check if single heavy item exceeds minimum (if allowed)
    $meetsMinimum = false;
    $reason = '';
    
    if ($allowHeavySingleItems && count($cartItems) === 1) {
        $item = $cartItems[0];
        $product = $productDetailsMap[$item['product_id']] ?? null;
        if ($product && $product['weight']) {
            $itemWeightKg = convertWeightToKg($product['weight'], $product['weight_unit']) * $item['quantity'];
            if ($itemWeightKg >= $minWeightKg) {
                $meetsMinimum = true;
                $reason = 'heavy_single_item';
            }
        }
    }
    
    // Check weight and value requirements if not already met
    if (!$meetsMinimum) {
        $meetsWeight = $totalWeightKg >= $minWeightKg;
        // Check value requirement (only if minValue is set and greater than 0)
        $meetsValue = $minValue > 0 && $totalAmount >= $minValue;
        // Order meets minimum if it meets weight OR value requirement
        // If minValue is 0, only weight requirement matters
        $meetsMinimum = $meetsWeight || ($minValue > 0 && $meetsValue);
    }
    
    // Validate minimum order requirements
    if (!$meetsMinimum) {
        $pdo->rollBack();
        $errorMsg = "Minimum order requirement not met. ";
        if ($totalWeightKg < $minWeightKg && $minWeightKg > 0) {
            $neededWeight = $minWeightKg - $totalWeightKg;
            $errorMsg .= sprintf(
                "Minimum weight is %.2f kg. Your order is %.2f kg. Add %.2f kg more to proceed.",
                $minWeightKg, $totalWeightKg, $neededWeight
            );
        }
        if ($totalAmount < $minValue && $minValue > 0) {
            $neededValue = $minValue - $totalAmount;
            $errorMsg .= sprintf(
                " Or minimum order value is ₱%.2f. Add ₱%.2f more to proceed.",
                $minValue, $neededValue
            );
        }
        
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => $errorMsg,
            'current_weight' => $totalWeightKg,
            'minimum_weight' => $minWeightKg,
            'needed_weight' => max(0, $minWeightKg - $totalWeightKg),
            'current_value' => $totalAmount,
            'minimum_value' => $minValue,
            'needed_value' => max(0, $minValue - $totalAmount)
        ]);
        exit;
    }
    
    // New order flow: Orders start with 'Pending Approval' status
    // Payment method and payment status will be set after admin approval
    $orderStatus = 'Pending Approval';
    $paymentStatus = 'To Pay'; // Payment not yet required until approval
    
    // Create order without payment method (explicitly set to NULL to override database default)
    $stmt = $pdo->prepare("
        INSERT INTO orders (User_ID, status, payment, amount, payment_method, order_date, availability_date, availability_time)
        VALUES (:user_id, :status, :payment, :amount, NULL, NOW(), :availability_date, :availability_time)
    ");
    $stmt->execute([
        'user_id' => $_SESSION['user_id'],
        'status' => $orderStatus,
        'payment' => $paymentStatus,
        'amount' => $totalAmount,
        'availability_date' => $availabilityDate ?: null,
        'availability_time' => $availabilityTime ?: '09:00:00' // Default to 9:00 AM if not provided
    ]);
    
    $orderId = $pdo->lastInsertId();
    
    // Save all availability slots
    if (!empty($availabilitySlots)) {
        $slotStmt = $pdo->prepare("
            INSERT INTO order_availability_slots (order_id, slot_number, availability_date, availability_time, is_preferred)
            VALUES (:order_id, :slot_number, :availability_date, :availability_time, :is_preferred)
        ");
        
        foreach ($availabilitySlots as $slot) {
            // If time is not provided, set default to 9:00 AM
            $slotTime = $slot['time'] ?? null;
            if (empty($slotTime)) {
                $slotTime = '09:00:00';
            }
            
            $slotStmt->execute([
                'order_id' => $orderId,
                'slot_number' => $slot['slot_number'],
                'availability_date' => $slot['date'],
                'availability_time' => $slotTime,
                'is_preferred' => isset($slot['is_preferred']) && $slot['is_preferred'] ? 1 : 0
            ]);
        }
    }
    
    // Auto-generate delivery record when order is created
    // Start with 'Pending' status (standardized)
    // Drivers can update to 'Preparing', 'Out for Delivery', etc.
    // Check if delivery already exists for this order (prevent duplicates)
    $checkStmt = $pdo->prepare("SELECT Delivery_ID FROM deliveries WHERE Order_ID = :order_id LIMIT 1");
    $checkStmt->execute(['order_id' => $orderId]);
    $existingDelivery = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingDelivery) {
        // Delivery record already exists, use it
        $deliveryId = $existingDelivery['Delivery_ID'];
    } else {
        // Create new delivery record
        $stmt = $pdo->prepare("
            INSERT INTO deliveries (Order_ID, Delivery_Status, Created_At, Updated_At)
            VALUES (:order_id, 'Pending', NOW(), NOW())
        ");
        $stmt->execute([
            'order_id' => $orderId
        ]);
        
        $deliveryId = $pdo->lastInsertId();
        
        // Verify delivery ID was created successfully
        if (!$deliveryId || $deliveryId == 0) {
            // Try to get the delivery ID that was just created by querying
            $checkStmt = $pdo->prepare("SELECT Delivery_ID FROM deliveries WHERE Order_ID = :order_id ORDER BY Delivery_ID DESC LIMIT 1");
            $checkStmt->execute(['order_id' => $orderId]);
            $newDelivery = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($newDelivery && $newDelivery['Delivery_ID'] > 0) {
                $deliveryId = $newDelivery['Delivery_ID'];
            } else {
                throw new Exception("Failed to create delivery record. Delivery_ID AUTO_INCREMENT may not be enabled. Please run fix_delivery_id_issue.php");
            }
        }
    }
    
    // Create transaction (payment method will be set after approval)
    $stmt = $pdo->prepare("
        INSERT INTO transactions (Order_ID, Subtotal, Total, Payment_Status)
        VALUES (:order_id, :subtotal, :total, :payment_status)
    ");
    $stmt->execute([
        'order_id' => $orderId,
        'subtotal' => $totalAmount,
        'total' => $totalAmount, // No delivery fee
        'payment_status' => 'Pending' // Will be updated after payment
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
    
    // Stock will NOT be reduced at order creation
    // Stock will only be reduced after order is approved and payment is confirmed
    
    // Get customer name for notification
    $customerStmt = $pdo->prepare("
        SELECT CONCAT(COALESCE(First_Name, ''), ' ', COALESCE(Middle_Name, ''), ' ', COALESCE(Last_Name, '')) as customer_name
        FROM users
        WHERE User_ID = :user_id
    ");
    $customerStmt->execute(['user_id' => $_SESSION['user_id']]);
    $customer = $customerStmt->fetch(PDO::FETCH_ASSOC);
    $customerName = trim($customer['customer_name'] ?? 'Unknown Customer');
    
    // Create admin notification for new order
    try {
        // Check if notifications table exists, create if it doesn't
        $checkTableStmt = $pdo->query("SHOW TABLES LIKE 'admin_notifications'");
        $tableExists = $checkTableStmt->rowCount() > 0;
        
        if (!$tableExists) {
            // Create the notifications table
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS `admin_notifications` (
                  `Notification_ID` int(11) NOT NULL AUTO_INCREMENT,
                  `Order_ID` int(11) NOT NULL,
                  `User_ID` int(11) NOT NULL,
                  `Customer_Name` varchar(255) NOT NULL,
                  `Order_Date` datetime NOT NULL,
                  `Message` text DEFAULT NULL,
                  `Is_Read` tinyint(1) DEFAULT 0,
                  `Created_At` timestamp NOT NULL DEFAULT current_timestamp(),
                  PRIMARY KEY (`Notification_ID`),
                  KEY `fk_notifications_order` (`Order_ID`),
                  KEY `fk_notifications_user` (`User_ID`),
                  KEY `idx_is_read` (`Is_Read`),
                  KEY `idx_created_at` (`Created_At`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
        }
        
        // Insert notification using the helper function
        require_once __DIR__ . '/create_admin_activity_notification.php';
        createAdminActivityNotification($pdo, 'order_created', [
            'order_id' => $orderId,
            'user_id' => $_SESSION['user_id'],
            'customer_name' => $customerName,
            'message' => "New order #{$orderId} from {$customerName}"
        ]);
    } catch (PDOException $e) {
        // Log error but don't fail the order creation if notification fails
        error_log("Failed to create admin notification: " . $e->getMessage());
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Order created successfully',
        'order_id' => $orderId,
        'transaction_id' => $transactionId,
        'delivery_id' => $deliveryId
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


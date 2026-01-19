<?php
/**
 * Update Delivery Status API
 * Allows delivery drivers to update delivery status
 * Supports statuses: 'preparing', 'out for delivery', 'delivered'
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, PUT');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../includes/db_functions.php';
require_once __DIR__ . '/../includes/session_helper.php';

if (session_status() === PHP_SESSION_NONE) {
    startSession('admin');
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

// Check if user is a delivery driver or admin
$userRole = $_SESSION['user_role'] ?? '';
if (!in_array($userRole, ['Delivery Driver', 'Admin', 'Store Employee'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Access denied. Only delivery drivers, admins, and store employees can update delivery status.'
    ]);
    exit;
}

// Get request data
$data = json_decode(file_get_contents('php://input'), true);
$deliveryId = $data['delivery_id'] ?? null;
$orderId = $data['order_id'] ?? null;
$status = $data['status'] ?? null;
$deliveryDetails = $data['delivery_details'] ?? null;
$driverId = $_SESSION['user_id'];

// Validate input
if (!$status) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Status is required'
    ]);
    exit;
}

// Normalize status value (handle case variations)
$status = trim($status);
$statusLower = strtolower($status);

// Map user-friendly statuses to standardized database values
// Standardized statuses: Pending, Preparing, Out for Delivery, Delivered, Cancelled
$statusMap = [
    'preparing' => 'Preparing',
    'out for delivery' => 'Out for Delivery',
    'on the way' => 'Out for Delivery', // Consolidate "On the Way" into "Out for Delivery"
    'delivered' => 'Delivered',
    'pending' => 'Pending',
    'cancelled' => 'Cancelled'
];

// Check if status is valid (either direct match or mapped)
$validStatuses = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
$mappedStatus = $statusMap[$statusLower] ?? $status;

// Log the status mapping for debugging
error_log("Update Delivery Status - Input status: '{$status}', Lowercase: '{$statusLower}', Mapped: '{$mappedStatus}'");

if (!in_array($mappedStatus, $validStatuses)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => "Invalid status: '{$status}'. Must be one of: " . implode(', ', $validStatuses),
        'received_status' => $status,
        'mapped_status' => $mappedStatus,
        'valid_statuses' => $validStatuses
    ]);
    exit;
}

// Use the mapped/normalized status
$status = $mappedStatus;
error_log("Update Delivery Status - Using normalized status: '{$status}'");

$db = new DatabaseFunctions();
$pdo = $db->getConnection();

try {
    $pdo->beginTransaction();
    
    // Check if order is approved (not pending approval or rejected)
    if ($orderId) {
        // Use same logic as get_customer_orders.php for consistency
        // If status is NULL or empty string, treat it as 'Pending Approval' (default)
        $stmt = $pdo->prepare("SELECT COALESCE(NULLIF(TRIM(status), ''), 'Pending Approval') as status FROM orders WHERE Order_ID = :order_id");
        $stmt->execute(['order_id' => (int)$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($order) {
            $orderStatus = isset($order['status']) ? trim($order['status']) : 'Pending Approval';
            
            // Check if order is in 'Pending Approval' status (case-insensitive comparison)
            if (strcasecmp($orderStatus, 'Pending Approval') === 0) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Cannot update delivery status. Order must be approved first.',
                    'current_order_status' => $orderStatus
                ]);
                exit;
            }
            
            // Check if order is rejected (case-insensitive comparison)
            if (strcasecmp($orderStatus, 'Rejected') === 0) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Cannot update delivery status. Order has been rejected.',
                    'current_order_status' => $orderStatus
                ]);
                exit;
            }
        } else {
            // Order not found
            $pdo->rollBack();
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Order not found. Cannot update delivery status.'
            ]);
            exit;
        }
    }
    
    // If delivery_id is provided, use it; otherwise find by order_id
    if ($deliveryId) {
        $stmt = $pdo->prepare("
            SELECT Delivery_ID, Order_ID, Delivery_Status 
            FROM deliveries 
            WHERE Delivery_ID = :delivery_id
        ");
        $stmt->execute(['delivery_id' => $deliveryId]);
        $delivery = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$delivery) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Delivery not found'
            ]);
            $pdo->rollBack();
            exit;
        }
        
        $targetDeliveryId = $deliveryId;
        $targetOrderId = $delivery['Order_ID'];
        $currentDeliveryStatus = $delivery['Delivery_Status'] ?? 'Pending';
    } elseif ($orderId) {
        // Find delivery by order_id
        $stmt = $pdo->prepare("
            SELECT Delivery_ID 
            FROM deliveries 
            WHERE Order_ID = :order_id
            ORDER BY Created_At DESC
            LIMIT 1
        ");
        $stmt->execute(['order_id' => $orderId]);
        $delivery = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$delivery) {
            // Create delivery record if it doesn't exist
            $stmt = $pdo->prepare("
                INSERT INTO deliveries (Order_ID, Delivery_Status, Driver_ID, Created_At, Updated_At)
                VALUES (:order_id, :status, :driver_id, NOW(), NOW())
            ");
            $stmt->execute([
                'order_id' => $orderId,
                'status' => $status,
                'driver_id' => $driverId
            ]);
            $targetDeliveryId = $pdo->lastInsertId();
            $targetOrderId = $orderId;
            $currentDeliveryStatus = 'Pending'; // New delivery starts at Pending
        } else {
            $targetDeliveryId = $delivery['Delivery_ID'];
            $targetOrderId = $orderId;
            $currentDeliveryStatus = $delivery['Delivery_Status'] ?? 'Pending';
        }
    } else {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Either delivery_id or order_id is required'
        ]);
        $pdo->rollBack();
        exit;
    }
    
    // Validate status progression - prevent backward status changes
    // Final statuses cannot be changed
    $finalStatuses = ['Delivered', 'Cancelled'];
    $currentStatusNormalized = trim($currentDeliveryStatus);
    
    // Check if current status is final
    if (in_array($currentStatusNormalized, $finalStatuses)) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Cannot update delivery status. Delivery is already {$currentStatusNormalized}. Final statuses cannot be changed.",
            'current_status' => $currentStatusNormalized,
            'attempted_status' => $status
        ]);
        exit;
    }
    
    // Define status order for forward progression (allows skipping statuses)
    $statusOrder = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered'];
    
    // Helper function to check if a status is forward from current status (allows skipping)
    $isForwardStatus = function($fromStatus, $toStatus) use ($statusOrder, $finalStatuses) {
        // Cancelled can be selected from any status
        if ($toStatus === 'Cancelled') return true;
        
        // Final statuses cannot be changed
        if (in_array($fromStatus, $finalStatuses)) return false;
        
        // Get indices in the progression order
        $fromIndex = array_search($fromStatus, $statusOrder);
        $toIndex = array_search($toStatus, $statusOrder);
        
        // If either status is not in the order, allow it (for safety)
        if ($fromIndex === false || $toIndex === false) return true;
        
        // Allow if toStatus comes after fromStatus in the progression
        return $toIndex > $fromIndex;
    };
    
    // Allow same status (no-op change)
    if ($status === $currentStatusNormalized) {
        // This is allowed - no change needed
    } elseif (!$isForwardStatus($currentStatusNormalized, $status)) {
        // Get all allowed statuses for error message
        $getAllowedStatuses = function($fromStatus) use ($statusOrder) {
            $allowed = [];
            $fromIndex = array_search($fromStatus, $statusOrder);
            if ($fromIndex !== false) {
                for ($i = $fromIndex + 1; $i < count($statusOrder); $i++) {
                    $allowed[] = $statusOrder[$i];
                }
            }
            $allowed[] = 'Cancelled';
            return $allowed;
        };
        
        $allowedStatuses = $getAllowedStatuses($currentStatusNormalized);
        
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Invalid status change. Cannot change from '{$currentStatusNormalized}' to '{$status}'. You can skip statuses, but cannot go backward. Valid statuses: " . implode(', ', $allowedStatuses),
            'current_status' => $currentStatusNormalized,
            'attempted_status' => $status,
            'allowed_statuses' => $allowedStatuses
        ]);
        exit;
    }
    
    // Update delivery status
    $updateFields = ['Delivery_Status = :status', 'Updated_At = NOW()'];
    $updateParams = ['status' => $status, 'delivery_id' => $targetDeliveryId];
    
    // Update driver if not already set
    $updateFields[] = 'Driver_ID = COALESCE(Driver_ID, :driver_id)';
    $updateParams['driver_id'] = $driverId;
    
    // Update delivery details if provided
    if ($deliveryDetails !== null) {
        $updateFields[] = 'delivery_details = :delivery_details';
        $updateParams['delivery_details'] = $deliveryDetails;
    }
    
    $sql = "UPDATE deliveries SET " . implode(', ', $updateFields) . " WHERE Delivery_ID = :delivery_id";
    $stmt = $pdo->prepare($sql);
    
    try {
        $result = $stmt->execute($updateParams);
    } catch (PDOException $e) {
        // Check if it's an enum value error
        $errorCode = $e->getCode();
        $errorMessage = $e->getMessage();
        
        // MySQL error 1265: Data truncated for column (enum value doesn't exist)
        // MySQL error 1366: Incorrect string value (enum value doesn't exist)
        if ($errorCode == 1265 || $errorCode == 1366 || strpos($errorMessage, 'enum') !== false || strpos($errorMessage, 'ENUM') !== false) {
            error_log("Update Delivery Status - Enum Error: Status '{$status}' is not in the database enum. Error: {$errorMessage}");
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => "Status '{$status}' is not valid in the database. Please run the fix script: http://localhost/MatarixWEBs/api/fix_delivery_status_enum.php",
                'error_code' => $errorCode,
                'error_message' => $errorMessage,
                'attempted_status' => $status,
                'fix_url' => 'http://localhost/MatarixWEBs/api/fix_delivery_status_enum.php'
            ]);
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            exit;
        }
        throw $e; // Re-throw if it's not an enum error
    }
    
    // Check if update was successful
    if (!$result) {
        $errorInfo = $stmt->errorInfo();
        error_log("Update Delivery Status - SQL Error: " . json_encode($errorInfo));
        
        // Check for enum-related errors in errorInfo
        if (isset($errorInfo[2]) && (strpos($errorInfo[2], 'enum') !== false || strpos($errorInfo[2], 'ENUM') !== false)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => "Status '{$status}' is not valid in the database. Please run the fix script: http://localhost/MatarixWEBs/api/fix_delivery_status_enum.php",
                'error_info' => $errorInfo,
                'attempted_status' => $status,
                'fix_url' => 'http://localhost/MatarixWEBs/api/fix_delivery_status_enum.php'
            ]);
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            exit;
        }
        
        throw new PDOException("Failed to update delivery status: " . ($errorInfo[2] ?? 'Unknown error'));
    }
    
    // Verify the update actually changed a row
    $rowsAffected = $stmt->rowCount();
    if ($rowsAffected === 0) {
        error_log("Update Delivery Status - No rows affected for Delivery_ID: {$targetDeliveryId}");
        // This might be okay if the status is already the same, but log it
    }
    
    error_log("Update Delivery Status - Updated Delivery_ID: {$targetDeliveryId} to status: {$status} (rows affected: {$rowsAffected})");
    
    // Map status to order status if needed (optional - for consistency)
    // This keeps the order status in sync with delivery status
    $orderStatusMap = [
        'Preparing' => 'Processing',
        'Out for Delivery' => 'Ready',
        'Delivered' => 'Completed'
    ];
    
    if (isset($orderStatusMap[$status])) {
        $stmt = $pdo->prepare("
            UPDATE orders 
            SET status = :status, last_updated = NOW()
            WHERE Order_ID = :order_id
        ");
        $stmt->execute([
            'status' => $orderStatusMap[$status],
            'order_id' => $targetOrderId
        ]);
    }
    
    $pdo->commit();
    
    // Fetch updated delivery record to verify the update
    $stmt = $pdo->prepare("
        SELECT 
            Delivery_ID,
            Order_ID,
            Delivery_Status,
            delivery_details,
            Driver_ID,
            Created_At,
            Updated_At
        FROM deliveries
        WHERE Delivery_ID = :delivery_id
    ");
    $stmt->execute(['delivery_id' => $targetDeliveryId]);
    $updatedDelivery = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$updatedDelivery) {
        error_log("Update Delivery Status - Failed to fetch updated delivery record for Delivery_ID: {$targetDeliveryId}");
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Status updated but failed to verify the update'
        ]);
        exit;
    }
    
    // Log the actual saved status
    error_log("Update Delivery Status - Verified update. Delivery_ID: {$targetDeliveryId}, Saved Status: {$updatedDelivery['Delivery_Status']}");
    
    // Get customer info for notifications
    $orderId = $updatedDelivery['Order_ID'] ?? $targetOrderId;
    $customerStmt = $pdo->prepare("SELECT u.User_ID, u.First_Name, u.Middle_Name, u.Last_Name FROM orders o JOIN users u ON o.User_ID = u.User_ID WHERE o.Order_ID = :order_id");
    $customerStmt->execute(['order_id' => (int)$orderId]);
    $customer = $customerStmt->fetch(PDO::FETCH_ASSOC);
    $customerUserId = $customer['User_ID'] ?? null;
    
    // Create admin notification for delivery status change
    require_once __DIR__ . '/create_admin_activity_notification.php';
    $activityType = $status === 'Delivered' ? 'delivery_completed' : 'delivery_status_changed';
    createAdminActivityNotification($pdo, $activityType, [
        'order_id' => $orderId,
        'message' => "Delivery status changed to {$status} for order #{$orderId}"
    ]);
    
    // Create customer notification for delivery status change
    if ($customerUserId) {
        require_once __DIR__ . '/create_customer_notification.php';
        $customerActivityType = $status === 'Delivered' ? 'delivery_completed' : 'delivery_status_changed';
        $customerMessage = $status === 'Delivered' 
            ? "Your order #{$orderId} has been delivered successfully!" 
            : "Your delivery for order #{$orderId} status has been updated to {$status}";
        
        createCustomerNotification($pdo, $customerUserId, $customerActivityType, [
            'order_id' => (int)$orderId,
            'new_status' => $status,
            'message' => $customerMessage
        ]);
        
        // Send SMS notification when delivery status is "Out for Delivery" (in transit)
        if ($status === 'Out for Delivery') {
            try {
                $phoneStmt = $pdo->prepare("SELECT Phone_Number FROM users WHERE User_ID = :user_id");
                $phoneStmt->execute(['user_id' => $customerUserId]);
                $phoneNumber = $phoneStmt->fetchColumn();
                
                if ($phoneNumber && !empty($phoneNumber)) {
                    require_once __DIR__ . '/../includes/sms_sender.php';
                    $smsSender = new SMSSender();
                    $smsResult = $smsSender->sendDeliveryInTransitSMS($phoneNumber, (int)$orderId);
                    
                    if (!$smsResult['success']) {
                        error_log("SMS notification failed for delivery in transit: " . $smsResult['message']);
                        // Don't fail the whole operation if SMS fails
                    }
                }
            } catch (Exception $e) {
                error_log("SMS notification exception for delivery in transit: " . $e->getMessage());
                // Don't fail the whole operation if SMS fails
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Delivery status updated successfully',
        'delivery' => $updatedDelivery,
        'saved_status' => $updatedDelivery['Delivery_Status'] // Include the actual saved status
    ]);
    
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Update Delivery Status Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update delivery status: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Update Delivery Status Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update delivery status: ' . $e->getMessage()
    ]);
}
?>


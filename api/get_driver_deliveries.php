<?php
/**
 * Get Driver Deliveries API
 * Returns all deliveries assigned to the logged-in driver
 * Useful for delivery driver dashboard
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

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

$userRole = $_SESSION['user_role'] ?? '';
$userId = $_SESSION['user_id'];

// Allow drivers, admins, and store employees to view deliveries
if (!in_array($userRole, ['Delivery Driver', 'Admin', 'Store Employee'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Access denied'
    ]);
    exit;
}

$db = new DatabaseFunctions();
$pdo = $db->getConnection();

try {
    // If admin or store employee, show all deliveries
    // If driver, show only their assigned deliveries
    if (in_array($userRole, ['Admin', 'Store Employee'])) {
        $sql = "
            SELECT 
                d.Delivery_ID,
                d.Order_ID,
                d.Delivery_Status,
                d.delivery_details,
                d.Driver_ID,
                d.Created_At,
                d.Updated_At,
                o.User_ID as Customer_ID,
                o.amount,
                o.status as Order_Status,
                u.First_Name as Customer_First_Name,
                u.Last_Name as Customer_Last_Name,
                u.address as Customer_Address,
                u.Phone_Number as Customer_Phone,
                driver.First_Name as Driver_First_Name,
                driver.Last_Name as Driver_Last_Name
            FROM deliveries d
            LEFT JOIN orders o ON d.Order_ID = o.Order_ID
            LEFT JOIN users u ON o.User_ID = u.User_ID
            LEFT JOIN users driver ON d.Driver_ID = driver.User_ID
            ORDER BY d.Created_At DESC
        ";
        $stmt = $pdo->query($sql);
    } else {
        // Driver view - only their deliveries
        $sql = "
            SELECT 
                d.Delivery_ID,
                d.Order_ID,
                d.Delivery_Status,
                d.delivery_details,
                d.Driver_ID,
                d.Created_At,
                d.Updated_At,
                o.User_ID as Customer_ID,
                o.amount,
                o.status as Order_Status,
                u.First_Name as Customer_First_Name,
                u.Last_Name as Customer_Last_Name,
                u.address as Customer_Address,
                u.Phone_Number as Customer_Phone
            FROM deliveries d
            LEFT JOIN orders o ON d.Order_ID = o.Order_ID
            LEFT JOIN users u ON o.User_ID = u.User_ID
            WHERE d.Driver_ID = :driver_id OR d.Driver_ID IS NULL
            ORDER BY d.Created_At DESC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['driver_id' => $userId]);
    }
    
    $deliveries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'deliveries' => $deliveries,
        'count' => count($deliveries)
    ]);
    
} catch (PDOException $e) {
    error_log("Get Driver Deliveries Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch deliveries: ' . $e->getMessage()
    ]);
}
?>


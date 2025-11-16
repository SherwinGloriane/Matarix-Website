<?php
/**
 * Login API Endpoint
 * Handles user authentication for both Customer and Admin
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../includes/db_functions.php';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Fallback to POST data if JSON is not available
if (!$input) {
    $input = $_POST;
}

// Validate input
if (!isset($input['email']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email and password are required']);
    exit;
}

$email = trim($input['email']);
$password = $input['password'];
$userType = $input['user_type'] ?? 'Customer'; // Default to Customer, can be 'Admin', 'Customer', etc.

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email format']);
    exit;
}

// Initialize database functions
$db = new DatabaseFunctions();

// Attempt login
try {
    $user = $db->login($email, $password);
    
    if ($user) {
        // Check if user role matches the requested login type
        $userRole = $user['role'];
        
        // Allow Admin, Store Employee, and Delivery Driver to login to admin panel
        // Customer can login to customer panel
        if (($userType === 'Admin' && in_array($userRole, ['Admin', 'Store Employee', 'Delivery Driver'])) || 
            ($userType === 'Customer' && in_array($userRole, ['Customer', 'Store Employee', 'Delivery Driver', 'Admin']))) {
            
            // Start session
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }
            
            $_SESSION['user_id'] = $user['User_ID'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = $user['role'];
            $_SESSION['user_name'] = trim(($user['First_Name'] ?? '') . ' ' . ($user['Middle_Name'] ?? '') . ' ' . ($user['Last_Name'] ?? ''));
            $_SESSION['logged_in'] = true;
            $_SESSION['login_time'] = time();
            
            // Determine redirect URL based on role
            $redirectUrl = '../Customer/MainPage.html'; // Default for Customer
            if ($userRole === 'Admin' || $userRole === 'Store Employee') {
                $redirectUrl = '../Admin/OrdersAdmin.html';
            } elseif ($userRole === 'Delivery Driver') {
                $redirectUrl = '../Admin/DeliveriesAdmin.html';
            }
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => $user['User_ID'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'name' => trim(($user['First_Name'] ?? '') . ' ' . ($user['Middle_Name'] ?? '') . ' ' . ($user['Last_Name'] ?? ''))
                ],
                'redirect_url' => $redirectUrl
            ]);
        } else {
            http_response_code(403);
            echo json_encode([
                'success' => false, 
                'message' => 'Access denied. This account does not have permission to access this login page.'
            ]);
        }
    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false, 
            'message' => 'Invalid email or password. Please check your credentials and try again.'
        ]);
    }
} catch (Exception $e) {
    error_log("Login API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'An error occurred during login. Please try again later.'
    ]);
}


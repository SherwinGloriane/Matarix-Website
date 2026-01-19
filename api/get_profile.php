<?php
/**
 * Get User Profile API Endpoint
 * Returns current logged-in user's full profile data
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

// Try to detect session context - check cookies first
$sessionContext = 'customer'; // Default to customer
if (isset($_COOKIE['MATARIX_ADMIN_SESSION'])) {
    $sessionContext = 'admin';
} elseif (isset($_COOKIE['MATARIX_CUSTOMER_SESSION'])) {
    $sessionContext = 'customer';
} else {
    // Use getSessionContext() as fallback
    $sessionContext = getSessionContext();
}

// Start session with appropriate name
startSession($sessionContext);

// Check if user is logged in - be more lenient, only check user_id
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated. Please log in again.'
    ]);
    exit;
}

// Get user ID from session
$userId = $_SESSION['user_id'];

// Helper function to format phone number for display
// Since Phone_Number is stored as INT, leading zeros are lost
// For Philippine numbers (10-11 digits), pad 10-digit numbers with leading zero
function formatPhoneNumberForDisplay($phoneNumber) {
    if (empty($phoneNumber) || $phoneNumber == 2147483647) {
        // 2147483647 is max int value, likely indicates overflow or invalid data
        return '';
    }
    $phoneStr = (string)$phoneNumber;
    // If it's 10 digits (Philippine format without leading 0), add leading zero
    if (strlen($phoneStr) === 10) {
        return '0' . $phoneStr;
    }
    // If it's 11 digits, it might have been stored correctly, but since it's INT,
    // numbers starting with 0 would have been converted. Return as is for now.
    return $phoneStr;
}

// Initialize database functions
$db = new DatabaseFunctions();

// Get full user profile data
try {
    $user = $db->getUserById($userId);
    
    if ($user) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'user' => [
                'user_id' => $user['User_ID'],
                'first_name' => $user['First_Name'] ?? '',
                'middle_name' => $user['Middle_Name'] ?? '',
                'last_name' => $user['Last_Name'] ?? '',
                'email' => $user['email'] ?? '',
                'phone_number' => isset($user['Phone_Number']) ? formatPhoneNumberForDisplay($user['Phone_Number']) : '',
                'address' => $user['address'] ?? '', // Keep for backward compatibility
                // Structured address fields
                'address_street' => $user['address_street'] ?? '',
                'address_city' => $user['address_city'] ?? '',
                'address_district' => $user['address_district'] ?? '',
                'address_barangay' => $user['address_barangay'] ?? '',
                'address_postal_code' => $user['address_postal_code'] ?? '',
                'address_region' => $user['address_region'] ?? null,
                'role' => $user['role'] ?? '',
                'full_name' => trim(($user['First_Name'] ?? '') . ' ' . ($user['Middle_Name'] ?? '') . ' ' . ($user['Last_Name'] ?? '')),
                'profile_picture' => $user['profile_picture'] ?? null
            ]
        ]);
    } else {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'User not found'
        ]);
    }
} catch (Exception $e) {
    error_log("Get Profile API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while fetching profile data'
    ]);
}


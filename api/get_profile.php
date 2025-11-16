<?php
/**
 * Get User Profile API Endpoint
 * Returns current logged-in user's full profile data
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

require_once __DIR__ . '/../includes/db_functions.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check if user is logged in
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || !isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated'
    ]);
    exit;
}

// Get user ID from session
$userId = $_SESSION['user_id'];

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
                'phone_number' => $user['Phone_Number'] ?? '',
                'address' => $user['address'] ?? '',
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


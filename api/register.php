<?php
/**
 * Registration API Endpoint
 * Handles user registration
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

// Validate required fields
$required = ['email', 'password', 'address', 'first_name', 'last_name', 'phone_number'];
foreach ($required as $field) {
    if (!isset($input[$field]) || empty(trim($input[$field]))) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => ucfirst(str_replace('_', ' ', $field)) . ' is required']);
        exit;
    }
}

// Validate email format
$email = trim($input['email']);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email format']);
    exit;
}

// Validate password strength (minimum 6 characters)
if (strlen($input['password']) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters long']);
    exit;
}

// Validate phone number (should be numeric and reasonable length)
$phoneNumber = preg_replace('/\D/', '', $input['phone_number']); // Remove non-digits
if (empty($phoneNumber) || strlen($phoneNumber) < 10 || strlen($phoneNumber) > 15) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid phone number (10-15 digits)']);
    exit;
}

// Validate names (should not contain numbers or special characters except spaces, hyphens, apostrophes)
$namePattern = "/^[a-zA-Z\s'-]+$/";
if (!preg_match($namePattern, trim($input['first_name']))) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'First name should only contain letters']);
    exit;
}
if (!preg_match($namePattern, trim($input['last_name']))) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Last name should only contain letters']);
    exit;
}
if (isset($input['middle_name']) && !empty(trim($input['middle_name'])) && !preg_match($namePattern, trim($input['middle_name']))) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Middle name should only contain letters']);
    exit;
}

// Initialize database functions
$db = new DatabaseFunctions();

// Check if email already exists
if ($db->emailExists($email)) {
    http_response_code(409);
    echo json_encode(['success' => false, 'message' => 'Email already registered']);
    exit;
}

// Prepare user data
$userData = [
    'first_name' => trim($input['first_name']),
    'middle_name' => !empty(trim($input['middle_name'] ?? '')) ? trim($input['middle_name']) : null,
    'last_name' => trim($input['last_name']),
    'phone_number' => (int)$phoneNumber, // Convert to integer for database
    'email' => $email,
    'address' => trim($input['address']),
    'password' => $input['password'],
    'role' => $input['role'] ?? 'Customer'
];

// Insert user
try {
    $userId = $db->insertUser($userData);
    
    if ($userId) {
        // Start session
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        $_SESSION['user_id'] = $userId;
        $_SESSION['user_email'] = $email;
        $_SESSION['user_role'] = $userData['role'];
        $_SESSION['user_name'] = trim($userData['first_name'] . ' ' . ($userData['middle_name'] ?? '') . ' ' . $userData['last_name']);
        $_SESSION['logged_in'] = true;
        $_SESSION['login_time'] = time();
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Registration successful! You can now login.',
            'user_id' => $userId
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Registration failed. Please try again.']);
    }
} catch (Exception $e) {
    error_log("Registration API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'An error occurred during registration. Please try again later.'
    ]);
}


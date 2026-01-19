<?php
/**
 * Reset Password API Endpoint
 * Handles password reset with token validation
 */

header('Content-Type: application/json');
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : 
          (isset($_SERVER['HTTP_REFERER']) ? parse_url($_SERVER['HTTP_REFERER'], PHP_URL_SCHEME) . '://' . parse_url($_SERVER['HTTP_REFERER'], PHP_URL_HOST) : '*');
header('Access-Control-Allow-Origin: ' . $origin);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../includes/db_functions.php';
require_once __DIR__ . '/error_handler.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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
if (!isset($input['token']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Token and password are required']);
    exit;
}

$token = trim($input['token']);
$password = $input['password'];

// Validate password
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long']);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host=127.0.0.1;port=3306;dbname=matarik;charset=utf8mb4",
        'root',
        '',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    
    // Validate token
    $stmt = $pdo->prepare("
        SELECT email, expires_at, used 
        FROM password_reset_tokens 
        WHERE token = :token 
        LIMIT 1
    ");
    $stmt->execute(['token' => $token]);
    $tokenData = $stmt->fetch();
    
    if (!$tokenData) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired reset token']);
        exit;
    }
    
    // Check if token is already used
    if ($tokenData['used'] == 1) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'This reset link has already been used']);
        exit;
    }
    
    // Check if token is expired
    $now = date('Y-m-d H:i:s');
    if ($tokenData['expires_at'] < $now) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'This reset link has expired. Please request a new one.']);
        exit;
    }
    
    $email = $tokenData['email'];
    
    // Check if user exists
    $stmt = $pdo->prepare("SELECT User_ID FROM users WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User account not found']);
        exit;
    }
    
    // Hash new password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Update user password
    $stmt = $pdo->prepare("UPDATE users SET password = :password WHERE email = :email");
    $stmt->execute([
        'password' => $hashedPassword,
        'email' => $email
    ]);
    
    // Mark token as used
    $stmt = $pdo->prepare("UPDATE password_reset_tokens SET used = 1 WHERE token = :token");
    $stmt->execute(['token' => $token]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Password has been reset successfully. You can now login with your new password.'
    ]);
    
} catch (PDOException $e) {
    error_log("Reset Password Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred. Please try again later.'
    ]);
} catch (Exception $e) {
    error_log("Reset Password Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred. Please try again later.'
    ]);
}


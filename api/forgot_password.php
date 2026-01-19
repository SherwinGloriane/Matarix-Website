<?php
/**
 * Forgot Password API Endpoint
 * Handles password reset requests and sends reset link via email
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
if (!isset($input['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email is required']);
    exit;
}

$email = trim($input['email']);

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email format']);
    exit;
}

try {
    $db = new DatabaseFunctions();
    $pdo = new PDO(
        "mysql:host=127.0.0.1;port=3306;dbname=matarik;charset=utf8mb4",
        'root',
        '',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    
    // Check if password_reset_tokens table exists, create if not
    $tableCheck = $pdo->query("SHOW TABLES LIKE 'password_reset_tokens'");
    if ($tableCheck->rowCount() == 0) {
        // Table doesn't exist, create it
        $createTableSQL = "CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(100) NOT NULL,
            token VARCHAR(255) NOT NULL UNIQUE,
            expires_at DATETIME NOT NULL,
            used TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            INDEX idx_token (token),
            INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        $pdo->exec($createTableSQL);
    }
    
    // Check if user exists
    $stmt = $pdo->prepare("SELECT User_ID, First_Name, Last_Name, email FROM users WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();
    
    // Always return success message (security: don't reveal if email exists)
    if (!$user) {
        // User doesn't exist, but we still return success for security
        echo json_encode([
            'success' => true,
            'message' => 'If an account with that email exists, a password reset link has been sent.'
        ]);
        exit;
    }
    
    // Generate secure token
    $token = bin2hex(random_bytes(32)); // 64 character token
    $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour')); // Token expires in 1 hour
    
    // Invalidate any existing tokens for this email
    $stmt = $pdo->prepare("UPDATE password_reset_tokens SET used = 1 WHERE email = :email AND used = 0");
    $stmt->execute(['email' => $email]);
    
    // Insert new token
    $stmt = $pdo->prepare("INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (:email, :token, :expires_at)");
    $stmt->execute([
        'email' => $email,
        'token' => $token,
        'expires_at' => $expiresAt
    ]);
    
    // Generate reset link
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $basePath = dirname(dirname($_SERVER['SCRIPT_NAME']));
    $resetLink = $protocol . '://' . $host . $basePath . '/Customer/ResetPassword.html?token=' . $token;
    
    // Send email
    try {
        // Try to use PHPMailer if available
        if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
            require_once __DIR__ . '/../vendor/autoload.php';
        }
        
        require_once __DIR__ . '/../includes/email_sender.php';
        
        $emailSender = new EmailSender();
        $userName = trim(($user['First_Name'] ?? '') . ' ' . ($user['Last_Name'] ?? ''));
        
        $emailSent = $emailSender->sendPasswordResetEmail($email, $resetLink, $userName);
        
        if (!$emailSent) {
            // Log error but still return success for security
            error_log("Failed to send password reset email to: " . $email);
            error_log("Reset link that should have been sent: " . $resetLink);
        } else {
            error_log("Password reset email sent successfully to: " . $email);
        }
        
    } catch (Exception $e) {
        error_log("Email sending error: " . $e->getMessage());
        error_log("Error trace: " . $e->getTraceAsString());
        // Still return success for security, but log the error
    }
    
    // Return success (always, for security)
    echo json_encode([
        'success' => true,
        'message' => 'If an account with that email exists, a password reset link has been sent to your email address.'
    ]);
    
} catch (PDOException $e) {
    error_log("Forgot Password PDO Error: " . $e->getMessage());
    error_log("Error Code: " . $e->getCode());
    error_log("SQL State: " . $e->errorInfo[0] ?? 'N/A');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred. Please try again later.',
        'debug' => (defined('DEBUG_MODE') && DEBUG_MODE) ? $e->getMessage() : null
    ]);
} catch (Exception $e) {
    error_log("Forgot Password Exception: " . $e->getMessage());
    error_log("Error trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred. Please try again later.',
        'debug' => (defined('DEBUG_MODE') && DEBUG_MODE) ? $e->getMessage() : null
    ]);
}


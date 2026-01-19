<?php
/**
 * Check Session API Endpoint
 * Returns current user session status and role
 * Checks both admin and customer sessions to find active one
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

require_once __DIR__ . '/../includes/session_helper.php';

// Try to find active session by checking both admin and customer sessions
$sessionFound = false;
$activeSession = null;

// First, try admin session
if (session_status() !== PHP_SESSION_NONE) {
    @session_write_close();
}

// Set cookie path to root of application for admin session
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/MatarixWEB/',
    'domain' => '',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_name('MATARIX_ADMIN_SESSION');
@session_start();

if (isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true) {
    $sessionFound = true;
    $activeSession = $_SESSION;
} else {
    // Close admin session and try customer session
    @session_write_close();
    
    // Set cookie path to root of application for customer session
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/MatarixWEB/',
        'domain' => '',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_name('MATARIX_CUSTOMER_SESSION');
    @session_start();
    
    if (isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true) {
        $sessionFound = true;
        $activeSession = $_SESSION;
    }
}

if ($sessionFound && $activeSession) {
    http_response_code(200);
    echo json_encode([
        'logged_in' => true,
        'user_id' => $activeSession['user_id'] ?? null,
        'user_email' => $activeSession['user_email'] ?? null,
        'user_role' => $activeSession['user_role'] ?? null,
        'user_name' => $activeSession['user_name'] ?? null
    ]);
} else {
    http_response_code(200);
    echo json_encode([
        'logged_in' => false
    ]);
}


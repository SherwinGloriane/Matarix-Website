<?php
/**
 * Logout API Endpoint
 * Handles user logout
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../includes/session_helper.php';

// Start session (will use appropriate session name)
if (session_status() === PHP_SESSION_NONE) {
    startSession(); // Auto-detects context
}

// Destroy session
logout();

http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Logged out successfully'
]);


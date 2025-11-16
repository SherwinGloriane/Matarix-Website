<?php
/**
 * Check Session API Endpoint
 * Returns current user session status and role
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true) {
    http_response_code(200);
    echo json_encode([
        'logged_in' => true,
        'user_id' => $_SESSION['user_id'] ?? null,
        'user_email' => $_SESSION['user_email'] ?? null,
        'user_role' => $_SESSION['user_role'] ?? null,
        'user_name' => $_SESSION['user_name'] ?? null
    ]);
} else {
    http_response_code(200);
    echo json_encode([
        'logged_in' => false
    ]);
}


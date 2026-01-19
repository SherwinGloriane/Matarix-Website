<?php
/**
 * Get Unavailable Dates API
 * Returns dates that are fully booked or unavailable for delivery
 */

header('Content-Type: application/json');
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : 
          (isset($_SERVER['HTTP_REFERER']) ? parse_url($_SERVER['HTTP_REFERER'], PHP_URL_SCHEME) . '://' . parse_url($_SERVER['HTTP_REFERER'], PHP_URL_HOST) : '*');
header('Access-Control-Allow-Origin: ' . $origin);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../includes/db_functions.php';
require_once __DIR__ . '/error_handler.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Feature removed: Dates are no longer locked when selected
    // Multiple customers can now select the same date
    // Always return empty array - no dates are unavailable
    
    echo json_encode([
        'success' => true,
        'unavailable_dates' => []
    ]);
    
} catch (PDOException $e) {
    error_log("Get Unavailable Dates Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred. Please try again later.',
        'unavailable_dates' => []
    ]);
} catch (Exception $e) {
    error_log("Get Unavailable Dates Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred. Please try again later.',
        'unavailable_dates' => []
    ]);
}


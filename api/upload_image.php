<?php
/**
 * Upload Image API
 * Handles image uploads for proof of payment and profile pictures
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

require_once __DIR__ . '/../includes/db_functions.php';
require_once __DIR__ . '/../includes/session_helper.php';

// Start session - try both admin and customer sessions
if (session_status() === PHP_SESSION_NONE) {
    // Try admin session first
    if (isset($_COOKIE['MATARIX_ADMIN_SESSION'])) {
        startSession('admin');
    } else {
        // Try customer session
        startSession('customer');
    }
}

// If still no session, try the other type
if (!isset($_SESSION['user_id'])) {
    if (isset($_COOKIE['MATARIX_ADMIN_SESSION'])) {
        startSession('admin');
    } elseif (isset($_COOKIE['MATARIX_CUSTOMER_SESSION'])) {
        startSession('customer');
    }
}

// Check if file was uploaded
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'No file uploaded or upload error'
    ]);
    exit;
}

$file = $_FILES['image'];
$type = $_POST['type'] ?? 'profile'; // 'profile' or 'proof_of_payment'
$userId = $_SESSION['user_id'] ?? $_POST['user_id'] ?? null;

// Validate file type
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
if (!in_array($file['type'], $allowedTypes)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'
    ]);
    exit;
}

// Validate file size (max 5MB)
if ($file['size'] > 5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'File size too large. Maximum size is 5MB.'
    ]);
    exit;
}

// Create uploads directory if it doesn't exist
$uploadDir = __DIR__ . '/../uploads/';
if ($type === 'profile') {
    $uploadDir .= 'profiles/';
} else {
    $uploadDir .= 'proof_of_payment/';
}

if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate unique filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = uniqid() . '_' . time() . '.' . $extension;
$filepath = $uploadDir . $filename;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to save file'
    ]);
    exit;
}

// Save file path to database
$db = new DatabaseFunctions();
$relativePath = 'uploads/' . ($type === 'profile' ? 'profiles/' : 'proof_of_payment/') . $filename;

try {
    if ($type === 'profile' && $userId) {
        // Update user profile picture
        $pdo = $db->getConnection();
        $stmt = $pdo->prepare("UPDATE users SET profile_picture = :path WHERE User_ID = :user_id");
        $stmt->execute([
            'path' => $relativePath,
            'user_id' => $userId
        ]);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Image uploaded successfully',
        'file_path' => $relativePath,
        'filename' => $filename
    ]);
    
} catch (PDOException $e) {
    // Delete uploaded file if database update fails
    unlink($filepath);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update database: ' . $e->getMessage()
    ]);
}
?>


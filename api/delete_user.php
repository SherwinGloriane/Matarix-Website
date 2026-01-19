<?php
/**
 * Delete User API Endpoint
 * Deletes a user from the system
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../includes/db_functions.php';
require_once __DIR__ . '/../includes/session_helper.php';

if (session_status() === PHP_SESSION_NONE) {
    startSession('admin');
}

// Check if user is logged in and is Admin
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated'
    ]);
    exit;
}

// Check if user has Admin role (only Admin, not Store Employee)
$userRole = $_SESSION['user_role'] ?? '';
if ($userRole !== 'Admin') {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Access denied. Only Admin role can delete users.'
    ]);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Fallback to POST data if JSON is not available
if (!$input) {
    $input = $_POST;
}

// Initialize database functions
$db = new DatabaseFunctions();
$pdo = $db->getConnection();

// Check if multiple users are being deleted
if (isset($input['user_ids']) && is_array($input['user_ids']) && count($input['user_ids']) > 0) {
    // Multiple user deletion
    $userIds = array_map('intval', $input['user_ids']);
    $currentUserId = (int)($_SESSION['user_id'] ?? 0);
    
    // Filter out current user's ID (cannot delete own account)
    $userIds = array_filter($userIds, function($id) use ($currentUserId) {
        return $id !== $currentUserId;
    });
    
    if (empty($userIds)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Cannot delete your own account'
        ]);
        exit;
    }
    
    try {
        $pdo->beginTransaction();
        $deletedCount = 0;
        $failedCount = 0;
        $errors = [];
        
        foreach ($userIds as $userId) {
            try {
                // Check if user exists
                $existingUser = $db->getUserById($userId);
                if (!$existingUser) {
                    $failedCount++;
                    $errors[] = "User ID {$userId} not found";
                    continue;
                }
                
                // Delete user
                $stmt = $pdo->prepare("DELETE FROM users WHERE User_ID = :user_id");
                $result = $stmt->execute(['user_id' => $userId]);
                
                if ($result) {
                    $deletedCount++;
                } else {
                    $failedCount++;
                    $errors[] = "Failed to delete user ID {$userId}";
                }
            } catch (Exception $e) {
                $failedCount++;
                $errors[] = "Error deleting user ID {$userId}: " . $e->getMessage();
                error_log("Delete User Error (ID: {$userId}): " . $e->getMessage());
            }
        }
        
        $pdo->commit();
        
        if ($deletedCount > 0) {
            // Create notification for users deleted
            require_once __DIR__ . '/create_admin_activity_notification.php';
            createAdminActivityNotification($pdo, 'user_deleted', [
                'user_name' => "{$deletedCount} user(s)",
                'message' => "{$deletedCount} user(s) deleted successfully"
            ]);
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => "Successfully deleted {$deletedCount} user(s)" . ($failedCount > 0 ? ". {$failedCount} failed." : ''),
                'deleted_count' => $deletedCount,
                'failed_count' => $failedCount,
                'errors' => $errors
            ]);
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to delete users',
                'errors' => $errors
            ]);
        }
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Delete Multiple Users API Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'An error occurred while deleting users: ' . $e->getMessage()
        ]);
    }
    
} else {
    // Single user deletion (existing functionality)
    if (!isset($input['user_id']) || empty($input['user_id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'User ID is required'
        ]);
        exit;
    }

    $userId = (int)$input['user_id'];

    // Prevent deleting own account
    if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $userId) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'You cannot delete your own account'
        ]);
        exit;
    }

    // Check if user exists
    $existingUser = $db->getUserById($userId);
    if (!$existingUser) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'User not found'
        ]);
        exit;
    }

    try {
        // Delete user
        $stmt = $pdo->prepare("DELETE FROM users WHERE User_ID = :user_id");
        $result = $stmt->execute(['user_id' => $userId]);
        
        if ($result) {
            // Create notification for user deleted
            require_once __DIR__ . '/create_admin_activity_notification.php';
            $userName = trim(($existingUser['First_Name'] ?? '') . ' ' . ($existingUser['Middle_Name'] ?? '') . ' ' . ($existingUser['Last_Name'] ?? ''));
            createAdminActivityNotification($pdo, 'user_deleted', [
                'user_id' => $userId,
                'user_name' => $userName ?: ($existingUser['email'] ?? 'User'),
                'message' => "User deleted: {$userName}"
            ]);
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'User deleted successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to delete user'
            ]);
        }
        
    } catch (Exception $e) {
        error_log("Delete User API Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'An error occurred while deleting the user. The user may have associated records.'
        ]);
    }
}
?>


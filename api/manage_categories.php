<?php
/**
 * Manage Categories API Endpoint
 * Handles CRUD operations for categories (Admin only)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../includes/db_functions.php';
require_once __DIR__ . '/../includes/session_helper.php';

// Close any existing session first
if (session_status() !== PHP_SESSION_NONE) {
    session_write_close();
}

// Set cookie parameters BEFORE session name (critical for cookie path)
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/MatarixWEB/',
    'domain' => '',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax'
]);

// Start admin session with correct name
$adminSessionCookieName = 'MATARIX_ADMIN_SESSION';
$hasAdminCookie = isset($_COOKIE[$adminSessionCookieName]);

// Set session name FIRST
session_name($adminSessionCookieName);

// If we have a session cookie, use that EXACT session ID to resume the existing session
// Must set session_id BEFORE session_start()
if ($hasAdminCookie && !empty($_COOKIE[$adminSessionCookieName])) {
    $cookieSessionId = $_COOKIE[$adminSessionCookieName];
    session_id($cookieSessionId);
}

session_start();

// Debug logging
error_log("Manage Categories - Session Name: " . session_name());
error_log("Manage Categories - Session ID: " . session_id());
error_log("Manage Categories - Has Admin Cookie: " . ($hasAdminCookie ? 'YES' : 'NO'));
error_log("Manage Categories - Cookies: " . json_encode(array_keys($_COOKIE ?? [])));
error_log("Manage Categories - Session Data: " . json_encode(array_keys($_SESSION ?? [])));

// Check authentication
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode([
        'success' => false, 
        'message' => 'Not authenticated. Please log in again.',
        'debug' => [
            'session_name' => session_name(),
            'session_id' => session_id(),
            'has_logged_in' => isset($_SESSION['logged_in']),
            'logged_in_value' => $_SESSION['logged_in'] ?? null,
            'has_user_id' => isset($_SESSION['user_id']),
            'user_id' => $_SESSION['user_id'] ?? null,
            'user_role' => $_SESSION['user_role'] ?? null,
            'session_keys' => array_keys($_SESSION ?? []),
            'cookies_received' => array_keys($_COOKIE ?? []),
            'admin_session_cookie' => $_COOKIE[$adminSessionCookieName] ?? 'NOT SET'
        ]
    ]);
    exit;
}

// Check admin privileges
$userRole = $_SESSION['user_role'] ?? '';
if (!in_array($userRole, ['Admin', 'Store Employee'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false, 
        'message' => 'Access denied. Admin privileges required.',
        'debug' => [
            'user_role' => $userRole,
            'user_id' => $_SESSION['user_id'] ?? null,
            'required_roles' => ['Admin', 'Store Employee'],
            'session_name' => session_name(),
            'session_id' => session_id()
        ]
    ]);
    exit;
}

$db = new DatabaseFunctions();
$pdo = $db->getConnection();

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    
    switch ($method) {
        case 'GET':
            // Get all categories
            $stmt = $pdo->query("
                SELECT Category_ID, category_name, category_description, category_icon, display_order, is_active, created_at
                FROM categories 
                ORDER BY display_order ASC, category_name ASC
            ");
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'categories' => $categories]);
            break;
            
        case 'POST':
            // Create new category
            $required = ['category_name'];
            foreach ($required as $field) {
                if (!isset($input[$field]) || empty(trim($input[$field]))) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Field '{$field}' is required"]);
                    exit;
                }
            }
            
            // Check if category name already exists
            $checkStmt = $pdo->prepare("SELECT Category_ID FROM categories WHERE category_name = :name");
            $checkStmt->execute(['name' => trim($input['category_name'])]);
            if ($checkStmt->fetch()) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Category name already exists']);
                exit;
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO categories (category_name, category_description, category_icon, display_order, is_active)
                VALUES (:name, :description, :icon, :order, :active)
            ");
            $stmt->execute([
                'name' => trim($input['category_name']),
                'description' => trim($input['category_description'] ?? ''),
                'icon' => trim($input['category_icon'] ?? 'fas fa-box'),
                'order' => (int)($input['display_order'] ?? 0),
                'active' => isset($input['is_active']) ? (int)$input['is_active'] : 1
            ]);
            
            $categoryId = $pdo->lastInsertId();
            echo json_encode([
                'success' => true,
                'message' => 'Category created successfully',
                'category_id' => $categoryId
            ]);
            break;
            
        case 'PUT':
            // Update category
            if (!isset($input['category_id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Category ID is required']);
                exit;
            }
            
            $updateFields = [];
            $params = ['id' => $input['category_id']];
            
            if (isset($input['category_name'])) {
                // Check if new name conflicts with existing category
                $checkStmt = $pdo->prepare("SELECT Category_ID FROM categories WHERE category_name = :name AND Category_ID != :id");
                $checkStmt->execute(['name' => trim($input['category_name']), 'id' => $input['category_id']]);
                if ($checkStmt->fetch()) {
                    http_response_code(409);
                    echo json_encode(['success' => false, 'message' => 'Category name already exists']);
                    exit;
                }
                $updateFields[] = "category_name = :name";
                $params['name'] = trim($input['category_name']);
            }
            
            if (isset($input['category_description'])) {
                $updateFields[] = "category_description = :description";
                $params['description'] = trim($input['category_description']);
            }
            
            if (isset($input['category_icon'])) {
                $updateFields[] = "category_icon = :icon";
                $params['icon'] = trim($input['category_icon']);
            }
            
            if (isset($input['display_order'])) {
                $updateFields[] = "display_order = :order";
                $params['order'] = (int)$input['display_order'];
            }
            
            if (isset($input['is_active'])) {
                $updateFields[] = "is_active = :active";
                $params['active'] = (int)$input['is_active'];
            }
            
            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No fields to update']);
                exit;
            }
            
            $sql = "UPDATE categories SET " . implode(', ', $updateFields) . " WHERE Category_ID = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            echo json_encode(['success' => true, 'message' => 'Category updated successfully']);
            break;
            
        case 'DELETE':
            // Delete category (soft delete by setting is_active = 0)
            if (!isset($input['category_id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Category ID is required']);
                exit;
            }
            
            // Get category name first
            $categoryStmt = $pdo->prepare("SELECT category_name FROM categories WHERE Category_ID = :id");
            $categoryStmt->execute(['id' => $input['category_id']]);
            $category = $categoryStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$category) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Category not found']);
                exit;
            }
            
            $categoryName = $category['category_name'];
            
            // Check if category is used by products (check by category name, not ID)
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM products WHERE category = :category_name");
            $checkStmt->execute(['category_name' => $categoryName]);
            $productCount = $checkStmt->fetchColumn();
            
            // Get list of products using this category
            $productsStmt = $pdo->prepare("SELECT Product_ID, Product_Name FROM products WHERE category = :category_name LIMIT 10");
            $productsStmt->execute(['category_name' => $categoryName]);
            $productsList = $productsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            if ($productCount > 0) {
                // Soft delete (deactivate) - don't hard delete if products exist
                $stmt = $pdo->prepare("UPDATE categories SET is_active = 0 WHERE Category_ID = :id");
                $stmt->execute(['id' => $input['category_id']]);
                
                echo json_encode([
                    'success' => true, 
                    'message' => "Category deactivated. It has {$productCount} product(s) assigned to it. Products will still be visible but the category won't appear in dropdowns.",
                    'product_count' => $productCount,
                    'products' => $productsList,
                    'action' => 'deactivated'
                ]);
            } else {
                // Hard delete - safe to delete if no products
                $stmt = $pdo->prepare("DELETE FROM categories WHERE Category_ID = :id");
                $stmt->execute(['id' => $input['category_id']]);
                echo json_encode([
                    'success' => true, 
                    'message' => 'Category deleted successfully',
                    'action' => 'deleted'
                ]);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (PDOException $e) {
    error_log("Manage Categories API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred',
        'error' => $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Manage Categories API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred',
        'error' => $e->getMessage()
    ]);
}


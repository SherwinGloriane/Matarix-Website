<?php
/**
 * Get Products API Endpoint
 * Returns all products from the database, optionally filtered by category
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

require_once __DIR__ . '/../includes/db_functions.php';

// Get optional category filter
$category = isset($_GET['category']) ? $_GET['category'] : null;

// Initialize database functions
$db = new DatabaseFunctions();

try {
    // Build query with stock status filter
    $pdo = $db->getConnection();
    $sql = "SELECT * FROM products WHERE stock_status IN ('In Stock', 'Low Stock')";
    $params = [];
    
    if ($category) {
        $sql .= " AND category = :category";
        $params['category'] = $category;
    }
    
    $sql .= " ORDER BY Product_Name ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll();
    
    // Format products for response
    $formattedProducts = [];
    foreach ($products as $product) {
        // Skip out of stock products
        if ($product['stock_status'] === 'Out of Stock') {
            continue;
        }
        
        $formattedProducts[] = [
            'product_id' => $product['Product_ID'],
            'product_name' => $product['Product_Name'],
            'category' => $product['category'],
            'price' => number_format((float)$product['price'], 2, '.', ''),
            'stock_level' => $product['stock_level'],
            'stock_status' => $product['stock_status'],
            'length' => $product['length'],
            'width' => $product['Width'],
            'unit' => $product['Unit']
        ];
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'products' => $formattedProducts,
        'count' => count($formattedProducts)
    ]);
    
} catch (Exception $e) {
    error_log("Get Products API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while fetching products'
    ]);
}


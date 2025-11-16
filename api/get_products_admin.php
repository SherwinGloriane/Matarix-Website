<?php
/**
 * Get Products API for Admin
 * Returns ALL products including out of stock items
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
    $pdo = $db->getConnection();
    $sql = "SELECT * FROM products";
    $params = [];
    
    if ($category) {
        $sql .= " WHERE category = :category";
        $params['category'] = $category;
    }
    
    $sql .= " ORDER BY Product_Name ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format products for response
    $formattedProducts = [];
    foreach ($products as $product) {
        $formattedProducts[] = [
            'Product_ID' => $product['Product_ID'],
            'Product_Name' => $product['Product_Name'],
            'category' => $product['category'],
            'price' => number_format((float)$product['price'], 2, '.', ''),
            'stock_level' => $product['stock_level'],
            'Minimum_Stock' => $product['Minimum_Stock'],
            'stock_status' => $product['stock_status'],
            'length' => $product['length'],
            'Width' => $product['Width'],
            'Unit' => $product['Unit'],
            'last_restock' => $product['last_restock']
        ];
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'products' => $formattedProducts,
        'count' => count($formattedProducts)
    ]);
    
} catch (Exception $e) {
    error_log("Get Products Admin API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while fetching products'
    ]);
}
?>


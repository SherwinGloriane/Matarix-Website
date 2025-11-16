<?php
/**
 * Get Product Details API Endpoint
 * Returns detailed product information including variations
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

require_once __DIR__ . '/../includes/db_functions.php';

// Get product ID from query parameter
$productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : null;

if (!$productId) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Product ID is required'
    ]);
    exit;
}

try {
    $db = new DatabaseFunctions();
    $pdo = $db->getConnection();
    
    // Get product details
    $stmt = $pdo->prepare("SELECT * FROM products WHERE Product_ID = :product_id LIMIT 1");
    $stmt->execute(['product_id' => $productId]);
    $product = $stmt->fetch();
    
    if (!$product) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Product not found'
        ]);
        exit;
    }
    
    // Get product variations
    $stmt = $pdo->prepare("SELECT * FROM product_variations WHERE Product_ID = :product_id ORDER BY Variation_ID ASC");
    $stmt->execute(['product_id' => $productId]);
    $variations = $stmt->fetchAll();
    
    // Group variations by variation_name (e.g., Size, Length, etc.)
    $groupedVariations = [];
    foreach ($variations as $variation) {
        $name = $variation['variation_name'];
        if (!isset($groupedVariations[$name])) {
            $groupedVariations[$name] = [];
        }
        $groupedVariations[$name][] = [
            'variation_id' => $variation['Variation_ID'],
            'variation_name' => $variation['variation_name'],
            'variation_value' => $variation['variation_value']
        ];
    }
    
    // Format product data
    $formattedProduct = [
        'product_id' => $product['Product_ID'],
        'product_name' => $product['Product_Name'],
        'description' => $product['description'] ?? '',
        'category' => $product['category'],
        'price' => number_format((float)$product['price'], 2, '.', ''),
        'stock_level' => $product['stock_level'],
        'stock_status' => $product['stock_status'],
        'length' => $product['length'],
        'width' => $product['Width'],
        'unit' => $product['Unit'],
        'variations' => $groupedVariations
    ];
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'product' => $formattedProduct
    ]);
    
} catch (Exception $e) {
    error_log("Get Product Details API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while fetching product details'
    ]);
}


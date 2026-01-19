<?php
/**
 * Get Products API Endpoint
 * Returns all products from the database, optionally filtered by category
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

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
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format products for response
    $formattedProducts = [];
    foreach ($products as $product) {
        // Skip out of stock products
        if ($product['stock_status'] === 'Out of Stock') {
            continue;
        }
        
        // Get product variations
        $variations = [];
        try {
            $variationsStmt = $pdo->prepare("
                SELECT variation_name, variation_value, variation_id 
                FROM product_variations 
                WHERE Product_ID = :product_id
                ORDER BY variation_name, variation_value
            ");
            $variationsStmt->execute(['product_id' => $product['Product_ID']]);
            $variationsData = $variationsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Group variations by name
            $groupedVariations = [];
            foreach ($variationsData as $variation) {
                $name = $variation['variation_name'];
                if (!isset($groupedVariations[$name])) {
                    $groupedVariations[$name] = [];
                }
                $groupedVariations[$name][] = [
                    'variation_id' => $variation['variation_id'],
                    'variation_value' => $variation['variation_value']
                ];
            }
            $variations = $groupedVariations;
        } catch (Exception $e) {
            // Variations table might not exist, continue without them
            error_log("Could not fetch variations for product {$product['Product_ID']}: " . $e->getMessage());
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
            'unit' => $product['Unit'],
            'description' => isset($product['description']) ? $product['description'] : null,
            'image_path' => isset($product['image_path']) ? $product['image_path'] : null,
            'variations' => $variations
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


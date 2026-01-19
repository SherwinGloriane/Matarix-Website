<?php
/**
 * Get Order Settings API
 * Returns minimum order configuration settings
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');
header('Cache-Control: no-cache, no-store, must-revalidate'); // Prevent browser caching
header('Pragma: no-cache');
header('Expires: 0');

require_once __DIR__ . '/../includes/db_functions.php';

try {
    $db = new DatabaseFunctions();
    $pdo = $db->getConnection();
    
    // Get all order settings
    $stmt = $pdo->query("SELECT setting_key, setting_value, description FROM order_settings");
    $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert to key-value array
    $settingsArray = [];
    foreach ($settings as $setting) {
        $settingsArray[$setting['setting_key']] = $setting['setting_value'];
    }
    
    // Get smallest vehicle capacity if auto-calculate is enabled
    $minWeightKg = (float)($settingsArray['min_order_weight_kg'] ?? 200);
    
    if (isset($settingsArray['auto_calculate_from_fleet']) && $settingsArray['auto_calculate_from_fleet'] == '1') {
        $capacityStmt = $pdo->query("
            SELECT MIN(
                CASE capacity_unit
                    WHEN 'kg' THEN capacity
                    WHEN 'g' THEN capacity / 1000
                    WHEN 'lb' THEN capacity * 0.453592
                    WHEN 'oz' THEN capacity * 0.0283495
                    WHEN 'ton' THEN capacity * 1000
                    ELSE capacity
                END
            ) as min_capacity_kg
            FROM fleet
            WHERE capacity IS NOT NULL AND capacity > 0
        ");
        $capacityResult = $capacityStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($capacityResult && $capacityResult['min_capacity_kg']) {
            $smallestCapacity = (float)$capacityResult['min_capacity_kg'];
            $percentage = (float)($settingsArray['min_order_weight_percentage'] ?? 25);
            
            // Calculate minimum: smallestCapacity * percentage / 100
            // Round to 2 decimal places
            $calculatedMin = round($smallestCapacity * ($percentage / 100), 2);
            
            // Apply safety floor: max(50, calculated) only if calculated is less than 50
            // This ensures minimum is never below 50kg for safety, but allows higher values
            // However, if user wants lower minimums, we should respect their percentage choice
            // So we'll use the calculated value directly, but ensure it's at least 1kg (reasonable minimum)
            $calculatedMin = max(1, $calculatedMin); // Minimum 1kg to prevent zero or negative
            $minWeightKg = $calculatedMin;
            
            // Log for debugging
            error_log("Order Settings Calculation: smallestCapacity={$smallestCapacity}kg, percentage={$percentage}%, calculatedMin={$calculatedMin}kg");
        } else {
            error_log("Order Settings: No fleet capacity found, using default min_weight_kg");
        }
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'settings' => [
            'min_order_weight_kg' => $minWeightKg,
            'min_order_weight_percentage' => (float)($settingsArray['min_order_weight_percentage'] ?? 25),
            'min_order_value' => (float)($settingsArray['min_order_value'] ?? 0),
            'allow_below_minimum_with_fee' => (bool)($settingsArray['allow_below_minimum_with_fee'] ?? '0'),
            'premium_delivery_fee' => (float)($settingsArray['premium_delivery_fee'] ?? 500),
            'allow_heavy_single_items' => (bool)($settingsArray['allow_heavy_single_items'] ?? '1'),
            'auto_calculate_from_fleet' => (bool)($settingsArray['auto_calculate_from_fleet'] ?? '1'),
            'min_advance_notice_days' => (int)($settingsArray['min_advance_notice_days'] ?? 3),
            'max_advance_notice_days' => (int)($settingsArray['max_advance_notice_days'] ?? 30)
        ],
        'raw_settings' => $settingsArray
    ]);
    
} catch (Exception $e) {
    error_log("Get Order Settings Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to get order settings: ' . $e->getMessage(),
        'settings' => [
            'min_order_weight_kg' => 200, // Fallback default
            'min_order_value' => 0,
            'allow_below_minimum_with_fee' => false,
            'premium_delivery_fee' => 500,
            'allow_heavy_single_items' => true,
            'auto_calculate_from_fleet' => true
        ]
    ]);
}
?>


<?php
/**
 * Create Test User Script
 * Use this to create a test admin or customer user for testing login
 * 
 * Usage: Run this file in your browser or via command line
 * Example: php create_test_user.php
 */

require_once 'includes/db_functions.php';

// Configuration - Change these values as needed
$testUsers = [
    [
        'email' => 'admin@matarik.com',
        'password' => 'admin123',
        'first_name' => 'Admin',
        'last_name' => 'User',
        'address' => '123 Admin Street',
        'role' => 'Admin'
    ],
    [
        'email' => 'customer@matarik.com',
        'password' => 'customer123',
        'first_name' => 'Customer',
        'last_name' => 'User',
        'address' => '456 Customer Avenue',
        'role' => 'Customer'
    ]
];

echo "Creating Test Users...\n\n";

$db = new DatabaseFunctions();

foreach ($testUsers as $userData) {
    // Check if user already exists
    if ($db->emailExists($userData['email'])) {
        echo "⚠ User with email '{$userData['email']}' already exists. Skipping...\n";
        continue;
    }
    
    // Create user
    $userId = $db->insertUser($userData);
    
    if ($userId) {
        echo "✓ Created {$userData['role']} user:\n";
        echo "  Email: {$userData['email']}\n";
        echo "  Password: {$userData['password']}\n";
        echo "  User ID: $userId\n\n";
    } else {
        echo "✗ Failed to create user: {$userData['email']}\n\n";
    }
}

echo "Done! You can now use these credentials to test login.\n";
echo "\nTest Credentials:\n";
echo "Admin Login:\n";
echo "  Email: admin@matarik.com\n";
echo "  Password: admin123\n\n";
echo "Customer Login:\n";
echo "  Email: customer@matarik.com\n";
echo "  Password: customer123\n";


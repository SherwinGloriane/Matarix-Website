<?php
/**
 * Test Database Connection
 * Run this file to verify your database connection is working
 */

echo "Testing Database Connection...\n\n";

try {
    // Create connection directly
    $db_host = getenv('DB_HOST') ?: '127.0.0.1';
    $db_port = getenv('DB_PORT') ?: '3306';
    $db_name = getenv('DB_DATABASE') ?: 'matarik';
    $db_username = getenv('DB_USERNAME') ?: 'root';
    $db_password = getenv('DB_PASSWORD') ?: '';
    
    $dsn = "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ];
    
    $pdo = new PDO($dsn, $db_username, $db_password, $options);
    $pdo->exec("SET time_zone = '+00:00'");
    
    echo "✓ Database connection successful!\n\n";
    
    // Test query
    $stmt = $pdo->query("SELECT DATABASE() as db_name");
    $result = $stmt->fetch();
    echo "Connected to database: " . $result['db_name'] . "\n\n";
    
    // Check if users table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
    if ($stmt->rowCount() > 0) {
        echo "✓ Users table exists\n";
        
        // Count users
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
        $result = $stmt->fetch();
        echo "Total users in database: " . $result['count'] . "\n\n";
        
        // Show sample users (without passwords)
        if ($result['count'] > 0) {
            echo "Sample users:\n";
            $stmt = $pdo->query("SELECT User_ID, email, role, First_Name, Last_Name FROM users LIMIT 5");
            $users = $stmt->fetchAll();
            foreach ($users as $user) {
                echo "  - ID: {$user['User_ID']}, Email: {$user['email']}, Role: {$user['role']}, Name: {$user['First_Name']} {$user['Last_Name']}\n";
            }
        } else {
            echo "⚠ No users found in database. You may need to register a user first.\n";
        }
    } else {
        echo "⚠ Users table does not exist. Please import matarik.sql to create the database structure.\n";
    }
    
    echo "\n✓ All tests passed! Your database is ready to use.\n";
    
} catch (PDOException $e) {
    echo "✗ Database connection failed!\n";
    echo "Error: " . $e->getMessage() . "\n\n";
    echo "Please check:\n";
    echo "1. XAMPP MySQL is running\n";
    echo "2. Database 'matarik' exists\n";
    echo "3. Username and password in connection.php are correct\n";
    echo "4. Import matarik.sql if you haven't already\n";
}


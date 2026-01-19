<?php
/**
 * Create Password Reset Tokens Table
 * Run this once to create the password_reset_tokens table
 */

require_once __DIR__ . '/../includes/db_functions.php';

try {
    $db = new DatabaseFunctions();
    $pdo = new PDO(
        "mysql:host=127.0.0.1;port=3306;dbname=matarik;charset=utf8mb4",
        'root',
        '',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    
    // Create password_reset_tokens table
    $sql = "CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_token (token),
        INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
    
    echo json_encode([
        'success' => true,
        'message' => 'Password reset tokens table created successfully'
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error creating table: ' . $e->getMessage()
    ]);
}


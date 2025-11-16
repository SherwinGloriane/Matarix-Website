<?php
/**
 * Session Helper Functions
 * Provides functions for managing user sessions
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Check if user is logged in
 * @return bool
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

/**
 * Get current user ID
 * @return int|null
 */
function getUserId() {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get current user role
 * @return string|null
 */
function getUserRole() {
    return $_SESSION['user_role'] ?? null;
}

/**
 * Get current user email
 * @return string|null
 */
function getUserEmail() {
    return $_SESSION['user_email'] ?? null;
}

/**
 * Get current user name
 * @return string|null
 */
function getUserName() {
    return $_SESSION['user_name'] ?? null;
}

/**
 * Check if user has specific role
 * @param string|array $roles Role or array of roles to check
 * @return bool
 */
function hasRole($roles) {
    $userRole = getUserRole();
    if (is_array($roles)) {
        return in_array($userRole, $roles);
    }
    return $userRole === $roles;
}

/**
 * Require user to be logged in (redirect if not)
 * @param string $redirectUrl URL to redirect to if not logged in
 */
function requireLogin($redirectUrl = '../Customer/Login.html') {
    if (!isLoggedIn()) {
        header('Location: ' . $redirectUrl);
        exit;
    }
}

/**
 * Require specific role (redirect if not)
 * @param string|array $roles Required role(s)
 * @param string $redirectUrl URL to redirect to if role doesn't match
 */
function requireRole($roles, $redirectUrl = '../Customer/Login.html') {
    requireLogin($redirectUrl);
    if (!hasRole($roles)) {
        header('Location: ' . $redirectUrl);
        exit;
    }
}

/**
 * Logout user
 */
function logout() {
    session_start();
    $_SESSION = array();
    
    // Destroy session cookie
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }
    
    session_destroy();
}


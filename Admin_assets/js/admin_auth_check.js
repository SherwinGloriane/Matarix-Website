/**
 * Admin Authentication Check Script
 * Verifies PHP session on page load and ensures session persistence across pages
 * This script checks the server-side session and maintains user_id in URLs
 */

(function() {
    'use strict';
    
    // Check if user is already authenticated via session
    function checkSession() {
        // First check if we have user_id in URL (already authenticated)
        const urlParams = new URLSearchParams(window.location.search);
        const userIdFromUrl = urlParams.get('user_id');
        
        if (userIdFromUrl) {
            console.log('User ID found in URL:', userIdFromUrl);
            // Store in sessionStorage for quick access
            sessionStorage.setItem('user_id', userIdFromUrl);
            return Promise.resolve({
                logged_in: true,
                user_id: userIdFromUrl
            });
        }
        
        // Check sessionStorage as backup
        const userIdFromStorage = sessionStorage.getItem('user_id');
        if (userIdFromStorage) {
            console.log('User ID found in sessionStorage:', userIdFromStorage);
            // Add to URL if not present
            if (!userIdFromUrl) {
                addUserIdToCurrentUrl(userIdFromStorage);
            }
            return Promise.resolve({
                logged_in: true,
                user_id: userIdFromStorage
            });
        }
        
        // Check PHP session via API
        console.log('Checking PHP session via API...');
        return fetch('../api/check_session.php', {
            method: 'GET',
            credentials: 'include' // Important: include cookies for session
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Session check failed');
            }
            return response.json();
        })
        .then(data => {
            console.log('Session check response:', data);
            
            if (data.logged_in && data.user_id) {
                // Session exists, store user info
                sessionStorage.setItem('user_id', data.user_id);
                if (data.user_email) sessionStorage.setItem('user_email', data.user_email);
                if (data.user_role) sessionStorage.setItem('user_role', data.user_role);
                if (data.user_name) sessionStorage.setItem('user_name', data.user_name);
                
                // Add user_id to current URL if not present
                if (!userIdFromUrl) {
                    addUserIdToCurrentUrl(data.user_id);
                }
                
                return data;
            } else {
                // No session, redirect to login
                console.log('No active session, redirecting to login...');
                sessionStorage.removeItem('user_id');
                sessionStorage.removeItem('user_email');
                sessionStorage.removeItem('user_role');
                sessionStorage.removeItem('user_name');
                
                // Store current page for redirect after login (only if not already on login page)
                if (!window.location.href.includes('AdminLogin.html')) {
                    sessionStorage.setItem('redirect_after_login', window.location.href);
                }
                
                // Redirect to admin login
                window.location.href = '../Admin/AdminLogin.html';
                return null;
            }
        })
        .catch(error => {
            console.error('Error checking session:', error);
            // On error, check if we have any stored user info
            const storedUserId = sessionStorage.getItem('user_id');
            if (storedUserId) {
                console.log('Using stored user ID due to API error');
                // Add to URL if not present
                if (!userIdFromUrl) {
                    addUserIdToCurrentUrl(storedUserId);
                }
                return {
                    logged_in: true,
                    user_id: storedUserId
                };
            }
            
            // No stored info and API failed - only redirect if not already on login page
            if (!window.location.href.includes('AdminLogin.html')) {
                window.location.href = '../Admin/AdminLogin.html';
            }
            return null;
        });
    }
    
    /**
     * Add user_id to current URL without reloading
     */
    function addUserIdToCurrentUrl(userId) {
        const url = new URL(window.location.href);
        url.searchParams.set('user_id', userId);
        
        // Use replaceState to update URL without reload
        window.history.replaceState({}, '', url.toString());
        console.log('Added user_id to URL:', url.toString());
    }
    
    /**
     * Initialize authentication check
     */
    function init() {
        // Skip authentication check on login, registration, and forgot password pages
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes('adminlogin.html') || 
            currentPath.includes('adminregistration.html') || 
            currentPath.includes('forgotpassword.html')) {
            console.log('Skipping auth check on login/registration page');
            return;
        }
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                checkSession();
            });
        } else {
            // DOM already ready
            checkSession();
        }
    }
    
    // Export functions for global access
    window.AdminAuthCheck = {
        checkSession: checkSession,
        addUserIdToCurrentUrl: addUserIdToCurrentUrl
    };
    
    // Initialize immediately
    init();
    
})();


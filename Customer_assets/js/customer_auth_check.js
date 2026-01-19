/**
 * Customer Authentication Check Script
 * Verifies PHP session on page load and ensures session persistence across pages
 * This script checks the server-side session and maintains user_id in URLs
 */

(function() {
    'use strict';
    
    // Skip authentication check on login, registration, and forgot password pages
    const currentPath = window.location.pathname.toLowerCase();
    if (currentPath.includes('login.html') || 
        currentPath.includes('registration.html') || 
        currentPath.includes('forgotpassword.html') ||
        currentPath.includes('adminlogin.html') ||
        currentPath.includes('adminregistration.html')) {
        console.log('Skipping auth check on login/registration page');
        return;
    }
    
    // Check if user is already authenticated via session
    function checkSession() {
        // First check if we have user_id in URL (already authenticated)
        const urlParams = new URLSearchParams(window.location.search);
        const userIdFromUrl = urlParams.get('user_id');
        
        // Check if we're coming from landing page (index.html) - if so, don't auto-add user_id
        const referrer = document.referrer;
        const isFromLanding = referrer.includes('index.html') || referrer.includes('LandingPage.html') || 
                             referrer === '' || referrer.includes(window.location.origin + '/') ||
                             sessionStorage.getItem('navigationOrigin') === 'landing';
        
        // Check if current page is a protected page that requires authentication
        // MainPage.html is the authenticated version of the landing page, so it should check session
        const protectedPages = ['customerprofile', 'cart', 'checkout', 'ordersummary', 'transactionhistory', 'delivery-tracking', 'deliverytracking', 'mainpage'];
        const isProtectedPage = protectedPages.some(page => currentPath.includes(page));
        
        // Also check if we're on MainPage - it should verify session if user has one
        const isMainPage = currentPath.includes('mainpage.html');
        
        if (userIdFromUrl) {
            console.log('User ID found in URL:', userIdFromUrl);
            // Store in sessionStorage for quick access
            sessionStorage.setItem('user_id', userIdFromUrl);
            return Promise.resolve({
                logged_in: true,
                user_id: userIdFromUrl
            });
        }
        
        // Check if user has sessionStorage user_id - if so, they're likely logged in and we should verify
        const userIdFromStorage = sessionStorage.getItem('user_id');
        
        // If coming from landing page and no user_id in URL, only skip session check for truly PUBLIC pages
        // Protected pages, MainPage, and pages where user has sessionStorage should ALWAYS check the session
        if (isFromLanding && !userIdFromUrl && !isProtectedPage && !isMainPage && !userIdFromStorage) {
            console.log('Coming from landing page without user_id on public page - skipping session check to prevent auto-login');
            // Clear any stale sessionStorage data
            sessionStorage.removeItem('user_id');
            sessionStorage.removeItem('user_email');
            sessionStorage.removeItem('user_role');
            sessionStorage.removeItem('user_name');
            return Promise.resolve({ logged_in: false });
        }
        
        // If user has sessionStorage user_id but no URL user_id, check session to verify and add to URL
        if (userIdFromStorage && !userIdFromUrl) {
            console.log('User has sessionStorage user_id but not in URL - checking server session to verify...');
        }
        
        // For protected pages and MainPage, always check session even if coming from landing page
        if ((isProtectedPage || isMainPage) && !userIdFromUrl) {
            console.log((isMainPage ? 'MainPage' : 'Protected page') + ' without user_id in URL - checking server session...');
        }
        
        // Check sessionStorage as backup - but verify with server first
        // Don't trust sessionStorage alone, always verify with server
        // Note: userIdFromStorage is already declared above, so we reuse it here
        if (userIdFromStorage && userIdFromUrl) {
            // If both exist, trust it (user came from another page with valid session)
            console.log('User ID found in both URL and sessionStorage:', userIdFromStorage);
            return Promise.resolve({
                logged_in: true,
                user_id: userIdFromStorage
            });
        }
        
        // If only in sessionStorage but not in URL, check if we're on a protected page
        // For protected pages, we should verify with server, but for now trust sessionStorage
        // to prevent redirect loops
        if (userIdFromStorage && !userIdFromUrl) {
            const protectedPages = ['customerprofile', 'cart', 'checkout', 'ordersummary', 'transactionhistory', 'delivery-tracking', 'deliverytracking'];
            const isProtectedPage = protectedPages.some(page => currentPath.includes(page));
            
            if (isProtectedPage) {
                // On protected page with sessionStorage but no URL - add to URL and trust it
                console.log('Protected page with sessionStorage user_id, adding to URL:', userIdFromStorage);
                addUserIdToCurrentUrl(userIdFromStorage);
                return Promise.resolve({
                    logged_in: true,
                    user_id: userIdFromStorage
                });
            }
        }
        
        // Check PHP session via API
        // Determine correct API path based on current page location
        const isRoot = window.location.pathname.includes('/index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '/MatarixWEB/';
        const isInCustomerFolder = window.location.pathname.includes('/Customer/');
        let apiPath = '../api/check_session.php';
        if (isRoot) {
            apiPath = 'api/check_session.php';
        } else if (isInCustomerFolder) {
            apiPath = '../api/check_session.php';
        }
        
        console.log('Checking PHP session via API...', apiPath);
        return fetch(apiPath, {
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
                // No session - clear any stale data
                console.log('No active session found - clearing stale user data');
                sessionStorage.removeItem('user_id');
                sessionStorage.removeItem('user_email');
                sessionStorage.removeItem('user_role');
                sessionStorage.removeItem('user_name');
                
                // Remove user_id from URL if present
                const url = new URL(window.location.href);
                if (url.searchParams.has('user_id')) {
                    url.searchParams.delete('user_id');
                    window.history.replaceState({}, '', url.toString());
                    console.log('Removed user_id from URL - user not logged in');
                }
                
                // For customer pages, we might allow browsing without login
                // Only redirect if it's a protected page (like profile, cart, checkout)
                const protectedPages = ['customerprofile', 'cart', 'checkout', 'ordersummary', 'transactionhistory', 'delivery-tracking', 'deliverytracking'];
                const isProtectedPage = protectedPages.some(page => currentPath.includes(page));
                
                if (isProtectedPage) {
                    console.log('No active session on protected page, redirecting to login...');
                    
                    // Store current page for redirect after login
                    sessionStorage.setItem('redirect_after_login', window.location.href);
                    
                    // Redirect to customer login
                    window.location.href = '../Customer/Login.html';
                    return null;
                } else {
                    // Public page, allow browsing without login
                    console.log('Public page - allowing access without login');
                    return { logged_in: false };
                }
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
            
            // No stored info and API failed - only redirect if protected page
            const protectedPages = ['customerprofile', 'cart', 'checkout', 'ordersummary', 'transactionhistory', 'delivery-tracking', 'deliverytracking'];
            const isProtectedPage = protectedPages.some(page => currentPath.includes(page));
            
            if (isProtectedPage && !window.location.href.includes('Login.html')) {
                window.location.href = '../Customer/Login.html';
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
    window.CustomerAuthCheck = {
        checkSession: checkSession,
        addUserIdToCurrentUrl: addUserIdToCurrentUrl
    };
    
    // Initialize immediately
    init();
    
})();


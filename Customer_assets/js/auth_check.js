/**
 * Authentication Check Script
 * Checks if user is logged in via URL parameter (user_id)
 * and handles protected button clicks
 */

// Debug: Check if script is loading
console.log('auth_check.js loaded');

// Ensure jQuery is loaded before proceeding
if (typeof jQuery === 'undefined') {
    console.error('jQuery is not loaded! auth_check.js requires jQuery.');
} else {
    console.log('jQuery version:', jQuery.fn.jquery);
}

// Wait for jQuery to be ready
(function($) {
    'use strict';
    
    $(document).ready(function() {
        console.log('auth_check.js: Document ready, jQuery loaded');
    
        /**
         * Get user_id from URL parameters
         * Returns user_id if present, null otherwise
         */
        function getUserIdFromURL() {
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('user_id');
            console.log('User ID from URL:', userId);
            return userId;
        }
        
        /**
         * Check if user is logged in by checking URL for user_id
         * Returns true if user_id is present, false otherwise
         */
        function isUserLoggedIn() {
            const userId = getUserIdFromURL();
            return userId !== null && userId !== '';
        }
        
        /**
         * Add user_id parameter to a URL
         * Preserves existing parameters
         */
        function addUserIdToUrl(url) {
            const userId = getUserIdFromURL();
            if (!userId) {
                return url; // No user_id to add
            }
            
            // Check if URL already has parameters
            const separator = url.includes('?') ? '&' : '?';
            // Remove existing user_id if present
            const urlWithoutUserId = url.split('?')[0];
            const existingParams = url.includes('?') ? url.split('?')[1] : '';
            const params = new URLSearchParams(existingParams);
            params.set('user_id', userId);
            
            return urlWithoutUserId + '?' + params.toString();
        }
        
        /**
         * Handle protected button clicks
         * Checks if user_id is in URL and redirects to login if not logged in
         */
        function handleProtectedClick(e, targetUrl) {
            console.log('handleProtectedClick called, targetUrl:', targetUrl);
            
            // Always prevent default first
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Check if user is logged in (has user_id in URL)
            const isLoggedIn = isUserLoggedIn();
            console.log('User logged in check result:', isLoggedIn);
            
            if (!isLoggedIn) {
                // Store the intended destination in sessionStorage
                sessionStorage.setItem('redirect_after_login', targetUrl);
                // Redirect to login page
                console.log('Not logged in, redirecting to login page');
                window.location.href = './Login.html';
                return false;
            } else {
                // User is logged in, add user_id to target URL and navigate
                const urlWithUserId = addUserIdToUrl(targetUrl);
                console.log('Logged in, allowing navigation to:', urlWithUserId);
                // Use UrlAuthHelper if available, otherwise use our function
                if (window.UrlAuthHelper && window.UrlAuthHelper.addUserIdToUrl) {
                    window.location.href = window.UrlAuthHelper.addUserIdToUrl(targetUrl);
                } else {
                    window.location.href = urlWithUserId;
                }
                return true;
            }
        }
        
        // Handle Add to Cart button clicks
        $(document).on('click', '.add-to-cart-btn', function(e) {
            console.log('Add to Cart clicked');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            const $button = $(this);
            const targetUrl = $button.attr('href') || './Cart.html';
            
            // Extract product information from URL parameters if available
            const urlParams = new URLSearchParams(targetUrl.split('?')[1] || '');
            const productId = urlParams.get('add') ? urlParams.get('add').replace('product-', '') : null;
            const productName = urlParams.get('name') ? decodeURIComponent(urlParams.get('name')) : null;
            const quantity = urlParams.get('quantity') || '1';
            const price = urlParams.get('price') ? parseFloat(urlParams.get('price')) : null;
            
            // Format price for display
            const formattedPrice = price ? '₱' + price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) : '';
            
            // Build confirmation message
            let confirmMessage = 'Are you sure you want to add this item to your cart?';
            
            // Add product details if available
            const quantityNum = parseInt(quantity) || 1;
            
            if (productName) {
                confirmMessage = `Are you sure you want to add "${productName}" to your cart?`;
            }
            
            // Add quantity and price information if available
            if (quantityNum > 1 || formattedPrice) {
                confirmMessage += '\n\n';
                if (quantityNum > 1) {
                    confirmMessage += `Quantity: ${quantityNum}\n`;
                }
                if (formattedPrice) {
                    confirmMessage += `Price per item: ${formattedPrice}`;
                    if (quantityNum > 1) {
                        const totalPrice = price * quantityNum;
                        confirmMessage += `\nTotal: ₱${totalPrice.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}`;
                    }
                }
            }
            
            // Show confirmation dialog
            const userConfirmed = confirm(confirmMessage);
            
            if (userConfirmed) {
                // User confirmed, proceed with adding to cart
                console.log('User confirmed adding to cart');
                handleProtectedClick(e, targetUrl);
            } else {
                // User cancelled
                console.log('User cancelled adding to cart');
            }
            // If user cancels, do nothing (preventDefault already called)
            return false;
        });
        
        // Handle Profile button click
        $(document).on('click', '.login-btn', function(e) {
            console.log('Profile button clicked');
            const targetUrl = $(this).attr('href') || './CustomerProfile.html';
            handleProtectedClick(e, targetUrl);
            return false;
        });
        
        // Handle Cart button click
        $(document).on('click', '.cart-btn', function(e) {
            console.log('Cart button clicked');
            const targetUrl = $(this).attr('href') || './Cart.html';
            handleProtectedClick(e, targetUrl);
            return false;
        });
        
        // Handle Notification button click
        $(document).on('click', '.signin-btn', function(e) {
            console.log('Notification button clicked');
            const targetUrl = $(this).attr('href') || './notifications.html';
            handleProtectedClick(e, targetUrl);
            return false;
        });
        
        // Also handle any link containing CustomerProfile (as backup)
        $(document).on('click', 'a[href*="CustomerProfile"]', function(e) {
            if ($(this).hasClass('login-btn')) {
                return; // Already handled above
            }
            console.log('CustomerProfile link clicked');
            const targetUrl = $(this).attr('href') || './CustomerProfile.html';
            handleProtectedClick(e, targetUrl);
            return false;
        });
        
        // Also handle any link containing Cart.html (as backup)
        $(document).on('click', 'a[href*="Cart.html"]', function(e) {
            if ($(this).hasClass('cart-btn')) {
                return; // Already handled above
            }
            console.log('Cart link clicked');
            const targetUrl = $(this).attr('href') || './Cart.html';
            handleProtectedClick(e, targetUrl);
            return false;
        });
        
        // Also handle any link containing notifications (as backup)
        $(document).on('click', 'a[href*="notifications"]', function(e) {
            if ($(this).hasClass('signin-btn')) {
                return; // Already handled above
            }
            console.log('Notifications link clicked');
            const targetUrl = $(this).attr('href') || './notifications.html';
            handleProtectedClick(e, targetUrl);
            return false;
        });
        
    }); // End of document.ready
    
})(jQuery); // End of jQuery wrapper

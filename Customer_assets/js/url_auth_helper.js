/**
 * URL Authentication Helper
 * Comprehensive solution to maintain user_id in URL across all pages and navigation methods
 * This script MUST be loaded on every page to preserve user_id
 */

(function() {
    'use strict';
    
    /**
     * Get user_id from current URL
     * @returns {string|null} User ID or null if not present
     */
    function getUserId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('user_id');
    }
    
    /**
     * Check if user is logged in (has user_id in URL)
     * @returns {boolean} True if user_id is present
     */
    function isLoggedIn() {
        return getUserId() !== null && getUserId() !== '';
    }
    
    /**
     * Add user_id to a URL
     * @param {string} url - The URL to add user_id to
     * @returns {string} URL with user_id parameter
     */
    function addUserIdToUrl(url) {
        const userId = getUserId();
        if (!userId || !url) {
            return url; // No user_id to add or no URL
        }
        
        // Skip external URLs, javascript:, mailto:, tel:, anchors
        if (url.startsWith('http://') || 
            url.startsWith('https://') || 
            url.startsWith('javascript:') || 
            url.startsWith('mailto:') || 
            url.startsWith('tel:') ||
            url.startsWith('#') ||
            url === '') {
            return url;
        }
        
        // Skip if user_id is already in the URL
        if (url.includes('user_id=')) {
            return url;
        }
        
        // Remove hash if present (we'll add it back later)
        const hash = url.includes('#') ? '#' + url.split('#')[1] : '';
        const urlWithoutHash = url.split('#')[0];
        
        // Check if URL already has parameters
        const separator = urlWithoutHash.includes('?') ? '&' : '?';
        // Remove existing user_id if present
        const urlBase = urlWithoutHash.split('?')[0];
        const existingParams = urlWithoutHash.includes('?') ? urlWithoutHash.split('?')[1] : '';
        const params = new URLSearchParams(existingParams);
        params.set('user_id', userId);
        
        return urlBase + '?' + params.toString() + hash;
    }
    
    /**
     * Intercept all link clicks to preserve user_id
     */
    function interceptLinkClicks() {
        // Use event delegation to catch all link clicks, including dynamically added ones
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a[href]');
            if (!link) {
                return; // Not a link click
            }
            
            const href = link.getAttribute('href');
            
            // Skip if it's an external URL, javascript:, mailto:, tel:, anchor, or empty
            if (!href || 
                href.startsWith('http://') || 
                href.startsWith('https://') || 
                href.startsWith('javascript:') || 
                href.startsWith('mailto:') || 
                href.startsWith('tel:') ||
                href.startsWith('#') ||
                href === '') {
                return; // Allow normal behavior
            }
            
            // Skip if user_id is already in the URL
            if (href.includes('user_id=')) {
                return; // Already has user_id
            }
            
            // Only intercept if we have a user_id to preserve
            if (isLoggedIn()) {
                e.preventDefault();
                e.stopPropagation();
                
                const urlWithUserId = addUserIdToUrl(href);
                console.log('Intercepting link click, preserving user_id:', href, '->', urlWithUserId);
                window.location.href = urlWithUserId;
            }
        }, true); // Use capture phase to intercept early
    }
    
    /**
     * Intercept inline onclick handlers and window.location.href assignments
     * This is more aggressive and catches programmatic navigation
     */
    function interceptProgrammaticNavigation() {
        // Override window.location.href setter
        const originalLocation = window.location;
        let locationHrefDescriptor = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href');
        
        if (locationHrefDescriptor && locationHrefDescriptor.set) {
            const originalSetter = locationHrefDescriptor.set;
            
            Object.defineProperty(window.Location.prototype, 'href', {
                set: function(url) {
                    if (isLoggedIn() && url && typeof url === 'string') {
                        const urlWithUserId = addUserIdToUrl(url);
                        console.log('Intercepting location.href setter, preserving user_id:', url, '->', urlWithUserId);
                        originalSetter.call(this, urlWithUserId);
                    } else {
                        originalSetter.call(this, url);
                    }
                },
                get: function() {
                    return originalLocation.href;
                },
                configurable: true
            });
        }
        
        // Also intercept window.location.assign and replace
        // Note: These methods are often read-only in modern browsers for security reasons
        // We'll skip overriding them since the href setter above handles most navigation cases
        // If assign/replace are used directly, they won't preserve user_id, but href navigation will
        // This is acceptable since most navigation uses href anyway
        console.log('Skipping location.assign/replace override (read-only in this browser). href setter will handle navigation.');
        
        // Intercept button clicks with inline onclick that use window.location
        document.addEventListener('click', function(e) {
            const target = e.target;
            if (target.tagName === 'BUTTON' || target.closest('button')) {
                const button = target.tagName === 'BUTTON' ? target : target.closest('button');
                const onclick = button.getAttribute('onclick');
                
                if (onclick && onclick.includes('window.location') && isLoggedIn()) {
                    // Extract URL from onclick
                    const urlMatch = onclick.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
                    if (urlMatch && urlMatch[1]) {
                        const originalUrl = urlMatch[1];
                        const urlWithUserId = addUserIdToUrl(originalUrl);
                        
                        if (urlWithUserId !== originalUrl) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            
                            console.log('Intercepting button onclick, preserving user_id:', originalUrl, '->', urlWithUserId);
                            window.location.href = urlWithUserId;
                        }
                    }
                }
            }
        }, true);
    }
    
    /**
     * Intercept form submissions to preserve user_id
     */
    function interceptFormSubmissions() {
        document.addEventListener('submit', function(e) {
            const form = e.target;
            if (form.tagName !== 'FORM') {
                return;
            }
            
            const action = form.getAttribute('action');
            if (!action || action === '') {
                return; // No action specified
            }
            
            // Skip external URLs
            if (action.startsWith('http://') || action.startsWith('https://')) {
                return;
            }
            
            // Skip if user_id is already in the action
            if (action.includes('user_id=')) {
                return;
            }
            
            // Only intercept if we have a user_id to preserve
            if (isLoggedIn()) {
                const urlWithUserId = addUserIdToUrl(action);
                console.log('Intercepting form submission, preserving user_id:', action, '->', urlWithUserId);
                form.setAttribute('action', urlWithUserId);
            }
        }, true);
    }
    
    /**
     * Make all links on the page preserve user_id parameter
     * Call this on page load to automatically maintain user_id in all links
     */
    function preserveUserIdInLinks() {
        if (!isLoggedIn()) {
            return; // No user_id to preserve
        }
        
        // Handle all anchor tags
        document.querySelectorAll('a[href]').forEach(function(link) {
            const href = link.getAttribute('href');
            
            // Skip if it's already an external URL, javascript:, mailto:, tel:, etc.
            if (!href || 
                href.startsWith('http://') || 
                href.startsWith('https://') || 
                href.startsWith('javascript:') || 
                href.startsWith('mailto:') || 
                href.startsWith('tel:') ||
                href.startsWith('#') ||
                href === '') {
                return;
            }
            
            // Skip if user_id is already in the URL
            if (href.includes('user_id=')) {
                return;
            }
            
            // Add user_id to the href
            link.setAttribute('href', addUserIdToUrl(href));
        });
        
        // Also handle buttons with onclick
        document.querySelectorAll('button[onclick]').forEach(function(button) {
            const onclick = button.getAttribute('onclick');
            if (onclick && onclick.includes('window.location') && isLoggedIn()) {
                const urlMatch = onclick.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
                if (urlMatch && urlMatch[1]) {
                    const originalUrl = urlMatch[1];
                    const urlWithUserId = addUserIdToUrl(originalUrl);
                    
                    if (urlWithUserId !== originalUrl) {
                        const newOnclick = onclick.replace(originalUrl, urlWithUserId);
                        button.setAttribute('onclick', newOnclick);
                        console.log('Updated button onclick to preserve user_id:', originalUrl, '->', urlWithUserId);
                    }
                }
            }
        });
    }
    
    /**
     * Initialize all interceptors
     */
    function init() {
        // Intercept link clicks (most important)
        interceptLinkClicks();
        
        // Intercept programmatic navigation (window.location.href, onclick handlers)
        interceptProgrammaticNavigation();
        
        // Intercept form submissions
        interceptFormSubmissions();
        
        // Preserve user_id in existing links on page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', preserveUserIdInLinks);
        } else {
            preserveUserIdInLinks();
        }
        
        // Also preserve on dynamic content (for jQuery if available)
        if (typeof jQuery !== 'undefined') {
            jQuery(document).ready(function() {
                preserveUserIdInLinks();
                
                // Re-preserve after AJAX content loads (only if ajaxComplete exists - not in jQuery Slim)
                if (typeof jQuery(document).ajaxComplete === 'function') {
                    jQuery(document).ajaxComplete(function() {
                        preserveUserIdInLinks();
                    });
                }
            });
        }
        
        // Use MutationObserver to catch dynamically added links
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver(function(mutations) {
                preserveUserIdInLinks();
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        console.log('URL Auth Helper initialized. User ID:', getUserId());
    }
    
    // Initialize when script loads (immediately, before other scripts)
    init();
    
    // Export functions to window for global access
    window.UrlAuthHelper = {
        getUserId: getUserId,
        isLoggedIn: isLoggedIn,
        addUserIdToUrl: addUserIdToUrl,
        preserveUserIdInLinks: preserveUserIdInLinks
    };
    
})();

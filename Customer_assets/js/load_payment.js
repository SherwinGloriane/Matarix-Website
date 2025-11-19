/**
 * Load Payment Page
 * Loads order details for payment.html based on order_id from URL
 */

// Format price
function formatPrice(price) {
    return '₱' + parseFloat(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Get product image
function getProductImage(category, productName) {
    return '../Customer_assets/images/PreviewMain.png';
}

// Load order details
async function loadPaymentOrder() {
    const urlParams = new URLSearchParams(window.location.search);
    let orderId = urlParams.get('order_id');
    const sessionUserId = sessionStorage.getItem('user_id');
    
    console.log(`[Payment] Initial load - URL Order ID: ${orderId}, Session User ID: ${sessionUserId}`);
    
    // Verify session first
    if (!sessionUserId) {
        console.error('[Payment] No user ID in session, redirecting to login');
        window.location.href = '../Customer/Login.html';
        return;
    }
    
    // If no order_id in URL, try to get from sessionStorage or fetch latest order
    if (!orderId) {
        console.log('[Payment] No order_id in URL, fetching latest order for user');
        try {
            const response = await fetch(`../api/get_customer_orders.php`, {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success && data.orders && data.orders.length > 0) {
                // Get the first active order (not delivered)
                for (const ord of data.orders) {
                    const deliveryResponse = await fetch(`../api/get_delivery_status.php?order_id=${ord.Order_ID}`, {
                        method: 'GET',
                        credentials: 'include'
                    });
                    const deliveryData = await deliveryResponse.json();
                    if (!deliveryData.success || !deliveryData.delivery || deliveryData.delivery.Delivery_Status !== 'Delivered') {
                        orderId = ord.Order_ID;
                        console.log(`[Payment] Selected latest order: ${orderId}`);
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching latest order:', error);
        }
    } else {
        console.log(`[Payment] Order ID from URL: ${orderId}, verifying ownership...`);
    }
    
    if (!orderId) {
        console.error('No order_id available');
        const orderCard = document.getElementById('orderCard');
        if (orderCard) {
            orderCard.innerHTML = `
                <div class="order-item">
                    <div class="item-details">
                        <div class="item-name text-danger">Error: No order ID available</div>
                        <div class="item-description">Please go back to Order Summary and select an order.</div>
                    </div>
                </div>
            `;
        }
        return;
    }
    
    try {
        const response = await fetch(`../api/get_customer_orders.php?order_id=${orderId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 403 || response.status === 404) {
                console.error('[Payment] Order access denied or not found');
                const orderCard = document.getElementById('orderCard');
                if (orderCard) {
                    orderCard.innerHTML = `
                        <div class="order-item">
                            <div class="item-details">
                                <div class="item-name text-danger">Access Denied</div>
                                <div class="item-description">This order does not belong to you or does not exist. Redirecting to Order Summary...</div>
                            </div>
                        </div>
                    `;
                }
                // Redirect after a short delay
                setTimeout(() => {
                    const userId = sessionStorage.getItem('user_id');
                    if (userId) {
                        window.location.href = `OrderSummary.html?user_id=${userId}`;
                    } else {
                        window.location.href = 'OrderSummary.html';
                    }
                }, 2000);
                return;
            }
        }
        
        const data = await response.json();
        
        console.log(`[Payment] API Response:`, data);
        
        if (data.success && data.order) {
            // Verify the order belongs to the logged-in user
            const sessionUserId = sessionStorage.getItem('user_id');
            const apiSessionUserId = data.session_user_id; // From PHP session
            
            console.log(`[Payment] Frontend Session User ID: ${sessionUserId}, API Session User ID: ${apiSessionUserId}, Order User ID: ${data.order.User_ID}`);
            
            // CRITICAL: Check if PHP session matches frontend session
            if (apiSessionUserId && parseInt(apiSessionUserId) !== parseInt(sessionUserId)) {
                console.error(`[Payment] CRITICAL: PHP Session User ID (${apiSessionUserId}) does not match Frontend Session User ID (${sessionUserId})`);
                alert('Session Mismatch: Your session has changed. Please log out and log back in.');
                window.location.href = '../Customer/Login.html';
                return;
            }
            
            // Additional verification: Check if order has User_ID field (if API returns it)
            if (data.order.User_ID && parseInt(data.order.User_ID) !== parseInt(sessionUserId)) {
                console.error(`[Payment] SECURITY WARNING: Order User_ID (${data.order.User_ID}) does not match Session User_ID (${sessionUserId})`);
                alert('Security Error: This order does not belong to you. Redirecting...');
                window.location.href = `OrderSummary.html?user_id=${sessionUserId}`;
                return;
            }
            
            console.log(`[Payment] Order ID: ${data.order.Order_ID}, Order loaded successfully`);
            displayPaymentOrder(data.order);
        } else {
            console.error('Failed to load order:', data.message);
            const orderCard = document.getElementById('orderCard');
            if (orderCard) {
                orderCard.innerHTML = `
                    <div class="order-item">
                        <div class="item-details">
                            <div class="item-name text-danger">Error: ${data.message || 'Failed to load order'}</div>
                            <div class="item-description">This order may not belong to you or may not exist. Please go back to Order Summary.</div>
                            <a href="OrderSummary.html" class="btn btn-primary mt-2">Go to Order Summary</a>
                        </div>
                    </div>
                `;
            } else {
                alert(data.message || 'Failed to load order details. This order may not belong to you.');
            }
        }
    } catch (error) {
        console.error('Error loading order:', error);
        alert('Error loading order details. Please try again.');
    }
}

// Display order details
function displayPaymentOrder(order) {
    const orderCard = document.getElementById('orderCard');
    if (!orderCard) return;
    
    const orderId = order.Order_ID;
    const orderNumber = `ORD-${orderId.toString().padStart(4, '0')}`;
    const totalAmount = formatPrice(order.amount);
    const itemCount = order.items ? order.items.length : 0;
    const itemNames = order.items ? order.items.map(item => item.Product_Name).join(', ') : 'No items';
    
    // Update order card header
    const orderItem = orderCard.querySelector('.order-item');
    if (orderItem) {
        orderItem.innerHTML = `
            <div class="item-image">🔩</div>
            <div class="item-details">
                <div class="item-name">Order # ${orderNumber}</div>
                <div class="item-description">${itemCount} items • ${itemNames}</div>
                <div class="item-description">Estimated delivery: ${order.availability_date ? formatDate(order.availability_date) : 'TBD'}</div>
                <div class="item-price">${totalAmount}</div>
            </div>
            <div class="order-actions">
                <i class="fas fa-receipt" style="color: var(--matarix-red-light); font-size: 1.5rem;"></i>
                <i class="fas fa-chevron-right expand-icon"></i>
            </div>
        `;
    }
    
    // Update order details section
    const orderDetails = orderCard.querySelector('.order-details');
    if (orderDetails && order.items) {
        let itemsHTML = '';
        let subtotal = 0;
        
        order.items.forEach(item => {
            const itemTotal = item.Price * item.Quantity;
            subtotal += itemTotal;
            itemsHTML += `
                <div class="summary-item">
                    <div class="summary-item-image">📦</div>
                    <div class="summary-item-details">
                        <div class="summary-item-name">${item.Product_Name}</div>
                        <div class="summary-item-qty">Qty: ${item.Quantity}</div>
                    </div>
                    <div class="summary-item-price">${formatPrice(itemTotal)}</div>
                </div>
            `;
        });
        
        orderDetails.innerHTML = `
            <div class="order-summary">
                <div class="summary-header">Order Summary</div>
                ${itemsHTML}
                <div class="summary-subtotal">
                    <span>Subtotal:</span>
                    <span>${formatPrice(subtotal)}</span>
                </div>
                <div class="summary-total">
                    <span class="total-label">TOTAL:</span>
                    <span class="total-amount">${formatPrice(subtotal)}</span>
                </div>
            </div>
            <div class="payment-method">
                <div class="payment-header">Payment Method:</div>
                <div class="payment-options">
                    <div class="payment-option" onclick="selectPayment(this, event)">
                        <input type="radio" name="payment" id="gcash" checked>
                        <label for="gcash">GCash</label>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Store order data for navigation tracker - make sure status is preserved
    window.currentOrderData = {
        ...order,
        status: order.status || 'Waiting Payment' // Ensure status is always set
    };
    
    console.log(`[Payment] Order loaded - Status: "${window.currentOrderData.status}", Order ID: ${order.Order_ID}`);
    console.log(`[Payment] Full order data stored:`, window.currentOrderData);
    
    // Update progress tracker after order data is loaded
    // Try multiple times to ensure tracker is ready
    let attempts = 0;
    const maxAttempts = 10;
    const updateTracker = () => {
        attempts++;
        const tracker = document.querySelector('.progress-tracker-container');
        if (tracker) {
            console.log(`[Payment] Tracker found, updating (attempt ${attempts})`);
            updateProgressTracker();
        } else if (attempts < maxAttempts) {
            console.log(`[Payment] Tracker not found yet, retrying (attempt ${attempts}/${maxAttempts})`);
            setTimeout(updateTracker, 200);
        } else {
            console.warn(`[Payment] Tracker not found after ${maxAttempts} attempts`);
        }
    };
    
    // Start trying to update after a short delay
    setTimeout(updateTracker, 600);
    
    // Set up periodic refresh to get latest order status from database
    if (window.paymentOrderRefreshInterval) {
        clearInterval(window.paymentOrderRefreshInterval);
    }
    
    window.paymentOrderRefreshInterval = setInterval(async () => {
        await refreshOrderData(order.Order_ID);
    }, 5000); // Refresh every 5 seconds
    
    // Don't call initMatarixNavigation here - navigation.js handles it on page load
    // The tracker will update automatically when getCurrentStep() is called
}

// Refresh order data from database
async function refreshOrderData(orderId) {
    try {
        const response = await fetch(`../api/get_customer_orders.php?order_id=${orderId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 403 || response.status === 404) {
                console.error('[Refresh] Order access denied or not found');
                // Order doesn't belong to user or doesn't exist - stop refreshing
                if (window.paymentOrderRefreshInterval) {
                    clearInterval(window.paymentOrderRefreshInterval);
                }
                // Redirect to OrderSummary
                alert('This order does not belong to you. Redirecting to Order Summary...');
                const userId = sessionStorage.getItem('user_id');
                if (userId) {
                    window.location.href = `OrderSummary.html?user_id=${userId}`;
                } else {
                    window.location.href = 'OrderSummary.html';
                }
                return;
            }
            console.warn('Failed to refresh order data:', response.status);
            return;
        }
        
        const data = await response.json();
        console.log('[Refresh] API Response:', data);
        
        if (data.success && data.order) {
            const oldStatus = window.currentOrderData?.status || 'Unknown';
            const newStatus = data.order.status || 'Unknown';
            
            console.log(`[Refresh] Current status: "${oldStatus}", New status: "${newStatus}"`);
            console.log(`[Refresh] Full order data:`, data.order);
            
            // Update stored order data - make sure we preserve all fields
            window.currentOrderData = {
                ...window.currentOrderData,
                ...data.order
            };
            
            // Verify the status is now set
            console.log(`[Refresh] window.currentOrderData.status after update: "${window.currentOrderData.status}"`);
            
            // Always update the progress tracker to ensure it reflects current state
            // This handles cases where status might have changed externally
            if (oldStatus !== newStatus && oldStatus !== 'Unknown') {
                console.log(`Order status changed: ${oldStatus} -> ${newStatus}`);
            }
            
            // Update tracker regardless to ensure it's in sync
            updateProgressTracker();
        } else {
            console.warn('Failed to refresh order data:', data.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Error refreshing order data:', error);
    }
}

// Update progress tracker based on current order data
function updateProgressTracker() {
    if (window.MatarixNavigation && window.MatarixNavigation.updateProgressTracker) {
        window.MatarixNavigation.updateProgressTracker();
    }
}

// Clean up interval when page is unloaded
window.addEventListener('beforeunload', function() {
    if (window.paymentOrderRefreshInterval) {
        clearInterval(window.paymentOrderRefreshInterval);
    }
});

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPaymentOrder);
} else {
    loadPaymentOrder();
}


/**
 * Load Delivery Tracking
 * Loads order and delivery details for delivery-tracking.html
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

// Format datetime
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

// Load delivery tracking data
async function loadDeliveryTracking() {
    const urlParams = new URLSearchParams(window.location.search);
    let orderId = urlParams.get('order_id');
    const sessionUserId = sessionStorage.getItem('user_id');
    
    console.log(`[Delivery Tracking] Initial load - URL Order ID: ${orderId}, Session User ID: ${sessionUserId}`);
    
    // Verify session first
    if (!sessionUserId) {
        console.error('[Delivery Tracking] No user ID in session, redirecting to login');
        window.location.href = '../Customer/Login.html';
        return;
    }
    
    // If no order_id in URL, try to get from OrderSummary or use latest order
    if (!orderId) {
        console.log('[Delivery Tracking] No order_id in URL, fetching latest order for user');
        // Try to get from sessionStorage or fetch latest order
        try {
            const response = await fetch(`../api/get_customer_orders.php`, {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success && data.orders && data.orders.length > 0) {
                orderId = data.orders[0].Order_ID;
                console.log(`[Delivery Tracking] Selected latest order: ${orderId}`);
            }
        } catch (error) {
            console.error('Error fetching latest order:', error);
        }
    } else {
        console.log(`[Delivery Tracking] Order ID from URL: ${orderId}, verifying ownership...`);
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
        // Load order details
        const orderResponse = await fetch(`../api/get_customer_orders.php?order_id=${orderId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!orderResponse.ok) {
            if (orderResponse.status === 403 || orderResponse.status === 404) {
                console.error('[Delivery Tracking] Order access denied or not found');
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
        
        const orderData = await orderResponse.json();
        
        // Load delivery status (only if order belongs to user)
        let deliveryData = { success: false };
        if (orderData.success && orderData.order) {
            const deliveryResponse = await fetch(`../api/get_delivery_status.php?order_id=${orderId}`, {
                method: 'GET',
                credentials: 'include'
            });
            deliveryData = await deliveryResponse.json();
        }
        
        console.log(`[Delivery Tracking] API Response:`, orderData);
        
        if (orderData.success && orderData.order) {
            // Verify the order belongs to the logged-in user (API should have already checked, but verify)
            const sessionUserId = sessionStorage.getItem('user_id');
            const apiSessionUserId = orderData.session_user_id; // From PHP session
            
            console.log(`[Delivery Tracking] Frontend Session User ID: ${sessionUserId}, API Session User ID: ${apiSessionUserId}, Order User ID: ${orderData.order.User_ID}`);
            
            // CRITICAL: Check if PHP session matches frontend session
            if (apiSessionUserId && parseInt(apiSessionUserId) !== parseInt(sessionUserId)) {
                console.error(`[Delivery Tracking] CRITICAL: PHP Session User ID (${apiSessionUserId}) does not match Frontend Session User ID (${sessionUserId})`);
                alert('Session Mismatch: Your session has changed. Please log out and log back in.');
                window.location.href = '../Customer/Login.html';
                return;
            }
            
            // Additional verification: Check if order has User_ID field (if API returns it)
            if (orderData.order.User_ID && parseInt(orderData.order.User_ID) !== parseInt(sessionUserId)) {
                console.error(`[Delivery Tracking] SECURITY WARNING: Order User_ID (${orderData.order.User_ID}) does not match Session User_ID (${sessionUserId})`);
                alert('Security Error: This order does not belong to you. Redirecting...');
                window.location.href = `OrderSummary.html?user_id=${sessionUserId}`;
                return;
            }
            
            console.log(`[Delivery Tracking] Order ID: ${orderData.order.Order_ID}, Order loaded successfully`);
            
            const delivery = deliveryData.success ? deliveryData.delivery : { Delivery_Status: 'Pending' };
            
            // Store delivery data for navigation tracker
            window.currentDeliveryData = delivery;
            
            // Store order data as well
            window.currentOrderData = orderData.order;
            
            displayDeliveryTracking(orderData.order, delivery);
            
            // Don't call initMatarixNavigation here - navigation.js will handle it
            // This prevents duplicate trackers
        } else {
            console.error('Failed to load order:', orderData.message);
            const orderCard = document.getElementById('orderCard');
            if (orderCard) {
                orderCard.innerHTML = `
                    <div class="order-item">
                        <div class="item-details">
                            <div class="item-name text-danger">Error: ${orderData.message || 'Failed to load order'}</div>
                            <div class="item-description">This order may not belong to you or may not exist. Please go back to Order Summary.</div>
                            <a href="OrderSummary.html" class="btn btn-primary mt-2">Go to Order Summary</a>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading delivery tracking:', error);
    }
}

// Display delivery tracking (renamed to avoid confusion)
function displayDeliveryTracking(order, delivery) {
    const orderCard = document.getElementById('orderCard');
    if (!orderCard) return;
    
    const orderId = order.Order_ID;
    const orderNumber = `ORD-${orderId.toString().padStart(4, '0')}`;
    const totalAmount = formatPrice(order.amount);
    const itemCount = order.items ? order.items.length : 0;
    const itemNames = order.items ? order.items.map(item => item.Product_Name).join(', ') : 'No items';
    const deliveryStatus = delivery.Delivery_Status || 'Pending';
    
    // Update order card
    const orderItem = orderCard.querySelector('.order-item');
    if (orderItem) {
        const statusIcon = deliveryStatus === 'Delivered' ? 
            '<i class="fas fa-check-circle" style="color: var(--matarix-success); font-size: 1.5rem;"></i>' :
            '<i class="fas fa-truck" style="color: var(--matarix-red-light); font-size: 1.5rem;"></i>';
        
        const deliveredText = deliveryStatus === 'Delivered' && delivery.Updated_At ?
            `Delivered: ${formatDateTime(delivery.Updated_At)}` :
            `Estimated delivery: ${order.availability_date ? formatDate(order.availability_date) : 'TBD'}`;
        
        orderItem.innerHTML = `
            <div class="item-image">📦</div>
            <div class="item-details">
                <div class="item-name">Order # ${orderNumber}</div>
                <div class="item-description">${itemCount} items • ${itemNames}</div>
                <div class="item-description">${deliveredText}</div>
                <div class="item-price">${totalAmount}</div>
            </div>
            <div class="order-actions">
                ${statusIcon}
                <i class="fas fa-chevron-right expand-icon"></i>
            </div>
        `;
    }
    
    // Update expandable content
    const expandableContent = document.getElementById('expandableContent');
    if (expandableContent && order.items) {
        let itemsHTML = '';
        order.items.forEach(item => {
            itemsHTML += `
                <div class="item-row">
                    <div class="item-image">📦</div>
                    <div class="item-details">
                        <div class="item-name">${item.Product_Name}</div>
                        <div class="item-specs">${item.length || ''}${item.Unit || ''} x ${item.Width || ''}${item.Unit || ''} • Quantity: ${item.Quantity}</div>
                    </div>
                </div>
            `;
        });
        
        // Build tracking timeline based on delivery status
        let trackingSteps = '';
        if (deliveryStatus === 'Delivered') {
            trackingSteps = `
                <div class="tracking-step">
                    <i class="fas fa-check-circle"></i>
                    <span>Picked up from warehouse</span>
                    <small>${delivery.Created_At ? formatDateTime(delivery.Created_At) : 'N/A'}</small>
                </div>
                <div class="tracking-step">
                    <i class="fas fa-check-circle"></i>
                    <span>In transit to delivery address</span>
                    <small>${delivery.Updated_At ? formatDateTime(delivery.Updated_At) : 'N/A'}</small>
                </div>
                <div class="tracking-step">
                    <i class="fas fa-check-circle"></i>
                    <span>Out for delivery</span>
                    <small>${delivery.Updated_At ? formatDateTime(delivery.Updated_At) : 'N/A'}</small>
                </div>
                <div class="tracking-step">
                    <i class="fas fa-check-circle"></i>
                    <span>Delivered</span>
                    <small>${delivery.Updated_At ? formatDateTime(delivery.Updated_At) : 'N/A'}</small>
                </div>
            `;
        } else if (deliveryStatus === 'On the Way') {
            trackingSteps = `
                <div class="tracking-step">
                    <i class="fas fa-check-circle"></i>
                    <span>Picked up from warehouse</span>
                    <small>${delivery.Created_At ? formatDateTime(delivery.Created_At) : 'N/A'}</small>
                </div>
                <div class="tracking-step">
                    <i class="fas fa-check-circle"></i>
                    <span>In transit to delivery address</span>
                    <small>${delivery.Updated_At ? formatDateTime(delivery.Updated_At) : 'N/A'}</small>
                </div>
                <div class="tracking-step">
                    <i class="fas fa-clock"></i>
                    <span>Out for delivery</span>
                    <small>In progress...</small>
                </div>
                <div class="tracking-step">
                    <i class="fas fa-clock"></i>
                    <span>Delivered</span>
                    <small>Pending</small>
                </div>
            `;
        } else {
            trackingSteps = `
                <div class="tracking-step">
                    <i class="fas fa-clock"></i>
                    <span>Picked up from warehouse</span>
                    <small>Pending</small>
                </div>
                <div class="tracking-step">
                    <i class="fas fa-clock"></i>
                    <span>In transit to delivery address</span>
                    <small>Pending</small>
                </div>
                <div class="tracking-step">
                    <i class="fas fa-clock"></i>
                    <span>Out for delivery</span>
                    <small>Pending</small>
                </div>
                <div class="tracking-step">
                    <i class="fas fa-clock"></i>
                    <span>Delivered</span>
                    <small>Pending</small>
                </div>
            `;
        }
        
        expandableContent.innerHTML = `
            <div class="items-summary">
                <h3>Items in this Order</h3>
                ${itemsHTML}
            </div>
            <div class="unified-tracking">
                <h3>Delivery Status</h3>
                <div class="tracking-status">
                    <i class="fas fa-${deliveryStatus === 'Delivered' ? 'check' : 'clock'}-circle"></i>
                    <span>${deliveryStatus === 'Delivered' ? 'Delivered' : deliveryStatus === 'On the Way' ? 'On the Way' : 'Pending'}</span>
                </div>
                <div class="tracking-details">
                    ${trackingSteps}
                </div>
            </div>
            ${deliveryStatus === 'Delivered' ? `
                <div class="action-buttons-container">
                    <button class="btn btn-action btn-review" onclick="reviewOrder()">
                        <i class="fas fa-star"></i>
                        Review Order
                    </button>
                    <button class="btn btn-action btn-transaction" onclick="viewTransaction()">
                        <i class="fas fa-receipt"></i>
                        View Transaction
                    </button>
                    <button class="btn btn-action btn-home" onclick="goHome()">
                        <i class="fas fa-home"></i>
                        Home
                    </button>
                </div>
            ` : ''}
        `;
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDeliveryTracking);
} else {
    loadDeliveryTracking();
}


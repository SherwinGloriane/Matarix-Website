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

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
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
            console.log('[Payment] Order data received:', data.order);
            console.log('[Payment] Order items:', data.order.items);
            console.log('[Payment] Order items count:', data.order.items ? data.order.items.length : 0);
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
    
    // Check payment status and order approval status
    const paymentStatus = order.payment || 'To Pay';
    const orderStatus = order.status || 'Pending Approval';
    // Get payment method - ONLY check order.payment_method (from orders table), NOT transaction_payment_method
    // The transaction table might have old data, but we need to check if the order itself has a payment method set
    // IMPORTANT: Check for null, undefined, empty string, or 'null' string
    let paymentMethod = null;
    if (order.status && order.status !== 'Pending Approval' && order.status !== 'Rejected') {
        // ONLY use order.payment_method, ignore transaction_payment_method for payment method selection logic
        const rawPaymentMethod = order.payment_method;
        // Only set paymentMethod if it's a valid non-empty value (not null, undefined, empty string, or string "null")
        if (rawPaymentMethod && 
            rawPaymentMethod !== 'null' && 
            rawPaymentMethod !== 'NULL' && 
            rawPaymentMethod !== '' && 
            rawPaymentMethod !== null && 
            rawPaymentMethod !== undefined) {
            paymentMethod = rawPaymentMethod;
        } else {
            paymentMethod = null; // Explicitly set to null if invalid
        }
    }
    const paymentNotice = document.getElementById('paymentNotice');
    
    console.log('[Payment] Payment Status:', paymentStatus, 'Order Status:', orderStatus, 'Payment Method:', paymentMethod);
    console.log('[Payment] Raw payment_method (from orders table):', order.payment_method, 'Raw transaction_payment_method (ignored for selection):', order.transaction_payment_method);
    console.log('[Payment] Using ONLY order.payment_method for payment method selection logic');
    
    // Check if order is approved (not pending approval or rejected)
    // Order is approved if status is "Waiting Payment", "Processing", "Ready", etc.
    const isPendingApproval = orderStatus === 'Pending Approval';
    const isRejected = orderStatus === 'Rejected';
    const isApproved = !isPendingApproval && !isRejected;
    // Payment method is needed if order is approved, no payment method selected, and payment status is "To Pay" or order status is "Waiting Payment"
    // Use strict check - paymentMethod must be a valid non-empty value (not null, undefined, empty string, or string "null")
    const hasPaymentMethod = paymentMethod !== null && 
                             paymentMethod !== undefined && 
                             paymentMethod !== '' && 
                             paymentMethod !== 'null' && 
                             paymentMethod !== 'NULL' &&
                             String(paymentMethod).trim() !== '';
    const needsPaymentMethod = isApproved && !hasPaymentMethod && (paymentStatus === 'To Pay' || orderStatus === 'Waiting Payment');
    
    console.log('[Payment] isApproved:', isApproved, 'hasPaymentMethod:', hasPaymentMethod, 'needsPaymentMethod:', needsPaymentMethod, 'paymentStatus:', paymentStatus, 'orderStatus:', orderStatus);
    console.log('[Payment] paymentMethod type:', typeof paymentMethod, 'paymentMethod value:', JSON.stringify(paymentMethod));
    
    // Show payment notice if payment is "To Pay" and order is approved
    if (paymentNotice) {
        if (isPendingApproval) {
            paymentNotice.innerHTML = `
                <i class="fas fa-clock"></i>
                <div class="payment-notice-text">
                    Your order is pending admin approval. You will be notified once it is approved.
                </div>
            `;
            paymentNotice.style.display = 'flex';
        } else if (isRejected) {
            paymentNotice.innerHTML = `
                <i class="fas fa-times-circle"></i>
                <div class="payment-notice-text">
                    This order has been rejected. ${order.rejection_reason ? 'Reason: ' + order.rejection_reason : ''}
                </div>
            `;
            paymentNotice.style.display = 'flex';
        } else if (paymentStatus === 'To Pay' && needsPaymentMethod) {
            paymentNotice.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <div class="payment-notice-text">
                    Payment Required: Please select a payment method to continue.
                </div>
            `;
            paymentNotice.style.display = 'flex';
        } else if (paymentStatus === 'To Pay') {
            paymentNotice.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <div class="payment-notice-text">
                    Payment Required: Please complete your payment to continue order processing.
                </div>
            `;
            paymentNotice.style.display = 'flex';
        } else {
            paymentNotice.style.display = 'none';
        }
    } else {
        console.warn('[Payment] Payment notice element not found!');
    }
    
    // Update order card header - make sure it's clickable
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
    
    // Make sure the card is clickable
    orderCard.style.cursor = 'pointer';
    
    // Auto-expand the card if payment method selection is needed
    // But preserve expanded state if user already expanded it
    const wasExpanded = orderCard.classList.contains('expanded');
    if (needsPaymentMethod && !wasExpanded) {
        orderCard.classList.add('expanded');
        const expandIcon = orderCard.querySelector('.expand-icon');
        if (expandIcon) {
            expandIcon.style.transform = 'rotate(90deg)';
        }
    } else if (wasExpanded) {
        // Preserve expanded state
        orderCard.classList.add('expanded');
        const expandIcon = orderCard.querySelector('.expand-icon');
        if (expandIcon) {
            expandIcon.style.transform = 'rotate(90deg)';
        }
    }
    
    // Define toggleOrderDetails function globally
    window.toggleOrderDetails = function(event) {
        if (event) {
            event.stopPropagation();
        }
        
        const orderCard = document.getElementById('orderCard');
        if (orderCard) {
            const isExpanded = orderCard.classList.contains('expanded');
            orderCard.classList.toggle('expanded');
            
            // Rotate chevron icon
            const expandIcon = orderCard.querySelector('.expand-icon');
            if (expandIcon) {
                if (!isExpanded) {
                    expandIcon.style.transform = 'rotate(90deg)';
                } else {
                    expandIcon.style.transform = 'rotate(0deg)';
                }
            }
            
            console.log('[Payment] Order card toggled, expanded:', !isExpanded);
            const orderDetails = orderCard.querySelector('.order-details');
            console.log('[Payment] Order details element exists:', !!orderDetails);
            if (orderDetails) {
                console.log('[Payment] Order details has content:', orderDetails.innerHTML.length > 0);
                console.log('[Payment] Order details innerHTML preview:', orderDetails.innerHTML.substring(0, 200));
            }
        }
    };
    
    // Add click handler that doesn't interfere with payment options
    // Remove any existing handlers first by cloning without event listeners
    orderCard.addEventListener('click', function(event) {
        // Don't toggle if clicking on payment options, buttons, or inputs inside
        if (event.target.closest('.payment-option') || 
            event.target.closest('button') || 
            event.target.closest('input[type="radio"]') ||
            event.target.closest('label')) {
            return;
        }
        // Use the global toggleOrderDetails function
        if (typeof window.toggleOrderDetails === 'function') {
            window.toggleOrderDetails(event);
        }
    });
    
    // Update order details section - populate with order items
    const orderDetails = orderCard.querySelector('.order-details');
    console.log('[Payment] Order details element:', orderDetails);
    console.log('[Payment] Order items:', order.items);
    console.log('[Payment] Order items length:', order.items ? order.items.length : 0);
    
    if (orderDetails) {
        if (order.items && order.items.length > 0) {
            console.log('[Payment] Populating order details with', order.items.length, 'items');
            let itemsHTML = '';
            let subtotal = 0;
        
        order.items.forEach((item, index) => {
            const itemTotal = item.Price * item.Quantity;
            subtotal += itemTotal;
            
            // Build dimensions string
            let dimensions = '';
            if (item.length && item.Width && item.Unit) {
                dimensions = `${item.length}${item.Unit} x ${item.Width}${item.Unit}`;
            } else if (item.length && item.Width) {
                dimensions = `${item.length} x ${item.Width}`;
            } else if (item.length && item.Unit) {
                dimensions = `${item.length}${item.Unit}`;
            } else if (item.length) {
                dimensions = `${item.length}`;
            } else if (item.Width && item.Unit) {
                dimensions = `${item.Width}${item.Unit}`;
            } else if (item.Width) {
                dimensions = `${item.Width}`;
            }
            
            // Build specs string with dimensions and variation
            let specsParts = [];
            if (dimensions) {
                specsParts.push(dimensions);
            }
            if (item.variations && item.variations.trim() !== '') {
                specsParts.push(`Variation: ${item.variations}`);
            }
            specsParts.push(`Quantity: ${item.Quantity}`);
            
            const specsText = specsParts.join(' • ');
            
            itemsHTML += `
                <div class="summary-item">
                    <div class="summary-item-image">📦</div>
                    <div class="summary-item-details">
                        <div class="summary-item-name">${escapeHtml(item.Product_Name || 'Unknown Product')}</div>
                        <div class="summary-item-specs">${escapeHtml(specsText)}</div>
                    </div>
                    <div class="summary-item-price">${formatPrice(itemTotal)}</div>
                </div>
            `;
        });
        
        // Build payment method selection section
        let paymentMethodSection = '';
        if (isPendingApproval) {
            // Order is pending approval - show message
            paymentMethodSection = `
                <div class="payment-status-info">
                    <div class="alert alert-info" style="margin-top: 20px;">
                        <i class="fas fa-info-circle mr-2"></i>
                        <strong>Order Pending Approval</strong><br>
                        Your order is waiting for admin approval. Once approved, you will be able to select a payment method and complete payment.
                    </div>
                </div>
            `;
        } else if (isRejected) {
            // Order was rejected
            paymentMethodSection = `
                <div class="payment-status-info">
                    <div class="alert alert-danger" style="margin-top: 20px;">
                        <i class="fas fa-times-circle mr-2"></i>
                        <strong>Order Rejected</strong><br>
                        This order has been rejected. ${order.rejection_reason ? 'Reason: ' + order.rejection_reason : ''}
                    </div>
                </div>
            `;
        } else if (isApproved && needsPaymentMethod) {
            // Order is approved but payment method not selected - show selection with original popup-style interface
            paymentMethodSection = `
                <div class="payment-method-selection">
                    <div class="payment-header">Select Payment Method</div>
                    <div class="payment-methods">
                        <div class="payment-method-option" onclick="selectPaymentMethod('On-Site', ${orderId})" id="payment-option-onsite-${orderId}">
                            <div class="payment-icon onsite">
                                <i class="fas fa-handshake"></i>
                            </div>
                            <div class="payment-details">
                                <h6>Pay On-Site</h6>
                                <p>Pay when your order is delivered or picked up</p>
                            </div>
                            <input type="radio" name="payment-${orderId}" value="On-Site" id="payment-onsite-${orderId}" style="display: none;">
                        </div>
                        <div class="payment-method-option" onclick="selectPaymentMethod('GCash', ${orderId})" id="payment-option-gcash-${orderId}">
                            <div class="payment-icon gcash">
                                <i class="fab fa-google-pay"></i>
                            </div>
                            <div class="payment-details">
                                <h6>GCash Payment</h6>
                                <p>Pay instantly via GCash QR code or mobile number</p>
                            </div>
                            <input type="radio" name="payment-${orderId}" value="GCash" id="payment-gcash-${orderId}" style="display: none;">
                        </div>
                    </div>
                    <button class="btn btn-primary mt-3" id="confirmPaymentBtn-${orderId}" onclick="confirmPaymentMethod(${orderId})" disabled style="width: 100%; padding: 12px; font-size: 1rem; font-weight: 600; border-radius: 25px;">
                        <i class="fas fa-check-circle mr-2"></i>Confirm Payment Method
                    </button>
                </div>
            `;
        } else if (isApproved && paymentMethod) {
            // Show current payment method and status (payment method already selected)
            paymentMethodSection = `
                <div class="payment-status-info">
                    <div class="payment-status-header">Payment Method:</div>
                    <div class="payment-method-display">
                        <i class="fas fa-${paymentMethod === 'GCash' ? 'credit-card' : 'money-bill-wave'}"></i>
                        <span>${paymentMethod === 'GCash' ? 'GCash' : (paymentMethod === 'On-Site' ? 'On-Site' : paymentMethod)}</span>
                    </div>
                    <div class="payment-status-header" style="margin-top: 15px;">Payment Status:</div>
                    <div class="payment-status-badge ${paymentStatus === 'Paid' ? 'status-paid' : 'status-pending'}">
                        <i class="fas fa-${paymentStatus === 'Paid' ? 'check-circle' : 'clock'}"></i>
                        ${paymentStatus === 'Paid' ? 'Paid' : 'Pending Payment'}
                    </div>
                </div>
            `;
        } else {
            // Approved but no payment method selected (shouldn't happen, but handle it)
            paymentMethodSection = `
                <div class="payment-status-info">
                    <div class="alert alert-warning" style="margin-top: 20px;">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        Please select a payment method to continue.
                    </div>
                </div>
            `;
        }
        
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
            ${paymentMethodSection}
        `;
        } else {
            // No items found
            console.warn('[Payment] Order has no items!');
            orderDetails.innerHTML = `
                <div class="order-summary">
                    <div class="summary-header">Order Summary</div>
                    <div class="no-items-message">No items found in this order.</div>
                </div>
            `;
        }
    } else {
        console.error('[Payment] Order details element not found!');
    }
    
    // Store order data for navigation tracker - make sure status is preserved
    window.currentOrderData = {
        ...order,
        status: order.status || 'Pending Approval' // Ensure status is always set, default to Pending Approval
    };
    
    console.log(`[Payment] Order loaded - Status: "${window.currentOrderData.status}", Order ID: ${order.Order_ID}`);
    console.log(`[Payment] Payment Method: "${window.currentOrderData.payment_method}", Payment Status: "${window.currentOrderData.payment}"`);
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
            // Regenerate tracker to ensure it shows correct steps
            if (window.MatarixNavigation && window.MatarixNavigation.regenerateTracker) {
                window.MatarixNavigation.regenerateTracker();
            } else {
                updateProgressTracker();
            }
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
    // Only refresh payment notice, not the entire order card to avoid disrupting user interaction
    if (window.paymentOrderRefreshInterval) {
        clearInterval(window.paymentOrderRefreshInterval);
    }
    
    window.paymentOrderRefreshInterval = setInterval(async () => {
        // Only refresh if user is not actively interacting (no popup open, no file input active)
        const qrPopup = document.getElementById('qrPaymentPopup');
        const isPopupOpen = qrPopup && qrPopup.style.display !== 'none' && qrPopup.classList.contains('show');
        const isFileInputActive = document.activeElement && document.activeElement.type === 'file';
        
        if (!isPopupOpen && !isFileInputActive) {
            await refreshOrderData(order.Order_ID);
        }
    }, 15000); // Refresh every 15 seconds (less frequent to avoid disrupting user)
    
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
            
            // Preserve expanded state of order card
            const orderCard = document.getElementById('orderCard');
            const wasExpanded = orderCard && orderCard.classList.contains('expanded');
            
            // Update payment notice visibility if status changed (lightweight update only)
            const paymentStatus = data.order.payment || 'To Pay';
            const orderStatus = data.order.status || 'Pending Approval';
            // Get payment method - ONLY from orders table, not transaction table
            let paymentMethod = null;
            if (orderStatus && orderStatus !== 'Pending Approval' && orderStatus !== 'Rejected') {
                const rawPaymentMethod = data.order.payment_method;
                if (rawPaymentMethod && 
                    rawPaymentMethod !== 'null' && 
                    rawPaymentMethod !== 'NULL' && 
                    rawPaymentMethod !== '' && 
                    rawPaymentMethod !== null && 
                    rawPaymentMethod !== undefined) {
                    paymentMethod = rawPaymentMethod;
                }
            }
            const paymentNotice = document.getElementById('paymentNotice');
            
            // Check approval status
            const isPendingApproval = orderStatus === 'Pending Approval';
            const isRejected = orderStatus === 'Rejected';
            const isApproved = !isPendingApproval && !isRejected;
            
            // Only update payment notice, don't re-render entire order card
            if (paymentNotice) {
                if (isPendingApproval) {
                    paymentNotice.innerHTML = `
                        <i class="fas fa-clock"></i>
                        <div class="payment-notice-text">
                            Your order is pending admin approval. You will be notified once it is approved.
                        </div>
                    `;
                    paymentNotice.style.display = 'flex';
                } else if (isRejected) {
                    paymentNotice.innerHTML = `
                        <i class="fas fa-times-circle"></i>
                        <div class="payment-notice-text">
                            This order has been rejected. ${data.order.rejection_reason ? 'Reason: ' + data.order.rejection_reason : ''}
                        </div>
                    `;
                    paymentNotice.style.display = 'flex';
                } else if (paymentStatus === 'To Pay' && isApproved && !paymentMethod) {
                    paymentNotice.innerHTML = `
                        <i class="fas fa-exclamation-triangle"></i>
                        <div class="payment-notice-text">
                            Payment Required: Please select a payment method to continue.
                        </div>
                    `;
                    paymentNotice.style.display = 'flex';
                } else if (paymentStatus === 'To Pay') {
                    paymentNotice.innerHTML = `
                        <i class="fas fa-exclamation-triangle"></i>
                        <div class="payment-notice-text">
                            Payment Required: Please complete your payment to continue order processing.
                        </div>
                    `;
                    paymentNotice.style.display = 'flex';
                } else {
                    paymentNotice.style.display = 'none';
                }
            } else {
                console.warn('[Refresh] Payment notice element not found!');
            }
            
            // Always update the progress tracker to ensure it reflects current state
            // This handles cases where status might have changed externally
            if (oldStatus !== newStatus && oldStatus !== 'Unknown') {
                console.log(`Order status changed: ${oldStatus} -> ${newStatus}`);
                // Re-display order to update UI
                displayPaymentOrder(data.order);
            } else {
                // Even if status didn't change, update payment method display if it changed
                const oldPaymentMethod = window.currentOrderData?.payment_method;
                const newPaymentMethod = paymentMethod;
                if (oldPaymentMethod !== newPaymentMethod) {
                    console.log(`Payment method changed: ${oldPaymentMethod} -> ${newPaymentMethod}`);
                    displayPaymentOrder(data.order);
                }
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

// Payment method selection functions
let selectedPaymentMethod = null;

function selectPaymentMethod(method, orderId) {
    console.log('[Payment] selectPaymentMethod called:', method, orderId);
    selectedPaymentMethod = method;
    
    // Update UI - find all payment method options for this order
    const orderDetails = document.querySelector('.order-details');
    if (orderDetails) {
        // Remove selected class from all payment method options
        orderDetails.querySelectorAll('.payment-method-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Find the clicked option by method value
        const methodLower = method.toLowerCase().replace(/\s+/g, ''); // Remove spaces and convert to lowercase
        const optionId = `payment-option-${methodLower}-${orderId}`;
        console.log('[Payment] Looking for option with ID:', optionId);
        const selectedOption = document.getElementById(optionId);
        
        if (selectedOption) {
            console.log('[Payment] Found option, selecting it');
            selectedOption.classList.add('selected');
            const radio = selectedOption.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
        } else {
            console.warn('[Payment] Option not found with ID:', optionId);
            // Fallback: try to find by onclick attribute or data attribute
            const allOptions = orderDetails.querySelectorAll('.payment-method-option');
            allOptions.forEach(option => {
                const onclickAttr = option.getAttribute('onclick') || '';
                if (onclickAttr.includes(method)) {
                    option.classList.add('selected');
                    const radio = option.querySelector('input[type="radio"]');
                    if (radio) {
                        radio.checked = true;
                    }
                }
            });
        }
    } else {
        console.warn('[Payment] Order details element not found');
    }
    
    // Enable confirm button
    const confirmBtn = document.getElementById(`confirmPaymentBtn-${orderId}`);
    if (confirmBtn) {
        confirmBtn.disabled = false;
        console.log('[Payment] Confirm button enabled');
    } else {
        console.warn('[Payment] Confirm button not found:', `confirmPaymentBtn-${orderId}`);
    }
}

// Store current order ID for QR popup
let currentOrderIdForPayment = null;
let uploadedProofOfPayment = null;

async function confirmPaymentMethod(orderId) {
    if (!selectedPaymentMethod) {
        alert('Please select a payment method first.');
        return;
    }
    
    currentOrderIdForPayment = orderId;
    
    // If GCash, show QR code popup
    if (selectedPaymentMethod === 'GCash') {
        // Get order amount for QR code
        const order = await getOrderData(orderId);
        if (order) {
            showQRPopup(order.amount || 0);
        } else {
            showQRPopup(0);
        }
    } else {
        // For On-Site payment, process directly
        await processPayment(orderId, selectedPaymentMethod, null);
    }
}

// Show QR Code Popup
function showQRPopup(amount) {
    const popup = document.getElementById('qrPaymentPopup');
    const qrAmount = document.getElementById('qrAmount');
    
    if (qrAmount) {
        qrAmount.textContent = formatPrice(amount);
    }
    
    // Generate QR code (using a simple placeholder or QR code library)
    generateQRCode(amount);
    
    // Reset proof upload
    uploadedProofOfPayment = null;
    const proofPreview = document.getElementById('proofPreview');
    const proofPreviewImg = document.getElementById('proofPreviewImg');
    const confirmBtn = document.getElementById('confirmGCashPaymentBtn');
    
    if (proofPreview) {
        proofPreview.style.display = 'none';
    }
    if (proofPreviewImg) {
        proofPreviewImg.src = '';
    }
    if (confirmBtn) {
        confirmBtn.disabled = true;
    }
    
    // Show popup
    if (popup) {
        popup.style.display = 'flex';
        setTimeout(() => {
            popup.classList.add('show');
        }, 10);
    }
}

// Close QR Code Popup
function closeQRPopup() {
    const popup = document.getElementById('qrPaymentPopup');
    if (popup) {
        popup.classList.remove('show');
        setTimeout(() => {
            popup.style.display = 'none';
        }, 300);
    }
    
    // Reset proof upload
    uploadedProofOfPayment = null;
    const proofInput = document.getElementById('proofOfPaymentInput');
    const proofPreview = document.getElementById('proofPreview');
    const proofPreviewImg = document.getElementById('proofPreviewImg');
    const confirmBtn = document.getElementById('confirmGCashPaymentBtn');
    
    if (proofInput) {
        proofInput.value = '';
    }
    if (proofPreview) {
        proofPreview.style.display = 'none';
    }
    if (proofPreviewImg) {
        proofPreviewImg.src = '';
    }
    if (confirmBtn) {
        confirmBtn.disabled = true;
    }
}

// Generate QR Code (placeholder - you can integrate a QR code library like qrcode.js)
function generateQRCode(amount) {
    const qrContainer = document.getElementById('qrCodeContainer');
    if (!qrContainer) return;
    
    // For now, use a placeholder. You can integrate a QR code library like:
    // <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
    // Then use: new QRCode(qrContainer, { text: `GCash:09171234567:${amount}`, width: 200, height: 200 });
    
    // Placeholder QR code display
    qrContainer.innerHTML = `
        <div style="width: 200px; height: 200px; background: #f0f0f0; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; margin: 0 auto; border: 2px solid var(--matarix-border);">
            <i class="fas fa-qrcode" style="font-size: 4rem; color: #6c757d; margin-bottom: 10px;"></i>
            <small style="color: #6c757d;">QR Code Placeholder</small>
            <small style="color: #6c757d; font-size: 0.7rem;">0917-123-4567</small>
        </div>
    `;
}

// Handle Proof of Payment Upload
async function handleProofUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB.');
        return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const proofPreview = document.getElementById('proofPreview');
        const proofPreviewImg = document.getElementById('proofPreviewImg');
        const confirmBtn = document.getElementById('confirmGCashPaymentBtn');
        
        if (proofPreviewImg) {
            proofPreviewImg.src = e.target.result;
        }
        if (proofPreview) {
            proofPreview.style.display = 'block';
        }
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }
    };
    reader.readAsDataURL(file);
    
    // Upload file to server
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', 'proof_of_payment');
    
    try {
        const uploadResponse = await fetch('../api/upload_image.php', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const uploadData = await uploadResponse.json();
        
        if (uploadData.success) {
            // Handle escaped slashes in the file path
            let filePath = uploadData.file_path;
            if (typeof filePath === 'string') {
                // Remove escaped slashes if present
                filePath = filePath.replace(/\\\//g, '/');
            }
            
            uploadedProofOfPayment = filePath;
            console.log('✅ [handleProofUpload] Proof of payment uploaded successfully');
            console.log('✅ [handleProofUpload] Original file_path from API:', uploadData.file_path);
            console.log('✅ [handleProofUpload] Cleaned file_path stored:', uploadedProofOfPayment);
            console.log('✅ [handleProofUpload] Variable type:', typeof uploadedProofOfPayment);
            console.log('✅ [handleProofUpload] Variable value:', uploadedProofOfPayment);
        } else {
            alert('Failed to upload receipt: ' + uploadData.message);
            // Reset preview
            const proofInput = document.getElementById('proofOfPaymentInput');
            const proofPreview = document.getElementById('proofPreview');
            const proofPreviewImg = document.getElementById('proofPreviewImg');
            const confirmBtn = document.getElementById('confirmGCashPaymentBtn');
            
            if (proofInput) {
                proofInput.value = '';
            }
            if (proofPreview) {
                proofPreview.style.display = 'none';
            }
            if (proofPreviewImg) {
                proofPreviewImg.src = '';
            }
            if (confirmBtn) {
                confirmBtn.disabled = true;
            }
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload receipt. Please try again.');
    }
}

// Remove Proof Upload
function removeProofUpload() {
    uploadedProofOfPayment = null;
    const proofInput = document.getElementById('proofOfPaymentInput');
    const proofPreview = document.getElementById('proofPreview');
    const proofPreviewImg = document.getElementById('proofPreviewImg');
    const confirmBtn = document.getElementById('confirmGCashPaymentBtn');
    
    if (proofInput) {
        proofInput.value = '';
    }
    if (proofPreview) {
        proofPreview.style.display = 'none';
    }
    if (proofPreviewImg) {
        proofPreviewImg.src = '';
    }
    if (confirmBtn) {
        confirmBtn.disabled = true;
    }
}

// Confirm GCash Payment
async function confirmGCashPayment() {
    console.log('🔵 [confirmGCashPayment] Function called');
    console.log('🔵 [confirmGCashPayment] currentOrderIdForPayment:', currentOrderIdForPayment);
    console.log('🔵 [confirmGCashPayment] uploadedProofOfPayment BEFORE save:', uploadedProofOfPayment);
    
    if (!currentOrderIdForPayment) {
        alert('Order ID not found. Please try again.');
        return;
    }
    
    // Save proof of payment value BEFORE closing popup (closeQRPopup resets it)
    const proofOfPaymentPath = uploadedProofOfPayment;
    const orderId = currentOrderIdForPayment;
    
    console.log('💾 [confirmGCashPayment] Saving proof of payment before closing popup:', proofOfPaymentPath);
    console.log('💾 [confirmGCashPayment] Order ID:', orderId);
    console.log('💾 [confirmGCashPayment] Proof path type:', typeof proofOfPaymentPath);
    console.log('💾 [confirmGCashPayment] Proof path value:', proofOfPaymentPath);
    
    // Close popup (this will reset uploadedProofOfPayment, but we saved it above)
    closeQRPopup();
    
    // Verify the saved value is still there after closing popup
    console.log('✅ [confirmGCashPayment] Proof path after closeQRPopup:', proofOfPaymentPath);
    console.log('✅ [confirmGCashPayment] uploadedProofOfPayment after closeQRPopup (should be null):', uploadedProofOfPayment);
    
    // Process payment with the saved proof of payment path
    console.log('🔄 [confirmGCashPayment] Calling processPayment with:', {
        orderId: orderId,
        paymentMethod: 'GCash',
        proofOfPayment: proofOfPaymentPath
    });
    
    await processPayment(orderId, 'GCash', proofOfPaymentPath);
    
    // Reset
    currentOrderIdForPayment = null;
    uploadedProofOfPayment = null;
    
    console.log('✅ [confirmGCashPayment] Function completed');
}

// Helper function to get order data
async function getOrderData(orderId) {
    try {
        const response = await fetch(`../api/get_customer_orders.php?order_id=${orderId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        if (data.success && data.orders && data.orders.length > 0) {
            return data.orders[0];
        }
        return null;
    } catch (error) {
        console.error('Error fetching order data:', error);
        return null;
    }
}

async function processPayment(orderId, paymentMethod, proofOfPayment) {
    console.log('🔄 [processPayment] Function called');
    console.log('🔄 [processPayment] Parameters received:', {
        orderId: orderId,
        paymentMethod: paymentMethod,
        proofOfPayment: proofOfPayment,
        proofOfPaymentType: typeof proofOfPayment,
        proofOfPaymentIsNull: proofOfPayment === null,
        proofOfPaymentIsUndefined: proofOfPayment === undefined
    });
    
    try {
        const requestBody = {
            order_id: orderId,
            payment_method: paymentMethod,
            proof_of_payment: proofOfPayment
        };
        
        console.log('📤 [processPayment] Request body being sent:', JSON.stringify(requestBody, null, 2));
        console.log('📤 [processPayment] proof_of_payment in request body:', requestBody.proof_of_payment);
        
        const response = await fetch('../api/process_payment.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Payment method confirmed! ' + (data.payment_status === 'Paid' ? 'Payment received.' : 'Please complete payment.'));
            // Reload order data
            await refreshOrderData(orderId);
            // Reload full order display
            await loadPaymentOrder();
        } else {
            alert('Failed to process payment: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        alert('Failed to process payment. Please try again.');
    }
}

// Make functions globally available
window.selectPaymentMethod = selectPaymentMethod;
window.confirmPaymentMethod = confirmPaymentMethod;
window.closeQRPopup = closeQRPopup;
window.handleProofUpload = handleProofUpload;
window.removeProofUpload = removeProofUpload;
window.confirmGCashPayment = confirmGCashPayment;

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPaymentOrder);
} else {
    loadPaymentOrder();
}


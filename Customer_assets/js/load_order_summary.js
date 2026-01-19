/**
 * Load Order Summary for Customer
 * Displays the customer's order details
 */

// Format price
function formatPrice(price) {
    return '₱' + parseFloat(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Get product image
function getProductImage(category, productName) {
    return '../Customer_assets/images/PreviewMain.png';
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format time
function formatTime(timeString) {
    if (!timeString) return '';
    
    // Handle time-only strings (HH:MM:SS or HH:MM)
    if (timeString.includes(':') && !timeString.includes('T') && !timeString.includes(' ')) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }
    
    // Handle full date-time strings
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
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
    return text.toString().replace(/[&<>"']/g, m => map[m]);
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

// Create order item row HTML
function createOrderItemRow(item, productDetails = null) {
    // Get product name - item already has Product_Name from API JOIN, prioritize that
    let productName = item.Product_Name || item.product_name;
    
    // Fallback to productDetails if item doesn't have name
    if (!productName && productDetails) {
        productName = productDetails.Product_Name || productDetails.product_name;
    }
    
    // Final fallback
    if (!productName) {
        productName = `Product ${item.Product_ID}`;
    }
    
    // Get product specs - use item data first (already from API), then productDetails
    let productSpecs = '';
    if (item.length && item.Width) {
        productSpecs = `${item.length}${item.Unit || ''} x ${item.Width}${item.Unit || ''}`;
    } else if (productDetails) {
        const width = productDetails.Width || productDetails.width;
        const length = productDetails.length;
        const unit = productDetails.Unit || productDetails.unit || '';
        if (length && width) {
            productSpecs = `${length}${unit} x ${width}${unit}`;
        } else {
            productSpecs = productDetails.category || '';
        }
    } else {
        productSpecs = item.category || '';
    }
    
    const image = getProductImage(item.category || '', productName);
    const price = formatPrice(item.Price);
    const total = formatPrice(item.Price * item.Quantity);
    
    return `
        <tr class="order-item">
            <td>
                <div class="d-flex align-items-center">
                    <img src="${image}" alt="${productName}" class="product-thumb mr-3" onerror="this.src='../Customer_assets/images/PreviewMain.png'">
                    <div class="product-info">
                        <span class="product-name">${productName}</span>
                        <div class="d-md-none mt-1">
                            <small class="text-muted d-block">Qty: ${item.Quantity}</small>
                            <small class="text-muted d-md-none d-block">${productSpecs}</small>
                            <small class="text-muted d-sm-none d-block">${price}</small>
                        </div>
                    </div>
                </div>
            </td>
            <td class="text-center quantity-col">${item.Quantity}</td>
            <td class="text-center variation-col d-none d-md-table-cell">${productSpecs}</td>
            <td class="text-center price-col d-none d-sm-table-cell">${price}</td>
            <td class="text-center total-col font-weight-bold">${total}</td>
        </tr>
    `;
}

// Get product details from API
async function getProductDetails(productId) {
    try {
        const response = await fetch(`../api/get_product_customer.php?product_id=${productId}`);
        const data = await response.json();
        return data.success ? data.product : null;
    } catch (error) {
        console.error('Error fetching product details:', error);
        return null;
    }
}

// Load order summary
async function loadOrderSummary() {
    // Get order_id from URL if present (from checkout redirect) - for single order view
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    const sessionUserId = sessionStorage.getItem('user_id');
    
    console.log(`[OrderSummary] Loading - URL Order ID: ${orderId}, Session User ID: ${sessionUserId}`);
    
    // Verify session first
    if (!sessionUserId) {
        console.error('[OrderSummary] No user ID in session, redirecting to login');
        window.location.href = '../Customer/Login.html';
        return;
    }
    
    try {
        let url = '../api/get_customer_orders.php';
        if (orderId) {
            url += '?order_id=' + orderId;
            console.log(`[OrderSummary] Fetching specific order: ${orderId} for user: ${sessionUserId}`);
        } else {
            console.log(`[OrderSummary] Fetching all orders for user: ${sessionUserId}`);
        }
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Orders API response:', data);
        
        // CRITICAL: Check if PHP session matches frontend session
        const apiSessionUserId = data.session_user_id; // From PHP session
        if (apiSessionUserId && parseInt(apiSessionUserId) !== parseInt(sessionUserId)) {
            console.error(`[OrderSummary] CRITICAL: PHP Session User ID (${apiSessionUserId}) does not match Frontend Session User ID (${sessionUserId})`);
            alert('Session Mismatch: Your session has changed. Please log out and log back in.');
            window.location.href = '../Customer/Login.html';
            return;
        }
        
        if (data.success) {
            // If specific order_id requested, show single order
            if (data.order) {
                // Verify order ownership
                if (data.order.User_ID && parseInt(data.order.User_ID) !== parseInt(sessionUserId)) {
                    console.error(`[OrderSummary] SECURITY WARNING: Order User_ID (${data.order.User_ID}) does not match Session User_ID (${sessionUserId})`);
                    alert('Security Error: This order does not belong to you. Redirecting...');
                    window.location.href = `OrderSummary.html?user_id=${sessionUserId}`;
                    return;
                }
                console.log('Displaying single order:', data.order.Order_ID, 'for user:', data.order.User_ID);
                displaySingleOrder(data.order);
            } else if (data.orders !== undefined) {
                // Verify all orders belong to the user
                const invalidOrders = data.orders.filter(order => 
                    order.User_ID && parseInt(order.User_ID) !== parseInt(sessionUserId)
                );
                if (invalidOrders.length > 0) {
                    console.error(`[OrderSummary] SECURITY WARNING: Found ${invalidOrders.length} orders that do not belong to user ${sessionUserId}`);
                    // Filter out invalid orders
                    data.orders = data.orders.filter(order => 
                        !order.User_ID || parseInt(order.User_ID) === parseInt(sessionUserId)
                    );
                }
                // Display all orders (even if empty array)
                console.log(`Received ${data.orders.length} orders from API`);
                if (data.orders.length > 0) {
                    await displayAllOrders(data.orders);
                } else {
                    // Empty orders array
                    console.log('No orders found - empty array');
                    const container = document.getElementById('ordersContainer');
                    if (container) {
                        container.innerHTML = `
                            <div class="text-center py-5">
                                <p class="text-muted">No orders found. Start shopping to place your first order!</p>
                            </div>
                        `;
                    }
                }
            } else {
                // No orders property in response
                console.log('No orders property in response');
                const container = document.getElementById('ordersContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="text-center py-5">
                            <p class="text-muted">No orders found.</p>
                        </div>
                    `;
                }
            }
        } else {
            // Check if it's a "no orders" case or an actual error
            const errorMessage = data.message || 'Unknown error';
            const isNoOrdersCase = errorMessage.toLowerCase().includes('no orders') || 
                                  errorMessage.toLowerCase().includes('not found') ||
                                  (data.orders !== undefined && (!data.orders || data.orders.length === 0));
            
            console.error('Failed to load orders:', errorMessage);
            const container = document.getElementById('ordersContainer');
            if (container) {
                if (isNoOrdersCase) {
                    container.innerHTML = `
                        <div class="text-center py-5">
                            <p class="text-muted">No orders found. Start shopping to place your first order!</p>
                        </div>
                    `;
                } else {
                    container.innerHTML = `
                        <div class="text-center py-5">
                            <p class="text-danger">Error loading orders: ${errorMessage}</p>
                            <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
                        </div>
                    `;
                }
            }
        }
    } catch (error) {
        console.error('Error loading order summary:', error);
        const container = document.getElementById('ordersContainer');
        if (container) {
            // Check if it's a network error or actual API error
            const isNetworkError = error.message.includes('Failed to fetch') || 
                                 error.message.includes('NetworkError') ||
                                 error.message.includes('network');
            
            if (isNetworkError) {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <p class="text-danger">Network error. Please check your connection and try again.</p>
                        <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
                    </div>
                `;
            } else {
                // For other errors, show generic message but allow retry
                container.innerHTML = `
                    <div class="text-center py-5">
                        <p class="text-muted">Unable to load orders at this time. Please try again later.</p>
                        <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    }
}

// Display all orders
async function displayAllOrders(orders) {
    const container = document.getElementById('ordersContainer');
    const singleOrderView = document.getElementById('singleOrderView');
    
    // Hide single order view, show orders container
    if (singleOrderView) singleOrderView.style.display = 'none';
    if (container) container.style.display = 'block';
    
    if (!container) {
        console.error('Orders container not found');
        return;
    }
    
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <p class="text-muted">No orders found.</p>
            </div>
        `;
        return;
    }
    
    console.log(`Loading ${orders.length} orders...`);
    
    // Show loading message
    container.innerHTML = '<div class="text-center py-3"><p class="text-muted">Loading order details...</p></div>';
    
    // Load full details for each order first (don't filter by delivery status initially)
    // This ensures orders display even if delivery status checks fail
    const orderDetailPromises = orders.map(async (order) => {
        try {
            const detailResponse = await fetch(`../api/get_customer_orders.php?order_id=${order.Order_ID}`, {
                method: 'GET',
                credentials: 'include'
            });
            if (!detailResponse.ok) {
                console.warn(`Failed to load details for order ${order.Order_ID}: ${detailResponse.status}`);
                // Return the basic order data if detail fetch fails
                return order;
            }
            const detailData = await detailResponse.json();
            if (detailData.success && detailData.order) {
                return detailData.order;
            }
            // Return basic order if detail fetch fails
            return order;
        } catch (error) {
            console.error(`Error loading order ${order.Order_ID}:`, error);
            // Return basic order data on error
            return order;
        }
    });
    
    const orderDetails = await Promise.all(orderDetailPromises);
    const validOrders = orderDetails.filter(ord => ord !== null);
    
    console.log(`Loaded ${validOrders.length} orders with details`);
    
    if (validOrders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <p class="text-muted">No orders found. Please check back later.</p>
            </div>
        `;
        return;
    }
    
    // Separate rejected orders from active orders
    const rejectedOrders = validOrders.filter(order => order.status === 'Rejected');
    const nonRejectedOrders = validOrders.filter(order => order.status !== 'Rejected');
    
    console.log(`Found ${rejectedOrders.length} rejected orders and ${nonRejectedOrders.length} active orders`);
    
    // Now filter out delivered orders from non-rejected orders (check delivery status in parallel)
    // Use a timeout to prevent hanging
    container.innerHTML = '<div class="text-center py-3"><p class="text-muted">Checking delivery status...</p></div>';
    
    const deliveryCheckPromises = nonRejectedOrders.map(async (order) => {
        try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
            );
            
            const fetchPromise = fetch(`../api/get_delivery_status.php?order_id=${order.Order_ID}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            const deliveryResponse = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (!deliveryResponse.ok) {
                // If check fails, include the order
                return order;
            }
            
            const deliveryData = await deliveryResponse.json();
            
            // Only exclude orders that are explicitly marked as 'Delivered'
            if (deliveryData.success && deliveryData.delivery && deliveryData.delivery.Delivery_Status === 'Delivered') {
                return null; // Order is delivered, exclude it
            }
            return order; // Include order (Pending, On the Way, or no delivery record)
        } catch (error) {
            console.error(`Error checking delivery for order ${order.Order_ID}:`, error);
            // If error checking delivery, include the order anyway
            return order;
        }
    });
    
    const deliveryResults = await Promise.allSettled(deliveryCheckPromises);
    const activeOrders = deliveryResults
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter(ord => ord !== null);
    
    console.log(`Found ${activeOrders.length} active orders out of ${nonRejectedOrders.length} non-rejected orders`);
    
    // Display orders: Active orders first, then Cancelled/Rejected orders
    container.innerHTML = '';
    
    // Display active orders section
    if (activeOrders.length > 0) {
        activeOrders.forEach(order => {
            container.insertAdjacentHTML('beforeend', createOrderCard(order));
        });
    } else if (rejectedOrders.length === 0) {
        // No active orders and no rejected orders
        container.innerHTML = `
            <div class="text-center py-5">
                <p class="text-muted">No active orders found. All orders have been completed.</p>
                <a href="TransactionHistory.html" class="btn btn-primary mt-2">View Transaction History</a>
            </div>
        `;
        return;
    }
    
    // Display cancelled/rejected orders section
    if (rejectedOrders.length > 0) {
        const cancelledSection = `
            <div class="cancelled-orders-section mt-5">
                <div class="section-header mb-3">
                    <h3 class="section-title">
                        <i class="fas fa-times-circle text-danger mr-2"></i>
                        Cancelled Orders
                        <span class="badge badge-danger ml-2">${rejectedOrders.length}</span>
                    </h3>
                    <hr class="section-divider">
                </div>
                <div class="cancelled-orders-list">
                    ${rejectedOrders.map(order => createOrderCard(order)).join('')}
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cancelledSection);
    }
    
    console.log(`Successfully displayed ${activeOrders.length} active orders and ${rejectedOrders.length} cancelled orders`);
}

// Create order card HTML
function createOrderCard(order) {
    const orderId = order.Order_ID;
    const orderNumber = `ORD-${orderId.toString().padStart(4, '0')}`;
    const totalAmount = formatPrice(order.amount);
    const itemCount = order.items ? order.items.length : 0;
    const orderDate = formatDate(order.order_date);
    const status = order.status || 'Pending Approval';
    
    // Check approval status
    const isPendingApproval = status === 'Pending Approval';
    const isRejected = status === 'Rejected';
    const isApproved = !isPendingApproval && !isRejected;
    
    // Only get payment method if order is approved (not pending or rejected)
    // Only use payment_method from orders table, not transaction_payment_method
    let paymentMethod = null;
    if (isApproved) {
        const rawPaymentMethod = order.payment_method;
        // Only set paymentMethod if it's a valid non-empty value
        if (rawPaymentMethod && 
            rawPaymentMethod !== 'null' && 
            rawPaymentMethod !== 'NULL' && 
            rawPaymentMethod !== '' && 
            rawPaymentMethod !== null && 
            rawPaymentMethod !== undefined) {
            paymentMethod = rawPaymentMethod;
        }
    }
    
    // Determine payment method display and icon (only if payment method exists)
    const isOnlinePayment = paymentMethod === 'GCash' || paymentMethod === 'Online';
    const paymentMethodDisplay = paymentMethod ? (isOnlinePayment ? 'Online Payment' : 'On-Site Payment') : 'Not Selected';
    const paymentIcon = isOnlinePayment ? 'fa-credit-card' : 'fa-money-bill-wave';
    const paymentBadgeClass = isOnlinePayment ? 'badge-info' : 'badge-secondary';
    
    // Create items list
    let itemsList = '';
    if (order.items && order.items.length > 0) {
        itemsList = order.items.map(item => item.Product_Name).join(', ');
    }
    
    return `
        <div class="order-card-container mb-4">
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-0">Order # ${orderNumber}</h5>
                        <small class="text-muted">${orderDate}</small>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        ${isPendingApproval ? `
                            <span class="badge badge-warning">
                                <i class="fas fa-clock mr-1"></i>
                                Pending Approval
                            </span>
                        ` : isRejected ? `
                            <span class="badge badge-danger">
                                <i class="fas fa-times-circle mr-1"></i>
                                Rejected
                            </span>
                        ` : paymentMethod ? `
                            <span class="badge ${paymentBadgeClass}">
                                <i class="fas ${paymentIcon} mr-1"></i>
                                ${paymentMethodDisplay}
                            </span>
                        ` : ''}
                        <span class="badge badge-${isPendingApproval ? 'warning' : isRejected ? 'danger' : status === 'Waiting Payment' ? 'warning' : status === 'Processing' ? 'info' : 'success'}">${status}</span>
                    </div>
                </div>
                <div class="card-body">
                    ${isPendingApproval ? `
                        <div class="alert alert-info mb-3">
                            <i class="fas fa-info-circle mr-2"></i>
                            Your order is pending admin approval. You will be notified once it is approved.
                        </div>
                    ` : isRejected ? `
                        <div class="alert alert-danger mb-3">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            <strong>This order has been cancelled.</strong>
                            ${order.rejection_reason ? `<br><small>Reason: ${escapeHtml(order.rejection_reason)}</small>` : '<br><small>No reason provided.</small>'}
                            <br>
                            <button class="btn btn-sm btn-outline-danger mt-2" onclick="showCancellationDetails(${orderId}, '${orderNumber.replace(/'/g, "\\'")}', ${order.rejection_reason ? `'${order.rejection_reason.replace(/'/g, "\\'")}'` : 'null'}, ${order.rejected_at ? `'${order.rejected_at.replace(/'/g, "\\'")}'` : 'null'})">
                                <i class="fas fa-info-circle mr-1"></i>
                                View Cancellation Details
                            </button>
                        </div>
                    ` : isApproved && !paymentMethod ? `
                        <div class="alert alert-warning mb-3">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Order approved! Please proceed to payment to continue.
                            <a href="payment.html?order_id=${orderId}" class="btn btn-sm btn-primary ml-2">Go to Payment</a>
                        </div>
                    ` : ''}
                    <div class="row">
                        <div class="col-md-8">
                            <h6>Items (${itemCount})</h6>
                            <p class="text-muted mb-2">${itemsList || 'No items'}</p>
                            ${isApproved && paymentMethod ? `
                            <p class="mb-2">
                                <strong>Payment Method:</strong> 
                                <span class="badge ${paymentBadgeClass} ml-2">
                                    <i class="fas ${paymentIcon} mr-1"></i>
                                    ${paymentMethodDisplay}
                                </span>
                            </p>
                            ` : ''}
                            ${order.availability_date ? `
                            <p class="mb-0">
                                <strong>Availability:</strong> 
                                <span class="text-muted">
                                    ${formatDate(order.availability_date)}
                                </span>
                            </p>
                            ` : ''}
                        </div>
                        <div class="col-md-4 text-right">
                            <h5 class="text-primary">${totalAmount}</h5>
                            ${isApproved && !paymentMethod ? `
                                <a href="payment.html?order_id=${orderId}" class="btn btn-primary mt-2">
                                    <i class="fas fa-credit-card mr-2"></i>
                                    Proceed to Payment
                                </a>
                            ` : isApproved ? `
                                <button class="btn btn-track-order mt-2" onclick="trackOrder(${orderId})">
                                    <i class="fas fa-map-marker-alt mr-2"></i>
                                    Track Order
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Display single order (for when order_id is in URL)
function displaySingleOrder(order) {
    // Hide orders container, show single order view
    const ordersContainer = document.getElementById('ordersContainer');
    const singleOrderView = document.getElementById('singleOrderView');
    
    if (ordersContainer) ordersContainer.style.display = 'none';
    if (singleOrderView) singleOrderView.style.display = 'block';
    
    // Update track order button to use this order's ID
    const trackBtn = document.getElementById('trackOrderBtn');
    if (trackBtn) {
        trackBtn.setAttribute('onclick', `trackOrder(${order.Order_ID})`);
    }
    
    displayOrderDetails(order);
}

// Display order details
async function displayOrderDetails(order) {
    const tbody = document.getElementById('orderItemsBody');
    if (!tbody) {
        console.error('Order items body not found');
        return;
    }
    
    // Check if order is cancelled/rejected and show cancellation notice
    const orderStatus = order.status || 'Pending Approval';
    const isRejected = orderStatus === 'Rejected';
    
    if (isRejected) {
        // Add cancellation notice above the order items table
        const orderTableContainer = document.querySelector('.order-table-container');
        if (orderTableContainer) {
            const existingNotice = orderTableContainer.previousElementSibling;
            if (!existingNotice || !existingNotice.classList.contains('cancellation-notice-single')) {
                const orderNumber = `ORD-${order.Order_ID.toString().padStart(4, '0')}`;
                const cancellationNotice = document.createElement('div');
                cancellationNotice.className = 'cancellation-notice-single alert alert-danger mb-4';
                cancellationNotice.innerHTML = `
                    <div class="d-flex align-items-start">
                        <i class="fas fa-times-circle fa-2x mr-3 mt-1"></i>
                        <div class="flex-grow-1">
                            <h5 class="alert-heading mb-2">
                                <strong>This order has been cancelled</strong>
                            </h5>
                            <p class="mb-2">
                                Your order ${orderNumber} has been cancelled by our team.
                            </p>
                            ${order.rejection_reason ? `
                                <p class="mb-2"><strong>Reason:</strong> ${escapeHtml(order.rejection_reason)}</p>
                            ` : ''}
                            <button class="btn btn-outline-danger btn-sm mt-2" onclick="showCancellationDetails(${order.Order_ID}, '${orderNumber.replace(/'/g, "\\'")}', ${order.rejection_reason ? `'${order.rejection_reason.replace(/'/g, "\\'")}'` : 'null'}, ${order.rejected_at ? `'${order.rejected_at.replace(/'/g, "\\'")}'` : 'null'})">
                                <i class="fas fa-info-circle mr-1"></i>
                                View Full Cancellation Details
                            </button>
                        </div>
                    </div>
                `;
                orderTableContainer.parentNode.insertBefore(cancellationNotice, orderTableContainer);
            }
        }
    } else {
        // Remove cancellation notice if order is not rejected
        const existingNotice = document.querySelector('.cancellation-notice-single');
        if (existingNotice) {
            existingNotice.remove();
        }
    }
    
    // Clear existing items
    tbody.innerHTML = '';
    
    // Load and display order items
    let totalAmount = 0;
    
    if (order.items && order.items.length > 0) {
        for (const item of order.items) {
            // Item already has Product_Name from the API JOIN, so we can use it directly
            // Optionally fetch additional details if needed, but not required
            tbody.insertAdjacentHTML('beforeend', createOrderItemRow(item, null));
            totalAmount += item.Price * item.Quantity;
        }
    }
    
    // Update total
    const totalElement = document.getElementById('orderTotalValue');
    if (totalElement) {
        totalElement.textContent = formatPrice(totalAmount);
    }
    
    // Update delivery date (if available) - time no longer used
    if (order.availability_date) {
        const deliveryDateEl = document.querySelector('.delivery-date');
        if (deliveryDateEl) {
            deliveryDateEl.textContent = formatDate(order.availability_date);
        }
    }
    
    // Update payment method display (only if order is approved and payment method is selected)
    const isPendingApproval = orderStatus === 'Pending Approval';
    const isApproved = !isPendingApproval && !isRejected;
    
    // Only get payment method if order is approved
    let paymentMethod = null;
    if (isApproved) {
        const rawPaymentMethod = order.payment_method;
        // Only set paymentMethod if it's a valid non-empty value
        if (rawPaymentMethod && 
            rawPaymentMethod !== 'null' && 
            rawPaymentMethod !== 'NULL' && 
            rawPaymentMethod !== '' && 
            rawPaymentMethod !== null && 
            rawPaymentMethod !== undefined) {
            paymentMethod = rawPaymentMethod;
        }
    }
    
}

// Initialize on page load with error handling
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOMContentLoaded - Starting loadOrderSummary');
        loadOrderSummary().catch(error => {
            console.error('Error in loadOrderSummary:', error);
            const container = document.getElementById('ordersContainer');
            if (container) {
                const isNetworkError = error.message.includes('Failed to fetch') || 
                                     error.message.includes('NetworkError') ||
                                     error.message.includes('network');
                
                if (isNetworkError) {
                    container.innerHTML = `
                        <div class="text-center py-5">
                            <p class="text-danger">Network error. Please check your connection and try again.</p>
                            <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
                        </div>
                    `;
                } else {
                    container.innerHTML = `
                        <div class="text-center py-5">
                            <p class="text-muted">Unable to load orders at this time. Please try again later.</p>
                            <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
                        </div>
                    `;
                }
            }
        });
    });
} else {
    console.log('DOM already loaded - Starting loadOrderSummary');
    loadOrderSummary().catch(error => {
        console.error('Error in loadOrderSummary:', error);
        const container = document.getElementById('ordersContainer');
        if (container) {
            const isNetworkError = error.message.includes('Failed to fetch') || 
                                 error.message.includes('NetworkError') ||
                                 error.message.includes('network');
            
            if (isNetworkError) {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <p class="text-danger">Network error. Please check your connection and try again.</p>
                        <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <p class="text-muted">Unable to load orders at this time. Please try again later.</p>
                        <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    });
}

// Auto-refresh every 15 seconds to keep order data updated
let orderSummaryRefreshInterval;
function startOrderSummaryAutoRefresh() {
    if (orderSummaryRefreshInterval) clearInterval(orderSummaryRefreshInterval);
    orderSummaryRefreshInterval = setInterval(() => {
        // Only refresh if page is visible
        if (!document.hidden) {
            loadOrderSummary();
        }
    }, 15000); // Refresh every 15 seconds
}

// Start auto-refresh after initial load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit after initial load before starting auto-refresh
        setTimeout(startOrderSummaryAutoRefresh, 2000);
    });
} else {
    // DOM already loaded
    setTimeout(startOrderSummaryAutoRefresh, 2000);
}

// Pause auto-refresh when page is hidden
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        if (orderSummaryRefreshInterval) clearInterval(orderSummaryRefreshInterval);
    } else {
        startOrderSummaryAutoRefresh();
    }
});

// Show cancellation details popup
function showCancellationDetails(orderId, orderNumber, rejectionReason, rejectedAt) {
    // Set order number
    const orderNumberEl = document.getElementById('cancellationOrderNumber');
    if (orderNumberEl) {
        orderNumberEl.textContent = orderNumber || `ORD-${orderId.toString().padStart(4, '0')}`;
    }
    
    // Set cancellation date
    const dateEl = document.getElementById('cancellationDate');
    if (dateEl) {
        if (rejectedAt && rejectedAt !== 'null' && rejectedAt !== '') {
            try {
                const date = new Date(rejectedAt);
                dateEl.textContent = formatDate(rejectedAt) + ' ' + formatTime(rejectedAt);
            } catch (e) {
                dateEl.textContent = rejectedAt;
            }
        } else {
            dateEl.textContent = 'Date not available';
        }
    }
    
    // Set rejection reason
    const reasonEl = document.getElementById('cancellationReason');
    if (reasonEl) {
        if (rejectionReason && rejectionReason !== 'null' && rejectionReason !== '') {
            reasonEl.innerHTML = `<p class="mb-0">${escapeHtml(rejectionReason)}</p>`;
        } else {
            reasonEl.innerHTML = '<em class="text-muted">No reason provided.</em>';
        }
    }
    
    // Show modal using Bootstrap
    if (typeof jQuery !== 'undefined' && jQuery.fn.modal) {
        jQuery('#cancellationModal').modal('show');
    } else {
        // Fallback if Bootstrap/jQuery not available
        const modal = document.getElementById('cancellationModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
        }
    }
}

// Make function globally available
window.showCancellationDetails = showCancellationDetails;


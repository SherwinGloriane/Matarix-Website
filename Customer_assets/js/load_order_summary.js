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
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
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
        const response = await fetch(`../api/get_product_details.php?product_id=${productId}`);
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
            console.error('Failed to load orders:', data.message);
            const container = document.getElementById('ordersContainer');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <p class="text-danger">Error loading orders: ${data.message || 'Unknown error'}</p>
                        <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading order summary:', error);
        const container = document.getElementById('ordersContainer');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <p class="text-danger">Error loading orders. Please refresh the page.</p>
                    <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
                </div>
            `;
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
    
    // Now filter out delivered orders (check delivery status in parallel)
    // Use a timeout to prevent hanging
    container.innerHTML = '<div class="text-center py-3"><p class="text-muted">Checking delivery status...</p></div>';
    
    const deliveryCheckPromises = validOrders.map(async (order) => {
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
    
    console.log(`Found ${activeOrders.length} active orders out of ${validOrders.length} total`);
    
    if (activeOrders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <p class="text-muted">No active orders found. All orders have been completed.</p>
                <a href="TransactionHistory.html" class="btn btn-primary mt-2">View Transaction History</a>
            </div>
        `;
        return;
    }
    
    // Display all active orders
    container.innerHTML = '';
    activeOrders.forEach(order => {
        container.insertAdjacentHTML('beforeend', createOrderCard(order));
    });
    
    console.log(`Successfully displayed ${activeOrders.length} orders`);
}

// Create order card HTML
function createOrderCard(order) {
    const orderId = order.Order_ID;
    const orderNumber = `ORD-${orderId.toString().padStart(4, '0')}`;
    const totalAmount = formatPrice(order.amount);
    const itemCount = order.items ? order.items.length : 0;
    const orderDate = formatDate(order.order_date);
    const paymentMethod = order.payment_method || order.transaction_payment_method || 'On-Site';
    const status = order.status || 'Waiting Payment';
    
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
                    <span class="badge badge-${status === 'Waiting Payment' ? 'warning' : status === 'Processing' ? 'info' : 'success'}">${status}</span>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6>Items (${itemCount})</h6>
                            <p class="text-muted mb-2">${itemsList || 'No items'}</p>
                            <p class="mb-0"><strong>Payment Method:</strong> ${paymentMethod}</p>
                        </div>
                        <div class="col-md-4 text-right">
                            <h5 class="text-primary">${totalAmount}</h5>
                            <button class="btn btn-track-order mt-2" onclick="trackOrder(${orderId})">
                                <i class="fas fa-map-marker-alt mr-2"></i>
                                Track Order
                            </button>
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
    
    // Update delivery date (if available)
    if (order.availability_date) {
        const deliveryDateEl = document.querySelector('.delivery-date');
        const deliveryTimeEl = document.querySelector('.delivery-time');
        if (deliveryDateEl) {
            deliveryDateEl.textContent = formatDate(order.availability_date);
        }
        if (deliveryTimeEl && order.availability_time) {
            deliveryTimeEl.textContent = order.availability_time;
        }
    }
    
    // Update payment method display
    const paymentMethod = order.payment_method || order.transaction_payment_method || 'On-Site';
    const paymentTitleEl = document.querySelector('.payment-title');
    if (paymentTitleEl) {
        paymentTitleEl.textContent = `Paid thru: ${paymentMethod === 'GCash' ? 'GCash' : paymentMethod}`;
    }
    
    // Show/hide GCash info based on payment method
    const gcashInfo = document.querySelector('.gcash-info');
    if (gcashInfo) {
        if (paymentMethod === 'GCash' && order.proof_of_payment) {
            gcashInfo.style.display = 'flex';
            const receiptLink = document.getElementById('viewReceiptLink');
            if (receiptLink && order.proof_of_payment) {
                receiptLink.href = `receipt.html?order_id=${order.Order_ID}`;
            }
        } else {
            gcashInfo.style.display = 'none';
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
                container.innerHTML = `
                    <div class="text-center py-5">
                        <p class="text-danger">Error loading orders: ${error.message}</p>
                        <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        });
    });
} else {
    console.log('DOM already loaded - Starting loadOrderSummary');
    loadOrderSummary().catch(error => {
        console.error('Error in loadOrderSummary:', error);
        const container = document.getElementById('ordersContainer');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <p class="text-danger">Error loading orders: ${error.message}</p>
                    <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    });
}


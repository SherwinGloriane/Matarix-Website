/**
 * Load Orders for Admin
 * Dynamically loads and displays orders from the database
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    });
}

// Format datetime
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
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

// Get status badge class
function getStatusBadgeClass(status) {
    const statusMap = {
        'Order Confirmed': 'status-confirmed',
        'Being Processed': 'status-preparing',
        'On the Way': 'status-ready',
        'Completed': 'status-completed'
    };
    return statusMap[status] || 'status-confirmed';
}

// Global cache for vehicle capacities and delivery fees
let vehicleCapacitiesCache = null;
let deliveryFeeCache = {};

// Load vehicle capacities from fleet
async function loadVehicleCapacities() {
    if (vehicleCapacitiesCache) {
        return vehicleCapacitiesCache;
    }
    
    try {
        const response = await fetch('../api/get_fleet.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.vehicles) {
                // Convert all capacities to kg
                vehicleCapacitiesCache = data.vehicles.map(vehicle => {
                    let capacityKg = parseFloat(vehicle.capacity) || 0;
                    const unit = vehicle.capacity_unit || 'kg';
                    
                    // Convert to kg
                    switch(unit) {
                        case 'g': capacityKg = capacityKg / 1000; break;
                        case 'lb': capacityKg = capacityKg * 0.453592; break;
                        case 'oz': capacityKg = capacityKg * 0.0283495; break;
                        case 'ton': capacityKg = capacityKg * 1000; break;
                    }
                    
                    return {
                        id: vehicle.vehicle_id || vehicle.Vehicle_ID,
                        model: vehicle.vehicle_model,
                        capacity: capacityKg,
                        status: vehicle.status
                    };
                }).filter(v => v.capacity > 0 && (v.status === 'Available' || v.status === 'In Use'))
                  .sort((a, b) => b.capacity - a.capacity); // Sort by capacity (largest first)
                
                return vehicleCapacitiesCache;
            }
        }
    } catch (error) {
        // Silently handle error
    }
    
    // Return default if API fails
    return [{ id: 1, model: 'Default Truck', capacity: 1700, status: 'Available' }];
}

// Calculate trucks needed for an order
async function calculateTrucksNeeded(orderWeightKg) {
    const vehicles = await loadVehicleCapacities();
    
    if (!vehicles || vehicles.length === 0) {
        return { trucks: 1, vehicles: [] };
    }
    
    let remainingWeight = parseFloat(orderWeightKg) || 0;
    let trucksNeeded = 0;
    const vehiclesUsed = [];
    
    // Use largest vehicles first
    for (const vehicle of vehicles) {
        if (remainingWeight <= 0) break;
        
        const trips = Math.ceil(remainingWeight / vehicle.capacity);
        trucksNeeded += trips;
        
        if (trips > 0) {
            vehiclesUsed.push({
                vehicle: vehicle.model,
                capacity: vehicle.capacity,
                trips: trips
            });
        }
        
        remainingWeight -= (vehicle.capacity * trips);
    }
    
    // If still weight remaining, add one more truck
    if (remainingWeight > 0) {
        trucksNeeded += 1;
    }
    
    return {
        trucks: trucksNeeded,
        vehicles: vehiclesUsed
    };
}

// Calculate delivery fee based on address
async function calculateDeliveryFee(deliveryAddress) {
    if (!deliveryAddress) {
        return { distance: 0, fee: 0 };
    }
    
    // Check cache first
    const cacheKey = deliveryAddress.toLowerCase().trim();
    if (deliveryFeeCache[cacheKey]) {
        return deliveryFeeCache[cacheKey];
    }
    
    try {
        const response = await fetch(`../api/calculate_delivery_fee.php?address=${encodeURIComponent(deliveryAddress)}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const result = {
                    distance: parseFloat(data.distance) || 0,
                    fee: parseFloat(data.delivery_fee) || 0
                };
                // Cache the result
                deliveryFeeCache[cacheKey] = result;
                return result;
            }
        }
    } catch (error) {
        // Silently handle error
    }
    
    // Return default if API fails
    return { distance: 0, fee: 0 };
}

// Get order weight from order items
async function getOrderWeight(orderId) {
    try {
        const response = await fetch(`../api/get_orders.php?order_id=${orderId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.order && data.order.items) {
                let totalWeightKg = 0;
                
                data.order.items.forEach(item => {
                    if (item.weight && item.Quantity) {
                        let weightKg = parseFloat(item.weight) || 0;
                        const unit = item.weight_unit || 'kg';
                        
                        // Convert to kg
                        switch(unit) {
                            case 'g': weightKg = weightKg / 1000; break;
                            case 'lb': weightKg = weightKg * 0.453592; break;
                            case 'oz': weightKg = weightKg * 0.0283495; break;
                            case 'ton': weightKg = weightKg * 1000; break;
                        }
                        
                        totalWeightKg += weightKg * parseInt(item.Quantity);
                    }
                });
                
                return totalWeightKg;
            }
        }
    } catch (error) {
        // Silently handle error
    }
    
    return 0;
}

// Create order card HTML for Kanban board
async function createOrderCard(order) {
    const orderId = order.Order_ID;
    const customerName = order.customer_name || 'Unknown Customer';
    const orderDate = formatDate(order.order_date);
    const status = order.status || 'Pending Approval';
    const payment = order.payment || 'To Pay';
    const amount = formatPrice(order.amount);
    const availabilityDate = order.availability_date ? formatDate(order.availability_date) : 'N/A';
    const deliveryAddress = order.address || '';
    
    // Check if order is pending approval
    const isPendingApproval = status === 'Pending Approval';
    const isRejected = status === 'Rejected';
    const isApproved = !isPendingApproval && !isRejected;
    
    // Determine status class
    let statusClass = 'pending';
    if (status === 'Processing') {
        statusClass = 'processing';
    } else if (status === 'Ready') {
        statusClass = 'ready';
    }
    
    // Calculate delivery fee (async) - truck count removed, now shown in DeliveriesAdmin
    const deliveryFeeInfo = await calculateDeliveryFee(deliveryAddress);
    
    // Action buttons
    let actionButtons = '';
    if (isPendingApproval) {
        actionButtons = `
            <a href="../Admin/ViewOrderAccept.html?order_id=${orderId}" class="order-card-btn view-btn" title="View Order Details">
                <i class="fas fa-eye"></i> View
            </a>
            <button class="order-card-btn approve-btn" onclick="approveOrder(${orderId})" title="Approve Order">
                <i class="fas fa-check"></i> Approve
                </button>
            <button class="order-card-btn reject-btn" onclick="rejectOrder(${orderId})" title="Reject Order">
                <i class="fas fa-times"></i> Reject
                </button>
        `;
    } else {
        actionButtons = `
            <a href="../Admin/ViewOrderAccept.html?order_id=${orderId}" class="order-card-btn view-btn" title="View Order Details">
                <i class="fas fa-eye"></i> View
            </a>
        `;
    }
    
    return `
        <div class="order-card ${statusClass}" data-order-id="${orderId}">
            <div class="order-card-header">
                <span class="order-id">ORD-${orderId.toString().padStart(4, '0')}</span>
                <span class="order-amount">${amount}</span>
            </div>
            <div class="order-card-body">
                <div class="customer-name">${escapeHtml(customerName)}</div>
                <div class="order-meta">
                    <div class="order-meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>${orderDate}</span>
                    </div>
                    <div class="order-meta-item">
                        <i class="fas fa-clock"></i>
                        <span>Available: ${availabilityDate}</span>
                    </div>
                </div>
                <div class="order-info-badges">
                    <span class="info-badge delivery-fee-badge">
                        <i class="fas fa-map-marker-alt"></i>
                        ₱${deliveryFeeInfo.fee.toFixed(2)}
                    </span>
                    <span class="info-badge payment-badge ${payment === 'Paid' ? 'paid' : ''}">
                        <i class="fas fa-${payment === 'Paid' ? 'check-circle' : 'clock'}"></i>
                        ${payment}
                    </span>
                </div>
                <div class="status-badge-card ${statusClass}">${status}</div>
            </div>
            <div class="order-card-footer">
                ${actionButtons}
            </div>
        </div>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Track last known order IDs to detect new orders
let lastKnownOrderIds = new Set();
let isInitialLoad = true;

// Load orders
async function loadOrders() {
    try {
        const response = await fetch('../api/get_orders.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.orders) {
            // Get current order IDs
            const currentOrderIds = new Set(data.orders.map(order => order.Order_ID));
            
            // Detect new orders (only after initial load)
            if (!isInitialLoad) {
                const newOrderIds = [];
                currentOrderIds.forEach(orderId => {
                    if (!lastKnownOrderIds.has(orderId)) {
                        newOrderIds.push(orderId);
                    }
                });
                
                // Show notification if new orders detected
                if (newOrderIds.length > 0) {
                    const newOrders = data.orders.filter(order => newOrderIds.includes(order.Order_ID));
                    const customerNames = newOrders.map(order => order.customer_name || 'Unknown').join(', ');
                    const orderCount = newOrderIds.length;
                    
                    // Show popup notification
                    if (typeof AdminNotifications !== 'undefined') {
                        AdminNotifications.info(
                            `${orderCount} new order${orderCount > 1 ? 's' : ''} received! ${orderCount > 1 ? 'Customers' : 'Customer'}: ${customerNames}`,
                            {
                                title: 'New Order Alert',
                                duration: 8000,
                                showProgress: true
                            }
                        );
                    }
                }
            } else {
                // Mark initial load as complete
                isInitialLoad = false;
            }
            
            // Update last known order IDs
            lastKnownOrderIds = currentOrderIds;
            
            // Categorize orders by status for tabs
            const pendingApprovalOrders = [];
            const processingOrders = [];
            const readyOrders = [];
            const waitingPaymentOrders = [];
            const rejectedOrders = [];
            
            data.orders.forEach(order => {
                const status = order.status || 'Pending Approval';
                
                if (status === 'Pending Approval') {
                    pendingApprovalOrders.push(order);
                } else if (status === 'Processing') {
                    processingOrders.push(order);
                } else if (status === 'Ready') {
                    readyOrders.push(order);
                } else if (status === 'Waiting Payment') {
                    waitingPaymentOrders.push(order);
                } else if (status === 'Rejected') {
                    rejectedOrders.push(order);
                } else {
                    // Default to pending approval for unknown statuses
                    pendingApprovalOrders.push(order);
                }
            });
            
            // Get tab card containers
            const pendingApprovalCards = document.getElementById('pendingApprovalCards');
            const processingCards = document.getElementById('processingCards');
            const readyCards = document.getElementById('readyCards');
            const waitingPaymentCards = document.getElementById('waitingPaymentCards');
            const rejectedCards = document.getElementById('rejectedCards');
            
            // Display orders in their respective tab containers (load in parallel for better performance)
            if (pendingApprovalOrders.length === 0 && pendingApprovalCards) {
                pendingApprovalCards.innerHTML = '<div class="text-center py-5"><p class="text-muted">No pending approval orders</p></div>';
            } else if (pendingApprovalCards) {
                const cardPromises = pendingApprovalOrders.map(order => createOrderCard(order));
                const cardHtmls = await Promise.all(cardPromises);
                pendingApprovalCards.innerHTML = cardHtmls.join('');
            }
            
            if (processingOrders.length === 0 && processingCards) {
                processingCards.innerHTML = '<div class="text-center py-5"><p class="text-muted">No processing orders</p></div>';
            } else if (processingCards) {
                const cardPromises = processingOrders.map(order => createOrderCard(order));
                const cardHtmls = await Promise.all(cardPromises);
                processingCards.innerHTML = cardHtmls.join('');
            }
            
            if (readyOrders.length === 0 && readyCards) {
                readyCards.innerHTML = '<div class="text-center py-5"><p class="text-muted">No ready orders</p></div>';
            } else if (readyCards) {
                const cardPromises = readyOrders.map(order => createOrderCard(order));
                const cardHtmls = await Promise.all(cardPromises);
                readyCards.innerHTML = cardHtmls.join('');
            }
            
            if (waitingPaymentOrders.length === 0 && waitingPaymentCards) {
                waitingPaymentCards.innerHTML = '<div class="text-center py-5"><p class="text-muted">No waiting payment orders</p></div>';
            } else if (waitingPaymentCards) {
                const cardPromises = waitingPaymentOrders.map(order => createOrderCard(order));
                const cardHtmls = await Promise.all(cardPromises);
                waitingPaymentCards.innerHTML = cardHtmls.join('');
            }
            
            if (rejectedOrders.length === 0 && rejectedCards) {
                rejectedCards.innerHTML = '<div class="text-center py-5"><p class="text-muted">No rejected orders</p></div>';
            } else if (rejectedCards) {
                const cardPromises = rejectedOrders.map(order => createOrderCard(order));
                const cardHtmls = await Promise.all(cardPromises);
                rejectedCards.innerHTML = cardHtmls.join('');
            }
            
            // Update tab counts
            const pendingCountEl = document.getElementById('pendingCount');
            const processingCountEl = document.getElementById('processingCount');
            const readyCountEl = document.getElementById('readyCount');
            const waitingPaymentCountEl = document.getElementById('waitingPaymentCount');
            const rejectedCountEl = document.getElementById('rejectedCount');
            
            if (pendingCountEl) pendingCountEl.textContent = pendingApprovalOrders.length;
            if (processingCountEl) processingCountEl.textContent = processingOrders.length;
            if (readyCountEl) readyCountEl.textContent = readyOrders.length;
            if (waitingPaymentCountEl) waitingPaymentCountEl.textContent = waitingPaymentOrders.length;
            if (rejectedCountEl) rejectedCountEl.textContent = rejectedOrders.length;
            
            // Ensure event delegation is setup after adding cards
            if (!eventDelegationSetup) {
                setupEventDelegation();
            }
            
            // Update statistics
            updateStatistics(data.orders);
        } else {
            // Silently handle failed load
        }
    } catch (error) {
        // Silently handle errors
    }
}

// Update statistics
function updateStatistics(orders) {
    const totalOrders = orders.length;
    
    // Pending Payments: Only count orders with status "Waiting Payment"
    // Exclude "Pending Approval" orders - they haven't been approved yet
    const pendingPayments = orders.filter(o => {
        const status = (o.status || '').trim();
        return status === 'Waiting Payment';
    }).length;
    
    // In Progress: Orders that are being processed
    // Status values: 'Processing' (new) or 'Being Processed' (legacy)
    const inProgress = orders.filter(o => {
        const status = (o.status || '').trim();
        return status === 'Processing' || status === 'Being Processed';
    }).length;
    
    // Completed: Orders that are ready/completed
    // Status values: 'Ready' (new) or 'Completed' (legacy)
    const completed = orders.filter(o => {
        const status = (o.status || '').trim();
        return status === 'Ready' || status === 'Completed';
    }).length;
    
    const totalOrdersEl = document.getElementById('totalOrders');
    const pendingPaymentsEl = document.getElementById('pendingPayments');
    const inProgressEl = document.getElementById('inProgress');
    const completedEl = document.getElementById('completed');
    
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    if (pendingPaymentsEl) pendingPaymentsEl.textContent = pendingPayments;
    if (inProgressEl) inProgressEl.textContent = inProgress;
    if (completedEl) completedEl.textContent = completed;
    
    // Statistics updated silently
}

// Update payment status
async function updatePaymentStatus(orderId, paymentStatus) {
    
    // Check if order is approved (not pending approval or rejected)
    const row = document.querySelector(`tr[data-order-id="${orderId}"]`);
    if (row) {
        const paymentDropdown = row.querySelector('.payment-dropdown');
        if (paymentDropdown && paymentDropdown.disabled) {
            if (window.AdminNotifications) {
                AdminNotifications.warning('Cannot update payment status. Order must be approved first.', { duration: 4000 });
            }
            return;
        }
    }
    
    // Get the dropdown element to store previous value
    const dropdown = document.querySelector(`.payment-dropdown[data-order-id="${orderId}"]`);
    const previousValue = dropdown ? dropdown.value : null;
    
    const confirmed = await AdminNotifications.confirm(
        `Change payment status to "${paymentStatus}"?`,
        {
            title: 'Change Payment Status',
            confirmText: 'Change',
            cancelText: 'Cancel'
        }
    );
    
    if (!confirmed) {
        // Reset dropdown to previous value
        if (dropdown && previousValue) {
            dropdown.value = previousValue;
        }
        return;
    }
    
    try {
        const response = await fetch('../api/update_payment_status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                order_id: parseInt(orderId),
                payment_status: paymentStatus
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Payment status updated successfully
            if (window.AdminNotifications) {
                AdminNotifications.success('Payment status updated successfully!', { duration: 3000 });
            }
            
            // Reload orders to reflect changes
            await loadOrders();
            
            // Trigger inventory update (works even if not on inventory page - function will check)
            setTimeout(() => {
                if (window.loadInventory) {
                    window.loadInventory();
                }
            }, 500);
        } else {
            const errorMessage = (data.message || 'Unknown error').replace(/https?:\/\/[^\s]+localhost[^\s]*/gi, '').replace(/localhost[^\s]*/gi, '');
            if (window.AdminNotifications) {
                AdminNotifications.error('Failed to update payment status: ' + errorMessage, { duration: 5000 });
            }
            // Reload to reset dropdown
            await loadOrders();
        }
    } catch (error) {
        if (window.AdminNotifications) {
            AdminNotifications.error('Failed to update payment status. Please try again.', { duration: 5000 });
        }
        // Reload to reset dropdown
        await loadOrders();
    }
}

// Approve order
async function approveOrder(orderId) {
    orderId = parseInt(orderId);
    
    if (!orderId || isNaN(orderId)) {
        if (window.AdminNotifications) {
            AdminNotifications.warning('Invalid order ID', { duration: 4000 });
        }
        return;
    }
    
    const confirmed = await AdminNotifications.confirm(
        `Approve order ORD-${orderId.toString().padStart(4, '0')}? The customer will be able to proceed with payment.`,
        {
            title: 'Approve Order',
            confirmText: 'Approve',
            cancelText: 'Cancel'
        }
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('../api/approve_order.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                order_id: orderId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (window.AdminNotifications) {
                AdminNotifications.success('Order approved successfully!', { duration: 3000 });
            }
            await loadOrders();
        } else {
            const errorMessage = (data.message || 'Unknown error').replace(/https?:\/\/[^\s]+localhost[^\s]*/gi, '').replace(/localhost[^\s]*/gi, '');
            if (window.AdminNotifications) {
                AdminNotifications.error('Failed to approve order: ' + errorMessage, { duration: 5000 });
            }
        }
    } catch (error) {
        if (window.AdminNotifications) {
            AdminNotifications.error('Failed to approve order. Please try again.', { duration: 5000 });
        }
    }
}

// Reject order
async function rejectOrder(orderId) {
    orderId = parseInt(orderId);
    
    if (!orderId || isNaN(orderId)) {
        if (window.AdminNotifications) {
            AdminNotifications.warning('Invalid order ID', { duration: 4000 });
        }
        return;
    }
    
    // Use custom prompt dialog for rejection reason
    const rejectionReason = await AdminNotifications.prompt(
        'Please provide a reason for rejecting this order (optional):',
        '',
        {
            title: 'Reject Order',
            placeholder: 'Enter rejection reason (optional)',
            confirmText: 'Continue',
            cancelText: 'Cancel'
        }
    );
    
    if (rejectionReason === null) {
        // User cancelled
        return;
    }
    
    // Use custom confirmation dialog
    const confirmed = await AdminNotifications.confirm(
        `Reject order ORD-${orderId.toString().padStart(4, '0')}? This action cannot be undone.`,
        {
            title: 'Confirm Rejection',
            confirmText: 'Reject',
            cancelText: 'Cancel',
            danger: true
        }
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('../api/reject_order.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                order_id: orderId,
                rejection_reason: rejectionReason || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            AdminNotifications.success('Order rejected successfully.', { duration: 3000 });
            await loadOrders();
        } else {
            AdminNotifications.error('Failed to reject order: ' + (data.message || 'Unknown error'), {
                details: data
            });
        }
    } catch (error) {
        AdminNotifications.error('Failed to reject order. Please try again.', {
            details: { error: error.message }
        });
    }
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    // Ensure orderId is a number and newStatus is a string
    orderId = parseInt(orderId);
    newStatus = String(newStatus).trim();
    
    if (!orderId || !newStatus) {
        if (window.AdminNotifications) {
            AdminNotifications.warning('Invalid order ID or status', { duration: 4000 });
        }
        return;
    }
    
    // Check if order is approved (not pending approval or rejected)
    // We need to check the current order status from the table
    const row = document.querySelector(`tr[data-order-id="${orderId}"]`);
    if (row) {
        const statusDropdown = row.querySelector('.status-dropdown');
        if (statusDropdown && statusDropdown.disabled) {
            if (window.AdminNotifications) {
                AdminNotifications.warning('Cannot update status. Order must be approved first.', { duration: 4000 });
            }
            return;
        }
    }
    
    // Get the dropdown element to store previous value
    const dropdown = document.querySelector(`.status-dropdown[data-order-id="${orderId}"]`);
    const previousValue = dropdown ? dropdown.value : null;
    
    const confirmed = await AdminNotifications.confirm(
        `Change order status to "${newStatus}"?`,
        {
            title: 'Change Order Status',
            confirmText: 'Change',
            cancelText: 'Cancel'
        }
    );
    
    if (!confirmed) {
        // Reset dropdown to previous value
        if (dropdown && previousValue) {
            dropdown.value = previousValue;
        }
        return;
    }
    
    try {
        const requestBody = {
            order_id: orderId,
            status: newStatus
        };
        
        const response = await fetch('../api/update_order_status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            // Filter out localhost URLs from error messages
            const cleanErrorText = errorText.replace(/https?:\/\/[^\s]+localhost[^\s]*/gi, '').replace(/localhost[^\s]*/gi, '');
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Show message with stock reduction info if applicable
            let message = 'Order status updated successfully!';
            if (data.stock_reduced) {
                message += '\n\nStock levels have been reduced for all products in this order.';
            }
            if (window.AdminNotifications) {
                AdminNotifications.success(message, { duration: 5000 });
            }
            
            // If status changed to Ready, switch to Ready tab
            if (newStatus === 'Ready') {
                // Switch to Ready tab
                $('.tab-btn').removeClass('active');
                $('.tab-content').removeClass('active');
                $('#ready-tab').addClass('active');
                $('#ready-content').addClass('active');
            }
            
            // Reload orders to reflect changes
            await loadOrders();
            
            // Trigger inventory update if stock was reduced (works even if not on inventory page)
            if (data.stock_reduced) {
                setTimeout(() => {
                    if (window.loadInventory) {
                        window.loadInventory();
                    }
                }, 1000);
            }
        } else {
            const errorMessage = (data.message || 'Unknown error').replace(/https?:\/\/[^\s]+localhost[^\s]*/gi, '').replace(/localhost[^\s]*/gi, '');
            if (window.AdminNotifications) {
                AdminNotifications.error('Failed to update order status: ' + errorMessage, { duration: 5000 });
            }
            // Reload to reset dropdown
            await loadOrders();
        }
    } catch (error) {
        if (window.AdminNotifications) {
            AdminNotifications.error('Failed to update order status. Please try again.', { duration: 5000 });
        }
        // Reload to reset dropdown
        await loadOrders();
    }
}

// Download order (placeholder)
function downloadOrder(orderId) {
    if (window.AdminNotifications) {
        AdminNotifications.info(`Download order ${orderId} (Feature coming soon)`, {
            title: 'Download Order',
            duration: 4000
        });
    }
}

// Delete order
async function deleteOrder(orderId) {
    // Ensure orderId is a number
    orderId = parseInt(orderId);
    
    if (!orderId || isNaN(orderId)) {
        if (window.AdminNotifications) {
            AdminNotifications.warning('Invalid order ID', { duration: 4000 });
        }
        return;
    }
    
    // Use custom confirmation dialog
    const confirmed = await AdminNotifications.confirm(
        `Are you sure you want to delete order ORD-${orderId.toString().padStart(4, '0')}? This action cannot be undone.`,
        {
            title: 'Delete Order',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            danger: true
        }
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('../api/delete_order.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                order_id: orderId
            })
        });
        
        // Try to parse response
        let data;
        try {
            const responseText = await response.text();
            // Filter out localhost URLs from response
            const cleanResponseText = responseText.replace(/https?:\/\/[^\s]+localhost[^\s]*/gi, '').replace(/localhost[^\s]*/gi, '');
            data = JSON.parse(cleanResponseText || responseText);
        } catch (parseError) {
            throw new Error('Invalid response from server');
        }
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        
        if (data.success) {
            AdminNotifications.success('Order deleted successfully!', { duration: 3000 });
            
            // Reload orders to reflect changes
            await loadOrders();
        } else {
            throw new Error(data.message || 'Failed to delete order');
        }
    } catch (error) {
        AdminNotifications.error('Failed to delete order: ' + error.message, {
            details: { error: error.message }
        });
    }
}

// Setup event delegation for dropdowns (backup in case inline handlers don't work)
// NOTE: We're using event delegation as the PRIMARY method since inline handlers may not work reliably
let eventDelegationSetup = false;
function setupEventDelegation() {
    if (eventDelegationSetup) {
        return;
    }
    
    // Use event delegation for status dropdowns
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('status-dropdown')) {
            const orderId = parseInt(e.target.getAttribute('data-order-id'));
            const newStatus = e.target.value.trim();
            if (orderId && newStatus) {
                // Prevent inline handler from also firing
                e.stopImmediatePropagation();
                updateOrderStatus(orderId, newStatus);
            }
        }
        
        if (e.target.classList.contains('payment-dropdown')) {
            const orderId = parseInt(e.target.getAttribute('data-order-id'));
            const paymentStatus = e.target.value.trim();
            if (orderId && paymentStatus) {
                // Prevent inline handler from also firing
                e.stopImmediatePropagation();
                updatePaymentStatus(orderId, paymentStatus);
            }
        }
    });
    
    eventDelegationSetup = true;
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setupEventDelegation();
        loadOrders();
    });
} else {
    setupEventDelegation();
    loadOrders();
}

// Auto-refresh every 15 seconds to detect new orders faster
setInterval(loadOrders, 15000);

// Export functions for global access
window.updatePaymentStatus = updatePaymentStatus;
window.updateOrderStatus = updateOrderStatus;
window.downloadOrder = downloadOrder;
window.deleteOrder = deleteOrder;
window.loadOrders = loadOrders;
window.approveOrder = approveOrder;
window.rejectOrder = rejectOrder;


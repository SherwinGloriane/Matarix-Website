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

// Create order row HTML
function createOrderRow(order) {
    const orderId = order.Order_ID;
    const customerName = order.customer_name || 'Unknown Customer';
    const orderDate = formatDate(order.order_date);
    const status = order.status || 'Order Confirmed';
    const payment = order.payment || 'To Pay';
    const amount = formatPrice(order.amount);
    const lastUpdated = formatDateTime(order.last_updated);
    const availabilityDate = order.availability_date ? formatDate(order.availability_date) : 'N/A';
    const availabilityTime = order.availability_time || '';
    
    // Payment status options
    const paymentOptions = payment === 'Paid' 
        ? '<option value="Paid" selected>Paid</option><option value="To Pay">To Pay</option>'
        : '<option value="Paid">Paid</option><option value="To Pay" selected>To Pay</option>';
    
    // Status dropdown options
    const statusOptions = [
        { value: 'Waiting Payment', label: 'Waiting Payment' },
        { value: 'Processing', label: 'Processing' },
        { value: 'Ready', label: 'Ready' }
    ];
    
    const statusDropdown = statusOptions.map(opt => 
        `<option value="${opt.value}" ${opt.value === status ? 'selected' : ''}>${opt.label}</option>`
    ).join('');
    
    return `
        <tr data-order-id="${orderId}">
            <td>ORD-${orderId.toString().padStart(4, '0')}</td>
            <td>${customerName}</td>
            <td>${orderDate}</td>
            <td>
                <select class="status-dropdown" data-order-id="${orderId}">
                    ${statusDropdown}
                </select>
            </td>
            <td>
                <select class="payment-dropdown" data-order-id="${orderId}">
                    ${paymentOptions}
                </select>
            </td>
            <td>${availabilityDate} ${availabilityTime}</td>
            <td>${amount}</td>
            <td>${lastUpdated}</td>
            <td>
                <div class="action-buttons">
                    <a href="../Admin/ViewOrderAccept.html?order_id=${orderId}" class="action-btn view-btn" title="View Order Details">
                        <i class="fas fa-eye"></i>
                    </a>
                    <button class="action-btn download-btn" onclick="downloadOrder(${orderId})" title="Download Order">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteOrder(${orderId})" title="Delete Order">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Load orders
async function loadOrders() {
    try {
        console.log('Loading orders...');
        const response = await fetch('../api/get_orders.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Orders loaded:', data);
        
        if (data.success && data.orders) {
            const tbody = document.querySelector('.order-table tbody');
            if (!tbody) {
                console.error('Order table body not found');
                return;
            }
            
            // Clear existing rows
            tbody.innerHTML = '';
            
            // Add order rows
            data.orders.forEach(order => {
                tbody.insertAdjacentHTML('beforeend', createOrderRow(order));
            });
            
            // Ensure event delegation is setup after adding rows
            if (!eventDelegationSetup) {
                setupEventDelegation();
            }
            
            // Update statistics
            updateStatistics(data.orders);
            
            console.log('Orders displayed successfully');
        } else {
            console.error('Failed to load orders:', data.message);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Update statistics
function updateStatistics(orders) {
    const totalOrders = orders.length;
    const pendingPayments = orders.filter(o => o.payment === 'To Pay').length;
    const inProgress = orders.filter(o => 
        o.status === 'Order Confirmed' || o.status === 'Being Processed'
    ).length;
    const completed = orders.filter(o => o.status === 'Completed').length;
    
    const totalOrdersEl = document.getElementById('totalOrders');
    const pendingPaymentsEl = document.getElementById('pendingPayments');
    const inProgressEl = document.getElementById('inProgress');
    const completedEl = document.getElementById('completed');
    
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    if (pendingPaymentsEl) pendingPaymentsEl.textContent = pendingPayments;
    if (inProgressEl) inProgressEl.textContent = inProgress;
    if (completedEl) completedEl.textContent = completed;
}

// Update payment status
async function updatePaymentStatus(orderId, paymentStatus) {
    console.log('Updating payment status:', { orderId, paymentStatus });
    
    // Get the dropdown element to store previous value
    const dropdown = document.querySelector(`.payment-dropdown[data-order-id="${orderId}"]`);
    const previousValue = dropdown ? dropdown.value : null;
    
    if (!confirm(`Change payment status to "${paymentStatus}"?`)) {
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
        console.log('Payment status update response:', data);
        
        if (data.success) {
            // Show success message
            console.log('Payment status updated successfully');
            
            // Reload orders to reflect changes
            await loadOrders();
            
            // Trigger inventory update (works even if not on inventory page - function will check)
            setTimeout(() => {
                if (window.loadInventory) {
                    window.loadInventory();
                }
            }, 500);
        } else {
            console.error('Failed to update payment status:', data.message);
            alert('Failed to update payment status: ' + (data.message || 'Unknown error'));
            // Reload to reset dropdown
            await loadOrders();
        }
    } catch (error) {
        console.error('Error updating payment status:', error);
        alert('Failed to update payment status. Please try again. Error: ' + error.message);
        // Reload to reset dropdown
        await loadOrders();
    }
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    console.log('=== updateOrderStatus CALLED ===');
    console.log('Parameters:', { orderId, newStatus, type: typeof orderId, typeStatus: typeof newStatus });
    
    // Ensure orderId is a number and newStatus is a string
    orderId = parseInt(orderId);
    newStatus = String(newStatus).trim();
    
    console.log('After parsing:', { orderId, newStatus });
    
    if (!orderId || !newStatus) {
        console.error('Invalid parameters:', { orderId, newStatus });
        alert('Invalid order ID or status');
        return;
    }
    
    // Get the dropdown element to store previous value
    const dropdown = document.querySelector(`.status-dropdown[data-order-id="${orderId}"]`);
    const previousValue = dropdown ? dropdown.value : null;
    console.log('Dropdown found:', dropdown, 'Previous value:', previousValue, 'New value:', newStatus);
    
    if (!confirm(`Change order status to "${newStatus}"?`)) {
        console.log('User cancelled status change');
        // Reset dropdown to previous value
        if (dropdown && previousValue) {
            dropdown.value = previousValue;
            console.log('Reset dropdown to previous value:', previousValue);
        }
        return;
    }
    
    console.log('User confirmed, proceeding with API call...');
    
    try {
        const requestBody = {
            order_id: orderId,
            status: newStatus
        };
        console.log('Sending request to ../api/update_order_status.php:', requestBody);
        
        const response = await fetch('../api/update_order_status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response received:', { status: response.status, statusText: response.statusText });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error text:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Order status update response data:', data);
        
        if (data.success) {
            console.log('✅ Order status updated successfully in database');
            alert('Order status updated successfully!');
            
            // Reload orders to reflect changes
            console.log('Reloading orders...');
            await loadOrders();
            console.log('Orders reloaded');
        } else {
            console.error('❌ Failed to update order status:', data.message);
            alert('Failed to update order status: ' + (data.message || 'Unknown error'));
            // Reload to reset dropdown
            await loadOrders();
        }
    } catch (error) {
        console.error('❌ Exception caught:', error);
        console.error('Error stack:', error.stack);
        alert('Failed to update order status. Please try again. Error: ' + error.message);
        // Reload to reset dropdown
        await loadOrders();
    }
    
    console.log('=== updateOrderStatus COMPLETE ===');
}

// Download order (placeholder)
function downloadOrder(orderId) {
    alert('Download order ' + orderId + ' (Feature coming soon)');
}

// Delete order (placeholder)
function deleteOrder(orderId) {
    if (confirm('Are you sure you want to delete this order?')) {
        alert('Delete order ' + orderId + ' (Feature coming soon)');
    }
}

// Setup event delegation for dropdowns (backup in case inline handlers don't work)
// NOTE: We're using event delegation as the PRIMARY method since inline handlers may not work reliably
let eventDelegationSetup = false;
function setupEventDelegation() {
    if (eventDelegationSetup) {
        console.log('Event delegation already setup');
        return;
    }
    
    // Use event delegation for status dropdowns
    document.addEventListener('change', function(e) {
        console.log('Event delegation triggered:', e.target.className, e.target);
        
        if (e.target.classList.contains('status-dropdown')) {
            const orderId = parseInt(e.target.getAttribute('data-order-id'));
            const newStatus = e.target.value.trim();
            console.log('Status dropdown changed via delegation:', { orderId, newStatus });
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
    console.log('Event delegation setup complete');
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

// Auto-refresh every 30 seconds
setInterval(loadOrders, 30000);

// Export functions for global access
window.updatePaymentStatus = updatePaymentStatus;
window.updateOrderStatus = updateOrderStatus;
window.downloadOrder = downloadOrder;
window.deleteOrder = deleteOrder;
window.loadOrders = loadOrders;


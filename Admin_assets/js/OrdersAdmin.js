// admin-orders.js - Order Management Functions

// NOTE: updateOrderStatus is now handled by load_orders.js
// This function is kept for backward compatibility but should not be used
// The new implementation uses: updateOrderStatus(orderId, newStatus)
function updateOrderStatus_OLD(selectElement) {
    const orderId = selectElement.closest('tr').cells[0].textContent;
    const newStatus = selectElement.value;
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Update last updated time
    const lastUpdatedCell = selectElement.closest('tr').cells[7];
    lastUpdatedCell.textContent = currentTime;
    
    console.log(`Order ${orderId} status updated to: ${newStatus}`);
    // Here you would typically send an AJAX request to update the database
    
    // Update statistics (disabled - handled by load_orders.js)
    // updateStatistics_OLD();
}

function viewOrder(orderId) {
    console.log(`Viewing order: ${orderId}`);
    alert(`Viewing details for ${orderId}`);
    // Here you would typically open a modal or navigate to order details page
}

function downloadOrder(orderId) {
    console.log(`Downloading order: ${orderId}`);
    alert(`Downloading invoice for ${orderId}`);
    // Here you would typically generate and download a PDF invoice
}

function deleteOrder(orderId) {
    if (confirm(`Are you sure you want to delete order ${orderId}?`)) {
        console.log(`Deleting order: ${orderId}`);
        // Here you would typically send an AJAX request to delete the order
        // Remove the row from the table
        const row = event.target.closest('tr');
        row.remove();
        // Statistics are now updated by load_orders.js
        // updateStatistics_OLD();
    }
}

// NOTE: updateStatistics is now handled by load_orders.js
// This function is kept for backward compatibility but should not be used
function updateStatistics_OLD() {
    const rows = document.querySelectorAll('.order-table tbody tr');
    let totalOrders = rows.length;
    let pendingPayments = 0;
    let inProgress = 0;
    let completed = 0;

    rows.forEach(row => {
        const statusSelect = row.querySelector('.status-dropdown');
        const paymentSelect = row.querySelector('.payment-dropdown');
        
        if (!statusSelect || !paymentSelect) return;
        
        const status = statusSelect.value;
        const payment = paymentSelect.value;

        if (payment === 'To Pay' || payment === 'Pending') {
            pendingPayments++;
        }

        if (status === 'Preparing') {
            inProgress++;
        } else if (status === 'Ready') {
            completed++;
        }
    });

    const totalOrdersEl = document.getElementById('totalOrders');
    const pendingPaymentsEl = document.getElementById('pendingPayments');
    const inProgressEl = document.getElementById('inProgress');
    const completedEl = document.getElementById('completed');
    
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    if (pendingPaymentsEl) pendingPaymentsEl.textContent = pendingPayments;
    if (inProgressEl) inProgressEl.textContent = inProgress;
    if (completedEl) completedEl.textContent = completed;
}

// Search functionality
function initializeSearch() {
    document.getElementById('searchOrders').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('.order-table tbody tr');

        rows.forEach(row => {
            const orderId = row.cells[0].textContent.toLowerCase();
            const customer = row.cells[1].textContent.toLowerCase();
            
            if (orderId.includes(searchTerm) || customer.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
    // Statistics are now updated by load_orders.js
    // updateStatistics_OLD(); // Disabled - handled by load_orders.js
});
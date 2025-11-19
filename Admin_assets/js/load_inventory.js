/**
 * Load Inventory for Admin
 * Dynamically loads and displays products with live stock updates
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

// Get status badge class
function getStatusBadgeClass(status) {
    const statusMap = {
        'In Stock': 'status-in-stock',
        'Low Stock': 'status-low-stock',
        'Out of Stock': 'status-out-of-stock'
    };
    return statusMap[status] || 'status-in-stock';
}

// Create product row HTML
function createProductRow(product) {
    const image = getProductImage(product.category, product.Product_Name);
    const statusClass = getStatusBadgeClass(product.stock_status);
    
    return `
        <tr class="product-row" data-product-id="${product.Product_ID}">
            <td>
                <div class="product-info">
                    <img src="${image}" alt="${product.Product_Name}" class="product-image" onerror="this.src='https://via.placeholder.com/45'">
                    <div class="product-details">
                        <strong class="product-name">${product.Product_Name}</strong>
                        <small class="product-lot">${product.category}</small>
                    </div>
                </div>
            </td>
            <td>
                <span class="category-badge">${product.category}</span>
            </td>
            <td>
                <div class="stock-info">
                    <span class="stock-level">${product.stock_level} units</span>
                    <small class="stock-min">Min: ${product.Minimum_Stock}</small>
                </div>
            </td>
            <td>
                <span class="status-badge ${statusClass}">${product.stock_status}</span>
            </td>
            <td class="product-price">${formatPrice(product.price)}</td>
            <td class="restock-date">${product.last_restock || 'N/A'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" data-action="view" data-product="${product.Product_ID}" title="View Product">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" data-action="edit" data-product="${product.Product_ID}" title="Edit Product">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Load inventory
async function loadInventory() {
    try {
        console.log('Loading inventory from database...');
        const response = await fetch('../api/get_products_admin.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Inventory data received:', data);
        
        if (data.success && data.products) {
            const tbody = document.querySelector('.inventory-table tbody');
            if (!tbody) {
                console.error('Inventory table body not found');
                return;
            }
            
            // Clear existing rows (remove any static rows)
            tbody.innerHTML = '';
            
            // Add product rows from database
            if (data.products.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center" style="padding: 40px;">
                            <p class="text-muted">No products found in inventory.</p>
                        </td>
                    </tr>
                `;
            } else {
                data.products.forEach(product => {
                    tbody.insertAdjacentHTML('beforeend', createProductRow(product));
                });
            }
            
            // Update statistics
            updateInventoryStatistics(data.products);
            
            console.log(`Successfully loaded ${data.products.length} products`);
        } else {
            console.error('Failed to load inventory:', data.message);
            const tbody = document.querySelector('.inventory-table tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger" style="padding: 40px;">
                            <p>Failed to load inventory: ${data.message || 'Unknown error'}</p>
                        </td>
                    </tr>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        const tbody = document.querySelector('.inventory-table tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger" style="padding: 40px;">
                        <p>Error loading inventory. Please refresh the page.</p>
                    </td>
                </tr>
            `;
        }
    }
}

// Update inventory statistics
function updateInventoryStatistics(products) {
    const totalProducts = products.length;
    const lowStockItems = products.filter(p => p.stock_status === 'Low Stock').length;
    const outOfStock = products.filter(p => p.stock_status === 'Out of Stock').length;
    
    // Update stat cards - find by parent stat-card structure
    const statCards = document.querySelectorAll('.stat-card');
    
    // First stat card: Total Products
    if (statCards[0]) {
        const totalEl = statCards[0].querySelector('.stat-number');
        if (totalEl) totalEl.textContent = totalProducts;
    }
    
    // Second stat card: Low Stock Items
    if (statCards[1]) {
        const lowStockEl = statCards[1].querySelector('.stat-number');
        if (lowStockEl) lowStockEl.textContent = lowStockItems;
    }
    
    // Third stat card: Out of Stock
    if (statCards[2]) {
        const outOfStockEl = statCards[2].querySelector('.stat-number');
        if (outOfStockEl) outOfStockEl.textContent = outOfStock;
    }
    
    console.log('Statistics updated:', { totalProducts, lowStockItems, outOfStock });
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadInventory);
} else {
    loadInventory();
}

// Auto-refresh every 10 seconds for live updates
setInterval(loadInventory, 10000);

// Export function for global access
window.loadInventory = loadInventory;


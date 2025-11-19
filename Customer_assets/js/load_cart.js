/**
 * Load Cart Items
 * Dynamically loads and displays cart items from localStorage
 */

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

// Create cart item HTML
function createCartItemHTML(item, productDetails = null) {
    const productName = productDetails ? productDetails.product_name : item.product_name || `Product ${item.product_id}`;
    const description = productDetails ? (productDetails.description || '').substring(0, 100) + '...' : 'Product description';
    const category = productDetails ? productDetails.category : item.category || '';
    const stockStatus = productDetails ? productDetails.stock_status : 'In Stock';
    const stockLevel = productDetails ? productDetails.stock_level : 999;
    const image = item.image || getProductImage(category, productName);
    
    const stockIcon = stockStatus === 'In Stock' 
        ? '<i class="fas fa-check-circle text-success"></i>' 
        : stockStatus === 'Low Stock'
        ? '<i class="fas fa-exclamation-triangle text-warning"></i>'
        : '<i class="fas fa-times-circle text-danger"></i>';
    
    const stockText = stockStatus === 'In Stock' 
        ? 'In Stock' 
        : stockStatus === 'Low Stock'
        ? `Low Stock (${stockLevel} available)`
        : 'Out of Stock';
    
    const maxQuantity = Math.min(stockLevel, 9999);
    const itemTotal = item.price * item.quantity;
    
    return `
        <div class="cart-item" data-product-id="${item.product_id}" data-price="${item.price}">
            <div class="item-image">
                <img src="${image}" alt="${productName}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px;">
            </div>
            <div class="item-details">
                <h4 class="item-name">${productName}</h4>
                <p class="item-description">${description}</p>
                <div class="item-specs">
                    <span class="spec">${category}</span>
                </div>
                <div class="item-price">${formatPrice(item.price)} <span class="price-unit">per unit</span></div>
                <div class="item-stock">
                    ${stockIcon}
                    <span>${stockText}</span>
                </div>
            </div>
            <div class="item-controls">
                <div class="quantity-controls">
                    <label>Quantity:</label>
                    <div class="quantity-selector">
                        <button class="btn-quantity" onclick="updateCartItemQuantity(${item.product_id}, -1)">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${maxQuantity}" onchange="updateCartItemQuantity(${item.product_id}, parseInt(this.value))" oninput="this.value = Math.max(1, Math.min(${maxQuantity}, parseInt(this.value) || 1))">
                        <button class="btn-quantity" onclick="updateCartItemQuantity(${item.product_id}, 1)">+</button>
                    </div>
                </div>
                <div class="item-total">
                    <span class="total-label">Total:</span>
                    <span class="total-amount">${formatPrice(itemTotal)}</span>
                </div>
                <button class="btn btn-remove" onclick="removeCartItem(${item.product_id})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `;
}

// Load and display cart items
async function loadCartItems() {
    const cart = window.CartManager ? window.CartManager.getCart() : [];
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    
    if (!cartItemsContainer) {
        console.error('Cart container not found');
        return;
    }
    
    if (cart.length === 0) {
        // Show empty cart
        cartItemsContainer.innerHTML = `
            <div class="empty-cart" id="emptyCart">
                <div class="empty-cart-icon">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <h3>Your cart is empty</h3>
                <p>Add some materials to get started with your order</p>
                <button class="btn btn-custom" onclick="continueShopping()">
                    <i class="fas fa-cubes"></i> Browse Materials
                </button>
            </div>
        `;
        updateCartSummary([]);
        
        // Update cart header
        const cartHeader = document.querySelector('.cart-header h3');
        if (cartHeader) {
            cartHeader.textContent = 'Cart Items (0)';
        }
        return;
    }
    
    // Clear existing items
    cartItemsContainer.innerHTML = '';
    
    // Load product details and create cart items
    let cartHTML = '';
    
    for (const item of cart) {
        const productDetails = await getProductDetails(item.product_id);
        cartHTML += createCartItemHTML(item, productDetails);
    }
    
    cartItemsContainer.innerHTML = cartHTML;
    
    // Update cart header
    const cartHeader = document.querySelector('.cart-header h3');
    if (cartHeader) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartHeader.textContent = `Cart Items (${totalItems})`;
    }
    
    // Update summary
    updateCartSummary(cart);
}

// Update cart item quantity
function updateCartItemQuantity(productId, change) {
    const cart = window.CartManager.getCart();
    const item = cart.find(i => i.product_id === productId);
    
    if (!item) return;
    
    let newQuantity;
    if (typeof change === 'number') {
        // Change is a delta (+1 or -1)
        newQuantity = item.quantity + change;
    } else {
        // Change is the new quantity value (from input)
        newQuantity = parseInt(change) || 1;
    }
    
    // Get max from input if available
    const quantityInput = document.querySelector(`.cart-item[data-product-id="${productId}"] .quantity-input`);
    if (quantityInput) {
        const max = parseInt(quantityInput.getAttribute('max')) || 9999;
        if (newQuantity > max) newQuantity = max;
    }
    
    if (newQuantity < 1) {
        removeCartItem(productId);
    } else {
        window.CartManager.updateCartQuantity(productId, newQuantity);
        loadCartItems(); // Reload to update display
    }
}

// Remove cart item
function removeCartItem(productId) {
    if (confirm('Remove this item from cart?')) {
        window.CartManager.removeFromCart(productId);
        loadCartItems(); // Reload to update display
    }
}

// Update cart summary
function updateCartSummary(cart) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const grandTotal = subtotal; // No tax
    
    const subtotalEl = document.getElementById('subtotal');
    const grandTotalEl = document.getElementById('grandTotal');
    
    if (subtotalEl) {
        subtotalEl.textContent = formatPrice(subtotal);
    }
    
    if (grandTotalEl) {
        grandTotalEl.textContent = formatPrice(grandTotal);
    }
}

// Clear all cart items
function clearCart() {
    if (confirm('Are you sure you want to remove all items from your cart?')) {
        window.CartManager.clearCart();
        loadCartItems();
    }
}

// Continue shopping
function continueShopping() {
    window.location.href = 'MainPage.html';
}

// Initialize cart on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Handle add to cart from URL first
        if (window.CartManager) {
            window.CartManager.handleAddToCartFromURL();
        }
        loadCartItems();
    });
} else {
    if (window.CartManager) {
        window.CartManager.handleAddToCartFromURL();
    }
    loadCartItems();
}

// Export functions for global access
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeCartItem = removeCartItem;
window.clearCart = clearCart;
window.continueShopping = continueShopping;
window.loadCartItems = loadCartItems;


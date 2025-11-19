/**
 * Load Checkout Data
 * Loads cart items and customer details into the checkout page
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

// Load customer details
async function loadCustomerDetails() {
    try {
        const response = await fetch('../api/get_profile.php', {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.user) {
            const user = data.user;
            const customerName = user.full_name || (user.first_name + ' ' + user.last_name).trim() || 'Customer';
            const customerAddress = user.address || 'No address provided';
            const customerPhone = user.phone_number || 'No phone number';
            
            // Update delivery information
            const nameElement = document.querySelector('.customer-name');
            const addressElement = document.querySelector('.customer-address');
            const phoneElement = document.querySelector('.customer-phone');
            
            if (nameElement) {
                nameElement.textContent = customerName;
            }
            if (addressElement) {
                addressElement.textContent = customerAddress;
            }
            if (phoneElement) {
                phoneElement.innerHTML = `<i class="fas fa-phone mr-2"></i>${customerPhone}`;
            }
        } else {
            // Fallback to sessionStorage
            const userName = sessionStorage.getItem('user_name');
            const userEmail = sessionStorage.getItem('user_email');
            
            const nameElement = document.querySelector('.customer-name');
            if (nameElement && userName) {
                nameElement.textContent = userName;
            }
        }
    } catch (error) {
        console.error('Error loading customer details:', error);
        // Fallback to sessionStorage
        const userName = sessionStorage.getItem('user_name');
        const userEmail = sessionStorage.getItem('user_email');
        
        const nameElement = document.querySelector('.customer-name');
        if (nameElement && userName) {
            nameElement.textContent = userName;
        }
    }
}

// Create order item row HTML
function createOrderItemRow(item, productDetails = null) {
    const productName = productDetails ? productDetails.product_name : item.product_name || `Product ${item.product_id}`;
    const productSpecs = productDetails ? 
        (productDetails.length && productDetails.width ? 
            `${productDetails.length}${productDetails.unit || ''} x ${productDetails.width}${productDetails.unit || ''}` : 
            productDetails.category || '') : 
        item.category || '';
    const image = item.image || getProductImage(item.category || '', productName);
    const price = formatPrice(item.price);
    const total = formatPrice(item.price * item.quantity);
    
    return `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${image}" alt="${productName}" class="mr-3" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
                    <div>
                        <h6 class="mb-0">${productName}</h6>
                        <small class="text-muted">${productSpecs}</small>
                    </div>
                </div>
            </td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-center">${price}</td>
            <td class="text-center font-weight-bold">${total}</td>
        </tr>
    `;
}

// Load cart items into checkout
async function loadCheckoutItems() {
    const cart = window.CartManager ? window.CartManager.getCart() : [];
    const tbody = document.querySelector('.table tbody');
    
    if (!tbody) {
        console.error('Order items table body not found');
        return;
    }
    
    if (cart.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    <p class="text-muted">Your cart is empty. <a href="Cart.html">Go to cart</a></p>
                </td>
            </tr>
        `;
        updateOrderSummary([]);
        return;
    }
    
    // Clear existing items
    tbody.innerHTML = '';
    
    // Load product details and create rows
    let subtotal = 0;
    
    for (const item of cart) {
        const productDetails = await getProductDetails(item.product_id);
        tbody.insertAdjacentHTML('beforeend', createOrderItemRow(item, productDetails));
        subtotal += item.price * item.quantity;
    }
    
    // Update order summary
    updateOrderSummary(cart, subtotal);
}

// Update order summary
function updateOrderSummary(cart, subtotal = 0) {
    if (cart.length === 0) {
        document.querySelector('.summary-value').textContent = formatPrice(0);
        const totalValue = document.querySelector('.total-row .summary-value');
        if (totalValue) {
            totalValue.textContent = formatPrice(0);
        }
        return;
    }
    
    // Calculate totals - Delivery is always free
    const deliveryFee = 0; // Always free
    const total = subtotal + deliveryFee;
    
    // Update subtotal
    const subtotalElement = document.querySelector('.summary-row:first-of-type .summary-value');
    if (subtotalElement) {
        subtotalElement.textContent = formatPrice(subtotal);
    }
    
    // Update total
    const totalElement = document.querySelector('.total-row .summary-value');
    if (totalElement) {
        totalElement.textContent = formatPrice(total);
    }
    
    // Update QR code amount if popup exists
    const qrAmount = document.querySelector('.qr-amount');
    if (qrAmount) {
        qrAmount.textContent = formatPrice(total);
    }
}

// Setup edit button
function setupEditButton() {
    const editButton = document.getElementById('editProfileBtn') || document.querySelector('.btn-outline-danger.btn-sm');
    if (editButton) {
        editButton.addEventListener('click', function(e) {
            e.preventDefault();
            // Get user_id from URL or sessionStorage
            const urlParams = new URLSearchParams(window.location.search);
            let userId = urlParams.get('user_id');
            
            if (!userId) {
                userId = sessionStorage.getItem('user_id');
            }
            
            // Redirect to profile page with user_id
            // Use UrlAuthHelper if available to preserve user_id
            if (window.UrlAuthHelper && window.UrlAuthHelper.addUserIdToUrl) {
                window.location.href = window.UrlAuthHelper.addUserIdToUrl('CustomerProfile.html');
            } else if (userId) {
                window.location.href = `CustomerProfile.html?user_id=${userId}`;
            } else {
                window.location.href = 'CustomerProfile.html';
            }
        });
    }
}

// Initialize checkout page
async function initCheckout() {
    // Load customer details
    await loadCustomerDetails();
    
    // Load cart items
    await loadCheckoutItems();
    
    // Setup edit button
    setupEditButton();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Wait for CartManager to be available
        if (window.CartManager) {
            initCheckout();
        } else {
            // Wait a bit for CartManager to load
            setTimeout(initCheckout, 100);
        }
    });
} else {
    if (window.CartManager) {
        initCheckout();
    } else {
        setTimeout(initCheckout, 100);
    }
}


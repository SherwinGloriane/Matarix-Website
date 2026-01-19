/**
 * Load Cart Items
 * Dynamically loads and displays cart items from localStorage
 */

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

// Format price
function formatPrice(price) {
    return '₱' + parseFloat(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Convert weight to kilograms
function convertToKg(weight, unit) {
    if (!weight || weight === 0) return 0;
    
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue)) return 0;
    
    switch (unit?.toLowerCase()) {
        case 'kg':
            return weightValue;
        case 'g':
            return weightValue / 1000; // 1 kg = 1000 g
        case 'lb':
            return weightValue * 0.453592; // 1 lb = 0.453592 kg
        case 'oz':
            return weightValue * 0.0283495; // 1 oz = 0.0283495 kg
        case 'ton':
            return weightValue * 1000; // 1 ton = 1000 kg
        default:
            // If unit is not specified or unknown, assume it's already in kg
            return weightValue;
    }
}

// Format weight
function formatWeight(weightInKg) {
    return parseFloat(weightInKg).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' kg';
}

// Get product image (use database image_path or fallback to default)
function getProductImage(imagePath) {
    if (imagePath && imagePath.trim() !== '') {
        // If image_path is relative, prepend ../
        if (imagePath.startsWith('uploads/')) {
            return '../' + imagePath;
        }
        // If it's already a full path, use as is
        return imagePath;
    }
    // Fallback to default image
    return '../Customer_assets/images/PreviewMain.png';
}

// Create cart item HTML
function createCartItemHTML(item, productDetails = null) {
    const productName = productDetails ? productDetails.product_name : item.product_name || `Product ${item.product_id}`;
    const description = productDetails ? (productDetails.description || '').substring(0, 100) + '...' : 'Product description';
    const category = productDetails ? productDetails.category : item.category || '';
    const stockStatus = productDetails ? productDetails.stock_status : 'In Stock';
    const stockLevel = productDetails ? productDetails.stock_level : 999;
    // Use image_path from productDetails, fallback to item.image, then default
    const imagePath = productDetails?.image_path || item.image || null;
    const image = getProductImage(imagePath);
    
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
    
    // Build variation display string
    let variationText = '';
    let variationKey = '';
    if (item.variations && Object.keys(item.variations).length > 0) {
        const variationParts = Object.entries(item.variations).map(([name, data]) => {
            return `${name}: ${data.variation_value || data}`;
        });
        variationText = `<div class="item-variation" style="font-size: 0.9rem; color: #666; margin-top: 5px; font-weight: 500;">
            <i class="fas fa-tag" style="margin-right: 5px;"></i>${variationParts.join(', ')}
        </div>`;
        variationKey = JSON.stringify(item.variations);
    }
    
    // Create unique identifier for cart items (product_id + variations)
    const itemKey = variationKey ? `${item.product_id}_${btoa(variationKey).replace(/[^a-zA-Z0-9]/g, '')}` : item.product_id;
    
    return `
        <div class="cart-item" data-product-id="${item.product_id}" data-item-key="${itemKey}" data-price="${item.price}">
            <div class="item-checkbox">
                <input type="checkbox" 
                       class="cart-item-checkbox" 
                       data-item-key="${itemKey}"
                       data-product-id="${item.product_id}"
                       data-quantity="${item.quantity}"
                       data-price="${item.price}"
                       checked
                       onchange="handleItemCheckboxChange(this)">
            </div>
            <div class="item-image">
                <img src="${image}" alt="${productName}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px;">
            </div>
            <div class="item-details">
                <h4 class="item-name">${productName}</h4>
                <p class="item-description">${description}</p>
                <div class="item-specs">
                    <span class="spec">${category}</span>
                </div>
                ${variationText}
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
                        <button class="btn-quantity" onclick="updateCartItemQuantity('${itemKey}', -1)">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${maxQuantity}" onchange="updateCartItemQuantity('${itemKey}', this.value)" onblur="this.value = Math.max(1, Math.min(${maxQuantity}, parseInt(this.value) || 1))">
                        <button class="btn-quantity" onclick="updateCartItemQuantity('${itemKey}', 1)">+</button>
                    </div>
                </div>
                <div class="item-total">
                    <span class="total-label">Total:</span>
                    <span class="total-amount">${formatPrice(itemTotal)}</span>
                </div>
                <button class="btn btn-remove" onclick="removeCartItem('${itemKey}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `;
}

// Load and display cart items
// Refresh minimum order settings when page loads or becomes visible
async function refreshMinOrderSettingsOnLoad() {
    // Clear cache and fetch fresh settings when page loads
    clearMinOrderSettingsCache();
    const settings = await getMinOrderSettings(true);
    console.log('Settings refreshed on page load:', settings);
    
    // After refreshing settings, update the cart summary to reflect new minimum requirements
    const cart = window.CartManager ? window.CartManager.getCart() : [];
    if (cart.length > 0) {
        // Force update cart summary with fresh settings
        // Get product details map first
        const productDetailsMap = new Map();
        for (const item of cart) {
            try {
                const productDetails = await getProductDetails(item.product_id);
                if (productDetails) {
                    productDetailsMap.set(item.product_id, productDetails);
                }
            } catch (error) {
                console.error(`Error fetching product details for ${item.product_id}:`, error);
            }
        }
        await updateCartSummary(cart, productDetailsMap);
    }
}

// Listen for page visibility changes to refresh settings when user returns to tab
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Page became visible, refresh settings
        refreshMinOrderSettingsOnLoad();
    }
});

// Periodically refresh minimum order settings while page is active
// This ensures cart updates when admin changes settings
let settingsRefreshInterval = null;
function startPeriodicSettingsRefresh() {
    // Clear any existing interval
    if (settingsRefreshInterval) {
        clearInterval(settingsRefreshInterval);
    }
    
    // Refresh settings every 10 seconds when page is visible
    settingsRefreshInterval = setInterval(async () => {
        if (!document.hidden) {
            // Clear cache and fetch fresh settings
            clearMinOrderSettingsCache();
            const settings = await getMinOrderSettings(true);
            console.log('Periodic settings refresh:', settings);
            
            // Update cart summary if cart has items
            const cart = window.CartManager ? window.CartManager.getCart() : [];
            if (cart.length > 0) {
                // Get product details map
                const productDetailsMap = new Map();
                for (const item of cart) {
                    try {
                        const productDetails = await getProductDetails(item.product_id);
                        if (productDetails) {
                            productDetailsMap.set(item.product_id, productDetails);
                        }
                    } catch (error) {
                        console.error(`Error fetching product details for ${item.product_id}:`, error);
                    }
                }
                await updateCartSummary(cart, productDetailsMap);
            }
        }
    }, 10000); // Refresh every 10 seconds
}

// Stop periodic refresh when page is hidden
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        if (settingsRefreshInterval) {
            clearInterval(settingsRefreshInterval);
            settingsRefreshInterval = null;
        }
    } else {
        startPeriodicSettingsRefresh();
    }
});

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
        updateCartSummary([]).catch(error => {
            console.error('Error updating cart summary:', error);
        });
        
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
    const productDetailsMap = new Map(); // Store product details for weight calculation
    
    for (const item of cart) {
        const productDetails = await getProductDetails(item.product_id);
        if (productDetails) {
            productDetailsMap.set(item.product_id, productDetails);
        }
        cartHTML += createCartItemHTML(item, productDetails);
    }
    
    cartItemsContainer.innerHTML = cartHTML;
    
    // Update cart header
    const cartHeader = document.querySelector('.cart-header h3');
    const cartItemCountEl = document.getElementById('cartItemCount');
    if (cartHeader || cartItemCountEl) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartItemCountEl) {
            cartItemCountEl.textContent = totalItems;
        } else if (cartHeader) {
            cartHeader.textContent = `Cart Items (${totalItems})`;
        }
    }
    
    // Initialize checkboxes after rendering
    initializeCartCheckboxes();
    
    // Update summary with product details for weight calculation (will be updated by checkbox handler)
    updateCartSummaryForCheckedItems().catch(error => {
        console.error('Error updating cart summary:', error);
    });
}

// Update cart item quantity
function updateCartItemQuantity(itemKey, change) {
    const cart = window.CartManager.getCart();
    
    // Ensure itemKey is a string
    itemKey = String(itemKey);
    
    // Find item by matching product_id and variations
    let item = null;
    let itemIndex = -1;
    
    if (itemKey.includes('_')) {
        // Item has variations - extract product_id and variation key
        const parts = itemKey.split('_');
        const productId = parseInt(parts[0]);
        const variationKeyB64 = parts.slice(1).join('_');
        
        // Find item with matching product_id and variations
        cart.forEach((cartItem, index) => {
            if (cartItem.product_id === productId) {
                const cartItemVariationKey = cartItem.variations && Object.keys(cartItem.variations).length > 0
                    ? btoa(JSON.stringify(cartItem.variations)).replace(/[^a-zA-Z0-9]/g, '')
                    : '';
                if (cartItemVariationKey === variationKeyB64) {
                    item = cartItem;
                    itemIndex = index;
                }
            }
        });
    } else {
        // Item without variations - find by product_id only (no variations)
        const productId = parseInt(itemKey);
        cart.forEach((cartItem, index) => {
            if (cartItem.product_id === productId && (!cartItem.variations || Object.keys(cartItem.variations).length === 0)) {
                item = cartItem;
                itemIndex = index;
            }
        });
    }
    
    if (!item) return;
    
    let newQuantity;
    
    // Get the input element to read the current value
    const quantityInput = document.querySelector(`.cart-item[data-item-key="${itemKey}"] .quantity-input`);
    
    if (typeof change === 'number' && (change === 1 || change === -1)) {
        // Change is a delta (+1 or -1) from button clicks
        newQuantity = item.quantity + change;
    } else {
        // Change is the new quantity value (from input field)
        // If change is a string/number from input, parse it
        // Otherwise, read directly from the input field
        if (quantityInput) {
            newQuantity = parseInt(quantityInput.value) || 1;
        } else {
            newQuantity = parseInt(change) || 1;
        }
    }
    
    // Validate and constrain the quantity
    if (quantityInput) {
        const min = parseInt(quantityInput.getAttribute('min')) || 1;
        const max = parseInt(quantityInput.getAttribute('max')) || 9999;
        
        // Ensure quantity is within bounds
        if (newQuantity < min) newQuantity = min;
        if (newQuantity > max) newQuantity = max;
        
        // Update the input field to reflect the validated value
        quantityInput.value = newQuantity;
    }
    
    if (newQuantity < 1) {
        removeCartItem(itemKey);
    } else {
        // Only update if the quantity actually changed
        if (item.quantity !== newQuantity) {
            // Update the specific item in cart
            const cart = window.CartManager.getCart();
            cart[itemIndex].quantity = newQuantity;
            window.CartManager.saveCart(cart);
            loadCartItems(); // Reload to update display
        } else {
            // Even if quantity didn't change, update summary if checkbox is checked
            const checkbox = document.querySelector(`.cart-item-checkbox[data-item-key="${itemKey}"]`);
            if (checkbox && checkbox.checked) {
                updateCartSummaryForCheckedItems();
            }
        }
    }
}

// Remove cart item
function removeCartItem(itemKey) {
    if (confirm('Remove this item from cart?')) {
        const cart = window.CartManager.getCart();
        
        // Ensure itemKey is a string
        itemKey = String(itemKey);
        
        // Find and remove the specific item
        let itemIndex = -1;
        
        if (itemKey.includes('_')) {
            // Item has variations
            const parts = itemKey.split('_');
            const productId = parseInt(parts[0]);
            const variationKeyB64 = parts.slice(1).join('_');
            
            cart.forEach((cartItem, index) => {
                if (cartItem.product_id === productId) {
                    const cartItemVariationKey = cartItem.variations && Object.keys(cartItem.variations).length > 0
                        ? btoa(JSON.stringify(cartItem.variations)).replace(/[^a-zA-Z0-9]/g, '')
                        : '';
                    if (cartItemVariationKey === variationKeyB64) {
                        itemIndex = index;
                    }
                }
            });
        } else {
            // Item without variations
            const productId = parseInt(itemKey);
            cart.forEach((cartItem, index) => {
                if (cartItem.product_id === productId && (!cartItem.variations || Object.keys(cartItem.variations).length === 0)) {
                    itemIndex = index;
                }
            });
        }
        
        if (itemIndex > -1) {
            cart.splice(itemIndex, 1);
            window.CartManager.saveCart(cart);
            loadCartItems(); // Reload to update display
        }
    }
}

// Get minimum order settings
let minOrderSettings = null;
let minOrderSettingsCacheTime = null;
const MIN_ORDER_SETTINGS_CACHE_DURATION = 5000; // Cache for 5 seconds (reduced for faster updates)

async function getMinOrderSettings(forceRefresh = false) {
    // Check if cache is still valid (not expired and not forcing refresh)
    const now = Date.now();
    if (!forceRefresh && minOrderSettings && minOrderSettingsCacheTime) {
        const cacheAge = now - minOrderSettingsCacheTime;
        if (cacheAge < MIN_ORDER_SETTINGS_CACHE_DURATION) {
            return minOrderSettings;
        }
    }
    
    try {
        // Add cache-busting parameter to ensure fresh data
        const cacheBuster = forceRefresh ? Date.now() : Math.floor(now / MIN_ORDER_SETTINGS_CACHE_DURATION) * MIN_ORDER_SETTINGS_CACHE_DURATION;
        const response = await fetch(`../api/get_order_settings.php?t=${cacheBuster}`, {
            credentials: 'include',
            cache: 'no-cache' // Prevent browser caching
        });
        const data = await response.json();
        if (data.success) {
            minOrderSettings = data.settings;
            minOrderSettingsCacheTime = now;
            console.log('Minimum order settings refreshed:', minOrderSettings);
            console.log('Calculated min_weight_kg:', minOrderSettings.min_order_weight_kg, 
                       'from percentage:', minOrderSettings.min_order_weight_percentage,
                       'auto_calculate:', minOrderSettings.auto_calculate_from_fleet);
            return minOrderSettings;
        } else {
            console.error('Failed to get order settings:', data.message);
        }
    } catch (error) {
        console.error('Error fetching minimum order settings:', error);
    }
    
    // Return cached value if available, even if expired, rather than default
    if (minOrderSettings) {
        return minOrderSettings;
    }
    
    // Return default if API fails and no cache exists
    return {
        min_order_weight_kg: 200,
        min_order_value: 0,
        allow_below_minimum_with_fee: false,
        allow_heavy_single_items: true
    };
}

// Function to clear minimum order settings cache (call this when settings might have changed)
function clearMinOrderSettingsCache() {
    minOrderSettings = null;
    minOrderSettingsCacheTime = null;
    console.log('Minimum order settings cache cleared');
}

// Check if order meets minimum requirements
async function checkMinOrderRequirements(cart, productDetailsMap, totalWeightKg, totalAmount) {
    // Always check cache age - if expired, fetch fresh settings
    const settings = await getMinOrderSettings(false); // Will auto-refresh if cache expired
    const minWeight = settings.min_order_weight_kg || 200;
    
    // Debug logging
    console.log('Order requirements check:', {
        minWeight: minWeight,
        percentage: settings.min_order_weight_percentage,
        autoCalculate: settings.auto_calculate_from_fleet,
        currentWeight: totalWeightKg,
        currentValue: totalAmount
    });
    const minValue = settings.min_order_value || 0;
    const allowHeavySingleItems = settings.allow_heavy_single_items !== false;
    
    // Check if single item exceeds minimum (if allowed)
    if (allowHeavySingleItems && cart.length === 1) {
        const item = cart[0];
        const productDetails = productDetailsMap.get(item.product_id);
        if (productDetails && productDetails.weight) {
            const itemWeightKg = convertToKg(productDetails.weight, productDetails.weight_unit) * item.quantity;
            if (itemWeightKg >= minWeight) {
                return { meetsMinimum: true, reason: 'heavy_single_item' };
            }
        }
    }
    
    // Check weight requirement
    const meetsWeight = totalWeightKg >= minWeight;
    
    // Check value requirement (only if minValue is set and greater than 0)
    const meetsValue = minValue > 0 && totalAmount >= minValue;
    
    // Order meets minimum if it meets weight OR value requirement
    // If minValue is 0, only weight requirement matters
    const meetsMinimum = meetsWeight || (minValue > 0 && meetsValue);
    
    return {
        meetsMinimum: meetsMinimum,
        meetsWeight: meetsWeight,
        meetsValue: meetsValue,
        currentWeight: totalWeightKg,
        minWeight: minWeight,
        minValue: minValue,
        neededWeight: Math.max(0, minWeight - totalWeightKg),
        neededValue: minValue > 0 ? Math.max(0, minValue - totalAmount) : 0
    };
}

// Update cart summary
async function updateCartSummary(cart, productDetailsMap = null) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const grandTotal = subtotal; // No tax
    
    // Calculate total weight
    let totalWeightKg = 0;
    
    // If cart is empty, set weight to 0
    if (cart.length === 0) {
        const subtotalEl = document.getElementById('subtotal');
        const grandTotalEl = document.getElementById('grandTotal');
        const totalWeightEl = document.getElementById('totalWeight');
        
        if (subtotalEl) subtotalEl.textContent = formatPrice(0);
        if (grandTotalEl) grandTotalEl.textContent = formatPrice(0);
        if (totalWeightEl) totalWeightEl.textContent = formatWeight(0);
        
        // Hide minimum order indicators
        const minOrderRow = document.getElementById('minOrderWeightRow');
        const minOrderProgressRow = document.getElementById('minOrderProgressRow');
        const minOrderWarning = document.getElementById('minOrderWarning');
        const checkoutBtn = document.getElementById('checkoutBtn');
        const checkoutDisabledBtn = document.getElementById('checkoutDisabledBtn');
        
        if (minOrderRow) minOrderRow.style.display = 'none';
        if (minOrderProgressRow) minOrderProgressRow.style.display = 'none';
        if (minOrderWarning) minOrderWarning.style.display = 'none';
        if (checkoutBtn) checkoutBtn.style.display = 'block';
        if (checkoutDisabledBtn) checkoutDisabledBtn.style.display = 'none';
        
        return;
    }
    
    // If productDetailsMap is not provided, fetch product details
    if (!productDetailsMap) {
        productDetailsMap = new Map();
        for (const item of cart) {
            try {
                const productDetails = await getProductDetails(item.product_id);
                if (productDetails) {
                    productDetailsMap.set(item.product_id, productDetails);
                }
            } catch (error) {
                console.error(`Error fetching product details for ${item.product_id}:`, error);
            }
        }
    }
    
    // Calculate total weight for all items
    for (const item of cart) {
        const productDetails = productDetailsMap.get(item.product_id);
        if (productDetails && productDetails.weight !== null && productDetails.weight !== undefined) {
            // Convert weight to kg
            const weightInKg = convertToKg(productDetails.weight, productDetails.weight_unit);
            // Multiply by quantity
            const itemTotalWeight = weightInKg * item.quantity;
            totalWeightKg += itemTotalWeight;
        }
    }
    
    const subtotalEl = document.getElementById('subtotal');
    const grandTotalEl = document.getElementById('grandTotal');
    const totalWeightEl = document.getElementById('totalWeight');
    
    if (subtotalEl) {
        subtotalEl.textContent = formatPrice(subtotal);
    }
    
    if (grandTotalEl) {
        grandTotalEl.textContent = formatPrice(grandTotal);
    }
    
    if (totalWeightEl) {
        totalWeightEl.textContent = formatWeight(totalWeightKg);
    }
    
    // Check minimum order requirements
    // Note: getMinOrderSettings() will use cache if valid, or fetch fresh if expired
    const minOrderCheck = await checkMinOrderRequirements(cart, productDetailsMap, totalWeightKg, subtotal);
    console.log('Minimum order check result:', minOrderCheck);
    updateMinOrderIndicator(minOrderCheck, totalWeightKg, subtotal);
}

// Refresh minimum order settings when cart is loaded or updated
// This ensures we get the latest settings from the server
async function refreshMinOrderSettings() {
    clearMinOrderSettingsCache();
    return await getMinOrderSettings(true);
}

// Update minimum order indicator
function updateMinOrderIndicator(minOrderCheck, currentWeight, currentValue) {
    const minOrderRow = document.getElementById('minOrderWeightRow');
    const minOrderWeightEl = document.getElementById('minOrderWeight');
    const minOrderProgressRow = document.getElementById('minOrderProgressRow');
    const minOrderProgressBar = document.getElementById('minOrderProgressBar');
    const minOrderProgressText = document.getElementById('minOrderProgressText');
    const minOrderWarning = document.getElementById('minOrderWarning');
    const minOrderWarningText = document.getElementById('minOrderWarningText');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutDisabledBtn = document.getElementById('checkoutDisabledBtn');
    
    if (!minOrderCheck || !minOrderCheck.minWeight || minOrderCheck.minWeight <= 0) {
        // Hide indicators if no minimum is set
        if (minOrderRow) minOrderRow.style.display = 'none';
        if (minOrderProgressRow) minOrderProgressRow.style.display = 'none';
        if (minOrderWarning) minOrderWarning.style.display = 'none';
        if (checkoutBtn) checkoutBtn.style.display = 'block';
        if (checkoutDisabledBtn) checkoutDisabledBtn.style.display = 'none';
        return;
    }
    
    // Always show minimum weight requirement (even if met)
    // This ensures users can see the current minimum requirement
    
    // Show minimum order row
    if (minOrderRow) {
        minOrderRow.style.display = 'flex';
        if (minOrderWeightEl) {
            minOrderWeightEl.textContent = formatWeight(minOrderCheck.minWeight);
        }
    }
    
    // Calculate progress percentage
    const progressPercent = Math.min(100, (currentWeight / minOrderCheck.minWeight) * 100);
    
    // Update progress bar
    if (minOrderProgressRow) {
        minOrderProgressRow.style.display = 'block';
        if (minOrderProgressBar) {
            minOrderProgressBar.style.width = progressPercent + '%';
            if (progressPercent >= 100) {
                minOrderProgressBar.style.backgroundColor = '#28a745';
            } else if (progressPercent >= 75) {
                minOrderProgressBar.style.backgroundColor = '#ffc107';
            } else {
                minOrderProgressBar.style.backgroundColor = '#dc3545';
            }
        }
        if (minOrderProgressText) {
            if (minOrderCheck.meetsMinimum) {
                minOrderProgressText.textContent = '✓ Minimum order requirement met!';
                minOrderProgressText.className = 'text-success';
            } else {
                const needed = minOrderCheck.neededWeight;
                minOrderProgressText.textContent = `Add ${formatWeight(needed)} more to proceed`;
                minOrderProgressText.className = 'text-danger';
            }
        }
    }
    
    // Show/hide warning
    if (minOrderWarning) {
        if (!minOrderCheck.meetsMinimum) {
            minOrderWarning.style.display = 'flex';
            let warningMsg = `Minimum order weight is ${formatWeight(minOrderCheck.minWeight)}. `;
            if (minOrderCheck.minValue > 0) {
                warningMsg += `Or minimum order value is ₱${minOrderCheck.minValue.toLocaleString('en-US', {minimumFractionDigits: 2})}. `;
            }
            warningMsg += `Add ${formatWeight(minOrderCheck.neededWeight)} more to proceed.`;
            if (minOrderWarningText) {
                minOrderWarningText.textContent = warningMsg;
            }
        } else {
            minOrderWarning.style.display = 'none';
        }
    }
    
    // Enable/disable checkout button
    if (checkoutBtn && checkoutDisabledBtn) {
        if (minOrderCheck.meetsMinimum) {
            checkoutBtn.style.display = 'block';
            checkoutDisabledBtn.style.display = 'none';
            // Remove any onclick handler and ensure href works
            checkoutBtn.onclick = null;
            checkoutBtn.href = 'Checkout.html';
        } else {
            // Hide the enabled button and show disabled button
            checkoutBtn.style.display = 'none';
            checkoutDisabledBtn.style.display = 'block';
            
            // Also prevent the enabled button from navigating if somehow it's still visible
            checkoutBtn.onclick = async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Recalculate weight to ensure we have the latest data
                const cart = window.CartManager ? window.CartManager.getCart() : [];
                if (cart.length === 0) {
                    alert('Your cart is empty!');
                    return false;
                }
                
                // Recalculate current weight and amount using the same logic as updateCartSummary
                let recalculatedWeight = 0;
                let recalculatedAmount = 0;
                const productDetailsMap = new Map();
                
                for (const item of cart) {
                    recalculatedAmount += item.price * item.quantity;
                    try {
                        const productDetails = await getProductDetails(item.product_id);
                        if (productDetails) {
                            productDetailsMap.set(item.product_id, productDetails);
                            if (productDetails.weight !== null && productDetails.weight !== undefined) {
                                const weightKg = convertToKg(productDetails.weight, productDetails.weight_unit);
                                recalculatedWeight += weightKg * item.quantity;
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching product ${item.product_id}:`, error);
                    }
                }
                
                // Check if order meets minimum requirements
                const minOrderCheck = await checkMinOrderRequirements(cart, productDetailsMap, recalculatedWeight, recalculatedAmount);
                
                // Only show alert if requirements are NOT met
                if (!minOrderCheck.meetsMinimum) {
                    let errorMsg = `Minimum order requirement not met. `;
                    if (!minOrderCheck.meetsWeight && minOrderCheck.minWeight > 0) {
                        errorMsg += `Minimum weight is ${formatWeight(minOrderCheck.minWeight)}. Your cart is ${formatWeight(recalculatedWeight)}. `;
                        errorMsg += `Add ${formatWeight(minOrderCheck.neededWeight)} more to proceed.`;
                    }
                    if (!minOrderCheck.meetsValue && minOrderCheck.minValue > 0) {
                        const neededValue = minOrderCheck.neededValue.toLocaleString('en-US', {minimumFractionDigits: 2});
                        errorMsg += ` Or minimum order value is ₱${minOrderCheck.minValue.toLocaleString('en-US', {minimumFractionDigits: 2})}. `;
                        errorMsg += `Add ₱${neededValue} more to proceed.`;
                    }
                    alert(errorMsg);
                    return false;
                }
                
                // Requirements are met - allow navigation
                window.location.href = 'Checkout.html';
                return true;
            };
            // Remove href to prevent navigation
            checkoutBtn.href = '#';
        }
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
// Initialize: Refresh minimum order settings on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async function() {
        // Handle add to cart from URL first
        if (window.CartManager) {
            window.CartManager.handleAddToCartFromURL();
        }
        // Refresh minimum order settings when page loads (this will also update cart summary)
        await refreshMinOrderSettingsOnLoad();
        loadCartItems();
        // Start periodic refresh of settings
        startPeriodicSettingsRefresh();
    });
} else {
    // Handle add to cart from URL first
    if (window.CartManager) {
        window.CartManager.handleAddToCartFromURL();
    }
    // Refresh minimum order settings when page is already loaded (this will also update cart summary)
    refreshMinOrderSettingsOnLoad();
    loadCartItems();
    // Start periodic refresh of settings
    startPeriodicSettingsRefresh();
}

// Get all checked cart items
function getCheckedCartItems() {
    const checkboxes = document.querySelectorAll('.cart-item-checkbox:checked');
    const cart = window.CartManager ? window.CartManager.getCart() : [];
    const checkedItems = [];
    
    checkboxes.forEach(checkbox => {
        const itemKey = checkbox.getAttribute('data-item-key');
        const cartItem = findCartItemByKey(cart, itemKey);
        if (cartItem) {
            checkedItems.push({
                item_key: itemKey,
                product_id: cartItem.product_id,
                quantity: cartItem.quantity,
                price: cartItem.price,
                variations: cartItem.variations || null
            });
        }
    });
    
    return checkedItems;
}

// Find cart item by item key
function findCartItemByKey(cart, itemKey) {
    const itemKeyStr = String(itemKey);
    
    if (itemKeyStr.includes('_')) {
        const parts = itemKeyStr.split('_');
        const productId = parseInt(parts[0]);
        const variationKeyB64 = parts.slice(1).join('_');
        
        return cart.find(item => {
            if (item.product_id !== productId) return false;
            const itemVariationKey = item.variations && Object.keys(item.variations).length > 0
                ? btoa(JSON.stringify(item.variations)).replace(/[^a-zA-Z0-9]/g, '')
                : '';
            return itemVariationKey === variationKeyB64;
        });
    } else {
        const productId = parseInt(itemKeyStr);
        return cart.find(item => 
            item.product_id === productId && 
            (!item.variations || Object.keys(item.variations).length === 0)
        );
    }
}

// Handle individual item checkbox change
function handleItemCheckboxChange(checkbox) {
    updateSelectAllCheckbox();
    updateDeleteSelectedButton();
    updateCartSummaryForCheckedItems();
}

// Update "Select All" checkbox state
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (!selectAllCheckbox) return;
    
    const allCheckboxes = document.querySelectorAll('.cart-item-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.cart-item-checkbox:checked');
    
    if (allCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        return;
    }
    
    if (checkedCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCheckboxes.length === allCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

// Handle "Select All" checkbox change
function handleSelectAllChange(checkbox) {
    const isChecked = checkbox.checked;
    const itemCheckboxes = document.querySelectorAll('.cart-item-checkbox');
    
    itemCheckboxes.forEach(itemCheckbox => {
        itemCheckbox.checked = isChecked;
    });
    
    updateDeleteSelectedButton();
    updateCartSummaryForCheckedItems();
}

// Update "Delete Selected" button visibility
function updateDeleteSelectedButton() {
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const checkedCount = document.querySelectorAll('.cart-item-checkbox:checked').length;
    
    if (deleteBtn) {
        if (checkedCount > 0) {
            deleteBtn.style.display = 'inline-block';
            deleteBtn.innerHTML = `<i class="fas fa-trash"></i> Delete Selected (${checkedCount})`;
        } else {
            deleteBtn.style.display = 'none';
        }
    }
}

// Delete selected items
function deleteSelectedItems() {
    const checkedItems = getCheckedCartItems();
    
    if (checkedItems.length === 0) {
        alert('Please select items to delete.');
        return;
    }
    
    const confirmed = confirm(`Are you sure you want to remove ${checkedItems.length} item(s) from your cart?`);
    if (!confirmed) return;
    
    const cart = window.CartManager ? window.CartManager.getCart() : [];
    const itemKeysToDelete = checkedItems.map(item => item.item_key);
    
    // Remove items from cart
    const updatedCart = cart.filter(item => {
        const itemKey = item.variations && Object.keys(item.variations).length > 0
            ? `${item.product_id}_${btoa(JSON.stringify(item.variations)).replace(/[^a-zA-Z0-9]/g, '')}`
            : String(item.product_id);
        return !itemKeysToDelete.includes(itemKey);
    });
    
    window.CartManager.saveCart(updatedCart);
    loadCartItems(); // Reload to update display
}

// Update cart summary to only include checked items
async function updateCartSummaryForCheckedItems() {
    const checkedItems = getCheckedCartItems();
    
    if (checkedItems.length === 0) {
        // If no items checked, show zero totals
        const subtotalEl = document.getElementById('subtotal');
        const grandTotalEl = document.getElementById('grandTotal');
        const totalWeightEl = document.getElementById('totalWeight');
        
        if (subtotalEl) subtotalEl.textContent = formatPrice(0);
        if (grandTotalEl) grandTotalEl.textContent = formatPrice(0);
        if (totalWeightEl) totalWeightEl.textContent = formatWeight(0);
        
        // Hide minimum order indicators
        const minOrderRow = document.getElementById('minOrderWeightRow');
        const minOrderProgressRow = document.getElementById('minOrderProgressRow');
        const minOrderWarning = document.getElementById('minOrderWarning');
        const checkoutBtn = document.getElementById('checkoutBtn');
        const checkoutDisabledBtn = document.getElementById('checkoutDisabledBtn');
        
        if (minOrderRow) minOrderRow.style.display = 'none';
        if (minOrderProgressRow) minOrderProgressRow.style.display = 'none';
        if (minOrderWarning) minOrderWarning.style.display = 'none';
        if (checkoutBtn) checkoutBtn.style.display = 'block';
        if (checkoutDisabledBtn) checkoutDisabledBtn.style.display = 'none';
        
        return;
    }
    
    // Convert checked items to cart format for summary calculation
    const cart = window.CartManager ? window.CartManager.getCart() : [];
    const checkedCartItems = checkedItems.map(checkedItem => {
        return findCartItemByKey(cart, checkedItem.item_key);
    }).filter(item => item !== undefined);
    
    // Fetch product details for weight calculation
    const productDetailsMap = new Map();
    for (const item of checkedCartItems) {
        try {
            const productDetails = await getProductDetails(item.product_id);
            if (productDetails) {
                productDetailsMap.set(item.product_id, productDetails);
            }
        } catch (error) {
            console.error(`Error fetching product details for ${item.product_id}:`, error);
        }
    }
    
    // Update summary with checked items only
    await updateCartSummary(checkedCartItems, productDetailsMap);
}

// Proceed to checkout with only checked items
function proceedToCheckoutWithSelection() {
    const checkedItems = getCheckedCartItems();
    
    if (checkedItems.length === 0) {
        alert('Please select at least one item to checkout.');
        return;
    }
    
    // Store checked items in sessionStorage for checkout page
    sessionStorage.setItem('matarix_checked_cart_items', JSON.stringify(checkedItems));
    
    // Navigate to checkout
    window.location.href = 'Checkout.html';
}

// Initialize checkbox event listeners
function initializeCartCheckboxes() {
    // Set up "Select All" checkbox
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.onchange = function() {
            handleSelectAllChange(this);
        };
        // Set initial state to checked (since all items are checked by default)
        selectAllCheckbox.checked = true;
    }
    
    // All items are checked by default, so update state
    updateSelectAllCheckbox();
    updateDeleteSelectedButton();
    updateCartSummaryForCheckedItems();
}

// Export functions for global access
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeCartItem = removeCartItem;
window.clearCart = clearCart;
window.continueShopping = continueShopping;
window.loadCartItems = loadCartItems;
window.handleItemCheckboxChange = handleItemCheckboxChange;
window.deleteSelectedItems = deleteSelectedItems;
window.proceedToCheckoutWithSelection = proceedToCheckoutWithSelection;
window.getCheckedCartItems = getCheckedCartItems;


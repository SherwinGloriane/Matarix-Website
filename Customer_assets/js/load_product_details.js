    /**
 * Load Product Details
 * Dynamically loads and displays product details on ProductDetails page
 */

// Get product ID from URL
function getProductIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('product_id');
}

// Format price with peso sign
function formatPrice(price) {
    return '₱' + parseFloat(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
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

/**
 * Load product details from API
 */
function loadProductDetails() {
    const productId = getProductIdFromURL();
    
    if (!productId) {
        console.error('No product ID found in URL');
        // Redirect to MainPage if no product ID
        window.location.href = 'MainPage.html';
        return;
    }
    
    console.log('Loading product details for product_id:', productId);
    console.log('Current URL:', window.location.href);
    
    const apiUrl = `../api/get_product_customer.php?product_id=${productId}`;
    console.log('Fetching from:', apiUrl);
    
    fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        console.log('API Response Status:', response.status, response.statusText);
        
        // Check if response is OK
        if (!response.ok) {
            return response.text().then(text => {
                let errorData;
                try {
                    errorData = JSON.parse(text);
                } catch (e) {
                    errorData = { message: text || `HTTP error! status: ${response.status}` };
                }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            });
        }
        
        // Parse JSON response
        return response.json();
    })
    .then(data => {
        console.log('API Response Data:', data);
        console.log('Data.success:', data.success);
        console.log('Data.product:', data.product);
        
        // Simple check - if we have product data, display it
        if (data && data.product && data.product.product_id) {
            console.log('Product found! Displaying details for:', data.product.product_name);
            displayProductDetails(data.product);
        } else if (data && data.success && data.product) {
            // Fallback check
            console.log('Product found (fallback check)! Displaying details for:', data.product.product_name);
            displayProductDetails(data.product);
        } else {
            console.error('No product data received:', data);
            const errorMsg = data.message || 'Product not found';
            const productId = data.product_id || getProductIdFromURL();
            
            // Show error message on the page
            const contentArea = document.querySelector('.product-content');
            if (contentArea) {
                contentArea.innerHTML = `
                    <div class="alert alert-danger m-4">
                        <h4>Product Not Found</h4>
                        <p>Error: ${errorMsg}</p>
                        <p>Product ID: ${productId}</p>
                        <p>Please check the console (F12) for more details.</p>
                        <a href="MainPage.html" class="btn btn-primary">Go Back to Products</a>
                    </div>
                `;
            }
        }
    })
    .catch(error => {
        console.error('Error loading product details:', error);
        console.error('Error stack:', error.stack);
        console.error('Product ID:', productId);
        console.error('Current URL:', window.location.href);
        
        // Don't show alert - show error on page instead
        console.warn('Error loading product. Check console for details.');
        
        // Show error message on the page instead of alert
        const contentArea = document.querySelector('.product-content');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="alert alert-danger m-4">
                    <h4>Error Loading Product</h4>
                    <p>${error.message}</p>
                    <p>Product ID: ${productId}</p>
                    <p>Please check the console (F12) for more details.</p>
                    <a href="MainPage.html" class="btn btn-primary">Go Back to Products</a>
                </div>
            `;
        }
    });
}

/**
 * Display product variations
 */
function displayProductVariations(variations, basePrice, stockLevel) {
    // Get containers
    const sizeOptionsContainer = document.getElementById('sizeOptionsContainer');
    const sizeOptionsSection = document.getElementById('sizeOptionsSection');
    const lengthButtonsContainer = document.getElementById('lengthButtonsContainer');
    const lengthOptionsSection = document.getElementById('lengthOptionsSection');
    
    // Display Size variations (if any)
    if (variations && variations['Size'] && variations['Size'].length > 0) {
        if (sizeOptionsContainer && sizeOptionsSection) {
            sizeOptionsContainer.innerHTML = '';
            
            variations['Size'].forEach((variation, index) => {
                const col = document.createElement('div');
                col.className = 'col-6 mb-2';
                
                // Calculate stock per variation (distribute total stock across variations)
                const stockPerVariation = Math.floor(stockLevel / variations['Size'].length);
                
                // Create button with onclick handler directly in HTML
                const buttonHTML = `
                    <button type="button" 
                            class="size-option-btn ${index === 0 ? 'active' : ''}" 
                            data-variation-id="${variation.variation_id}"
                            data-variation-value="${escapeHtml(variation.variation_value)}"
                            onclick="selectSizeVariation(this, '${escapeHtml(variation.variation_value)}'); return false;"
                            style="width: 100%; background-color: ${index === 0 ? '#b71c1c' : '#f8f9fa'}; border: 1px solid ${index === 0 ? '#b71c1c' : '#ddd'}; border-radius: 8px; padding: 12px; text-align: left; cursor: pointer; transition: all 0.2s; position: relative; z-index: 10; pointer-events: auto;">
                        <div class="size-text" style="font-weight: bold; font-size: 16px; color: ${index === 0 ? 'white' : '#333'};">${escapeHtml(variation.variation_value)}</div>
                        <div class="price-text" style="color: ${index === 0 ? 'white' : '#b71c1c'}; font-weight: 600; font-size: 14px;">${formatPrice(basePrice)}/piece</div>
                        <div class="stock-text" style="color: ${index === 0 ? 'white' : '#666'}; font-size: 12px;">${stockPerVariation} pieces available</div>
                    </button>
                `;
                
                col.innerHTML = buttonHTML;
                sizeOptionsContainer.appendChild(col);
            });
            
            // Show the section
            sizeOptionsSection.style.display = 'block';
            
            // Select first size option by default
            if (sizeOptionsContainer.firstElementChild) {
                const firstButton = sizeOptionsContainer.querySelector('.size-option-btn');
                if (firstButton) {
                    firstButton.classList.add('active');
                }
            }
        }
    } else {
        // Hide size section if no variations
        if (sizeOptionsSection) {
            sizeOptionsSection.style.display = 'none';
        }
    }
    
    // Display Length variations (if any)
    if (variations && variations['Length'] && variations['Length'].length > 0) {
        if (lengthButtonsContainer && lengthOptionsSection) {
            lengthButtonsContainer.innerHTML = '';
            
            variations['Length'].forEach((variation, index) => {
                // Create button with onclick handler directly in HTML
                const buttonHTML = `
                    <button type="button" 
                            class="length-btn ${index === 0 ? 'active' : ''}" 
                            data-variation-id="${variation.variation_id}"
                            data-variation-value="${escapeHtml(variation.variation_value)}"
                            onclick="selectLengthVariation(this, '${escapeHtml(variation.variation_value)}'); return false;"
                            style="background-color: ${index === 0 ? '#b71c1c' : '#f8f9fa'}; color: ${index === 0 ? 'white' : '#333'}; border: 1px solid ${index === 0 ? '#b71c1c' : '#ddd'}; padding: 8px 20px; border-radius: 4px; cursor: pointer; transition: all 0.2s; font-size: 14px; position: relative; z-index: 10; pointer-events: auto;">
                        ${escapeHtml(variation.variation_value)}
                    </button>
                `;
                
                lengthButtonsContainer.insertAdjacentHTML('beforeend', buttonHTML);
            });
            
            // Show the section
            lengthOptionsSection.style.display = 'block';
        }
    } else {
        // Hide length section if no variations
        if (lengthOptionsSection) {
            lengthOptionsSection.style.display = 'none';
        }
    }
    
    // Handle other variation types dynamically
    // This allows for future expansion (e.g., Color, Material, etc.)
    const handledTypes = ['Size', 'Length'];
    Object.keys(variations || {}).forEach(variationType => {
        if (!handledTypes.includes(variationType)) {
            console.log(`Variation type "${variationType}" found - creating dynamic UI`);
            
            // Create a dynamic section for this variation type
            const sectionId = `${variationType.toLowerCase()}OptionsSection`;
            const containerId = `${variationType.toLowerCase()}OptionsContainer`;
            
            // Check if section already exists
            let section = document.getElementById(sectionId);
            let container = document.getElementById(containerId);
            
            if (!section) {
                // Create section HTML
                section = document.createElement('div');
                section.id = sectionId;
                section.className = 'variation-options mb-4';
                section.style.display = 'none';
                
                const label = document.createElement('label');
                label.className = 'option-label';
                label.textContent = `${variationType} Options:`;
                
                container = document.createElement('div');
                container.id = containerId;
                container.className = variationType === 'Size' ? 'row' : 'variation-buttons';
                if (variationType !== 'Size') {
                    container.style.display = 'flex';
                    container.style.flexWrap = 'wrap';
                    container.style.gap = '10px';
                }
                
                section.appendChild(label);
                section.appendChild(container);
                
                // Insert after length options section, or after size options if length doesn't exist
                const lengthSection = document.getElementById('lengthOptionsSection');
                const sizeSection = document.getElementById('sizeOptionsSection');
                const insertAfter = lengthSection || sizeSection || document.getElementById('sizeOptionsSection');
                
                if (insertAfter && insertAfter.parentNode) {
                    insertAfter.parentNode.insertBefore(section, insertAfter.nextSibling);
                } else {
                    // Fallback: insert before quantity section
                    const quantitySection = document.querySelector('.quantity-section');
                    if (quantitySection && quantitySection.parentNode) {
                        quantitySection.parentNode.insertBefore(section, quantitySection);
                    }
                }
            } else {
                container = document.getElementById(containerId);
            }
            
            if (container && variations[variationType] && variations[variationType].length > 0) {
                container.innerHTML = '';
                
                variations[variationType].forEach((variation, index) => {
                    const variationValueEscaped = escapeHtml(variation.variation_value);
                    const variationId = variation.variation_id;
                    const isActive = index === 0;
                    
                    if (variationType === 'Size') {
                        // Use size-style buttons
                        const stockPerVariation = Math.floor(stockLevel / variations[variationType].length);
                        
                        const buttonHTML = `
                            <div class="col-6 mb-2">
                                <button type="button" 
                                        class="size-option-btn ${isActive ? 'active' : ''}" 
                                        data-variation-id="${variationId}"
                                        data-variation-value="${variationValueEscaped}"
                                        data-variation-name="${variationType}"
                                        onclick="selectDynamicVariation(this, '${variationType}', '${variationValueEscaped}'); return false;"
                                        style="width: 100%; background-color: ${isActive ? '#b71c1c' : '#f8f9fa'}; border: 1px solid ${isActive ? '#b71c1c' : '#ddd'}; border-radius: 8px; padding: 12px; text-align: left; cursor: pointer; transition: all 0.2s; position: relative; z-index: 100; pointer-events: auto;">
                                    <div class="size-text" style="font-weight: bold; font-size: 16px; color: ${isActive ? 'white' : '#333'};">${variationValueEscaped}</div>
                                    <div class="price-text" style="color: ${isActive ? 'white' : '#b71c1c'}; font-weight: 600; font-size: 14px;">${formatPrice(basePrice)}/piece</div>
                                    <div class="stock-text" style="color: ${isActive ? 'white' : '#666'}; font-size: 12px;">${stockPerVariation} pieces available</div>
                                </button>
                            </div>
                        `;
                        
                        container.insertAdjacentHTML('beforeend', buttonHTML);
                    } else {
                        // Use length-style buttons
                        const buttonHTML = `
                            <button type="button" 
                                    class="length-btn ${isActive ? 'active' : ''}" 
                                    data-variation-id="${variationId}"
                                    data-variation-value="${variationValueEscaped}"
                                    data-variation-name="${variationType}"
                                    onclick="selectDynamicVariation(this, '${variationType}', '${variationValueEscaped}'); return false;"
                                    style="background-color: ${isActive ? '#b71c1c' : '#f8f9fa'}; color: ${isActive ? 'white' : '#333'}; border: 1px solid ${isActive ? '#b71c1c' : '#ddd'}; padding: 8px 20px; border-radius: 4px; cursor: pointer; transition: all 0.2s; font-size: 14px; position: relative; z-index: 100; pointer-events: auto;">
                                ${variationValueEscaped}
                            </button>
                        `;
                        
                        container.insertAdjacentHTML('beforeend', buttonHTML);
                    }
                });
                
                section.style.display = 'block';
            }
        }
    });
}

/**
 * Update Add to Cart button with selected variations
 */
function updateAddToCartButton() {
    if (!currentProductData) return;
    
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (!addToCartBtn) return;
    
    // Get quantity from either dropdown or manual input
    const quantityDropdown = document.getElementById('quantityDropdown');
    const quantityInput = document.getElementById('quantityInput');
    let quantity = 1;
    
    if (quantityDropdown && quantityDropdown.value !== 'custom') {
        quantity = parseInt(quantityDropdown.value) || 1;
    } else if (quantityInput) {
        quantity = parseInt(quantityInput.value) || 1;
    } else {
        // Fallback to old selector
        const oldInput = document.querySelector('.quantity-input');
        quantity = oldInput ? parseInt(oldInput.value) || 1 : 1;
    }
    
    const productId = currentProductData.product_id;
    const price = currentProductData.price;
    
    // Get selected variations (handle all variation types dynamically)
    const selectedVariations = {};
    
    // Get all active variation buttons (both size-style and length-style)
    document.querySelectorAll('.size-option-btn.active, .length-btn.active').forEach(btn => {
        const variationName = btn.getAttribute('data-variation-name') || 
                             (btn.classList.contains('size-option-btn') ? 'Size' : 'Length');
        const variationValue = btn.getAttribute('data-variation-value');
        if (variationValue) {
            selectedVariations[variationName] = variationValue;
        }
    });
    
    // Build variation info for URL
    // Note: cart_manager.js expects 'size' and 'length' parameters, but we need to support all variation types
    // We'll pass variations as a JSON string in a 'variations' parameter
    let variationInfo = '';
    if (Object.keys(selectedVariations).length > 0) {
        // Convert variations to the format cart_manager expects
        const variationsForCart = {};
        Object.entries(selectedVariations).forEach(([name, value]) => {
            variationsForCart[name] = {
                variation_value: value
            };
        });
        variationInfo = `&variations=${encodeURIComponent(JSON.stringify(variationsForCart))}`;
        
        // Also add individual parameters for backward compatibility (size, length)
        if (selectedVariations['Size']) {
            variationInfo += `&size=${encodeURIComponent(selectedVariations['Size'])}`;
        }
        if (selectedVariations['Length']) {
            variationInfo += `&length=${encodeURIComponent(selectedVariations['Length'])}`;
        }
    }
    
    const productName = encodeURIComponent(currentProductData.product_name);
    const image = encodeURIComponent(getProductImage(currentProductData.image_path));
    const category = encodeURIComponent(currentProductData.category);
    
    addToCartBtn.href = `Cart.html?add=product-${productId}&price=${price}&quantity=${quantity}&name=${productName}&image=${image}&category=${category}${variationInfo}`;
}

/**
 * Initialize quantity controls
 */
function initializeQuantityControls(productId, price, maxStock) {
    const quantityInput = document.getElementById('quantityInput');
    const quantityDropdown = document.getElementById('quantityDropdown');
    const manualControls = document.getElementById('manualQuantityControls');
    const decreaseBtn = manualControls ? manualControls.querySelector('.quantity-btn:first-of-type') : null;
    const increaseBtn = manualControls ? manualControls.querySelector('.quantity-btn:last-of-type') : null;
    
    // Fallback to old selector if new elements don't exist
    if (!quantityInput) {
        const oldInput = document.querySelector('.quantity-input');
        if (oldInput) {
            if (maxStock) oldInput.setAttribute('max', maxStock);
            oldInput.addEventListener('change', updateAddToCartButton);
        }
        return;
    }
    
    // Set max value based on stock
    if (maxStock) {
        quantityInput.setAttribute('max', maxStock);
        
        // Update dropdown options to respect stock limit
        if (quantityDropdown) {
            Array.from(quantityDropdown.options).forEach(option => {
                const value = parseInt(option.value);
                if (value && value > maxStock && option.value !== 'custom') {
                    option.disabled = true;
                    const originalText = option.textContent.replace(' (Out of stock)', '');
                    option.textContent = originalText + ' (Out of stock)';
                } else {
                    option.disabled = false;
                    option.textContent = option.textContent.replace(' (Out of stock)', '');
                }
            });
        }
    }
    
    // Handle dropdown selection
    if (quantityDropdown) {
        quantityDropdown.addEventListener('change', function() {
            if (this.value === 'custom') {
                // When custom is selected, focus the input field
                if (quantityInput) {
                    quantityInput.focus();
                    quantityInput.select();
                }
            } else {
                // When a preset is selected, update the input field
                const quantity = parseInt(this.value);
                if (quantityInput) {
                    quantityInput.value = quantity;
                }
                updateAddToCartButton();
            }
        });
    }
    
    // Decrease quantity
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (quantityInput) {
                let currentValue = parseInt(quantityInput.value) || 1;
                if (currentValue > 1) {
                    quantityInput.value = currentValue - 1;
                    // Update dropdown if value matches a preset
                    if (quantityDropdown) {
                        const matchingOption = Array.from(quantityDropdown.options).find(
                            opt => parseInt(opt.value) === (currentValue - 1)
                        );
                        if (matchingOption) {
                            quantityDropdown.value = (currentValue - 1).toString();
                        } else {
                            quantityDropdown.value = 'custom';
                        }
                    }
                    updateAddToCartButton();
                }
            }
        });
    }
    
    // Increase quantity
    if (increaseBtn) {
        increaseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (quantityInput) {
                let currentValue = parseInt(quantityInput.value) || 1;
                const max = parseInt(quantityInput.getAttribute('max')) || 9999;
                if (currentValue < max) {
                    quantityInput.value = currentValue + 1;
                    // Update dropdown if value matches a preset
                    if (quantityDropdown) {
                        const matchingOption = Array.from(quantityDropdown.options).find(
                            opt => parseInt(opt.value) === (currentValue + 1)
                        );
                        if (matchingOption) {
                            quantityDropdown.value = (currentValue + 1).toString();
                        } else {
                            quantityDropdown.value = 'custom';
                        }
                    }
                    updateAddToCartButton();
                }
            }
        });
    }
    
    // Update on input change
    quantityInput.addEventListener('change', function() {
        let value = parseInt(this.value) || 1;
        const min = parseInt(this.getAttribute('min')) || 1;
        const max = parseInt(this.getAttribute('max')) || 9999;
        
        if (value < min) value = min;
        if (value > max) value = max;
        
        this.value = value;
        
        // Update dropdown
        if (quantityDropdown) {
            const matchingOption = Array.from(quantityDropdown.options).find(
                opt => parseInt(opt.value) === value
            );
            if (matchingOption) {
                quantityDropdown.value = value.toString();
            } else {
                quantityDropdown.value = 'custom';
            }
        }
        
        updateAddToCartButton();
    });
    
    // Update dropdown while typing
    quantityInput.addEventListener('input', function() {
        if (quantityDropdown && this.value) {
            const value = parseInt(this.value);
            if (!isNaN(value)) {
                const matchingOption = Array.from(quantityDropdown.options).find(
                    opt => parseInt(opt.value) === value
                );
                if (matchingOption) {
                    quantityDropdown.value = value.toString();
                } else {
                    quantityDropdown.value = 'custom';
                }
            }
        }
    });
}

/**
 * Get minimum order settings
 */
async function getMinOrderSettings() {
    try {
        const response = await fetch('../api/get_order_settings.php', {
            credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
            return data.settings;
        }
    } catch (error) {
        console.error('Error fetching minimum order settings:', error);
    }
    return { min_order_weight_kg: 200 };
}

/**
 * Convert weight to kilograms
 */
function convertToKg(weight, unit) {
    if (!weight || weight === 0) return 0;
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue)) return 0;
    switch (unit?.toLowerCase()) {
        case 'kg': return weightValue;
        case 'g': return weightValue / 1000;
        case 'lb': return weightValue * 0.453592;
        case 'oz': return weightValue * 0.0283495;
        case 'ton': return weightValue * 1000;
        default: return weightValue;
    }
}

/**
 * Calculate smart quantity suggestions
 */
async function calculateSmartSuggestions(product, maxStock) {
    const suggestions = [];
    const settings = await getMinOrderSettings();
    const minWeightKg = settings.min_order_weight_kg || 200;
    
    // Get current cart weight to calculate how much more is needed
    let currentCartWeight = 0;
    try {
        const cart = window.CartManager ? window.CartManager.getCart() : [];
        for (const item of cart) {
            const productDetails = await fetch(`../api/get_product_customer.php?product_id=${item.product_id}`)
                .then(r => r.json())
                .then(d => d.success ? d.product : null)
                .catch(() => null);
            
            if (productDetails && productDetails.weight) {
                const weightKg = convertToKg(productDetails.weight, productDetails.weight_unit);
                currentCartWeight += weightKg * item.quantity;
            }
        }
    } catch (error) {
        console.error('Error calculating cart weight:', error);
    }
    
    // Calculate how much weight is needed to reach minimum
    const neededWeightKg = Math.max(0, minWeightKg - currentCartWeight);
    
    // If product has weight, suggest quantity to meet minimum order
    if (product.weight && neededWeightKg > 0) {
        const productWeightKg = convertToKg(product.weight, product.weight_unit);
        if (productWeightKg > 0) {
            const suggestedQty = Math.ceil(neededWeightKg / productWeightKg);
            if (suggestedQty > 0 && suggestedQty <= maxStock) {
                suggestions.push({
                    quantity: suggestedQty,
                    reason: `Meet minimum order weight (${minWeightKg} kg)`,
                    priority: 'high'
                });
            }
        }
    }
    
    // Suggest based on stock availability (suggest quantities that use stock efficiently)
    if (maxStock >= 100) {
        const stockBasedQty = Math.floor(maxStock * 0.1); // 10% of stock
        if (stockBasedQty >= 10 && stockBasedQty <= maxStock) {
            suggestions.push({
                quantity: stockBasedQty,
                reason: `Good stock availability`,
                priority: 'medium'
            });
        }
    }
    
    // Remove duplicates and sort by priority
    const uniqueSuggestions = [];
    const seenQuantities = new Set();
    
    suggestions.forEach(s => {
        if (!seenQuantities.has(s.quantity)) {
            seenQuantities.add(s.quantity);
            uniqueSuggestions.push(s);
        }
    });
    
    return uniqueSuggestions.sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        return a.quantity - b.quantity;
    });
}

/**
 * Display smart quantity suggestions
 */
async function displaySmartSuggestions(product, maxStock) {
    const suggestionsContainer = document.getElementById('smartQuantitySuggestions');
    const suggestionsList = document.getElementById('suggestionsList');
    
    if (!suggestionsContainer || !suggestionsList) return;
    
    const suggestions = await calculateSmartSuggestions(product, maxStock);
    
    if (suggestions.length === 0) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    suggestionsList.innerHTML = '';
    suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.innerHTML = `
            <button class="suggestion-btn" data-quantity="${suggestion.quantity}">
                <span class="suggestion-qty">${suggestion.quantity} units</span>
                <span class="suggestion-reason">${suggestion.reason}</span>
            </button>
        `;
        suggestionsList.appendChild(suggestionItem);
    });
    
    // Add click handlers
    suggestionsList.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const quantity = parseInt(this.getAttribute('data-quantity'));
            setQuantity(quantity);
        });
    });
    
    suggestionsContainer.style.display = 'block';
}

/**
 * Set quantity value
 */
function setQuantity(quantity) {
    const quantityInput = document.getElementById('quantityInput');
    const quantityDropdown = document.getElementById('quantityDropdown');
    const manualControls = document.getElementById('manualQuantityControls');
    
    if (!quantityInput) return;
    
    const max = parseInt(quantityInput.getAttribute('max')) || 9999;
    const finalQuantity = Math.min(Math.max(1, quantity), max);
    
    quantityInput.value = finalQuantity;
    
    // Update dropdown if value matches a preset
    if (quantityDropdown) {
        const matchingOption = Array.from(quantityDropdown.options).find(
            opt => parseInt(opt.value) === finalQuantity
        );
        if (matchingOption) {
            quantityDropdown.value = finalQuantity.toString();
            if (manualControls) manualControls.style.display = 'none';
        } else {
            quantityDropdown.value = 'custom';
            if (manualControls) manualControls.style.display = 'flex';
        }
    }
    
    updateAddToCartButton();
}

// Store product data globally for use in update functions
let currentProductData = null;

/**
 * Update rating display
 */
function updateRatingDisplay(product) {
    console.log('Updating rating display for product:', product);
    
    // Update rating stars (using Font Awesome icons)
    const ratingStars = document.querySelector('.product-rating .stars');
    if (ratingStars) {
        const avgRating = parseFloat(product.avg_rating) || 0;
        console.log('Average rating:', avgRating);
        
        const fullStars = Math.floor(avgRating);
        const hasHalfStar = (avgRating % 1) >= 0.5;
        let starsHtml = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                starsHtml += '<i class="fas fa-star"></i>'; // Filled star (yellow)
            } else if (i === fullStars && hasHalfStar) {
                starsHtml += '<i class="fas fa-star-half-alt"></i>'; // Half star (yellow)
            } else {
                starsHtml += '<i class="far fa-star"></i>'; // Empty star (gray)
            }
        }
        ratingStars.innerHTML = starsHtml;
        console.log('Stars HTML updated:', starsHtml);
    } else {
        console.warn('Rating stars element not found');
    }
    
    // Update rating text
    const ratingText = document.querySelector('.rating-text');
    if (ratingText) {
        const avgRating = parseFloat(product.avg_rating) || 0;
        const reviewCount = parseInt(product.review_count) || 0;
        const reviewText = reviewCount === 1 ? 'review' : 'reviews';
        ratingText.textContent = `${avgRating.toFixed(1)} (${reviewCount} ${reviewText})`;
    }
    
    // Update reviews tab label
    const reviewsTab = document.querySelector('a[href="#reviews"]');
    if (reviewsTab) {
        const reviewCount = parseInt(product.review_count) || 0;
        reviewsTab.textContent = `Reviews ( ${reviewCount} )`;
    }
}

/**
 * Update reviews tab content
 */
function updateReviewsTab(product) {
    const reviewsContent = document.querySelector('#reviews .reviews-content');
    if (!reviewsContent) return;
    
    if (!product.reviews || product.reviews.length === 0) {
        reviewsContent.innerHTML = '<p class="text-muted">No reviews yet. Be the first to review this product!</p>';
        return;
    }
    
    let reviewsHtml = '<div class="reviews-list">';
    
    product.reviews.forEach(review => {
        const reviewDate = new Date(review.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Generate star rating HTML (using Font Awesome icons)
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= review.rating) {
                starsHtml += '<i class="fas fa-star text-warning"></i>'; // Filled star
            } else {
                starsHtml += '<i class="far fa-star text-muted"></i>'; // Empty star
            }
        }
        
        reviewsHtml += `
            <div class="review-item mb-4 pb-4 border-bottom">
                <div class="review-header d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <h6 class="mb-1">${review.user_name || 'Anonymous'}</h6>
                        <div class="review-rating mb-2">
                            ${starsHtml}
                            <span class="ml-2 text-muted">${review.rating}.0</span>
                        </div>
                    </div>
                    <small class="text-muted">${reviewDate}</small>
                </div>
                ${review.review_text ? `<p class="review-text mb-0">${escapeHtml(review.review_text)}</p>` : '<p class="text-muted mb-0"><em>No comment provided</em></p>'}
            </div>
        `;
    });
    
    reviewsHtml += '</div>';
    reviewsContent.innerHTML = reviewsHtml;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Select size variation
 */
function selectSizeVariation(button, variationValue) {
    console.log('selectSizeVariation called:', variationValue);
    if (typeof event !== 'undefined') {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Remove active class from all size buttons
    document.querySelectorAll('.size-option-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.backgroundColor = '#f8f9fa';
        btn.style.borderColor = '#ddd';
        const sizeText = btn.querySelector('.size-text');
        const priceText = btn.querySelector('.price-text');
        const stockText = btn.querySelector('.stock-text');
        if (sizeText) sizeText.style.color = '#333';
        if (priceText) priceText.style.color = '#b71c1c';
        if (stockText) stockText.style.color = '#666';
    });
    
    // Add active class to clicked button
    button.classList.add('active');
    button.style.backgroundColor = '#b71c1c';
    button.style.borderColor = '#b71c1c';
    const sizeText = button.querySelector('.size-text');
    const priceText = button.querySelector('.price-text');
    const stockText = button.querySelector('.stock-text');
    if (sizeText) sizeText.style.color = 'white';
    if (priceText) priceText.style.color = 'white';
    if (stockText) stockText.style.color = 'white';
    
    console.log('Size variation selected:', variationValue);
    if (typeof updateAddToCartButton === 'function') {
        updateAddToCartButton();
    }
    return false;
}

/**
 * Select length variation
 */
function selectLengthVariation(button, variationValue) {
    console.log('selectLengthVariation called:', variationValue);
    if (typeof event !== 'undefined') {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Remove active class from all length buttons
    document.querySelectorAll('.length-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.backgroundColor = '#f8f9fa';
        btn.style.borderColor = '#ddd';
        btn.style.color = '#333';
    });
    
    // Add active class to clicked button
    button.classList.add('active');
    button.style.backgroundColor = '#b71c1c';
    button.style.borderColor = '#b71c1c';
    button.style.color = 'white';
    
    console.log('Length variation selected:', variationValue);
    if (typeof updateAddToCartButton === 'function') {
        updateAddToCartButton();
    }
    return false;
}

/**
 * Select dynamic variation (for non-Size, non-Length variations)
 */
function selectDynamicVariation(button, variationType, variationValue) {
    console.log('selectDynamicVariation called:', variationType, variationValue);
    if (typeof event !== 'undefined') {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Determine button class based on variation type
    const buttonClass = variationType === 'Size' ? '.size-option-btn' : '.length-btn';
    const selector = `${buttonClass}[data-variation-name="${variationType}"]`;
    
    console.log('Selector:', selector);
    const allButtons = document.querySelectorAll(selector);
    console.log('Found buttons:', allButtons.length);
    
    // Remove active class from all buttons of this variation type
    allButtons.forEach(btn => {
        btn.classList.remove('active');
        
        // For length-style buttons (including Color, Material, etc.)
        if (variationType !== 'Size') {
            // Get all current style properties and preserve them
            const currentStyle = btn.getAttribute('style') || '';
            // Parse and update only the properties we need to change
            const styleParts = currentStyle.split(';').filter(s => s.trim());
            const updatedParts = [];
            
            // Preserve all existing styles except the ones we're changing
            styleParts.forEach(part => {
                const trimmed = part.trim();
                if (!trimmed.match(/^background-color\s*:/i) && 
                    !trimmed.match(/^color\s*:/i) && 
                    !trimmed.match(/^border\s*:/i)) {
                    updatedParts.push(trimmed);
                }
            });
            
            // Add our new styles
            updatedParts.push('background-color: #f8f9fa !important');
            updatedParts.push('color: #333 !important');
            updatedParts.push('border: 1px solid #ddd !important');
            
            // Reconstruct the style attribute
            btn.setAttribute('style', updatedParts.join('; '));
        } else {
            // For size-style buttons
            btn.style.setProperty('background-color', '#f8f9fa', 'important');
            btn.style.setProperty('border-color', '#ddd', 'important');
            const sizeText = btn.querySelector('.size-text');
            const priceText = btn.querySelector('.price-text');
            const stockText = btn.querySelector('.stock-text');
            if (sizeText) sizeText.style.setProperty('color', '#333', 'important');
            if (priceText) priceText.style.setProperty('color', '#b71c1c', 'important');
            if (stockText) stockText.style.setProperty('color', '#666', 'important');
        }
    });
    
    // Add active class to clicked button
    button.classList.add('active');
    
    // Update the clicked button's style
    if (variationType !== 'Size') {
        // For length-style buttons (Color, Material, etc.)
        // Get all current style properties and preserve them
        const currentStyle = button.getAttribute('style') || '';
        // Parse and update only the properties we need to change
        const styleParts = currentStyle.split(';').filter(s => s.trim());
        const updatedParts = [];
        
        // Preserve all existing styles except the ones we're changing
        styleParts.forEach(part => {
            const trimmed = part.trim();
            if (!trimmed.match(/^background-color\s*:/i) && 
                !trimmed.match(/^color\s*:/i) && 
                !trimmed.match(/^border\s*:/i)) {
                updatedParts.push(trimmed);
            }
        });
        
        // Add our new styles
        updatedParts.push('background-color: #b71c1c !important');
        updatedParts.push('color: white !important');
        updatedParts.push('border: 1px solid #b71c1c !important');
        
        // Reconstruct the style attribute
        button.setAttribute('style', updatedParts.join('; '));
    } else {
        // For size-style buttons
        button.style.setProperty('background-color', '#b71c1c', 'important');
        button.style.setProperty('border-color', '#b71c1c', 'important');
        const sizeText = button.querySelector('.size-text');
        const priceText = button.querySelector('.price-text');
        const stockText = button.querySelector('.stock-text');
        if (sizeText) sizeText.style.setProperty('color', 'white', 'important');
        if (priceText) priceText.style.setProperty('color', 'white', 'important');
        if (stockText) stockText.style.setProperty('color', 'white', 'important');
    }
    
    console.log('Dynamic variation selected:', variationType, variationValue);
    console.log('Button classes:', button.className);
    console.log('Button style:', button.getAttribute('style'));
    
    if (typeof updateAddToCartButton === 'function') {
        updateAddToCartButton();
    }
    return false;
}

// Make functions globally available immediately
window.selectSizeVariation = selectSizeVariation;
window.selectLengthVariation = selectLengthVariation;
window.selectDynamicVariation = selectDynamicVariation;

/**
 * Display product details on the page
 */
function displayProductDetails(product) {
    currentProductData = product;
    
    // Update page title
    document.title = `Product Detail - ${product.product_name}`;
    
    // Update product title
    const productTitle = document.querySelector('.product-title');
    if (productTitle) {
        productTitle.textContent = product.product_name;
    }
    
    // Update product price
    const productPrice = document.querySelector('.product-price .price');
    if (productPrice) {
        productPrice.textContent = formatPrice(product.price);
    }
    
    // Update stock available
    const stockAvailable = document.querySelector('.stock-available');
    if (stockAvailable) {
        stockAvailable.textContent = `${product.stock_level} stocks available`;
    }
    
    // Initialize quantity controls first
    initializeQuantityControls(product.product_id, product.price, product.stock_level);
    
    // Display smart quantity suggestions
    displaySmartSuggestions(product, product.stock_level);
    
    // Update product image
    const productImage = document.querySelector('.product-main-img');
    if (productImage) {
        productImage.src = getProductImage(product.image_path);
        productImage.alt = product.product_name;
    }
    
    // Update thumbnail images from database
    const thumbnailsContainer = document.querySelector('.thumbnail-images .row');
    if (thumbnailsContainer && product.thumbnails && Array.isArray(product.thumbnails) && product.thumbnails.length > 0) {
        thumbnailsContainer.innerHTML = '';
        
        // Display up to 4 thumbnails
        product.thumbnails.slice(0, 4).forEach((thumbnailPath, index) => {
            const col = document.createElement('div');
            col.className = 'col-6 mb-2';
            
            const img = document.createElement('img');
            img.src = getProductImage(thumbnailPath);
            img.alt = `${product.product_name} - Thumbnail ${index + 1}`;
            img.className = 'img-fluid thumbnail-img';
            img.style.cursor = 'pointer';
            
            // Click thumbnail to change main image
            img.addEventListener('click', function() {
                if (productImage) {
                    productImage.src = getProductImage(thumbnailPath);
                }
            });
            
            col.appendChild(img);
            thumbnailsContainer.appendChild(col);
        });
    } else if (thumbnailsContainer) {
        // If no thumbnails, hide the thumbnail section or show placeholder
        const thumbnailSection = document.querySelector('.thumbnail-images');
        if (thumbnailSection) {
            thumbnailSection.style.display = 'none';
        }
    }
    
    // Update description tab content
    const descriptionContent = document.querySelector('#description .description-content');
    if (descriptionContent && product.description) {
        descriptionContent.innerHTML = `
            <h5>Product Description</h5>
            <p>${product.description}</p>
        `;
    }
    
    // Update specifications tab
    const specificationsContent = document.querySelector('#specifications .specifications-content');
    if (specificationsContent) {
        let specsHtml = '<table class="table table-bordered">';
        specsHtml += `<tr><th>Category</th><td>${product.category}</td></tr>`;
        specsHtml += `<tr><th>Stock Level</th><td>${product.stock_level} units</td></tr>`;
        specsHtml += `<tr><th>Stock Status</th><td>${product.stock_status}</td></tr>`;
        if (product.length) {
            specsHtml += `<tr><th>Length</th><td>${product.length} ${product.unit || ''}</td></tr>`;
        }
        if (product.width) {
            specsHtml += `<tr><th>Width</th><td>${product.width} ${product.unit || ''}</td></tr>`;
        }
        if (product.weight !== null && product.weight !== undefined) {
            const weightDisplay = product.weight + (product.weight_unit ? ' ' + product.weight_unit : '');
            specsHtml += `<tr><th>Weight</th><td>${weightDisplay}</td></tr>`;
        }
        specsHtml += '</table>';
        specificationsContent.innerHTML = specsHtml;
    }
    
    // Display variations (this will also update Add to Cart button)
    // Check if variations exist and is not null/undefined/empty
    if (product.variations && typeof product.variations === 'object' && Object.keys(product.variations).length > 0) {
        displayProductVariations(product.variations, product.price, product.stock_level);
    } else {
        // Hide variation sections if no variations
        const sizeSection = document.getElementById('sizeOptionsSection');
        const lengthSection = document.getElementById('lengthOptionsSection');
        if (sizeSection) sizeSection.style.display = 'none';
        if (lengthSection) lengthSection.style.display = 'none';
    }
    
    // Update reviews tab
    updateReviewsTab(product);
    
    // Update rating display
    updateRatingDisplay(product);
    
    // Initial update of Add to Cart button
    updateAddToCartButton();
    
    // Ensure Add to Cart button has the correct class for auth_check.js handler
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn && !addToCartBtn.classList.contains('add-to-cart-btn')) {
        addToCartBtn.classList.add('add-to-cart-btn');
    }
}

// Load product details when DOM is ready
// Wait a bit to ensure all other scripts have loaded
setTimeout(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadProductDetails);
    } else {
        loadProductDetails();
    }
}, 100);


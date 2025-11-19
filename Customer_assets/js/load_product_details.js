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

// Get product image (fallback to default)
function getProductImage(category, productName) {
    // You can customize this to return specific images based on category/product
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
    
    fetch(`../api/get_product_details.php?product_id=${productId}`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.product) {
            displayProductDetails(data.product);
        } else {
            console.error('Failed to load product:', data.message);
            alert('Product not found. Redirecting to products page...');
            window.location.href = 'MainPage.html';
        }
    })
    .catch(error => {
        console.error('Error loading product details:', error);
        alert('Error loading product details. Please try again.');
    });
}

/**
 * Display product variations
 */
function displayProductVariations(variations, basePrice) {
    // Clear existing variations
    const sizeOptions = document.querySelector('.size-options .row');
    const lengthOptions = document.querySelector('.length-buttons');
    
    if (sizeOptions && variations['Size']) {
        sizeOptions.innerHTML = '';
        
        variations['Size'].forEach((variation, index) => {
            const col = document.createElement('div');
            col.className = 'col-6 mb-2';
            
            const button = document.createElement('button');
            button.className = 'size-option-btn';
            button.setAttribute('data-variation-id', variation.variation_id);
            button.setAttribute('data-variation-value', variation.variation_value);
            
            button.innerHTML = `
                <div class="size-text">${variation.variation_value}</div>
                <div class="price-text">${formatPrice(basePrice)}/piece</div>
                <div class="stock-text">Available</div>
            `;
            
            // Add click handler
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                document.querySelectorAll('.size-option-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                // Add active class to clicked button
                this.classList.add('active');
            });
            
            col.appendChild(button);
            sizeOptions.appendChild(col);
        });
    }
    
    if (lengthOptions && variations['Length']) {
        lengthOptions.innerHTML = '';
        
        variations['Length'].forEach((variation, index) => {
            const button = document.createElement('button');
            button.className = 'length-btn';
            if (index === 0) {
                button.classList.add('active');
            }
            button.setAttribute('data-variation-id', variation.variation_id);
            button.setAttribute('data-variation-value', variation.variation_value);
            button.textContent = variation.variation_value;
            
            // Add click handler
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                document.querySelectorAll('.length-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                // Add active class to clicked button
                this.classList.add('active');
            });
            
            lengthOptions.appendChild(button);
        });
    }
    
    // Hide size/length options sections if no variations
    if (!variations['Size'] || variations['Size'].length === 0) {
        const sizeSection = document.querySelector('.size-options');
        if (sizeSection) {
            sizeSection.style.display = 'none';
        }
    }
    
    if (!variations['Length'] || variations['Length'].length === 0) {
        const lengthSection = document.querySelector('.length-options');
        if (lengthSection) {
            lengthSection.style.display = 'none';
        }
    }
}

/**
 * Initialize quantity controls
 */
function initializeQuantityControls(productId, price, maxStock) {
    const quantityInput = document.querySelector('.quantity-input');
    const decreaseBtn = document.querySelector('.quantity-btn:first-of-type');
    const increaseBtn = document.querySelector('.quantity-btn:last-of-type');
    const addToCartBtn = document.getElementById('addToCartBtn');
    
    if (!quantityInput) return;
    
    // Set max value based on stock
    if (maxStock) {
        quantityInput.setAttribute('max', maxStock);
    }
    
    // Decrease quantity
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            let currentValue = parseInt(quantityInput.value) || 1;
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
                updateAddToCartLink();
            }
        });
    }
    
    // Increase quantity
    if (increaseBtn) {
        increaseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            let currentValue = parseInt(quantityInput.value) || 1;
            const max = parseInt(quantityInput.getAttribute('max')) || 9999;
            if (currentValue < max) {
                quantityInput.value = currentValue + 1;
                updateAddToCartLink();
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
        updateAddToCartLink();
    });
    
    // Update Add to Cart link
    function updateAddToCartLink() {
        if (addToCartBtn && currentProductData) {
            const quantity = quantityInput.value || 1;
            const productName = encodeURIComponent(currentProductData.product_name);
            const image = encodeURIComponent(getProductImage(currentProductData.category, currentProductData.product_name));
            const category = encodeURIComponent(currentProductData.category);
            
            addToCartBtn.href = `Cart.html?add=product-${productId}&price=${price}&quantity=${quantity}&name=${productName}&image=${image}&category=${category}`;
        }
    }
    
    // Initial update
    updateAddToCartLink();
}

// Store product data globally for use in update functions
let currentProductData = null;

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
    
    // Update Add to Cart button
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        const quantity = document.querySelector('.quantity-input')?.value || 1;
        addToCartBtn.href = `Cart.html?add=product-${product.product_id}&price=${product.price}&quantity=${quantity}`;
    }
    
    // Initialize quantity controls
    initializeQuantityControls(product.product_id, product.price, product.stock_level);
    
    // Update product image
    const productImage = document.querySelector('.product-main-img');
    if (productImage) {
        productImage.src = getProductImage(product.category, product.product_name);
        productImage.alt = product.product_name;
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
        specsHtml += '</table>';
        specificationsContent.innerHTML = specsHtml;
    }
    
    // Display variations
    displayProductVariations(product.variations, product.price);
}

// Load product details when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadProductDetails);
} else {
    loadProductDetails();
}


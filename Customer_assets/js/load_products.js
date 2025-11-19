/**
 * Load Products from Database
 * Dynamically loads and displays products on the MainPage
 */

// Category mapping from database to HTML section IDs
const categoryMapping = {
    'Cement & Concrete Products': {
        sectionId: 'cement-products',
        icon: 'fas fa-hammer',
        title: 'Cement & Concrete Products'
    },
    'Masonry': {
        sectionId: 'masonry-products',
        icon: 'fas fa-th-large',
        title: 'Masonry'
    },
    'Sand & Gravel': {
        sectionId: 'sand-products',
        icon: 'fas fa-mountain',
        title: 'Sand & Gravel'
    },
    'Lumber & Wood': {
        sectionId: 'lumber-products',
        icon: 'fas fa-tree',
        title: 'Lumber & Wood'
    },
    'Steel & Metal': {
        sectionId: 'steel-products',
        icon: 'fas fa-industry',
        title: 'Steel & Metal'
    },
    'Roofing & Insulation': {
        sectionId: 'roofing-products',
        icon: 'fas fa-home',
        title: 'Roofing & Insulation'
    },
    'Pipes & Plumbing': {
        sectionId: 'plumbing-products',
        icon: 'fas fa-wrench',
        title: 'Pipes & Plumbing'
    },
    'Paints & Finishes': {
        sectionId: 'paints-products',
        icon: 'fas fa-paint-brush',
        title: 'Paints & Finishes'
    },
    'Tools & Hardware': {
        sectionId: 'tools-products',
        icon: 'fas fa-tools',
        title: 'Tools & Hardware'
    },
    'Electrical': {
        sectionId: 'electrical-products',
        icon: 'fas fa-bolt',
        title: 'Electrical'
    }
};

// Default product image (fallback)
const defaultProductImage = '../Customer_assets/images/Slice 15 (2).png';

/**
 * Get product image based on category
 */
function getProductImage(category, productName) {
    // You can customize this to return specific images based on category/product
    // For now, return default image
    return defaultProductImage;
}

/**
 * Format price with peso sign
 */
function formatPrice(price) {
    return '₱' + parseFloat(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Create product card HTML
 */
function createProductCard(product) {
    const imageUrl = getProductImage(product.category, product.product_name);
    const price = formatPrice(product.price);
    const productId = product.product_id;
    
    return `
        <div class="col-lg-3 col-md-6 col-sm-6 mb-4">
            <div class="product-card" style="cursor: pointer;" onclick="window.location.href='ProductDetails.html?product_id=${productId}'">
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.product_name}" style="max-width: 100%; height: 200px; object-fit: cover;">
                </div>
                <div class="product-info">
                    <h5 class="product-title">${product.product_name}</h5>
                    <p class="product-price">${price}</p>
                    <a href="ProductDetails.html?product_id=${productId}" class="btn btn-primary-red btn-sm add-to-cart-btn" onclick="event.stopPropagation();">View Details</a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Get or create category section row container
 */
function getCategoryRowContainer(category) {
    const mapping = categoryMapping[category];
    if (!mapping) {
        console.warn('Unknown category:', category);
        return null;
    }
    
    const sectionId = mapping.sectionId;
    let section = document.getElementById(sectionId);
    
    if (!section) {
        // Create the section if it doesn't exist
        const productsSection = document.querySelector('#products .container');
        if (!productsSection) return null;
        
        section = document.createElement('div');
        section.id = sectionId;
        section.className = 'category-products-section';
        section.innerHTML = `
            <h3 class="category-products-title">
                <i class="${mapping.icon} category-title-icon"></i>
                ${mapping.title}
            </h3>
            <div class="row" id="${sectionId}-row">
            </div>
        `;
        
        // Insert after the loading message
        const loadingDiv = document.getElementById('products-loading');
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.parentNode.insertBefore(section, loadingDiv.nextSibling);
        } else {
            productsSection.appendChild(section);
        }
    }
    
    // Find or create the row container
    let rowContainer = section.querySelector('.row');
    if (!rowContainer) {
        rowContainer = document.createElement('div');
        rowContainer.className = 'row';
        rowContainer.id = sectionId + '-row';
        section.appendChild(rowContainer);
    }
    
    return rowContainer;
}

/**
 * Load products from API
 */
function loadProducts() {
    fetch('../api/get_products.php', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.products) {
            // Group products by category
            const productsByCategory = {};
            
            data.products.forEach(product => {
                const category = product.category;
                if (!productsByCategory[category]) {
                    productsByCategory[category] = [];
                }
                productsByCategory[category].push(product);
            });
            
            // Hide loading message
            const loadingDiv = document.getElementById('products-loading');
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            
            // Display products by category
            Object.keys(productsByCategory).forEach(category => {
                const rowContainer = getCategoryRowContainer(category);
                if (rowContainer) {
                    // Clear existing static products to replace with database products
                    rowContainer.innerHTML = '';
                    
                    // Add products from database to the category
                    productsByCategory[category].forEach(product => {
                        const productCard = createProductCard(product);
                        rowContainer.insertAdjacentHTML('beforeend', productCard);
                    });
                }
            });
            
            console.log(`Loaded ${data.count} products successfully`);
        } else {
            console.error('Failed to load products:', data.message);
        }
    })
    .catch(error => {
        console.error('Error loading products:', error);
    });
}

// Load products when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadProducts);
} else {
    loadProducts();
}


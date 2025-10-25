$(document).ready(function() {
    // Sample product data with different statuses
    const products = [
        { id: 1, name: 'Cement Portland', lot: 'Lot A-1', category: 'Building', stock: 155, minStock: 50, status: 'In Stock', price: 250.00, restock: '2025-01-15', image: '../Admin_assets/images/cement.png' },
        { id: 2, name: 'Steel Rebar 10mm', lot: 'Lot B-2', category: 'Building', stock: 45, minStock: 50, status: 'Low Stock', price: 180.00, restock: '2025-01-10', image: '../Admin_assets/images/rebar.png' },
        { id: 3, name: 'Plywood 4x8', lot: 'Lot C-3', category: 'Building', stock: 0, minStock: 20, status: 'Out of Stock', price: 450.00, restock: '2024-12-28', image: '../Admin_assets/images/plywood.png' },
        { id: 4, name: 'Paint White 5L', lot: 'Lot D-4', category: 'Hardware', stock: 78, minStock: 30, status: 'In Stock', price: 320.00, restock: '2025-01-12', image: '../Admin_assets/images/paint.png' },
        { id: 5, name: 'Hammer 16oz', lot: 'Lot E-5', category: 'Tools', stock: 25, minStock: 25, status: 'Low Stock', price: 150.00, restock: '2025-01-08', image: '../Admin_assets/images/hammer.png' },
        { id: 6, name: 'Power Drill', lot: 'Lot F-6', category: 'Tools', stock: 12, minStock: 15, status: 'Low Stock', price: 2500.00, restock: '2025-01-05', image: '../Admin_assets/images/drill.png' },
        { id: 7, name: 'PVC Pipe 1/2"', lot: 'Lot G-7', category: 'Plumbing', stock: 200, minStock: 100, status: 'In Stock', price: 85.00, restock: '2025-01-14', image: '../Admin_assets/images/pipe.png' },
        { id: 8, name: 'Electrical Wire 2.0', lot: 'Lot H-8', category: 'Electronics', stock: 0, minStock: 50, status: 'Out of Stock', price: 120.00, restock: '2024-12-30', image: '../Admin_assets/images/wire.png' }
    ];
    
    // Render products to table
    function renderProducts(productsToRender = products) {
        const tbody = $('.inventory-table tbody');
        tbody.empty();
        
        productsToRender.forEach(product => {
            const statusClass = product.status === 'In Stock' ? 'status-in-stock' : 
                              product.status === 'Low Stock' ? 'status-low-stock' : 'status-out-of-stock';
            
            const row = `
                <tr class="product-row" data-product-id="${product.id}">
                    <td>
                        <div class="product-info">
                            <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/45'">
                            <div class="product-details">
                                <strong class="product-name">${product.name}</strong>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="category-badge">${product.category}</span>
                    </td>
                    <td>
                        <div class="stock-info">
                            <span class="stock-level">${product.stock} units</span>
                            <small class="stock-min">Min: ${product.minStock}</small>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">${product.status}</span>
                    </td>
                    <td class="product-price">₱${product.price.toFixed(2)}</td>
                    <td class="restock-date">${product.restock}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" data-action="view" data-product="${product.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn" data-action="edit" data-product="${product.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="restock-btn" data-action="restock" data-product="${product.id}">
                                Restock
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
        
        updateStatistics(productsToRender);
    }
    
    // Update statistics cards
    function updateStatistics(productsToShow = products) {
        const totalProducts = productsToShow.length;
        const lowStock = productsToShow.filter(p => p.status === 'Low Stock').length;
        const outOfStock = productsToShow.filter(p => p.status === 'Out of Stock').length;
        
        $('.stat-card:eq(0) .stat-number').text(totalProducts);
        $('.stat-card:eq(1) .stat-number').text(lowStock);
        $('.stat-card:eq(2) .stat-number').text(outOfStock);
    }
    
    // Initial render
    renderProducts();
    
    // View button functionality - Show product details modal
    $(document).on('click', '.view-btn', function() {
        const productId = $(this).data('product');
        const product = products.find(p => p.id === productId);
        
        if (product) {
            const modal = `
                <div class="modal fade" id="viewProductModal" tabindex="-1" role="dialog">
                    <div class="modal-dialog modal-dialog-centered" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Product Details</h5>
                                <button type="button" class="close" data-dismiss="modal">
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <div class="text-center mb-3">
                                    <img src="${product.image}" alt="${product.name}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 10px;" onerror="this.src='https://via.placeholder.com/150'">
                                </div>
                                <table class="table table-borderless">
                                    <tr><th>Product Name:</th><td>${product.name}</td></tr>
                                    <tr><th>Lot:</th><td>${product.lot}</td></tr>
                                    <tr><th>Category:</th><td>${product.category}</td></tr>
                                    <tr><th>Stock Level:</th><td>${product.stock} units</td></tr>
                                    <tr><th>Minimum Stock:</th><td>${product.minStock} units</td></tr>
                                    <tr><th>Status:</th><td><span class="status-badge ${product.status === 'In Stock' ? 'status-in-stock' : product.status === 'Low Stock' ? 'status-low-stock' : 'status-out-of-stock'}">${product.status}</span></td></tr>
                                    <tr><th>Price:</th><td>₱${product.price.toFixed(2)}</td></tr>
                                    <tr><th>Last Restocked:</th><td>${product.restock}</td></tr>
                                </table>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#viewProductModal').remove();
            $('body').append(modal);
            $('#viewProductModal').modal('show');
        }
    });
    
    // Restock button functionality
    $(document).on('click', '.restock-btn', function() {
        const productId = $(this).data('product');
        const product = products.find(p => p.id === productId);
        
        if (product) {
            const modal = `
                <div class="modal fade" id="restockModal" tabindex="-1" role="dialog">
                    <div class="modal-dialog modal-dialog-centered" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Restock Product</h5>
                                <button type="button" class="close" data-dismiss="modal">
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <p><strong>Product:</strong> ${product.name}</p>
                                <p><strong>Current Stock:</strong> ${product.stock} units</p>
                                <p><strong>Minimum Stock:</strong> ${product.minStock} units</p>
                                <div class="form-group">
                                    <label for="restockQuantity">Quantity to Add:</label>
                                    <input type="number" class="form-control" id="restockQuantity" min="1" value="${product.minStock - product.stock > 0 ? product.minStock - product.stock : 50}">
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" id="confirmRestock" data-product="${productId}">Confirm Restock</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#restockModal').remove();
            $('body').append(modal);
            $('#restockModal').modal('show');
        }
    });
    
    // Confirm restock
    $(document).on('click', '#confirmRestock', function() {
        const productId = $(this).data('product');
        const quantity = parseInt($('#restockQuantity').val());
        const product = products.find(p => p.id === productId);
        
        if (product && quantity > 0) {
            product.stock += quantity;
            
            // Update status based on new stock level
            if (product.stock >= product.minStock) {
                product.status = 'In Stock';
            } else if (product.stock > 0) {
                product.status = 'Low Stock';
            } else {
                product.status = 'Out of Stock';
            }
            
            // Update restock date to today
            const today = new Date().toISOString().split('T')[0];
            product.restock = today;
            
            renderProducts();
            $('#restockModal').modal('hide');
            
            alert(`Successfully restocked ${quantity} units of ${product.name}. New stock level: ${product.stock} units`);
        }
    });
    
    // Category filter
    $('#category-filter').on('change', function() {
        const category = $(this).val();
        const itemsFilter = $('#items-filter').val();
        
        let filtered = products;
        
        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }
        
        if (itemsFilter) {
            filtered = filterByStatus(filtered, itemsFilter);
        }
        
        renderProducts(filtered);
    });
    
    // Items filter
    $('#items-filter').on('change', function() {
        const itemsFilter = $(this).val();
        const category = $('#category-filter').val();
        
        let filtered = products;
        
        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }
        
        if (itemsFilter) {
            filtered = filterByStatus(filtered, itemsFilter);
        }
        
        renderProducts(filtered);
    });
    
    // Filter by status helper
    function filterByStatus(productsList, status) {
        if (status === 'in-stock') {
            return productsList.filter(p => p.status === 'In Stock');
        } else if (status === 'low-stock') {
            return productsList.filter(p => p.status === 'Low Stock');
        } else if (status === 'out-of-stock') {
            return productsList.filter(p => p.status === 'Out of Stock');
        }
        return productsList;
    }
    
    // Upload image button
    $('#uploadImageBtn').on('click', function() {
        $('#productImageInput').click();
    });
    
    // Handle image upload
    $('#productImageInput').on('change', function(e) {
        const files = e.target.files;
        if (files.length > 0) {
            alert(`${files.length} image(s) selected. Image upload functionality would be implemented here.`);
        }
    });
    
    // Add product form submission
    $('#addProductForm').on('submit', function(e) {
        e.preventDefault();
        
        const newProduct = {
            id: products.length + 1,
            name: $('#productName').val(),
            lot: `Lot ${String.fromCharCode(65 + products.length)}-${products.length + 1}`,
            category: $('#productCategory').val(),
            stock: parseInt($('#productStock').val()),
            minStock: 50,
            status: parseInt($('#productStock').val()) >= 50 ? 'In Stock' : 'Low Stock',
            price: parseFloat($('#productPrice').val()),
            restock: new Date().toISOString().split('T')[0],
            image: 'https://via.placeholder.com/45'
        };
        
        products.push(newProduct);
        renderProducts();
        
        $('#addProductModal').modal('hide');
        $('#addProductForm')[0].reset();
        
        alert(`Product "${newProduct.name}" added successfully!`);
    });
    
    // Edit button (placeholder)
    $(document).on('click', '.edit-btn', function() {
        const productId = $(this).data('product');
        alert(`Edit functionality for product ID ${productId} would be implemented here.`);
    });
    
    // More filters button (placeholder)
    $('#more-filters-btn').on('click', function() {
        alert('Advanced filters functionality would be implemented here.');
    });
    
    console.log('Inventory Admin page loaded with', products.length, 'products');
});
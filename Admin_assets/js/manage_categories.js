/**
 * Category Management for Admin Inventory
 * Handles adding, editing, and deleting categories
 */

$(document).ready(function() {
    let categories = [];
    
    // Load categories when modal opens
    $('#manageCategoriesModal').on('show.bs.modal', function() {
        loadCategories();
    });
    
    // Load all categories
    async function loadCategories() {
        const tbody = $('#categoriesTableBody');
        const loadingRow = tbody.find('.loading-row');
        
        try {
            // Show loading state
            tbody.html('<tr class="loading-row"><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin text-danger"></i> Loading categories...</td></tr>');
            
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const response = await fetch(`../api/manage_categories.php?t=${timestamp}`, {
                method: 'GET',
                credentials: 'include',
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const responseText = await response.text();
            console.log('[Load Categories] Response:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('[Load Categories] JSON Parse Error:', parseError);
                throw new Error('Invalid JSON response from server. Response: ' + responseText.substring(0, 200));
            }
            
            console.log('[Load Categories] Parsed Data:', data);
            
            if (data.success) {
                categories = data.categories || [];
                console.log('[Load Categories] Categories loaded:', categories.length);
                renderCategoriesTable(categories);
                // Also update category dropdowns
                updateCategoryDropdowns(categories);
                return true;
            } else {
                console.error('[Load Categories] API Error:', data.message);
                tbody.html('<tr><td colspan="5" class="text-center text-danger">Failed to load categories: ' + escapeHtml(data.message || 'Unknown error') + '</td></tr>');
                showError('Failed to load categories: ' + (data.message || 'Unknown error'), {
                    details: data
                });
                return false;
            }
        } catch (error) {
            console.error('[Load Categories] Error:', error);
            console.error('[Load Categories] Error Stack:', error.stack);
            tbody.html('<tr><td colspan="5" class="text-center text-danger">Error loading categories: ' + escapeHtml(error.message) + '</td></tr>');
            showError('Failed to load categories. Please try again.', {
                details: { error: error.message, stack: error.stack }
            });
            return false;
        }
    }
    
    // Render categories table
    function renderCategoriesTable(cats) {
        const tbody = $('#categoriesTableBody');
        tbody.empty();
        
        if (cats.length === 0) {
            tbody.html('<tr><td colspan="5" class="text-center text-muted">No categories found. Add your first category above.</td></tr>');
            return;
        }
        
        // Sort by display_order, then by name
        const sortedCats = [...cats].sort((a, b) => {
            if (a.display_order !== b.display_order) {
                return a.display_order - b.display_order;
            }
            return a.category_name.localeCompare(b.category_name);
        });
        
        sortedCats.forEach(category => {
            const statusBadge = category.is_active == 1 
                ? '<span class="badge badge-success">Active</span>' 
                : '<span class="badge badge-secondary">Inactive</span>';
            
            const row = `
                <tr>
                    <td>
                        <i class="${category.category_icon || 'fas fa-box'} mr-2"></i>
                        <strong>${escapeHtml(category.category_name)}</strong>
                    </td>
                    <td>${escapeHtml(category.category_description || '-')}</td>
                    <td>${category.display_order || 0}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-category-btn" data-id="${category.Category_ID}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger delete-category-btn" data-id="${category.Category_ID}" data-name="${escapeHtml(category.category_name)}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    }
    
    // Update category dropdowns in add/edit product modals
    function updateCategoryDropdowns(cats) {
        const activeCategories = cats.filter(c => c.is_active == 1);
        
        // Update category filter dropdown
        const filterDropdown = $('#category-filter');
        filterDropdown.find('option:not(:first)').remove();
        activeCategories.forEach(cat => {
            // For filter, use category_id as value for better filtering
            filterDropdown.append(`<option value="${cat.Category_ID}">${escapeHtml(cat.category_name)}</option>`);
        });
        
        // Update add product category dropdown - use category_id as value
        const addProductDropdown = $('#productCategory');
        addProductDropdown.find('option:not(:first)').remove();
        activeCategories.forEach(cat => {
            addProductDropdown.append(`<option value="${cat.Category_ID}">${escapeHtml(cat.category_name)}</option>`);
        });
        
        // Update edit product category dropdown - use category_id as value
        const editProductDropdown = $('#editProductCategory');
        editProductDropdown.find('option:not(:first)').remove();
        activeCategories.forEach(cat => {
            editProductDropdown.append(`<option value="${cat.Category_ID}">${escapeHtml(cat.category_name)}</option>`);
        });
    }
    
    // Add new category
    $('#addCategoryForm').on('submit', async function(e) {
        e.preventDefault();
        
        const categoryData = {
            category_name: $('#newCategoryName').val().trim(),
            category_description: $('#newCategoryDescription').val().trim(),
            category_icon: $('#newCategoryIcon').val().trim() || 'fas fa-box',
            display_order: parseInt($('#newCategoryOrder').val()) || 0,
            is_active: 1
        };
        
        if (!categoryData.category_name) {
            showError('Category name is required');
            return;
        }
        
        try {
            const response = await fetch('../api/manage_categories.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(categoryData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showSuccess('Category added successfully!', {
                    details: data
                });
                $('#addCategoryForm')[0].reset();
                $('#newCategoryIcon').val('fas fa-box');
                $('#newCategoryOrder').val(0);
                // Reload categories and update dropdowns
                await loadCategories();
            } else {
                showError(data.message || 'Failed to add category', {
                    details: data
                });
            }
        } catch (error) {
            console.error('Error adding category:', error);
            showError('Failed to add category. Please try again.', {
                details: { error: error.message }
            });
        }
    });
    
    // Edit category button click
    $(document).on('click', '.edit-category-btn', function() {
        const categoryId = $(this).data('id');
        const category = categories.find(c => c.Category_ID == categoryId);
        
        if (category) {
            $('#editCategoryId').val(category.Category_ID);
            $('#editCategoryName').val(category.category_name);
            $('#editCategoryDescription').val(category.category_description || '');
            $('#editCategoryIcon').val(category.category_icon || 'fas fa-box');
            $('#editCategoryOrder').val(category.display_order || 0);
            $('#editCategoryActive').prop('checked', category.is_active == 1);
            
            $('#editCategoryModal').modal('show');
        }
    });
    
    // Update category
    $('#editCategoryForm').on('submit', async function(e) {
        e.preventDefault();
        
        const categoryId = $('#editCategoryId').val();
        if (!categoryId) {
            showError('Category ID not found');
            return;
        }
        
        const categoryData = {
            category_id: parseInt(categoryId),
            category_name: $('#editCategoryName').val().trim(),
            category_description: $('#editCategoryDescription').val().trim(),
            category_icon: $('#editCategoryIcon').val().trim() || 'fas fa-box',
            display_order: parseInt($('#editCategoryOrder').val()) || 0,
            is_active: $('#editCategoryActive').is(':checked') ? 1 : 0
        };
        
        if (!categoryData.category_name) {
            showError('Category name is required');
            return;
        }
        
        try {
            const response = await fetch('../api/manage_categories.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(categoryData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showSuccess('Category updated successfully!', {
                    details: data
                });
                $('#editCategoryModal').modal('hide');
                // Reload categories and update dropdowns
                await loadCategories();
            } else {
                showError(data.message || 'Failed to update category', {
                    details: data
                });
            }
        } catch (error) {
            console.error('Error updating category:', error);
            showError('Failed to update category. Please try again.', {
                details: { error: error.message }
            });
        }
    });
    
    // Delete category button click
    $(document).on('click', '.delete-category-btn', async function() {
        const categoryId = $(this).data('id');
        const categoryName = $(this).data('name');
        const category = categories.find(c => c.Category_ID == categoryId);
        
        // First check if category has products by making a quick check
        let productCount = 0;
        if (category) {
            // We'll get the actual count from the API response
        }
        
        const confirmMessage = `Are you sure you want to delete the category "${categoryName}"?\n\n` +
            `Note: If this category has products assigned to it, it will be deactivated (hidden from dropdowns) instead of deleted.\n` +
            `Products will remain assigned to this category but won't be visible in category filters.`;
        
        // Use custom confirmation dialog
        const confirmed = await AdminNotifications.confirm(confirmMessage, {
            title: 'Delete Category',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            danger: true
        });
        
        if (confirmed) {
            await deleteCategory(categoryId, categoryName);
        }
    });
    
    // Delete category
    async function deleteCategory(categoryId, categoryName) {
        try {
            const response = await fetch('../api/manage_categories.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ category_id: parseInt(categoryId) })
            });
            
            const data = await response.json();
            
            if (data.success) {
                let message = data.message || 'Category deleted successfully!';
                
                // Show detailed message if category was deactivated
                if (data.action === 'deactivated' && data.product_count > 0) {
                    let productsList = '';
                    if (data.products && data.products.length > 0) {
                        const productNames = data.products.map(p => p.Product_Name).join(', ');
                        const moreText = data.product_count > data.products.length ? ` and ${data.product_count - data.products.length} more` : '';
                        productsList = `\n\nProducts affected: ${productNames}${moreText}`;
                    }
                    
                    message = `Category "${categoryName}" has been deactivated.\n\n` +
                        `This category has ${data.product_count} product(s) assigned to it.` +
                        productsList +
                        `\n\nThe category will no longer appear in dropdown menus, but products will still be visible.` +
                        `\n\nTo completely remove this category, first reassign or delete all products in this category.`;
                }
                
                showSuccess(message, {
                    details: data
                });
                // Reload categories and update dropdowns
                await loadCategories();
            } else {
                showError(data.message || 'Failed to delete category', {
                    details: data
                });
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            showError('Failed to delete category. Please try again.', {
                details: { error: error.message }
            });
        }
    }
    
    // Helper functions - use AdminNotifications if available, fallback to alerts
    function showSuccess(message, options = {}) {
        if (window.AdminNotifications) {
            AdminNotifications.success(message, { duration: 3000, ...options });
        } else {
            alert('Success: ' + message);
        }
    }
    
    function showError(message, options = {}) {
        if (window.AdminNotifications) {
            AdminNotifications.error(message, { duration: 5000, ...options });
        } else {
            alert('Error: ' + message);
        }
    }
    
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
    }
    
    // Load categories on page load to update dropdowns
    loadCategories();
});


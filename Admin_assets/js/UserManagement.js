$(document).ready(function() {
    // Filter functionality
    $('#roles-filter, #status-filter').change(function() {
        const roleFilter = $('#roles-filter').val();
        const statusFilter = $('#status-filter').val();
        console.log('Filter changed - Role:', roleFilter, 'Status:', statusFilter);
        // Add your filtering logic here
    });
    
    // Search functionality
    $('#user-search').on('input', function() {
        const searchTerm = $(this).val();
        console.log('Search term:', searchTerm);
        // Add your search logic here
    });
    
    // Select all checkbox functionality
    $('#select-all').change(function() {
        const isChecked = $(this).is(':checked');
        $('.user-checkbox').prop('checked', isChecked);
        console.log('Select all:', isChecked);
    });
    
    // Individual checkbox functionality
    $('.user-checkbox').change(function() {
        const userId = $(this).data('user');
        const isChecked = $(this).is(':checked');
        console.log('User selected:', userId, 'Checked:', isChecked);
        
        // Update select all checkbox
        const totalCheckboxes = $('.user-checkbox').length;
        const checkedCheckboxes = $('.user-checkbox:checked').length;
        $('#select-all').prop('checked', totalCheckboxes === checkedCheckboxes);
    });
    
    // Add User button functionality
    $('#add-user-btn').click(function() {
        console.log('Add User button clicked');
    });
    
    // User action buttons
    $('.view-btn').click(function() {
        const userId = $(this).data('user');
        console.log('View user:', userId);
    });
    
    $('.edit-btn').click(function() {
        const userId = $(this).data('user');
        const userRow = $(this).closest('.user-row');
        
        // Get user data from the row
        const userName = userRow.find('.user-name').text();
        const userEmail = userRow.find('.user-email').text();
        const userRole = userRow.find('.user-role').text();
        
        // Split name into first and last name
        const nameParts = userName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Populate edit modal with user data
        $('#firstName').val(firstName);
        $('#lastName').val(lastName);
        $('#emailAddress').val(userEmail);
        $('#userRole').val(userRole.toLowerCase());
        
        // Set status based on current status
        const currentStatus = userRow.find('.status-badge').text().toLowerCase();
        if (currentStatus.includes('active')) {
            $('input[name="userStatus"][value="active"]').prop('checked', true);
        } else if (currentStatus.includes('archived')) {
            $('input[name="userStatus"][value="archived"]').prop('checked', true);
        } else {
            $('input[name="userStatus"][value="inactive"]').prop('checked', true);
        }
        
        console.log('Edit user:', userId, 'Name:', userName);
    });
    
    $('.delete-btn').click(function() {
        const userId = $(this).data('user');
        const userName = $(this).closest('.user-row').find('.user-name').text();
        
        if (confirm('Are you sure you want to delete user: ' + userName + '?')) {
            console.log('Delete user:', userId);
            // Add your delete user functionality here
        }
    });
    
    // Role selection in permissions modal
    $('.role-item').click(function() {
        $('.role-item').removeClass('active');
        $(this).addClass('active');
        
        const selectedRole = $(this).data('role');
        const roleTitle = $(this).find('span').text();
        
        $('.permissions-section h4').text(roleTitle + ' Permissions');
        console.log('Role selected:', selectedRole);
        
        // Load permissions for selected role
        loadPermissionsForRole(selectedRole);
    });
    
    // Permission checkbox functionality
    $('.permission-checkbox').change(function() {
        const permissionName = $(this).closest('.permission-item').find('span').text();
        const isChecked = $(this).is(':checked');
        console.log('Permission changed:', permissionName, 'Checked:', isChecked);
    });
    
    // Save permissions functionality
    $('#save-permissions-btn').click(function() {
        const selectedRole = $('.role-item.active').data('role');
        const permissions = [];
        
        $('.permission-checkbox:checked').each(function() {
            const permissionName = $(this).closest('.permission-item').find('span').text();
            permissions.push(permissionName);
        });
        
        console.log('Save permissions for role:', selectedRole, 'Permissions:', permissions);
        $('#permissionManagementModal').modal('hide');
    });
    
    // Edit user form submission
    $('#editUserForm').submit(function(e) {
        e.preventDefault();
        
        const formData = {
            firstName: $('#firstName').val(),
            lastName: $('#lastName').val(),
            email: $('#emailAddress').val(),
            phone: $('#phoneNumber').val(),
            role: $('#userRole').val(),
            password: $('#userPassword').val(),
            confirmPassword: $('#confirmPassword').val(),
            status: $('input[name="userStatus"]:checked').val()
        };
        
        // Basic validation
        if (formData.password && formData.password !== formData.confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        
        console.log('Save user edit:', formData);
        $('#editUserModal').modal('hide');
    });
    
    // Pagination functionality
    $('#prev-btn').click(function() {
        console.log('Previous page clicked');
    });
    
    $('#next-btn').click(function() {
        console.log('Next page clicked');
    });
    
    // Function to load permissions for a specific role
    function loadPermissionsForRole(role) {
        // Reset all checkboxes first
        $('.permission-checkbox').prop('checked', false);
        
        // Set permissions based on role
        if (role === 'admin') {
            // Admin permissions as shown in reference
            $('span:contains("View Users")').prev('.permission-checkbox').prop('checked', true);
            $('span:contains("Create Users")').prev('.permission-checkbox').prop('checked', true);
            $('span:contains("Edit Users")').prev('.permission-checkbox').prop('checked', true);
            $('span:contains("View Orders")').prev('.permission-checkbox').prop('checked', true);
            $('span:contains("Edit Orders")').prev('.permission-checkbox').prop('checked', true);
            $('span:contains("Export Orders")').prev('.permission-checkbox').prop('checked', true);
            $('span:contains("View Inventory")').prev('.permission-checkbox').prop('checked', true);
            $('span:contains("View Deliveries")').prev('.permission-checkbox').prop('checked', true);
        } else if (role === 'employee') {
            // Employee has limited permissions
            $('span:contains("View Users")').prev('.permission-checkbox').prop('checked', true);
            $('span:contains("View Orders")').prev('.permission-checkbox').prop('checked', true);
            $('span:contains("View Inventory")').prev('.permission-checkbox').prop('checked', true);
            $('span:contains("View Deliveries")').prev('.permission-checkbox').prop('checked', true);
        } else if (role === 'delivery-driver') {
            // Delivery driver has very limited permissions
            $('span:contains("View Deliveries")').prev('.permission-checkbox').prop('checked', true);
            $('span:contains("Update Status")').prev('.permission-checkbox').prop('checked', true);
        }
    }
});
$(document).ready(function() {
    // Profile picture change functionality
    $('.profile-status-indicator').on('click', function() {
        // Create a file input element
        const fileInput = $('<input type="file" accept="image/*" style="display: none;">');
        
        // Handle file selection
        fileInput.on('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    $('.profile-img').attr('src', e.target.result);
                    console.log('Profile picture updated');
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Trigger file input
        fileInput.click();
    });
    
    // Edit icon functionality for form fields
    $('.input-edit-icon').on('click', function() {
        const input = $(this).siblings('.form-input');
        
        // Toggle readonly state
        if (input.prop('readonly')) {
            input.prop('readonly', false);
            input.focus();
            $(this).removeClass('fa-edit').addClass('fa-save');
            console.log('Editing enabled for field');
        } else {
            input.prop('readonly', true);
            $(this).removeClass('fa-save').addClass('fa-edit');
            console.log('Changes saved for field');
            
            // Here you would typically save the data to your backend
            // For now, we'll just log the value
            console.log('Field value:', input.val());
        }
    });
    
    // Initially set all inputs to readonly
    $('.form-input').prop('readonly', true);
    
    // Focus and blur effects for form inputs
    $('.form-input').on('focus', function() {
        if (!$(this).prop('readonly')) {
            $(this).parent().addClass('editing');
        }
    });
    
    $('.form-input').on('blur', function() {
        $(this).parent().removeClass('editing');
    });
    
    // Bottom logout button functionality
    $('.logout-btn').on('click', function(e) {
        e.preventDefault();
        
        // Optional: Add confirmation dialog
        if (confirm('Are you sure you want to logout?')) {
            console.log('Logging out...');
            window.location.href = '../Admin/AdminLogin.html';
        }
    });
    
    // Sidebar logout button functionality
    $('.logout-button').on('click', function() {
        console.log('Logging out from sidebar...');
        // The onclick handler in HTML will handle the redirect
    });
    
    // Sample data for demonstration (you can remove this in production)
    const sampleUserData = {
        firstName: 'John',
        lastName: 'Admin',
        email: 'admin@matarix.com',
        phone: '+1 (555) 123-4567',
        name: 'John Admin'
    };
    
    // Load sample data (optional - for demonstration)
    function loadSampleData() {
        $('.form-input[type="text"]').first().val(sampleUserData.firstName);
        $('.form-input[type="text"]').last().val(sampleUserData.lastName);
        $('.form-input[type="email"]').val(sampleUserData.email);
        $('.form-input[type="tel"]').val(sampleUserData.phone);
        $('.profile-name').text(sampleUserData.name);
    }
    
    // Uncomment the line below to load sample data
    // loadSampleData();
    
    // Handle profile form submission (if you want to add a save button later)
    $('.profile-form').on('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            firstName: $('.form-input[type="text"]').first().val(),
            lastName: $('.form-input[type="text"]').last().val(),
            email: $('.form-input[type="email"]').val(),
            phone: $('.form-input[type="tel"]').val(),
            password: $('.form-input[type="password"]').val()
        };
        
        console.log('Profile form submitted:', formData);
        
        // Here you would send the data to your backend
        alert('Profile updated successfully!');
    });
    
    // Profile picture hover effect
    $('.profile-picture').on('mouseenter', function() {
        $(this).find('.profile-status-indicator').css('transform', 'scale(1.1)');
    });
    
    $('.profile-picture').on('mouseleave', function() {
        $(this).find('.profile-status-indicator').css('transform', 'scale(1)');
    });
    
    // Phone number formatting
    $('.form-input[type="tel"]').on('input', function() {
        let value = $(this).val().replace(/\D/g, '');
        
        if (value.length > 11) {
            value = value.substr(0, 11);
        }
        
        if (value.length >= 7) {
            value = value.replace(/(\d{1})(\d{3})(\d{3})(\d{1,4})/, '+$1 ($2) $3-$4');
        } else if (value.length >= 4) {
            value = value.replace(/(\d{1})(\d{3})(\d{1,3})/, '+$1 ($2) $3');
        } else if (value.length >= 1) {
            value = value.replace(/(\d{1})(\d{0,3})/, '+$1 ($2');
        }
        
        $(this).val(value);
    });
});
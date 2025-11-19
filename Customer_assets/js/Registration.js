$(document).ready(function() {
    // Handle form submission
    $('#registrationForm').on('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const formData = {
            email: $('#email').val().trim(),
            first_name: $('#first_name').val().trim(),
            last_name: $('#last_name').val().trim(),
            middle_name: $('#middle_name').val().trim(),
            phone_number: $('#phone_number').val().replace(/\D/g, ''), // Remove non-digits
            password: $('#password').val(),
            confirm_password: $('#confirm_password').val(),
            address: $('#address').val().trim()
        };
        
        // Validate inputs
        if (!validateForm(formData)) {
            return;
        }
        
        // Disable button and show loading state
        const $signupButton = $('#signupButton');
        $signupButton.prop('disabled', true).text('CREATING ACCOUNT...');
        
        // Hide previous messages
        $('#registrationMessage').hide();
        
        // Remove confirm_password from data sent to API
        delete formData.confirm_password;
        
        // Send registration request to API
        $.ajax({
            url: '../api/register.php',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                    showMessage('Registration successful! Redirecting to login...', 'success');
                    
                    // Store user data in sessionStorage (optional)
                    if (response.user_id) {
                        sessionStorage.setItem('registered_user_id', response.user_id);
                    }
                    
                    // Redirect to login page after short delay
                    setTimeout(function() {
                        window.location.href = '../Customer/Login.html';
                    }, 2000);
                } else {
                    showMessage(response.message || 'Registration failed. Please try again.', 'error');
                    $signupButton.prop('disabled', false).text('Sign Up');
                }
            },
            error: function(xhr) {
                let errorMessage = 'An error occurred. Please try again.';
                
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                } else if (xhr.status === 0) {
                    errorMessage = 'Unable to connect to server. Please check your connection.';
                } else if (xhr.status === 409) {
                    errorMessage = 'Email already registered. Please use a different email or login.';
                }
                
                showMessage(errorMessage, 'error');
                $signupButton.prop('disabled', false).text('Sign Up');
            }
        });
    });
    
    // Form validation function
    function validateForm(data) {
        // Check required fields
        if (!data.email || !data.first_name || !data.last_name || !data.phone_number || 
            !data.password || !data.confirm_password || !data.address) {
            showMessage('Please fill in all required fields', 'error');
            return false;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            showMessage('Please enter a valid email address', 'error');
            return false;
        }
        
        // Validate password length
        if (data.password.length < 6) {
            showMessage('Password must be at least 6 characters long', 'error');
            return false;
        }
        
        // Validate password match
        if (data.password !== data.confirm_password) {
            showMessage('Passwords do not match', 'error');
            return false;
        }
        
        // Validate phone number (should be numeric and reasonable length)
        const phoneNumber = data.phone_number.replace(/\D/g, '');
        if (phoneNumber.length < 10 || phoneNumber.length > 15) {
            showMessage('Please enter a valid phone number (10-15 digits)', 'error');
            return false;
        }
        
        // Validate name fields (should not contain numbers or special characters)
        const nameRegex = /^[a-zA-Z\s'-]+$/;
        if (data.first_name && !nameRegex.test(data.first_name)) {
            showMessage('First name should only contain letters', 'error');
            return false;
        }
        if (data.last_name && !nameRegex.test(data.last_name)) {
            showMessage('Last name should only contain letters', 'error');
            return false;
        }
        if (data.middle_name && !nameRegex.test(data.middle_name)) {
            showMessage('Middle name should only contain letters', 'error');
            return false;
        }
        
        return true;
    }
    
    // Function to show messages
    function showMessage(message, type) {
        const $messageDiv = $('#registrationMessage');
        $messageDiv.removeClass('alert-success alert-danger')
                   .addClass(type === 'success' ? 'alert-success' : 'alert-danger')
                   .text(message)
                   .fadeIn();
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(function() {
                $messageDiv.fadeOut();
            }, 3000);
        }
    }
    
    // Real-time password match validation
    $('#confirm_password').on('keyup', function() {
        const password = $('#password').val();
        const confirmPassword = $(this).val();
        
        if (confirmPassword && password !== confirmPassword) {
            $(this).css('border-color', '#dc3545');
        } else if (confirmPassword) {
            $(this).css('border-color', '#28a745');
        } else {
            $(this).css('border-color', '');
        }
    });
    
    // Format mobile number input
    $('#phone_number').on('input', function() {
        let value = $(this).val().replace(/\D/g, '');
        
        // Limit to 15 digits (international format)
        if (value.length > 15) {
            value = value.substr(0, 15);
        }
        
        // Format as XXX-XXX-XXXX (Philippines format) or keep as is for international
        if (value.length >= 7) {
            // Format for Philippine numbers (11 digits: 09XX-XXX-XXXX)
            if (value.length <= 11) {
                value = value.replace(/(\d{4})(\d{3})(\d{1,4})/, '$1-$2-$3');
            }
        }
        
        $(this).val(value);
    });
    
    // Focus and blur effects for form inputs
    $('.form-input').on('focus', function() {
        $(this).parent().addClass('focused');
    });
    
    $('.form-input').on('blur', function() {
        if ($(this).val() === '') {
            $(this).parent().removeClass('focused');
        }
    });
    
    // Add visual feedback when typing
    $('.form-input').on('input', function() {
        if ($(this).val().length > 0) {
            $(this).parent().addClass('has-content');
        } else {
            $(this).parent().removeClass('has-content');
        }
    });
});

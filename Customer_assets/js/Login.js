$(document).ready(function() {
    // Simple login button click handler - no validation, just redirect
    $('.login-button').on('click', function(e) {
        e.preventDefault();
           
        // Redirect immediately to orders admin page
        window.location.href = '../Customer/MainPage.html';
    });
    
    // Optional: Allow Enter key to submit form
    $('.form-input').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            e.preventDefault();
            $('.login-button').click();
        }
    });
    
    // Focus and blur effects for form inputs (visual enhancement only)
    $('.form-input').on('focus', function() {
        $(this).parent().addClass('focused');
        $(this).siblings('.input-icon').css('color', '#d32f2f');
    });
    
    $('.form-input').on('blur', function() {
        if ($(this).val() === '') {
            $(this).parent().removeClass('focused');
        }
        $(this).siblings('.input-icon').css('color', '#999');
    });
    
    // Add some visual feedback when typing
    $('.form-input').on('input', function() {
        if ($(this).val().length > 0) {
            $(this).parent().addClass('has-content');
        } else {
            $(this).parent().removeClass('has-content');
        }
    });
});
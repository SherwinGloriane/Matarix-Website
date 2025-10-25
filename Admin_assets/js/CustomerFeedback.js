// CUSTOMER FEEDBACK PAGE JAVASCRIPT
$(document).ready(function() {
    // Filter functionality
    $('#ratings-filter, #time-filter').change(function() {
        const ratingFilter = $('#ratings-filter').val();
        const timeFilter = $('#time-filter').val();
        console.log('Filter changed - Rating:', ratingFilter, 'Time:', timeFilter);
        // Add your filtering logic here
    });
    
    // Reply button functionality
    $('.reply-btn').click(function() {
        const reviewId = $(this).attr('id');
        console.log('Reply clicked for:', reviewId);
        // Add your reply functionality here
    });
    
    // Helpful button functionality
    $('.helpful-btn').click(function() {
        const reviewId = $(this).attr('id');
        const button = $(this);
        
        // Toggle helpful state
        if (button.hasClass('marked-helpful')) {
            button.removeClass('marked-helpful');
            button.find('span').text('Mark as Helpful');
            console.log('Removed helpful mark for:', reviewId);
        } else {
            button.addClass('marked-helpful');
            button.find('span').text('Marked as Helpful');
            console.log('Marked as helpful:', reviewId);
        }
    });
    
    // Header action buttons
    $('#messages-btn').click(function() {
        console.log('Messages button clicked');
    });
    
    $('#cart-btn').click(function() {
        console.log('Cart button clicked');
    });
    
    $('#profile-btn').click(function() {
        console.log('Profile button clicked');
    });
    
    // Logout button
    $('#logout-btn').click(function() {
        console.log('Logout clicked');
        // Add your logout functionality here
    });
});
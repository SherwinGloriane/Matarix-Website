// deliveries-admin.js - Delivery Management JavaScript

$(document).ready(function() {
    // Tab switching functionality
    $('.tab-btn').click(function() {
        // Get the target tab
        const targetTab = $(this).data('tab');
        
        // Remove active class from all tabs and content
        $('.tab-btn').removeClass('active');
        $('.tab-content').removeClass('active');
        
        // Add active class to clicked tab
        $(this).addClass('active');
        
        // Show corresponding content
        $('#' + targetTab + '-content').addClass('active');
        
        console.log('Switched to tab:', targetTab);
    });
    
    // DELIVERY DETAILS MODAL FUNCTIONALITY
    $('.view-btn').click(function() {
        const buttonId = $(this).attr('id');
        
        // Check if it's a delivery view button
        if (buttonId && buttonId.includes('view-delivery')) {
            // Extract delivery data from the closest delivery card
            const deliveryCard = $(this).closest('.delivery-card');
            const deliveryCode = deliveryCard.find('.delivery-code').text();
            const customerName = deliveryCard.find('.customer-name').text();
            const driverName = deliveryCard.find('.driver-name').text();
            const deliveryAddress = deliveryCard.find('.delivery-address').text();
            const deliveryItems = deliveryCard.find('.delivery-items').text();
            
            // Populate modal with delivery data
            $('#modal-delivery-code').text(deliveryCode);
            $('#modal-customer-name').text(customerName);
            $('#modal-order-id').text('ORD-2025-001234'); // Default order ID
            $('#modal-driver-name').text(driverName);
            $('#modal-vehicle-info').text('Truck-001 (ABC-1234)'); // Default vehicle info
            $('#modal-delivery-address').text(deliveryAddress);
            $('#modal-delivery-items').text(deliveryItems.replace(/^\d+\.\d+\s*km\s*/, '')); // Remove distance prefix
            $('#modal-distance').text('8.5 km'); // Default distance
            $('#modal-progress-status').text('In Transit');
            
            // Show delivery details modal
            $('#deliveryDetailsModal').modal('show');
            console.log('Showing delivery details for:', deliveryCode);
        }
        
        // Check if it's a driver view button
        else if (buttonId && buttonId.includes('view-driver')) {
            // Extract driver data from the closest driver row
            const driverRow = $(this).closest('.driver-row');
            const driverName = driverRow.find('.driver-name').text();
            const vehicleId = driverRow.find('.vehicle-id').text();
            const deliveryId = driverRow.find('.delivery-id').text();
            const location = driverRow.find('.location').text();
            
            // Populate modal with driver data
            $('#modal-driver-profile-name').text(driverName);
            $('#modal-driver-phone').text('+63 912 345 6789'); // Default phone
            $('#modal-driver-vehicle').text('Truck-001 (' + vehicleId + ')');
            $('#modal-driver-delivery').text(deliveryId);
            $('#modal-driver-location').text(location);
            
            // Show driver profile modal
            $('#driverProfileModal').modal('show');
            console.log('Showing driver profile for:', driverName);
        }
        
        // Default view action for other buttons
        else {
            const target = $(this).data('driver') || $(this).data('vehicle') || $(this).attr('id');
            console.log('View action clicked for:', target);
        }
    });
    
    // EDIT BUTTON FUNCTIONALITY
    $('.edit-btn').click(function() {
        const target = $(this).data('driver') || $(this).data('vehicle') || $(this).attr('id');
        console.log('Edit action clicked for:', target);
        // Add your edit functionality here
    });
    
    // MORE OPTIONS BUTTON FUNCTIONALITY
    $('.more-btn').click(function() {
        const deliveryId = $(this).attr('id').replace('more-delivery-', '');
        console.log('More options clicked for delivery:', deliveryId);
        // Add your more options functionality here
    });
    
    // ADD BUTTONS FUNCTIONALITY
    $('#add-driver-btn').click(function() {
        console.log('Add Driver button clicked');
        // Add your add driver functionality here
    });
    
    $('#add-fleet-btn').click(function() {
        console.log('Add Fleet button clicked');
        // Add your add fleet functionality here
    });
    
    // FILTER AND EXPORT BUTTONS
    $('#filter-btn').click(function() {
        console.log('Filter button clicked');
        // Add your filter functionality here
    });
    
    $('#export-btn').click(function() {
        console.log('Export button clicked');
        // Add your export functionality here
    });
    
    // MODAL CLOSE FUNCTIONALITY
    $('.close-modal-btn').click(function() {
        $(this).closest('.modal').modal('hide');
        console.log('Modal closed');
    });
});
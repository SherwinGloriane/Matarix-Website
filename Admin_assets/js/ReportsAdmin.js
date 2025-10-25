// reports-admin.js - Sales and Report Analytics JavaScript

$(document).ready(function() {
    
    // Filter buttons functionality
    $('.products-filters .filter-btn').click(function() {
        // Remove active class from all filter buttons
        $('.products-filters .filter-btn').removeClass('active');
        
        // Add active class to clicked button
        $(this).addClass('active');
        
        const filterId = $(this).attr('id');
        console.log('Filter applied:', filterId);
        
        // Here you would typically filter the table data based on the selected filter
        // For now, we'll just log the action
        switch(filterId) {
            case 'last-30-days-btn':
                console.log('Filtering by last 30 days');
                break;
            case 'all-categories-btn':
                console.log('Showing all categories');
                break;
            case 'overview-btn':
                console.log('Showing overview');
                break;
        }
    });
    
    // Details buttons functionality
    $('.details-btn').click(function() {
        const buttonId = $(this).attr('id');
        const productRow = $(this).closest('tr');
        const productName = productRow.find('.product-name').text();
        
        console.log('Details clicked for:', productName);
        console.log('Button ID:', buttonId);
        
        // Here you would typically open a detailed analytics modal or navigate to a detailed page
        alert(`Viewing detailed analytics for: ${productName}`);
        
        // You could also extract more data from the row
        const revenue = productRow.find('.revenue-amount').text();
        const units = productRow.find('.units-sold').text();
        const growth = productRow.find('.growth-percentage').text();
        
        console.log('Product details:', {
            name: productName,
            revenue: revenue,
            units: units,
            growth: growth
        });
    });
    
    
    // Export report button functionality
    $('#export-report-btn').click(function() {
        console.log('Export Report button clicked');
        // Here you would typically generate and download a report file
        alert('Exporting report... (This would download a file in a real implementation)');
        
        // Simulate export process
        const exportData = {
            timestamp: new Date().toISOString(),
            reportType: 'Top Performing Products',
            totalRevenue: '₱2,450,890',
            totalOrders: '1,785',
            avgOrderValue: '₱1,965',
            newCustomers: '189'
        };
        
        console.log('Export data:', exportData);
    });
    
    // Generate report button functionality
    $('#generate-report-btn').click(function() {
        console.log('Generate Report button clicked');
        // Here you would typically generate a custom report
        alert('Generating custom report...');
        
        // You could open a modal for report configuration
        // or navigate to a report builder page
    });
    
    // Table row hover effects (optional enhancement)
    $('.product-analytics-row').hover(
        function() {
            // Mouse enter
            $(this).find('.details-btn').css('opacity', '1');
        },
        function() {
            // Mouse leave
            $(this).find('.details-btn').css('opacity', '0.8');
        }
    );
    
    // Initialize tooltips if needed (Bootstrap tooltip functionality)
    $('[data-toggle="tooltip"]').tooltip();
    
    // Auto-refresh data every 5 minutes (optional)
    // setInterval(function() {
    //     console.log('Auto-refreshing analytics data...');
    //     // Here you would fetch updated data from your API
    //     // refreshAnalyticsData();
    // }, 300000); // 5 minutes
    
    // Function to format numbers with commas (utility function)
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    
    // Function to update analytics cards (for dynamic updates)
    function updateAnalyticsCard(cardSelector, value, change) {
        $(cardSelector + ' .card-value').text(value);
        $(cardSelector + ' .card-change span').text(change);
    }
    
    // Example usage:
    // updateAnalyticsCard('.analytics-card:first', '₱2,500,000', '+45.51% from last month');
    
    console.log('Reports Admin JavaScript initialized successfully');
});
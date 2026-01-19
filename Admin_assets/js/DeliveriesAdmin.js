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
        
        // If switching to delivery history tab, ensure deliveries are loaded
        if (targetTab === 'delivery-history') {
            // Trigger a refresh if deliveries haven't been loaded yet
            if (typeof loadDeliveries === 'function') {
                loadDeliveries();
            }
        }
        
        // If switching to drivers tab, load drivers
        if (targetTab === 'drivers') {
            if (typeof loadDrivers === 'function') {
                loadDrivers();
            }
        }
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
        if (typeof addDriver === 'function') {
            addDriver();
        } else {
            alert('Add driver function not loaded. Please refresh the page.');
        }
    });
    
    $('#add-fleet-btn').click(function() {
        console.log('Add Fleet button clicked');
        if (typeof addFleetVehicle === 'function') {
            addFleetVehicle();
        } else {
            alert('Add fleet function not loaded. Please refresh the page.');
        }
    });
    
    // FILTER AND EXPORT BUTTONS
    $('#filter-btn').click(function() {
        console.log('Filter button clicked');
        openFilterModal();
    });
    
    $('#export-btn').click(function() {
        console.log('Export button clicked');
        exportDeliveriesToPDF();
    });
    
    // Filter modal functionality
    $('#applyFiltersBtn').click(function() {
        applyFilters();
    });
    
    $('#clearFiltersBtn').click(function() {
        clearFilters();
    });
    
    // Load filter options when modal opens
    $('#filterModal').on('show.bs.modal', function() {
        loadFilterOptions();
    });
    
    // MODAL CLOSE FUNCTIONALITY
    $('.close-modal-btn').click(function() {
        $(this).closest('.modal').modal('hide');
        console.log('Modal closed');
    });
});

// Global filter state
let currentFilters = {
    status: 'all',
    driver: 'all',
    vehicle: 'all',
    dateFrom: '',
    dateTo: '',
    customer: '',
    deliveryCode: ''
};

// Open filter modal
function openFilterModal() {
    $('#filterModal').modal('show');
}

// Load filter options (drivers and vehicles)
async function loadFilterOptions() {
    try {
        // Load drivers
        const driversResponse = await fetch('../api/get_delivery_drivers.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (driversResponse.ok) {
            const driversData = await driversResponse.json();
            if (driversData.success && driversData.drivers) {
                const driverSelect = document.getElementById('filterDriver');
                const currentValue = driverSelect.value;
                driverSelect.innerHTML = '<option value="all">All Drivers</option><option value="unassigned">Unassigned</option>';
                
                driversData.drivers.forEach(driver => {
                    const option = document.createElement('option');
                    option.value = driver.user_id;
                    option.textContent = driver.full_name;
                    driverSelect.appendChild(option);
                });
                
                if (currentValue) {
                    driverSelect.value = currentValue;
                }
            }
        }
        
        // Load vehicles
        const vehiclesResponse = await fetch('../api/get_fleet.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (vehiclesResponse.ok) {
            const vehiclesData = await vehiclesResponse.json();
            if (vehiclesData.success && vehiclesData.fleet) {
                const vehicleSelect = document.getElementById('filterVehicle');
                const currentValue = vehicleSelect.value;
                vehicleSelect.innerHTML = '<option value="all">All Vehicles</option><option value="unassigned">Unassigned</option>';
                
                vehiclesData.fleet.forEach(vehicle => {
                    const option = document.createElement('option');
                    option.value = vehicle.vehicle_id;
                    option.textContent = vehicle.vehicle_model;
                    vehicleSelect.appendChild(option);
                });
                
                if (currentValue) {
                    vehicleSelect.value = currentValue;
                }
            }
        }
        
        // Restore filter values
        if (currentFilters.status) $('#filterStatus').val(currentFilters.status);
        if (currentFilters.driver) $('#filterDriver').val(currentFilters.driver);
        if (currentFilters.vehicle) $('#filterVehicle').val(currentFilters.vehicle);
        if (currentFilters.dateFrom) $('#filterDateFrom').val(currentFilters.dateFrom);
        if (currentFilters.dateTo) $('#filterDateTo').val(currentFilters.dateTo);
        if (currentFilters.customer) $('#filterCustomer').val(currentFilters.customer);
        if (currentFilters.deliveryCode) $('#filterDeliveryCode').val(currentFilters.deliveryCode);
        
        updateActiveFiltersDisplay();
    } catch (error) {
        console.error('[Load Filter Options] Error:', error);
    }
}

// Apply filters
function applyFilters() {
    // Get filter values
    currentFilters = {
        status: $('#filterStatus').val() || 'all',
        driver: $('#filterDriver').val() || 'all',
        vehicle: $('#filterVehicle').val() || 'all',
        dateFrom: $('#filterDateFrom').val() || '',
        dateTo: $('#filterDateTo').val() || '',
        customer: $('#filterCustomer').val() || '',
        deliveryCode: $('#filterDeliveryCode').val() || ''
    };
    
    // Close modal
    $('#filterModal').modal('hide');
    
    // Apply filters to displayed deliveries
    filterDeliveries();
    
    // Update filter button badge
    updateFilterButtonBadge();
    
    console.log('[Apply Filters] Filters applied:', currentFilters);
}

// Clear all filters
function clearFilters() {
    $('#filterStatus').val('all');
    $('#filterDriver').val('all');
    $('#filterVehicle').val('all');
    $('#filterDateFrom').val('');
    $('#filterDateTo').val('');
    $('#filterCustomer').val('');
    $('#filterDeliveryCode').val('');
    
    currentFilters = {
        status: 'all',
        driver: 'all',
        vehicle: 'all',
        dateFrom: '',
        dateTo: '',
        customer: '',
        deliveryCode: ''
    };
    
    updateActiveFiltersDisplay();
    filterDeliveries();
    updateFilterButtonBadge();
}

// Filter deliveries based on current filters
function filterDeliveries() {
    const activeContainer = document.querySelector('#active-deliveries-content .delivery-cards');
    const historyContainer = document.getElementById('delivery-history-cards');
    
    // Get all delivery cards
    const allCards = document.querySelectorAll('.delivery-card');
    
    let visibleCount = 0;
    
    allCards.forEach(card => {
        let shouldShow = true;
        
        // Get delivery data from card
        const deliveryId = card.getAttribute('data-delivery-id');
        const orderId = card.getAttribute('data-order-id');
        const status = card.getAttribute('data-status') || card.querySelector('.delivery-status-dropdown')?.value || 'Pending';
        const driverId = card.getAttribute('data-driver-id') || card.querySelector('.driver-name')?.getAttribute('data-driver-id') || '';
        const vehicleId = card.getAttribute('data-vehicle-id') || card.querySelector('.vehicle-name')?.getAttribute('data-vehicle-id') || '';
        const driverName = card.querySelector('.driver-name')?.textContent?.trim() || '';
        const vehicleName = card.querySelector('.vehicle-name')?.textContent?.trim() || '';
        const customerName = card.querySelector('.customer-name')?.textContent?.trim() || '';
        const deliveryCode = card.querySelector('.delivery-code')?.textContent?.trim() || '';
        const createdDate = card.getAttribute('data-created-date') || '';
        
        // Apply status filter
        if (currentFilters.status !== 'all' && status !== currentFilters.status) {
            shouldShow = false;
        }
        
        // Apply driver filter
        if (currentFilters.driver !== 'all') {
            if (currentFilters.driver === 'unassigned') {
                if (driverId && driverId !== '') {
                    shouldShow = false;
                }
            } else {
                if (driverId !== currentFilters.driver) {
                    shouldShow = false;
                }
            }
        }
        
        // Apply vehicle filter
        if (currentFilters.vehicle !== 'all') {
            if (currentFilters.vehicle === 'unassigned') {
                if (vehicleId && vehicleId !== '') {
                    shouldShow = false;
                }
            } else {
                if (vehicleId !== currentFilters.vehicle) {
                    shouldShow = false;
                }
            }
        }
        
        // Apply date filters
        if (currentFilters.dateFrom && createdDate) {
            const cardDate = new Date(createdDate);
            const filterDate = new Date(currentFilters.dateFrom);
            if (cardDate < filterDate) {
                shouldShow = false;
            }
        }
        
        if (currentFilters.dateTo && createdDate) {
            const cardDate = new Date(createdDate);
            const filterDate = new Date(currentFilters.dateTo);
            filterDate.setHours(23, 59, 59); // Include entire day
            if (cardDate > filterDate) {
                shouldShow = false;
            }
        }
        
        // Apply customer filter
        if (currentFilters.customer) {
            const searchTerm = currentFilters.customer.toLowerCase();
            if (!customerName.toLowerCase().includes(searchTerm)) {
                shouldShow = false;
            }
        }
        
        // Apply delivery code filter
        if (currentFilters.deliveryCode) {
            const searchTerm = currentFilters.deliveryCode.toLowerCase();
            if (!deliveryCode.toLowerCase().includes(searchTerm)) {
                shouldShow = false;
            }
        }
        
        // Show/hide card
        if (shouldShow) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show message if no deliveries match
    if (visibleCount === 0) {
        const activeTab = $('.tab-btn.active').data('tab');
        const container = activeTab === 'active-deliveries' 
            ? activeContainer 
            : historyContainer;
        
        if (container && container.querySelectorAll('.delivery-card[style=""]').length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'text-center py-5';
            noResults.innerHTML = '<p class="text-muted">No deliveries match the current filters.</p>';
            container.appendChild(noResults);
        }
    }
    
    console.log('[Filter Deliveries] Visible deliveries:', visibleCount);
}

// Update active filters display
function updateActiveFiltersDisplay() {
    const activeFiltersList = document.getElementById('activeFiltersList');
    const activeFiltersDiv = document.getElementById('activeFilters');
    
    if (!activeFiltersList) return;
    
    const activeFilters = [];
    
    if (currentFilters.status !== 'all') {
        activeFilters.push(`Status: ${currentFilters.status}`);
    }
    if (currentFilters.driver !== 'all') {
        const driverSelect = document.getElementById('filterDriver');
        const driverText = driverSelect.options[driverSelect.selectedIndex]?.text || 'Driver';
        activeFilters.push(`Driver: ${driverText}`);
    }
    if (currentFilters.vehicle !== 'all') {
        const vehicleSelect = document.getElementById('filterVehicle');
        const vehicleText = vehicleSelect.options[vehicleSelect.selectedIndex]?.text || 'Vehicle';
        activeFilters.push(`Vehicle: ${vehicleText}`);
    }
    if (currentFilters.dateFrom) {
        activeFilters.push(`From: ${currentFilters.dateFrom}`);
    }
    if (currentFilters.dateTo) {
        activeFilters.push(`To: ${currentFilters.dateTo}`);
    }
    if (currentFilters.customer) {
        activeFilters.push(`Customer: ${currentFilters.customer}`);
    }
    if (currentFilters.deliveryCode) {
        activeFilters.push(`Code: ${currentFilters.deliveryCode}`);
    }
    
    if (activeFilters.length > 0) {
        activeFiltersList.innerHTML = activeFilters.map(filter => 
            `<span class="badge badge-secondary mr-2 mb-2">${filter}</span>`
        ).join('');
        activeFiltersDiv.style.display = 'block';
    } else {
        activeFiltersDiv.style.display = 'none';
    }
}

// Update filter button badge
function updateFilterButtonBadge() {
    const filterBtn = document.getElementById('filter-btn');
    if (!filterBtn) return;
    
    const activeCount = Object.values(currentFilters).filter(v => v && v !== 'all').length;
    
    // Remove existing badge
    const existingBadge = filterBtn.querySelector('.filter-badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    
    // Add badge if filters are active
    if (activeCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'filter-badge badge badge-danger ml-2';
        badge.textContent = activeCount;
        badge.style.cssText = 'position: absolute; top: -5px; right: -5px; font-size: 10px; padding: 2px 5px;';
        filterBtn.style.position = 'relative';
        filterBtn.appendChild(badge);
    }
}

// Export deliveries to PDF
function exportDeliveriesToPDF() {
    // Get current tab to determine scope
    const activeTab = $('.tab-btn.active').data('tab');
    let scope = 'all';
    
    if (activeTab === 'active-deliveries') {
        scope = 'active';
    } else if (activeTab === 'delivery-history') {
        scope = 'history';
    }
    
    // Build URL with current filters
    const params = new URLSearchParams({
        scope: scope,
        status: currentFilters.status || 'all',
        driver: currentFilters.driver || 'all',
        vehicle: currentFilters.vehicle || 'all',
        date_from: currentFilters.dateFrom || '',
        date_to: currentFilters.dateTo || '',
        customer: currentFilters.customer || '',
        delivery_code: currentFilters.deliveryCode || ''
    });
    
    // Show loading state
    const btn = $('#export-btn');
    const originalHTML = btn.html();
    btn.html('<i class="fas fa-spinner fa-spin"></i> <span>Exporting...</span>');
    btn.prop('disabled', true);
    
    // Create download link
    const downloadUrl = '../api/export_deliveries_pdf.php?' + params.toString();
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'Deliveries_Report_' + new Date().toISOString().slice(0,10) + '.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Reset button after delay
    setTimeout(function() {
        btn.html(originalHTML);
        btn.prop('disabled', false);
    }, 2000);
}
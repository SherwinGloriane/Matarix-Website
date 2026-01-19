/**
 * Load Deliveries for Admin Interface
 * Dynamically loads and displays deliveries from the database
 */

// Format price
function formatPrice(price) {
    return '₱' + parseFloat(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format datetime
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Get status badge class
function getStatusBadgeClass(status) {
    // Normalize status (handle old values)
    const normalizedStatus = normalizeStatus(status);
    const statusMap = {
        'Pending': 'status-pending',
        'Preparing': 'status-preparing',
        'Out for Delivery': 'status-out-for-delivery',
        'Delivered': 'status-delivered',
        'Cancelled': 'status-cancelled'
    };
    return statusMap[normalizedStatus] || 'status-pending';
}

// Get status display text
function getStatusDisplayText(status) {
    const normalizedStatus = normalizeStatus(status);
    const statusMap = {
        'Pending': 'Pending',
        'Preparing': 'Preparing',
        'Out for Delivery': 'Out for Delivery',
        'Delivered': 'Delivered',
        'Cancelled': 'Cancelled'
    };
    return statusMap[normalizedStatus] || normalizedStatus;
}

// Normalize status (convert old values to new standardized values)
function normalizeStatus(status) {
    if (!status) return 'Pending';
    const statusLower = status.toLowerCase().trim();
    
    // Map old values to new standardized values
    if (statusLower === 'on the way' || statusLower === 'out for delivery') {
        return 'Out for Delivery';
    }
    if (statusLower === 'preparing') {
        return 'Preparing';
    }
    if (statusLower === 'pending') {
        return 'Pending';
    }
    if (statusLower === 'delivered') {
        return 'Delivered';
    }
    if (statusLower === 'cancelled') {
        return 'Cancelled';
    }
    
    // Return as-is if already standardized
    return status;
}

// Create delivery card HTML
async function createDeliveryCard(delivery) {
    // Handle cases where Delivery_ID might be 0 or null (for orders without delivery records yet)
    const deliveryId = delivery.Delivery_ID || delivery.Order_ID || 0;
    const orderId = delivery.Order_ID;
    
    // Use Order_ID for delivery code if Delivery_ID is missing
    const deliveryCode = deliveryId > 0 
        ? `DEL-${deliveryId.toString().padStart(6, '0')}`
        : `ORD-${orderId.toString().padStart(6, '0')}`;
    
    const customerName = delivery.customer_name || 'Unknown Customer';
    
    // Get multiple drivers and vehicles
    const drivers = delivery.drivers || [];
    const vehicles = delivery.vehicles || [];
    
    // For backward compatibility, use single driver/vehicle if arrays are empty
    const driverName = drivers.length > 0 
        ? drivers.map(d => d.driver_name || 'Unknown').join(', ')
        : (delivery.driver_name || 'Unassigned');
    const driverId = drivers.length > 0 ? drivers[0].Driver_ID : (delivery.Driver_ID || null);
    
    const vehicleModel = vehicles.length > 0
        ? vehicles.map(v => v.vehicle_model || 'Unknown').join(', ')
        : (delivery.vehicle_model || null);
    const vehicleId = vehicles.length > 0 ? vehicles[0].Vehicle_ID : (delivery.Vehicle_ID || null);
    const address = delivery.Customer_Address || 'N/A';
    const status = normalizeStatus(delivery.Delivery_Status || 'Pending');
    const items = delivery.items || [];
    const availabilitySlots = delivery.availability_slots || [];
    
    // No calculation needed - badges will show based on drivers.length and vehicles.length
    
    // Format availability information (date only - time no longer used)
    let availabilityInfo = '';
    if (availabilitySlots.length > 0) {
        const preferredSlot = availabilitySlots.find(s => s.is_preferred) || availabilitySlots[0];
        if (preferredSlot) {
            const date = new Date(preferredSlot.availability_date);
            const formattedDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            availabilityInfo = formattedDate;
            
            // If multiple slots, show count
            if (availabilitySlots.length > 1) {
                availabilityInfo += ` (${availabilitySlots.length} options)`;
            }
        }
    } else if (delivery.availability_date) {
        // Fallback to old format
        const date = new Date(delivery.availability_date);
        const formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        availabilityInfo = formattedDate;
    }
    
    // Validate required fields
    if (!orderId) {
        console.error('[Create Delivery Card] Missing Order_ID for delivery:', delivery);
        return ''; // Return empty string if critical data is missing
    }
    
    // Build items list
    const itemsList = items.length > 0 
        ? items.map(item => `${item.Product_Name} x${item.Quantity}`).join(', ')
        : 'No items';
    
    // Status dropdown options (standardized)
    const statusOptions = [
        { value: 'Pending', label: 'Pending' },
        { value: 'Preparing', label: 'Preparing' },
        { value: 'Out for Delivery', label: 'Out for Delivery' },
        { value: 'Delivered', label: 'Delivered' },
        { value: 'Cancelled', label: 'Cancelled' }
    ];
    
    // Normalize status for comparison (handle case variations and old values)
    const normalizedStatus = normalizeStatus(status);
    
    // Define status order for forward progression (allows skipping statuses)
    const statusOrder = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered'];
    const finalStatuses = ['Delivered', 'Cancelled'];
    
    // Helper function to check if a status is forward from current status
    const isForwardStatus = (fromStatus, toStatus) => {
        // Cancelled can be selected from any status
        if (toStatus === 'Cancelled') return true;
        
        // Final statuses cannot be changed
        if (finalStatuses.includes(fromStatus)) return false;
        
        // Get indices in the progression order
        const fromIndex = statusOrder.indexOf(fromStatus);
        const toIndex = statusOrder.indexOf(toStatus);
        
        // If either status is not in the order, allow it (for safety)
        if (fromIndex === -1 || toIndex === -1) return true;
        
        // Allow if toStatus comes after fromStatus in the progression
        return toIndex > fromIndex;
    };
    
    const isFinalStatus = finalStatuses.includes(normalizedStatus);
    
    // Get all allowed next statuses (any forward status + Cancelled)
    const getAllowedNextStatuses = (currentStatus) => {
        const allowed = [];
        const currentIndex = statusOrder.indexOf(currentStatus);
        
        // Add all statuses that come after current status
        if (currentIndex >= 0) {
            for (let i = currentIndex + 1; i < statusOrder.length; i++) {
                allowed.push(statusOrder[i]);
            }
        }
        
        // Always allow Cancelled
        allowed.push('Cancelled');
        
        return allowed;
    };
    
    let allowedNextStatuses = getAllowedNextStatuses(normalizedStatus);
    
    // If normalizedStatus doesn't match, try the original status
    if (allowedNextStatuses.length === 0 && status !== normalizedStatus) {
        allowedNextStatuses = getAllowedNextStatuses(status);
    }
    
    // Debug: Log status information to help diagnose issues
    if (deliveryId && (normalizedStatus === 'Out for Delivery' || status === 'Out for Delivery')) {
        console.log('[Create Delivery Card] Status check for delivery', deliveryId, ':', {
            originalStatus: status,
            normalizedStatus: normalizedStatus,
            allowedNextStatuses: allowedNextStatuses,
            shouldAllowDelivered: allowedNextStatuses.includes('Delivered')
        });
    }
    
    // Build dropdown options - show all forward statuses (allows skipping)
    const statusDropdown = statusOptions.map(opt => {
        const isSelected = opt.value === normalizedStatus || opt.value === status;
        // Allow if it's the current status OR if it's a forward status (allows skipping)
        const isAllowed = isSelected || isForwardStatus(normalizedStatus, opt.value) || allowedNextStatuses.includes(opt.value);
        // Disable if it's not allowed AND not selected
        const isDisabled = !isAllowed && !isSelected;
        
        return `<option value="${opt.value}" ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}>${opt.label}</option>`;
    }).join('');
    
    // Determine if dropdown should be disabled (for final statuses)
    const dropdownDisabled = isFinalStatus ? 'disabled' : '';
    
    // Format date for filtering
    const createdDate = delivery.Created_At || delivery.order_date || '';
    
    return `
        <div class="delivery-card" data-delivery-id="${deliveryId}" data-order-id="${orderId}" data-status="${status}" data-driver-id="${driverId || ''}" data-vehicle-id="${vehicleId || ''}" data-created-date="${createdDate}">
            <div class="card-header">
                <div class="delivery-id">
                    <div class="delivery-icon">
                        <img src="../Admin_assets/images/DeliveriesIcon.svg" alt="Delivery Truck" class="delivery-icon-img">
                    </div>
                    <div class="delivery-details">
                        <h3 class="delivery-code">${deliveryCode}</h3>
                        <p class="customer-name">${customerName}</p>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="action-btn view-btn" data-delivery-id="${deliveryId}" onclick="viewDeliveryDetails(${deliveryId})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn more-btn" data-delivery-id="${deliveryId}">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="delivery-info">
                    <i class="fas fa-map-marker-alt info-icon"></i>
                    <span class="delivery-address">${address}</span>
                </div>
                ${availabilityInfo ? `
                <div class="delivery-info">
                    <i class="fas fa-calendar-alt info-icon"></i>
                    <span class="delivery-availability">Preferred: ${availabilityInfo}</span>
                </div>
                ` : ''}
                <div class="delivery-info">
                    <i class="fas fa-user info-icon"></i>
                    <div class="driver-assignment">
                        <div class="driver-list">
                            ${drivers.length > 0 ? drivers.map(d => `<span class="driver-name" data-driver-id="${d.Driver_ID || ''}">${d.driver_name || 'Unknown'}</span>`).join(', ') : '<span class="driver-name">Unassigned</span>'}
                            ${drivers.length > 0 
                                ? `<span class="truck-count-badge" title="Number of drivers assigned"><i class="fas fa-user"></i> ${drivers.length} driver${drivers.length !== 1 ? 's' : ''}</span>` 
                                : ''}
                        </div>
                        <button class="btn btn-sm btn-link assign-driver-btn" data-delivery-id="${deliveryId}" data-order-id="${orderId}" data-current-driver-id="${driverId || ''}" title="Assign Driver(s)">
                            <i class="fas fa-user-plus"></i> ${driverId ? 'Change' : 'Assign'} Driver${drivers.length > 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
                <div class="delivery-info">
                    <i class="fas fa-truck info-icon"></i>
                    <div class="vehicle-assignment">
                        <div class="vehicle-list">
                            ${vehicles.length > 0 
                                ? vehicles.map(v => `<span class="vehicle-name" data-vehicle-id="${v.Vehicle_ID || ''}">${v.vehicle_model || 'Unknown'}</span>`).join(', ') 
                                : '<span class="vehicle-name">Unassigned</span>'}
                            ${vehicles.length > 0 
                                ? `<span class="truck-count-badge" title="Number of vehicles assigned"><i class="fas fa-truck"></i> ${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''}</span>` 
                                : ''}
                        </div>
                        <button class="btn btn-sm btn-link assign-vehicle-btn" data-delivery-id="${deliveryId}" data-order-id="${orderId}" data-current-vehicle-id="${vehicleId || ''}" title="Assign Vehicle(s)">
                            <i class="fas fa-truck"></i> ${vehicleId ? 'Change' : 'Assign'} Vehicle${vehicles.length > 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
                <div class="delivery-status">
                    <div class="status-control">
                        <span class="status-label">Status:</span>
                        <select class="delivery-status-dropdown" data-delivery-id="${deliveryId}" data-order-id="${orderId}" ${dropdownDisabled} title="${isFinalStatus ? 'This delivery is in a final state and cannot be changed.' : 'Select next status'}">
                            ${statusDropdown}
                        </select>
                        ${isFinalStatus ? '<small class="text-muted d-block mt-1"><i class="fas fa-lock"></i> Final status - cannot be changed</small>' : ''}
                    </div>
                    <p class="delivery-items">${itemsList}</p>
                </div>
            </div>
        </div>
    `;
}

// Load deliveries
async function loadDeliveries() {
    try {
        console.log('[Load Deliveries] Loading deliveries...');
        
        // First check if user is authenticated
        const sessionCheck = await fetch('../api/check_session.php', {
            method: 'GET',
            credentials: 'include'
        });
        const sessionData = await sessionCheck.json();
        console.log('[Load Deliveries] Session check:', sessionData);
        
        if (!sessionData.logged_in) {
            console.error('[Load Deliveries] ❌ User not logged in');
            const container = document.querySelector('.delivery-cards');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <p class="text-danger">You are not logged in. Please log in to view deliveries.</p>
                        <button class="btn btn-primary mt-2" onclick="window.location.href='../Admin/AdminLogin.html'">Go to Login</button>
                    </div>
                `;
            }
            return;
        }
        
        console.log('[Load Deliveries] User authenticated:', {
            user_id: sessionData.user_id,
            user_role: sessionData.user_role,
            user_name: sessionData.user_name
        });
        
        // Find container first
        const container = document.querySelector('.delivery-cards');
        if (!container) {
            console.error('[Load Deliveries] ❌ Delivery cards container not found');
            console.error('[Load Deliveries] Available containers:', document.querySelectorAll('[class*="delivery"]'));
            return;
        }
        
        // Clear existing cards immediately (remove hardcoded HTML)
        container.innerHTML = '<div class="text-center py-3"><p class="text-muted">Loading deliveries...</p></div>';
        
        const response = await fetch('../api/load_deliveries_admin.php', {
            method: 'GET',
            credentials: 'include', // Important: include cookies for session
            headers: {
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('[Load Deliveries] API Response:', data);
        
        if (!response.ok) {
            // Log detailed error information
            console.error('[Load Deliveries] ❌ HTTP Error:', response.status);
            console.error('[Load Deliveries] ❌ Error Message:', data.message);
            console.error('[Load Deliveries] ❌ Debug Info:', data.debug);
            
            // Show more helpful error message
            let errorMessage = `Error loading deliveries: ${data.message || 'HTTP error! status: ' + response.status}`;
            if (response.status === 403) {
                errorMessage = `Access Denied: ${data.message || 'You do not have permission to view deliveries. Your role: ' + (sessionData.user_role || 'not set') + '. Required roles: Admin, Store Employee, or Delivery Driver.'}`;
            } else if (response.status === 401) {
                errorMessage = 'Not Authenticated: Please log in to view deliveries.';
            }
            
            throw new Error(errorMessage);
        }
        
        if (data.success && data.deliveries) {
            console.log('[Load Deliveries] Total deliveries received:', data.deliveries.length);
            console.log('[Load Deliveries] All delivery statuses:', data.deliveries.map(d => ({
                delivery_id: d.Delivery_ID,
                order_id: d.Order_ID,
                status: d.Delivery_Status,
                status_type: typeof d.Delivery_Status
            })));
            
            // Filter active deliveries (not Delivered or Cancelled)
            // Handle null/undefined status values as 'Pending'
            const activeDeliveries = data.deliveries.filter(d => {
                const status = (d.Delivery_Status || 'Pending').trim();
                const statusLower = status.toLowerCase();
                // Case-insensitive check for completed statuses
                const isActive = statusLower !== 'delivered' && statusLower !== 'cancelled';
                if (!isActive) {
                    console.log('[Load Deliveries] Excluding delivery (not active):', {
                        delivery_id: d.Delivery_ID,
                        order_id: d.Order_ID,
                        status: status,
                        status_lower: statusLower
                    });
                }
                return isActive;
            });
            
            // Filter history deliveries (Delivered or Cancelled)
            const historyDeliveries = data.deliveries.filter(d => {
                const status = (d.Delivery_Status || 'Pending').trim();
                const statusLower = status.toLowerCase();
                return statusLower === 'delivered' || statusLower === 'cancelled';
            });
            
            console.log('[Load Deliveries] Filtered results:', {
                total: data.deliveries.length,
                active: activeDeliveries.length,
                history: historyDeliveries.length
            });
            
            // Load active deliveries into active deliveries tab
            const activeContainer = document.querySelector('#active-deliveries-content .delivery-cards');
            if (!activeContainer) {
                console.error('[Load Deliveries] ❌ Active deliveries container not found!');
            } else {
                activeContainer.innerHTML = '';
                
                if (activeDeliveries.length === 0) {
                    activeContainer.innerHTML = `
                        <div class="text-center py-5">
                            <p class="text-muted">No active deliveries found.</p>
                            <p class="text-muted" style="font-size: 12px;">Create an order to see deliveries here.</p>
                        </div>
                    `;
                } else {
                    // Sort active deliveries by original creation date (order_date or Created_At)
                    // This keeps deliveries in their original position until they become "Delivered"
                    // Only "Delivered" deliveries should move to history tab
                    const sortedActive = [...activeDeliveries].sort((a, b) => {
                        // Use order_date or Created_At (original creation), NOT Updated_At
                        // This preserves the original order position
                        const dateA = new Date(a.order_date || a.Created_At || a.Updated_At || 0);
                        const dateB = new Date(b.order_date || b.Created_At || b.Updated_At || 0);
                        return dateB - dateA; // Most recent order first (by creation date, not update date)
                    });
                    
                    console.log('[Load Deliveries] Active deliveries sorted:', sortedActive.map(d => ({
                        delivery_id: d.Delivery_ID,
                        order_id: d.Order_ID,
                        status: d.Delivery_Status || 'Pending',
                        updated_at: d.Updated_At,
                        created_at: d.Created_At,
                        order_date: d.order_date
                    })));
                    
                    console.log('[Load Deliveries] Creating', sortedActive.length, 'delivery cards...');
                    // Create delivery cards asynchronously
                    const activeCardPromises = sortedActive.map(async (delivery) => {
                        try {
                            return await createDeliveryCard(delivery);
                        } catch (error) {
                            console.error('[Load Deliveries] ❌ Failed to create card for delivery:', delivery.Delivery_ID, error);
                            return '';
                        }
                    });
                    const activeCardHtmls = await Promise.all(activeCardPromises);
                    activeContainer.innerHTML = activeCardHtmls.filter(html => html && html.trim()).join('');
                    console.log('[Load Deliveries] ✅ Created', activeCardHtmls.filter(html => html && html.trim()).length, 'delivery cards out of', sortedActive.length);
                }
            }
            
            // Load history deliveries into delivery history tab
            const historyContainer = document.getElementById('delivery-history-cards');
            if (historyContainer) {
                historyContainer.innerHTML = '';
                
                if (historyDeliveries.length === 0) {
                    historyContainer.innerHTML = `
                        <div class="text-center py-5">
                            <p class="text-muted">No delivery history found.</p>
                            <p class="text-muted" style="font-size: 12px;">Completed and cancelled deliveries will appear here.</p>
                        </div>
                    `;
                } else {
                    // Sort history deliveries by most recent first
                    // Prioritize Updated_At (completion date), then Created_At, then order_date
                    const sortedHistory = [...historyDeliveries].sort((a, b) => {
                        const dateA = new Date(a.Updated_At || a.Created_At || a.order_date || 0);
                        const dateB = new Date(b.Updated_At || b.Created_At || b.order_date || 0);
                        return dateB - dateA; // Most recent first
                    });
                    
                    console.log('[Load Deliveries] History deliveries sorted:', sortedHistory.map(d => ({
                        delivery_id: d.Delivery_ID,
                        order_id: d.Order_ID,
                        status: d.Delivery_Status,
                        updated_at: d.Updated_At,
                        created_at: d.Created_At
                    })));
                    
                    // Create delivery cards asynchronously
                    const historyCardPromises = sortedHistory.map(async (delivery) => {
                        try {
                            return await createDeliveryCard(delivery);
                        } catch (error) {
                            console.error('[Load Deliveries] ❌ Failed to create history card for delivery:', delivery.Delivery_ID, error);
                            return '';
                        }
                    });
                    const historyCardHtmls = await Promise.all(historyCardPromises);
                    historyContainer.innerHTML = historyCardHtmls.filter(html => html && html.trim()).join('');
                }
            }
            
            // Update statistics
            if (data.statistics) {
                updateStatistics(data.statistics);
            }
            
            // Setup event listeners for status dropdowns (for both tabs)
            setupStatusDropdowns();
            
            // Apply filters if any are active
            if (typeof filterDeliveries === 'function') {
                setTimeout(() => filterDeliveries(), 100);
            }
            
            console.log('[Load Deliveries] ✅ Deliveries loaded successfully:', {
                total: data.deliveries.length,
                active: activeDeliveries.length,
                history: historyDeliveries.length
            });
        } else {
            console.error('[Load Deliveries] ❌ Failed to load deliveries:', data.message);
            container.innerHTML = `
                <div class="text-center py-5">
                    <p class="text-danger">Failed to load deliveries: ${data.message || 'Unknown error'}</p>
                    <button class="btn btn-primary mt-2" onclick="loadDeliveries()">Retry</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('[Load Deliveries] ❌ Error loading deliveries:', error);
        const container = document.querySelector('.delivery-cards');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <p class="text-danger">Error loading deliveries: ${error.message}</p>
                    <button class="btn btn-primary mt-2" onclick="loadDeliveries()">Retry</button>
                </div>
            `;
        }
    }
}

// Update statistics
function updateStatistics(stats) {
    const totalEl = document.getElementById('totalDeliveriesStat');
    const activeEl = document.getElementById('activeDeliveriesStat');
    const driversEl = document.getElementById('activeDriversStat');
    
    if (totalEl) totalEl.textContent = stats.total_deliveries || 0;
    if (activeEl) activeEl.textContent = stats.active_deliveries || 0;
    if (driversEl) driversEl.textContent = stats.active_drivers || 0;
    
    console.log('[Load Deliveries] Statistics updated:', stats);
}

// Update statistics immediately after status change (optimistic update)
function updateStatisticsAfterStatusChange(newStatus, oldStatus) {
    const activeEl = document.getElementById('activeDeliveriesStat');
    if (!activeEl) return;
    
    const currentActive = parseInt(activeEl.textContent) || 0;
    let newActive = currentActive;
    
    // Determine if status change affects active deliveries count
    const activeStatuses = ['Pending', 'Preparing', 'Out for Delivery'];
    const completedStatuses = ['Delivered', 'Cancelled'];
    
    const wasActive = activeStatuses.includes(oldStatus);
    const isActive = activeStatuses.includes(newStatus);
    const wasCompleted = completedStatuses.includes(oldStatus);
    const isCompleted = completedStatuses.includes(newStatus);
    
    // If moving from active to completed, decrease count
    if (wasActive && isCompleted) {
        newActive = Math.max(0, currentActive - 1);
    }
    // If moving from completed to active, increase count
    else if (wasCompleted && isActive) {
        newActive = currentActive + 1;
    }
    // If moving between active statuses, count stays the same
    // If moving between completed statuses, count stays the same
    
    if (newActive !== currentActive) {
        activeEl.textContent = newActive;
        console.log('[Update Statistics] Active deliveries updated:', {
            old: currentActive,
            new: newActive,
            status_change: `${oldStatus} -> ${newStatus}`
        });
    }
}

// Setup status dropdown event listeners (for both active deliveries and history tabs)
function setupStatusDropdowns() {
    // Check if status update is in progress - if so, skip setup to prevent glitching
    if (isStatusUpdateInProgress) {
        console.log('[Setup Status Dropdowns] Skipping setup - status update in progress');
        return;
    }
    
    // Remove existing listeners by cloning nodes (removes all event listeners)
    // BUT: Preserve the current value and disabled state to prevent glitching
    document.querySelectorAll('.delivery-status-dropdown').forEach(dropdown => {
        const currentValue = dropdown.value;
        const isDisabled = dropdown.disabled;
        const previousValue = dropdown.getAttribute('data-previous-value') || currentValue;
        
        const newDropdown = dropdown.cloneNode(true);
        // Restore the value and state immediately
        newDropdown.value = currentValue;
        newDropdown.disabled = isDisabled;
        newDropdown.setAttribute('data-previous-value', previousValue);
        
        dropdown.parentNode.replaceChild(newDropdown, dropdown);
    });
    
    // Add event listeners to all dropdowns (in both tabs)
    document.querySelectorAll('.delivery-status-dropdown').forEach(dropdown => {
        // Get the actual current status from the dropdown's selected option
        const selectedOption = dropdown.options[dropdown.selectedIndex];
        const currentStatus = selectedOption ? selectedOption.value : dropdown.value;
        
        // Store the current status as the previous value
        dropdown.setAttribute('data-previous-value', currentStatus);
        dropdown.value = currentStatus; // Ensure value matches stored value
        
        // Disable dropdown ONLY if status is final (Delivered or Cancelled)
        const finalStatuses = ['Delivered', 'Cancelled'];
        const normalizedCurrentStatus = normalizeStatus(currentStatus);
        
        if (finalStatuses.includes(normalizedCurrentStatus)) {
            dropdown.disabled = true;
            dropdown.setAttribute('data-final-status', 'true');
            dropdown.title = 'This delivery is in a final state and cannot be changed.';
        } else {
            // Ensure dropdown is enabled for non-final statuses
            dropdown.disabled = false;
            dropdown.removeAttribute('data-final-status');
            dropdown.title = 'Select next status';
        }
        
        // Use a single event listener with proper event handling
        dropdown.addEventListener('change', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            e.preventDefault(); // Prevent default behavior
            
            const deliveryId = parseInt(this.getAttribute('data-delivery-id'));
            const orderId = parseInt(this.getAttribute('data-order-id'));
            const newStatus = this.value;
            
            // Get previous value from attribute (should be set when dropdown was created)
            let previousValue = this.getAttribute('data-previous-value');
            
            // If previous value is not set, use the current value before change
            if (!previousValue) {
                // Try to find the previously selected option
                const options = Array.from(this.options);
                const previouslySelected = options.find(opt => opt.hasAttribute('data-was-selected'));
                if (previouslySelected) {
                    previousValue = previouslySelected.value;
                } else {
                    // Fallback: use the first non-disabled option that's not the new status
                    const otherOption = options.find(opt => !opt.disabled && opt.value !== newStatus);
                    previousValue = otherOption ? otherOption.value : this.value;
                }
            }
            
            // Only proceed if status actually changed
            if (newStatus === previousValue) {
                console.log('[Status Dropdown] No change detected, ignoring');
                // Reset to previous value
                this.value = previousValue;
                this.selectedIndex = Array.from(this.options).findIndex(opt => opt.value === previousValue);
                return;
            }
            
            console.log('[Status Dropdown] Status change:', {
                deliveryId,
                from: previousValue,
                to: newStatus,
                storedPrevious: this.getAttribute('data-previous-value'),
                dropdownDisabled: this.disabled
            });
            
            // Mark the previous option for future reference
            Array.from(this.options).forEach(opt => {
                opt.removeAttribute('data-was-selected');
                if (opt.value === previousValue) {
                    opt.setAttribute('data-was-selected', 'true');
                }
            });
            
            // Update the stored previous value to the current value before making the change
            // This ensures we have the correct previous value if the update fails
            this.setAttribute('data-previous-value', previousValue);
            
            updateDeliveryStatus(deliveryId, orderId, newStatus, previousValue, this);
        }, { once: false, passive: false }); // Changed passive to false to allow preventDefault
    });
    
    console.log('[Setup Status Dropdowns] ✅ Event listeners attached to', document.querySelectorAll('.delivery-status-dropdown').length, 'dropdowns');
}

// Track if status update is in progress to prevent auto-refresh interference
let isStatusUpdateInProgress = false;
let statusUpdateDeliveryIds = new Set();

// Update delivery status
async function updateDeliveryStatus(deliveryId, orderId, newStatus, previousValue, dropdownElement) {
    console.log('[Update Delivery Status] Updating:', { deliveryId, orderId, newStatus });
    
    // Prevent multiple simultaneous updates for the same delivery
    if (statusUpdateDeliveryIds.has(deliveryId)) {
        console.log('[Update Delivery Status] Update already in progress for delivery:', deliveryId);
        // Reset dropdown to previous value (don't default to 'Pending')
        const storedPrevious = dropdownElement.getAttribute('data-previous-value');
        const resetValue = previousValue || storedPrevious || dropdownElement.value;
        dropdownElement.value = resetValue;
        dropdownElement.selectedIndex = Array.from(dropdownElement.options).findIndex(opt => opt.value === resetValue);
        return;
    }
    
    // Mark update as in progress
    isStatusUpdateInProgress = true;
    statusUpdateDeliveryIds.add(deliveryId);
    
    // Temporarily disable dropdown to prevent rapid changes
    dropdownElement.disabled = true;
    
    // Validate status progression on frontend before API call
    const finalStatuses = ['Delivered', 'Cancelled'];
    const statusOrder = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered'];
    
    // Helper function to check if a status is forward from current status (allows skipping)
    const isForwardStatus = (fromStatus, toStatus) => {
        // Cancelled can be selected from any status
        if (toStatus === 'Cancelled') return true;
        
        // Final statuses cannot be changed
        if (finalStatuses.includes(fromStatus)) return false;
        
        // Get indices in the progression order
        const fromIndex = statusOrder.indexOf(fromStatus);
        const toIndex = statusOrder.indexOf(toStatus);
        
        // If either status is not in the order, allow it (for safety)
        if (fromIndex === -1 || toIndex === -1) return true;
        
        // Allow if toStatus comes after fromStatus in the progression
        return toIndex > fromIndex;
    };
    
    // Get current status - use previousValue if provided, otherwise get from dropdown attribute or current value
    let currentStatus = previousValue;
    if (!currentStatus) {
        currentStatus = dropdownElement.getAttribute('data-previous-value');
    }
    if (!currentStatus) {
        // Get from the dropdown's current selected value (before it was changed)
        const selectedOption = dropdownElement.options[dropdownElement.selectedIndex];
        currentStatus = selectedOption ? selectedOption.value : dropdownElement.value;
    }
    // Only default to 'Pending' as absolute last resort
    if (!currentStatus) {
        currentStatus = 'Pending';
    }
    
    const normalizedCurrentStatus = normalizeStatus(currentStatus);
    
    console.log('[Update Delivery Status] Current status check:', {
        previousValue,
        storedPrevious: dropdownElement.getAttribute('data-previous-value'),
        currentStatus,
        normalizedCurrentStatus,
        newStatus
    });
    
    // Check if current status is final
    if (finalStatuses.includes(normalizedCurrentStatus)) {
        if (window.AdminNotifications) {
            AdminNotifications.warning(`Cannot update delivery status. Delivery is already ${normalizedCurrentStatus}. Final statuses cannot be changed.`, {
                duration: 5000,
                title: 'Status Update Blocked'
            });
        } else {
            alert(`Cannot update delivery status. Delivery is already ${normalizedCurrentStatus}. Final statuses cannot be changed.`);
        }
        // Reset dropdown to previous value
        dropdownElement.value = previousValue || normalizedCurrentStatus;
        dropdownElement.disabled = false;
        statusUpdateDeliveryIds.delete(deliveryId);
        isStatusUpdateInProgress = false;
        return;
    }
    
    // Check if status change is valid (forward progression only, but allows skipping)
    if (newStatus !== normalizedCurrentStatus && !isForwardStatus(normalizedCurrentStatus, newStatus)) {
        // Get all allowed statuses for error message
        const getAllowedStatuses = (fromStatus) => {
            const allowed = [];
            const fromIndex = statusOrder.indexOf(fromStatus);
            if (fromIndex >= 0) {
                for (let i = fromIndex + 1; i < statusOrder.length; i++) {
                    allowed.push(statusOrder[i]);
                }
            }
            allowed.push('Cancelled');
            return allowed;
        };
        
        const allowedStatuses = getAllowedStatuses(normalizedCurrentStatus);
        
        if (window.AdminNotifications) {
            AdminNotifications.warning(`Invalid status change. Cannot change from '${normalizedCurrentStatus}' to '${newStatus}'. You can skip statuses, but cannot go backward. Valid statuses: ${allowedStatuses.join(', ')}`, {
                duration: 5000,
                title: 'Invalid Status Change'
            });
        } else {
            alert(`Invalid status change. Cannot change from '${normalizedCurrentStatus}' to '${newStatus}'. You can skip statuses, but cannot go backward. Valid statuses: ${allowedStatuses.join(', ')}`);
        }
        // Reset dropdown to previous value
        dropdownElement.value = previousValue || normalizedCurrentStatus;
        dropdownElement.disabled = false;
        statusUpdateDeliveryIds.delete(deliveryId);
        isStatusUpdateInProgress = false;
        return;
    }
    
    // Check if order is approved before allowing status update
    if (orderId) {
        try {
            const orderResponse = await fetch(`../api/get_orders.php?order_id=${orderId}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (orderResponse.ok) {
                const orderData = await orderResponse.json();
                if (orderData.success && orderData.orders && orderData.orders.length > 0) {
                    const order = orderData.orders[0];
                    if (order.status === 'Pending Approval') {
                        alert('Cannot update delivery status. Order must be approved first.');
                        // Reset dropdown to previous value
                        if (dropdownElement && previousValue) {
                            dropdownElement.value = previousValue;
                        }
                        return;
                    }
                    if (order.status === 'Rejected') {
                        alert('Cannot update delivery status. Order has been rejected.');
                        // Reset dropdown to previous value
                        if (dropdownElement && previousValue) {
                            dropdownElement.value = previousValue;
                        }
                        return;
                    }
                }
            }
        } catch (error) {
            console.warn('[Update Delivery Status] Could not verify order approval status:', error);
            // Continue with update attempt - API will also check
        }
    }
    
    // No confirmation popup - update immediately
    try {
        console.log('[Update Delivery Status] Sending request:', {
            delivery_id: deliveryId,
            order_id: orderId,
            status: newStatus
        });
        
        const response = await fetch('../api/update_delivery_status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                delivery_id: deliveryId,
                order_id: orderId,
                status: newStatus
            })
        });
        
        console.log('[Update Delivery Status] Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            // Try to get error message from response
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
            console.error('[Update Delivery Status] ❌ Error response:', errorData);
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('[Update Delivery Status] Response:', data);
        
        // Check if the update actually succeeded
        if (!data.success) {
            console.error('[Update Delivery Status] ❌ Update failed:', data.message);
            // Don't proceed with dropdown update if API call failed
            throw new Error(data.message || 'Status update failed');
        }
        
        if (data.success) {
            console.log('[Update Delivery Status] ✅ Status updated successfully');
            console.log('[Update Delivery Status] Updated delivery:', data.delivery);
            
            // Update the dropdown's previous value to the actual saved status
            const savedStatus = data.delivery?.Delivery_Status || data.saved_status || newStatus;
            const normalizedSavedStatus = normalizeStatus(savedStatus);
            
            console.log('[Update Delivery Status] Status update response:', {
                savedStatus,
                normalizedSavedStatus,
                newStatus,
                deliveryData: data.delivery
            });
            
            // CRITICAL: Update dropdown value immediately and persist it
            dropdownElement.setAttribute('data-previous-value', normalizedSavedStatus);
            dropdownElement.value = normalizedSavedStatus; // Set the value to match saved status
            
            // Force the dropdown to show the correct value (prevent browser from reverting)
            const optionIndex = Array.from(dropdownElement.options).findIndex(opt => opt.value === normalizedSavedStatus);
            if (optionIndex >= 0) {
                dropdownElement.selectedIndex = optionIndex;
            } else {
                console.error('[Update Delivery Status] ⚠️ Could not find option for status:', normalizedSavedStatus);
                // Try to find by case-insensitive match
                const caseInsensitiveIndex = Array.from(dropdownElement.options).findIndex(opt => 
                    opt.value.toLowerCase() === normalizedSavedStatus.toLowerCase()
                );
                if (caseInsensitiveIndex >= 0) {
                    dropdownElement.selectedIndex = caseInsensitiveIndex;
                    console.log('[Update Delivery Status] Found case-insensitive match at index:', caseInsensitiveIndex);
                }
            }
            
            // If status is now final, disable the dropdown permanently
            const finalStatuses = ['Delivered', 'Cancelled'];
            if (finalStatuses.includes(normalizedSavedStatus)) {
                dropdownElement.disabled = true;
                dropdownElement.setAttribute('data-final-status', 'true');
                dropdownElement.title = 'This delivery is in a final state and cannot be changed.';
            } else {
                // Re-enable dropdown if not final status
                dropdownElement.disabled = false;
                dropdownElement.removeAttribute('data-final-status');
            }
            
            // Update statistics immediately based on the new status
            updateStatisticsAfterStatusChange(normalizedSavedStatus, previousValue);
            
            // Show success message (non-blocking, using console and visual feedback)
            console.log('[Update Delivery Status] ✅ Status changed from "' + previousValue + '" to "' + normalizedSavedStatus + '"');
            
            // Verify the dropdown value is correct after setting it
            if (dropdownElement.value !== normalizedSavedStatus) {
                console.error('[Update Delivery Status] ⚠️ Dropdown value mismatch! Expected:', normalizedSavedStatus, 'Got:', dropdownElement.value);
                // Force set again
                dropdownElement.value = normalizedSavedStatus;
                const retryIndex = Array.from(dropdownElement.options).findIndex(opt => opt.value === normalizedSavedStatus);
                if (retryIndex >= 0) {
                    dropdownElement.selectedIndex = retryIndex;
                }
            }
            
            // Add smooth visual feedback to the dropdown (temporary highlight with transition)
            dropdownElement.style.transition = 'background-color 0.3s ease';
            dropdownElement.style.backgroundColor = '#d4edda';
            setTimeout(() => {
                dropdownElement.style.backgroundColor = '';
            }, 1500);
            
            // Determine if card needs to move to a different tab
            // Use normalized status for accurate comparison
            const activeStatuses = ['Pending', 'Preparing', 'Out for Delivery'];
            const completedStatuses = ['Delivered', 'Cancelled'];
            const normalizedPreviousValue = normalizeStatus(previousValue);
            const wasActive = activeStatuses.includes(normalizedPreviousValue);
            const isActive = activeStatuses.includes(normalizedSavedStatus);
            const wasCompleted = completedStatuses.includes(normalizedPreviousValue);
            const isCompleted = completedStatuses.includes(normalizedSavedStatus);
            
            // Only reload if the card needs to move between Active and History tabs
            const needsTabMove = (wasActive && isCompleted) || (wasCompleted && isActive);
            
            if (needsTabMove) {
                console.log('[Update Delivery Status] Card needs to move to different tab. Reloading...');
                // Mark that we're about to reload, so auto-refresh doesn't interfere
                isStatusUpdateInProgress = true;
                
                // Card needs to move to a different tab - reload after a delay to ensure DB is updated
                // Add fade-out animation to the card
                const deliveryCard = dropdownElement.closest('.delivery-card');
                if (deliveryCard) {
                    deliveryCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    deliveryCard.style.opacity = '0.5';
                    deliveryCard.style.transform = 'scale(0.98)';
                }
                
                // Wait for database commit before reloading
                // For "Delivered" status, the order status changes to "Completed"
                // The API now includes "Completed" orders so delivered orders will appear in history
                setTimeout(async () => {
                    console.log('[Update Delivery Status] Reloading to move delivery to history tab...');
                    await loadDeliveries();
                    
                    // Switch to history tab if delivery was marked as "Delivered"
                    if (normalizedSavedStatus === 'Delivered') {
                        const historyTab = document.getElementById('delivery-history-tab');
                        if (historyTab) {
                            // Switch to history tab after a brief delay to let cards load
                            setTimeout(() => {
                                historyTab.click();
                            }, 500);
                        }
                    }
                    
                    // Clear the update flag after reload completes
                    setTimeout(() => {
                        isStatusUpdateInProgress = false;
                        statusUpdateDeliveryIds.delete(deliveryId);
                    }, 1000);
                }, 2000); // Wait 2 seconds to ensure DB commit and order status update
            } else {
                // Status change stays in the same tab - no reload needed, just update in place
                console.log('[Update Delivery Status] Status change stays in same tab. No reload needed.');
                // Clear the update flag immediately since we're not reloading
                isStatusUpdateInProgress = false;
                statusUpdateDeliveryIds.delete(deliveryId);
            }
        } else {
            console.error('[Update Delivery Status] ❌ Failed:', data.message);
            // Reset dropdown to previous value
            dropdownElement.value = previousValue;
            // Show visual error feedback
            dropdownElement.style.backgroundColor = '#f8d7da';
            setTimeout(() => {
                dropdownElement.style.backgroundColor = '';
            }, 2000);
            
            // Show user-friendly error notification
            const errorMessage = data.message || 'Failed to update delivery status';
            
            // Use AdminNotifications if available, otherwise show alert
            if (window.AdminNotifications) {
                AdminNotifications.error(errorMessage, {
                    duration: 5000,
                    title: 'Cannot Update Status'
                });
            } else {
                // Fallback notification
                const errorMsg = document.createElement('div');
                errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; z-index: 10000; max-width: 400px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
                errorMsg.innerHTML = `
                    <strong>Error</strong><br>
                    ${errorMessage}
                `;
                document.body.appendChild(errorMsg);
                setTimeout(() => errorMsg.remove(), 5000);
            }
            
            // If it's an enum error, show a helpful message
            if (data.fix_url || data.message?.includes('not valid in the database')) {
                console.error('[Update Delivery Status] ⚠️ Database enum needs to be updated!');
                console.error('[Update Delivery Status] Please run:', data.fix_url || 'http://localhost/MatarixWEBs/api/fix_delivery_status_enum.php');
                // Show a non-blocking notification
                const errorMsg = document.createElement('div');
                errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; z-index: 10000; max-width: 400px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
                errorMsg.innerHTML = `
                    <strong>Database Update Required</strong><br>
                    The database needs to be updated to support new statuses.<br>
                    <a href="${data.fix_url || 'http://localhost/MatarixWEBs/api/fix_delivery_status_enum.php'}" target="_blank" style="color: #721c24; text-decoration: underline;">Click here to fix</a>
                `;
                document.body.appendChild(errorMsg);
                setTimeout(() => errorMsg.remove(), 10000);
            }
        }
    } catch (error) {
        console.error('[Update Delivery Status] ❌ Error:', error);
        console.error('[Update Delivery Status] ❌ Error details:', {
            message: error.message,
            stack: error.stack,
            deliveryId,
            orderId,
            newStatus
        });
        // Reset dropdown to previous value and ensure it's set correctly
        const previousStatus = previousValue || dropdownElement.getAttribute('data-previous-value') || 'Pending';
        dropdownElement.value = previousStatus;
        const optionIndex = Array.from(dropdownElement.options).findIndex(opt => opt.value === previousStatus);
        if (optionIndex >= 0) {
            dropdownElement.selectedIndex = optionIndex;
        }
        dropdownElement.disabled = false; // Re-enable dropdown on error
        
        // Show visual error feedback
        dropdownElement.style.backgroundColor = '#f8d7da';
        setTimeout(() => {
            dropdownElement.style.backgroundColor = '';
        }, 2000);
        
        // Show user-friendly error notification
        const errorMessage = error.message || 'Failed to update delivery status. Please try again.';
        
        // Use AdminNotifications if available, otherwise show alert
        if (window.AdminNotifications) {
            AdminNotifications.error(errorMessage, {
                duration: 5000,
                title: 'Update Failed'
            });
        } else {
            // Fallback notification
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; z-index: 10000; max-width: 400px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
            errorMsg.innerHTML = `
                <strong>Error</strong><br>
                ${errorMessage}
            `;
            document.body.appendChild(errorMsg);
            setTimeout(() => errorMsg.remove(), 5000);
        }
    } finally {
        // Always clear the update flag
        statusUpdateDeliveryIds.delete(deliveryId);
        
        // Only clear isStatusUpdateInProgress if we're not doing a tab move reload
        // (The success block handles clearing it after reload if needed)
        // Re-enable dropdown if not final status (unless it's being disabled for final status)
        const finalStatuses = ['Delivered', 'Cancelled'];
        const currentStatus = dropdownElement.value;
        
        // If status is not final and dropdown is disabled (from error), re-enable it
        if (!finalStatuses.includes(currentStatus) && dropdownElement.disabled && !dropdownElement.hasAttribute('data-final-status')) {
            dropdownElement.disabled = false;
        }
    }
}

// View delivery details
async function viewDeliveryDetails(deliveryId) {
    console.log('[View Delivery Details] Opening modal for Delivery ID:', deliveryId);
    
    // Show loading state
    $('#deliveryDetailsLoading').show();
    $('#deliveryDetailsContent').hide();
    $('#deliveryDetailsError').hide();
    
    // Show the modal
    $('#deliveryDetailsModal').modal('show');
    
    try {
        // Get order ID from the delivery card data attribute
        const deliveryCard = document.querySelector(`[data-delivery-id="${deliveryId}"]`);
        let orderId = null;
        
        if (deliveryCard) {
            orderId = deliveryCard.getAttribute('data-order-id');
        }
        
        if (!orderId || orderId === 'null' || orderId === '0') {
            throw new Error('Order ID not found for this delivery. Please refresh the page and try again.');
        }
        
        // Fetch order details with products
        const orderResponse = await fetch(`../api/get_orders.php?order_id=${orderId}`, {
            credentials: 'include'
        });
        const orderData = await orderResponse.json();
        
        if (!orderData.success || !orderData.order) {
            throw new Error(orderData.message || 'Failed to load order details');
        }
        
        const order = orderData.order;
        
        // Format delivery ID
        const deliveryIdFormatted = `DEL-${String(deliveryId).padStart(6, '0')}`;
        
        // Format order ID
        const orderIdFormatted = `ORD-${String(order.Order_ID).padStart(6, '0')}`;
        
        // Populate delivery and order information
        $('#modal-delivery-id').text(deliveryIdFormatted);
        $('#modal-order-id').text(orderIdFormatted);
        $('#modal-customer-name').text(`${order.First_Name || ''} ${order.Last_Name || ''}`.trim() || 'N/A');
        $('#modal-delivery-address').text(order.address || 'N/A');
        
        // Set status with appropriate styling
        const status = order.status || 'Pending';
        const statusEl = $('#modal-progress-status');
        statusEl.text(status);
        statusEl.removeClass('status-pending status-preparing status-out-for-delivery status-delivered status-cancelled');
        
        const statusLower = status.toLowerCase();
        if (statusLower.includes('pending')) {
            statusEl.addClass('status-pending');
        } else if (statusLower.includes('preparing')) {
            statusEl.addClass('status-preparing');
        } else if (statusLower.includes('out for delivery') || statusLower.includes('delivery')) {
            statusEl.addClass('status-out-for-delivery');
        } else if (statusLower.includes('delivered')) {
            statusEl.addClass('status-delivered');
        } else if (statusLower.includes('cancelled') || statusLower.includes('canceled')) {
            statusEl.addClass('status-cancelled');
        }
        
        // Populate ordered products
        const productsContainer = $('#modal-ordered-products');
        productsContainer.empty();
        
        if (order.items && order.items.length > 0) {
            // Check if any item has a variation
            const hasVariations = order.items.some(item => item.variation && item.variation.trim() !== '');
            
            let productsHTML = '<table class="table table-bordered table-sm" style="margin-top: 10px;">';
            productsHTML += '<thead class="thead-light"><tr><th>Product</th><th>Quantity</th><th>Unit Price</th><th>Total</th><th>Dimensions</th><th>Weight</th>';
            
            // Add Variation column header only if at least one item has a variation
            if (hasVariations) {
                productsHTML += '<th>Variation</th>';
            }
            
            productsHTML += '</tr></thead><tbody>';
            
            let totalAmount = 0;
            
            order.items.forEach(item => {
                const productName = item.Product_Name || `Deleted Product (ID: ${item.Product_ID})`;
                const quantity = item.Quantity || 0;
                const price = parseFloat(item.Price || 0);
                const itemTotal = quantity * price;
                totalAmount += itemTotal;
                
                // Format dimensions
                let dimensions = 'N/A';
                if (item.length && item.Width && item.Unit) {
                    dimensions = `${item.length} x ${item.Width} ${item.Unit}`;
                } else if (item.length && item.Width) {
                    dimensions = `${item.length} x ${item.Width}`;
                }
                
                // Format weight
                let weight = 'N/A';
                if (item.weight) {
                    weight = `${item.weight} ${item.weight_unit || 'kg'}`;
                }
                
                // Format variation
                const variation = item.variation && item.variation.trim() !== '' ? item.variation : 'N/A';
                
                productsHTML += '<tr>';
                productsHTML += `<td>${productName}</td>`;
                productsHTML += `<td>${quantity}</td>`;
                productsHTML += `<td>₱${price.toFixed(2)}</td>`;
                productsHTML += `<td>₱${itemTotal.toFixed(2)}</td>`;
                productsHTML += `<td>${dimensions}</td>`;
                productsHTML += `<td>${weight}</td>`;
                
                // Add Variation column only if at least one item has a variation
                if (hasVariations) {
                    productsHTML += `<td>${variation}</td>`;
                }
                
                productsHTML += '</tr>';
            });
            
            productsHTML += '</tbody>';
            
            // Calculate colspan for footer based on whether variation column is shown
            const colspan = hasVariations ? 7 : 6;
            productsHTML += `<tfoot class="table-info"><tr><th colspan="${colspan - 3}" class="text-right">Total Amount:</th><th colspan="3">₱${totalAmount.toFixed(2)}</th></tr></tfoot>`;
            productsHTML += '</table>';
            
            productsContainer.html(productsHTML);
        } else {
            productsContainer.html('<p class="text-muted">No products found for this order.</p>');
        }
        
        // Hide loading, show content
        $('#deliveryDetailsLoading').hide();
        $('#deliveryDetailsContent').show();
        
    } catch (error) {
        console.error('[View Delivery Details] Error:', error);
        $('#deliveryDetailsLoading').hide();
        $('#deliveryDetailsError').text('Failed to load delivery details: ' + error.message).show();
    }
}

// View driver details
async function viewDriverDetails(driverId) {
    try {
        // Fetch driver information
        const response = await fetch('../api/get_delivery_drivers.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load driver information');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load driver information');
        }
        
        // Find the specific driver
        const driver = data.drivers.find(d => d.user_id === driverId);
        
        if (!driver) {
            alert('Driver not found');
            return;
        }
        
        // Get driver's active deliveries to show current delivery info
        const deliveriesResponse = await fetch('../api/load_deliveries_admin.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        let currentDelivery = null;
        let deliveryAddress = 'N/A';
        
        if (deliveriesResponse.ok) {
            const deliveriesData = await deliveriesResponse.json();
            if (deliveriesData.success && deliveriesData.deliveries) {
                // Find active delivery for this driver
                const activeDelivery = deliveriesData.deliveries.find(d => 
                    d.Driver_ID == driverId && 
                    d.Delivery_Status && 
                    !['Delivered', 'Cancelled'].includes(d.Delivery_Status)
                );
                
                if (activeDelivery) {
                    currentDelivery = activeDelivery;
                    deliveryAddress = activeDelivery.Customer_Address || 'N/A';
                }
            }
        }
        
        // Format phone number
        const phoneNumber = driver.phone_number 
            ? (driver.phone_number.toString().length > 10 
                ? `+63 ${driver.phone_number}` 
                : driver.phone_number)
            : 'No phone number';
        
        // Populate modal with driver data
        $('#modal-driver-profile-name').text(driver.full_name || 'N/A');
        $('#modal-driver-phone').text(phoneNumber);
        $('#modal-driver-vehicle').text(driver.vehicle_model || 'Unassigned');
        $('#modal-driver-delivery').text(
            currentDelivery 
                ? `DEL-${currentDelivery.Delivery_ID.toString().padStart(6, '0')}` 
                : 'No active delivery'
        );
        $('#modal-driver-location').text(deliveryAddress);
        
        // Show driver profile modal
        $('#driverProfileModal').modal('show');
        
    } catch (error) {
        console.error('[View Driver Details] Error:', error);
        alert('Failed to load driver details: ' + error.message);
    }
}

// Load drivers from database
async function loadDrivers() {
    const tbody = document.getElementById('driversTableBody');
    if (!tbody) {
        console.error('[Load Drivers] Drivers table body not found');
        return;
    }
    
    try {
        // Show loading state
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-5">
                    <p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading drivers...</p>
                </td>
            </tr>
        `;
        
        const response = await fetch('../api/get_delivery_drivers.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load drivers');
        }
        
        // Clear loading state
        tbody.innerHTML = '';
        
        if (data.drivers && data.drivers.length > 0) {
            data.drivers.forEach(driver => {
                const statusClass = driver.status === 'Available' ? 'status-available' : 'status-busy';
                const statusBadge = driver.status === 'Available' 
                    ? '<span class="status-badge status-available">Available</span>'
                    : `<span class="status-badge status-busy">Busy (${driver.active_deliveries} deliveries)</span>`;
                
                const row = `
                    <tr class="driver-row" data-driver-id="${driver.user_id}">
                        <td>
                            <div class="driver-info">
                                <div class="driver-avatar">
                                    <i class="fas fa-user-circle"></i>
                                </div>
                                <div class="driver-details">
                                    <strong class="driver-name">${driver.full_name}</strong>
                                    <small class="driver-email text-muted d-block">${driver.email}</small>
                                    <small class="driver-phone text-muted d-block">${driver.phone_number || 'No phone'}</small>
                                </div>
                            </div>
                        </td>
                        <td>
                            ${statusBadge}
                        </td>
                        <td>
                            <div class="action-buttons" style="display: flex; gap: 8px; align-items: center;">
                                <button class="action-btn view-btn" data-driver-id="${driver.user_id}" title="View Driver Details" onclick="viewDriverDetails(${driver.user_id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="action-btn remove-btn" data-driver-id="${driver.user_id}" title="Remove Driver" onclick="removeDriver(${driver.user_id}, '${driver.full_name.replace(/'/g, "\\'")}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', row);
            });
            
            console.log('[Load Drivers] ✅ Loaded', data.drivers.length, 'drivers');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center py-5">
                        <p class="text-muted">No delivery drivers found.</p>
                        <p class="text-muted" style="font-size: 12px;">Add drivers through User Management.</p>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('[Load Drivers] ❌ Error loading drivers:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center py-5">
                    <p class="text-danger">Error loading drivers: ${error.message}</p>
                    <button class="btn btn-sm btn-primary mt-2" onclick="loadDrivers()">Retry</button>
                </td>
            </tr>
        `;
    }
}

// Load fleet from database
async function loadFleet() {
    const tbody = document.getElementById('fleetTableBody');
    if (!tbody) {
        console.error('[Load Fleet] Fleet table body not found');
        return;
    }
    
    try {
        // Show loading state
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-5">
                    <p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading fleet...</p>
                </td>
            </tr>
        `;
        
        const response = await fetch('../api/get_fleet.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load fleet');
        }
        
        // Clear loading state
        tbody.innerHTML = '';
        
        if (data.vehicles && data.vehicles.length > 0) {
            data.vehicles.forEach(vehicle => {
                const statusClass = vehicle.status === 'Available' ? 'status-available' : 'status-busy';
                const statusBadge = vehicle.status === 'Available' 
                    ? '<span class="status-badge status-available">Available</span>'
                    : vehicle.status === 'Unavailable'
                    ? '<span class="status-badge status-unavailable">Unavailable</span>'
                    : `<span class="status-badge status-busy">In Use${vehicle.active_deliveries > 0 ? ` (${vehicle.active_deliveries} deliveries)` : ''}</span>`;
                
                // Format capacity display
                const capacityDisplay = vehicle.capacity !== null && vehicle.capacity !== undefined
                    ? `${parseFloat(vehicle.capacity).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${vehicle.capacity_unit || 'kg'}`
                    : '<span class="text-muted">Not set</span>';
                
                const row = `
                    <tr class="fleet-row" data-vehicle-id="${vehicle.vehicle_id}">
                        <td>
                            <div class="vehicle-info">
                                <strong class="vehicle-model">${vehicle.vehicle_model}</strong>
                                <small class="text-muted d-block">ID: ${vehicle.vehicle_id}</small>
                            </div>
                        </td>
                        <td>
                            ${statusBadge}
                        </td>
                        <td>
                            ${capacityDisplay}
                        </td>
                        <td>
                            <div class="action-buttons" style="display: flex; gap: 8px; align-items: center;">
                                <button class="action-btn edit-btn" data-vehicle-id="${vehicle.vehicle_id}" title="Edit Vehicle" onclick="editFleetVehicle(${vehicle.vehicle_id}, '${vehicle.vehicle_model.replace(/'/g, "\\'")}', '${vehicle.status}', ${vehicle.capacity !== null ? vehicle.capacity : 'null'}, '${vehicle.capacity_unit || 'kg'}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn remove-btn" data-vehicle-id="${vehicle.vehicle_id}" title="Remove Vehicle" onclick="removeFleetVehicle(${vehicle.vehicle_id}, '${vehicle.vehicle_model.replace(/'/g, "\\'")}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', row);
            });
            
            console.log('[Load Fleet] ✅ Loaded', data.vehicles.length, 'vehicles');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-5">
                        <p class="text-muted">No fleet vehicles found.</p>
                        <p class="text-muted" style="font-size: 12px;">Click "Add Fleet" to add vehicles.</p>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('[Load Fleet] ❌ Error loading fleet:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-5">
                    <p class="text-danger">Error loading fleet: ${error.message}</p>
                    <button class="btn btn-sm btn-primary mt-2" onclick="loadFleet()">Retry</button>
                </td>
            </tr>
        `;
    }
}

// Initialize on page load
console.log('[Load Deliveries] Script loaded, initializing...');

// Wait for DOM and jQuery to be ready
function initializeDeliveries() {
    console.log('[Load Deliveries] DOM ready, starting initialization...');
    
    // Wait a bit for other scripts to load
    setTimeout(() => {
        // Load deliveries for Active Deliveries tab
        loadDeliveries();
        
        // Load drivers when drivers tab is clicked
        const driversTab = document.getElementById('drivers-tab');
        if (driversTab) {
            driversTab.addEventListener('click', function() {
                loadDrivers();
            });
        }
        
        // Load drivers initially if drivers tab is active
        if (document.querySelector('#drivers-tab.active')) {
            loadDrivers();
        }
        
        // Load fleet when fleet tab is clicked
        const fleetTab = document.getElementById('fleet-tab');
        if (fleetTab) {
            fleetTab.addEventListener('click', function() {
                loadFleet();
            });
        }
        
        // Load fleet initially if fleet tab is active
        if (document.querySelector('#fleet-tab.active')) {
            loadFleet();
        }
        
        // Auto-refresh every 15 seconds (only for active deliveries and history tabs)
        if (window.deliveriesRefreshInterval) {
            clearInterval(window.deliveriesRefreshInterval);
        }
        window.deliveriesRefreshInterval = setInterval(() => {
            // Skip auto-refresh if status update is in progress to prevent glitching
            if (isStatusUpdateInProgress) {
                console.log('[Auto-Refresh] Skipping refresh - status update in progress');
                return;
            }
            
            // Refresh based on active tab
            const activeTab = document.querySelector('.tab-btn.active');
            const activeTabName = activeTab ? activeTab.getAttribute('data-tab') : '';
            if (activeTabName === 'active-deliveries' || activeTabName === 'delivery-history') {
                loadDeliveries();
            } else if (activeTabName === 'drivers') {
                // Refresh drivers tab
                if (typeof loadDrivers === 'function') {
                    loadDrivers();
                }
            } else if (activeTabName === 'fleet') {
                // Refresh fleet tab
                if (typeof loadFleet === 'function') {
                    loadFleet();
                }
            }
        }, 15000); // Refresh every 15 seconds
    }, 500);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDeliveries);
} else {
    // DOM already loaded
    if (typeof $ !== 'undefined' && $.isReady) {
        initializeDeliveries();
    } else {
        // Wait for jQuery
        $(document).ready(initializeDeliveries);
    }
}

// Assign driver to delivery
async function assignDriverToDelivery(deliveryId, orderId, currentDriverId) {
    try {
        // Load drivers for dropdown
        const driversResponse = await fetch('../api/get_delivery_drivers.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!driversResponse.ok) {
            throw new Error('Failed to load drivers');
        }
        
        const driversData = await driversResponse.json();
        
        if (!driversData.success) {
            throw new Error(driversData.message || 'Failed to load drivers');
        }
        
        // Get delivery info for display
        const deliveryCard = document.querySelector(`[data-delivery-id="${deliveryId}"]`);
        const deliveryCode = deliveryCard ? deliveryCard.querySelector('.delivery-code')?.textContent : `DEL-${deliveryId}`;
        const customerName = deliveryCard ? deliveryCard.querySelector('.customer-name')?.textContent : 'Unknown';
        
        // Populate modal
        $('#assignDriverDeliveryCode').text(deliveryCode);
        $('#assignDriverCustomerName').text(customerName);
        
        // Get currently assigned drivers for this delivery
        let currentDriverIds = [];
        if (deliveryCard) {
            const driverElements = deliveryCard.querySelectorAll('.driver-name[data-driver-id]');
            currentDriverIds = Array.from(driverElements)
                .map(el => parseInt(el.getAttribute('data-driver-id')))
                .filter(id => !isNaN(id) && id > 0);
        }
        if (currentDriverIds.length === 0 && currentDriverId) {
            currentDriverIds = [currentDriverId];
        }
        
        // Populate driver checkboxes
        const driverCheckboxesContainer = document.getElementById('driverCheckboxes');
        driverCheckboxesContainer.innerHTML = '';
        
        if (driversData.drivers && driversData.drivers.length > 0) {
            driversData.drivers.forEach(driver => {
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'form-check mb-2';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'form-check-input driver-checkbox';
                checkbox.id = `driver-checkbox-${driver.user_id}`;
                checkbox.value = driver.user_id;
                checkbox.checked = currentDriverIds.includes(driver.user_id);
                
                const label = document.createElement('label');
                label.className = 'form-check-label';
                label.htmlFor = `driver-checkbox-${driver.user_id}`;
                label.textContent = `${driver.full_name} ${driver.status === 'Available' ? '(Available)' : '(Busy)'}`;
                
                checkboxDiv.appendChild(checkbox);
                checkboxDiv.appendChild(label);
                driverCheckboxesContainer.appendChild(checkboxDiv);
            });
        } else {
            driverCheckboxesContainer.innerHTML = '<p class="text-muted">No drivers available.</p>';
        }
        
        // Store delivery info in modal for use in confirm button
        $('#assignDriverModal').data('delivery-id', deliveryId);
        $('#assignDriverModal').data('order-id', orderId);
        
        // Show modal
        $('#assignDriverModal').modal('show');
        
    } catch (error) {
        console.error('[Assign Driver] Error:', error);
        alert('Failed to load drivers: ' + error.message);
    }
}

// Handle assign driver button clicks
$(document).on('click', '.assign-driver-btn', function() {
    const deliveryId = parseInt($(this).data('delivery-id'));
    const orderId = parseInt($(this).data('order-id'));
    const currentDriverId = $(this).data('current-driver-id') || null;
    
    assignDriverToDelivery(deliveryId, orderId, currentDriverId);
});

// Handle confirm assign driver button
$('#confirmAssignDriverBtn').on('click', async function() {
    const deliveryId = $('#assignDriverModal').data('delivery-id');
    const orderId = $('#assignDriverModal').data('order-id');
    
    // Get all selected driver IDs from checkboxes
    const selectedDriverIds = [];
    document.querySelectorAll('.driver-checkbox:checked').forEach(checkbox => {
        selectedDriverIds.push(parseInt(checkbox.value));
    });
    
    const driverIds = selectedDriverIds.length > 0 ? selectedDriverIds : null;
    
    if (!deliveryId) {
        alert('Delivery ID is missing');
        return;
    }
    
    // Show loading
    $('#assignDriverLoading').show();
    $('#confirmAssignDriverBtn').prop('disabled', true);
    
    try {
        const response = await fetch('../api/assign_driver_to_delivery.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                delivery_id: deliveryId,
                driver_ids: driverIds
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to assign driver');
        }
        
        alert(data.message || 'Driver assigned successfully!');
        
        // Close modal
        $('#assignDriverModal').modal('hide');
        
        // Reload deliveries to show updated driver assignment
        await loadDeliveries();
        
    } catch (error) {
        console.error('[Assign Driver] Error:', error);
        alert('Failed to assign driver: ' + error.message);
    } finally {
        $('#assignDriverLoading').hide();
        $('#confirmAssignDriverBtn').prop('disabled', false);
    }
});

// Convert weight to kilograms
function convertWeightToKg(weight, unit) {
    if (!weight || weight === 0) return 0;
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue)) return 0;
    switch (unit?.toLowerCase()) {
        case 'kg': return weightValue;
        case 'g': return weightValue / 1000;
        case 'lb': return weightValue * 0.453592;
        case 'oz': return weightValue * 0.0283495;
        case 'ton': return weightValue * 1000;
        default: return weightValue;
    }
}

// Global cache for vehicle capacities
let vehicleCapacitiesCache = null;

// Load vehicle capacities from fleet
async function loadVehicleCapacities() {
    if (vehicleCapacitiesCache) {
        return vehicleCapacitiesCache;
    }
    
    try {
        const response = await fetch('../api/get_fleet.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.vehicles) {
                vehicleCapacitiesCache = data.vehicles.map(vehicle => {
                    let capacityKg = parseFloat(vehicle.capacity) || 0;
                    const unit = vehicle.capacity_unit || 'kg';
                    
                    // Convert to kg
                    capacityKg = convertWeightToKg(capacityKg, unit);
                    
                    return {
                        id: vehicle.vehicle_id || vehicle.Vehicle_ID,
                        model: vehicle.vehicle_model,
                        capacity: capacityKg,
                        status: vehicle.status
                    };
                }).filter(v => v.status === 'Available' || v.status === 'In Use');
                
                return vehicleCapacitiesCache;
            }
        }
    } catch (error) {
        console.error('Error loading vehicle capacities:', error);
    }
    
    // Return default if API fails
    return [{ id: 1, model: 'Default Truck', capacity: 1700, status: 'Available' }];
}

// Calculate trucks needed for a delivery order
async function calculateTrucksNeededForDelivery(orderWeightKg) {
    try {
        const vehicles = await loadVehicleCapacities();
        
        if (!vehicles || vehicles.length === 0) {
            return { trucks: 1, vehicles: [] };
        }
        
        const orderWeight = parseFloat(orderWeightKg) || 0;
        if (orderWeight <= 0) {
            // If no weight, default to 1 truck
            return { trucks: 1, vehicles: [] };
        }
        
        let remainingWeight = orderWeight;
        let trucksNeeded = 0;
        const vehiclesUsed = [];
        
        // Use largest vehicles first
        const sortedVehicles = [...vehicles].sort((a, b) => b.capacity - a.capacity);
        
        for (const vehicle of sortedVehicles) {
            if (remainingWeight <= 0) break;
            
            const trips = Math.ceil(remainingWeight / vehicle.capacity);
            trucksNeeded += trips;
            
            if (trips > 0) {
                vehiclesUsed.push({
                    vehicle: vehicle.model,
                    capacity: vehicle.capacity,
                    trips: trips
                });
            }
            
            remainingWeight -= (vehicle.capacity * trips);
        }
        
        // If still weight remaining, add one more truck
        if (remainingWeight > 0) {
            trucksNeeded += 1;
        }
        
        // Ensure at least 1 truck
        if (trucksNeeded === 0) {
            trucksNeeded = 1;
        }
        
        return {
            trucks: trucksNeeded,
            vehicles: vehiclesUsed
        };
    } catch (error) {
        console.error('[Calculate Trucks] Error:', error);
        // Return default on error
        return { trucks: 1, vehicles: [] };
    }
}

// Calculate order weight from order items
async function calculateOrderWeight(orderId) {
    try {
        // Get order details
        const response = await fetch(`../api/get_orders.php?order_id=${orderId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success) {
            // Try with orders array format
            if (data.order && data.order.items) {
                const order = data.order;
                let totalWeightKg = 0;
                
                if (order.items && order.items.length > 0) {
                    for (const item of order.items) {
                        if (item.weight) {
                            const weightKg = convertWeightToKg(item.weight, item.weight_unit);
                            totalWeightKg += weightKg * item.quantity;
                        }
                    }
                }
                
                return totalWeightKg > 0 ? totalWeightKg : null;
            }
            return null;
        }
        
        // Handle both single order and orders array formats
        const order = data.order || (data.orders && data.orders.length > 0 ? data.orders[0] : null);
        if (!order) {
            return null;
        }
        
        let totalWeightKg = 0;
        
        // Calculate weight from order items (weight is now included in the API response)
        if (order.items && order.items.length > 0) {
            for (const item of order.items) {
                if (item.weight) {
                    const weightKg = convertWeightToKg(item.weight, item.weight_unit);
                    totalWeightKg += weightKg * item.quantity;
                }
            }
        }
        
        return totalWeightKg > 0 ? totalWeightKg : null;
    } catch (error) {
        console.error('Error calculating order weight:', error);
        return null;
    }
}

// Assign vehicle to delivery
async function assignVehicleToDelivery(deliveryId, orderId, currentVehicleId) {
    try {
        // Load vehicles and order weight in parallel
        const [vehiclesResponse, orderWeightKg] = await Promise.all([
            fetch('../api/get_fleet.php', {
                method: 'GET',
                credentials: 'include'
            }),
            calculateOrderWeight(orderId)
        ]);
        
        if (!vehiclesResponse.ok) {
            throw new Error('Failed to load vehicles');
        }
        
        const vehiclesData = await vehiclesResponse.json();
        
        if (!vehiclesData.success) {
            throw new Error(vehiclesData.message || 'Failed to load vehicles');
        }
        
        // Get delivery info for display
        const deliveryCard = document.querySelector(`[data-delivery-id="${deliveryId}"]`);
        const deliveryCode = deliveryCard ? deliveryCard.querySelector('.delivery-code')?.textContent : `DEL-${deliveryId}`;
        const customerName = deliveryCard ? deliveryCard.querySelector('.customer-name')?.textContent : 'Unknown';
        
        // Populate modal
        $('#assignVehicleDeliveryCode').text(deliveryCode);
        $('#assignVehicleCustomerName').text(customerName);
        
        // Show order weight if available
        const orderWeightDisplay = document.getElementById('assignVehicleOrderWeight');
        if (orderWeightDisplay) {
            if (orderWeightKg !== null && orderWeightKg > 0) {
                orderWeightDisplay.textContent = `${orderWeightKg.toFixed(2)} kg`;
                orderWeightDisplay.closest('.form-group')?.style.setProperty('display', 'block');
            } else {
                orderWeightDisplay.closest('.form-group')?.style.setProperty('display', 'none');
            }
        }
        
        // Get currently assigned vehicles for this delivery
        let currentVehicleIds = [];
        if (deliveryCard) {
            const vehicleElements = deliveryCard.querySelectorAll('.vehicle-name[data-vehicle-id]');
            currentVehicleIds = Array.from(vehicleElements)
                .map(el => parseInt(el.getAttribute('data-vehicle-id')))
                .filter(id => !isNaN(id) && id > 0);
        }
        if (currentVehicleIds.length === 0 && currentVehicleId) {
            currentVehicleIds = [currentVehicleId];
        }
        
        // Populate vehicle checkboxes with capacity matching
        const vehicleCheckboxesContainer = document.getElementById('vehicleCheckboxes');
        const capacitySuggestions = document.getElementById('capacitySuggestions');
        
        vehicleCheckboxesContainer.innerHTML = '';
        
        if (capacitySuggestions) {
            capacitySuggestions.innerHTML = '';
        }
        
        if (vehiclesData.vehicles && vehiclesData.vehicles.length > 0) {
            // Sort vehicles by capacity suitability if order weight is known
            let sortedVehicles = [...vehiclesData.vehicles];
            
            if (orderWeightKg !== null && orderWeightKg > 0) {
                sortedVehicles.sort((a, b) => {
                    const capacityA = convertWeightToKg(a.capacity || 0, a.capacity_unit || 'kg');
                    const capacityB = convertWeightToKg(b.capacity || 0, b.capacity_unit || 'kg');
                    
                    // Prioritize vehicles that can handle the weight
                    const canHandleA = capacityA >= orderWeightKg;
                    const canHandleB = capacityB >= orderWeightKg;
                    
                    if (canHandleA && !canHandleB) return -1;
                    if (!canHandleA && canHandleB) return 1;
                    
                    // Among vehicles that can/can't handle, sort by capacity (closest first)
                    if (canHandleA && canHandleB) {
                        return capacityA - capacityB; // Smallest suitable first
                    } else {
                        return capacityB - capacityA; // Largest unsuitable first
                    }
                });
            }
            
            sortedVehicles.forEach(vehicle => {
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'form-check mb-2';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'form-check-input vehicle-checkbox';
                checkbox.id = `vehicle-checkbox-${vehicle.vehicle_id}`;
                checkbox.value = vehicle.vehicle_id;
                checkbox.checked = currentVehicleIds.includes(vehicle.vehicle_id);
                
                const capacityKg = convertWeightToKg(vehicle.capacity || 0, vehicle.capacity_unit || 'kg');
                const capacityDisplay = vehicle.capacity ? `${vehicle.capacity} ${vehicle.capacity_unit || 'kg'}` : 'N/A';
                
                let labelText = `${vehicle.vehicle_model} (${capacityDisplay})`;
                
                // Add status indicator
                if (vehicle.status === 'Available') {
                    labelText += ' - Available';
                } else if (vehicle.status === 'In Use') {
                    labelText += ' - In Use';
                } else {
                    labelText += ' - Unavailable';
                }
                
                // Add capacity match indicator if order weight is known
                if (orderWeightKg !== null && orderWeightKg > 0 && capacityKg > 0) {
                    if (capacityKg >= orderWeightKg) {
                        const utilization = ((orderWeightKg / capacityKg) * 100).toFixed(1);
                        labelText += ` ✓ (${utilization}% capacity)`;
                    } else {
                        const shortage = (orderWeightKg - capacityKg).toFixed(2);
                        labelText += ` ⚠ (${shortage} kg over capacity)`;
                    }
                }
                
                const label = document.createElement('label');
                label.className = 'form-check-label';
                label.htmlFor = `vehicle-checkbox-${vehicle.vehicle_id}`;
                label.textContent = labelText;
                
                checkboxDiv.appendChild(checkbox);
                checkboxDiv.appendChild(label);
                vehicleCheckboxesContainer.appendChild(checkboxDiv);
            });
            
            // Show capacity suggestions
            if (capacitySuggestions && orderWeightKg !== null && orderWeightKg > 0) {
                const suitableVehicles = sortedVehicles.filter(v => {
                    const cap = convertWeightToKg(v.capacity || 0, v.capacity_unit || 'kg');
                    return cap >= orderWeightKg && v.status === 'Available';
                });
                
                const unsuitableVehicles = sortedVehicles.filter(v => {
                    const cap = convertWeightToKg(v.capacity || 0, v.capacity_unit || 'kg');
                    return cap < orderWeightKg && v.status === 'Available';
                });
                
                if (suitableVehicles.length > 0) {
                    const suggestionsDiv = document.createElement('div');
                    suggestionsDiv.className = 'alert alert-success';
                    suggestionsDiv.innerHTML = `
                        <strong><i class="fas fa-check-circle"></i> Recommended Vehicles:</strong>
                        <ul class="mb-0 mt-2">
                            ${suitableVehicles.slice(0, 3).map(v => {
                                const cap = convertWeightToKg(v.capacity || 0, v.capacity_unit || 'kg');
                                const utilization = ((orderWeightKg / cap) * 100).toFixed(1);
                                return `<li>${v.vehicle_model} - ${v.capacity} ${v.capacity_unit || 'kg'} capacity (${utilization}% utilization)</li>`;
                            }).join('')}
                        </ul>
                    `;
                    capacitySuggestions.appendChild(suggestionsDiv);
                } else if (unsuitableVehicles.length > 0) {
                    const warningDiv = document.createElement('div');
                    warningDiv.className = 'alert alert-warning';
                    warningDiv.innerHTML = `
                        <strong><i class="fas fa-exclamation-triangle"></i> No vehicles can handle this order weight.</strong>
                        <p class="mb-0 mt-2">Order weight: ${orderWeightKg.toFixed(2)} kg</p>
                        <p class="mb-0">Largest available vehicle: ${unsuitableVehicles[0].vehicle_model} (${unsuitableVehicles[0].capacity} ${unsuitableVehicles[0].capacity_unit || 'kg'})</p>
                    `;
                    capacitySuggestions.appendChild(warningDiv);
                }
            }
        }
        
        // Store delivery info in modal for use in confirm button
        $('#assignVehicleModal').data('delivery-id', deliveryId);
        $('#assignVehicleModal').data('order-id', orderId);
        $('#assignVehicleModal').data('previous-vehicle-id', currentVehicleId || null);
        $('#assignVehicleModal').data('order-weight', orderWeightKg);
        
        // Show modal
        $('#assignVehicleModal').modal('show');
        
    } catch (error) {
        console.error('[Assign Vehicle] Error:', error);
        alert('Failed to load vehicles: ' + error.message);
    }
}

// Handle assign vehicle button clicks
$(document).on('click', '.assign-vehicle-btn', function() {
    const deliveryId = parseInt($(this).data('delivery-id'));
    const orderId = parseInt($(this).data('order-id'));
    const currentVehicleId = $(this).data('current-vehicle-id') || null;
    
    assignVehicleToDelivery(deliveryId, orderId, currentVehicleId);
});

// Handle confirm assign vehicle button
$('#confirmAssignVehicleBtn').on('click', async function() {
    const deliveryId = $('#assignVehicleModal').data('delivery-id');
    const orderId = $('#assignVehicleModal').data('order-id');
    const previousVehicleId = $('#assignVehicleModal').data('previous-vehicle-id');
    
    // Get all selected vehicle IDs from checkboxes
    const selectedVehicleIds = [];
    document.querySelectorAll('.vehicle-checkbox:checked').forEach(checkbox => {
        selectedVehicleIds.push(parseInt(checkbox.value));
    });
    
    const vehicleIds = selectedVehicleIds.length > 0 ? selectedVehicleIds : null;
    
    if (!deliveryId) {
        alert('Delivery ID is missing');
        return;
    }
    
    // Show loading
    $('#assignVehicleLoading').show();
    $('#confirmAssignVehicleBtn').prop('disabled', true);
    
    try {
        const response = await fetch('../api/assign_vehicle.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                delivery_id: deliveryId,
                vehicle_ids: vehicleIds
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to assign vehicle');
        }
        
        alert(data.message || 'Vehicle assigned successfully!');
        
        // Close modal
        $('#assignVehicleModal').modal('hide');
        
        // Reload deliveries to show updated vehicle assignment
        await loadDeliveries();
        
    } catch (error) {
        console.error('[Assign Vehicle] Error:', error);
        alert('Failed to assign vehicle: ' + error.message);
    } finally {
        $('#assignVehicleLoading').hide();
        $('#confirmAssignVehicleBtn').prop('disabled', false);
    }
});

// Add Driver - Opens modal
function addDriver() {
    // Reset form
    $('#addDriverForm')[0].reset();
    $('#addDriverError').hide().text('');
    $('#addDriverLoading').hide();
    
    // Show modal
    $('#addDriverModal').modal('show');
}

// Handle confirm add driver button
$('#confirmAddDriverBtn').on('click', async function() {
    const firstName = $('#driverFirstName').val().trim();
    const lastName = $('#driverLastName').val().trim();
    const middleName = $('#driverMiddleName').val().trim() || null;
    const email = $('#driverEmail').val().trim();
    const password = $('#driverPassword').val();
    const address = $('#driverAddress').val().trim();
    const phoneNumber = $('#driverPhone').val().trim() || null;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !password || !address) {
        $('#addDriverError').text('Please fill in all required fields.').show();
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        $('#addDriverError').text('Please enter a valid email address.').show();
        return;
    }
    
    // Show loading
    $('#addDriverLoading').show();
    $('#addDriverError').hide();
    $('#confirmAddDriverBtn').prop('disabled', true);
    
    try {
        const response = await fetch('../api/add_driver.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                middle_name: middleName,
                email: email,
                password: password,
                address: address,
                phone_number: phoneNumber
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to add driver');
        }
        
        alert('Driver added successfully!');
        
        // Close modal
        $('#addDriverModal').modal('hide');
        
        // Reload drivers
        await loadDrivers();
        
    } catch (error) {
        console.error('[Add Driver] Error:', error);
        $('#addDriverError').text(error.message || 'Failed to add driver').show();
    } finally {
        $('#addDriverLoading').hide();
        $('#confirmAddDriverBtn').prop('disabled', false);
    }
});

// Remove Driver
async function removeDriver(driverId, driverName) {
    if (!confirm(`Are you sure you want to remove driver "${driverName}"?\n\nThis will unassign them from active deliveries and change their role to Customer.`)) {
        return;
    }
    
    try {
        const response = await fetch('../api/remove_driver.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                driver_id: driverId
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to remove driver');
        }
        
        alert(data.message || 'Driver removed successfully!');
        await loadDrivers();
        
    } catch (error) {
        console.error('[Remove Driver] Error:', error);
        alert('Failed to remove driver: ' + error.message);
    }
}

// Add Fleet Vehicle - Opens modal
function addFleetVehicle() {
    // Reset form
    $('#addFleetForm')[0].reset();
    $('#vehicleStatus').val('Available'); // Set default
    $('#vehicleCapacityUnit').val('kg'); // Set default capacity unit
    $('#addFleetError').hide().text('');
    $('#addFleetLoading').hide();
    
    // Show modal
    $('#addFleetModal').modal('show');
}

// Handle confirm add fleet button
$('#confirmAddFleetBtn').on('click', async function() {
    const vehicleModel = $('#vehicleModel').val().trim();
    const status = $('#vehicleStatus').val();
    const capacity = parseFloat($('#vehicleCapacity').val());
    const capacityUnit = $('#vehicleCapacityUnit').val();
    
    // Validate required fields
    if (!vehicleModel) {
        $('#addFleetError').text('Please enter a vehicle model.').show();
        return;
    }
    
    if (isNaN(capacity) || capacity <= 0) {
        $('#addFleetError').text('Please enter a valid capacity greater than 0.').show();
        return;
    }
    
    // Show loading
    $('#addFleetLoading').show();
    $('#addFleetError').hide();
    $('#confirmAddFleetBtn').prop('disabled', true);
    
    try {
        const response = await fetch('../api/add_fleet_vehicle.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                vehicle_model: vehicleModel,
                status: status,
                capacity: capacity,
                capacity_unit: capacityUnit
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to add vehicle');
        }
        
        alert('Vehicle added successfully!');
        
        // Close modal
        $('#addFleetModal').modal('hide');
        
        // Reload fleet
        await loadFleet();
        
    } catch (error) {
        console.error('[Add Fleet Vehicle] Error:', error);
        $('#addFleetError').text(error.message || 'Failed to add vehicle').show();
    } finally {
        $('#addFleetLoading').hide();
        $('#confirmAddFleetBtn').prop('disabled', false);
    }
});

// Edit Fleet Vehicle
async function editFleetVehicle(vehicleId, currentModel, currentStatus, currentCapacity = null, currentCapacityUnit = 'kg') {
    // Populate edit modal with current values
    $('#editVehicleId').val(vehicleId);
    $('#editVehicleModel').val(currentModel || '');
    $('#editVehicleStatus').val(currentStatus || 'Available');
    $('#editVehicleCapacity').val(currentCapacity !== null ? currentCapacity : '');
    $('#editVehicleCapacityUnit').val(currentCapacityUnit || 'kg');
    
    // Reset error and loading states
    $('#editFleetError').hide().text('');
    $('#editFleetLoading').hide();
    
    // Show modal
    $('#editFleetModal').modal('show');
}

// Remove Fleet Vehicle
async function removeFleetVehicle(vehicleId, vehicleModel) {
    if (!confirm(`Are you sure you want to remove vehicle "${vehicleModel}"?\n\nThis will unassign it from active deliveries.`)) {
        return;
    }
    
    try {
        const response = await fetch('../api/remove_fleet_vehicle.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                vehicle_id: vehicleId
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to remove vehicle');
        }
        
        alert(data.message || 'Vehicle removed successfully!');
        await loadFleet();
        
    } catch (error) {
        console.error('[Remove Fleet Vehicle] Error:', error);
        alert('Failed to remove vehicle: ' + error.message);
    }
}

// Reset add driver modal when closed
$('#addDriverModal').on('hidden.bs.modal', function() {
    $('#addDriverForm')[0].reset();
    $('#addDriverError').hide().text('');
    $('#addDriverLoading').hide();
    $('#confirmAddDriverBtn').prop('disabled', false);
});

// Handle confirm edit fleet button
$('#confirmEditFleetBtn').on('click', async function() {
    const vehicleId = parseInt($('#editVehicleId').val());
    const vehicleModel = $('#editVehicleModel').val().trim();
    const status = $('#editVehicleStatus').val();
    const capacity = parseFloat($('#editVehicleCapacity').val());
    const capacityUnit = $('#editVehicleCapacityUnit').val();
    
    // Validate required fields
    if (!vehicleId) {
        $('#editFleetError').text('Vehicle ID is missing.').show();
        return;
    }
    
    if (!vehicleModel) {
        $('#editFleetError').text('Please enter a vehicle model.').show();
        return;
    }
    
    if (isNaN(capacity) || capacity <= 0) {
        $('#editFleetError').text('Please enter a valid capacity greater than 0.').show();
        return;
    }
    
    // Show loading
    $('#editFleetLoading').show();
    $('#editFleetError').hide();
    $('#confirmEditFleetBtn').prop('disabled', true);
    
    try {
        const response = await fetch('../api/update_fleet_vehicle.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                vehicle_id: vehicleId,
                vehicle_model: vehicleModel,
                status: status,
                capacity: capacity,
                capacity_unit: capacityUnit
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to update vehicle');
        }
        
        alert('Vehicle updated successfully!');
        
        // Close modal
        $('#editFleetModal').modal('hide');
        
        // Reload fleet
        await loadFleet();
        
    } catch (error) {
        console.error('[Edit Fleet Vehicle] Error:', error);
        $('#editFleetError').text(error.message || 'Failed to update vehicle').show();
    } finally {
        $('#editFleetLoading').hide();
        $('#confirmEditFleetBtn').prop('disabled', false);
    }
});

// Reset add fleet modal when closed
$('#addFleetModal').on('hidden.bs.modal', function() {
    $('#addFleetForm')[0].reset();
    $('#vehicleStatus').val('Available');
    $('#vehicleCapacityUnit').val('kg');
    $('#addFleetError').hide().text('');
    $('#addFleetLoading').hide();
    $('#confirmAddFleetBtn').prop('disabled', false);
});

// Reset edit fleet modal when closed
$('#editFleetModal').on('hidden.bs.modal', function() {
    $('#editFleetForm')[0].reset();
    $('#editVehicleId').val('');
    $('#editVehicleStatus').val('Available');
    $('#editVehicleCapacityUnit').val('kg');
    $('#editFleetError').hide().text('');
    $('#editFleetLoading').hide();
    $('#confirmEditFleetBtn').prop('disabled', false);
});

// Export functions for global access
window.loadDeliveries = loadDeliveries;
window.updateDeliveryStatus = updateDeliveryStatus;
window.viewDeliveryDetails = viewDeliveryDetails;
window.loadDrivers = loadDrivers;
window.loadFleet = loadFleet;
window.assignDriverToDelivery = assignDriverToDelivery;
window.assignVehicleToDelivery = assignVehicleToDelivery;
window.addDriver = addDriver;
window.removeDriver = removeDriver;
window.viewDriverDetails = viewDriverDetails;
window.addFleetVehicle = addFleetVehicle;
window.editFleetVehicle = editFleetVehicle;
window.removeFleetVehicle = removeFleetVehicle;


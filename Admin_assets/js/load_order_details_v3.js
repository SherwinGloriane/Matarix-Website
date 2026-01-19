/**
 * Load Order Details for Admin View
 * Loads order details from API based on order_id in URL
 * VERSION 3.0 - Fixed proof of payment display with escaped slash handling
 */

console.log('🚀🚀🚀 load_order_details.js VERSION 3.0 LOADED - Proof of Payment Feature Enabled 🚀🚀🚀');
console.log('🔵 VERSION CHECK: If you see this, the new version is loaded!');

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
        month: 'long',
        day: 'numeric'
    });
}

// Format time
function formatTime(timeString) {
    if (!timeString) return 'N/A';
    
    // Handle time-only strings (HH:MM:SS or HH:MM)
    // Check if it's a time-only format (contains : but no date parts)
    if (timeString.includes(':') && !timeString.includes('T') && !timeString.includes(' ') && !timeString.includes('-')) {
        const timeParts = timeString.split(':');
        if (timeParts.length >= 2) {
            const hour = parseInt(timeParts[0], 10);
            const minutes = timeParts[1];
            if (!isNaN(hour) && hour >= 0 && hour <= 23) {
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                return `${displayHour}:${minutes} ${ampm}`;
            }
        }
    }
    
    // Handle full datetime strings
    try {
        const date = new Date(timeString);
        if (isNaN(date.getTime())) {
            // If date parsing fails, try to extract time from the string
            const timeMatch = timeString.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
            if (timeMatch) {
                const hour = parseInt(timeMatch[1], 10);
                const minutes = timeMatch[2];
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                return `${displayHour}:${minutes} ${ampm}`;
            }
            return 'N/A';
        }
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        console.error('Error formatting time:', timeString, error);
        return 'N/A';
    }
}

// Load order details on page load
async function loadOrderDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    
    if (!orderId) {
        console.error('No order_id in URL');
        alert('No order ID provided. Redirecting to Orders page...');
        window.location.href = 'OrdersAdmin.html';
        return;
    }
    
    console.log(`[Order Details] Loading order: ${orderId}`);
    
    try {
        const response = await fetch(`../api/get_orders.php?order_id=${orderId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                alert('Please log in to view order details');
                window.location.href = '../Admin/AdminLogin.html';
                return;
            } else if (response.status === 404) {
                alert('Order not found');
                window.location.href = 'OrdersAdmin.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[Order Details] API Response:', data);
        
        if (data.success && data.order) {
            console.log('🔴🔴🔴 ABOUT TO CALL displayOrderDetails - THIS IS VERSION 3.0 🔴🔴🔴');
            displayOrderDetails(data.order);
        } else {
            console.error('Failed to load order:', data.message);
            alert('Failed to load order details: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        alert('Error loading order details. Please try again.');
    }
}

// Display order details
function displayOrderDetails(order) {
    console.log('🔵🔵🔵 [Order Details] FUNCTION CALLED - displayOrderDetails VERSION 3.0 🔵🔵🔵');
    console.log('[Order Details] Displaying order:', order);
    console.log('[Order Details] Order proof_of_payment field (RAW):', order.proof_of_payment);
    console.log('[Order Details] Order payment_method field:', order.payment_method);
    console.log('[Order Details] Order transaction_payment_method field:', order.transaction_payment_method);
    console.log('[Order Details] All order keys:', Object.keys(order));
    
    // Update customer information
    const customerName = order.First_Name && order.Last_Name 
        ? `${order.First_Name} ${order.Last_Name}`.trim()
        : order.email || 'Unknown Customer';
    
    const customerNameEl = document.querySelector('.customer-name');
    if (customerNameEl) {
        // Set customer name (View Profile button removed)
        customerNameEl.textContent = customerName;
    }
    
    const customerAddressEl = document.querySelector('.customer-address');
    if (customerAddressEl) {
        customerAddressEl.textContent = order.address || 'No address provided';
    }
    
    const customerPhoneEl = document.querySelector('.customer-phone');
    if (customerPhoneEl) {
        customerPhoneEl.textContent = order.Phone_Number || 'No phone number';
    }
    
    // Update customer availability (delivery date only - time no longer used)
    const deliveryDateEl = document.querySelector('.delivery-date');
    
    if (order.availability_date) {
        if (deliveryDateEl) {
            deliveryDateEl.textContent = formatDate(order.availability_date);
        }
    } else {
        if (deliveryDateEl) {
            deliveryDateEl.textContent = 'Not specified';
        }
    }
    
    // Update order items table
    const orderItemsTableBody = document.querySelector('#orderItemsTable tbody');
    if (orderItemsTableBody && order.items && order.items.length > 0) {
        orderItemsTableBody.innerHTML = '';
        
        // Check if any item has a variation (from product_variations table)
        const hasVariations = order.items.some(item => item.variation && item.variation.trim() !== '');
        
        // Show/hide variation column header based on whether any item has variations
        const variationHeader = document.querySelector('#orderItemsTable thead th.variation-column');
        if (variationHeader) {
            if (hasVariations) {
                variationHeader.style.display = '';
            } else {
                variationHeader.style.display = 'none';
            }
        }
        
        order.items.forEach(item => {
            const row = document.createElement('tr');
            
            // Product image column
            const imgCell = document.createElement('td');
            // Get product image path with fallback
            let imagePath = '../Customer_assets/images/Slice 15 (2).png'; // Default fallback
            if (item.image_path) {
                imagePath = '../' + item.image_path;
            }
            imgCell.innerHTML = `<img src="${imagePath}" alt="${item.Product_Name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.src='../Customer_assets/images/Slice 15 (2).png'">`;
            row.appendChild(imgCell);
            
            // Product name column
            const nameCell = document.createElement('td');
            nameCell.textContent = item.Product_Name || 'Unknown Product';
            row.appendChild(nameCell);
            
            // Quantity column
            const qtyCell = document.createElement('td');
            qtyCell.textContent = item.Quantity || 0;
            row.appendChild(qtyCell);
            
            // Variation column (only add if at least one item has a variation)
            if (hasVariations) {
                const varCell = document.createElement('td');
                // Use variation from API (product_variations table)
                if (item.variation && item.variation.trim() !== '') {
                    varCell.textContent = item.variation;
                } else {
                    varCell.textContent = 'N/A';
                }
                row.appendChild(varCell);
            }
            
            // Price column
            const priceCell = document.createElement('td');
            priceCell.textContent = formatPrice(item.Price || 0);
            row.appendChild(priceCell);
            
            // Total column
            const totalCell = document.createElement('td');
            const itemTotal = (parseFloat(item.Price || 0) * parseInt(item.Quantity || 0));
            totalCell.textContent = formatPrice(itemTotal);
            row.appendChild(totalCell);
            
            orderItemsTableBody.appendChild(row);
        });
    }
    
    // Update total amount
    const totalAmountEl = document.querySelector('.total-amount');
    if (totalAmountEl) {
        totalAmountEl.textContent = formatPrice(order.amount || order.Total || 0);
    }
    
    // Update payment method text
    const paymentTitleEl = document.querySelector('.payment-title');
    if (paymentTitleEl) {
        const paymentMethod = order.payment_method || order.transaction_payment_method || 'Not specified';
        paymentTitleEl.textContent = `Paid thru: ${paymentMethod}`;
    }
    
    // Determine order status for action buttons
    const orderStatus = order.status || 'Pending Approval';
    const isPendingApproval = orderStatus === 'Pending Approval';
    const isRejected = orderStatus === 'Rejected';
    const isApproved = !isPendingApproval && !isRejected;
    
    // Display rejection notice if order is rejected
    const rejectionNotice = document.getElementById('rejectionNotice');
    const rejectionOrderNumber = document.getElementById('rejectionOrderNumber');
    const rejectionDateInfo = document.getElementById('rejectionDateInfo');
    const rejectionDate = document.getElementById('rejectionDate');
    const rejectionReasonInfo = document.getElementById('rejectionReasonInfo');
    const rejectionReason = document.getElementById('rejectionReason');
    
    if (isRejected && rejectionNotice) {
        rejectionNotice.style.display = 'block';
        
        // Set order number
        if (rejectionOrderNumber) {
            const orderNumber = `ORD-${order.Order_ID.toString().padStart(4, '0')}`;
            rejectionOrderNumber.textContent = orderNumber;
        }
        
        // Set rejection date
        if (order.rejected_at) {
            if (rejectionDateInfo && rejectionDate) {
                rejectionDateInfo.style.display = 'block';
                try {
                    const date = new Date(order.rejected_at);
                    rejectionDate.textContent = formatDate(order.rejected_at) + ' ' + formatTime(order.rejected_at);
                } catch (e) {
                    rejectionDate.textContent = order.rejected_at;
                }
            }
        } else {
            if (rejectionDateInfo) {
                rejectionDateInfo.style.display = 'none';
            }
        }
        
        // Set rejection reason
        if (order.rejection_reason && order.rejection_reason.trim() !== '') {
            if (rejectionReasonInfo && rejectionReason) {
                rejectionReasonInfo.style.display = 'block';
                rejectionReason.textContent = order.rejection_reason;
            }
        } else {
            if (rejectionReasonInfo) {
                rejectionReasonInfo.style.display = 'block';
                if (rejectionReason) {
                    rejectionReason.innerHTML = '<em class="text-muted">No reason provided.</em>';
                }
            }
        }
    } else {
        if (rejectionNotice) {
            rejectionNotice.style.display = 'none';
        }
    }
    
    // Update view receipt link - show if order is approved OR if proof of payment exists
    const viewReceiptLink = document.querySelector('.view-receipt-link');
    if (viewReceiptLink) {
        // Check if proof of payment exists
        const paymentMethod = order.payment_method || order.transaction_payment_method || null;
        let proofOfPayment = order.proof_of_payment || null;
        
        // Clean escaped slashes from JSON response
        if (proofOfPayment && typeof proofOfPayment === 'string') {
            proofOfPayment = proofOfPayment.replace(/\\\//g, '/');
        }
        
        const hasProof = proofOfPayment && 
            String(proofOfPayment) !== 'null' && 
            String(proofOfPayment) !== 'NULL' && 
            String(proofOfPayment) !== '' &&
            proofOfPayment !== null &&
            proofOfPayment !== undefined;
        
        const hasPaymentMethod = paymentMethod && 
            paymentMethod !== 'null' && 
            paymentMethod !== 'NULL' && 
            paymentMethod !== '';
        
        // Show receipt link if: order is approved OR proof of payment exists
        if ((isApproved && hasPaymentMethod) || hasProof) {
            // Order is approved and has payment method, OR has proof of payment - show receipt link
            viewReceiptLink.href = `ViewReceipt.html?order_id=${order.Order_ID}`;
            viewReceiptLink.style.display = 'inline';
        } else {
            // Hide receipt link for orders without payment method and no proof
            viewReceiptLink.style.display = 'none';
        }
    }
    
    console.log('🟢🟢🟢 ABOUT TO CHECK PROOF OF PAYMENT - VERSION 3.0 CODE IS RUNNING 🟢🟢🟢');
    console.log('[Order Details] About to check proof of payment...');
    
    // Display proof of payment image if payment method is GCash and proof exists
    console.log('[Order Details] ===== PROOF OF PAYMENT CHECK START =====');
    console.log('[Order Details] Full order object:', order);
    console.log('[Order Details] Order keys:', Object.keys(order));
    
    const proofOfPaymentContainer = document.getElementById('proofOfPaymentContainer');
    const proofOfPaymentImage = document.getElementById('proofOfPaymentImage');
    
    // Debug logging
    console.log('[Order Details] Element Check:', {
        hasContainer: !!proofOfPaymentContainer,
        hasImage: !!proofOfPaymentImage,
        containerElement: proofOfPaymentContainer,
        imageElement: proofOfPaymentImage
    });
    
    if (!proofOfPaymentContainer) {
        console.error('[Order Details] ❌ proofOfPaymentContainer element not found in DOM!');
        console.log('[Order Details] Available elements with "proof" in id:', document.querySelectorAll('[id*="proof"]'));
    }
    
    if (!proofOfPaymentImage) {
        console.error('[Order Details] ❌ proofOfPaymentImage element not found in DOM!');
    }
    
    if (proofOfPaymentContainer && proofOfPaymentImage) {
        const paymentMethod = order.payment_method || order.transaction_payment_method || null;
        let proofOfPayment = order.proof_of_payment || null;
        
        // Clean escaped slashes from JSON response
        if (proofOfPayment && typeof proofOfPayment === 'string') {
            proofOfPayment = proofOfPayment.replace(/\\\//g, '/');
        }
        
        console.log('[Order Details] Payment Data:', {
            paymentMethod: paymentMethod,
            transactionPaymentMethod: order.transaction_payment_method,
            proofOfPayment: proofOfPayment,
            proofOfPaymentType: typeof proofOfPayment,
            proofOfPaymentLength: proofOfPayment ? proofOfPayment.length : 0,
            originalProofOfPayment: order.proof_of_payment
        });
        
        // Show proof of payment if payment method is GCash and proof exists
        // Check both payment_method from orders table and transaction_payment_method
        const isGCash = paymentMethod && (
            paymentMethod === 'GCash' || 
            paymentMethod === 'gcash' || 
            String(paymentMethod).toLowerCase() === 'gcash' ||
            (order.transaction_payment_method && (
                order.transaction_payment_method === 'GCash' ||
                String(order.transaction_payment_method).toLowerCase() === 'gcash'
            ))
        );
        
        const hasProof = proofOfPayment && 
            String(proofOfPayment) !== 'null' && 
            String(proofOfPayment) !== 'NULL' && 
            String(proofOfPayment) !== '' &&
            proofOfPayment !== null &&
            proofOfPayment !== undefined;
        
        console.log('[Order Details] Condition Check:', {
            isGCash: isGCash,
            hasProof: hasProof,
            willShow: isGCash && hasProof
        });
        
        if (isGCash && hasProof) {
            // Construct full path to the image
            let imagePath = String(proofOfPayment);
            
            // Handle different path formats
            if (!imagePath.startsWith('http') && !imagePath.startsWith('https') && !imagePath.startsWith('/') && !imagePath.startsWith('../')) {
                // If it's a relative path without ../, add it
                imagePath = `../${imagePath}`;
            }
            
            console.log('[Order Details] ✅ Showing proof of payment. Image path:', imagePath);
            
            proofOfPaymentImage.src = imagePath;
            proofOfPaymentImage.alt = 'Proof of Payment';
            proofOfPaymentContainer.style.display = 'block';
            
            // Force display in case inline style is overriding
            proofOfPaymentContainer.setAttribute('style', 'display: block !important; margin-top: 15px;');
            
            // Add error handler in case image fails to load
            proofOfPaymentImage.onerror = function() {
                console.error('[Order Details] ❌ Failed to load proof of payment image:', imagePath);
                console.error('[Order Details] Image error details:', {
                    src: this.src,
                    naturalWidth: this.naturalWidth,
                    naturalHeight: this.naturalHeight,
                    complete: this.complete
                });
                const errorMsg = document.createElement('p');
                errorMsg.className = 'text-danger';
                errorMsg.textContent = 'Failed to load proof of payment image. Path: ' + imagePath;
                proofOfPaymentContainer.appendChild(errorMsg);
            };
            
            // Add success handler
            proofOfPaymentImage.onload = function() {
                console.log('[Order Details] ✅ Proof of payment image loaded successfully:', imagePath);
                console.log('[Order Details] Image dimensions:', {
                    width: this.naturalWidth,
                    height: this.naturalHeight
                });
            };
        } else {
            // Hide proof of payment container if not GCash or no proof
            console.log('[Order Details] ⚠️ Hiding proof of payment container');
            console.log('[Order Details] Reason:', {
                isGCash: isGCash,
                hasProof: hasProof,
                paymentMethod: paymentMethod,
                transactionPaymentMethod: order.transaction_payment_method,
                proofOfPayment: proofOfPayment
            });
            
            // If it's GCash but no proof, show a message
            if (isGCash && !hasProof) {
                console.log('[Order Details] GCash payment but no proof of payment uploaded');
                proofOfPaymentContainer.innerHTML = `
                    <label class="proof-label" style="display: block; font-weight: 600; margin-bottom: 10px; color: #2c3e50;">Proof of Payment:</label>
                    <p class="text-warning" style="padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
                        <i class="fas fa-exclamation-triangle"></i> No proof of payment uploaded for this GCash order.
                    </p>
                `;
                proofOfPaymentContainer.style.display = 'block';
            } else {
                proofOfPaymentContainer.style.display = 'none';
            }
        }
    } else {
        console.error('[Order Details] ❌ Proof of payment container or image element not found!');
        console.log('[Order Details] Searching for alternative selectors...');
        const altContainer = document.querySelector('.proof-of-payment-container');
        const altImage = document.querySelector('#proofOfPaymentImage');
        console.log('[Order Details] Alternative search results:', {
            containerByClass: !!altContainer,
            imageById: !!altImage
        });
    }
    
    console.log('[Order Details] ===== PROOF OF PAYMENT CHECK END =====');
    
    // Setup action buttons
    setupActionButtons(order);
}

// Setup action buttons
function setupActionButtons(order) {
    const acceptOrderBtn = document.getElementById('acceptOrderBtn');
    const rejectOrderBtn = document.getElementById('rejectOrderBtn');
    const prepareOrderBtn = document.getElementById('prepareOrderBtn');
    const orderStatus = order.status || 'Pending Approval';
    const isPendingApproval = orderStatus === 'Pending Approval';
    const isRejected = orderStatus === 'Rejected';
    const isApproved = !isPendingApproval && !isRejected;
    
    // Show/hide accept and reject buttons for pending approval orders
    if (acceptOrderBtn) {
        if (isPendingApproval) {
            acceptOrderBtn.style.display = 'flex';
            acceptOrderBtn.onclick = function() {
                approveOrder(order.Order_ID);
            };
        } else {
            acceptOrderBtn.style.display = 'none';
        }
    }
    
    if (rejectOrderBtn) {
        if (isPendingApproval) {
            rejectOrderBtn.style.display = 'flex';
            rejectOrderBtn.onclick = function() {
                rejectOrder(order.Order_ID);
            };
        } else {
            rejectOrderBtn.style.display = 'none';
        }
    }
    
    // Show/hide "Ready" button for Processing orders
    if (prepareOrderBtn) {
        const isProcessing = orderStatus === 'Processing';
        console.log('[Setup Action Buttons] Order status:', orderStatus, 'isProcessing:', isProcessing);
        
        if (isProcessing) {
            // Set button properties
            prepareOrderBtn.textContent = 'Ready';
            prepareOrderBtn.style.display = 'inline-block';
            prepareOrderBtn.disabled = false;
            prepareOrderBtn.removeAttribute('disabled');
            prepareOrderBtn.style.pointerEvents = 'auto';
            prepareOrderBtn.style.cursor = 'pointer';
            prepareOrderBtn.style.opacity = '1';
            prepareOrderBtn.style.visibility = 'visible';
            prepareOrderBtn.style.position = 'relative';
            prepareOrderBtn.style.zIndex = '10';
            
            console.log('[Setup Action Buttons] Ready button configured:', {
                text: prepareOrderBtn.textContent,
                display: prepareOrderBtn.style.display,
                disabled: prepareOrderBtn.disabled,
                pointerEvents: prepareOrderBtn.style.pointerEvents
            });
            
            // Remove any existing onclick handlers by cloning the button
            const newBtn = prepareOrderBtn.cloneNode(true);
            prepareOrderBtn.parentNode.replaceChild(newBtn, prepareOrderBtn);
            const readyBtn = document.getElementById('prepareOrderBtn');
            
            if (readyBtn) {
                console.log('[Setup Action Buttons] Ready button found after clone, adding event listener');
                
                // Add click event listener
                readyBtn.addEventListener('click', async function(e) {
                    console.log('[Ready Button] Click event triggered');
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Disable button during processing
                    readyBtn.disabled = true;
                    const originalText = readyBtn.textContent;
                    readyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                    readyBtn.style.opacity = '0.7';
                    readyBtn.style.cursor = 'not-allowed';
                    
                    try {
                        if (window.AdminNotifications) {
                            const confirmed = await AdminNotifications.confirm(
                                'Mark this order as "Ready"? The order will be moved to the Ready tab.',
                                {
                                    title: 'Mark Order as Ready',
                                    confirmText: 'Mark Ready',
                                    cancelText: 'Cancel'
                                }
                            );
                            
                            if (confirmed) {
                                console.log('[Ready Button] Confirmed, updating status to Ready');
                                
                                // Show loading notification
                                AdminNotifications.info('Updating order status to Ready...', {
                                    title: 'Processing',
                                    duration: 0 // Don't auto-close
                                });
                                
                                await updateOrderStatus(order.Order_ID, 'Ready');
                            } else {
                                // User cancelled - restore button
                                readyBtn.disabled = false;
                                readyBtn.textContent = originalText;
                                readyBtn.style.opacity = '1';
                                readyBtn.style.cursor = 'pointer';
                            }
                        } else {
                            // Fallback if AdminNotifications is not available
                            if (confirm('Mark this order as "Ready"? The order will be moved to the Ready tab.')) {
                                console.log('[Ready Button] Confirmed (fallback), updating status to Ready');
                                await updateOrderStatus(order.Order_ID, 'Ready');
                            } else {
                                // User cancelled - restore button
                                readyBtn.disabled = false;
                                readyBtn.textContent = originalText;
                                readyBtn.style.opacity = '1';
                                readyBtn.style.cursor = 'pointer';
                            }
                        }
                    } catch (error) {
                        // Restore button on error
                        readyBtn.disabled = false;
                        readyBtn.textContent = originalText;
                        readyBtn.style.opacity = '1';
                        readyBtn.style.cursor = 'pointer';
                        
                        if (window.AdminNotifications) {
                            AdminNotifications.error('An error occurred while updating the order status.', {
                                title: 'Error',
                                duration: 5000
                            });
                        }
                    }
                });
                
                console.log('[Setup Action Buttons] Event listener added successfully');
            } else {
                console.error('[Setup Action Buttons] Ready button not found after clone!');
            }
        } else {
            prepareOrderBtn.style.display = 'none';
            console.log('[Setup Action Buttons] Order is not Processing, hiding button');
        }
    } else {
        console.error('[Setup Action Buttons] prepareOrderBtn element not found!');
    }
}

// Approve order function
async function approveOrder(orderId) {
    if (!confirm('Are you sure you want to approve this order? The customer will be able to proceed with payment.')) {
        return;
    }
    
    try {
        const response = await fetch('../api/approve_order.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                order_id: orderId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Order approved successfully! The customer can now proceed with payment.');
            // Reload order details to reflect changes
            await loadOrderDetails();
        } else {
            alert('Failed to approve order: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error approving order:', error);
        alert('Failed to approve order. Please try again.');
    }
}

// Update order status function
async function updateOrderStatus(orderId, status) {
    try {
        // Show loading state
        if (window.AdminNotifications) {
            // Close any previous info notifications
            const notifications = document.querySelectorAll('.admin-notification.info');
            notifications.forEach(n => {
                const closeBtn = n.querySelector('.admin-notification-close');
                if (closeBtn) closeBtn.click();
            });
            
            AdminNotifications.info('Updating order status...', {
                title: 'Processing',
                duration: 0 // Don't auto-close
            });
        }
        
        const response = await fetch('../api/update_order_status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                order_id: orderId,
                status: status
            })
        });
        
        // Check if response is OK
        if (!response.ok) {
            const errorText = await response.text();
            // Filter out localhost URLs from error messages
            const cleanErrorText = errorText.replace(/https?:\/\/[^\s]+localhost[^\s]*/gi, '').replace(/localhost[^\s]*/gi, '');
            throw new Error(cleanErrorText || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Close loading notification
        if (window.AdminNotifications) {
            const notifications = document.querySelectorAll('.admin-notification.info');
            notifications.forEach(n => {
                const closeBtn = n.querySelector('.admin-notification-close');
                if (closeBtn) closeBtn.click();
            });
        }
        
        if (data.success) {
            if (window.AdminNotifications) {
                AdminNotifications.success('Order status updated successfully! The order has been moved to the Ready tab.', {
                    title: 'Success',
                    duration: 4000
                });
            }
            
            // If status changed to Ready, redirect to OrdersAdmin with Ready tab active
            if (status === 'Ready') {
                // Wait a moment for the success notification to show, then redirect
                setTimeout(() => {
                    window.location.href = '../Admin/OrdersAdmin.html?tab=ready';
                }, 2000);
            } else {
                // Reload order details to reflect changes
                await loadOrderDetails();
            }
        } else {
            const errorMessage = (data.message || 'Unknown error').replace(/https?:\/\/[^\s]+localhost[^\s]*/gi, '').replace(/localhost[^\s]*/gi, '');
            if (window.AdminNotifications) {
                AdminNotifications.error('Failed to update order status: ' + errorMessage, {
                    title: 'Error',
                    duration: 5000
                });
            }
        }
    } catch (error) {
        // Close loading notification if it exists
        if (window.AdminNotifications) {
            const notifications = document.querySelectorAll('.admin-notification.info');
            notifications.forEach(n => {
                const closeBtn = n.querySelector('.admin-notification-close');
                if (closeBtn) closeBtn.click();
            });
            
            const errorMessage = error.message ? error.message.replace(/https?:\/\/[^\s]+localhost[^\s]*/gi, '').replace(/localhost[^\s]*/gi, '') : 'Please try again.';
            AdminNotifications.error('Failed to update order status: ' + errorMessage, {
                title: 'Error',
                duration: 5000
            });
        }
    }
}

// Reject order function
async function rejectOrder(orderId) {
    orderId = parseInt(orderId);
    
    if (!orderId || isNaN(orderId)) {
        if (window.AdminNotifications) {
            AdminNotifications.warning('Invalid order ID', { duration: 4000 });
        }
        return;
    }
    
    // Use custom prompt dialog for rejection reason - MUST complete before proceeding
    const rejectionReason = await AdminNotifications.prompt(
        'Please provide a reason for rejecting this order (optional):',
        '',
        {
            title: 'Reject Order',
            placeholder: 'Enter rejection reason (optional)',
            confirmText: 'Continue',
            cancelText: 'Cancel'
        }
    );
    
    if (rejectionReason === null) {
        // User cancelled the prompt - do not proceed with rejection
        return;
    }
    
    // Use custom confirmation dialog - MUST confirm before proceeding
    const confirmed = await AdminNotifications.confirm(
        `Reject order ORD-${orderId.toString().padStart(4, '0')}? This action cannot be undone.`,
        {
            title: 'Confirm Rejection',
            confirmText: 'Reject',
            cancelText: 'Cancel',
            danger: true
        }
    );
    
    if (!confirmed) {
        // User cancelled the confirmation - do not proceed with rejection
        return;
    }
    
    // Only now proceed with the API call to reject the order
    try {
        const response = await fetch('../api/reject_order.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                order_id: orderId,
                rejection_reason: rejectionReason || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (window.AdminNotifications) {
                AdminNotifications.success('Order rejected successfully.', { duration: 3000 });
            }
            // Reload order details to reflect changes
            await loadOrderDetails();
        } else {
            const errorMessage = (data.message || 'Unknown error').replace(/https?:\/\/[^\s]+localhost[^\s]*/gi, '').replace(/localhost[^\s]*/gi, '');
            if (window.AdminNotifications) {
                AdminNotifications.error('Failed to reject order: ' + errorMessage, {
                    duration: 5000
                });
            }
        }
    } catch (error) {
        console.error('Error rejecting order:', error);
        if (window.AdminNotifications) {
            AdminNotifications.error('Failed to reject order. Please try again.', {
                duration: 5000
            });
        }
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadOrderDetails);
} else {
    loadOrderDetails();
}


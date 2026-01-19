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
    if (timeString.includes(':') && !timeString.includes('T') && !timeString.includes(' ')) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }
    
    // Handle full date-time strings
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Get product image
function getProductImage(category, productName) {
    // Default product image path
    return '../Customer_assets/images/PreviewMain.png';
}

// Load order details
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
        // Keep the View Profile button if it exists
        const viewProfileBtn = customerNameEl.querySelector('.view-profile-btn');
        customerNameEl.innerHTML = customerName;
        if (viewProfileBtn) {
            customerNameEl.appendChild(viewProfileBtn);
        }
    }
    
    // Update customer address
    const customerAddressEl = document.querySelector('.customer-address');
    if (customerAddressEl) {
        customerAddressEl.textContent = order.address || 'No address provided';
    }
    
    // Update customer phone
    const customerPhoneEl = document.querySelector('.customer-phone');
    if (customerPhoneEl) {
        customerPhoneEl.textContent = order.Phone_Number || 'No phone number';
    }
    
    // Update customer availability (estimated delivery)
    const deliveryDateEl = document.querySelector('.delivery-date');
    const deliveryLabelEl = document.querySelector('.delivery-label');
    
    // Update label to say "Customer Availability" if it exists
    if (deliveryLabelEl) {
        deliveryLabelEl.textContent = 'Customer Availability:';
    }
    
    // Update customer availability (delivery date only - time no longer used)
    if (order.availability_date) {
        if (deliveryDateEl) {
            deliveryDateEl.textContent = formatDate(order.availability_date);
        }
    } else {
        if (deliveryDateEl) deliveryDateEl.textContent = 'TBD';
    }
    
    // Update order items table
    const tbody = document.querySelector('.order-items-table tbody');
    if (tbody && order.items && order.items.length > 0) {
        tbody.innerHTML = '';
        
        let totalAmount = 0;
        
        order.items.forEach(item => {
            const itemTotal = item.Price * item.Quantity;
            totalAmount += itemTotal;
            
            // Build variation string
            let variation = '';
            if (item.length && item.Width) {
                variation = `${item.length}${item.Unit || ''} x ${item.Width}${item.Unit || ''}`;
            } else if (item.length) {
                variation = `${item.length}${item.Unit || ''}`;
            } else if (item.Width) {
                variation = `${item.Width}${item.Unit || ''}`;
            } else {
                variation = 'Standard';
            }
            
            // Get product image
            const productImage = getProductImage(item.category, item.Product_Name);
            
            const row = `
                <tr>
                    <td>
                        <div class="product-info">
                            <img src="${productImage}" alt="${item.Product_Name}" class="product-image" onerror="this.src='../Customer_assets/images/PreviewMain.png'">
                            <span class="product-name">${escapeHtml(item.Product_Name || 'Unknown Product')}</span>
                        </div>
                    </td>
                    <td class="quantity">${item.Quantity}</td>
                    <td class="variation">${escapeHtml(variation)}</td>
                    <td class="price">${formatPrice(item.Price)}</td>
                    <td class="total">${formatPrice(itemTotal)}</td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
        
        // Update total amount
        const totalAmountEl = document.querySelector('.total-amount');
        if (totalAmountEl) {
            totalAmountEl.textContent = formatPrice(totalAmount);
        }
    } else if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">No items found in this order.</td>
            </tr>
        `;
    }
    
    // Update payment information
    // Only show payment method if order is approved and payment method is selected
    // For pending approval or rejected orders, show appropriate message
    const orderStatus = order.status || 'Pending Approval';
    const isPendingApproval = orderStatus === 'Pending Approval';
    const isRejected = orderStatus === 'Rejected';
    const isApproved = !isPendingApproval && !isRejected;
    
    const paymentTitleEl = document.querySelector('.payment-title');
    if (paymentTitleEl) {
        if (isPendingApproval) {
            paymentTitleEl.textContent = 'Payment Method: Pending Approval';
        } else if (isRejected) {
            paymentTitleEl.textContent = 'Payment Method: Order Rejected';
        } else {
            // Order is approved - show payment method if selected, otherwise show "Not Selected"
            const paymentMethod = order.payment_method || order.transaction_payment_method || null;
            if (paymentMethod && paymentMethod !== 'null' && paymentMethod !== 'NULL' && paymentMethod !== '') {
                paymentTitleEl.textContent = `Paid thru: ${paymentMethod === 'GCash' ? 'GCash' : paymentMethod === 'On-Site' ? 'On-Site' : paymentMethod}`;
            } else {
                paymentTitleEl.textContent = 'Payment Method: Not Selected';
            }
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
    const prepareOrderBtn = document.querySelector('.prepare-order-btn');
    const orderStatus = order.status || 'Pending Approval';
    const isPendingApproval = orderStatus === 'Pending Approval';
    const isRejected = orderStatus === 'Rejected';
    const isProcessing = orderStatus === 'Processing';
    
    if (prepareOrderBtn) {
        // Show "Ready" button only for Processing orders
        if (isProcessing) {
            prepareOrderBtn.textContent = 'Ready';
            prepareOrderBtn.disabled = false;
            prepareOrderBtn.onclick = async function() {
                const confirmed = await AdminNotifications.confirm(
                    'Mark this order as "Ready"? The order will be moved to the Ready tab.',
                    {
                        title: 'Mark Order as Ready',
                        confirmText: 'Mark Ready',
                        cancelText: 'Cancel'
                    }
                );
                
                if (confirmed) {
                    await updateOrderStatus(order.Order_ID, 'Ready');
                }
            };
        } else {
            // Hide button for non-processing orders
            prepareOrderBtn.style.display = 'none';
        }
    }
}

// Update order status
async function updateOrderStatus(orderId, status) {
    try {
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
        
        const data = await response.json();
        
        if (data.success) {
            if (window.AdminNotifications) {
                AdminNotifications.success('Order status updated successfully!', { duration: 3000 });
            }
            
            // If status changed to Ready, redirect to OrdersAdmin with Ready tab active
            if (status === 'Ready') {
                // Wait a moment for the notification to show, then redirect
                setTimeout(() => {
                    window.location.href = '../Admin/OrdersAdmin.html?tab=ready';
                }, 1000);
            } else {
                // Reload order details to reflect changes
                await loadOrderDetails();
            }
        } else {
            const errorMessage = (data.message || 'Unknown error').replace(/https?:\/\/[^\s]+localhost[^\s]*/gi, '').replace(/localhost[^\s]*/gi, '');
            if (window.AdminNotifications) {
                AdminNotifications.error('Failed to update order status: ' + errorMessage, { duration: 5000 });
            }
        }
    } catch (error) {
        if (window.AdminNotifications) {
            AdminNotifications.error('Failed to update order status. Please try again.', { duration: 5000 });
        }
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadOrderDetails);
} else {
    loadOrderDetails();
}


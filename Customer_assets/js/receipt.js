$(document).ready(function() {
    
    // ========== SMART NAVIGATION ==========
    // Detect where user came from and set back button accordingly
    function setupSmartNavigation() {
        const urlParams = new URLSearchParams(window.location.search);
        const fromPage = urlParams.get('from');
        const backBtn = document.getElementById('smartBackBtn');
        const backBtnText = document.getElementById('backButtonText');
        
        // Configure back button based on source page
        if (fromPage === 'order-summary') {
            backBtn.onclick = function() {
                window.location.href = 'OrderSummary.html';
            };
            backBtnText.textContent = 'Back to Order';
        } else if (fromPage === 'transaction-history') {
            backBtn.onclick = function() {
                window.location.href = 'TransactionHistory.html';
            };
            backBtnText.textContent = 'Back to History';
        } else if (fromPage === 'orders') {
            backBtn.onclick = function() {
                window.location.href = 'orders.html';
            };
            backBtnText.textContent = 'Back to Orders';
        } else {
            // Default fallback - go to orders page
            backBtn.onclick = function() {
                window.location.href = 'orders.html';
            };
            backBtnText.textContent = 'Back to Orders';
        }
    }
    
    // Initialize smart navigation on page load
    setupSmartNavigation();

    // ========== SIDEBAR TOGGLE FUNCTIONALITY ==========
    $('#sidebarToggle').click(function() {
        $('#sidebar').toggleClass('show');
        $('body').toggleClass('sidebar-open');
    });
    
    // Sidebar overlay click to close
    $('#sidebarOverlay').click(function() {
        $('#sidebar').removeClass('show');
        $('body').removeClass('sidebar-open');
    });
    
    // Close sidebar on window resize if large screen
    $(window).resize(function() {
        if ($(window).width() >= 992) {
            $('#sidebar').removeClass('show');
            $('body').removeClass('sidebar-open');
        }
    });

    // ========== DOWNLOAD RECEIPT FUNCTIONALITY ==========
    $('#downloadReceiptBtn').click(function() {
        // Show download confirmation
        const btn = $(this);
        const originalHTML = btn.html();
        
        // Change button to show downloading state
        btn.html('<i class="fas fa-spinner fa-spin"></i> <span>Downloading...</span>');
        btn.prop('disabled', true);
        
        // Simulate download process
        setTimeout(function() {
            // In production, this would trigger actual PDF generation
            // For now, show success message
            btn.html('<i class="fas fa-check"></i> <span>Downloaded</span>');
            
            // Reset button after 2 seconds
            setTimeout(function() {
                btn.html(originalHTML);
                btn.prop('disabled', false);
            }, 2000);
            
            // Alert for demonstration purposes
            alert('Receipt download initiated. In production, this would generate and download a PDF file.');
        }, 1000);
    });

    // ========== PRINT RECEIPT FUNCTIONALITY ==========
    $('#printReceiptBtn').click(function() {
        // Trigger browser print dialog
        window.print();
    });

    

    // ========== HEADER ICONS FUNCTIONALITY ==========
    $('#notificationIcon').click(function(e) {
        e.preventDefault();
        // In production, this would show notifications dropdown
        console.log('Notifications clicked');
    });

    $('#cartIcon').click(function(e) {
        e.preventDefault();
        window.location.href = 'cart.html';
    });

    $('#userIcon').click(function(e) {
        e.preventDefault();
        window.location.href = 'profile.html';
    });

    // ========== FORMAT CURRENCY ==========
    // Function to format currency values (if needed for dynamic content)
    function formatCurrency(amount) {
        return '₱' + amount.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // ========== DYNAMIC RECEIPT DATA LOADING ==========
    // This function can be used to load receipt data dynamically
    function loadReceiptData(orderId) {
        // In production, this would fetch data from server
        // Example AJAX call structure:
        /*
        $.ajax({
            url: '/api/receipt/' + orderId,
            method: 'GET',
            success: function(data) {
                updateReceiptContent(data);
            },
            error: function(error) {
                console.error('Error loading receipt:', error);
                alert('Failed to load receipt data');
            }
        });
        */
    }

    // ========== UPDATE RECEIPT CONTENT ==========
    function updateReceiptContent(data) {
        // Update transaction information
        if (data.orderNumber) {
            $('.info-section .info-value').eq(0).text(data.orderNumber);
        }
        if (data.transactionId) {
            $('.info-section .info-value').eq(1).text(data.transactionId);
        }
        
        // Update customer details
        if (data.customerName) {
            $('.customer-name').text(data.customerName);
        }
        if (data.customerPhone) {
            $('.customer-phone').text('Phone Number: ' + data.customerPhone);
        }
        if (data.customerAddress) {
            $('.customer-address').text(data.customerAddress);
        }
        
        // Update order items
        if (data.items && data.items.length > 0) {
            const tbody = $('.items-table tbody');
            tbody.empty();
            
            data.items.forEach(function(item) {
                const row = `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.variation}</td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                        <td class="text-right total-price">${formatCurrency(item.total)}</td>
                    </tr>
                `;
                tbody.append(row);
            });
        }
        
        // Update payment summary
        if (data.subtotal) {
            $('.summary-row:first .summary-value').text(formatCurrency(data.subtotal));
        }
        if (data.total) {
            $('.total-amount').text(formatCurrency(data.total));
        }
    }

    // ========== CHECK FOR ORDER ID IN URL ==========
    // Check if there's an order ID in the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    
    if (orderId) {
        // Load receipt data for this order
        loadReceiptData(orderId);
    }

    // ========== ANIMATE ON SCROLL ==========
    // Add fade-in animation when page loads
    $('.receipt-wrapper').hide().fadeIn(600);

    // ========== COPY TRANSACTION ID FUNCTIONALITY ==========
    // Add click-to-copy functionality for transaction IDs
    $('.info-value').on('click', function() {
        const text = $(this).text();
        
        // Check if text looks like a transaction ID
        if (text.includes('-') || text.includes('ORD') || text.includes('GC')) {
            // Copy to clipboard
            navigator.clipboard.writeText(text).then(function() {
                // Show temporary success message
                const original = $(this);
                const originalText = original.text();
                
                original.css('color', '#28a745');
                original.text('✓ Copied!');
                
                setTimeout(function() {
                    original.css('color', '');
                    original.text(originalText);
                }, 1500);
            }).catch(function(err) {
                console.error('Failed to copy text: ', err);
            });
        }
    });

    // ========== RECEIPT STATUS BADGE ANIMATION ==========
    // Animate the payment confirmed badge
    setTimeout(function() {
        $('.payment-badge').addClass('animate-badge');
    }, 500);

    // ========== SMOOTH SCROLL TO TOP ==========
    function scrollToTop() {
        $('html, body').animate({
            scrollTop: 0
        }, 400);
    }

    // ========== EXPORT FUNCTIONS ==========
    // Make functions available globally if needed
    window.receiptFunctions = {
        loadReceiptData: loadReceiptData,
        updateReceiptContent: updateReceiptContent,
        formatCurrency: formatCurrency,
        scrollToTop: scrollToTop
    };

    // ========== LOG PAGE LOAD ==========
    console.log('Receipt page loaded successfully');
    console.log('Receipt ID:', orderId || 'Not specified');
    
});
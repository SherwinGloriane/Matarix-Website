/**
 * MATARIX Universal Navigation System
 * Auto-generates progress trackers and handles navigation between order flow pages
 * Pages: OrderSummary → Payment → Processing → delivery-tracking → ProductReview → TransactionHistory
 */

const MATARIX_PAGES = {
    'OrderSummary.html': {
        step: 0,
        title: 'Order Summary',
        icon: 'fas fa-list',
        label: 'Summary'
    },
    'Payment.html': {
        step: 1,
        title: 'Payment',
        icon: 'fas fa-wallet',
        label: 'To Pay'
    },
    'Processing.html': {
        step: 2,
        title: 'Processing',
        icon: 'fas fa-box',
        label: 'Preparing'
    },
    'delivery-tracking.html': {
        step: 3,
        title: 'Delivery Tracking',
        icon: 'fas fa-truck',
        label: 'To Receive'
    },
    'ProductReview.html': {
        step: 4,
        title: 'Product Review',
        icon: 'fas fa-star',
        label: 'To Rate'
    },
    'TransactionHistory.html': {
        step: 5,
        title: 'Transaction History',
        icon: 'fas fa-history',
        label: 'History'
    }
};

// ============================================
// CORE FUNCTIONS
// ============================================

// Get current page filename
function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'OrderSummary.html';
    return filename;
}

// Get current step number
function getCurrentStep() {
    const currentPage = getCurrentPage();
    return MATARIX_PAGES[currentPage]?.step ?? 0;
}

// Generate progress tracker HTML
function generateProgressTracker() {
    const currentStep = getCurrentStep();

    let trackerHTML = `
        <div class="progress-tracker-container">
            <div class="progress-tracker">
    `;

    Object.keys(MATARIX_PAGES).forEach(pageFile => {
        const page = MATARIX_PAGES[pageFile];
        let stepClass = 'progress-step';

        if (page.step < currentStep) {
            stepClass += ' completed';
        } else if (page.step === currentStep) {
            stepClass += ' active';
        } else {
            stepClass += ' pending';
        }

        // make all steps clickable for navigation
        stepClass += ' clickable';

        trackerHTML += `
            <div class="${stepClass}" data-page="${pageFile}" data-step="${page.step}">
                <div class="step-icon"><i class="${page.icon}"></i></div>
                <div class="step-label">${page.label}</div>
            </div>
        `;
    });

    trackerHTML += `
            </div>
        </div>
    `;

    return trackerHTML;
}

// Navigate to specific page
function navigateToPage(targetPage) {
    if (MATARIX_PAGES[targetPage]) {
        window.location.href = targetPage;
    } else {
        console.error('Invalid target page:', targetPage);
    }
}

// Attach click handlers for navigation
function attachNavigationHandlers() {
    document.addEventListener('click', function(event) {
        const stepElement = event.target.closest('.progress-step.clickable');
        if (stepElement) {
            const targetPage = stepElement.getAttribute('data-page');
            navigateToPage(targetPage);
        }
    });
}

// Add CSS styles for tracker
function addProgressTrackerStyles() {
    const styleId = 'matarix-progress-tracker-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .progress-tracker-container {
            margin: 20px 0;
            padding: 0 15px;
        }
        .progress-tracker {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            position: relative;
        }
        .progress-tracker::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 10%;
            right: 10%;
            height: 2px;
            background: #e0e0e0;
            z-index: 1;
        }
        .progress-step {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            z-index: 2;
            min-width: 80px;
        }
        .step-icon {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
            font-size: 18px;
            background: #f5f5f5;
            color: #999;
            border: 2px solid #e0e0e0;
        }
        .step-label {
            font-size: 12px;
            font-weight: 500;
            text-align: center;
            color: #666;
        }
        .progress-step.completed .step-icon {
            background: #28a745;
            color: white;
            border-color: #28a745;
        }
        .progress-step.completed .step-label {
            color: #28a745;
        }
        .progress-step.active .step-icon {
            background: #ff6b35;
            color: white;
            border-color: #ff6b35;
            animation: pulse 2s infinite;
        }
        .progress-step.active .step-label {
            color: #ff6b35;
            font-weight: 600;
        }
        .progress-step.active[data-page="TransactionHistory.html"] .step-icon {
            background: #007bff;
            border-color: #007bff;
        }
        .progress-step.active[data-page="TransactionHistory.html"] .step-label {
            color: #007bff;
        }
        .progress-step.clickable {
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .progress-step.clickable:hover .step-icon {
            transform: scale(1.1);
        }
        .progress-step.clickable:hover .step-label {
            color: #ff6b35;
        }
        @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 107, 53, 0.7); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 107, 53, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 107, 53, 0); }
        }
        @media (max-width: 768px) {
            .progress-tracker { padding: 15px 10px; overflow-x: auto; }
            .step-icon { width: 40px; height: 40px; font-size: 14px; }
            .step-label { font-size: 10px; }
            .progress-step { min-width: 60px; }
        }
        @media (max-width: 480px) {
            .progress-tracker { flex-wrap: wrap; gap: 10px; }
            .progress-tracker::before { display: none; }
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// DELIVERY TRACKING PAGE FUNCTIONS
// ============================================

if (document.getElementById('sidebarToggle')) {
    document.getElementById('sidebarToggle').addEventListener('click', function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.toggle('show');
        overlay.classList.toggle('show');
    });
}

if (document.getElementById('sidebarOverlay')) {
    document.getElementById('sidebarOverlay').addEventListener('click', function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    });
}

function toggleOrderDetails() {
    const orderCard = document.getElementById('orderCard');
    const expandableContent = document.getElementById('expandableContent');
    const expandIcon = orderCard?.querySelector('.expand-icon');

    if (!expandableContent || !expandIcon) return;

    const isExpanded = expandableContent.classList.contains('expanded');
    if (isExpanded) {
        expandableContent.classList.remove('expanded');
        expandIcon.style.transform = 'rotate(0deg)';
    } else {
        expandableContent.classList.add('expanded');
        expandIcon.style.transform = 'rotate(90deg)';
    }
}

// Page button actions
function reviewOrder() { window.location.href = 'ProductReview.html'; }
function viewTransaction() { window.location.href = 'TransactionHistory.html'; }
function goHome() { window.location.href = 'OrderSummary.html'; }

// Close sidebar when clicking outside
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    if (sidebar && toggle && !sidebar.contains(event.target) && !toggle.contains(event.target)) {
        sidebar.classList.remove('show');
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) overlay.classList.remove('show');
    }
});

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    addProgressTrackerStyles();
    const pageHeader = document.querySelector('.page-header');
    if (pageHeader) {
        const trackerHTML = generateProgressTracker();
        pageHeader.insertAdjacentHTML('afterend', trackerHTML);
    }
    attachNavigationHandlers();
    console.log('MATARIX Navigation System initialized for:', getCurrentPage());
});

// Export for manual use
window.MatarixNavigation = {
    navigateToPage,
    getCurrentPage,
    getCurrentStep,
    initMatarixNavigation: () => {
        addProgressTrackerStyles();
        const pageHeader = document.querySelector('.page-header');
        if (pageHeader) {
            const trackerHTML = generateProgressTracker();
            pageHeader.insertAdjacentHTML('afterend', trackerHTML);
        }
        attachNavigationHandlers();
    },
    toggleOrderDetails,
    reviewOrder,
    viewTransaction,
    goHome
};

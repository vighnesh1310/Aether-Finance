/* ==========================================
   AETHER FINANCE CORE CONTROLLER (app.js)
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Current date display
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', dateOptions);

    // Global variables for Chart instances
    let netWorthChartInstance = null;
    let assetAllocationChartInstance = null;

    // View state
    let allTransactions = [];
    let allAssets = [];
    let allBudgets = [];

    // --- Authentication State Management ---
    const authContainer = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const regNameGroup = document.getElementById('reg-name-group');
    const authSubmitBtn = document.getElementById('btn-auth-submit');
    const authToggleLink = document.getElementById('auth-toggle-link');
    const authToggleText = document.getElementById('auth-toggle-text');
    const authErrorMsg = document.getElementById('auth-error-msg');
    const authErrorText = document.getElementById('auth-error-text');
    const logoutBtn = document.getElementById('btn-logout');
    const profileName = document.getElementById('profile-name');

    let isRegisterMode = false;

    // Switch between Login and Register Mode
    authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        authErrorMsg.style.display = 'none';
        
        if (isRegisterMode) {
            authTitle.textContent = 'Create Account';
            authSubtitle.textContent = 'Join Aether to begin tracking your net worth.';
            regNameGroup.style.display = 'block';
            document.getElementById('auth-fullname').required = true;
            authSubmitBtn.textContent = 'Sign Up';
            authToggleText.textContent = 'Already have an account?';
            authToggleLink.textContent = 'Sign In';
        } else {
            authTitle.textContent = 'Access Portal';
            authSubtitle.textContent = 'Please authenticate to access your portfolio tracker.';
            regNameGroup.style.display = 'none';
            document.getElementById('auth-fullname').required = false;
            authSubmitBtn.textContent = 'Sign In';
            authToggleText.textContent = 'New to Aether?';
            authToggleLink.textContent = 'Create Account';
        }
    });

    // Check if user session exists on load
    checkAuthSession();

    function checkAuthSession() {
        const user = getLoggedInUser();
        if (user) {
            showDashboard(user);
        } else {
            showAuthScreen();
        }
    }

    function getLoggedInUser() {
        const userJson = localStorage.getItem('aether_user');
        return userJson ? JSON.parse(userJson) : null;
    }

    function showDashboard(user) {
        authContainer.style.display = 'none';
        mainApp.style.display = 'grid';
        profileName.textContent = user.fullName;
        
        // Initial data load
        loadDashboardData();
    }

    function showAuthScreen() {
        mainApp.style.display = 'none';
        authContainer.style.display = 'flex';
        authForm.reset();
        isRegisterMode = false;
        regNameGroup.style.display = 'none';
        document.getElementById('auth-fullname').required = false;
        authTitle.textContent = 'Access Portal';
        authSubmitBtn.textContent = 'Sign In';
        authToggleText.textContent = 'New to Aether?';
        authToggleLink.textContent = 'Create Account';
    }

    // Handle Authentication Forms
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        authErrorMsg.style.display = 'none';

        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;

        if (isRegisterMode) {
            const fullName = document.getElementById('auth-fullname').value.trim();
            // Register AJAX call
            fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, fullName })
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.error || 'Registration failed') });
                }
                return res.json();
            })
            .then(user => {
                // Auto-login on register
                localStorage.setItem('aether_user', JSON.stringify(user));
                showDashboard(user);
            })
            .catch(err => {
                authErrorText.textContent = err.message;
                authErrorMsg.style.display = 'flex';
            });
        } else {
            // Login AJAX call
            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.error || 'Authentication failed') });
                }
                return res.json();
            })
            .then(user => {
                localStorage.setItem('aether_user', JSON.stringify(user));
                showDashboard(user);
            })
            .catch(err => {
                authErrorText.textContent = err.message;
                authErrorMsg.style.display = 'flex';
            });
        }
    });

    // Handle Logout Action
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('aether_user');
        
        // Reset chart instances to avoid canvas issues
        if (netWorthChartInstance) {
            netWorthChartInstance.destroy();
            netWorthChartInstance = null;
        }
        if (assetAllocationChartInstance) {
            assetAllocationChartInstance.destroy();
            assetAllocationChartInstance = null;
        }

        showAuthScreen();
    });


    // --- Generic Scoped Fetch Helper ---
    function apiFetch(url, options = {}) {
        const user = getLoggedInUser();
        if (!user) {
            showAuthScreen();
            return Promise.reject('Session expired');
        }

        // Bind user ID header
        options.headers = options.headers || {};
        options.headers['X-User-Id'] = user.id;

        return fetch(url, options).then(res => {
            if (res.status === 401) {
                localStorage.removeItem('aether_user');
                showAuthScreen();
                throw new Error('Session unauthorized');
            }
            return res;
        });
    }


    // --- Tab Switcher Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    const viewMeta = {
        dashboard: {
            title: 'Financial Dashboard',
            subtitle: 'Real-time overview of your wealth and capital allocation.'
        },
        transactions: {
            title: 'Transaction Ledger',
            subtitle: 'Complete record of income and expenses.'
        },
        portfolio: {
            title: 'Asset Portfolio',
            subtitle: 'Track capital assets, investments, and growth rates.'
        },
        budgets: {
            title: 'Budget Controls',
            subtitle: 'Limit and monitor spending by categories.'
        }
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');

            // Set active class on nav
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Show active section
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === target) {
                    section.classList.add('active');
                }
            });

            // Update header text
            if (viewMeta[target]) {
                pageTitle.textContent = viewMeta[target].title;
                pageSubtitle.textContent = viewMeta[target].subtitle;
            }

            // Custom section load actions
            if (target === 'dashboard') {
                loadDashboardData();
            } else if (target === 'transactions') {
                loadTransactionsData();
            } else if (target === 'portfolio') {
                loadPortfolioData();
            } else if (target === 'budgets') {
                loadBudgetsData();
            }
        });
    });

    // Wire up "View All" links to act as navigation
    document.querySelectorAll('.view-all-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            const correspondingNav = document.querySelector(`.nav-item[data-target="${target}"]`);
            if (correspondingNav) {
                correspondingNav.click();
            }
        });
    });

    // --- Modal Logic ---
    const transactionModal = document.getElementById('transaction-modal');
    const quickTxBtn = document.getElementById('btn-quick-transaction');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const addTxForm = document.getElementById('add-transaction-form');

    // Default tx-date to today
    document.getElementById('tx-date').value = new Date().toISOString().substring(0, 10);

    const openModal = () => {
        transactionModal.style.display = 'flex';
    };

    const closeModal = () => {
        transactionModal.style.display = 'none';
        addTxForm.reset();
        document.getElementById('tx-date').value = new Date().toISOString().substring(0, 10);
    };

    quickTxBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Close on click outside modal content
    window.addEventListener('click', (e) => {
        if (e.target === transactionModal) {
            closeModal();
        }
    });

    // --- Core API Functions (Using Scoped helper) ---

    // Fetch and Populate Dashboard View
    function loadDashboardData() {
        apiFetch('/api/summary')
            .then(res => res.json())
            .then(data => {
                // Update Metrics (Formated as INR currency)
                document.getElementById('stat-net-worth').textContent = formatCurrency(data.netWorth);
                document.getElementById('stat-income').textContent = formatCurrency(data.totalIncome);
                document.getElementById('stat-expenses').textContent = formatCurrency(data.totalExpense);
                document.getElementById('stat-cashflow').textContent = formatCurrency(data.cashFlow);

                // Cash flow trend styling
                const cashFlowCard = document.getElementById('stat-cashflow').parentElement;
                const trendElement = cashFlowCard.querySelector('.stat-trend');
                if (data.cashFlow < 0) {
                    trendElement.className = 'stat-trend trend-down';
                    trendElement.innerHTML = '<i class="fa-solid fa-arrow-trend-down"></i> Monthly deficit';
                } else {
                    trendElement.className = 'stat-trend trend-up';
                    trendElement.innerHTML = '<i class="fa-solid fa-arrow-trend-up"></i> Net Surplus';
                }

                // Render Charts
                renderNetWorthTrendChart(data.netWorth);
                renderAssetAllocationChart(data.assetCategoryValues);

                // Render Recent Activities (Limit 5)
                renderRecentActivities(data.recentTransactions);

                // Render Active Budgets (Limit 4 on Dashboard)
                renderActiveBudgets(data.budgets.slice(0, 4), 'dashboard-budgets');
            })
            .catch(err => {
                console.error('Error fetching dashboard summary:', err);
            });
    }

    // Fetch and Populate Transactions Ledger
    function loadTransactionsData() {
        apiFetch('/api/transactions')
            .then(res => res.json())
            .then(data => {
                allTransactions = data;
                renderTransactionsTable(data);
                populateCategoryFilter(data);
            })
            .catch(err => console.error('Error fetching transactions:', err));
    }

    // Fetch and Populate Portfolio View
    function loadPortfolioData() {
        apiFetch('/api/assets')
            .then(res => res.json())
            .then(data => {
                allAssets = data;
                renderAssetsTable(data);
            })
            .catch(err => console.error('Error fetching assets:', err));
    }

    // Fetch and Populate Budgets View
    function loadBudgetsData() {
        apiFetch('/api/budgets')
            .then(res => res.json())
            .then(data => {
                allBudgets = data;
                renderActiveBudgets(data, 'budget-full-list');
            })
            .catch(err => console.error('Error fetching budgets:', err));
    }

    // --- Rendering Helpers ---

    function formatCurrency(value) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(value);
    }

    // Render activity list on dashboard
    function renderRecentActivities(transactions) {
        const container = document.getElementById('dashboard-activities');
        container.innerHTML = '';

        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<div class="subtitle text-center">No recent transactions.</div>';
            return;
        }

        transactions.forEach(tx => {
            const isExpense = tx.type === 'EXPENSE';
            const iconClass = isExpense ? 'fa-solid fa-cart-shopping' : 'fa-solid fa-money-bill-wave';
            const bgClass = isExpense ? 'icon-coral' : 'icon-green';
            const amountPrefix = isExpense ? '-' : '+';
            const amountClass = isExpense ? 'trend-down' : 'trend-up';

            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <div class="activity-info">
                    <div class="activity-icon ${bgClass}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="activity-details">
                        <span class="activity-name">${escapeHTML(tx.description)}</span>
                        <span class="activity-meta">${escapeHTML(tx.category)} &bull; ${tx.date}</span>
                    </div>
                </div>
                <div class="activity-amount ${amountClass}">
                    ${amountPrefix}${formatCurrency(tx.amount)}
                </div>
            `;
            container.appendChild(item);
        });
    }

    // Render active budgets with progress bars
    function renderActiveBudgets(budgets, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        if (!budgets || budgets.length === 0) {
            container.innerHTML = '<div class="subtitle text-center">No active budgets set.</div>';
            return;
        }

        budgets.forEach(b => {
            const percent = b.limitAmount > 0 ? Math.min((b.spentAmount / b.limitAmount) * 100, 100) : 0;
            
            // Choose progress color based on status percentage
            let progressColor = 'bg-cyan';
            if (percent >= 90) {
                progressColor = 'bg-coral';
            } else if (percent >= 70) {
                progressColor = 'bg-violet';
            } else {
                progressColor = 'bg-green';
            }

            const item = document.createElement('div');
            item.className = 'budget-progress-item';
            item.innerHTML = `
                <div class="budget-info-row">
                    <span class="budget-name">${escapeHTML(b.category)}</span>
                    <span class="budget-stats">
                        <span class="spent">${formatCurrency(b.spentAmount)}</span> / ${formatCurrency(b.limitAmount)}
                    </span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill ${progressColor}" style="width: ${percent}%"></div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    // Render Transactions Table
    function renderTransactionsTable(transactions) {
        const tbody = document.getElementById('transaction-table-body');
        tbody.innerHTML = '';

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center subtitle">No transactions matched your search.</td></tr>';
            return;
        }

        transactions.forEach(tx => {
            const isExpense = tx.type === 'EXPENSE';
            const badgeClass = isExpense ? 'trend-down' : 'trend-up';
            const amountPrefix = isExpense ? '-' : '+';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight: 600;">${escapeHTML(tx.description)}</td>
                <td><span style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 6px; font-size: 0.85rem;">${escapeHTML(tx.category)}</span></td>
                <td><span class="${badgeClass}" style="font-weight: 600; font-size: 0.85rem;">${tx.type}</span></td>
                <td style="color: #94a3b8;">${tx.date}</td>
                <td class="text-right ${badgeClass}" style="font-weight: 700;">
                    ${amountPrefix}${formatCurrency(tx.amount)}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Render Assets Table
    function renderAssetsTable(assets) {
        const tbody = document.getElementById('asset-table-body');
        tbody.innerHTML = '';

        if (assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center subtitle">No assets found in your portfolio.</td></tr>';
            return;
        }

        assets.forEach(asset => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight: 600;">${escapeHTML(asset.name)}</td>
                <td><span style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 6px; font-size: 0.85rem;">${escapeHTML(asset.category)}</span></td>
                <td class="trend-up" style="font-weight: 600;">+${asset.growthRate}%</td>
                <td class="text-right" style="font-weight: 700; color: var(--neon-cyan);">${formatCurrency(asset.value)}</td>
                <td class="text-center">
                    <button class="btn-delete" data-id="${asset.id}" title="Remove Asset">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners to delete buttons
        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const assetId = btn.getAttribute('data-id');
                if (confirm('Are you sure you want to remove this asset from your portfolio?')) {
                    deleteAsset(assetId);
                }
            });
        });
    }

    // Delete Asset Action
    function deleteAsset(id) {
        apiFetch(`/api/assets/${id}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (res.ok) {
                loadPortfolioData();
                // If dashboard is active/drawn, refresh it too
                if (document.getElementById('dashboard').classList.contains('active')) {
                    loadDashboardData();
                }
            } else {
                alert('Failed to delete asset.');
            }
        })
        .catch(err => console.error('Error deleting asset:', err));
    }

    // Search and Filters for transactions
    const searchInput = document.getElementById('transaction-search');
    const filterType = document.getElementById('filter-type');
    const filterCategory = document.getElementById('filter-category');

    function filterTransactions() {
        const searchVal = searchInput.value.toLowerCase();
        const typeVal = filterType.value;
        const categoryVal = filterCategory.value;

        const filtered = allTransactions.filter(tx => {
            const matchesSearch = tx.description.toLowerCase().includes(searchVal) || 
                                  tx.category.toLowerCase().includes(searchVal);
            const matchesType = typeVal === 'ALL' || tx.type === typeVal;
            const matchesCategory = categoryVal === 'ALL' || tx.category === categoryVal;

            return matchesSearch && matchesType && matchesCategory;
        });

        renderTransactionsTable(filtered);
    }

    searchInput.addEventListener('input', filterTransactions);
    filterType.addEventListener('change', filterTransactions);
    filterCategory.addEventListener('change', filterTransactions);

    // Populate Category Dropdown Filter dynamically
    function populateCategoryFilter(transactions) {
        const categories = new Set(transactions.map(t => t.category));
        
        // Save current filter value
        const currentVal = filterCategory.value;

        filterCategory.innerHTML = '<option value="ALL">All Categories</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            filterCategory.appendChild(opt);
        });

        // Restore if possible
        if (categories.has(currentVal)) {
            filterCategory.value = currentVal;
        }
    }

    // --- Form Submissions (Using apiFetch helper) ---

    // Add Transaction Form
    addTxForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const txPayload = {
            description: document.getElementById('tx-description').value,
            type: document.getElementById('tx-type').value,
            amount: parseFloat(document.getElementById('tx-amount').value),
            category: document.getElementById('tx-category').value,
            date: document.getElementById('tx-date').value
        };

        apiFetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txPayload)
        })
        .then(res => res.json())
        .then(() => {
            closeModal();
            // Refresh current view
            const activeSection = document.querySelector('.content-section.active');
            if (activeSection.id === 'dashboard') {
                loadDashboardData();
            } else if (activeSection.id === 'transactions') {
                loadTransactionsData();
            }
        })
        .catch(err => console.error('Error adding transaction:', err));
    });

    // Add Asset Form
    const addAssetForm = document.getElementById('add-asset-form');
    addAssetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const assetPayload = {
            name: document.getElementById('asset-name').value,
            category: document.getElementById('asset-category').value,
            value: parseFloat(document.getElementById('asset-value').value),
            growthRate: parseFloat(document.getElementById('asset-growth').value)
        };

        apiFetch('/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assetPayload)
        })
        .then(res => res.json())
        .then(() => {
            addAssetForm.reset();
            loadPortfolioData();
        })
        .catch(err => console.error('Error adding asset:', err));
    });

    // Adjust Budget Form
    const adjustBudgetForm = document.getElementById('adjust-budget-form');
    adjustBudgetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const budgetPayload = {
            category: document.getElementById('budget-category').value,
            limitAmount: parseFloat(document.getElementById('budget-limit').value)
        };

        apiFetch('/api/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(budgetPayload)
        })
        .then(res => res.json())
        .then(() => {
            adjustBudgetForm.reset();
            loadBudgetsData();
        })
        .catch(err => console.error('Error adjusting budget:', err));
    });

    // --- Chart.js Rendering Logic ---

    // 1. Line Chart: Net Worth Trend
    function renderNetWorthTrendChart(currentNetWorth) {
        const ctx = document.getElementById('netWorthChart').getContext('2d');

        // Create gradient fills
        const chartGradient = ctx.createLinearGradient(0, 0, 0, 300);
        chartGradient.addColorStop(0, 'rgba(0, 242, 254, 0.25)');
        chartGradient.addColorStop(1, 'rgba(0, 242, 254, 0)');

        // Simulated historical trend indices
        const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun (Current)'];
        const dataValues = [
            currentNetWorth * 0.88,
            currentNetWorth * 0.91,
            currentNetWorth * 0.90,
            currentNetWorth * 0.94,
            currentNetWorth * 0.97,
            currentNetWorth
        ];

        if (netWorthChartInstance) {
            netWorthChartInstance.data.datasets[0].data = dataValues;
            netWorthChartInstance.update();
            return;
        }

        netWorthChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Net Worth Value (₹)',
                    data: dataValues,
                    borderColor: '#00f2fe',
                    borderWidth: 3,
                    fill: true,
                    backgroundColor: chartGradient,
                    tension: 0.35,
                    pointBackgroundColor: '#00f2fe',
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Outfit' },
                            callback: function(value) {
                                if (value >= 10000000) {
                                    return '₹' + (value / 10000000).toFixed(1) + 'Cr';
                                } else if (value >= 100000) {
                                    return '₹' + (value / 100000).toFixed(1) + 'L';
                                } else if (value >= 1000) {
                                    return '₹' + (value / 1000).toFixed(0) + 'k';
                                }
                                return '₹' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    // 2. Doughnut Chart: Asset Allocation
    function renderAssetAllocationChart(categoryValuesMap) {
        const ctx = document.getElementById('assetAllocationChart').getContext('2d');

        const labels = Object.keys(categoryValuesMap || {});
        const dataValues = Object.values(categoryValuesMap || {});

        const colorMap = {
            'Stocks': '#00f2fe',
            'Crypto': '#8b5cf6',
            'Real Estate': '#3b82f6',
            'Cash': '#00f5a0',
            'Gold': '#facc15'
        };

        const backgroundColors = labels.map(label => colorMap[label] || '#94a3b8');

        if (assetAllocationChartInstance) {
            assetAllocationChartInstance.data.labels = labels;
            assetAllocationChartInstance.data.datasets[0].data = dataValues;
            assetAllocationChartInstance.data.datasets[0].backgroundColor = backgroundColors;
            assetAllocationChartInstance.update();
            return;
        }

        assetAllocationChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: backgroundColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#cbd5e1',
                            font: { family: 'Outfit', size: 12 },
                            padding: 15
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    // Escapes special characters to prevent HTML injection
    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});

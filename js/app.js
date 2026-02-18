// Main application controller

document.addEventListener('DOMContentLoaded', async () => {
    console.log('PropertyHub initializing...');

    // Initialize app
    await App.init();
});

const App = {
    syncInterval: null,

    /**
     * Initialize application
     */
    init: async () => {
        try {
            // Check configuration
            if (!CONFIG.gasUrl || CONFIG.gasUrl.includes('YOUR_DEPLOYMENT_ID')) {
                console.warn('⚠️  Google Apps Script URL not configured');
                UI.showToast('Please configure GAS_DEPLOYMENT_URL in js/config.js', 'error');
                return;
            }

            // Initialize users module first (loads current user)
            await Users.init();

            // Load user email
            const userEmail = await API.getUserEmail();
            document.getElementById('user-email').textContent = userEmail;

            // Initialize permissions after users module
            await Permissions.init();

            // Setup navigation
            App.setupNavigation();

            // Setup sync button
            App.setupSync();

            // Load initial data
            await App.loadAllData();

            // Setup periodic sync
            App.setupPeriodicSync();

            console.log('PropertyHub initialized successfully');
            UI.showToast('PropertyHub loaded successfully', 'success');
        } catch (error) {
            console.error('Error initializing app:', error);
            UI.showToast('Error initializing app', 'error');
        }
    },

    /**
     * Setup navigation
     */
    setupNavigation: () => {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const viewName = item.dataset.view;
                UI.switchView(viewName);
                App.loadViewData(viewName);
            });
        });
    },

    /**
     * Setup sync button
     */
    setupSync: () => {
        const syncBtn = document.getElementById('sync-btn');
        syncBtn?.addEventListener('click', () => {
            App.manualSync();
        });
    },

    /**
     * Manual sync
     */
    manualSync: async () => {
        const syncBtn = document.getElementById('sync-btn');
        syncBtn?.classList.add('syncing');

        try {
            // Clear cache
            Storage.remove('properties');
            Storage.remove('mortgages');
            Storage.remove('expenses');
            Storage.remove('portfolio_metrics');

            // Reload all data
            await App.loadAllData();

            UI.showToast('Data synced successfully', 'success');
        } catch (error) {
            console.error('Error syncing data:', error);
            UI.showToast('Error syncing data', 'error');
        } finally {
            syncBtn?.classList.remove('syncing');
            document.querySelector('.sync-status').textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
        }
    },

    /**
     * Load all data for dashboard
     */
    loadAllData: async () => {
        try {
            // Initialize modules
            await Dashboard.init();
            await Properties.init();
            await Mortgages.init();
            await Utilities.init();
            await Contacts.init();
            await Tenants.init();
            await RentPayments.init();
            await Insurance.init();
            await Tasks.init();
            await Analytics.init();
            await Refinance.init();
            await FinancialDecisions.init();
            await PredictiveAnalytics.init();
            await TaxOptimization.init();
            await AutomationEngine.init();

            // Initialize users module if owner
            if (Users.isOwner()) {
                await Users.loadUsers();
                await Users.loadActiveSessions();
                await Users.loadActivityLog();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    },

    /**
     * Load data specific to a view
     */
    loadViewData: async (viewName) => {
        try {
            // Check permission before loading view
            if (!Permissions.enforceViewPermission(viewName)) {
                return;
            }

            switch (viewName) {
                case 'dashboard':
                    await Dashboard.loadMetrics();
                    await Dashboard.loadPropertiesSummary();
                    break;
                case 'properties':
                    await Properties.loadProperties();
                    break;
                case 'mortgages':
                    await Mortgages.loadMortgages();
                    break;
                case 'expenses':
                    // Load expenses when module is ready
                    break;
                case 'utilities':
                    await Utilities.loadUtilities();
                    break;
                case 'contacts':
                    await Contacts.loadContacts();
                    break;
                case 'tenants':
                    await Tenants.loadTenants();
                    break;
                case 'rent_payments':
                    await RentPayments.loadRentPayments();
                    break;
                case 'insurance':
                    await Insurance.loadInsurance();
                    break;
                case 'tasks':
                    await Tasks.loadTasks();
                    break;
                case 'analytics':
                    await Analytics.loadAnalytics();
                    break;
                case 'refinance':
                    await Refinance.loadRefinanceCalculator();
                    break;
                case 'financial_decisions':
                    await FinancialDecisions.loadFinancialDecisions();
                    break;
                case 'predictive':
                    await PredictiveAnalytics.loadPredictiveAnalytics();
                    break;
                case 'tax':
                    await TaxOptimization.loadTaxOptimization();
                    break;
                case 'automation':
                    await AutomationEngine.loadAutomationEngine();
                    break;
                case 'users':
                    await Users.loadUsers();
                    await Users.renderUsersList();
                    await Users.loadActiveSessions();
                    await Users.loadActivityLog();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${viewName} data:`, error);
        }
    },

    /**
     * Setup periodic sync
     */
    setupPeriodicSync: () => {
        App.syncInterval = setInterval(async () => {
            try {
                // Silently refresh data in background
                Storage.remove('portfolio_metrics');
                const metrics = await API.getPortfolioMetrics();
                document.getElementById('total-value').textContent = Formatting.currency(metrics.totalValue || 0);
                document.getElementById('total-debt').textContent = Formatting.currency(metrics.totalDebt || 0);
                document.getElementById('total-equity').textContent = Formatting.currency(metrics.totalEquity || 0);
                document.getElementById('monthly-income').textContent = Formatting.currency(metrics.monthlyIncome || 0);
            } catch (error) {
                // Silent fail for background sync
                console.debug('Background sync error:', error);
            }
        }, CONFIG.syncInterval);
    }
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (App.syncInterval) {
        clearInterval(App.syncInterval);
    }
});

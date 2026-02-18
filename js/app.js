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
            const isDemo = !CONFIG.gasUrl || CONFIG.gasUrl.includes('YOUR_DEPLOYMENT_ID');
            if (isDemo) {
                console.warn('⚠️  Google Apps Script URL not configured - running in demo mode');
            }

            // Setup navigation always (even without GAS)
            App.setupNavigation();

            // Setup sync button
            App.setupSync();

            if (!isDemo) {
                // Initialize users module first (loads current user)
                await Users.init();

                // Load user email
                const userEmail = await API.getUserEmail();
                document.getElementById('user-email').textContent = userEmail;

                // Initialize permissions after users module
                await Permissions.init();

                // Load initial data
                await App.loadAllData();

                // Setup periodic sync
                App.setupPeriodicSync();

                console.log('PropertyHub initialized successfully');
                UI.showToast('PropertyHub loaded successfully', 'success');
            } else {
                // Demo mode - initialize modules without API calls
                await App.loadAllData();
                document.getElementById('user-email').textContent = 'demo@propertyhub.app';
                UI.showToast('Running in demo mode - configure GAS URL in js/config.js', 'warning');
            }
        } catch (error) {
            console.error('Error initializing app:', error);
            UI.showToast('Error initializing app: ' + error.message, 'error');
        }
    },

    /**
     * Toggle mobile sidebar
     */
    toggleMobileSidebar: () => {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        const hamburger = document.getElementById('hamburger-menu');

        if (!sidebar || !backdrop) return;

        sidebar.classList.toggle('open');
        backdrop.classList.toggle('open');
        hamburger.setAttribute('aria-expanded',
            hamburger.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
        );
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

                // Close mobile sidebar after navigation (on screens < 768px)
                if (window.innerWidth < 768) {
                    const sidebar = document.getElementById('sidebar');
                    const backdrop = document.getElementById('sidebar-backdrop');
                    const hamburger = document.getElementById('hamburger-menu');

                    if (sidebar && backdrop) {
                        sidebar.classList.remove('open');
                        backdrop.classList.remove('open');
                        hamburger.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        });

        // Hamburger menu toggle
        const hamburger = document.getElementById('hamburger-menu');
        if (hamburger) {
            hamburger.addEventListener('click', () => {
                App.toggleMobileSidebar();
            });
        }

        // Close sidebar on backdrop click
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                App.toggleMobileSidebar();
            });
        }

        // Close sidebar on window resize to desktop size
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                const sidebar = document.getElementById('sidebar');
                const backdrop = document.getElementById('sidebar-backdrop');
                const hamburger = document.getElementById('hamburger-menu');

                if (sidebar && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    backdrop?.classList.remove('open');
                    hamburger?.setAttribute('aria-expanded', 'false');
                }
            }
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
            await FinancialAnalytics.init();
            await KPIMonitoring.init();
            await ScenarioAnalysis.init();
            await PortfolioBenchmarking.init();
            await InvestmentAnalysis.init();
            await FinancialReports.init();
            await MLAnalytics.init();
            await MobileApp.init();

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
                case 'financial_analytics':
                    await FinancialAnalytics.loadFinancialAnalytics();
                    break;
                case 'kpi_monitoring':
                    await KPIMonitoring.loadKPIMonitoring();
                    break;
                case 'scenario_analysis':
                    await ScenarioAnalysis.loadScenarioAnalysis();
                    break;
                case 'benchmarking':
                    await PortfolioBenchmarking.loadBenchmarking();
                    break;
                case 'investment_analysis':
                    await InvestmentAnalysis.loadInvestmentAnalysis();
                    break;
                case 'financial_reports':
                    await FinancialReports.loadFinancialReports();
                    break;
                case 'ml_analytics':
                    await MLAnalytics.loadMLAnalytics();
                    break;
                case 'mobile_app':
                    await MobileApp.loadMobileSettings();
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

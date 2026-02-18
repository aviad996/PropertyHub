// API utilities for calling Google Apps Script

const API = {
    isOnline: navigator.onLine,

    /**
     * Call Google Apps Script function
     */
    call: async (functionName, params = {}) => {
        if (!CONFIG.gasUrl || CONFIG.gasUrl.includes('YOUR_DEPLOYMENT_ID')) {
            console.error('Google Apps Script URL not configured');
            UI.showToast('App not configured. Please set GAS_DEPLOYMENT_URL in js/config.js', 'error');
            return null;
        }

        try {
            const url = `${CONFIG.gasUrl}?action=${functionName}`;
            const queryParams = new URLSearchParams(params).toString();
            const fullUrl = queryParams ? `${url}&${queryParams}` : url;

            const response = await Promise.race([
                fetch(fullUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), CONFIG.requestTimeout)
                )
            ]);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API.call(${functionName}) error:`, error);
            return null;
        }
    },

    /**
     * Get all properties
     */
    getProperties: async () => {
        const cached = Storage.getCache('properties');
        if (cached) return cached;

        const response = await API.call('getProperties');
        if (response && response.data) {
            Storage.cache('properties', response.data, 60000); // 1 minute cache
            return response.data;
        }
        return [];
    },

    /**
     * Add property
     */
    addProperty: async (propertyData) => {
        const response = await API.call('addProperty', propertyData);
        if (response && response.success) {
            Storage.remove('properties'); // Clear cache
            return response.data;
        }
        throw new Error(response?.error || 'Failed to add property');
    },

    /**
     * Update property
     */
    updateProperty: async (propertyId, propertyData) => {
        const response = await API.call('updateProperty', {
            id: propertyId,
            ...propertyData
        });
        if (response && response.success) {
            Storage.remove('properties'); // Clear cache
            return response.data;
        }
        throw new Error(response?.error || 'Failed to update property');
    },

    /**
     * Delete property
     */
    deleteProperty: async (propertyId) => {
        const response = await API.call('deleteProperty', { id: propertyId });
        if (response && response.success) {
            Storage.remove('properties'); // Clear cache
            return true;
        }
        throw new Error(response?.error || 'Failed to delete property');
    },

    /**
     * Get all mortgages
     */
    getMortgages: async () => {
        const cached = Storage.getCache('mortgages');
        if (cached) return cached;

        const response = await API.call('getMortgages');
        if (response && response.data) {
            Storage.cache('mortgages', response.data, 60000);
            return response.data;
        }
        return [];
    },

    /**
     * Add mortgage
     */
    addMortgage: async (mortgageData) => {
        const response = await API.call('addMortgage', mortgageData);
        if (response && response.success) {
            Storage.remove('mortgages');
            Storage.remove('portfolio_metrics');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to add mortgage');
    },

    /**
     * Update mortgage
     */
    updateMortgage: async (mortgageId, mortgageData) => {
        const response = await API.call('updateMortgage', {
            id: mortgageId,
            ...mortgageData
        });
        if (response && response.success) {
            Storage.remove('mortgages');
            Storage.remove('portfolio_metrics');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to update mortgage');
    },

    /**
     * Delete mortgage
     */
    deleteMortgage: async (mortgageId) => {
        const response = await API.call('deleteMortgage', { id: mortgageId });
        if (response && response.success) {
            Storage.remove('mortgages');
            Storage.remove('portfolio_metrics');
            return true;
        }
        throw new Error(response?.error || 'Failed to delete mortgage');
    },

    /**
     * Get all expenses
     */
    getExpenses: async () => {
        const cached = Storage.getCache('expenses');
        if (cached) return cached;

        const response = await API.call('getExpenses');
        if (response && response.data) {
            Storage.cache('expenses', response.data, 60000);
            return response.data;
        }
        return [];
    },

    /**
     * Add expense
     */
    addExpense: async (expenseData) => {
        const response = await API.call('addExpense', expenseData);
        if (response && response.success) {
            Storage.remove('expenses');
            Storage.remove('portfolio_metrics');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to add expense');
    },

    /**
     * Get portfolio metrics
     */
    getPortfolioMetrics: async () => {
        const cached = Storage.getCache('portfolio_metrics');
        if (cached) return cached;

        const response = await API.call('getPortfolioMetrics');
        if (response && response.data) {
            Storage.cache('portfolio_metrics', response.data, 60000);
            return response.data;
        }
        return {
            totalValue: 0,
            totalDebt: 0,
            totalEquity: 0,
            monthlyIncome: 0,
            propertyCount: 0
        };
    },

    /**
     * Get all contacts
     */
    getContacts: async () => {
        const cached = Storage.getCache('contacts');
        if (cached) return cached;

        const response = await API.call('getContacts');
        if (response && response.data) {
            Storage.cache('contacts', response.data, 60000);
            return response.data;
        }
        return [];
    },

    /**
     * Add contact
     */
    addContact: async (contactData) => {
        const response = await API.call('addContact', contactData);
        if (response && response.success) {
            Storage.remove('contacts');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to add contact');
    },

    /**
     * Update contact
     */
    updateContact: async (contactId, contactData) => {
        const response = await API.call('updateContact', {
            id: contactId,
            ...contactData
        });
        if (response && response.success) {
            Storage.remove('contacts');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to update contact');
    },

    /**
     * Delete contact
     */
    deleteContact: async (contactId) => {
        const response = await API.call('deleteContact', { id: contactId });
        if (response && response.success) {
            Storage.remove('contacts');
            return true;
        }
        throw new Error(response?.error || 'Failed to delete contact');
    },

    /**
     * Get tenant charges
     */
    getTenantCharges: async () => {
        const cached = Storage.getCache('tenant_charges');
        if (cached) return cached;

        const response = await API.call('getTenantCharges');
        if (response && response.data) {
            Storage.cache('tenant_charges', response.data, 60000);
            return response.data;
        }
        return [];
    },

    /**
     * Add tenant charge
     */
    addTenantCharge: async (chargeData) => {
        const response = await API.call('addTenantCharge', chargeData);
        if (response && response.success) {
            Storage.remove('tenant_charges');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to add tenant charge');
    },

    /**
     * Get triggers
     */
    getTriggers: async () => {
        const cached = Storage.getCache('triggers');
        if (cached) return cached;

        const response = await API.call('getTriggers');
        if (response && response.data) {
            Storage.cache('triggers', response.data, 60000);
            return response.data;
        }
        return [];
    },

    /**
     * Get all tenants
     */
    getTenants: async () => {
        const cached = Storage.getCache('tenants');
        if (cached) return cached;

        const response = await API.call('getTenants');
        if (response && response.data) {
            Storage.cache('tenants', response.data, 60000);
            return response.data;
        }
        return [];
    },

    /**
     * Add tenant
     */
    addTenant: async (tenantData) => {
        const response = await API.call('addTenant', tenantData);
        if (response && response.success) {
            Storage.remove('tenants');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to add tenant');
    },

    /**
     * Update tenant
     */
    updateTenant: async (tenantId, tenantData) => {
        const response = await API.call('updateTenant', {
            id: tenantId,
            ...tenantData
        });
        if (response && response.success) {
            Storage.remove('tenants');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to update tenant');
    },

    /**
     * Delete tenant
     */
    deleteTenant: async (tenantId) => {
        const response = await API.call('deleteTenant', { id: tenantId });
        if (response && response.success) {
            Storage.remove('tenants');
            Storage.remove('rent_payments');
            return true;
        }
        throw new Error(response?.error || 'Failed to delete tenant');
    },

    /**
     * Get all rent payments
     */
    getRentPayments: async () => {
        const cached = Storage.getCache('rent_payments');
        if (cached) return cached;

        const response = await API.call('getRentPayments');
        if (response && response.data) {
            Storage.cache('rent_payments', response.data, 60000);
            return response.data;
        }
        return [];
    },

    /**
     * Add rent payment
     */
    addRentPayment: async (paymentData) => {
        const response = await API.call('addRentPayment', paymentData);
        if (response && response.success) {
            Storage.remove('rent_payments');
            Storage.remove('portfolio_metrics');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to add rent payment');
    },

    /**
     * Update rent payment
     */
    updateRentPayment: async (paymentId, paymentData) => {
        const response = await API.call('updateRentPayment', {
            id: paymentId,
            ...paymentData
        });
        if (response && response.success) {
            Storage.remove('rent_payments');
            Storage.remove('portfolio_metrics');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to update rent payment');
    },

    /**
     * Delete rent payment
     */
    deleteRentPayment: async (paymentId) => {
        const response = await API.call('deleteRentPayment', { id: paymentId });
        if (response && response.success) {
            Storage.remove('rent_payments');
            Storage.remove('portfolio_metrics');
            return true;
        }
        throw new Error(response?.error || 'Failed to delete rent payment');
    },

    /**
     * Get all insurance policies
     */
    getInsurance: async () => {
        const cached = Storage.getCache('insurance');
        if (cached) return cached;

        const response = await API.call('getInsurance');
        if (response && response.data) {
            Storage.cache('insurance', response.data, 60000);
            return response.data;
        }
        return [];
    },

    /**
     * Add insurance policy
     */
    addInsurance: async (insuranceData) => {
        const response = await API.call('addInsurance', insuranceData);
        if (response && response.success) {
            Storage.remove('insurance');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to add insurance policy');
    },

    /**
     * Update insurance policy
     */
    updateInsurance: async (policyId, insuranceData) => {
        const response = await API.call('updateInsurance', {
            id: policyId,
            ...insuranceData
        });
        if (response && response.success) {
            Storage.remove('insurance');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to update insurance policy');
    },

    /**
     * Delete insurance policy
     */
    deleteInsurance: async (policyId) => {
        const response = await API.call('deleteInsurance', { id: policyId });
        if (response && response.success) {
            Storage.remove('insurance');
            return true;
        }
        throw new Error(response?.error || 'Failed to delete insurance policy');
    },

    /**
     * Get all tasks
     */
    getTasks: async () => {
        const cached = Storage.getCache('tasks');
        if (cached) return cached;

        const response = await API.call('getTasks');
        if (response && response.data) {
            Storage.cache('tasks', response.data, 60000);
            return response.data;
        }
        return [];
    },

    /**
     * Add task
     */
    addTask: async (taskData) => {
        const response = await API.call('addTasks', taskData);
        if (response && response.success) {
            Storage.remove('tasks');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to add task');
    },

    /**
     * Update task
     */
    updateTask: async (taskId, taskData) => {
        const response = await API.call('updateTask', {
            id: taskId,
            ...taskData
        });
        if (response && response.success) {
            Storage.remove('tasks');
            return response.data;
        }
        throw new Error(response?.error || 'Failed to update task');
    },

    /**
     * Delete task
     */
    deleteTask: async (taskId) => {
        const response = await API.call('deleteTask', { id: taskId });
        if (response && response.success) {
            Storage.remove('tasks');
            return true;
        }
        throw new Error(response?.error || 'Failed to delete task');
    },

    /**
     * Get auth user email
     */
    getUserEmail: async () => {
        const cached = Storage.get('user_email');
        if (cached) return cached;

        const response = await API.call('getUserEmail');
        if (response && response.email) {
            Storage.set('user_email', response.email);
            return response.email;
        }
        return 'Unknown User';
    },

    /**
     * Get all financial decisions
     */
    getFinancialDecisions: async () => {
        // For now, use localStorage as backend doesn't have this yet
        const stored = Storage.get('financial_decisions');
        return stored ? JSON.parse(stored) : [];
    },

    /**
     * Add financial decision
     */
    addFinancialDecision: async (decisionData) => {
        const decisions = await API.getFinancialDecisions();
        decisions.push(decisionData);
        Storage.set('financial_decisions', JSON.stringify(decisions));
        return decisionData;
    },

    /**
     * Update financial decision
     */
    updateFinancialDecision: async (decisionId, decisionData) => {
        const decisions = await API.getFinancialDecisions();
        const index = decisions.findIndex(d => d.id === decisionId);
        if (index !== -1) {
            decisions[index] = { ...decisions[index], ...decisionData };
            Storage.set('financial_decisions', JSON.stringify(decisions));
            return decisions[index];
        }
        throw new Error('Decision not found');
    },

    /**
     * Delete financial decision
     */
    deleteFinancialDecision: async (decisionId) => {
        const decisions = await API.getFinancialDecisions();
        const filtered = decisions.filter(d => d.id !== decisionId);
        Storage.set('financial_decisions', JSON.stringify(filtered));
        return true;
    }
};

// UI utilities
const UI = {
    /**
     * Show toast notification
     */
    showToast: (message, type = 'info') => {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    },

    /**
     * Switch view
     */
    switchView: (viewName) => {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view - try both underscore and hyphen variants
        const viewId = viewName.replace(/_/g, '-');
        const view = document.getElementById(`${viewId}-view`) ||
                     document.getElementById(`${viewName}-view`);
        if (view) {
            view.classList.add('active');
        }

        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');

        // Update page title
        const titles = {
            'dashboard': 'Dashboard',
            'properties': 'Properties',
            'mortgages': 'Mortgages',
            'expenses': 'Expenses',
            'utilities': 'Utilities',
            'contacts': 'Contacts',
            'tenants': 'Tenants',
            'rent_payments': 'Rent Payments',
            'insurance': 'Insurance Policies',
            'tasks': 'Tasks & Reminders',
            'analytics': 'Analytics',
            'refinance': 'Refinance Calculator',
            'financial_decisions': 'Financial Decisions',
            'predictive': 'Predictive Analytics',
            'tax': 'Tax Optimization',
            'automation': 'Automation',
            'financial_analytics': 'Financial Analytics',
            'kpi_monitoring': 'KPI Monitoring',
            'scenario_analysis': 'Scenario Analysis',
            'benchmarking': 'Benchmarking',
            'investment_analysis': 'ROI Analysis',
            'financial_reports': 'Financial Reports',
            'ml_analytics': 'ML Analytics',
            'mobile_app': 'Mobile App',
            'users': 'User Management'
        };
        document.getElementById('page-title').textContent = titles[viewName] || viewName;

        // Update button visibility
        const addBtn = document.getElementById('add-item-btn');
        if (viewName === 'properties') {
            addBtn.style.display = '';
            addBtn.textContent = '+ New Property';
            addBtn.dataset.action = 'add-property';
        } else if (viewName === 'mortgages') {
            addBtn.style.display = '';
            addBtn.textContent = '+ New Mortgage';
            addBtn.dataset.action = 'add-mortgage';
        } else if (viewName === 'expenses') {
            addBtn.style.display = '';
            addBtn.textContent = '+ New Expense';
            addBtn.dataset.action = 'add-expense';
        } else {
            addBtn.style.display = 'none';
        }
    },

    /**
     * Show/hide modal
     */
    modal: {
        show: (modalId) => {
            document.getElementById(modalId)?.classList.remove('hidden');
        },
        hide: (modalId) => {
            document.getElementById(modalId)?.classList.add('hidden');
        }
    },

    /**
     * Get current user email
     */
    getUserEmail: async () => {
        try {
            const response = await API.call('getCurrentUserEmail');
            return response?.email || 'user@example.com';
        } catch (error) {
            console.error('Error getting user email:', error);
            return 'user@example.com';
        }
    },

    /**
     * Get current user role
     */
    getCurrentUserRole: async () => {
        try {
            const response = await API.call('getCurrentUserRole');
            return response?.role || 'owner';
        } catch (error) {
            console.error('Error getting user role:', error);
            return 'owner';
        }
    },

    /**
     * Check permission
     */
    checkPermission: async (action) => {
        try {
            const response = await API.call('checkPermission', { action });
            return response?.allowed || false;
        } catch (error) {
            console.error('Error checking permission:', error);
            return false;
        }
    },

    /**
     * Get all users
     */
    getUsers: async () => {
        try {
            const response = await API.call('getUsers');
            return response?.data || [];
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    },

    /**
     * Add user
     */
    addUser: async (userData) => {
        try {
            const response = await API.call('addUser', userData);
            if (response && response.success) {
                return response.data;
            }
            throw new Error(response?.error || 'Failed to add user');
        } catch (error) {
            console.error('Error adding user:', error);
            throw error;
        }
    },

    /**
     * Update user role
     */
    updateUserRole: async (email, role) => {
        try {
            const response = await API.call('updateUserRole', { email, role });
            if (response && response.success) {
                return response.data;
            }
            throw new Error(response?.error || 'Failed to update user role');
        } catch (error) {
            console.error('Error updating user role:', error);
            throw error;
        }
    },

    /**
     * Delete user
     */
    deleteUser: async (email) => {
        try {
            const response = await API.call('deleteUser', { email });
            if (response && response.success) {
                return true;
            }
            throw new Error(response?.error || 'Failed to delete user');
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    /**
     * Get activity log
     */
    getActivityLog: async () => {
        try {
            const response = await API.call('getActivityLog');
            return response?.data || [];
        } catch (error) {
            console.error('Error getting activity log:', error);
            return [];
        }
    },

    /**
     * Get active sessions
     */
    getActiveSessions: async () => {
        try {
            const response = await API.call('getActiveSessions');
            return response?.data || [];
        } catch (error) {
            console.error('Error getting active sessions:', error);
            return [];
        }
    },

    /**
     * End session
     */
    endSession: async (sessionId) => {
        try {
            const response = await API.call('endSession', { sessionId });
            return response?.success || false;
        } catch (error) {
            console.error('Error ending session:', error);
            throw error;
        }
    },

    // ==================== FORECASTING ====================

    /**
     * Get forecast data (cached)
     */
    getForecastData: async (forecastType = 'comprehensive', months = 12) => {
        const cacheKey = `forecast_${forecastType}_${months}`;
        const cached = Storage.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.call('getForecastData', { forecastType, months });
            const data = response?.data || null;
            if (data) {
                Storage.set(cacheKey, data, 300); // Cache for 5 minutes
            }
            return data;
        } catch (error) {
            console.error('Error getting forecast data:', error);
            return null;
        }
    },

    /**
     * Get expense forecast
     */
    getExpenseForecast: async (months = 12) => {
        return API.getForecastData('expenses', months);
    },

    /**
     * Get cash flow forecast
     */
    getCashFlowForecast: async (months = 12) => {
        return API.getForecastData('cash-flow', months);
    },

    /**
     * Get appreciation forecast
     */
    getAppreciationForecast: async (years = 5) => {
        return API.getForecastData('appreciation', years * 12);
    },

    /**
     * Save forecast preferences
     */
    saveForecastPreferences: async (preferences) => {
        try {
            const response = await API.call('saveForecastPreferences', preferences);
            Storage.remove('forecast_preferences'); // Invalidate cache
            return response?.success || false;
        } catch (error) {
            console.error('Error saving forecast preferences:', error);
            throw error;
        }
    },

    /**
     * Get forecast adjustment history
     */
    getForecastAdjustments: async () => {
        const cacheKey = 'forecast_adjustments';
        const cached = Storage.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.call('getForecastAdjustments');
            const data = response?.data || [];
            Storage.set(cacheKey, data, 300);
            return data;
        } catch (error) {
            console.error('Error getting forecast adjustments:', error);
            return [];
        }
    },

    // ==================== TAX OPTIMIZATION ====================

    /**
     * Get tax deduction summary
     */
    getTaxDeductions: async (taxYear) => {
        const cacheKey = `tax_deductions_${taxYear}`;
        const cached = Storage.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.call('getTaxDeductions', { taxYear });
            const data = response?.data || null;
            if (data) {
                Storage.set(cacheKey, data, 600); // Cache for 10 minutes
            }
            return data;
        } catch (error) {
            console.error('Error getting tax deductions:', error);
            return null;
        }
    },

    /**
     * Get depreciation schedule
     */
    getDepreciationSchedule: async (propertyId, method = 'MACRS') => {
        const cacheKey = `depreciation_${propertyId}_${method}`;
        const cached = Storage.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.call('getDepreciationSchedule', { propertyId, method });
            const data = response?.data || [];
            if (data) {
                Storage.set(cacheKey, data, 600);
            }
            return data;
        } catch (error) {
            console.error('Error getting depreciation schedule:', error);
            return [];
        }
    },

    /**
     * Get cost segregation analysis
     */
    getCostSegregation: async (propertyId) => {
        const cacheKey = `cost_segregation_${propertyId}`;
        const cached = Storage.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.call('getCostSegregation', { propertyId });
            const data = response?.data || null;
            if (data) {
                Storage.set(cacheKey, data, 600);
            }
            return data;
        } catch (error) {
            console.error('Error getting cost segregation:', error);
            return null;
        }
    },

    /**
     * Save tax preferences
     */
    saveTaxPreferences: async (preferences) => {
        try {
            const response = await API.call('saveTaxPreferences', preferences);
            // Invalidate all tax-related caches
            Storage.remove('tax_deductions');
            Storage.remove('depreciation_schedule');
            return response?.success || false;
        } catch (error) {
            console.error('Error saving tax preferences:', error);
            throw error;
        }
    },

    /**
     * Get tax report (compiled from multiple sources)
     */
    getTaxReport: async (taxYear) => {
        const cacheKey = `tax_report_${taxYear}`;
        const cached = Storage.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.call('getTaxReport', { taxYear });
            const data = response?.data || null;
            if (data) {
                Storage.set(cacheKey, data, 600);
            }
            return data;
        } catch (error) {
            console.error('Error getting tax report:', error);
            return null;
        }
    },

    // ==================== AUTOMATION ====================

    /**
     * Get all automations
     */
    getAutomations: async () => {
        const cacheKey = 'automations';
        const cached = Storage.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.call('getAutomations');
            const data = response?.data || [];
            if (data) {
                Storage.set(cacheKey, data, 300); // Cache for 5 minutes
            }
            return data;
        } catch (error) {
            console.error('Error getting automations:', error);
            return [];
        }
    },

    /**
     * Save new automation rule
     */
    saveAutomation: async (automationData) => {
        try {
            const response = await API.call('saveAutomation', automationData);
            if (response && response.success) {
                Storage.remove('automations'); // Invalidate cache
                return response.data;
            }
            throw new Error(response?.error || 'Failed to save automation');
        } catch (error) {
            console.error('Error saving automation:', error);
            throw error;
        }
    },

    /**
     * Update existing automation rule
     */
    updateAutomation: async (automationId, automationData) => {
        try {
            const response = await API.call('updateAutomation', { id: automationId, ...automationData });
            if (response && response.success) {
                Storage.remove('automations'); // Invalidate cache
                return response.data;
            }
            throw new Error(response?.error || 'Failed to update automation');
        } catch (error) {
            console.error('Error updating automation:', error);
            throw error;
        }
    },

    /**
     * Delete automation rule
     */
    deleteAutomation: async (automationId) => {
        try {
            const response = await API.call('deleteAutomation', { id: automationId });
            if (response && response.success) {
                Storage.remove('automations'); // Invalidate cache
                return true;
            }
            throw new Error(response?.error || 'Failed to delete automation');
        } catch (error) {
            console.error('Error deleting automation:', error);
            throw error;
        }
    },

    /**
     * Get automation execution history
     */
    getAutomationHistory: async () => {
        const cacheKey = 'automation_history';
        const cached = Storage.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.call('getAutomationHistory');
            const data = response?.data || [];
            if (data) {
                Storage.set(cacheKey, data, 300);
            }
            return data;
        } catch (error) {
            console.error('Error getting automation history:', error);
            return [];
        }
    },

    /**
     * Trigger manual automation run
     */
    runAutomationNow: async (automationId) => {
        try {
            const response = await API.call('runAutomationNow', { id: automationId });
            if (response && response.success) {
                Storage.remove('automation_history'); // Invalidate cache
                return response.data;
            }
            throw new Error(response?.error || 'Failed to run automation');
        } catch (error) {
            console.error('Error running automation:', error);
            throw error;
        }
    },

    // ==================== FINANCIAL ANALYTICS ====================

    /**
     * Get all scenarios
     */
    getScenarios: async () => {
        const cacheKey = 'scenarios';
        const cached = Storage.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.call('getScenarios');
            const data = response?.data || [];
            if (data) {
                Storage.set(cacheKey, data, 300); // Cache for 5 minutes
            }
            return data;
        } catch (error) {
            console.error('Error getting scenarios:', error);
            return [];
        }
    },

    /**
     * Save new scenario
     */
    saveScenario: async (scenarioData) => {
        try {
            const response = await API.call('saveScenario', scenarioData);
            if (response && response.success) {
                Storage.remove('scenarios'); // Invalidate cache
                return response.data;
            }
            throw new Error(response?.error || 'Failed to save scenario');
        } catch (error) {
            console.error('Error saving scenario:', error);
            throw error;
        }
    },

    /**
     * Get KPI settings
     */
    getKPISettings: async () => {
        const cacheKey = 'kpi_settings';
        const cached = Storage.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.call('getKPISettings');
            const data = response?.data || [];
            if (data) {
                Storage.set(cacheKey, data, 600); // Cache for 10 minutes
            }
            return data;
        } catch (error) {
            console.error('Error getting KPI settings:', error);
            return [];
        }
    },

    /**
     * Update KPI setting
     */
    updateKPISetting: async (kpiId, setting) => {
        try {
            const response = await API.call('updateKPISetting', { id: kpiId, ...setting });
            if (response && response.success) {
                Storage.remove('kpi_settings'); // Invalidate cache
                return response.data;
            }
            throw new Error(response?.error || 'Failed to update KPI');
        } catch (error) {
            console.error('Error updating KPI:', error);
            throw error;
        }
    },

    /**
     * Get benchmark data
     */
    getBenchmarkData: async () => {
        const cacheKey = 'benchmark_data';
        const cached = Storage.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.call('getBenchmarkData');
            const data = response?.data || {};
            if (data) {
                Storage.set(cacheKey, data, 600); // Cache for 10 minutes
            }
            return data;
        } catch (error) {
            console.error('Error getting benchmark data:', error);
            return {};
        }
    },

    /**
     * Get debt paydown analysis
     */
    getDebtPaydownAnalysis: async (mortgageIds) => {
        try {
            const response = await API.call('getDebtPaydownAnalysis', { mortgageIds });
            return response?.data || null;
        } catch (error) {
            console.error('Error getting debt paydown analysis:', error);
            return null;
        }
    },

    /**
     * Save debt analysis
     */
    saveDebtAnalysis: async (analysisData) => {
        try {
            const response = await API.call('saveDebtAnalysis', analysisData);
            if (response && response.success) {
                return response.data;
            }
            throw new Error(response?.error || 'Failed to save debt analysis');
        } catch (error) {
            console.error('Error saving debt analysis:', error);
            throw error;
        }
    }
};

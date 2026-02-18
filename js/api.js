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

        // Show selected view
        const view = document.getElementById(`${viewName}-view`);
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
            'rent_payments': 'Rent Payments'
        };
        document.getElementById('page-title').textContent = titles[viewName] || 'Dashboard';

        // Update button visibility
        const addBtn = document.getElementById('add-item-btn');
        if (viewName === 'properties') {
            addBtn.textContent = '+ New Property';
            addBtn.dataset.action = 'add-property';
        } else if (viewName === 'mortgages') {
            addBtn.textContent = '+ New Mortgage';
            addBtn.dataset.action = 'add-mortgage';
        } else if (viewName === 'expenses') {
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
    }
};

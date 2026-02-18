// Dashboard module

const Dashboard = {
    /**
     * Initialize dashboard
     */
    init: async () => {
        await Dashboard.loadMetrics();
        await Dashboard.loadPropertiesSummary();
        Dashboard.setupEventListeners();
    },

    /**
     * Load and display portfolio metrics
     */
    loadMetrics: async () => {
        try {
            const metrics = await API.getPortfolioMetrics();

            document.getElementById('total-value').textContent = Formatting.currency(metrics.totalValue || 0);
            document.getElementById('total-debt').textContent = Formatting.currency(metrics.totalDebt || 0);
            document.getElementById('total-equity').textContent = Formatting.currency(metrics.totalEquity || 0);
            document.getElementById('monthly-income').textContent = Formatting.currency(metrics.monthlyIncome || 0);
        } catch (error) {
            console.error('Error loading metrics:', error);
            UI.showToast('Error loading metrics', 'error');
        }
    },

    /**
     * Load and display properties summary
     */
    loadPropertiesSummary: async () => {
        try {
            const properties = await API.getProperties();
            const mortgages = await API.getMortgages();
            const expenses = await API.getExpenses();

            const summaryContainer = document.getElementById('properties-summary');

            if (!properties || properties.length === 0) {
                summaryContainer.innerHTML = '<p class="loading">No properties added yet. Start by adding your first property!</p>';
                return;
            }

            // Create property cards
            const html = properties.map(prop => {
                // Find associated mortgage
                const mortgage = mortgages?.find(m => String(m.property_id) === String(prop.id));
                const equity = (prop.current_value || 0) - (mortgage?.current_balance || 0);

                // Calculate property expenses this month (simplified - you'd want real data)
                const propExpenses = expenses?.filter(e => String(e.property_id) === String(prop.id)) || [];
                const totalExpenses = propExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

                return `
                    <div class="property-card" data-id="${prop.id}">
                        <div class="property-card-header">${prop.address}</div>
                        <div class="property-card-detail">${prop.city}, ${prop.state}</div>
                        <div class="property-card-detail">Value: ${Formatting.currency(prop.current_value)}</div>
                        <div class="property-card-detail">Equity: ${Formatting.currency(equity)}</div>
                        ${mortgage ? `
                            <div class="property-card-detail">Debt: ${Formatting.currency(mortgage.current_balance)}</div>
                            <div class="property-card-detail">Payment: ${Formatting.currency(mortgage.monthly_payment)}/mo</div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            summaryContainer.innerHTML = html;
        } catch (error) {
            console.error('Error loading properties summary:', error);
            UI.showToast('Error loading properties', 'error');
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: () => {
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                Dashboard.handleAction(action);
            });
        });
    },

    /**
     * Handle action buttons
     */
    handleAction: async (action) => {
        switch (action) {
            case 'add-property':
                UI.modal.show('property-modal');
                document.getElementById('property-form').reset();
                break;
            case 'add-mortgage':
                UI.modal.show('mortgage-modal');
                document.getElementById('mortgage-form').reset();
                break;
            case 'add-expense':
                UI.showToast('Expenses module coming soon', 'info');
                break;
            case 'refresh':
                Storage.remove('properties');
                Storage.remove('mortgages');
                Storage.remove('expenses');
                Storage.remove('portfolio_metrics');
                await Dashboard.loadMetrics();
                await Dashboard.loadPropertiesSummary();
                UI.showToast('Data refreshed', 'success');
                break;
        }
    }
};

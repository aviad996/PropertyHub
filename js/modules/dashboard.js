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
     * Load and display portfolio metrics (both rows)
     */
    loadMetrics: async () => {
        try {
            const metrics = await API.getPortfolioMetrics();

            // Row 1: Core portfolio metrics
            document.getElementById('total-value').textContent = Formatting.currency(metrics.totalValue || 0);
            document.getElementById('total-debt').textContent = Formatting.currency(metrics.totalDebt || 0);
            document.getElementById('total-equity').textContent = Formatting.currency(metrics.totalEquity || 0);
            document.getElementById('monthly-income').textContent = Formatting.currency(metrics.monthlyIncome || 0);

            // Row 2: Financial metrics - fetch additional data
            const [tenants, mortgages, expenses, insurance] = await Promise.all([
                API.getTenants().catch(() => []),
                API.getMortgages().catch(() => []),
                API.getExpenses().catch(() => []),
                API.getInsurance().catch(() => [])
            ]);

            // Monthly Rent: sum of monthly_rent from active tenants
            const activeTenants = (tenants || []).filter(t => t.status === 'active');
            const monthlyRent = activeTenants.reduce((sum, t) => sum + (parseFloat(t.monthly_rent) || 0), 0);

            // Monthly Mortgages: sum of monthly_payment + escrow_payment from all mortgages
            const monthlyMortgages = (mortgages || []).reduce((sum, m) => sum + (parseFloat(m.monthly_payment) || 0) + (parseFloat(m.escrow_payment) || 0), 0);

            // Monthly Expenses: taxes + insurance + HOA (annualized / 12)
            const expensesByCategory = {};
            (expenses || []).forEach(e => {
                const cat = (e.category || '').toLowerCase();
                if (!expensesByCategory[cat]) expensesByCategory[cat] = 0;
                expensesByCategory[cat] += parseFloat(e.amount) || 0;
            });

            const annualTaxes = expensesByCategory['taxes'] || expensesByCategory['tax'] || 0;
            const annualHOA = expensesByCategory['hoa'] || 0;

            // Insurance: use max of expense-based vs policy-based to avoid double counting
            const expenseInsurance = expensesByCategory['insurance'] || 0;
            const policyInsurance = (insurance || []).reduce((sum, i) => sum + (parseFloat(i.annual_premium) || 0), 0);
            const annualInsurance = Math.max(expenseInsurance, policyInsurance);

            const monthlyExpenses = (annualTaxes + annualInsurance + annualHOA) / 12;

            // Cash Flow: rent - mortgages - expenses
            const cashFlow = monthlyRent - monthlyMortgages - monthlyExpenses;

            // Update Row 2 DOM
            document.getElementById('monthly-rent').textContent = Formatting.currency(monthlyRent);
            document.getElementById('monthly-mortgages').textContent = Formatting.currency(monthlyMortgages);
            document.getElementById('monthly-expenses').textContent = Formatting.currency(monthlyExpenses);

            const cashFlowEl = document.getElementById('monthly-cash-flow');
            cashFlowEl.textContent = Formatting.currency(cashFlow);
            cashFlowEl.className = 'metric-value ' + (cashFlow >= 0 ? 'cash-flow-positive' : 'cash-flow-negative');

        } catch (error) {
            console.error('Error loading metrics:', error);
            UI.showToast('Error loading metrics', 'error');
        }
    },

    /**
     * Load and display properties summary with cash flow per property
     */
    loadPropertiesSummary: async () => {
        try {
            const properties = await API.getProperties();
            const mortgages = await API.getMortgages();
            const expenses = await API.getExpenses();
            const tenants = await API.getTenants().catch(() => []);

            const summaryContainer = document.getElementById('properties-summary');

            if (!properties || properties.length === 0) {
                summaryContainer.innerHTML = '<p class="loading">No properties added yet. Start by adding your first property!</p>';
                return;
            }

            // Create property cards with enhanced financial data
            const html = properties.map(prop => {
                // Find associated mortgage
                const mortgage = mortgages?.find(m => String(m.property_id) === String(prop.id));
                const equity = (prop.current_value || 0) - (mortgage?.current_balance || 0);

                // Active tenants for this property
                const propTenants = (tenants || []).filter(t =>
                    String(t.property_id) === String(prop.id) && t.status === 'active'
                );
                const propRent = propTenants.reduce((sum, t) => sum + (parseFloat(t.monthly_rent) || 0), 0);
                const occupancy = propTenants.length > 0 ? 'Occupied' : 'Vacant';
                const occupancyClass = propTenants.length > 0 ? 'occupied' : 'vacant';

                // Property expenses (annualized / 12)
                const propExpenses = (expenses || []).filter(e => String(e.property_id) === String(prop.id));
                const annualExpenses = propExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                const monthlyExpenses = annualExpenses / 12;

                // Property mortgage payment (P&I + Escrow)
                const mortgagePI = parseFloat(mortgage?.monthly_payment) || 0;
                const mortgageEscrow = parseFloat(mortgage?.escrow_payment) || 0;
                const mortgageTotal = mortgagePI + mortgageEscrow;

                // Per-property cash flow
                const propCashFlow = propRent - mortgageTotal - monthlyExpenses;
                const cashFlowClass = propCashFlow >= 0 ? 'cash-flow-positive' : 'cash-flow-negative';

                return `
                    <div class="property-card" data-id="${prop.id}">
                        <div class="property-card-header">${prop.address}</div>
                        <div class="property-card-detail">${prop.city}, ${prop.state}</div>
                        <div class="property-card-detail">Value: ${Formatting.currency(prop.current_value)}</div>
                        <div class="property-card-detail">Equity: ${Formatting.currency(equity)}</div>
                        ${mortgage ? `
                            <div class="property-card-detail">Debt: ${Formatting.currency(mortgage.current_balance)}</div>
                            <div class="property-card-detail">Payment: ${Formatting.currency(mortgageTotal)}/mo${mortgageEscrow > 0 ? ` <span style="font-size:11px;color:var(--text-secondary)">(P&I ${Formatting.currency(mortgagePI)} + Escrow ${Formatting.currency(mortgageEscrow)})</span>` : ''}</div>
                        ` : ''}
                        <div class="property-card-detail">Rent: ${propRent > 0 ? Formatting.currency(propRent) + '/mo' : 'N/A'}</div>
                        <div class="property-card-detail">Status: <span class="${occupancyClass}">${occupancy}</span></div>
                        <div class="property-card-detail cash-flow-label">
                            Cash Flow: <span class="${cashFlowClass}">${Formatting.currency(propCashFlow)}/mo</span>
                        </div>
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
                // Switch to properties view first (modal is inside that view)
                UI.switchView('properties');
                App.loadViewData('properties');
                setTimeout(() => {
                    Properties.currentEditId = null;
                    document.getElementById('property-form').reset();
                    // Reset conditional sections
                    const unitsGroup = document.getElementById('units-group');
                    if (unitsGroup) unitsGroup.style.display = 'none';
                    const mortgageSection = document.getElementById('mortgage-section');
                    if (mortgageSection) mortgageSection.style.display = 'none';
                    const hasMortgage = document.getElementById('has-mortgage');
                    if (hasMortgage) hasMortgage.checked = false;
                    document.querySelector('#property-modal .modal-header h3').textContent = 'Add Property';
                    UI.modal.show('property-modal');
                }, 100);
                break;
            case 'add-mortgage':
                // Switch to mortgages view first (modal is inside that view)
                UI.switchView('mortgages');
                App.loadViewData('mortgages');
                setTimeout(() => {
                    Mortgages.currentEditId = null;
                    document.getElementById('mortgage-form').reset();
                    document.querySelector('#mortgage-modal .modal-header h3').textContent = 'Add Mortgage';
                    UI.modal.show('mortgage-modal');
                }, 100);
                break;
            case 'add-expense':
                // Switch to expenses view first (modal is inside that view)
                UI.switchView('expenses');
                App.loadViewData('expenses');
                setTimeout(() => {
                    UI.modal.show('expense-modal');
                    document.getElementById('expense-form').reset();
                }, 100);
                break;
            case 'refresh':
                Storage.remove('properties');
                Storage.remove('mortgages');
                Storage.remove('expenses');
                Storage.remove('portfolio_metrics');
                Storage.remove('tenants');
                Storage.remove('insurance');
                await Dashboard.loadMetrics();
                await Dashboard.loadPropertiesSummary();
                UI.showToast('Data refreshed', 'success');
                break;
        }
    }
};

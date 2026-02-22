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

            // Row 1: Core portfolio metrics
            document.getElementById('total-value').textContent = Formatting.currency(metrics.totalValue || 0);
            document.getElementById('total-debt').textContent = Formatting.currency(metrics.totalDebt || 0);
            document.getElementById('total-equity').textContent = Formatting.currency(metrics.totalEquity || 0);

            // Fetch additional data
            const [tenants, mortgages, properties] = await Promise.all([
                API.getTenants().catch(() => []),
                API.getMortgages().catch(() => []),
                API.getProperties().catch(() => [])
            ]);

            // Monthly Rent: sum of monthly_rent from active tenants
            const activeTenants = (tenants || []).filter(t => t.status === 'active');
            const monthlyRent = activeTenants.reduce((sum, t) => sum + (parseFloat(t.monthly_rent) || 0), 0);

            // Monthly Mortgages: P&I + Escrow for all mortgages
            const monthlyMortgages = (mortgages || []).reduce((sum, m) => sum + (parseFloat(m.monthly_payment) || 0) + (parseFloat(m.escrow_payment) || 0), 0);

            // Cash Flow: rent - total mortgage payments (which already include escrow for taxes & insurance)
            const cashFlow = monthlyRent - monthlyMortgages;

            // Total Cash Invested: sum of (purchase_price - loan_amount + closing_costs) per property
            let totalCashInvested = 0;
            (properties || []).forEach(prop => {
                const mortgage = (mortgages || []).find(m => String(m.property_id) === String(prop.id));
                const loanAmount = parseFloat(mortgage?.original_balance || mortgage?.loan_amount) || 0;
                const purchasePrice = parseFloat(prop.purchase_price) || 0;
                const downPayment = purchasePrice - loanAmount;
                totalCashInvested += downPayment > 0 ? downPayment : 0;
            });

            // Portfolio Cap Rate: Annual NOI / Total Purchase Price
            const totalPurchasePrice = (properties || []).reduce((sum, p) => sum + (parseFloat(p.purchase_price) || 0), 0);
            const annualRent = monthlyRent * 12;
            // NOI = Rent - Operating Expenses (mortgage payments are NOT operating expenses)
            // For simplicity, use Rent - Escrow (taxes+insurance) as NOI proxy
            const totalEscrow = (mortgages || []).reduce((sum, m) => sum + (parseFloat(m.escrow_payment) || 0), 0);
            const annualNOI = annualRent - (totalEscrow * 12);
            const capRate = totalPurchasePrice > 0 ? (annualNOI / totalPurchasePrice) * 100 : 0;

            // Update Row 1 - replace Monthly Income with Total Cash Invested
            document.getElementById('monthly-income').textContent = Formatting.currency(totalCashInvested);

            // Update Row 2
            document.getElementById('monthly-rent').textContent = Formatting.currency(monthlyRent);
            document.getElementById('monthly-mortgages').textContent = Formatting.currency(monthlyMortgages);
            document.getElementById('monthly-expenses').textContent = capRate.toFixed(1) + '%';

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
                const units = parseInt(prop.units) || 1;
                const occupiedUnits = propTenants.length;
                const occupancyText = units > 1 ? `${occupiedUnits}/${units} units` : (occupiedUnits > 0 ? 'Occupied' : 'Vacant');
                const occupancyClass = occupiedUnits > 0 ? 'occupied' : 'vacant';

                // Property mortgage payment (P&I + Escrow)
                const mortgagePI = parseFloat(mortgage?.monthly_payment) || 0;
                const mortgageEscrow = parseFloat(mortgage?.escrow_payment) || 0;
                const mortgageTotal = mortgagePI + mortgageEscrow;

                // Cash to Close: down payment + closing expenses
                const purchasePrice = parseFloat(prop.purchase_price) || 0;
                const loanAmount = parseFloat(mortgage?.original_balance || mortgage?.loan_amount) || 0;
                const downPayment = purchasePrice - loanAmount;
                const propExpenses = (expenses || []).filter(e => String(e.property_id) === String(prop.id));
                const closingCosts = propExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                const cashToClose = downPayment + closingCosts;

                // Per-property cash flow: Rent - Total Mortgage (P&I + Escrow)
                const propCashFlow = propRent - mortgageTotal;
                const cashFlowClass = propCashFlow >= 0 ? 'cash-flow-positive' : 'cash-flow-negative';

                // Cash-on-Cash Return: (Annual Cash Flow / Cash Invested) * 100
                const annualCashFlow = propCashFlow * 12;
                const cocReturn = cashToClose > 0 ? (annualCashFlow / cashToClose) * 100 : 0;

                // Cap Rate: Annual NOI / Purchase Price
                const annualRent = propRent * 12;
                const annualEscrow = mortgageEscrow * 12; // taxes + insurance proxy
                const noi = annualRent - annualEscrow;
                const propCapRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;

                return `
                    <div class="property-card" data-id="${prop.id}">
                        <div class="property-card-header">${prop.address}${prop.property_type === 'Multi-Family' ? ` <span style="font-size:11px;background:rgba(59,130,246,0.2);padding:2px 6px;border-radius:4px;color:#60a5fa">${units} units</span>` : ''}</div>
                        <div class="property-card-detail">${prop.city}, ${prop.state}</div>
                        <div class="property-card-detail">Value: ${Formatting.currency(prop.current_value)} · Equity: ${Formatting.currency(equity)}</div>
                        ${mortgage ? `
                            <div class="property-card-detail">Debt: ${Formatting.currency(mortgage.current_balance)}</div>
                            <div class="property-card-detail">Payment: ${Formatting.currency(mortgageTotal)}/mo${mortgageEscrow > 0 ? ` <span style="font-size:11px;color:var(--text-secondary)">(P&I ${Formatting.currency(mortgagePI)} + Esc ${Formatting.currency(mortgageEscrow)})</span>` : ''}</div>
                        ` : ''}
                        <div class="property-card-detail">Rent: ${propRent > 0 ? Formatting.currency(propRent) + '/mo' : 'N/A'} · <span class="${occupancyClass}">${occupancyText}</span></div>
                        <div class="property-card-detail" style="font-size:12px;color:var(--text-secondary)">Cash to Close: ${Formatting.currency(cashToClose)}</div>
                        <div class="property-card-detail" style="font-size:12px;color:var(--text-secondary)">Cap Rate: ${propCapRate > 0 ? propCapRate.toFixed(1) + '%' : 'N/A'} · CoC: ${cocReturn !== 0 ? cocReturn.toFixed(1) + '%' : 'N/A'}</div>
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

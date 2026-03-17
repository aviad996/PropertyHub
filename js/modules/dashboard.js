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
            // Fetch all data first
            const [tenants, mortgages, properties] = await Promise.all([
                API.getTenants().catch(() => []),
                API.getMortgages().catch(() => []),
                API.getProperties().catch(() => [])
            ]);

            // Row 1: Core portfolio metrics (calculated from data)
            const totalValue = (properties || []).reduce((sum, p) => sum + (parseFloat(p.current_value) || 0), 0);
            const totalDebt = (mortgages || []).reduce((sum, m) => sum + (parseFloat(m.current_balance) || 0), 0);
            const totalEquity = totalValue - totalDebt;

            document.getElementById('total-value').textContent = Formatting.currency(totalValue);
            document.getElementById('total-debt').textContent = Formatting.currency(totalDebt);
            document.getElementById('total-equity').textContent = Formatting.currency(totalEquity);

            // Monthly Rent: sum of monthly_rent from active tenants
            const activeTenants = (tenants || []).filter(t => t.status === 'active');
            const monthlyRent = activeTenants.reduce((sum, t) => sum + (parseFloat(t.monthly_rent) || 0), 0);

            // Monthly Mortgages: P&I + Escrow for all mortgages
            const monthlyMortgages = (mortgages || []).reduce((sum, m) => sum + (parseFloat(m.monthly_payment) || 0) + (parseFloat(m.escrow_payment) || 0), 0);

            // Cash Flow: rent - total mortgage payments (which already include escrow for taxes & insurance)
            const cashFlow = monthlyRent - monthlyMortgages;

            // Total Cash Invested: Purchase + Closing + Rehab + Holding - Loan per property
            let totalCashInvested = 0;
            (properties || []).forEach(prop => {
                const mortgage = (mortgages || []).find(m => String(m.property_id) === String(prop.id));
                const loanAmount = parseFloat(mortgage?.original_balance || mortgage?.loan_amount) || 0;
                const purchasePrice = parseFloat(prop.purchase_price) || 0;
                const closingCosts = parseFloat(prop.closing_costs) || 0;
                const rehabCosts = parseFloat(prop.rehab_costs) || 0;
                const holdingCosts = parseFloat(prop.holding_costs) || 0;
                const cashInvested = purchasePrice + closingCosts + rehabCosts + holdingCosts - loanAmount;
                totalCashInvested += cashInvested > 0 ? cashInvested : 0;
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
                summaryContainer.innerHTML = '<p class="loading empty-state">No properties added yet. Start by adding your first property!</p>';
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

                // Cash Invested: Purchase + Closing + Rehab + Holding - Loan
                const purchasePrice = parseFloat(prop.purchase_price) || 0;
                const loanAmount = parseFloat(mortgage?.original_balance || mortgage?.loan_amount) || 0;
                const closingCosts = parseFloat(prop.closing_costs) || 0;
                const rehabCosts = parseFloat(prop.rehab_costs) || 0;
                const holdingCosts = parseFloat(prop.holding_costs) || 0;
                const cashToClose = purchasePrice + closingCosts + rehabCosts + holdingCosts - loanAmount;

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
                    <div class="dash-property-card" data-id="${prop.id}">
                        <div class="dash-card-header">
                            <div class="dash-card-address">${prop.address}</div>
                            <div class="dash-card-location">${prop.city}, ${prop.state}</div>
                            <div class="dash-card-badges">
                                ${prop.property_type ? `<span class="dash-card-badge">${prop.property_type}</span>` : ''}
                                <span class="dash-card-badge ${occupancyClass}">${occupancyText}</span>
                            </div>
                        </div>
                        <div class="dash-card-divider"></div>
                        <div class="dash-card-grid">
                            <div class="dash-card-stat">
                                <div class="dash-card-stat-label">Value</div>
                                <div class="dash-card-stat-value">${Formatting.currency(prop.current_value)}</div>
                            </div>
                            <div class="dash-card-stat">
                                <div class="dash-card-stat-label">Equity</div>
                                <div class="dash-card-stat-value">${Formatting.currency(equity)}</div>
                            </div>
                            <div class="dash-card-stat">
                                <div class="dash-card-stat-label">Debt</div>
                                <div class="dash-card-stat-value">${mortgage ? Formatting.currency(mortgage.current_balance) : 'N/A'}</div>
                            </div>
                            <div class="dash-card-stat">
                                <div class="dash-card-stat-label">Payment</div>
                                <div class="dash-card-stat-value">${mortgageTotal > 0 ? Formatting.currency(mortgageTotal) + '/mo' : 'N/A'}</div>
                            </div>
                            <div class="dash-card-stat">
                                <div class="dash-card-stat-label">Rent</div>
                                <div class="dash-card-stat-value">${propRent > 0 ? Formatting.currency(propRent) + '/mo' : 'N/A'}</div>
                            </div>
                            <div class="dash-card-stat">
                                <div class="dash-card-stat-label">Cash Invested</div>
                                <div class="dash-card-stat-value">${Formatting.currency(cashToClose)}</div>
                            </div>
                        </div>
                        <div class="dash-card-divider"></div>
                        <div class="dash-card-cashflow">
                            <div class="dash-card-cashflow-label">Cash Flow</div>
                            <div class="dash-card-cashflow-value ${propCashFlow >= 0 ? 'positive' : 'negative'}">${Formatting.currency(propCashFlow)}/mo</div>
                            <div class="dash-card-returns">
                                <span class="dash-card-return">Cap Rate: ${propCapRate > 0 ? propCapRate.toFixed(1) + '%' : 'N/A'}</span>
                                <span class="dash-card-return">CoC: ${cocReturn !== 0 ? cocReturn.toFixed(1) + '%' : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            summaryContainer.innerHTML = '<div class="properties-summary-grid">' + html + '</div>';
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

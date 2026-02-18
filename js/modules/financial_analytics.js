// Financial Analytics & Business Intelligence Module

const FinancialAnalytics = {
    scenarios: [],
    kpiSettings: [],
    benchmarkData: {},
    debtAnalysis: {},

    /**
     * Initialize Financial Analytics module
     */
    init: async () => {
        try {
            console.log('Financial Analytics initializing...');
            await FinancialAnalytics.loadScenarios();
            await FinancialAnalytics.loadKPISettings();
            await FinancialAnalytics.loadBenchmarkData();
            console.log('Financial Analytics initialized successfully');
        } catch (error) {
            console.error('Error initializing Financial Analytics:', error);
        }
    },

    /**
     * Load financial scenarios from API
     */
    loadScenarios: async () => {
        try {
            const scenarios = await API.getScenarios();
            FinancialAnalytics.scenarios = scenarios || [];
        } catch (error) {
            console.error('Error loading scenarios:', error);
            FinancialAnalytics.scenarios = [];
        }
    },

    /**
     * Load KPI settings
     */
    loadKPISettings: async () => {
        try {
            const settings = await API.getKPISettings();
            FinancialAnalytics.kpiSettings = settings || [];
        } catch (error) {
            console.error('Error loading KPI settings:', error);
            FinancialAnalytics.kpiSettings = [];
        }
    },

    /**
     * Load benchmark data
     */
    loadBenchmarkData: async () => {
        try {
            const data = await API.getBenchmarkData();
            FinancialAnalytics.benchmarkData = data || {};
        } catch (error) {
            console.error('Error loading benchmark data:', error);
            FinancialAnalytics.benchmarkData = {};
        }
    },

    /**
     * Load financial analytics dashboard
     */
    loadFinancialAnalytics: async () => {
        try {
            const container = document.getElementById('financial_analytics-content');
            if (!container) return;

            container.innerHTML = '<div class="loading">Loading financial analytics...</div>';

            // Get all necessary data
            const properties = await API.getProperties();
            const mortgages = await API.getMortgages();
            const expenses = await API.getExpenses();
            const tenants = await API.getTenants();
            const rentPayments = await API.getRentPayments();

            // Calculate key metrics
            const portfolioMetrics = await FinancialAnalytics.calculatePortfolioMetrics(
                properties, mortgages, expenses, tenants, rentPayments
            );

            // Get KPI alerts
            const alerts = FinancialAnalytics.checkKPIThresholds(properties, mortgages, expenses);

            // Render dashboard
            FinancialAnalytics.renderDashboard(container, portfolioMetrics, alerts, properties);

        } catch (error) {
            console.error('Error loading financial analytics:', error);
            UI.showToast('Error loading financial analytics', 'error');
        }
    },

    /**
     * Calculate comprehensive portfolio metrics
     */
    calculatePortfolioMetrics: async (properties, mortgages, expenses, tenants, rentPayments) => {
        try {
            let totalValue = 0;
            let totalDebt = 0;
            let totalAnnualIncome = 0;
            let totalAnnualExpenses = 0;
            let portfolioIRRs = [];
            let portfolioCapRates = [];
            let cashOnCashReturns = [];

            const propertyMetrics = properties.map(property => {
                // Basic metrics
                const currentValue = parseFloat(property.current_value) || 0;
                const purchasePrice = parseFloat(property.purchase_price) || 0;
                const purchaseDate = new Date(property.purchase_date);
                const yearsOwned = (new Date() - purchaseDate) / (1000 * 60 * 60 * 24 * 365.25);

                // Debt for this property
                const propertyMortgages = mortgages.filter(m => m.property_id === property.id);
                const totalMortgageBalance = propertyMortgages.reduce(
                    (sum, m) => sum + (parseFloat(m.current_balance) || 0), 0
                );
                const equity = currentValue - totalMortgageBalance;
                const ltv = currentValue > 0 ? totalMortgageBalance / currentValue : 0;

                // Income for this property
                const propertyTenants = tenants.filter(t => t.property_id === property.id && t.status === 'active');
                const monthlyRent = propertyTenants.reduce(
                    (sum, t) => sum + (parseFloat(t.monthly_rent) || 0), 0
                );
                const annualIncome = monthlyRent * 12;

                // Expenses for this property
                const propertyExpenses = expenses.filter(e => e.property_id === property.id);
                const annualExpenses = propertyExpenses.reduce(
                    (sum, e) => sum + (parseFloat(e.amount) || 0), 0
                );

                // Mortgage payments
                const monthlyMortgagePayment = propertyMortgages.reduce(
                    (sum, m) => sum + (parseFloat(m.monthly_payment) || 0), 0
                );
                const annualMortgagePayment = monthlyMortgagePayment * 12;

                // NOI (Net Operating Income)
                const annualNOI = annualIncome - annualExpenses;

                // Cap Rate: Annual NOI / Purchase Price
                const capRate = purchasePrice > 0 ? annualNOI / purchasePrice : 0;

                // Cash Flow: NOI - Mortgage Payment
                const annualCashFlow = annualNOI - annualMortgagePayment;
                const monthlyNOI = annualNOI / 12;
                const monthlyCashFlow = monthlyNOI - monthlyMortgagePayment;

                // Cash-on-Cash Return: Annual Cash Flow / Cash Invested
                const cashInvested = (purchasePrice * 0.20); // Assume 20% down
                const cashOnCash = cashInvested > 0 ? (annualCashFlow / cashInvested) : 0;

                // Appreciation
                const totalAppreciation = currentValue - purchasePrice;
                const annualAppreciation = yearsOwned > 0 ? totalAppreciation / yearsOwned : 0;
                const appreciationRate = yearsOwned > 0 ? Math.pow(currentValue / purchasePrice, 1 / yearsOwned) - 1 : 0;

                // IRR Calculation (simple: cash flows + terminal value)
                const cashFlows = [];
                cashFlows.push(-cashInvested); // Initial investment
                for (let i = 1; i <= Math.min(yearsOwned, 30); i++) {
                    cashFlows.push(annualCashFlow);
                }
                // Terminal value at end
                if (cashFlows.length > 1) {
                    cashFlows[cashFlows.length - 1] += currentValue;
                }
                const irr = Calculations.calculateIRR(cashFlows);

                totalValue += currentValue;
                totalDebt += totalMortgageBalance;
                totalAnnualIncome += annualIncome;
                totalAnnualExpenses += annualExpenses;
                portfolioIRRs.push(irr);
                portfolioCapRates.push(capRate);
                cashOnCashReturns.push(cashOnCash);

                return {
                    id: property.id,
                    address: property.address,
                    currentValue,
                    equity,
                    ltv,
                    monthlyRent,
                    annualIncome,
                    annualExpenses,
                    annualNOI,
                    annualCashFlow,
                    monthlyCashFlow,
                    capRate,
                    cashOnCash,
                    irr,
                    annualAppreciation,
                    appreciationRate,
                    monthlyMortgagePayment,
                    totalMortgageBalance,
                    status: 'active'
                };
            });

            const totalEquity = totalValue - totalDebt;
            const portfolioLTV = totalValue > 0 ? totalDebt / totalValue : 0;
            const annualNOI = totalAnnualIncome - totalAnnualExpenses;
            const portfolioCapRate = totalValue > 0 ? annualNOI / (propertyMetrics.reduce((sum, p) => sum + parseFloat(p.currentValue || 0), 0)) : 0;
            const averageCashOnCash = cashOnCashReturns.length > 0
                ? cashOnCashReturns.reduce((a, b) => a + b, 0) / cashOnCashReturns.length
                : 0;

            return {
                totalValue,
                totalDebt,
                totalEquity,
                portfolioLTV,
                totalAnnualIncome,
                totalAnnualExpenses,
                annualNOI,
                monthlyNOI: annualNOI / 12,
                portfolioCapRate,
                averageCashOnCash,
                averageIRR: portfolioIRRs.length > 0
                    ? portfolioIRRs.reduce((a, b) => a + b, 0) / portfolioIRRs.length
                    : 0,
                propertyCount: propertyMetrics.length,
                propertyMetrics
            };
        } catch (error) {
            console.error('Error calculating portfolio metrics:', error);
            return {
                totalValue: 0,
                totalDebt: 0,
                totalEquity: 0,
                portfolioLTV: 0,
                propertyMetrics: []
            };
        }
    },

    /**
     * Check KPI thresholds and generate alerts
     */
    checkKPIThresholds: (properties, mortgages, expenses) => {
        const alerts = [];
        const defaultThresholds = [
            { id: 'negative-cf', name: 'Negative Cash Flow', operator: '<', value: 0, severity: 'warning' },
            { id: 'high-ltv', name: 'High LTV', operator: '>', value: 0.80, severity: 'warning' },
            { id: 'low-cap', name: 'Low Cap Rate', operator: '<', value: 0.05, severity: 'info' }
        ];

        properties.forEach(property => {
            const propertyMortgages = mortgages.filter(m => m.property_id === property.id);
            const propertyExpenses = expenses.filter(e => e.property_id === property.id);

            // Basic metrics for this property
            const currentValue = parseFloat(property.current_value) || 0;
            const totalDebt = propertyMortgages.reduce((sum, m) => sum + (parseFloat(m.current_balance) || 0), 0);
            const ltv = currentValue > 0 ? totalDebt / currentValue : 0;

            // Check each threshold
            defaultThresholds.forEach(threshold => {
                let triggered = false;
                let actualValue = 0;

                switch (threshold.id) {
                    case 'negative-cf':
                        // Monthly cash flow calculation
                        const monthlyRent = 1000; // Placeholder - should get from tenants
                        const monthlyExpenses = propertyExpenses.length > 0
                            ? propertyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) / 12
                            : 0;
                        const monthlyPayment = propertyMortgages.reduce((sum, m) => sum + (parseFloat(m.monthly_payment) || 0), 0);
                        actualValue = monthlyRent - monthlyExpenses - monthlyPayment;
                        triggered = actualValue < threshold.value;
                        break;

                    case 'high-ltv':
                        actualValue = ltv;
                        triggered = ltv > threshold.value;
                        break;

                    case 'low-cap':
                        const annualIncome = 12000; // Placeholder
                        const annualExpenses = propertyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                        const capRate = (annualIncome - annualExpenses) / (parseFloat(property.purchase_price) || 1);
                        actualValue = capRate;
                        triggered = capRate < threshold.value;
                        break;
                }

                if (triggered) {
                    alerts.push({
                        propertyId: property.id,
                        propertyAddress: property.address,
                        kpiId: threshold.id,
                        kpiName: threshold.name,
                        actualValue,
                        threshold: threshold.value,
                        severity: threshold.severity,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        });

        return alerts;
    },

    /**
     * Render financial analytics dashboard
     */
    renderDashboard: (container, metrics, alerts, properties) => {
        container.innerHTML = `
            <div class="financial-analytics-container">
                <div class="financial-header">
                    <h2>Financial Analytics Dashboard</h2>
                    <div class="analytics-controls">
                        <button class="btn-primary" onclick="FinancialAnalytics.showScenarioBuilder()">+ New Scenario</button>
                        <button class="btn-secondary" onclick="FinancialAnalytics.showDebtPaydownAnalysis()">📊 Debt Paydown</button>
                        <button class="btn-secondary" onclick="FinancialAnalytics.showBenchmarking()">📈 Benchmarking</button>
                    </div>
                </div>

                <!-- Key Metrics Section -->
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-label">Portfolio Value</div>
                        <div class="metric-value">${Formatting.currency(metrics.totalValue)}</div>
                        <div class="metric-detail">Total property value</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Total Equity</div>
                        <div class="metric-value">${Formatting.currency(metrics.totalEquity)}</div>
                        <div class="metric-detail">Portfolio net worth</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Average IRR</div>
                        <div class="metric-value">${Formatting.percentage(metrics.averageIRR)}</div>
                        <div class="metric-detail">Internal rate of return</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Portfolio LTV</div>
                        <div class="metric-value">${Formatting.percentage(metrics.portfolioLTV)}</div>
                        <div class="metric-detail">Loan-to-value ratio</div>
                    </div>
                </div>

                <!-- KPI Alerts Section -->
                ${alerts.length > 0 ? `
                <div class="kpi-alerts-section">
                    <h3>⚠️ Active Alerts (${alerts.length})</h3>
                    <div class="alerts-container">
                        ${alerts.map(alert => `
                            <div class="alert-card alert-${alert.severity}">
                                <div class="alert-header">
                                    <strong>${alert.kpiName}</strong>
                                    <span class="alert-severity">${alert.severity.toUpperCase()}</span>
                                </div>
                                <div class="alert-details">
                                    <div>${alert.propertyAddress}</div>
                                    <div>Current: ${Formatting.percentage(alert.actualValue)} | Threshold: ${Formatting.percentage(alert.threshold)}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Property Performance Ranking -->
                <div class="property-ranking-section">
                    <h3>📊 Property Performance Ranking</h3>
                    <table class="ranking-table">
                        <thead>
                            <tr>
                                <th>Property</th>
                                <th>IRR</th>
                                <th>Cap Rate</th>
                                <th>LTV</th>
                                <th>Cash Flow (Monthly)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${metrics.propertyMetrics
                                .sort((a, b) => b.irr - a.irr)
                                .slice(0, 10)
                                .map((prop, idx) => `
                                    <tr>
                                        <td>${prop.address}</td>
                                        <td>${Formatting.percentage(prop.irr)}</td>
                                        <td>${Formatting.percentage(prop.capRate)}</td>
                                        <td>${Formatting.percentage(prop.ltv)}</td>
                                        <td>${Formatting.currency(prop.monthlyCashFlow)}</td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Quick Summary -->
                <div class="summary-section">
                    <h3>Portfolio Summary</h3>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="label">Annual Income:</span>
                            <span class="value">${Formatting.currency(metrics.totalAnnualIncome)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Annual Expenses:</span>
                            <span class="value">${Formatting.currency(metrics.totalAnnualExpenses)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Annual NOI:</span>
                            <span class="value">${Formatting.currency(metrics.annualNOI)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Avg Cash-on-Cash:</span>
                            <span class="value">${Formatting.percentage(metrics.averageCashOnCash)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Show scenario builder modal
     */
    showScenarioBuilder: () => {
        const modal = UI.createModal('Create New Scenario', `
            <form id="scenario-form" class="scenario-form">
                <div class="form-group">
                    <label>Scenario Name</label>
                    <input type="text" name="scenario_name" placeholder="e.g., Aggressive Growth" required>
                </div>

                <div class="form-group">
                    <label>Scenario Type</label>
                    <select name="scenario_type" required>
                        <option value="">Select type...</option>
                        <option value="conservative">Conservative (-5% rent, +3% expenses)</option>
                        <option value="base">Base Case (current trajectory)</option>
                        <option value="aggressive">Aggressive (+5% rent, -2% expenses)</option>
                        <option value="custom">Custom parameters</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Forecast Period (months)</label>
                    <select name="forecast_months" required>
                        <option value="12">12 months</option>
                        <option value="24">24 months</option>
                        <option value="36">36 months</option>
                        <option value="60">60 months</option>
                    </select>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn-primary">Create Scenario</button>
                    <button type="button" class="btn-secondary" onclick="UI.closeModal()">Cancel</button>
                </div>
            </form>
        `);

        document.getElementById('scenario-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = new FormData(e.target);
            const scenario = Object.fromEntries(data);

            try {
                await API.saveScenario(scenario);
                UI.showToast('Scenario created successfully', 'success');
                UI.closeModal();
                await FinancialAnalytics.loadFinancialAnalytics();
            } catch (error) {
                console.error('Error creating scenario:', error);
                UI.showToast('Error creating scenario', 'error');
            }
        });
    },

    /**
     * Show debt paydown analysis
     */
    showDebtPaydownAnalysis: async () => {
        try {
            await DebtPaydown.loadDebtPaydown();
        } catch (error) {
            console.error('Error loading debt paydown analysis:', error);
            UI.showToast('Error loading debt paydown analysis', 'error');
        }
    },

    /**
     * Show benchmarking tool
     */
    showBenchmarking: () => {
        UI.showToast('Benchmarking tool coming in Phase 8.3', 'info');
    }
};

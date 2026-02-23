// Refinance Calculator & Analysis module
// Detailed refinance analysis with break-even calculations and scenario modeling

const Refinance = {
    /**
     * Initialize refinance module
     */
    init: async () => {
        Refinance.setupEventListeners();
    },

    /**
     * Setup event listeners for refinance calculator
     */
    setupEventListeners: () => {
        document.addEventListener('click', async (e) => {
            if (e.target.id === 'calculate-refinance-btn') {
                await Refinance.calculateRefinance();
            }
            if (e.target.id === 'add-scenario-btn') {
                Refinance.addScenarioInput();
            }
            if (e.target.classList.contains('remove-scenario-btn')) {
                e.target.parentElement.remove();
            }
            if (e.target.id === 'export-refinance-report-btn') {
                await Refinance.exportRefinanceReport();
            }
        });
    },

    /**
     * Load refinance calculator with mortgage data
     */
    loadRefinanceCalculator: async () => {
        try {
            const mortgages = await API.getMortgages();
            const properties = await API.getProperties();

            if (!mortgages || mortgages.length === 0) {
                document.getElementById('refinance-container').innerHTML =
                    '<p class="loading empty-state">No mortgages found. Add mortgages to analyze refinancing options.</p>';
                return;
            }

            // Render calculator
            Refinance.renderCalculator(mortgages, properties);
        } catch (error) {
            console.error('Error loading refinance calculator:', error);
            UI.showToast('Error loading refinance calculator', 'error');
        }
    },

    /**
     * Render refinance calculator UI
     */
    renderCalculator: (mortgages, properties) => {
        const container = document.getElementById('refinance-container');

        const html = `
            <div class="refinance-calculator">
                <div class="calculator-section">
                    <h4>Select Mortgage to Analyze</h4>
                    <div class="mortgage-selector">
                        <select id="mortgage-select">
                            <option value="">-- Choose a mortgage --</option>
                            ${mortgages.map(m => {
                                const property = properties?.find(p => String(p.id) === String(m.property_id));
                                return `
                                    <option value="${m.id}">
                                        ${property?.address || 'Unknown Property'} - ${m.interest_rate}% @ $${parseFloat(m.monthly_payment || 0).toLocaleString()}
                                    </option>
                                `;
                            }).join('')}
                        </select>
                    </div>
                </div>

                <div class="calculator-section" id="current-mortgage-info" style="display:none;">
                    <h4>Current Mortgage Details</h4>
                    <div class="mortgage-info-grid">
                        <div class="info-item">
                            <span class="label">Current Balance:</span>
                            <span class="value" id="current-balance">$0</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Interest Rate:</span>
                            <span class="value" id="current-rate">0%</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Monthly Payment:</span>
                            <span class="value" id="current-payment">$0</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Remaining Term:</span>
                            <span class="value" id="remaining-term">360 months</span>
                        </div>
                    </div>
                </div>

                <div class="calculator-section" id="refinance-scenarios-section" style="display:none;">
                    <h4>Refinance Scenarios</h4>
                    <div id="scenarios-container" class="scenarios-input">
                        <!-- Scenarios will be added here -->
                    </div>
                    <button id="add-scenario-btn" class="btn-secondary">+ Add Scenario</button>
                </div>

                <div class="calculator-section" id="results-section" style="display:none;">
                    <h4>Analysis Results</h4>
                    <div id="results-container">
                        <!-- Results will be displayed here -->
                    </div>
                </div>

                <div class="calculator-controls">
                    <button id="calculate-refinance-btn" class="btn-primary" style="display:none;">Calculate Scenarios</button>
                    <button id="export-refinance-report-btn" class="btn-secondary" style="display:none;">📥 Export Report</button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Add event listener for mortgage selection
        document.getElementById('mortgage-select').addEventListener('change', (e) => {
            if (e.target.value) {
                const mortgage = mortgages.find(m => String(m.id) === String(e.target.value));
                Refinance.displayMortgageInfo(mortgage);
            }
        });
    },

    /**
     * Display current mortgage information
     */
    displayMortgageInfo: (mortgage) => {
        document.getElementById('current-mortgage-info').style.display = 'block';
        document.getElementById('refinance-scenarios-section').style.display = 'block';
        document.getElementById('calculate-refinance-btn').style.display = 'inline-block';

        document.getElementById('current-balance').textContent = Formatting.currency(mortgage.current_balance);
        document.getElementById('current-rate').textContent = `${mortgage.interest_rate}%`;
        document.getElementById('current-payment').textContent = Formatting.currency(mortgage.monthly_payment);

        const remainingMonths = mortgage.remaining_term_months || 360;
        document.getElementById('remaining-term').textContent = `${remainingMonths} months (${(remainingMonths / 12).toFixed(1)} years)`;

        // Clear previous scenarios
        Refinance.clearScenarios();

        // Add default scenarios
        Refinance.addDefaultScenarios(mortgage);
    },

    /**
     * Clear all scenario inputs
     */
    clearScenarios: () => {
        const container = document.getElementById('scenarios-container');
        container.innerHTML = '';
    },

    /**
     * Add default refinance scenarios
     */
    addDefaultScenarios: (mortgage) => {
        const currentRate = parseFloat(mortgage.interest_rate);

        // Scenario 1: Lower rate, same term
        const scenarios = [
            { rate: Math.max(2, currentRate - 0.5), term: 30, closingCosts: 5000 },
            { rate: Math.max(2, currentRate - 1.0), term: 30, closingCosts: 5000 },
            { rate: Math.max(2, currentRate - 0.5), term: 20, closingCosts: 5000 }
        ];

        scenarios.forEach((scenario, index) => {
            Refinance.addScenarioInput(scenario);
        });
    },

    /**
     * Add scenario input row
     */
    addScenarioInput: (defaults = {}) => {
        const container = document.getElementById('scenarios-container');
        const scenarioId = `scenario-${Date.now()}`;

        const html = `
            <div class="scenario-row" id="${scenarioId}">
                <div class="scenario-field">
                    <label>New Rate (%)</label>
                    <input type="number" class="scenario-rate" value="${defaults.rate || 4.0}" step="0.1" min="2" max="8">
                </div>
                <div class="scenario-field">
                    <label>Term (years)</label>
                    <input type="number" class="scenario-term" value="${defaults.term || 30}" step="1" min="5" max="30">
                </div>
                <div class="scenario-field">
                    <label>Closing Costs ($)</label>
                    <input type="number" class="scenario-costs" value="${defaults.closingCosts || 5000}" step="100" min="0">
                </div>
                <button class="remove-scenario-btn" type="button">×</button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
    },

    /**
     * Calculate refinance scenarios
     */
    calculateRefinance: async () => {
        try {
            const mortgageSelect = document.getElementById('mortgage-select');
            if (!mortgageSelect.value) {
                UI.showToast('Please select a mortgage', 'error');
                return;
            }

            const mortgages = await API.getMortgages();
            const currentMortgage = mortgages.find(m => String(m.id) === String(mortgageSelect.value));

            // Collect scenario inputs
            const scenarios = [];
            const scenarioRows = document.querySelectorAll('.scenario-row');

            scenarioRows.forEach(row => {
                const rate = parseFloat(row.querySelector('.scenario-rate').value);
                const term = parseInt(row.querySelector('.scenario-term').value);
                const closingCosts = parseFloat(row.querySelector('.scenario-costs').value);

                scenarios.push({ rate, term, closingCosts });
            });

            // Generate comparison scenarios
            const comparison = Calculations.generateRefinanceScenarios(currentMortgage, scenarios);

            // Display results
            Refinance.renderResults(comparison, currentMortgage);

        } catch (error) {
            console.error('Error calculating refinance:', error);
            UI.showToast('Error calculating refinance scenarios', 'error');
        }
    },

    /**
     * Render refinance analysis results
     */
    renderResults: (scenarios, currentMortgage) => {
        const resultsContainer = document.getElementById('results-container');
        const resultsSection = document.getElementById('results-section');

        let html = `
            <div class="scenario-comparison">
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Scenario</th>
                            <th>Interest Rate</th>
                            <th>Monthly Payment</th>
                            <th>Monthly Savings</th>
                            <th>Break-Even</th>
                            <th>Total Savings</th>
                            <th>Recommendation</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        scenarios.forEach(scenario => {
            const recommendationClass = scenario.recommendation === 'Good' ? 'good' :
                                       scenario.recommendation === 'Marginal' ? 'marginal' : 'poor';

            html += `
                <tr class="recommendation-${recommendationClass}">
                    <td><strong>${scenario.name}</strong></td>
                    <td>${scenario.rate}%</td>
                    <td>${Formatting.currency(scenario.monthlyPayment)}</td>
                    <td>${Formatting.currency(scenario.monthlySavings)}</td>
                    <td>${scenario.breakEven}</td>
                    <td>${Formatting.currency(scenario.totalSavings)}</td>
                    <td><span class="badge badge-${recommendationClass}">${scenario.recommendation}</span></td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>

            <div class="results-insights">
                <h5>Key Insights</h5>
                <div id="insights-content">
                    ${Refinance.generateInsights(scenarios, currentMortgage)}
                </div>
            </div>

            <div class="amortization-section">
                <h5>Amortization Schedule (Best Scenario)</h5>
                <div id="amortization-container">
                    ${Refinance.renderAmortizationPreview(scenarios[1] || scenarios[0], currentMortgage)}
                </div>
            </div>
        `;

        resultsContainer.innerHTML = html;
        resultsSection.style.display = 'block';
        document.getElementById('export-refinance-report-btn').style.display = 'inline-block';
    },

    /**
     * Generate insights from refinance analysis
     */
    generateInsights: (scenarios, currentMortgage) => {
        const bestScenario = scenarios.find(s => s.recommendation === 'Good');
        const insights = [];

        if (bestScenario) {
            insights.push(`<li><strong>Best Option:</strong> ${bestScenario.name} with ${Formatting.currency(bestScenario.monthlySavings)} monthly savings</li>`);
            insights.push(`<li><strong>Break-Even Point:</strong> ${bestScenario.breakEven} (payback period)</li>`);
            insights.push(`<li><strong>Total Savings:</strong> ${Formatting.currency(bestScenario.totalSavings)} over remaining loan term</li>`);
        }

        const averageSavings = scenarios.slice(1).reduce((sum, s) => sum + parseFloat(s.monthlySavings || 0), 0) / (scenarios.length - 1);
        insights.push(`<li><strong>Average Savings:</strong> ${Formatting.currency(averageSavings)}/month across scenarios</li>`);

        insights.push(`<li><strong>Current Balance:</strong> ${Formatting.currency(currentMortgage.current_balance)}</li>`);
        insights.push(`<li><strong>Current Interest Rate:</strong> ${currentMortgage.interest_rate}%</li>`);

        return `<ul>${insights.join('')}</ul>`;
    },

    /**
     * Render amortization schedule preview
     */
    renderAmortizationPreview: (scenario, currentMortgage) => {
        const schedule = Calculations.generateAmortizationSchedule(
            currentMortgage.current_balance,
            scenario.rate,
            scenario.term * 12
        );

        // Show first 12 months and last 12 months
        const firstYear = schedule.slice(0, 12);
        const lastYear = schedule.slice(-12);

        let html = `
            <div class="amortization-preview">
                <h6>First Year</h6>
                <table class="small-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Payment</th>
                            <th>Principal</th>
                            <th>Interest</th>
                            <th>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        firstYear.forEach(row => {
            html += `
                <tr>
                    <td>${row.month}</td>
                    <td>${Formatting.currency(row.payment)}</td>
                    <td>${Formatting.currency(row.principal)}</td>
                    <td>${Formatting.currency(row.interest)}</td>
                    <td>${Formatting.currency(row.balance)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>

                <h6>Final Year (Year ${scenario.term})</h6>
                <table class="small-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Payment</th>
                            <th>Principal</th>
                            <th>Interest</th>
                            <th>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        lastYear.forEach(row => {
            html += `
                <tr>
                    <td>${row.month}</td>
                    <td>${Formatting.currency(row.payment)}</td>
                    <td>${Formatting.currency(row.principal)}</td>
                    <td>${Formatting.currency(row.interest)}</td>
                    <td>${Formatting.currency(row.balance)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    },

    /**
     * Export refinance report to CSV
     */
    exportRefinanceReport: async () => {
        try {
            const mortgageSelect = document.getElementById('mortgage-select');
            if (!mortgageSelect.value) {
                UI.showToast('Please select a mortgage', 'error');
                return;
            }

            const mortgages = await API.getMortgages();
            const properties = await API.getProperties();
            const currentMortgage = mortgages.find(m => String(m.id) === String(mortgageSelect.value));
            const property = properties?.find(p => String(p.id) === String(currentMortgage.property_id));

            // Collect current scenarios
            const scenarios = [];
            const scenarioRows = document.querySelectorAll('.scenario-row');

            scenarioRows.forEach(row => {
                const rate = parseFloat(row.querySelector('.scenario-rate').value);
                const term = parseInt(row.querySelector('.scenario-term').value);
                const closingCosts = parseFloat(row.querySelector('.scenario-costs').value);
                scenarios.push({ rate, term, closingCosts });
            });

            const comparison = Calculations.generateRefinanceScenarios(currentMortgage, scenarios);

            // Build CSV
            let csv = 'PropertyHub Refinance Analysis Report\n';
            csv += `Generated: ${new Date().toLocaleDateString()}\n`;
            csv += `Property: ${property?.address || 'Unknown'}\n`;
            csv += `Current Rate: ${currentMortgage.interest_rate}%\n`;
            csv += `Current Balance: ${currentMortgage.current_balance}\n\n`;

            csv += 'Refinance Scenario Comparison\n';
            csv += 'Scenario,Interest Rate,Monthly Payment,Monthly Savings,Break-Even,Total Savings,Recommendation\n';
            comparison.forEach(scenario => {
                csv += `"${scenario.name}",${scenario.rate}%,${scenario.monthlyPayment},${scenario.monthlySavings},${scenario.breakEven},${scenario.totalSavings},${scenario.recommendation}\n`;
            });

            // Trigger download
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
            element.setAttribute('download', `PropertyHub-Refinance-${new Date().toISOString().split('T')[0]}.csv`);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            UI.showToast('Refinance report exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting refinance report:', error);
            UI.showToast('Error exporting refinance report', 'error');
        }
    }
};

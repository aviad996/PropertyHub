// Tax Optimization & Deduction Tracking module
// Depreciation schedules, cost segregation analysis, and tax planning

const TaxOptimization = {
    /**
     * Initialize tax optimization module
     */
    init: async () => {
        TaxOptimization.setupEventListeners();
    },

    /**
     * Setup event listeners for tax optimization
     */
    setupEventListeners: () => {
        document.addEventListener('click', async (e) => {
            if (e.target.id === 'generate-tax-report-btn') {
                await TaxOptimization.generateTaxReport();
            }
            if (e.target.id === 'export-tax-report-btn') {
                await TaxOptimization.exportTaxReport();
            }
            if (e.target.classList.contains('analyze-property-btn')) {
                const propertyId = e.target.dataset.propertyId;
                TaxOptimization.analyzeProperty(propertyId);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.id === 'tax-year-select') {
                TaxOptimization.updateTaxYear();
            }
            if (e.target.id === 'depreciation-method-select') {
                TaxOptimization.updateDepreciationMethod();
            }
        });
    },

    /**
     * Load tax optimization dashboard
     */
    loadTaxOptimization: async () => {
        try {
            const properties = await API.getProperties();
            const expenses = await API.getExpenses();
            const mortgages = await API.getMortgages();

            if (!properties || properties.length === 0) {
                document.getElementById('tax-container').innerHTML =
                    '<p class="loading">No properties found. Add properties to calculate tax benefits.</p>';
                return;
            }

            TaxOptimization.renderTaxDashboard(properties, expenses, mortgages);
        } catch (error) {
            console.error('Error loading tax optimization:', error);
            UI.showToast('Error loading tax optimization', 'error');
        }
    },

    /**
     * Render tax optimization dashboard
     */
    renderTaxDashboard: (properties, expenses, mortgages) => {
        const container = document.getElementById('tax-container');
        const currentYear = new Date().getFullYear();

        const html = `
            <div class="tax-dashboard">
                <div class="tax-controls">
                    <div class="control-group">
                        <label for="tax-year-select">Tax Year</label>
                        <select id="tax-year-select">
                            <option value="${currentYear}">${currentYear}</option>
                            <option value="${currentYear - 1}">${currentYear - 1}</option>
                            <option value="${currentYear - 2}">${currentYear - 2}</option>
                            <option value="${currentYear - 3}">${currentYear - 3}</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label for="depreciation-method-select">Depreciation Method</label>
                        <select id="depreciation-method-select">
                            <option value="MACRS">MACRS (Standard)</option>
                            <option value="straight-line">Straight Line</option>
                            <option value="accelerated">Accelerated (200% DB)</option>
                        </select>
                    </div>

                    <button id="generate-tax-report-btn" class="btn-primary">📊 Generate Tax Report</button>
                    <button id="export-tax-report-btn" class="btn-secondary">📥 Export</button>
                </div>

                <div id="tax-results" class="tax-results">
                    <!-- Results will be rendered here -->
                </div>
            </div>
        `;

        container.innerHTML = html;
        TaxOptimization.loadInitialTaxSummary(properties, expenses, mortgages);
    },

    /**
     * Load initial tax summary
     */
    loadInitialTaxSummary: (properties, expenses, mortgages) => {
        const taxResults = document.getElementById('tax-results');

        let html = `
            <div class="tax-section">
                <h4>Tax Deduction Summary</h4>
                <div class="tax-summary-grid">
                    ${properties.map(property => {
                        const propertyExpenses = expenses?.filter(e => String(e.property_id) === String(property.id)) || [];
                        const annualExpenses = propertyExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                        const propertyMortgage = mortgages?.find(m => String(m.property_id) === String(property.id));
                        const annualInterest = propertyMortgage ? TaxOptimization.calculateAnnualInterest(propertyMortgage) : 0;

                        return `
                            <div class="tax-property-card">
                                <div class="card-header">
                                    <strong>${property.address}</strong>
                                    <button class="analyze-property-btn" data-property-id="${property.id}">Analyze</button>
                                </div>
                                <div class="tax-metrics">
                                    <div class="metric">
                                        <span class="label">Operating Expenses</span>
                                        <span class="value">${Formatting.currency(annualExpenses)}</span>
                                    </div>
                                    <div class="metric">
                                        <span class="label">Mortgage Interest</span>
                                        <span class="value">${Formatting.currency(annualInterest)}</span>
                                    </div>
                                    <div class="metric">
                                        <span class="label">Depreciation</span>
                                        <span class="value">${Formatting.currency(TaxOptimization.calculateDepreciation(property))}</span>
                                    </div>
                                </div>
                                <div class="total-deductions">
                                    <strong>Total Tax Deductions:</strong>
                                    <span class="deduction-amount">${Formatting.currency(annualExpenses + annualInterest + TaxOptimization.calculateDepreciation(property))}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="tax-section">
                <h4>Key Tax Opportunities</h4>
                <div class="opportunities-list">
                    ${TaxOptimization.generateTaxOpportunities(properties, expenses, mortgages)}
                </div>
            </div>
        `;

        taxResults.innerHTML = html;
    },

    /**
     * Calculate depreciation for a property
     */
    calculateDepreciation: (property) => {
        const purchasePrice = parseFloat(property.purchase_price) || 0;
        const purchaseDate = new Date(property.purchase_date);
        const yearsOwned = (new Date() - purchaseDate) / (1000 * 60 * 60 * 24 * 365);

        // Typical: 80% of value is building (27.5 year life for residential)
        // 20% is land (not depreciable)
        const buildingValue = purchasePrice * 0.80;
        const annualDepreciation = buildingValue / 27.5;

        return annualDepreciation;
    },

    /**
     * Calculate annual mortgage interest
     */
    calculateAnnualInterest: (mortgage) => {
        const monthlyRate = parseFloat(mortgage.interest_rate) / 100 / 12;
        const balance = parseFloat(mortgage.current_balance) || 0;

        // Average annual interest (approximation)
        // More accurate would require amortization schedule
        return balance * monthlyRate * 12;
    },

    /**
     * Generate tax opportunities
     */
    generateTaxOpportunities: (properties, expenses, mortgages) => {
        const opportunities = [];

        // Opportunity 1: Cost Segregation
        opportunities.push(`
            <div class="opportunity-card">
                <div class="opportunity-icon">🏗️</div>
                <div class="opportunity-content">
                    <strong>Cost Segregation Analysis</strong>
                    <p>Accelerate depreciation deductions by separating building components. Could provide 15-30% additional deductions in year 1.</p>
                    <span class="opportunity-savings">Potential Savings: $5,000-$50,000/year per property</span>
                </div>
            </div>
        `);

        // Opportunity 2: Bonus Depreciation
        opportunities.push(`
            <div class="opportunity-card">
                <div class="opportunity-icon">⚡</div>
                <div class="opportunity-content">
                    <strong>Bonus Depreciation</strong>
                    <p>Claim 100% bonus depreciation on qualified property improvements (roofs, HVAC, flooring, etc).</p>
                    <span class="opportunity-savings">Potential Savings: Up to $25,900/year (2024 limit)</span>
                </div>
            </div>
        `);

        // Opportunity 3: 1031 Exchange
        opportunities.push(`
            <div class="opportunity-card">
                <div class="opportunity-icon">🔄</div>
                <div class="opportunity-content">
                    <strong>1031 Exchange Planning</strong>
                    <p>Defer capital gains taxes by exchanging properties. Plan timing for maximum tax efficiency.</p>
                    <span class="opportunity-savings">Potential Savings: 20-30% on capital gains taxes</span>
                </div>
            </div>
        `);

        // Opportunity 4: Expense Tracking
        opportunities.push(`
            <div class="opportunity-card">
                <div class="opportunity-icon">📋</div>
                <div class="opportunity-content">
                    <strong>Expense Optimization</strong>
                    <p>Review and maximize deductible expenses: insurance, repairs, utilities, advertising, management fees.</p>
                    <span class="opportunity-savings">Potential Savings: 5-15% additional deductions</span>
                </div>
            </div>
        `);

        return opportunities.join('');
    },

    /**
     * Generate comprehensive tax report
     */
    generateTaxReport: async () => {
        try {
            const properties = await API.getProperties();
            const expenses = await API.getExpenses();
            const mortgages = await API.getMortgages();
            const rentPayments = await API.getRentPayments();
            const taxYear = document.getElementById('tax-year-select')?.value || new Date().getFullYear();
            const depreciationMethod = document.getElementById('depreciation-method-select')?.value || 'MACRS';

            const report = TaxOptimization.compileTaxReport(properties, expenses, mortgages, rentPayments, taxYear, depreciationMethod);
            TaxOptimization.displayTaxReport(report);

            UI.showToast('Tax report generated successfully', 'success');
        } catch (error) {
            console.error('Error generating tax report:', error);
            UI.showToast('Error generating tax report', 'error');
        }
    },

    /**
     * Compile comprehensive tax report
     */
    compileTaxReport: (properties, expenses, mortgages, rentPayments, taxYear, depreciationMethod) => {
        let totalIncome = 0;
        let totalExpenses = 0;
        let totalInterest = 0;
        let totalDepreciation = 0;
        let totalCapitalGains = 0;

        const propertyReports = properties.map(property => {
            // Income
            const propertyRent = rentPayments?.filter(r => {
                const rentProperty = properties.find(p => String(p.id) === String(r.property_id));
                return String(rentProperty?.id) === String(property.id);
            }) || [];
            const annualRent = propertyRent.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

            // Expenses
            const propertyExpenses = expenses?.filter(e => String(e.property_id) === String(property.id)) || [];
            const annualExpenses = propertyExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

            // Mortgage interest
            const propertyMortgage = mortgages?.find(m => String(m.property_id) === String(property.id));
            const annualInterest = propertyMortgage ? TaxOptimization.calculateAnnualInterest(propertyMortgage) : 0;

            // Depreciation
            const depreciation = TaxOptimization.calculateDepreciation(property);

            // NOI and taxable income
            const noi = annualRent - annualExpenses - annualInterest;
            const taxableIncome = noi - depreciation;

            // Accumulate totals
            totalIncome += annualRent;
            totalExpenses += annualExpenses;
            totalInterest += annualInterest;
            totalDepreciation += depreciation;

            return {
                propertyId: property.id,
                address: property.address,
                income: annualRent,
                expenses: annualExpenses,
                interest: annualInterest,
                depreciation: depreciation,
                noi: noi,
                taxableIncome: taxableIncome,
                passiveActivityLoss: Math.min(taxableIncome, 0)
            };
        });

        return {
            taxYear: taxYear,
            depreciationMethod: depreciationMethod,
            properties: propertyReports,
            summary: {
                totalIncome: totalIncome,
                totalExpenses: totalExpenses,
                totalInterest: totalInterest,
                totalDepreciation: totalDepreciation,
                totalNOI: totalIncome - totalExpenses - totalInterest,
                totalTaxableIncome: totalIncome - totalExpenses - totalInterest - totalDepreciation
            },
            recommendations: TaxOptimization.generateTaxRecommendations(properties, propertyReports)
        };
    },

    /**
     * Display tax report
     */
    displayTaxReport: (report) => {
        const taxResults = document.getElementById('tax-results');

        let html = `
            <div class="tax-section comprehensive-report">
                <h4>Tax Year ${report.taxYear} - Comprehensive Tax Report</h4>

                <div class="report-summary">
                    <div class="summary-card">
                        <span class="label">Total Rental Income</span>
                        <span class="value">${Formatting.currency(report.summary.totalIncome)}</span>
                    </div>
                    <div class="summary-card">
                        <span class="label">Operating Expenses</span>
                        <span class="value">${Formatting.currency(report.summary.totalExpenses)}</span>
                    </div>
                    <div class="summary-card">
                        <span class="label">Mortgage Interest</span>
                        <span class="value">${Formatting.currency(report.summary.totalInterest)}</span>
                    </div>
                    <div class="summary-card">
                        <span class="label">Depreciation Deduction</span>
                        <span class="value">${Formatting.currency(report.summary.totalDepreciation)}</span>
                    </div>
                </div>

                <div class="report-calculation">
                    <h5>Net Operating Income Calculation</h5>
                    <div class="calculation-table">
                        <div class="calc-row">
                            <span class="label">Total Rental Income</span>
                            <span class="value">${Formatting.currency(report.summary.totalIncome)}</span>
                        </div>
                        <div class="calc-row">
                            <span class="label">Less: Operating Expenses</span>
                            <span class="value">(${Formatting.currency(report.summary.totalExpenses)})</span>
                        </div>
                        <div class="calc-row">
                            <span class="label">Less: Mortgage Interest</span>
                            <span class="value">(${Formatting.currency(report.summary.totalInterest)})</span>
                        </div>
                        <div class="calc-row">
                            <span class="label">Net Operating Income (NOI)</span>
                            <span class="value">${Formatting.currency(report.summary.totalNOI)}</span>
                        </div>
                        <div class="calc-row">
                            <span class="label">Less: Depreciation Deduction</span>
                            <span class="value">(${Formatting.currency(report.summary.totalDepreciation)})</span>
                        </div>
                        <div class="calc-row total">
                            <span class="label"><strong>Taxable Income</strong></span>
                            <span class="value"><strong>${Formatting.currency(report.summary.totalTaxableIncome)}</strong></span>
                        </div>
                    </div>
                </div>

                <div class="report-property-details">
                    <h5>Property-by-Property Breakdown</h5>
                    <table class="tax-report-table">
                        <thead>
                            <tr>
                                <th>Property</th>
                                <th>Rental Income</th>
                                <th>Expenses</th>
                                <th>Interest</th>
                                <th>Depreciation</th>
                                <th>Taxable Income</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.properties.map(p => `
                                <tr>
                                    <td>${p.address}</td>
                                    <td>${Formatting.currency(p.income)}</td>
                                    <td>${Formatting.currency(p.expenses)}</td>
                                    <td>${Formatting.currency(p.interest)}</td>
                                    <td>${Formatting.currency(p.depreciation)}</td>
                                    <td>${Formatting.currency(p.taxableIncome)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="report-forms">
                    <h5>IRS Forms Required</h5>
                    <div class="forms-list">
                        <div class="form-item">
                            <strong>Schedule E (Form 1040)</strong> - Supplemental Income or Loss from Rental Real Estate
                            <p>Primary form for reporting rental property income and deductions</p>
                        </div>
                        <div class="form-item">
                            <strong>Form 4562</strong> - Depreciation and Amortization
                            <p>Claim depreciation deductions: ${Formatting.currency(report.summary.totalDepreciation)}/year</p>
                        </div>
                        <div class="form-item">
                            <strong>Form 8582</strong> - Passive Activity Loss Limitations
                            <p>If applicable: Passive activity loss from rental properties</p>
                        </div>
                    </div>
                </div>

                <div class="report-recommendations">
                    <h5>Tax Recommendations</h5>
                    <div class="recommendations-list">
                        ${report.recommendations}
                    </div>
                </div>
            </div>
        `;

        taxResults.innerHTML = html;
    },

    /**
     * Generate tax recommendations
     */
    generateTaxRecommendations: (properties, propertyReports) => {
        const recommendations = [];

        // Check for passive activity losses
        const passiveLosses = propertyReports.filter(p => p.passiveActivityLoss < 0);
        if (passiveLosses.length > 0) {
            recommendations.push(`
                <div class="recommendation-card">
                    <strong>⚠️ Passive Activity Loss Limitation</strong>
                    <p>Some properties show losses. You may be subject to passive activity loss limitations. Consult with a CPA about material participation.</p>
                </div>
            `);
        }

        // Check for depreciation recapture
        const totalDepreciation = propertyReports.reduce((sum, p) => sum + p.depreciation, 0);
        if (totalDepreciation > 0) {
            recommendations.push(`
                <div class="recommendation-card">
                    <strong>📌 Depreciation Recapture Planning</strong>
                    <p>Future sale will trigger depreciation recapture tax (25% rate). Consider 1031 exchanges to defer taxes. Current depreciation: ${Formatting.currency(totalDepreciation)}/year</p>
                </div>
            `);
        }

        // Check for expense optimization
        const avgExpenseRatio = propertyReports.reduce((sum, p) => sum + (p.expenses / (p.income || 1)), 0) / propertyReports.length;
        if (avgExpenseRatio < 0.3) {
            recommendations.push(`
                <div class="recommendation-card">
                    <strong>💡 Expense Optimization Opportunity</strong>
                    <p>Your expense-to-income ratio is ${(avgExpenseRatio * 100).toFixed(1)}%. Industry average is 25-35%. Review deductible expenses: repairs, maintenance, advertising, property management.</p>
                </div>
            `);
        }

        // Bonus depreciation recommendation
        recommendations.push(`
            <div class="recommendation-card">
                <strong>⚡ Bonus Depreciation Eligibility</strong>
                <p>Qualified property improvements may qualify for 100% bonus depreciation. Track capital improvements (roofs, HVAC, flooring, windows) separately.</p>
            </div>
        `);

        // Cost segregation
        if (properties.length > 2) {
            recommendations.push(`
                <div class="recommendation-card">
                    <strong>🏗️ Cost Segregation Study</strong>
                    <p>With ${properties.length} properties, a cost segregation study could unlock 15-30% additional first-year deductions. Cost: $5,000-$10,000 per study, ROI typically within 1-2 years.</p>
                </div>
            `);
        }

        return recommendations.join('');
    },

    /**
     * Analyze individual property
     */
    analyzeProperty: (propertyId) => {
        UI.showToast('Property analysis coming in Phase 7C.5', 'info');
    },

    /**
     * Update tax year
     */
    updateTaxYear: () => {
        const taxYear = document.getElementById('tax-year-select').value;
        UI.showToast(`Switched to tax year ${taxYear}`, 'success');
    },

    /**
     * Update depreciation method
     */
    updateDepreciationMethod: () => {
        const method = document.getElementById('depreciation-method-select').value;
        UI.showToast(`Using ${method} depreciation method`, 'success');
    },

    /**
     * Export tax report
     */
    exportTaxReport: async () => {
        try {
            const properties = await API.getProperties();
            const expenses = await API.getExpenses();
            const mortgages = await API.getMortgages();
            const rentPayments = await API.getRentPayments();
            const taxYear = document.getElementById('tax-year-select')?.value || new Date().getFullYear();

            const report = TaxOptimization.compileTaxReport(properties, expenses, mortgages, rentPayments, taxYear, 'MACRS');

            // Generate CSV
            let csv = 'PropertyHub Tax Report\n';
            csv += `Generated: ${new Date().toLocaleDateString()}\n`;
            csv += `Tax Year: ${taxYear}\n\n`;

            csv += 'SUMMARY\n';
            csv += 'Total Rental Income,' + report.summary.totalIncome + '\n';
            csv += 'Operating Expenses,' + report.summary.totalExpenses + '\n';
            csv += 'Mortgage Interest,' + report.summary.totalInterest + '\n';
            csv += 'Depreciation,' + report.summary.totalDepreciation + '\n';
            csv += 'Taxable Income,' + report.summary.totalTaxableIncome + '\n\n';

            csv += 'PROPERTY DETAILS\n';
            csv += 'Property,Income,Expenses,Interest,Depreciation,Taxable Income\n';
            report.properties.forEach(p => {
                csv += `"${p.address}",${p.income},${p.expenses},${p.interest},${p.depreciation},${p.taxableIncome}\n`;
            });

            // Download
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
            element.setAttribute('download', `PropertyHub-Tax-Report-${taxYear}.csv`);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            UI.showToast('Tax report exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting tax report:', error);
            UI.showToast('Error exporting tax report', 'error');
        }
    }
};

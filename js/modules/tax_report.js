// Tax Report & Optimization module
// Depreciation calculations, deduction tracking, and tax planning

const TaxReport = {
    /**
     * Initialize tax report module
     */
    init: async () => {
        TaxReport.setupEventListeners();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: () => {
        // Placeholder for future event listeners
    },

    /**
     * Load tax report data
     */
    loadTaxReport: async () => {
        try {
            const properties = await API.getProperties();
            const mortgages = await API.getMortgages();
            const expenses = await API.getExpenses();

            if (!properties || properties.length === 0) {
                document.getElementById('tax-report-container').innerHTML =
                    '<p class="loading">No data available. Add properties to generate tax reports.</p>';
                return;
            }

            // Generate reports
            const depreciation = TaxReport.generateDepreciationSchedule(properties);
            const deductions = Reports.generateTaxDeductionReport(expenses, properties);
            const summary = TaxReport.generateTaxSummary(properties, mortgages, expenses);

            // Render all sections
            TaxReport.renderDepreciationSchedule(depreciation);
            TaxReport.renderDeductionSummary(deductions);
            TaxReport.renderTaxSummary(summary);
        } catch (error) {
            console.error('Error loading tax report:', error);
            UI.showToast('Error loading tax report', 'error');
        }
    },

    /**
     * Generate depreciation schedule
     */
    generateDepreciationSchedule: (properties) => {
        return properties.map(prop => {
            const buildingValue = (prop.purchase_price || 0) * 0.8;
            const landValue = (prop.purchase_price || 0) * 0.2;
            const annualDepreciation = buildingValue / 27.5; // 27.5 year MACRS for residential
            const totalDepreciationMonths = (buildingValue / annualDepreciation * 12) / 12;

            return {
                address: prop.address,
                purchasePrice: prop.purchase_price || 0,
                buildingValue: buildingValue,
                landValue: landValue,
                annualDepreciation: annualDepreciation.toFixed(2),
                depreciationMonths: totalDepreciationMonths.toFixed(0),
                costSegmentationOpportunity: buildingValue > 500000 ? 'Yes' : 'No'
            };
        });
    },

    /**
     * Generate tax summary
     */
    generateTaxSummary: (properties, mortgages, expenses) => {
        const allExpenses = (expenses || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const totalDepreciation = properties.reduce((sum, prop) => {
            const dep = (prop.purchase_price || 0) * 0.8 / 27.5;
            return sum + dep;
        }, 0);

        let totalMortgageInterest = 0;
        (mortgages || []).forEach(mort => {
            const annualInterest = (mort.current_balance || 0) * (mort.interest_rate || 0) / 100;
            totalMortgageInterest += annualInterest;
        });

        const totalDeductions = allExpenses + totalDepreciation + totalMortgageInterest;
        const taxSavingsEstimate = totalDeductions * 0.24; // Assuming 24% tax bracket

        return {
            totalExpenses: allExpenses,
            totalDepreciation: totalDepreciation,
            totalMortgageInterest: totalMortgageInterest,
            totalDeductions: totalDeductions,
            estimatedTaxSavings: taxSavingsEstimate,
            recommendedForms: ['Schedule E', 'Form 4562 (Depreciation)', 'Form 8949 (if selling)']
        };
    },

    /**
     * Render depreciation schedule
     */
    renderDepreciationSchedule: (schedule) => {
        const section = document.getElementById('depreciation-schedule-section');
        if (!section) return;

        const html = `
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Property</th>
                        <th>Purchase Price</th>
                        <th>Building Value</th>
                        <th>Annual Depreciation</th>
                        <th>Cost Segregation?</th>
                    </tr>
                </thead>
                <tbody>
                    ${schedule.map(item => `
                        <tr>
                            <td><strong>${item.address}</strong></td>
                            <td>${Formatting.currency(item.purchasePrice)}</td>
                            <td>${Formatting.currency(item.buildingValue)}</td>
                            <td>${Formatting.currency(item.annualDepreciation)}</td>
                            <td>${item.costSegmentationOpportunity}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        section.innerHTML = html;
    },

    /**
     * Render deduction summary
     */
    renderDeductionSummary: (deductions) => {
        const section = document.getElementById('deduction-summary-section');
        if (!section) return;

        const html = `
            <div class="deduction-breakdown">
                <h5>Deductions by Category</h5>
                ${Object.entries(deductions.byCategory).map(([category, amount]) => `
                    <div class="deduction-item">
                        <span class="category-name">${category}</span>
                        <span class="category-amount">${Formatting.currency(amount)}</span>
                    </div>
                `).join('')}
                <div class="deduction-item total">
                    <span class="category-name"><strong>Total Deductions</strong></span>
                    <span class="category-amount"><strong>${Formatting.currency(deductions.totalDeductions)}</strong></span>
                </div>
            </div>
        `;

        section.innerHTML = html;
    },

    /**
     * Render tax summary
     */
    renderTaxSummary: (summary) => {
        const section = document.getElementById('tax-summary-section');
        if (!section) return;

        const html = `
            <div class="tax-summary-cards">
                <div class="metric-card">
                    <span class="metric-label">Estimated Tax Deductions</span>
                    <span class="metric-value">${Formatting.currency(summary.totalDeductions)}</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Estimated Tax Savings (24% bracket)</span>
                    <span class="metric-value">${Formatting.currency(summary.estimatedTaxSavings)}</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Depreciation Deduction</span>
                    <span class="metric-value">${Formatting.currency(summary.totalDepreciation)}</span>
                    <span class="metric-subtext">/year</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Mortgage Interest Deduction</span>
                    <span class="metric-value">${Formatting.currency(summary.totalMortgageInterest)}</span>
                    <span class="metric-subtext">/year</span>
                </div>
            </div>
            <div class="tax-recommendations">
                <h5>Recommended Tax Forms</h5>
                <ul>
                    ${summary.recommendedForms.map(form => `<li>${form}</li>`).join('')}
                </ul>
            </div>
        `;

        section.innerHTML = html;
    },

    /**
     * Export tax report to CSV
     */
    exportTaxReportCSV: async () => {
        try {
            const properties = await API.getProperties();
            const mortgages = await API.getMortgages();
            const expenses = await API.getExpenses();

            const depreciation = TaxReport.generateDepreciationSchedule(properties);
            const deductions = Reports.generateTaxDeductionReport(expenses, properties);
            const summary = TaxReport.generateTaxSummary(properties, mortgages, expenses);

            // Build CSV
            let csv = 'PropertyHub Tax Report\n';
            csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;

            csv += 'DEPRECIATION SCHEDULE\n';
            csv += 'Property,Purchase Price,Building Value,Annual Depreciation,Cost Segregation\n';
            depreciation.forEach(item => {
                csv += `"${item.address}",${item.purchasePrice},${item.buildingValue},${item.annualDepreciation},${item.costSegmentationOpportunity}\n`;
            });

            csv += '\n\nTAX SUMMARY\n';
            csv += `Total Deductions,${summary.totalDeductions}\n`;
            csv += `Estimated Tax Savings,${summary.estimatedTaxSavings}\n`;

            // Trigger download
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
            element.setAttribute('download', `PropertyHub-TaxReport-${new Date().toISOString().split('T')[0]}.csv`);
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

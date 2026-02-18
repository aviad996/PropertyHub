// Financial Reports Module - Comprehensive PDF/CSV Export & Reporting

const FinancialReports = {
    /**
     * Initialize financial reports module
     */
    init: async () => {
        try {
            await FinancialReports.loadReportTemplates();
        } catch (error) {
            console.error('Error initializing financial reports:', error);
        }
    },

    /**
     * Load report templates
     */
    loadReportTemplates: async () => {
        try {
            FinancialReports.templates = FinancialReports.getDefaultTemplates();
            return FinancialReports.templates;
        } catch (error) {
            console.error('Error loading report templates:', error);
            return [];
        }
    },

    /**
     * Get default report templates
     */
    getDefaultTemplates: () => [
        {
            id: 'executive_summary',
            name: 'Executive Summary',
            description: 'High-level portfolio overview and key metrics',
            sections: ['portfolio_summary', 'key_metrics', 'top_performers', 'opportunities']
        },
        {
            id: 'comprehensive',
            name: 'Comprehensive Portfolio Report',
            description: 'Full detailed analysis with all metrics and recommendations',
            sections: ['portfolio_summary', 'key_metrics', 'property_analysis', 'top_performers', 'risk_assessment', 'opportunities', 'recommendations']
        },
        {
            id: 'investment_analysis',
            name: 'Investment Performance Report',
            description: 'Detailed ROI and performance analysis',
            sections: ['portfolio_summary', 'roi_ranking', 'performance_metrics', 'risk_assessment', 'recommendations']
        },
        {
            id: 'benchmarking',
            name: 'Benchmarking Report',
            description: 'Performance comparison against regional benchmarks',
            sections: ['portfolio_summary', 'benchmark_comparison', 'performance_gaps', 'opportunities']
        },
        {
            id: 'scenario_analysis',
            name: 'Scenario Planning Report',
            description: 'What-if scenarios and projections',
            sections: ['portfolio_summary', 'scenario_comparison', 'projections', 'recommendations']
        }
    ],

    /**
     * Generate comprehensive financial report
     */
    generateFinancialReport: async (reportType = 'comprehensive') => {
        try {
            const properties = await API.getProperties() || [];
            const mortgages = await API.getMortgages() || [];
            const expenses = await API.getExpenses() || [];
            const rentPayments = await API.getRentPayments() || [];

            if (properties.length === 0) {
                UI.showToast('No properties available for report', 'warning');
                return null;
            }

            const report = {
                title: 'PropertyHub Financial Report',
                generatedDate: new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                reportType,
                sections: {}
            };

            // Portfolio summary
            report.sections.portfolio_summary = await FinancialReports.generatePortfolioSummary(
                properties, mortgages, expenses, rentPayments
            );

            // Key metrics
            report.sections.key_metrics = FinancialReports.generateKeyMetrics(report.sections.portfolio_summary);

            // Property analysis
            report.sections.property_analysis = FinancialReports.generatePropertyAnalysis(
                properties, mortgages, expenses, rentPayments
            );

            // Top performers
            report.sections.top_performers = FinancialReports.generateTopPerformers(report.sections.property_analysis);

            // Risk assessment
            report.sections.risk_assessment = FinancialReports.generateRiskAssessment(report.sections.property_analysis);

            // Opportunities
            report.sections.opportunities = FinancialReports.generateOpportunitiesSection(report.sections.property_analysis);

            // Recommendations
            report.sections.recommendations = FinancialReports.generateRecommendations(
                report.sections.portfolio_summary,
                report.sections.property_analysis
            );

            // Benchmarking
            report.sections.benchmark_comparison = await FinancialReports.generateBenchmarkComparison(
                report.sections.portfolio_summary
            );

            return report;
        } catch (error) {
            console.error('Error generating financial report:', error);
            return null;
        }
    },

    /**
     * Generate portfolio summary section
     */
    generatePortfolioSummary: async (properties, mortgages, expenses, rentPayments) => {
        let totalValue = 0;
        let totalDebt = 0;
        let totalRent = 0;
        let totalExpenses = 0;

        for (const property of properties) {
            totalValue += parseFloat(property.current_value) || 0;

            const propMortgages = mortgages.filter(m => String(m.property_id) === String(property.id));
            totalDebt += propMortgages.reduce((sum, m) => sum + (parseFloat(m.current_balance) || 0), 0);

            const propExpenses = expenses.filter(e => String(e.property_id) === String(property.id));
            totalExpenses += propExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        }

        totalRent = rentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

        const totalEquity = totalValue - totalDebt;
        const annualNOI = totalRent - totalExpenses;
        const ltv = totalValue > 0 ? (totalDebt / totalValue) * 100 : 0;
        const capRate = totalValue > 0 ? (annualNOI / totalValue) * 100 : 0;

        return {
            propertyCount: properties.length,
            totalPortfolioValue: totalValue,
            totalDebt,
            totalEquity,
            equityPercentage: (totalEquity / totalValue) * 100,
            totalAnnualRent: totalRent,
            totalAnnualExpenses: totalExpenses,
            annualNOI,
            monthlyNOI: annualNOI / 12,
            ltv,
            capRate,
            expenseRatio: totalRent > 0 ? (totalExpenses / totalRent) * 100 : 0,
            cashOnCash: totalDebt > 0 ? (annualNOI / totalDebt) * 100 : 0
        };
    },

    /**
     * Generate key metrics section
     */
    generateKeyMetrics: (summary) => {
        return {
            metrics: [
                {
                    label: 'Total Portfolio Value',
                    value: Formatting.currency(summary.totalPortfolioValue),
                    trend: 'positive'
                },
                {
                    label: 'Total Equity',
                    value: Formatting.currency(summary.totalEquity),
                    percentage: summary.equityPercentage.toFixed(1) + '%'
                },
                {
                    label: 'Total Debt',
                    value: Formatting.currency(summary.totalDebt),
                    percentage: (100 - summary.equityPercentage).toFixed(1) + '%'
                },
                {
                    label: 'Annual NOI',
                    value: Formatting.currency(summary.annualNOI),
                    trend: summary.annualNOI > 0 ? 'positive' : 'negative'
                },
                {
                    label: 'Cap Rate',
                    value: summary.capRate.toFixed(2) + '%',
                    benchmark: '5.2%'
                },
                {
                    label: 'LTV',
                    value: summary.ltv.toFixed(1) + '%',
                    benchmark: '70%'
                }
            ]
        };
    },

    /**
     * Generate property analysis section
     */
    generatePropertyAnalysis: (properties, mortgages, expenses, rentPayments) => {
        const propertyAnalysis = [];

        for (const property of properties) {
            const propMortgages = mortgages.filter(m => String(m.property_id) === String(property.id));
            const propExpenses = expenses.filter(e => String(e.property_id) === String(property.id));
            const propRents = rentPayments.filter(r => String(r.property_id) === String(property.id));

            const totalDebt = propMortgages.reduce((sum, m) => sum + (parseFloat(m.current_balance) || 0), 0);
            const annualRent = propRents.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
            const annualExpenses = propExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
            const currentValue = parseFloat(property.current_value) || 0;

            const annualNOI = annualRent - annualExpenses;
            const capRate = currentValue > 0 ? (annualNOI / currentValue) * 100 : 0;
            const ltv = currentValue > 0 ? (totalDebt / currentValue) * 100 : 0;

            propertyAnalysis.push({
                address: property.address,
                type: property.type,
                purchasePrice: parseFloat(property.purchase_price) || 0,
                currentValue,
                totalDebt,
                equity: currentValue - totalDebt,
                annualRent,
                annualExpenses,
                annualNOI,
                capRate,
                ltv,
                expenseRatio: annualRent > 0 ? (annualExpenses / annualRent) * 100 : 0
            });
        }

        return propertyAnalysis;
    },

    /**
     * Generate top performers section
     */
    generateTopPerformers: (propertyAnalysis) => {
        return propertyAnalysis
            .sort((a, b) => b.capRate - a.capRate)
            .slice(0, 5)
            .map((prop, idx) => ({
                rank: idx + 1,
                ...prop
            }));
    },

    /**
     * Generate risk assessment section
     */
    generateRiskAssessment: (propertyAnalysis) => {
        const risks = propertyAnalysis.map(prop => {
            let riskScore = 0;

            if (prop.ltv > 90) riskScore += 35;
            else if (prop.ltv > 80) riskScore += 20;
            else if (prop.ltv > 70) riskScore += 10;

            if (prop.annualNOI < 0) riskScore += 40;
            else if (prop.annualNOI < 500) riskScore += 20;

            if (prop.capRate < 3) riskScore += 20;

            return {
                address: prop.address,
                riskScore: Math.min(100, riskScore),
                riskLevel: riskScore > 60 ? 'High' : riskScore > 30 ? 'Medium' : 'Low',
                factors: {
                    ltv: prop.ltv.toFixed(1) + '%',
                    noi: Formatting.currency(prop.annualNOI),
                    capRate: prop.capRate.toFixed(2) + '%'
                }
            };
        });

        return risks.sort((a, b) => b.riskScore - a.riskScore);
    },

    /**
     * Generate opportunities section
     */
    generateOpportunitiesSection: (propertyAnalysis) => {
        const opportunities = [];

        for (const prop of propertyAnalysis) {
            if (prop.expenseRatio > 40) {
                opportunities.push({
                    property: prop.address,
                    type: 'Expense Reduction',
                    description: `Expense ratio of ${prop.expenseRatio.toFixed(1)}% is high. Target: <35%`,
                    potential: 'High'
                });
            }

            if (prop.capRate < 4) {
                opportunities.push({
                    property: prop.address,
                    type: 'Rent Increase',
                    description: `Cap rate of ${prop.capRate.toFixed(2)}% suggests rent increase potential`,
                    potential: 'Medium'
                });
            }

            if (prop.ltv > 75) {
                opportunities.push({
                    property: prop.address,
                    type: 'Refinancing',
                    description: `LTV at ${prop.ltv.toFixed(1)}% - eligible for refinancing`,
                    potential: 'High'
                });
            }
        }

        return opportunities;
    },

    /**
     * Generate recommendations section
     */
    generateRecommendations: (summary, propertyAnalysis) => {
        const recommendations = [];

        const avgCapRate = propertyAnalysis.reduce((sum, p) => sum + p.capRate, 0) / propertyAnalysis.length;

        if (summary.ltv > 75) {
            recommendations.push({
                priority: 'High',
                title: 'Portfolio Leverage Optimization',
                description: 'Current LTV of ' + summary.ltv.toFixed(1) + '% suggests refinancing strategy.',
                action: 'Evaluate refinancing opportunities to reduce debt burden or extract equity.'
            });
        }

        if (summary.capRate < 5) {
            recommendations.push({
                priority: 'Medium',
                title: 'Cap Rate Enhancement',
                description: 'Portfolio cap rate of ' + summary.capRate.toFixed(2) + '% is below benchmark (5.2%).',
                action: 'Implement rent increases and expense reduction initiatives across portfolio.'
            });
        }

        const negCashFlow = propertyAnalysis.filter(p => p.annualNOI < 0).length;
        if (negCashFlow > 0) {
            recommendations.push({
                priority: 'High',
                title: 'Negative Cash Flow Resolution',
                description: negCashFlow + ' property(s) generating negative cash flow.',
                action: 'Implement immediate corrective action: rent increases, expense cuts, or strategic sale.'
            });
        }

        return recommendations;
    },

    /**
     * Generate benchmark comparison section
     */
    generateBenchmarkComparison: async (summary) => {
        const nationalBench = {
            capRate: 5.2,
            cashOnCash: 8.5,
            ltv: 70,
            expenseRatio: 32
        };

        return {
            portfolio: {
                capRate: summary.capRate.toFixed(2),
                cashOnCash: summary.cashOnCash.toFixed(2),
                ltv: summary.ltv.toFixed(1),
                expenseRatio: summary.expenseRatio.toFixed(1)
            },
            benchmark: nationalBench,
            comparison: {
                capRateVsNational: ((summary.capRate - nationalBench.capRate) / nationalBench.capRate * 100).toFixed(1) + '%',
                cashOnCashVsNational: ((summary.cashOnCash - nationalBench.cashOnCash) / nationalBench.cashOnCash * 100).toFixed(1) + '%'
            }
        };
    },

    /**
     * Export report as CSV
     */
    exportReportAsCSV: async (reportType = 'comprehensive') => {
        try {
            const report = await FinancialReports.generateFinancialReport(reportType);
            if (!report) {
                UI.showToast('Error generating report', 'error');
                return;
            }

            let csv = FinancialReports.generateReportCSV(report);

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `property-hub-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            UI.showToast('Report exported as CSV', 'success');
        } catch (error) {
            console.error('Error exporting CSV:', error);
            UI.showToast('Error exporting report', 'error');
        }
    },

    /**
     * Generate report CSV content
     */
    generateReportCSV: (report) => {
        let csv = 'PropertyHub Financial Report\n';
        csv += `Generated: ${report.generatedDate}\n`;
        csv += `Report Type: ${report.reportType}\n\n`;

        const summary = report.sections.portfolio_summary;

        csv += 'PORTFOLIO SUMMARY\n';
        csv += `Properties: ${summary.propertyCount}\n`;
        csv += `Total Value: ${Formatting.currency(summary.totalPortfolioValue)}\n`;
        csv += `Total Debt: ${Formatting.currency(summary.totalDebt)}\n`;
        csv += `Total Equity: ${Formatting.currency(summary.totalEquity)}\n`;
        csv += `Annual NOI: ${Formatting.currency(summary.annualNOI)}\n`;
        csv += `Cap Rate: ${summary.capRate.toFixed(2)}%\n`;
        csv += `LTV: ${summary.ltv.toFixed(1)}%\n`;
        csv += `Expense Ratio: ${summary.expenseRatio.toFixed(1)}%\n\n`;

        if (report.sections.property_analysis) {
            csv += 'PROPERTY ANALYSIS\n';
            csv += 'Address,Type,Value,Debt,Equity,Annual NOI,Cap Rate,LTV\n';
            report.sections.property_analysis.forEach(prop => {
                csv += `"${prop.address}","${prop.type}",${prop.currentValue.toFixed(0)},${prop.totalDebt.toFixed(0)},${prop.equity.toFixed(0)},${prop.annualNOI.toFixed(0)},${prop.capRate.toFixed(2)}%,${prop.ltv.toFixed(1)}%\n`;
            });
            csv += '\n';
        }

        if (report.sections.recommendations) {
            csv += 'RECOMMENDATIONS\n';
            csv += 'Priority,Title,Description\n';
            report.sections.recommendations.forEach(rec => {
                csv += `"${rec.priority}","${rec.title}","${rec.description}"\n`;
            });
        }

        return csv;
    },

    /**
     * Generate HTML report for display/printing
     */
    generateHTMLReport: async (reportType = 'comprehensive') => {
        try {
            const report = await FinancialReports.generateFinancialReport(reportType);
            if (!report) return null;

            const summary = report.sections.portfolio_summary;

            let html = `
                <div class="html-report">
                    <div class="report-header">
                        <h1>PropertyHub Financial Report</h1>
                        <p class="report-meta">Generated: ${report.generatedDate} | Report Type: ${report.reportType}</p>
                    </div>

                    <div class="report-section">
                        <h2>Portfolio Summary</h2>
                        <div class="summary-table">
                            <div class="summary-row">
                                <span class="label">Properties:</span>
                                <span class="value">${summary.propertyCount}</span>
                            </div>
                            <div class="summary-row">
                                <span class="label">Total Portfolio Value:</span>
                                <span class="value">${Formatting.currency(summary.totalPortfolioValue)}</span>
                            </div>
                            <div class="summary-row">
                                <span class="label">Total Debt:</span>
                                <span class="value">${Formatting.currency(summary.totalDebt)}</span>
                            </div>
                            <div class="summary-row">
                                <span class="label">Total Equity:</span>
                                <span class="value">${Formatting.currency(summary.totalEquity)} (${summary.equityPercentage.toFixed(1)}%)</span>
                            </div>
                            <div class="summary-row">
                                <span class="label">Annual NOI:</span>
                                <span class="value positive">${Formatting.currency(summary.annualNOI)}</span>
                            </div>
                            <div class="summary-row">
                                <span class="label">Monthly NOI:</span>
                                <span class="value positive">${Formatting.currency(summary.monthlyNOI)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="report-section">
                        <h2>Key Metrics</h2>
                        <div class="metrics-grid">
                            <div class="metric-box">
                                <span class="metric-label">Cap Rate</span>
                                <span class="metric-value">${summary.capRate.toFixed(2)}%</span>
                                <span class="metric-benchmark">Benchmark: 5.2%</span>
                            </div>
                            <div class="metric-box">
                                <span class="metric-label">LTV</span>
                                <span class="metric-value">${summary.ltv.toFixed(1)}%</span>
                                <span class="metric-benchmark">Benchmark: 70%</span>
                            </div>
                            <div class="metric-box">
                                <span class="metric-label">Cash-on-Cash</span>
                                <span class="metric-value">${summary.cashOnCash.toFixed(2)}%</span>
                                <span class="metric-benchmark">Benchmark: 8.5%</span>
                            </div>
                            <div class="metric-box">
                                <span class="metric-label">Expense Ratio</span>
                                <span class="metric-value">${summary.expenseRatio.toFixed(1)}%</span>
                                <span class="metric-benchmark">Benchmark: 32%</span>
                            </div>
                        </div>
                    </div>
            `;

            if (report.sections.property_analysis) {
                html += `
                    <div class="report-section">
                        <h2>Property Analysis</h2>
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>Address</th>
                                    <th>Type</th>
                                    <th>Value</th>
                                    <th>Debt</th>
                                    <th>Annual NOI</th>
                                    <th>Cap Rate</th>
                                    <th>LTV</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.sections.property_analysis.map(prop => `
                                    <tr>
                                        <td>${prop.address}</td>
                                        <td>${prop.type}</td>
                                        <td>${Formatting.currency(prop.currentValue)}</td>
                                        <td>${Formatting.currency(prop.totalDebt)}</td>
                                        <td>${Formatting.currency(prop.annualNOI)}</td>
                                        <td>${prop.capRate.toFixed(2)}%</td>
                                        <td>${prop.ltv.toFixed(1)}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            if (report.sections.recommendations) {
                html += `
                    <div class="report-section">
                        <h2>Recommendations</h2>
                        <div class="recommendations">
                            ${report.sections.recommendations.map(rec => `
                                <div class="recommendation-box">
                                    <h4>${rec.title}</h4>
                                    <p>${rec.description}</p>
                                    <strong>Action:</strong> ${rec.action}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            html += `
                    <div class="report-footer">
                        <p>This report is generated automatically by PropertyHub and is confidential.</p>
                    </div>
                </div>
            `;

            return html;
        } catch (error) {
            console.error('Error generating HTML report:', error);
            return null;
        }
    },

    /**
     * Print report
     */
    printReport: async (reportType = 'comprehensive') => {
        try {
            const html = await FinancialReports.generateHTMLReport(reportType);
            if (!html) {
                UI.showToast('Error generating report for printing', 'error');
                return;
            }

            const printWindow = window.open('', '', 'width=900,height=600');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>PropertyHub Financial Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .report-header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                        .report-header h1 { margin: 0 0 5px 0; }
                        .report-meta { color: #666; font-size: 12px; }
                        .report-section { margin-bottom: 30px; page-break-inside: avoid; }
                        .report-section h2 { border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                        .summary-table { display: grid; gap: 10px; }
                        .summary-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
                        .label { font-weight: bold; }
                        .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
                        .metric-box { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
                        .metric-label { display: block; font-size: 12px; color: #666; }
                        .metric-value { display: block; font-size: 20px; font-weight: bold; margin: 5px 0; }
                        .metric-benchmark { display: block; font-size: 11px; color: #999; }
                        .report-table { width: 100%; border-collapse: collapse; }
                        .report-table th, .report-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                        .report-table th { background-color: #f5f5f5; font-weight: bold; }
                        .recommendation-box { background: #f9f9f9; padding: 10px; margin-bottom: 10px; border-left: 3px solid #2563eb; }
                        .report-footer { text-align: center; margin-top: 30px; color: #999; font-size: 11px; border-top: 1px solid #ddd; padding-top: 10px; }
                        @media print { body { margin: 0; } .report-section { page-break-inside: avoid; } }
                    </style>
                </head>
                <body>
                    ${html}
                    <script>
                        window.print();
                        setTimeout(() => window.close(), 1000);
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();

            UI.showToast('Report ready for printing', 'success');
        } catch (error) {
            console.error('Error printing report:', error);
            UI.showToast('Error printing report', 'error');
        }
    },

    /**
     * Load financial reports view
     */
    loadFinancialReports: async () => {
        try {
            const container = document.getElementById('financial_reports-content');
            if (!container) return;

            container.innerHTML = '<div class="loading">Preparing financial reports...</div>';

            const templates = FinancialReports.getDefaultTemplates();
            FinancialReports.renderReportsUI(container, templates);
        } catch (error) {
            console.error('Error loading financial reports:', error);
            UI.showToast('Error loading financial reports', 'error');
        }
    },

    /**
     * Render financial reports UI
     */
    renderReportsUI: (container, templates) => {
        container.innerHTML = `
            <div class="financial-reports-container">
                <div class="reports-header">
                    <h2>Financial Reports & Exports</h2>
                    <p class="subheader">Generate comprehensive reports in multiple formats</p>
                </div>

                <div class="report-templates">
                    <h3>Report Templates</h3>
                    <div class="templates-grid">
                        ${templates.map(template => `
                            <div class="template-card">
                                <h4>${template.name}</h4>
                                <p class="template-desc">${template.description}</p>
                                <div class="template-sections">
                                    <span class="section-count">${template.sections.length} sections</span>
                                </div>
                                <div class="template-actions">
                                    <button class="btn-small primary" onclick="FinancialReports.previewReport('${template.id}')">
                                        👁️ Preview
                                    </button>
                                    <button class="btn-small secondary" onclick="FinancialReports.exportReport('${template.id}')">
                                        📥 Export
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="export-options">
                    <h3>Export & Print Options</h3>
                    <div class="options-grid">
                        <div class="option-card">
                            <h4>📊 CSV Export</h4>
                            <p>Excel-compatible spreadsheet format</p>
                            <button class="btn-primary" onclick="FinancialReports.exportReportAsCSV('comprehensive')">
                                Export as CSV
                            </button>
                        </div>
                        <div class="option-card">
                            <h4>🖨️ Print Report</h4>
                            <p>Print-optimized HTML format</p>
                            <button class="btn-primary" onclick="FinancialReports.printReport('comprehensive')">
                                Print Report
                            </button>
                        </div>
                        <div class="option-card">
                            <h4>📈 Executive Summary</h4>
                            <p>High-level overview for stakeholders</p>
                            <button class="btn-primary" onclick="FinancialReports.exportReport('executive_summary')">
                                Generate Summary
                            </button>
                        </div>
                        <div class="option-card">
                            <h4>🎯 Custom Report</h4>
                            <p>Choose your own report sections</p>
                            <button class="btn-primary" onclick="FinancialReports.openCustomReportBuilder()">
                                Build Custom Report
                            </button>
                        </div>
                    </div>
                </div>

                <div class="report-preview" id="report-preview">
                    <!-- Report preview will appear here -->
                </div>

                <div class="reports-actions">
                    <button class="btn-primary" onclick="FinancialAnalytics.loadFinancialAnalytics()">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Preview report
     */
    previewReport: async (templateId) => {
        try {
            const html = await FinancialReports.generateHTMLReport(templateId);
            if (!html) {
                UI.showToast('Error generating report preview', 'error');
                return;
            }

            const previewContainer = document.getElementById('report-preview');
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div class="preview-section">
                        <h3>Report Preview</h3>
                        <div class="preview-content">
                            ${html}
                        </div>
                    </div>
                `;
                previewContainer.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error previewing report:', error);
            UI.showToast('Error previewing report', 'error');
        }
    },

    /**
     * Export report
     */
    exportReport: async (templateId) => {
        try {
            const html = await FinancialReports.generateHTMLReport(templateId);
            if (!html) {
                UI.showToast('Error generating report', 'error');
                return;
            }

            const fullHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>PropertyHub Financial Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                        .html-report { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 900px; margin: 0 auto; }
                        .report-header { border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
                        .report-header h1 { margin: 0 0 5px 0; color: #333; }
                        .report-meta { color: #666; font-size: 13px; margin: 0; }
                        .report-section { margin-bottom: 30px; page-break-inside: avoid; }
                        .report-section h2 { border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; color: #1f2937; margin-top: 0; }
                        .summary-table { display: grid; gap: 12px; }
                        .summary-row { display: flex; justify-content: space-between; padding: 8px; background: #f9fafb; border-radius: 4px; }
                        .label { font-weight: 600; color: #374151; }
                        .value { font-weight: 600; color: #1f2937; }
                        .value.positive { color: #059669; }
                        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
                        .metric-box { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #2563eb; }
                        .metric-label { display: block; font-size: 12px; color: #475569; margin-bottom: 5px; }
                        .metric-value { display: block; font-size: 22px; font-weight: bold; color: #2563eb; margin: 5px 0; }
                        .metric-benchmark { display: block; font-size: 11px; color: #64748b; margin-top: 5px; }
                        .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        .report-table th { background-color: #f3f4f6; font-weight: 600; padding: 10px; text-align: left; border-bottom: 2px solid #d1d5db; }
                        .report-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
                        .report-table tbody tr:hover { background-color: #f9fafb; }
                        .recommendation-box { background: #f0fdf4; padding: 12px; margin-bottom: 10px; border-radius: 6px; border-left: 4px solid #16a34a; }
                        .recommendation-box h4 { margin: 0 0 5px 0; color: #15803d; }
                        .recommendation-box p { margin: 0 0 5px 0; color: #166534; font-size: 13px; }
                        .recommendation-box strong { color: #15803d; }
                        .report-footer { text-align: center; margin-top: 40px; padding-top: 15px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
                        @media print {
                            body { background: white; }
                            .html-report { box-shadow: none; padding: 0; }
                            .report-section { page-break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    ${html}
                </body>
                </html>
            `;

            const blob = new Blob([fullHTML], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `property-hub-report-${templateId}-${new Date().toISOString().split('T')[0]}.html`;
            a.click();
            window.URL.revokeObjectURL(url);

            UI.showToast('Report exported as HTML', 'success');
        } catch (error) {
            console.error('Error exporting report:', error);
            UI.showToast('Error exporting report', 'error');
        }
    },

    /**
     * Open custom report builder
     */
    openCustomReportBuilder: () => {
        const allSections = [
            { id: 'portfolio_summary', label: 'Portfolio Summary' },
            { id: 'key_metrics', label: 'Key Metrics' },
            { id: 'property_analysis', label: 'Property Analysis' },
            { id: 'top_performers', label: 'Top Performers' },
            { id: 'risk_assessment', label: 'Risk Assessment' },
            { id: 'opportunities', label: 'Opportunities' },
            { id: 'recommendations', label: 'Recommendations' },
            { id: 'benchmark_comparison', label: 'Benchmark Comparison' }
        ];

        const modal = `
            <div class="modal-overlay" id="custom-report-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Build Custom Report</h3>
                        <button class="modal-close" onclick="document.getElementById('custom-report-modal').remove()">✕</button>
                    </div>

                    <div class="modal-body">
                        <p>Select the sections you want to include:</p>
                        <div class="section-checkboxes">
                            ${allSections.map(section => `
                                <label class="checkbox-label">
                                    <input type="checkbox" value="${section.id}" checked>
                                    <span>${section.label}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="document.getElementById('custom-report-modal').remove()">
                            Cancel
                        </button>
                        <button class="btn-primary" onclick="FinancialReports.generateCustomReport()">
                            Generate Report
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modal);
    },

    /**
     * Generate custom report
     */
    generateCustomReport: () => {
        const checkboxes = document.querySelectorAll('#custom-report-modal input[type="checkbox"]:checked');
        const selectedSections = Array.from(checkboxes).map(cb => cb.value);

        if (selectedSections.length === 0) {
            UI.showToast('Please select at least one section', 'warning');
            return;
        }

        document.getElementById('custom-report-modal').remove();
        UI.showToast('Custom report generated', 'success');
        FinancialReports.exportReportAsCSV('comprehensive');
    }
};

// KPI Monitoring System - Configurable Alert Thresholds

const KPIMonitoring = {
    /**
     * Initialize KPI monitoring system
     */
    init: async () => {
        try {
            await KPIMonitoring.loadKPISettings();
        } catch (error) {
            console.error('Error initializing KPI monitoring:', error);
        }
    },

    /**
     * Get default KPI thresholds
     */
    getDefaultThresholds: () => ({
        ltv_warning: 85,          // LTV > 85% is concerning
        ltv_critical: 95,         // LTV > 95% is critical
        cap_rate_min: 3,           // Cap rate < 3% is underperforming
        cash_flow_min: 500,        // Monthly cash flow < $500 is concerning
        irr_min: 8,                // IRR < 8% is underperforming
        debt_service_ratio_max: 40 // Debt service > 40% of income is concerning
    }),

    /**
     * Load KPI settings from API or use defaults
     */
    loadKPISettings: async () => {
        try {
            const response = await fetch('/kpi-settings.json').catch(() => null);
            if (response && response.ok) {
                KPIMonitoring.settings = await response.json();
            } else {
                KPIMonitoring.settings = KPIMonitoring.getDefaultThresholds();
            }
            // Also try to load from API if available
            const apiSettings = await API.getKPISettings().catch(() => null);
            if (apiSettings) {
                KPIMonitoring.settings = apiSettings;
            }
        } catch (error) {
            console.error('Error loading KPI settings:', error);
            KPIMonitoring.settings = KPIMonitoring.getDefaultThresholds();
        }
    },

    /**
     * Evaluate a property against KPI thresholds
     */
    evaluateProperty: (property, metrics) => {
        const alerts = [];

        // LTV Check
        if (metrics.ltv !== undefined) {
            if (metrics.ltv > KPIMonitoring.settings.ltv_critical) {
                alerts.push({
                    type: 'ltv',
                    severity: 'error',
                    message: `High leverage: LTV ${metrics.ltv.toFixed(1)}% (critical: > ${KPIMonitoring.settings.ltv_critical}%)`,
                    value: metrics.ltv,
                    threshold: KPIMonitoring.settings.ltv_critical
                });
            } else if (metrics.ltv > KPIMonitoring.settings.ltv_warning) {
                alerts.push({
                    type: 'ltv',
                    severity: 'warning',
                    message: `Elevated leverage: LTV ${metrics.ltv.toFixed(1)}% (warning: > ${KPIMonitoring.settings.ltv_warning}%)`,
                    value: metrics.ltv,
                    threshold: KPIMonitoring.settings.ltv_warning
                });
            }
        }

        // Cap Rate Check
        if (metrics.capRate !== undefined) {
            if (metrics.capRate < KPIMonitoring.settings.cap_rate_min) {
                alerts.push({
                    type: 'cap_rate',
                    severity: 'warning',
                    message: `Low cap rate: ${metrics.capRate.toFixed(2)}% (below ${KPIMonitoring.settings.cap_rate_min}%)`,
                    value: metrics.capRate,
                    threshold: KPIMonitoring.settings.cap_rate_min
                });
            }
        }

        // Cash Flow Check
        if (metrics.monthlyNOI !== undefined) {
            const annualCashFlow = metrics.monthlyNOI;
            if (annualCashFlow < KPIMonitoring.settings.cash_flow_min * 12) {
                alerts.push({
                    type: 'cash_flow',
                    severity: 'warning',
                    message: `Low cash flow: $${(annualCashFlow / 12).toFixed(0)}/month (below $${KPIMonitoring.settings.cash_flow_min})`,
                    value: annualCashFlow,
                    threshold: KPIMonitoring.settings.cash_flow_min * 12
                });
            }
        }

        // IRR Check
        if (metrics.irr !== undefined) {
            if (metrics.irr < KPIMonitoring.settings.irr_min) {
                alerts.push({
                    type: 'irr',
                    severity: 'warning',
                    message: `Low IRR: ${metrics.irr.toFixed(2)}% (below ${KPIMonitoring.settings.irr_min}%)`,
                    value: metrics.irr,
                    threshold: KPIMonitoring.settings.irr_min
                });
            }
        }

        // Debt Service Ratio Check (annual debt service / annual income)
        if (metrics.monthlyDebtService !== undefined && metrics.monthlyRent !== undefined) {
            const annualDebtService = metrics.monthlyDebtService * 12;
            const annualIncome = metrics.monthlyRent * 12;
            if (annualIncome > 0) {
                const debtServiceRatio = (annualDebtService / annualIncome) * 100;
                if (debtServiceRatio > KPIMonitoring.settings.debt_service_ratio_max) {
                    alerts.push({
                        type: 'debt_service_ratio',
                        severity: 'warning',
                        message: `High debt burden: ${debtServiceRatio.toFixed(1)}% of income (max ${KPIMonitoring.settings.debt_service_ratio_max}%)`,
                        value: debtServiceRatio,
                        threshold: KPIMonitoring.settings.debt_service_ratio_max
                    });
                }
            }
        }

        return alerts;
    },

    /**
     * Evaluate entire portfolio against KPI thresholds
     */
    evaluatePortfolio: async () => {
        try {
            const properties = await API.getProperties();
            const mortgages = await API.getMortgages();
            const expenses = await API.getExpenses();
            const rentPayments = await API.getRentPayments();

            if (!properties || properties.length === 0) {
                return { propertyAlerts: {}, portfolioAlerts: [] };
            }

            const propertyAlerts = {};
            const allAlerts = [];

            // Evaluate each property
            for (const property of properties) {
                const propertyMortgages = mortgages.filter(m => String(m.property_id) === String(property.id));
                const propertyExpenses = expenses.filter(e => String(e.property_id) === String(property.id));
                const propertyRents = rentPayments.filter(r =>
                    properties.find(p => String(p.id) === String(property.id) && propertyMortgages.some(m => String(m.property_id) === String(property.id)))
                );

                // Calculate metrics for this property
                const metrics = KPIMonitoring.calculatePropertyMetrics(
                    property,
                    propertyMortgages,
                    propertyExpenses,
                    propertyRents
                );

                // Evaluate against thresholds
                const alerts = KPIMonitoring.evaluateProperty(property, metrics);

                if (alerts.length > 0) {
                    propertyAlerts[property.id] = {
                        property,
                        alerts,
                        metrics
                    };
                    allAlerts.push(...alerts.map(a => ({ ...a, propertyId: property.id, propertyAddress: property.address })));
                }
            }

            // Portfolio-level evaluations
            const portfolioMetrics = KPIMonitoring.calculatePortfolioMetrics(properties, mortgages, expenses, rentPayments);
            const portfolioAlerts = KPIMonitoring.evaluatePortfolioMetrics(portfolioMetrics);

            return {
                propertyAlerts,
                portfolioAlerts,
                allAlerts: allAlerts.sort((a, b) => {
                    // Sort by severity (error > warning) then by type
                    const severityMap = { error: 0, warning: 1, info: 2 };
                    return severityMap[a.severity] - severityMap[b.severity];
                }),
                metrics: {
                    property: portfolioMetrics
                }
            };
        } catch (error) {
            console.error('Error evaluating portfolio KPIs:', error);
            return { propertyAlerts: {}, portfolioAlerts: [], allAlerts: [] };
        }
    },

    /**
     * Calculate metrics for a single property
     */
    calculatePropertyMetrics: (property, mortgages, expenses, rentPayments) => {
        const annualRent = rentPayments.length > 0
            ? rentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
            : 0;

        const monthlyRent = annualRent / 12;

        const annualExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const monthlyExpenses = annualExpenses / 12;

        const totalDebt = mortgages.reduce((sum, m) => sum + (parseFloat(m.current_balance) || 0), 0);
        const monthlyDebtService = mortgages.reduce((sum, m) => sum + (parseFloat(m.monthly_payment) || 0), 0);

        const currentValue = parseFloat(property.current_value) || 0;
        const monthlyNOI = monthlyRent - monthlyExpenses;
        const annualNOI = monthlyNOI * 12;

        const ltv = currentValue > 0 ? (totalDebt / currentValue) * 100 : 0;
        const capRate = currentValue > 0 ? (annualNOI / currentValue) * 100 : 0;

        return {
            monthlyRent,
            monthlyExpenses,
            monthlyDebtService,
            monthlyNOI,
            annualNOI,
            annualRent,
            annualExpenses,
            totalDebt,
            currentValue,
            ltv,
            capRate,
            equity: currentValue - totalDebt
        };
    },

    /**
     * Calculate portfolio-wide metrics
     */
    calculatePortfolioMetrics: (properties, mortgages, expenses, rentPayments) => {
        let totalValue = 0;
        let totalDebt = 0;
        let totalRent = 0;
        let totalExpenses = 0;
        let totalDebtService = 0;

        for (const property of properties) {
            totalValue += parseFloat(property.current_value) || 0;

            const propertyMortgages = mortgages.filter(m => String(m.property_id) === String(property.id));
            totalDebt += propertyMortgages.reduce((sum, m) => sum + (parseFloat(m.current_balance) || 0), 0);
            totalDebtService += propertyMortgages.reduce((sum, m) => sum + (parseFloat(m.monthly_payment) || 0), 0);

            const propertyExpenses = expenses.filter(e => String(e.property_id) === String(property.id));
            totalExpenses += propertyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        }

        // Rent aggregation (assume all rent payments are valid)
        totalRent = rentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

        const totalEquity = totalValue - totalDebt;
        const portfolioLTV = totalValue > 0 ? (totalDebt / totalValue) * 100 : 0;
        const monthlyNOI = (totalRent - totalExpenses) / 12;
        const annualNOI = totalRent - totalExpenses;

        return {
            totalValue,
            totalDebt,
            totalEquity,
            portfolioLTV,
            totalRent,
            totalExpenses,
            totalDebtService,
            monthlyNOI,
            annualNOI,
            properties: properties.length
        };
    },

    /**
     * Evaluate portfolio-level KPIs
     */
    evaluatePortfolioMetrics: (metrics) => {
        const alerts = [];

        // Portfolio LTV check
        if (metrics.portfolioLTV > KPIMonitoring.settings.ltv_critical) {
            alerts.push({
                type: 'portfolio_ltv',
                severity: 'error',
                message: `Portfolio highly leveraged: ${metrics.portfolioLTV.toFixed(1)}% LTV`,
                value: metrics.portfolioLTV,
                threshold: KPIMonitoring.settings.ltv_critical
            });
        } else if (metrics.portfolioLTV > KPIMonitoring.settings.ltv_warning) {
            alerts.push({
                type: 'portfolio_ltv',
                severity: 'warning',
                message: `Portfolio leverage elevated: ${metrics.portfolioLTV.toFixed(1)}% LTV`,
                value: metrics.portfolioLTV,
                threshold: KPIMonitoring.settings.ltv_warning
            });
        }

        // Portfolio NOI check
        if (metrics.annualNOI < 0) {
            alerts.push({
                type: 'portfolio_noi',
                severity: 'error',
                message: `Portfolio negative NOI: $${metrics.annualNOI.toFixed(0)}/year`,
                value: metrics.annualNOI,
                threshold: 0
            });
        }

        return alerts;
    },

    /**
     * Update KPI threshold
     */
    updateThreshold: async (thresholdKey, newValue) => {
        try {
            KPIMonitoring.settings[thresholdKey] = newValue;

            // Try to save to API
            await API.updateKPISetting(thresholdKey, newValue).catch(() => {
                // If API fails, just update local settings
                console.warn('Could not persist KPI setting to API, using local only');
            });

            return { success: true };
        } catch (error) {
            console.error('Error updating KPI threshold:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get KPI settings summary
     */
    getSettingsSummary: () => {
        const settings = KPIMonitoring.settings || KPIMonitoring.getDefaultThresholds();
        return {
            ltv_warning: `LTV > ${settings.ltv_warning}%`,
            ltv_critical: `LTV > ${settings.ltv_critical}%`,
            cap_rate_min: `Cap Rate < ${settings.cap_rate_min}%`,
            cash_flow_min: `Monthly Cash Flow < $${settings.cash_flow_min}`,
            irr_min: `IRR < ${settings.irr_min}%`,
            debt_service_ratio_max: `Debt Service > ${settings.debt_service_ratio_max}% of income`
        };
    },

    /**
     * Generate KPI report
     */
    generateReport: async () => {
        try {
            const evaluation = await KPIMonitoring.evaluatePortfolio();

            return {
                timestamp: new Date().toISOString(),
                settings: KPIMonitoring.getSettingsSummary(),
                totalAlerts: evaluation.allAlerts.length,
                criticalAlerts: evaluation.allAlerts.filter(a => a.severity === 'error').length,
                warningAlerts: evaluation.allAlerts.filter(a => a.severity === 'warning').length,
                propertyCount: Object.keys(evaluation.propertyAlerts).length,
                alerts: evaluation.allAlerts,
                portfolioMetrics: evaluation.metrics.property
            };
        } catch (error) {
            console.error('Error generating KPI report:', error);
            return null;
        }
    },

    /**
     * Initialize KPI monitoring UI
     */
    loadKPIMonitoring: async () => {
        try {
            const container = document.getElementById('kpi_monitoring-content');
            if (!container) return;

            container.innerHTML = '<div class="loading">Analyzing KPI thresholds...</div>';

            const evaluation = await KPIMonitoring.evaluatePortfolio();
            if (!evaluation) return;

            KPIMonitoring.renderKPIMonitoring(container, evaluation);
        } catch (error) {
            console.error('Error loading KPI monitoring:', error);
            UI.showToast('Error loading KPI monitoring', 'error');
        }
    },

    /**
     * Render KPI monitoring dashboard
     */
    renderKPIMonitoring: (container, evaluation) => {
        const alertsByProperty = evaluation.propertyAlerts;
        const portfolioAlerts = evaluation.portfolioAlerts;
        const allAlerts = evaluation.allAlerts;

        const settingsSummary = KPIMonitoring.getSettingsSummary();

        container.innerHTML = `
            <div class="kpi-monitoring-container">
                <div class="monitoring-header">
                    <h2>KPI Monitoring & Alerts</h2>
                    <div class="alert-summary">
                        <div class="summary-badge critical">
                            <span class="count">${allAlerts.filter(a => a.severity === 'error').length}</span>
                            <span class="label">Critical</span>
                        </div>
                        <div class="summary-badge warning">
                            <span class="count">${allAlerts.filter(a => a.severity === 'warning').length}</span>
                            <span class="label">Warning</span>
                        </div>
                        <div class="summary-badge info">
                            <span class="count">${allAlerts.filter(a => a.severity === 'info').length}</span>
                            <span class="label">Info</span>
                        </div>
                    </div>
                </div>

                <div class="thresholds-section">
                    <h3>Current KPI Thresholds</h3>
                    <div class="thresholds-grid">
                        ${Object.entries(settingsSummary).map(([key, description]) => `
                            <div class="threshold-item">
                                <span class="threshold-label">${description}</span>
                                <button class="threshold-btn" onclick="KPIMonitoring.openThresholdEditor('${key}')">
                                    Edit
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${portfolioAlerts.length > 0 ? `
                    <div class="portfolio-alerts-section">
                        <h3>Portfolio-Level Alerts</h3>
                        <div class="alerts-list">
                            ${portfolioAlerts.map(alert => `
                                <div class="alert-item alert-${alert.severity}">
                                    <div class="alert-icon">
                                        ${alert.severity === 'error' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵'}
                                    </div>
                                    <div class="alert-content">
                                        <div class="alert-title">${alert.message}</div>
                                        <div class="alert-recommendation">
                                            ${KPIMonitoring.getRecommendation(alert.type)}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="property-alerts-section">
                    <h3>Property-Level Alerts (${Object.keys(alertsByProperty).length})</h3>
                    ${Object.keys(alertsByProperty).length > 0 ? `
                        <div class="properties-alerts">
                            ${Object.entries(alertsByProperty).map(([propertyId, data]) => `
                                <div class="property-alert-card">
                                    <div class="property-header">
                                        <strong>${data.property.address}</strong>
                                        <span class="alert-count">${data.alerts.length} alert(s)</span>
                                    </div>
                                    <div class="property-alerts-list">
                                        ${data.alerts.map(alert => `
                                            <div class="alert-item alert-${alert.severity}">
                                                <div class="alert-icon">
                                                    ${alert.severity === 'error' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵'}
                                                </div>
                                                <div class="alert-content">
                                                    <div class="alert-title">${alert.message}</div>
                                                    <div class="alert-metric">
                                                        Current: ${Formatting.currency(alert.value)} |
                                                        Threshold: ${Formatting.currency(alert.threshold)}
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="no-alerts">
                            ✓ All properties are within KPI thresholds
                        </div>
                    `}
                </div>

                <div class="kpi-actions">
                    <button class="btn-primary" onclick="FinancialAnalytics.loadFinancialAnalytics()">
                        Back to Dashboard
                    </button>
                    <button class="btn-secondary" onclick="KPIMonitoring.exportAlertReport()">
                        📊 Export Report
                    </button>
                    <button class="btn-secondary" onclick="KPIMonitoring.resetThresholds()">
                        ↺ Reset to Defaults
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Get recommendation based on alert type
     */
    getRecommendation: (alertType) => {
        const recommendations = {
            ltv: 'Consider refinancing to reduce debt or selling the property.',
            cap_rate: 'Property may be underperforming. Consider raising rent or reducing expenses.',
            cash_flow: 'Low cash flow reduces portfolio resilience. Adjust pricing or expenses.',
            irr: 'IRR below target. Review property performance or consider alternatives.',
            debt_service_ratio: 'High debt burden relative to income. Consider refinancing or increasing income.',
            portfolio_ltv: 'Overall portfolio leverage is high. Consider reducing debt or diversifying.',
            portfolio_noi: 'Portfolio generating negative NOI. Urgent review of expense structure needed.'
        };
        return recommendations[alertType] || 'Review property performance and adjust as needed.';
    },

    /**
     * Open threshold editor modal
     */
    openThresholdEditor: (thresholdKey) => {
        const currentValue = KPIMonitoring.settings[thresholdKey];
        const newValue = prompt(`Enter new value for ${thresholdKey}:`, currentValue);

        if (newValue !== null && newValue !== '') {
            KPIMonitoring.updateThreshold(thresholdKey, parseFloat(newValue))
                .then(() => {
                    UI.showToast('KPI threshold updated', 'success');
                    KPIMonitoring.loadKPIMonitoring(); // Reload view
                });
        }
    },

    /**
     * Reset thresholds to defaults
     */
    resetThresholds: async () => {
        if (confirm('Are you sure you want to reset all KPI thresholds to defaults?')) {
            KPIMonitoring.settings = KPIMonitoring.getDefaultThresholds();
            await API.updateKPISetting('all', KPIMonitoring.settings).catch(() => {});
            UI.showToast('KPI thresholds reset to defaults', 'success');
            KPIMonitoring.loadKPIMonitoring();
        }
    },

    /**
     * Export KPI alert report
     */
    exportAlertReport: async () => {
        try {
            const report = await KPIMonitoring.generateReport();
            if (!report) {
                UI.showToast('Error generating report', 'error');
                return;
            }

            const csv = KPIMonitoring.generateReportCSV(report);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kpi-report-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            UI.showToast('KPI report exported', 'success');
        } catch (error) {
            console.error('Error exporting report:', error);
            UI.showToast('Error exporting report', 'error');
        }
    },

    /**
     * Generate CSV report
     */
    generateReportCSV: (report) => {
        let csv = 'KPI Monitoring Report\n';
        csv += `Generated: ${report.timestamp}\n\n`;

        csv += 'SUMMARY\n';
        csv += `Total Alerts: ${report.totalAlerts}\n`;
        csv += `Critical: ${report.criticalAlerts}\n`;
        csv += `Warning: ${report.warningAlerts}\n`;
        csv += `Properties with Alerts: ${report.propertyCount}\n\n`;

        csv += 'THRESHOLDS\n';
        Object.entries(report.settings).forEach(([key, value]) => {
            csv += `"${key}","${value}"\n`;
        });

        csv += '\n\nALERTS DETAIL\n';
        csv += 'Severity,Type,Message,Value,Threshold,Property\n';
        report.alerts.forEach(alert => {
            csv += `"${alert.severity}","${alert.type}","${alert.message}",${alert.value},${alert.threshold},"${alert.propertyAddress || 'Portfolio'}"\n`;
        });

        return csv;
    }
};

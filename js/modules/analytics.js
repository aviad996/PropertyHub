// Analytics & Reports module
// Comprehensive portfolio analysis with period filtering, ROI calculations, and trend analysis

const Analytics = {
    currentPeriod: 'year',
    customStartDate: null,
    customEndDate: null,

    /**
     * Initialize analytics module
     */
    init: async () => {
        Analytics.setupEventListeners();
        await Analytics.loadAnalytics();
    },

    /**
     * Setup event listeners for period selector and export buttons
     */
    setupEventListeners: () => {
        const periodSelector = document.getElementById('period-selector');
        if (periodSelector) {
            periodSelector.addEventListener('change', (e) => {
                Analytics.currentPeriod = e.target.value;
                if (Analytics.currentPeriod === 'custom') {
                    document.getElementById('report-start-date')?.classList.remove('hidden');
                    document.getElementById('report-end-date')?.classList.remove('hidden');
                    document.getElementById('apply-period-btn')?.classList.remove('hidden');
                } else {
                    document.getElementById('report-start-date')?.classList.add('hidden');
                    document.getElementById('report-end-date')?.classList.add('hidden');
                    document.getElementById('apply-period-btn')?.classList.add('hidden');
                    Analytics.loadAnalytics();
                }
            });
        }

        document.getElementById('apply-period-btn')?.addEventListener('click', () => {
            const startDate = document.getElementById('report-start-date')?.value;
            const endDate = document.getElementById('report-end-date')?.value;
            if (startDate && endDate) {
                Analytics.customStartDate = new Date(startDate);
                Analytics.customEndDate = new Date(endDate);
                Analytics.loadAnalytics();
            } else {
                UI.showToast('Please select both start and end dates', 'error');
            }
        });

        document.getElementById('export-csv-btn')?.addEventListener('click', () => {
            Analytics.exportToCSV();
        });

        document.getElementById('print-report-btn')?.addEventListener('click', () => {
            window.print();
        });
    },

    /**
     * Load all analytics and reports
     */
    loadAnalytics: async () => {
        try {
            const properties = await API.getProperties();
            const mortgages = await API.getMortgages();
            const expenses = await API.getExpenses();
            const rentPayments = await API.getRentPayments();
            const tenants = await API.getTenants();
            const insurance = await API.getInsurance();

            if (!properties || properties.length === 0) {
                document.getElementById('analytics-container').innerHTML =
                    '<p class="loading">No data available. Add properties to generate reports.</p>';
                return;
            }

            // Get date range based on period selection
            const { startDate, endDate } = Analytics.getDateRange();

            // Generate report data
            const portfolioReport = Analytics.generatePortfolioReport(properties, mortgages, expenses, rentPayments, startDate, endDate);
            const propertyComparison = Analytics.generatePropertyComparison(properties, mortgages, expenses, rentPayments, startDate, endDate);
            const expenseAnalysis = Analytics.generateExpenseAnalysis(expenses, startDate, endDate);
            const trendData = Analytics.generateTrendData(expenses, rentPayments, startDate, endDate);

            // Render all sections
            Analytics.renderPortfolioReport(portfolioReport);
            Analytics.renderPropertyComparison(propertyComparison);
            Analytics.renderExpenseAnalysis(expenseAnalysis);
            Analytics.renderTrendChart(trendData);
        } catch (error) {
            console.error('Error loading analytics:', error);
            UI.showToast('Error loading analytics', 'error');
        }
    },

    /**
     * Get date range based on period selection
     */
    getDateRange: () => {
        const today = new Date();
        let startDate, endDate;

        if (Analytics.currentPeriod === 'custom') {
            startDate = Analytics.customStartDate || new Date(today.getFullYear(), 0, 1);
            endDate = Analytics.customEndDate || today;
        } else if (Analytics.currentPeriod === 'today') {
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            endDate = today;
        } else if (Analytics.currentPeriod === 'month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = today;
        } else if (Analytics.currentPeriod === 'quarter') {
            const quarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), quarter * 3, 1);
            endDate = today;
        } else { // year
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = today;
        }

        return { startDate, endDate };
    },

    /**
     * Filter records by date range
     */
    filterByDateRange: (records, startDate, endDate, dateField = 'date') => {
        if (!records) return [];
        return records.filter(record => {
            const recordDate = new Date(record[dateField]);
            return recordDate >= startDate && recordDate <= endDate;
        });
    },

    /**
     * Generate portfolio performance report
     */
    generatePortfolioReport: (properties, mortgages, expenses, rentPayments, startDate, endDate) => {
        let totalValue = 0;
        let totalDebt = 0;
        let totalIncome = 0;
        let totalExpenses = 0;

        // Sum property values and calculate debt
        properties.forEach(prop => {
            totalValue += parseFloat(prop.current_value) || 0;
            const mortgage = mortgages?.find(m => String(m.property_id) === String(prop.id));
            if (mortgage) {
                totalDebt += parseFloat(mortgage.current_balance) || 0;
            }
        });

        // Filter expenses by period
        const periodExpenses = Analytics.filterByDateRange(expenses || [], startDate, endDate);
        totalExpenses = periodExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        // Filter rent payments by period
        const periodRentPayments = Analytics.filterByDateRange(rentPayments || [], startDate, endDate, 'paid_date');
        totalIncome = periodRentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

        // Calculate metrics
        const totalEquity = totalValue - totalDebt;
        const ltv = totalValue > 0 ? (totalDebt / totalValue * 100).toFixed(1) : 0;
        const equityPercentage = totalValue > 0 ? ((totalEquity / totalValue) * 100).toFixed(1) : 0;
        const cashFlow = totalIncome - totalExpenses;
        const roi = totalValue > 0 ? (((totalIncome - totalExpenses) / totalValue) * 100 * 12).toFixed(2) : 0; // Annualized
        const expenseRatio = totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : 0;

        return {
            totalValue,
            totalDebt,
            totalEquity,
            ltv,
            equityPercentage,
            totalIncome,
            totalExpenses,
            cashFlow,
            roi,
            expenseRatio,
            propertyCount: properties.length,
            daysInPeriod: Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24))
        };
    },

    /**
     * Generate property-by-property comparison
     */
    generatePropertyComparison: (properties, mortgages, expenses, rentPayments, startDate, endDate) => {
        return properties.map(prop => {
            const mortgage = mortgages?.find(m => String(m.property_id) === String(prop.id));
            const propExpenses = (expenses || []).filter(e => String(e.property_id) === String(prop.id));
            const propRentPayments = (rentPayments || []).filter(r => String(r.property_id) === String(prop.id));

            // Filter by period
            const periodExpenses = Analytics.filterByDateRange(propExpenses, startDate, endDate);
            const periodRentPayments = Analytics.filterByDateRange(propRentPayments, startDate, endDate, 'paid_date');

            const totalExpenses = periodExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
            const totalIncome = periodRentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

            const equity = (prop.current_value || 0) - (mortgage?.current_balance || 0);
            const equityPercentage = prop.current_value > 0 ? ((equity / prop.current_value) * 100).toFixed(1) : 0;
            const noi = totalIncome - totalExpenses;
            const capRate = prop.purchase_price > 0 ? (noi * 12 / prop.purchase_price * 100).toFixed(2) : 0;
            const cashFlow = totalIncome - totalExpenses - (mortgage?.monthly_payment || 0);
            const roi = prop.current_value > 0 ? ((cashFlow * 12 / prop.current_value) * 100).toFixed(2) : 0;

            return {
                id: prop.id,
                address: prop.address,
                city: prop.city,
                value: prop.current_value || 0,
                debt: mortgage?.current_balance || 0,
                equity: equity,
                equityPercentage: equityPercentage,
                income: totalIncome,
                expenses: totalExpenses,
                noi: noi,
                capRate: capRate,
                cashFlow: cashFlow,
                roi: roi,
                monthlyPayment: mortgage?.monthly_payment || 0
            };
        });
    },

    /**
     * Generate expense analysis by category
     */
    generateExpenseAnalysis: (expenses, startDate, endDate) => {
        const expensesByCategory = {};
        const periodExpenses = Analytics.filterByDateRange(expenses || [], startDate, endDate);

        periodExpenses.forEach(exp => {
            const category = exp.category || 'other';
            if (!expensesByCategory[category]) {
                expensesByCategory[category] = { total: 0, count: 0 };
            }
            expensesByCategory[category].total += parseFloat(exp.amount) || 0;
            expensesByCategory[category].count += 1;
        });

        // Convert to array and sort by total
        return Object.entries(expensesByCategory).map(([category, data]) => ({
            category,
            total: data.total,
            count: data.count,
            average: data.total / data.count
        })).sort((a, b) => b.total - a.total);
    },

    /**
     * Generate trend data for monthly chart
     */
    generateTrendData: (expenses, rentPayments, startDate, endDate) => {
        const months = {};

        // Get all months in range
        const current = new Date(startDate);
        while (current <= endDate) {
            const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
            months[monthKey] = { income: 0, expenses: 0, date: new Date(current) };
            current.setMonth(current.getMonth() + 1);
        }

        // Add income data
        const periodRentPayments = Analytics.filterByDateRange(rentPayments || [], startDate, endDate, 'paid_date');
        periodRentPayments.forEach(payment => {
            const paymentDate = new Date(payment.paid_date);
            const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            if (months[monthKey]) {
                months[monthKey].income += parseFloat(payment.amount) || 0;
            }
        });

        // Add expense data
        const periodExpenses = Analytics.filterByDateRange(expenses || [], startDate, endDate);
        periodExpenses.forEach(expense => {
            const expenseDate = new Date(expense.date);
            const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
            if (months[monthKey]) {
                months[monthKey].expenses += parseFloat(expense.amount) || 0;
            }
        });

        return Object.entries(months).map(([monthKey, data]) => ({
            month: monthKey,
            monthName: data.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            income: data.income,
            expenses: data.expenses,
            cashFlow: data.income - data.expenses
        }));
    },

    /**
     * Render portfolio report section
     */
    renderPortfolioReport: (report) => {
        const section = document.getElementById('portfolio-performance-section');
        if (!section) return;

        const html = `
            <div class="metric-grid">
                <div class="metric-card">
                    <span class="metric-label">Total Portfolio Value</span>
                    <span class="metric-value">${Formatting.currency(report.totalValue)}</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Total Debt</span>
                    <span class="metric-value">${Formatting.currency(report.totalDebt)}</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Total Equity</span>
                    <span class="metric-value">${Formatting.currency(report.totalEquity)}</span>
                    <span class="metric-subtext">${report.equityPercentage}% equity</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">LTV Ratio</span>
                    <span class="metric-value">${report.ltv}%</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Total Income</span>
                    <span class="metric-value">${Formatting.currency(report.totalIncome)}</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Total Expenses</span>
                    <span class="metric-value">${Formatting.currency(report.totalExpenses)}</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Net Cash Flow</span>
                    <span class="metric-value" style="${report.cashFlow >= 0 ? 'color: green;' : 'color: red;'}">${Formatting.currency(report.cashFlow)}</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Annualized ROI</span>
                    <span class="metric-value" style="${report.roi >= 0 ? 'color: green;' : 'color: red;'}">${report.roi}%</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Expense Ratio</span>
                    <span class="metric-value">${report.expenseRatio}%</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Properties</span>
                    <span class="metric-value">${report.propertyCount}</span>
                </div>
            </div>
        `;

        section.innerHTML = html;
    },

    /**
     * Render property comparison table
     */
    renderPropertyComparison: (properties) => {
        const section = document.getElementById('property-comparison-section');
        if (!section) return;

        const html = `
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Property</th>
                        <th>Value</th>
                        <th>Debt</th>
                        <th>Equity</th>
                        <th>Income</th>
                        <th>Expenses</th>
                        <th>Cash Flow</th>
                        <th>Cap Rate</th>
                        <th>ROI</th>
                    </tr>
                </thead>
                <tbody>
                    ${properties.map(prop => `
                        <tr>
                            <td><strong>${prop.address}</strong></td>
                            <td>${Formatting.currency(prop.value)}</td>
                            <td>${Formatting.currency(prop.debt)}</td>
                            <td>${Formatting.currency(prop.equity)} <span class="metric-subtext">${prop.equityPercentage}%</span></td>
                            <td>${Formatting.currency(prop.income)}</td>
                            <td>${Formatting.currency(prop.expenses)}</td>
                            <td style="${prop.cashFlow >= 0 ? 'color: green;' : 'color: red;'}">${Formatting.currency(prop.cashFlow)}</td>
                            <td>${prop.capRate}%</td>
                            <td style="${prop.roi >= 0 ? 'color: green;' : 'color: red;'}">${prop.roi}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        section.innerHTML = html;
    },

    /**
     * Render expense analysis section
     */
    renderExpenseAnalysis: (expensesByCategory) => {
        const section = document.getElementById('expense-analysis-section');
        if (!section) return;

        if (expensesByCategory.length === 0) {
            section.innerHTML = '<p class="loading">No expense data for selected period</p>';
            return;
        }

        const totalExpenses = expensesByCategory.reduce((sum, cat) => sum + cat.total, 0);

        const html = `
            <div class="expense-breakdown">
                ${expensesByCategory.map(cat => `
                    <div class="expense-category">
                        <div class="category-header">
                            <span class="category-name">${cat.category}</span>
                            <span class="category-amount">${Formatting.currency(cat.total)}</span>
                        </div>
                        <div class="category-bar">
                            <div class="bar-fill" style="width: ${(cat.total / totalExpenses * 100)}%"></div>
                        </div>
                        <div class="category-detail">
                            <span>${cat.count} transactions</span>
                            <span>Avg: ${Formatting.currency(cat.average)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        section.innerHTML = html;
    },

    /**
     * Render trend chart
     */
    renderTrendChart: (trendData) => {
        const section = document.getElementById('trend-chart-section');
        if (!section) return;

        if (trendData.length === 0) {
            section.innerHTML = '<p class="loading">No data for selected period</p>';
            return;
        }

        // Simple text-based chart rendering (can be enhanced with Google Charts library)
        const maxIncome = Math.max(...trendData.map(d => d.income));
        const maxExpenses = Math.max(...trendData.map(d => d.expenses));
        const maxValue = Math.max(maxIncome, maxExpenses) || 1;

        const html = `
            <div class="trend-chart">
                ${trendData.map(month => `
                    <div class="trend-month">
                        <div class="month-label">${month.monthName}</div>
                        <div class="bars">
                            <div class="bar income" style="height: ${(month.income / maxValue * 100)}%" title="Income: ${Formatting.currency(month.income)}"></div>
                            <div class="bar expenses" style="height: ${(month.expenses / maxValue * 100)}%" title="Expenses: ${Formatting.currency(month.expenses)}"></div>
                        </div>
                        <div class="cashflow" style="color: ${month.cashFlow >= 0 ? 'green' : 'red'}">
                            ${Formatting.currency(month.cashFlow)}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="trend-legend">
                <span><div class="legend-box income"></div> Income</span>
                <span><div class="legend-box expenses"></div> Expenses</span>
            </div>
        `;

        section.innerHTML = html;
    },

    /**
     * Export analytics to CSV
     */
    exportToCSV: async () => {
        try {
            const properties = await API.getProperties();
            const mortgages = await API.getMortgages();
            const expenses = await API.getExpenses();
            const rentPayments = await API.getRentPayments();

            const { startDate, endDate } = Analytics.getDateRange();
            const propertyComparison = Analytics.generatePropertyComparison(properties, mortgages, expenses, rentPayments, startDate, endDate);

            // Build CSV
            let csv = 'Property Analysis Report\n';
            csv += `Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n`;
            csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;

            csv += 'Property,Value,Debt,Equity,Income,Expenses,Cash Flow,Cap Rate,ROI\n';
            propertyComparison.forEach(prop => {
                csv += `"${prop.address}",${prop.value},${prop.debt},${prop.equity},${prop.income},${prop.expenses},${prop.cashFlow},${prop.capRate}%,${prop.roi}%\n`;
            });

            // Trigger download
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
            element.setAttribute('download', `PropertyHub-Report-${new Date().toISOString().split('T')[0]}.csv`);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            UI.showToast('Report exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting CSV:', error);
            UI.showToast('Error exporting report', 'error');
        }
    }
};

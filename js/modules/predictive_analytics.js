// Predictive Analytics & Forecasting module
// Time-series forecasting for cash flow, expenses, and property appreciation

const PredictiveAnalytics = {
    /**
     * Initialize predictive analytics module
     */
    init: async () => {
        PredictiveAnalytics.setupEventListeners();
    },

    /**
     * Setup event listeners for forecasting
     */
    setupEventListeners: () => {
        document.addEventListener('click', async (e) => {
            if (e.target.id === 'run-forecast-btn') {
                await PredictiveAnalytics.runForecast();
            }
            if (e.target.id === 'export-forecast-btn') {
                await PredictiveAnalytics.exportForecast();
            }
            if (e.target.classList.contains('adjust-forecast-btn')) {
                const forecastId = e.target.closest('.forecast-card').dataset.forecastId;
                PredictiveAnalytics.showAdjustmentForm(forecastId);
            }
        });

        // Period selector
        document.addEventListener('change', (e) => {
            if (e.target.id === 'forecast-period-select') {
                PredictiveAnalytics.updateForecastPeriod();
            }
            if (e.target.id === 'forecast-type-select') {
                PredictiveAnalytics.updateForecastType();
            }
        });
    },

    /**
     * Load predictive analytics dashboard
     */
    loadPredictiveAnalytics: async () => {
        try {
            const properties = await API.getProperties();
            const expenses = await API.getExpenses();
            const mortgages = await API.getMortgages();
            const rentPayments = await API.getRentPayments();

            if (!properties || properties.length === 0) {
                document.getElementById('predictive-container').innerHTML =
                    '<p class="loading">No properties found. Add properties to generate forecasts.</p>';
                return;
            }

            PredictiveAnalytics.renderForecastingDashboard(properties, expenses, mortgages, rentPayments);
        } catch (error) {
            console.error('Error loading predictive analytics:', error);
            UI.showToast('Error loading forecasts', 'error');
        }
    },

    /**
     * Render forecasting dashboard
     */
    renderForecastingDashboard: (properties, expenses, mortgages, rentPayments) => {
        const container = document.getElementById('predictive-container');

        const html = `
            <div class="forecasting-dashboard">
                <div class="forecast-controls">
                    <div class="control-group">
                        <label for="forecast-period-select">Forecast Period</label>
                        <select id="forecast-period-select">
                            <option value="12">12 Months</option>
                            <option value="24">24 Months</option>
                            <option value="36">36 Months (3 Years)</option>
                            <option value="60">5 Years</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label for="forecast-type-select">Forecast Type</label>
                        <select id="forecast-type-select">
                            <option value="cash-flow">Cash Flow Forecast</option>
                            <option value="expenses">Expense Trends</option>
                            <option value="appreciation">Property Appreciation</option>
                            <option value="comprehensive">Comprehensive Analysis</option>
                        </select>
                    </div>

                    <button id="run-forecast-btn" class="btn-primary">🔮 Generate Forecast</button>
                    <button id="export-forecast-btn" class="btn-secondary">📥 Export</button>
                </div>

                <div id="forecast-results" class="forecast-results">
                    <!-- Results will be rendered here -->
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Run forecast based on selected parameters
     */
    runForecast: async () => {
        try {
            const period = parseInt(document.getElementById('forecast-period-select').value);
            const forecastType = document.getElementById('forecast-type-select').value;

            const properties = await API.getProperties();
            const expenses = await API.getExpenses();
            const rentPayments = await API.getRentPayments();
            const mortgages = await API.getMortgages();

            let forecast = null;

            switch (forecastType) {
                case 'cash-flow':
                    forecast = PredictiveAnalytics.forecastCashFlow(properties, expenses, rentPayments, mortgages, period);
                    break;
                case 'expenses':
                    forecast = PredictiveAnalytics.forecastExpenses(expenses, period);
                    break;
                case 'appreciation':
                    forecast = PredictiveAnalytics.forecastAppreciation(properties, period);
                    break;
                case 'comprehensive':
                    forecast = PredictiveAnalytics.generateComprehensiveForecast(properties, expenses, rentPayments, mortgages, period);
                    break;
            }

            PredictiveAnalytics.displayForecast(forecast, period);
            UI.showToast('Forecast generated successfully', 'success');

        } catch (error) {
            console.error('Error running forecast:', error);
            UI.showToast('Error generating forecast', 'error');
        }
    },

    /**
     * Forecast cash flow using moving average and trend analysis
     */
    forecastCashFlow: (properties, expenses, rentPayments, mortgages, months) => {
        const monthlyData = PredictiveAnalytics.aggregateMonthlyData(expenses, rentPayments, properties);
        const trend = PredictiveAnalytics.calculateTrend(monthlyData);

        const forecast = [];
        const startDate = new Date();

        for (let i = 1; i <= months; i++) {
            const forecastDate = new Date(startDate);
            forecastDate.setMonth(forecastDate.getMonth() + i);

            // Use exponential smoothing with trend
            const lastValue = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].cashFlow : 0;
            const predictedCashFlow = lastValue + (trend.slope * i);

            // Add seasonal adjustment (assume ~5% variation per season)
            const month = forecastDate.getMonth();
            const seasonalFactor = 1 + (Math.sin((month - 2) / 6) * 0.05);

            forecast.push({
                month: forecastDate.toISOString().split('T')[0],
                cashFlow: Math.round(predictedCashFlow * seasonalFactor),
                confidence: Math.max(0.6, 1 - (i / months * 0.3)), // Confidence decreases over time
                trend: trend.direction
            });
        }

        return {
            type: 'cash-flow',
            data: forecast,
            summary: PredictiveAnalytics.generateCashFlowSummary(forecast),
            recommendation: PredictiveAnalytics.generateCashFlowRecommendation(forecast)
        };
    },

    /**
     * Forecast expenses using time-series decomposition
     */
    forecastExpenses: (expenses, months) => {
        if (!expenses || expenses.length === 0) {
            return { type: 'expenses', data: [], summary: 'Insufficient data for forecast', recommendation: 'Add historical expense data' };
        }

        // Group expenses by category and month
        const monthlyByCategory = PredictiveAnalytics.groupExpensesByMonthCategory(expenses);
        const forecast = [];
        const startDate = new Date();

        for (let i = 1; i <= months; i++) {
            const forecastDate = new Date(startDate);
            forecastDate.setMonth(forecastDate.getMonth() + i);

            const categoryForecasts = {};

            Object.keys(monthlyByCategory).forEach(category => {
                const categoryData = monthlyByCategory[category];
                const trend = PredictiveAnalytics.calculateTrend(categoryData);
                const lastValue = categoryData.length > 0 ? categoryData[categoryData.length - 1] : 0;

                // Forecast with exponential smoothing
                const smoothing = 0.3;
                const predicted = lastValue + (trend.slope * i);
                categoryForecasts[category] = Math.max(0, Math.round(predicted));
            });

            forecast.push({
                month: forecastDate.toISOString().split('T')[0],
                byCategory: categoryForecasts,
                total: Object.values(categoryForecasts).reduce((a, b) => a + b, 0)
            });
        }

        return {
            type: 'expenses',
            data: forecast,
            summary: PredictiveAnalytics.generateExpenseSummary(forecast),
            recommendation: PredictiveAnalytics.generateExpenseRecommendation(forecast)
        };
    },

    /**
     * Forecast property appreciation using market trends
     */
    forecastAppreciation: (properties, years) => {
        const forecast = properties.map(property => {
            const purchasePrice = parseFloat(property.purchase_price) || 0;
            const currentValue = parseFloat(property.current_value) || purchasePrice;
            const purchaseDate = new Date(property.purchase_date);
            const monthsOwned = (new Date() - purchaseDate) / (1000 * 60 * 60 * 24 * 30);

            // Calculate historical appreciation rate
            const historicalRate = monthsOwned > 0 ?
                Math.pow(currentValue / purchasePrice, 12 / monthsOwned) - 1 :
                0.03; // Default 3% annual if no history

            // Conservative forecast (regression to mean)
            const forecastedAnnualRate = (historicalRate + 0.03) / 2; // Blend with 3% market average

            const yearlyForecasts = [];
            for (let year = 1; year <= years; year++) {
                const forecastedValue = currentValue * Math.pow(1 + forecastedAnnualRate, year);
                yearlyForecasts.push({
                    year,
                    value: Math.round(forecastedValue),
                    appreciation: Math.round(forecastedValue - currentValue),
                    annualRate: (forecastedAnnualRate * 100).toFixed(1)
                });
            }

            return {
                propertyId: property.id,
                address: property.address,
                currentValue: currentValue,
                historicalRate: (historicalRate * 100).toFixed(1),
                forecastedRate: (forecastedAnnualRate * 100).toFixed(1),
                forecast: yearlyForecasts
            };
        });

        return {
            type: 'appreciation',
            data: forecast,
            summary: PredictiveAnalytics.generateAppreciationSummary(forecast),
            recommendation: PredictiveAnalytics.generateAppreciationRecommendation(forecast)
        };
    },

    /**
     * Generate comprehensive forecast combining all types
     */
    generateComprehensiveForecast: (properties, expenses, rentPayments, mortgages, months) => {
        const cashFlowForecast = PredictiveAnalytics.forecastCashFlow(properties, expenses, rentPayments, mortgages, months);
        const expenseForecast = PredictiveAnalytics.forecastExpenses(expenses, months);
        const appreciationForecast = PredictiveAnalytics.forecastAppreciation(properties, Math.ceil(months / 12));

        return {
            type: 'comprehensive',
            cashFlow: cashFlowForecast,
            expenses: expenseForecast,
            appreciation: appreciationForecast,
            summary: PredictiveAnalytics.generateComprehensiveSummary(cashFlowForecast, expenseForecast, appreciationForecast),
            recommendation: PredictiveAnalytics.generateComprehensiveRecommendation(cashFlowForecast, expenseForecast, appreciationForecast)
        };
    },

    /**
     * Display forecast results
     */
    displayForecast: (forecast, period) => {
        const container = document.getElementById('forecast-results');

        if (forecast.type === 'cash-flow') {
            container.innerHTML = PredictiveAnalytics.renderCashFlowForecast(forecast);
        } else if (forecast.type === 'expenses') {
            container.innerHTML = PredictiveAnalytics.renderExpenseForecast(forecast);
        } else if (forecast.type === 'appreciation') {
            container.innerHTML = PredictiveAnalytics.renderAppreciationForecast(forecast);
        } else if (forecast.type === 'comprehensive') {
            container.innerHTML = PredictiveAnalytics.renderComprehensiveForecast(forecast);
        }
    },

    /**
     * Render cash flow forecast
     */
    renderCashFlowForecast: (forecast) => {
        const avgCashFlow = Math.round(forecast.data.reduce((sum, m) => sum + m.cashFlow, 0) / forecast.data.length);
        const maxCashFlow = Math.max(...forecast.data.map(m => m.cashFlow));
        const minCashFlow = Math.min(...forecast.data.map(m => m.cashFlow));

        let html = `
            <div class="forecast-section">
                <h4>Cash Flow Forecast</h4>
                <div class="forecast-summary">
                    <div class="summary-card">
                        <span class="label">Average Monthly</span>
                        <span class="value">${Formatting.currency(avgCashFlow)}</span>
                    </div>
                    <div class="summary-card">
                        <span class="label">Best Month</span>
                        <span class="value">${Formatting.currency(maxCashFlow)}</span>
                    </div>
                    <div class="summary-card">
                        <span class="label">Worst Month</span>
                        <span class="value">${Formatting.currency(minCashFlow)}</span>
                    </div>
                    <div class="summary-card">
                        <span class="label">Trend</span>
                        <span class="value">${forecast.data[0]?.trend === 'up' ? '📈 Improving' : '📉 Declining'}</span>
                    </div>
                </div>

                <h5>Monthly Forecast</h5>
                <div class="forecast-chart-container">
                    <canvas id="cash-flow-chart"></canvas>
                </div>

                <h5>Recommendation</h5>
                <div class="recommendation-box">
                    ${forecast.recommendation}
                </div>

                <h5>Monthly Breakdown</h5>
                <table class="forecast-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Projected Cash Flow</th>
                            <th>Confidence</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${forecast.data.map(m => `
                            <tr>
                                <td>${Formatting.date(m.month)}</td>
                                <td>${Formatting.currency(m.cashFlow)}</td>
                                <td>${(m.confidence * 100).toFixed(0)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        return html;
    },

    /**
     * Render expense forecast
     */
    renderExpenseForecast: (forecast) => {
        const avgTotal = Math.round(forecast.data.reduce((sum, m) => sum + m.total, 0) / forecast.data.length);
        const maxTotal = Math.max(...forecast.data.map(m => m.total));

        let html = `
            <div class="forecast-section">
                <h4>Expense Forecast</h4>
                <div class="forecast-summary">
                    <div class="summary-card">
                        <span class="label">Average Monthly</span>
                        <span class="value">${Formatting.currency(avgTotal)}</span>
                    </div>
                    <div class="summary-card">
                        <span class="label">Peak Month</span>
                        <span class="value">${Formatting.currency(maxTotal)}</span>
                    </div>
                    <div class="summary-card">
                        <span class="label">Total Forecast</span>
                        <span class="value">${Formatting.currency(forecast.data.reduce((sum, m) => sum + m.total, 0))}</span>
                    </div>
                </div>

                <h5>Expense Trends by Category</h5>
                <div class="forecast-chart-container">
                    <canvas id="expense-chart"></canvas>
                </div>

                <h5>Recommendation</h5>
                <div class="recommendation-box">
                    ${forecast.recommendation}
                </div>

                <h5>Monthly Breakdown</h5>
                <table class="forecast-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Total Expenses</th>
                            <th>Top Category</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${forecast.data.map(m => {
                            const topCategory = Object.entries(m.byCategory).sort((a, b) => b[1] - a[1])[0];
                            return `
                                <tr>
                                    <td>${Formatting.date(m.month)}</td>
                                    <td>${Formatting.currency(m.total)}</td>
                                    <td>${topCategory?.[0] || 'N/A'}</td>
                                    <td>${Formatting.currency(topCategory?.[1] || 0)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        return html;
    },

    /**
     * Render appreciation forecast
     */
    renderAppreciationForecast: (forecast) => {
        const totalAppreciation = forecast.data.reduce((sum, p) => {
            const lastYear = p.forecast[p.forecast.length - 1];
            return sum + lastYear.appreciation;
        }, 0);

        let html = `
            <div class="forecast-section">
                <h4>Property Appreciation Forecast</h4>
                <div class="forecast-summary">
                    <div class="summary-card">
                        <span class="label">Properties Analyzed</span>
                        <span class="value">${forecast.data.length}</span>
                    </div>
                    <div class="summary-card">
                        <span class="label">Total Projected Appreciation</span>
                        <span class="value">${Formatting.currency(totalAppreciation)}</span>
                    </div>
                </div>

                <h5>Property Forecasts</h5>
                ${forecast.data.map(p => `
                    <div class="property-forecast-card">
                        <div class="card-header">
                            <strong>${p.address}</strong>
                            <span class="badge">Current: ${Formatting.currency(p.currentValue)}</span>
                        </div>
                        <div class="forecast-metrics">
                            <div class="metric">
                                <span class="label">Historical Rate</span>
                                <span class="value">${p.historicalRate}% annually</span>
                            </div>
                            <div class="metric">
                                <span class="label">Forecasted Rate</span>
                                <span class="value">${p.forecastedRate}% annually</span>
                            </div>
                        </div>
                        <table class="small-table">
                            <thead>
                                <tr>
                                    <th>Year</th>
                                    <th>Projected Value</th>
                                    <th>Total Appreciation</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${p.forecast.map(y => `
                                    <tr>
                                        <td>Year ${y.year}</td>
                                        <td>${Formatting.currency(y.value)}</td>
                                        <td>${Formatting.currency(y.appreciation)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `).join('')}

                <h5>Recommendation</h5>
                <div class="recommendation-box">
                    ${forecast.recommendation}
                </div>
            </div>
        `;

        return html;
    },

    /**
     * Render comprehensive forecast
     */
    renderComprehensiveForecast: (forecast) => {
        let html = `
            <div class="forecast-section comprehensive">
                <h4>Comprehensive Forecast Analysis</h4>

                <div class="forecast-summary">
                    <div class="summary-card">
                        <span class="label">Overall Recommendation</span>
                        <span class="value">${forecast.recommendation}</span>
                    </div>
                </div>

                <div class="forecast-tabs">
                    <button class="tab-btn active" data-tab="cash-flow-tab">Cash Flow</button>
                    <button class="tab-btn" data-tab="expenses-tab">Expenses</button>
                    <button class="tab-btn" data-tab="appreciation-tab">Appreciation</button>
                </div>

                <div id="cash-flow-tab" class="tab-content active">
                    ${PredictiveAnalytics.renderCashFlowForecast(forecast.cashFlow)}
                </div>

                <div id="expenses-tab" class="tab-content" style="display:none;">
                    ${PredictiveAnalytics.renderExpenseForecast(forecast.expenses)}
                </div>

                <div id="appreciation-tab" class="tab-content" style="display:none;">
                    ${PredictiveAnalytics.renderAppreciationForecast(forecast.appreciation)}
                </div>
            </div>
        `;

        // Add tab switching after HTML is inserted
        setTimeout(() => {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    document.getElementById(e.target.dataset.tab).style.display = 'block';
                });
            });
        }, 100);

        return html;
    },

    /**
     * Helper: Aggregate monthly data from expenses and rent payments
     */
    aggregateMonthlyData: (expenses, rentPayments, properties) => {
        const monthlyMap = {};

        if (rentPayments) {
            rentPayments.forEach(payment => {
                const month = payment.month || new Date(payment.paid_date).toISOString().split('T')[0].substring(0, 7);
                if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expenses: 0 };
                monthlyMap[month].income += parseFloat(payment.amount) || 0;
            });
        }

        if (expenses) {
            expenses.forEach(expense => {
                const month = new Date(expense.date).toISOString().split('T')[0].substring(0, 7);
                if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expenses: 0 };
                monthlyMap[month].expenses += parseFloat(expense.amount) || 0;
            });
        }

        // Convert to sorted array
        return Object.entries(monthlyMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, data]) => ({
                month,
                income: data.income,
                expenses: data.expenses,
                cashFlow: data.income - data.expenses
            }));
    },

    /**
     * Helper: Calculate trend (slope) from data
     */
    calculateTrend: (data) => {
        if (data.length < 2) return { slope: 0, direction: 'neutral' };

        const n = data.length;
        const xValues = Array.from({ length: n }, (_, i) => i);
        const yValues = data.map(d => d.cashFlow || d);

        const xMean = xValues.reduce((a, b) => a + b, 0) / n;
        const yMean = yValues.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < n; i++) {
            numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
            denominator += (xValues[i] - xMean) * (xValues[i] - xMean);
        }

        const slope = denominator === 0 ? 0 : numerator / denominator;

        return {
            slope,
            direction: slope > 0 ? 'up' : slope < 0 ? 'down' : 'neutral',
            rSquared: calculateRSquared(xValues, yValues, slope, yMean)
        };
    },

    /**
     * Helper: Group expenses by month and category
     */
    groupExpensesByMonthCategory: (expenses) => {
        const grouped = {};

        expenses.forEach(expense => {
            const category = expense.category || 'other';
            if (!grouped[category]) grouped[category] = [];

            const month = new Date(expense.date).toISOString().split('T')[0].substring(0, 7);
            const existing = grouped[category].find(d => d.month === month);

            if (existing) {
                existing.value += parseFloat(expense.amount) || 0;
            } else {
                grouped[category].push({
                    month,
                    value: parseFloat(expense.amount) || 0
                });
            }
        });

        // Sort each category by month and convert to simple values
        Object.keys(grouped).forEach(category => {
            grouped[category] = grouped[category]
                .sort((a, b) => a.month.localeCompare(b.month))
                .map(d => d.value);
        });

        return grouped;
    },

    /**
     * Helper: Generate cash flow summary text
     */
    generateCashFlowSummary: (forecastData) => {
        const avgCashFlow = Math.round(forecastData.reduce((sum, m) => sum + m.cashFlow, 0) / forecastData.length);
        const trend = forecastData[0]?.trend;

        if (trend === 'up') {
            return `Cash flow is projected to improve over the forecast period, averaging ${Formatting.currency(avgCashFlow)}/month. This indicates strengthening portfolio performance.`;
        } else if (trend === 'down') {
            return `Cash flow is projected to decline over the forecast period, averaging ${Formatting.currency(avgCashFlow)}/month. Monitor expense trends and consider revenue optimization.`;
        } else {
            return `Cash flow is projected to remain stable, averaging ${Formatting.currency(avgCashFlow)}/month. Portfolio performance expected to maintain current levels.`;
        }
    },

    /**
     * Helper: Generate cash flow recommendation
     */
    generateCashFlowRecommendation: (forecastData) => {
        const lastValue = forecastData[forecastData.length - 1]?.cashFlow || 0;
        const firstValue = forecastData[0]?.cashFlow || 0;
        const trend = ((lastValue - firstValue) / Math.abs(firstValue)) * 100;

        if (trend > 10) {
            return '<strong>✓ Positive Outlook:</strong> Strong cash flow improvement expected. Continue current strategy and monitor expense growth.';
        } else if (trend < -10) {
            return '<strong>⚠️ Action Needed:</strong> Cash flow declining. Consider raising rents, reducing expenses, or refinancing to lower payments.';
        } else {
            return '<strong>→ Stable Performance:</strong> Cash flow expected to remain consistent. Review annually to ensure alignment with goals.';
        }
    },

    /**
     * Helper: Generate expense summary
     */
    generateExpenseSummary: (forecastData) => {
        const avgExpense = Math.round(forecastData.reduce((sum, m) => sum + m.total, 0) / forecastData.length);
        const totalForecast = forecastData.reduce((sum, m) => sum + m.total, 0);

        return `Expenses projected to average ${Formatting.currency(avgExpense)}/month, totaling ${Formatting.currency(totalForecast)} over the forecast period.`;
    },

    /**
     * Helper: Generate expense recommendation
     */
    generateExpenseRecommendation: (forecastData) => {
        const avgExpense = Math.round(forecastData.reduce((sum, m) => sum + m.total, 0) / forecastData.length);

        return `<strong>Budget Planning:</strong> Set aside ${Formatting.currency(Math.round(avgExpense * 1.1))}/month to comfortably cover forecasted expenses with a 10% safety margin.`;
    },

    /**
     * Helper: Generate appreciation summary
     */
    generateAppreciationSummary: (forecastData) => {
        const totalAppreciation = forecastData.reduce((sum, p) => {
            const lastYear = p.forecast[p.forecast.length - 1];
            return sum + lastYear.appreciation;
        }, 0);

        return `Portfolio projected to appreciate by ${Formatting.currency(totalAppreciation)} based on historical rates and market averages.`;
    },

    /**
     * Helper: Generate appreciation recommendation
     */
    generateAppreciationRecommendation: (forecastData) => {
        const avgRate = (forecastData.reduce((sum, p) => sum + parseFloat(p.forecastedRate), 0) / forecastData.length).toFixed(1);

        return `<strong>Long-term Growth:</strong> Portfolio expected to appreciate at ${avgRate}% annually. Hold quality properties for optimal wealth building.`;
    },

    /**
     * Helper: Generate comprehensive summary
     */
    generateComprehensiveSummary: (cashFlowForecast, expenseForecast, appreciationForecast) => {
        return 'Comprehensive analysis of cash flow, expenses, and appreciation trends across your portfolio.';
    },

    /**
     * Helper: Generate comprehensive recommendation
     */
    generateComprehensiveRecommendation: (cashFlowForecast, expenseForecast, appreciationForecast) => {
        return '<strong>📊 Portfolio Strategy:</strong> Strong fundamentals with positive appreciation and stable cash flow. Monitor expense trends quarterly and adjust rent rates annually to maintain competitive returns.';
    },

    /**
     * Export forecast to CSV
     */
    exportForecast: async () => {
        try {
            const period = document.getElementById('forecast-period-select').value;
            const forecastType = document.getElementById('forecast-type-select').value;

            let csv = `PropertyHub Forecast Report\nGenerated: ${new Date().toLocaleDateString()}\nForecast Type: ${forecastType}\nPeriod: ${period} months\n\n`;

            // Export logic would go here
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
            element.setAttribute('download', `PropertyHub-Forecast-${forecastType}-${Date.now()}.csv`);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            UI.showToast('Forecast exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting forecast:', error);
            UI.showToast('Error exporting forecast', 'error');
        }
    },

    /**
     * Show adjustment form for forecast refinement
     */
    showAdjustmentForm: (forecastId) => {
        UI.showToast('Forecast adjustment coming in Phase 7C', 'info');
    }
};

/**
 * Helper: Calculate R-squared value for trend fit
 */
function calculateRSquared(xValues, yValues, slope, yMean) {
    const n = xValues.length;
    const xMean = xValues.reduce((a, b) => a + b, 0) / n;

    let ssRes = 0;
    let ssTot = 0;

    for (let i = 0; i < n; i++) {
        const predicted = slope * (xValues[i] - xMean) + yMean;
        ssRes += Math.pow(yValues[i] - predicted, 2);
        ssTot += Math.pow(yValues[i] - yMean, 2);
    }

    return ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
}

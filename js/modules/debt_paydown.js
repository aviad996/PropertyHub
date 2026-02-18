// Debt Paydown Analysis Module - Snowball vs Avalanche Strategy

const DebtPaydown = {
    /**
     * Compare Snowball vs Avalanche paydown strategies
     */
    compareStrategies: async () => {
        try {
            const mortgages = await API.getMortgages();
            if (!mortgages || mortgages.length === 0) {
                UI.showToast('No mortgages found for analysis', 'info');
                return null;
            }

            const extraPayment = 1000; // Default extra payment - should be configurable

            // Prepare mortgage data
            const mortgageData = mortgages.map(m => ({
                id: m.id,
                lender: m.lender,
                balance: parseFloat(m.current_balance) || 0,
                rate: parseFloat(m.interest_rate) || 0,
                payment: parseFloat(m.monthly_payment) || 0,
                term: parseInt(m.remaining_term_months) || 360
            })).filter(m => m.balance > 0);

            // Calculate both strategies
            const snowballResult = DebtPaydown.calculateSnowball(mortgageData, extraPayment);
            const avalancheResult = DebtPaydown.calculateAvalanche(mortgageData, extraPayment);

            return {
                snowball: snowballResult,
                avalanche: avalancheResult,
                mortgages: mortgageData,
                extraPayment
            };
        } catch (error) {
            console.error('Error comparing debt paydown strategies:', error);
            UI.showToast('Error analyzing debt paydown strategies', 'error');
            return null;
        }
    },

    /**
     * Calculate Snowball strategy (smallest balance first)
     */
    calculateSnowball: (mortgages, extraPayment) => {
        // Sort by balance (ascending - smallest first)
        const sorted = [...mortgages].sort((a, b) => a.balance - b.balance);

        let totalMonths = 0;
        let totalInterest = 0;
        const schedule = [];

        for (const mortgage of sorted) {
            const result = DebtPaydown.calculatePayoffMonths(
                mortgage.balance,
                mortgage.rate,
                mortgage.payment + extraPayment
            );

            totalMonths += result.months;
            totalInterest += result.totalInterest;

            schedule.push({
                lender: mortgage.lender,
                originalBalance: mortgage.balance,
                months: result.months,
                totalInterest: result.totalInterest,
                payoffDate: new Date(Date.now() + result.months * 30 * 24 * 60 * 60 * 1000)
            });
        }

        return {
            strategy: 'Snowball',
            description: 'Pay smallest balance first (psychological wins)',
            totalMonths,
            totalInterest,
            payoffDate: new Date(Date.now() + totalMonths * 30 * 24 * 60 * 60 * 1000),
            schedule
        };
    },

    /**
     * Calculate Avalanche strategy (highest rate first)
     */
    calculateAvalanche: (mortgages, extraPayment) => {
        // Sort by rate (descending - highest first)
        const sorted = [...mortgages].sort((a, b) => b.rate - a.rate);

        let totalMonths = 0;
        let totalInterest = 0;
        const schedule = [];

        for (const mortgage of sorted) {
            const result = DebtPaydown.calculatePayoffMonths(
                mortgage.balance,
                mortgage.rate,
                mortgage.payment + extraPayment
            );

            totalMonths += result.months;
            totalInterest += result.totalInterest;

            schedule.push({
                lender: mortgage.lender,
                originalBalance: mortgage.balance,
                rate: mortgage.rate,
                months: result.months,
                totalInterest: result.totalInterest,
                payoffDate: new Date(Date.now() + result.months * 30 * 24 * 60 * 60 * 1000)
            });
        }

        return {
            strategy: 'Avalanche',
            description: 'Pay highest rate first (saves most interest)',
            totalMonths,
            totalInterest,
            payoffDate: new Date(Date.now() + totalMonths * 30 * 24 * 60 * 60 * 1000),
            schedule
        };
    },

    /**
     * Calculate months to payoff a single loan
     */
    calculatePayoffMonths: (balance, annualRate, monthlyPayment) => {
        const monthlyRate = annualRate / 100 / 12;
        let remaining = balance;
        let months = 0;
        let totalInterest = 0;

        while (remaining > 0 && months < 600) {
            const interestPayment = remaining * monthlyRate;
            const principalPayment = monthlyPayment - interestPayment;

            if (principalPayment <= 0) {
                // Payment doesn't cover interest
                return {
                    months: Infinity,
                    totalInterest: Infinity
                };
            }

            remaining -= principalPayment;
            totalInterest += interestPayment;
            months++;
        }

        return {
            months,
            totalInterest
        };
    },

    /**
     * Load debt paydown analysis view
     */
    loadDebtPaydown: async () => {
        try {
            const container = document.getElementById('financial_analytics-content');
            if (!container) return;

            container.innerHTML = '<div class="loading">Analyzing debt paydown strategies...</div>';

            const analysis = await DebtPaydown.compareStrategies();
            if (!analysis) return;

            DebtPaydown.renderDebtPaydownAnalysis(container, analysis);
        } catch (error) {
            console.error('Error loading debt paydown analysis:', error);
            UI.showToast('Error loading debt paydown analysis', 'error');
        }
    },

    /**
     * Render debt paydown comparison
     */
    renderDebtPaydownAnalysis: (container, analysis) => {
        const snowball = analysis.snowball;
        const avalanche = analysis.avalanche;
        const savings = snowball.totalInterest - avalanche.totalInterest;
        const savingsMonths = snowball.totalMonths - avalanche.totalMonths;

        container.innerHTML = `
            <div class="debt-paydown-container">
                <div class="analysis-header">
                    <h2>Debt Paydown Strategy Analysis</h2>
                    <p class="extra-payment">Extra Monthly Payment: ${Formatting.currency(analysis.extraPayment)}</p>
                </div>

                <div class="strategy-comparison">
                    <div class="strategy-card">
                        <h3>❄️ Snowball Method</h3>
                        <div class="strategy-description">
                            Focus: Smallest balance first
                            <br/>Psychology: Quick wins and motivation
                        </div>

                        <div class="metric">
                            <span class="label">Total Payoff Time:</span>
                            <span class="value">${snowball.totalMonths} months (${Math.round(snowball.totalMonths / 12)} years)</span>
                        </div>

                        <div class="metric">
                            <span class="label">Total Interest Paid:</span>
                            <span class="value">${Formatting.currency(snowball.totalInterest)}</span>
                        </div>

                        <div class="metric">
                            <span class="label">Payoff Date:</span>
                            <span class="value">${Formatting.date(snowball.payoffDate)}</span>
                        </div>

                        <div class="schedule">
                            <h4>Payoff Order:</h4>
                            ${snowball.schedule.map((item, idx) => `
                                <div class="schedule-item">
                                    <span class="rank">${idx + 1}.</span>
                                    <span class="lender">${item.lender}</span>
                                    <span class="balance">${Formatting.currency(item.originalBalance)}</span>
                                    <span class="months">${item.months} months</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="strategy-card">
                        <h3>⚡ Avalanche Method</h3>
                        <div class="strategy-description">
                            Focus: Highest interest rate first
                            <br/>Financial: Saves the most interest
                        </div>

                        <div class="metric">
                            <span class="label">Total Payoff Time:</span>
                            <span class="value">${avalanche.totalMonths} months (${Math.round(avalanche.totalMonths / 12)} years)</span>
                        </div>

                        <div class="metric">
                            <span class="label">Total Interest Paid:</span>
                            <span class="value">${Formatting.currency(avalanche.totalInterest)}</span>
                        </div>

                        <div class="metric">
                            <span class="label">Payoff Date:</span>
                            <span class="value">${Formatting.date(avalanche.payoffDate)}</span>
                        </div>

                        <div class="schedule">
                            <h4>Payoff Order:</h4>
                            ${avalanche.schedule.map((item, idx) => `
                                <div class="schedule-item">
                                    <span class="rank">${idx + 1}.</span>
                                    <span class="lender">${item.lender}</span>
                                    <span class="balance">${Formatting.currency(item.originalBalance)}</span>
                                    <span class="months">${item.months} months</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="comparison-summary">
                    <h3>Comparison Summary</h3>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="label">Interest Savings (Avalanche):</span>
                            <span class="value ${savings > 0 ? 'positive' : 'neutral'}">${savings > 0 ? '+' : ''}${Formatting.currency(savings)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Time Savings (Avalanche):</span>
                            <span class="value ${savingsMonths > 0 ? 'positive' : 'neutral'}">${savingsMonths > 0 ? '+' : ''}${savingsMonths} months</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Recommendation:</span>
                            <span class="value recommendation">
                                ${savings > 10000 ? '⭐ Use Avalanche (significant savings)' :
                                  savings > 0 ? '📊 Use Avalanche (modest savings)' :
                                  '✓ Either method works'}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="actions">
                    <button class="btn-primary" onclick="FinancialAnalytics.loadFinancialAnalytics()">Back to Dashboard</button>
                    <button class="btn-secondary" onclick="DebtPaydown.exportAnalysis()">📊 Export Analysis</button>
                </div>
            </div>
        `;
    },

    /**
     * Export debt paydown analysis
     */
    exportAnalysis: async () => {
        try {
            const analysis = await DebtPaydown.compareStrategies();
            if (!analysis) return;

            const csv = DebtPaydown.generateCSV(analysis);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `debt-paydown-analysis-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            UI.showToast('Analysis exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting analysis:', error);
            UI.showToast('Error exporting analysis', 'error');
        }
    },

    /**
     * Generate CSV from analysis
     */
    generateCSV: (analysis) => {
        let csv = 'Debt Paydown Strategy Comparison\n';
        csv += `Generated: ${new Date().toISOString()}\n`;
        csv += `Extra Monthly Payment: $${analysis.extraPayment}\n\n`;

        csv += 'SNOWBALL METHOD\n';
        csv += `Total Payoff Time: ${analysis.snowball.totalMonths} months\n`;
        csv += `Total Interest Paid: $${analysis.snowball.totalInterest.toFixed(2)}\n`;
        csv += `Payoff Date: ${analysis.snowball.payoffDate.toLocaleDateString()}\n`;
        csv += 'Lender,Balance,Months\n';
        analysis.snowball.schedule.forEach(item => {
            csv += `"${item.lender}","$${item.originalBalance.toFixed(2)}",${item.months}\n`;
        });

        csv += '\n\nAVALANCHE METHOD\n';
        csv += `Total Payoff Time: ${analysis.avalanche.totalMonths} months\n`;
        csv += `Total Interest Paid: $${analysis.avalanche.totalInterest.toFixed(2)}\n`;
        csv += `Payoff Date: ${analysis.avalanche.payoffDate.toLocaleDateString()}\n`;
        csv += 'Lender,Balance,Months\n';
        analysis.avalanche.schedule.forEach(item => {
            csv += `"${item.lender}","$${item.originalBalance.toFixed(2)}",${item.months}\n`;
        });

        return csv;
    }
};

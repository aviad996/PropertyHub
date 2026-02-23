// Investment Analysis Engine - ROI Ranking & Strategic Recommendations

const InvestmentAnalysis = {
    /**
     * Initialize investment analysis module
     */
    init: async () => {
        try {
            await InvestmentAnalysis.loadInvestmentData();
        } catch (error) {
            console.error('Error initializing investment analysis:', error);
        }
    },

    /**
     * Load investment data (computed from existing property/mortgage/expense data)
     */
    loadInvestmentData: async () => {
        try {
            // Investment analysis is computed from existing data, no dedicated API endpoint needed
            InvestmentAnalysis.investments = [];
            return InvestmentAnalysis.investments;
        } catch (error) {
            console.error('Error loading investment data:', error);
            InvestmentAnalysis.investments = [];
            return [];
        }
    },

    /**
     * Comprehensive investment analysis for each property
     */
    analyzeInvestmentPerformance: async () => {
        try {
            const properties = await API.getProperties() || [];
            const mortgages = await API.getMortgages() || [];
            const expenses = await API.getExpenses() || [];
            const rentPayments = await API.getRentPayments() || [];

            if (properties.length === 0) return null;

            const analysisResults = {
                properties: [],
                topPerformers: [],
                improvementOpportunities: [],
                riskAssessments: [],
                recommendations: []
            };

            // Analyze each property
            for (const property of properties) {
                const propMortgages = mortgages.filter(m => String(m.property_id) === String(property.id));
                const propExpenses = expenses.filter(e => String(e.property_id) === String(property.id));
                const propRents = rentPayments.filter(r => String(r.property_id) === String(property.id));

                const analysis = InvestmentAnalysis.calculatePropertyInvestmentMetrics(
                    property,
                    propMortgages,
                    propExpenses,
                    propRents
                );

                analysis.property = property;
                analysisResults.properties.push(analysis);
            }

            // Sort by ROI (descending)
            analysisResults.topPerformers = analysisResults.properties
                .sort((a, b) => b.roi - a.roi)
                .slice(0, 5);

            // Identify improvement opportunities
            analysisResults.improvementOpportunities = InvestmentAnalysis.identifyImprovementOpportunities(
                analysisResults.properties
            );

            // Risk assessments
            analysisResults.riskAssessments = analysisResults.properties.map(p => ({
                property: p.property.address,
                riskScore: InvestmentAnalysis.calculatePropertyRiskScore(p),
                riskLevel: InvestmentAnalysis.getRiskLevel(InvestmentAnalysis.calculatePropertyRiskScore(p))
            }));

            // Generate recommendations
            analysisResults.recommendations = InvestmentAnalysis.generateInvestmentRecommendations(
                analysisResults
            );

            return analysisResults;
        } catch (error) {
            console.error('Error analyzing investment performance:', error);
            return null;
        }
    },

    /**
     * Calculate comprehensive investment metrics for a property
     */
    calculatePropertyInvestmentMetrics: (property, mortgages, expenses, rentPayments) => {
        // Basic financial data
        const purchasePrice = parseFloat(property.purchase_price) || 0;
        const currentValue = parseFloat(property.current_value) || 0;
        const purchaseDate = new Date(property.purchase_date);
        const monthsOwned = Math.max(1, (new Date() - purchaseDate) / (1000 * 60 * 60 * 24 * 30));
        const yearsOwned = monthsOwned / 12;

        // Revenue
        const annualRent = rentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const totalRentCollected = annualRent * yearsOwned;

        // Expenses
        const annualExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const totalExpensesPaid = annualExpenses * yearsOwned;

        // Debt metrics
        const totalDebt = mortgages.reduce((sum, m) => sum + (parseFloat(m.current_balance) || 0), 0);
        const initialDebt = mortgages.reduce((sum, m) => sum + (parseFloat(m.balance) || parseFloat(m.current_balance) || 0), 0);
        const debtPaid = Math.max(0, initialDebt - totalDebt);
        const monthlyDebtService = mortgages.reduce((sum, m) => sum + (parseFloat(m.monthly_payment) || 0), 0);
        const totalDebtServicePaid = monthlyDebtService * monthsOwned;

        // Equity
        const currentEquity = currentValue - totalDebt;
        const initialEquity = purchasePrice - initialDebt;
        const equityGain = currentEquity - initialEquity;

        // Appreciation
        const propertyAppreciation = currentValue - purchasePrice;
        const appreciationRate = purchasePrice > 0 ? (propertyAppreciation / purchasePrice) * 100 : 0;
        const annualAppreciation = propertyAppreciation / yearsOwned;

        // Cash flow metrics
        const annualNOI = annualRent - annualExpenses;
        const monthlyNOI = annualNOI / 12;
        const totalNOI = annualNOI * yearsOwned;
        const netCashFlow = totalNOI - debtPaid; // Total NOI minus what went to principal

        // Return calculations
        const capRate = currentValue > 0 ? (annualNOI / currentValue) * 100 : 0;
        const cashOnCash = initialDebt > 0 ? (annualNOI / initialDebt) * 100 : 0;

        // IRR-like calculation (simplified)
        const totalCashInvested = Math.max(initialEquity, 1);
        const totalCashReturned = totalNOI + debtPaid + currentEquity - initialEquity;
        const irr = Math.pow(totalCashReturned / totalCashInvested, 1 / yearsOwned) - 1;

        // ROI metrics
        const roi = ((currentEquity - initialEquity + totalNOI) / totalCashInvested) * 100;
        const annualROI = roi / yearsOwned;
        const cumulativeROI = roi;

        // Leverage metrics
        const ltv = currentValue > 0 ? (totalDebt / currentValue) * 100 : 0;
        const debtToEquityRatio = currentEquity > 0 ? totalDebt / currentEquity : 0;

        // Performance scoring
        const performanceScore = InvestmentAnalysis.calculatePerformanceScore({
            roi: annualROI,
            capRate,
            cashOnCash,
            ltv,
            cashFlow: monthlyNOI
        });

        // Expense efficiency
        const expenseRatio = annualRent > 0 ? (annualExpenses / annualRent) * 100 : 0;

        return {
            address: property.address,
            purchasePrice,
            purchaseDate: property.purchase_date,
            currentValue,
            yearsOwned,
            monthsOwned,
            annualRent,
            annualExpenses,
            annualNOI,
            monthlyNOI,
            totalRentCollected,
            totalExpensesPaid,
            totalNOI,
            totalDebt,
            initialDebt,
            debtPaid,
            currentEquity,
            initialEquity,
            equityGain,
            propertyAppreciation,
            appreciationRate,
            annualAppreciation,
            capRate,
            cashOnCash,
            roi,
            annualROI,
            cumulativeROI,
            irr: Math.max(0, irr * 100), // Convert to percentage
            ltv,
            debtToEquityRatio,
            expenseRatio,
            performanceScore,
            netCashFlow
        };
    },

    /**
     * Calculate performance score (0-100)
     */
    calculatePerformanceScore: (metrics) => {
        let score = 0;

        // ROI component (40 points)
        if (metrics.roi >= 20) score += 40;
        else if (metrics.roi >= 15) score += 30;
        else if (metrics.roi >= 10) score += 20;
        else if (metrics.roi >= 5) score += 10;

        // Cap rate component (30 points)
        if (metrics.capRate >= 6) score += 30;
        else if (metrics.capRate >= 5) score += 25;
        else if (metrics.capRate >= 4) score += 15;
        else if (metrics.capRate >= 3) score += 5;

        // LTV component (20 points) - lower is better
        if (metrics.ltv <= 60) score += 20;
        else if (metrics.ltv <= 70) score += 15;
        else if (metrics.ltv <= 80) score += 10;
        else if (metrics.ltv <= 90) score += 5;

        // Cash flow component (10 points)
        if (metrics.cashFlow > 1000) score += 10;
        else if (metrics.cashFlow > 500) score += 7;
        else if (metrics.cashFlow > 0) score += 3;

        return Math.min(100, score);
    },

    /**
     * Calculate property risk score (0-100, higher = more risky)
     */
    calculatePropertyRiskScore: (analysis) => {
        let riskScore = 0;

        // LTV risk
        if (analysis.ltv > 90) riskScore += 35;
        else if (analysis.ltv > 80) riskScore += 20;
        else if (analysis.ltv > 70) riskScore += 10;

        // Cash flow risk
        if (analysis.monthlyNOI < 0) riskScore += 40;
        else if (analysis.monthlyNOI < 500) riskScore += 20;
        else if (analysis.monthlyNOI < 1000) riskScore += 10;

        // Performance risk
        if (analysis.roi < 5) riskScore += 20;
        else if (analysis.roi < 10) riskScore += 10;

        // Debt burden
        const debtServiceCoverage = analysis.annualNOI / (analysis.monthlyDebtService * 12);
        if (debtServiceCoverage < 1.2) riskScore += 15;
        else if (debtServiceCoverage < 1.5) riskScore += 10;

        return Math.min(100, riskScore);
    },

    /**
     * Get risk level label
     */
    getRiskLevel: (riskScore) => {
        if (riskScore > 60) return 'High';
        if (riskScore > 30) return 'Medium';
        return 'Low';
    },

    /**
     * Identify improvement opportunities
     */
    identifyImprovementOpportunities: (properties) => {
        const opportunities = [];

        for (const prop of properties) {
            // High expense ratio
            if (prop.expenseRatio > 40) {
                opportunities.push({
                    property: prop.address,
                    type: 'expense_reduction',
                    title: 'Expense Optimization Opportunity',
                    description: `Expense ratio of ${prop.expenseRatio.toFixed(1)}% is high. Potential savings: $${(prop.annualRent * 0.05).toFixed(0)}/year.`,
                    potential: 'High',
                    impact: `Could increase NOI to $${(prop.annualNOI + prop.annualRent * 0.05).toFixed(0)}/year`
                });
            }

            // Below-average cap rate
            if (prop.capRate < 4) {
                opportunities.push({
                    property: prop.address,
                    type: 'rent_increase',
                    title: 'Rent Increase Opportunity',
                    description: `Cap rate of ${prop.capRate.toFixed(2)}% suggests room for rent increases. 5% rent increase: $${(prop.annualRent * 0.05).toFixed(0)}/year.`,
                    potential: 'Medium',
                    impact: `Could increase cap rate to ${((prop.annualNOI + prop.annualRent * 0.05) / prop.currentValue * 100).toFixed(2)}%`
                });
            }

            // High LTV opportunity for refinancing
            if (prop.ltv > 75 && prop.roi > 10) {
                opportunities.push({
                    property: prop.address,
                    type: 'refinance_strategy',
                    title: 'Refinancing Opportunity',
                    description: `With ${prop.roi.toFixed(1)}% ROI and ${prop.ltv.toFixed(1)}% LTV, strong refinance candidate to extract equity.`,
                    potential: 'High',
                    impact: `Could redeploy capital while maintaining cash flow`
                });
            }

            // Strong performer - hold and monitor
            if (prop.performanceScore > 75) {
                opportunities.push({
                    property: prop.address,
                    type: 'hold_strategy',
                    title: 'Anchor Asset - Hold Strategy',
                    description: `Strong performer with ${prop.performanceScore.toFixed(0)}/100 score. Maintain current strategy.`,
                    potential: 'Hold',
                    impact: `Stable cash flow generator`
                });
            }
        }

        return opportunities;
    },

    /**
     * Generate investment recommendations
     */
    generateInvestmentRecommendations: (analysis) => {
        const recommendations = [];
        const properties = analysis.properties;

        // Portfolio composition analysis
        const avgROI = properties.reduce((sum, p) => sum + p.roi, 0) / properties.length;
        const avgCapRate = properties.reduce((sum, p) => sum + p.capRate, 0) / properties.length;
        const avgLTV = properties.reduce((sum, p) => sum + p.ltv, 0) / properties.length;

        // Recommendation 1: Portfolio rebalancing
        const lowPerformers = properties.filter(p => p.roi < avgROI * 0.7).length;
        if (lowPerformers > 0) {
            recommendations.push({
                priority: 'High',
                type: 'portfolio_rebalancing',
                title: 'Portfolio Rebalancing',
                description: `${lowPerformers} property(s) underperforming portfolio average. Consider strategic repositioning or sale.`,
                action: 'Review underperformers for turnaround or exit strategy'
            });
        }

        // Recommendation 2: Capital deployment
        if (avgLTV < 65) {
            recommendations.push({
                priority: 'Medium',
                type: 'capital_deployment',
                title: 'Capital Deployment Opportunity',
                description: `Portfolio LTV at ${avgLTV.toFixed(1)}% indicates capacity for strategic acquisitions.`,
                action: 'Evaluate acquisition opportunities that meet or exceed portfolio average metrics'
            });
        }

        // Recommendation 3: Debt optimization
        const highDebtProperties = properties.filter(p => p.ltv > 85).length;
        if (highDebtProperties > 0) {
            recommendations.push({
                priority: 'Medium',
                type: 'debt_optimization',
                title: 'Debt Optimization Strategy',
                description: `${highDebtProperties} property(s) with LTV > 85%. Refinancing strategy recommended.`,
                action: 'Evaluate refinancing to reduce leverage or extract equity for acquisitions'
            });
        }

        // Recommendation 4: Cash flow focus
        const negCashFlow = properties.filter(p => p.monthlyNOI < 0).length;
        if (negCashFlow > 0) {
            recommendations.push({
                priority: 'High',
                type: 'cash_flow_improvement',
                title: 'Cash Flow Improvement Urgent',
                description: `${negCashFlow} property(s) with negative cash flow. Immediate action required.`,
                action: 'Implement rent increases, expense reduction, or consider strategic sale'
            });
        }

        return recommendations;
    },

    /**
     * Load investment analysis view
     */
    loadInvestmentAnalysis: async () => {
        try {
            const container = document.getElementById('investment_analysis-content');
            if (!container) return;

            container.innerHTML = '<div class="loading">Analyzing investment performance...</div>';

            const analysis = await InvestmentAnalysis.analyzeInvestmentPerformance();
            if (!analysis) {
                UI.showToast('No data available for investment analysis', 'info');
                return;
            }

            InvestmentAnalysis.renderInvestmentAnalysis(container, analysis);
        } catch (error) {
            console.error('Error loading investment analysis:', error);
            UI.showToast('Error loading investment analysis', 'error');
        }
    },

    /**
     * Render investment analysis dashboard
     */
    renderInvestmentAnalysis: (container, analysis) => {
        const properties = analysis.properties.sort((a, b) => b.roi - a.roi);
        const topPerformers = analysis.topPerformers;
        const risks = analysis.riskAssessments.sort((a, b) => b.riskScore - a.riskScore);

        container.innerHTML = `
            <div class="investment-analysis-container">
                <div class="analysis-header">
                    <h2>Investment Performance Analysis</h2>
                    <p class="subheader">ROI ranking and strategic recommendations</p>
                </div>

                <div class="portfolio-overview">
                    <h3>Portfolio Summary</h3>
                    <div class="portfolio-stats">
                        <div class="stat-card">
                            <span class="stat-label">Average ROI</span>
                            <span class="stat-value">${(properties.reduce((sum, p) => sum + p.roi, 0) / properties.length).toFixed(2)}%</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Average Cap Rate</span>
                            <span class="stat-value">${(properties.reduce((sum, p) => sum + p.capRate, 0) / properties.length).toFixed(2)}%</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Total Annual NOI</span>
                            <span class="stat-value">${Formatting.currency(properties.reduce((sum, p) => sum + p.annualNOI, 0))}</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Properties</span>
                            <span class="stat-value">${properties.length}</span>
                        </div>
                    </div>
                </div>

                ${topPerformers.length > 0 ? `
                    <div class="top-performers-section">
                        <h3>🏆 Top Performing Properties (by ROI)</h3>
                        <div class="performers-grid">
                            ${topPerformers.map((prop, idx) => `
                                <div class="performer-card">
                                    <div class="rank-badge">#${idx + 1}</div>
                                    <strong>${prop.address}</strong>
                                    <div class="performer-metrics">
                                        <div class="metric">
                                            <span class="label">Annual ROI</span>
                                            <span class="value">${prop.annualROI.toFixed(2)}%</span>
                                        </div>
                                        <div class="metric">
                                            <span class="label">Cap Rate</span>
                                            <span class="value">${prop.capRate.toFixed(2)}%</span>
                                        </div>
                                        <div class="metric">
                                            <span class="label">Monthly NOI</span>
                                            <span class="value">${Formatting.currency(prop.monthlyNOI)}</span>
                                        </div>
                                        <div class="metric">
                                            <span class="label">Appreciation</span>
                                            <span class="value ${prop.propertyAppreciation > 0 ? 'positive' : 'negative'}">
                                                ${prop.propertyAppreciation > 0 ? '+' : ''}${Formatting.currency(prop.propertyAppreciation)}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="performance-score">
                                        <span class="score-label">Performance Score</span>
                                        <span class="score-value">${prop.performanceScore.toFixed(0)}/100</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="risk-assessment-section">
                    <h3>⚠️ Risk Assessment</h3>
                    <div class="risk-grid">
                        ${risks.slice(0, 5).map(risk => `
                            <div class="risk-card risk-${risk.riskLevel.toLowerCase()}">
                                <strong>${risk.property}</strong>
                                <div class="risk-score">${risk.riskScore.toFixed(0)}/100</div>
                                <span class="risk-level">${risk.riskLevel} Risk</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${analysis.recommendations.length > 0 ? `
                    <div class="recommendations-section">
                        <h3>💡 Investment Recommendations</h3>
                        <div class="recommendations-list">
                            ${analysis.recommendations.map(rec => `
                                <div class="recommendation ${rec.priority.toLowerCase()}">
                                    <div class="rec-header">
                                        <strong>${rec.title}</strong>
                                        <span class="priority-badge">${rec.priority}</span>
                                    </div>
                                    <p class="rec-description">${rec.description}</p>
                                    <div class="rec-action">
                                        <span class="action-label">Action:</span>
                                        <span class="action-text">${rec.action}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${analysis.improvementOpportunities.length > 0 ? `
                    <div class="opportunities-section">
                        <h3>📈 Improvement Opportunities</h3>
                        <div class="opportunities-list">
                            ${analysis.improvementOpportunities.slice(0, 6).map(opp => `
                                <div class="opportunity-card">
                                    <div class="opp-header">
                                        <strong>${opp.title}</strong>
                                        <span class="potential-badge">${opp.potential}</span>
                                    </div>
                                    <span class="property-name">${opp.property}</span>
                                    <p class="opp-description">${opp.description}</p>
                                    <div class="opp-impact">
                                        <strong>Impact:</strong> ${opp.impact}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="detailed-ranking">
                    <h3>Complete Property Ranking by ROI</h3>
                    <table class="ranking-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Address</th>
                                <th>Annual ROI</th>
                                <th>Cap Rate</th>
                                <th>Years Owned</th>
                                <th>Annual NOI</th>
                                <th>Performance Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${properties.map((prop, idx) => `
                                <tr>
                                    <td class="rank-number">${idx + 1}</td>
                                    <td>${prop.address}</td>
                                    <td class="metric-value positive">${prop.annualROI.toFixed(2)}%</td>
                                    <td class="metric-value">${prop.capRate.toFixed(2)}%</td>
                                    <td>${prop.yearsOwned.toFixed(1)}</td>
                                    <td>${Formatting.currency(prop.annualNOI)}</td>
                                    <td>
                                        <span class="score-badge">${prop.performanceScore.toFixed(0)}</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="detailed-metrics">
                    <h3>Detailed Investment Metrics</h3>
                    <div class="metrics-tabs">
                        ${properties.map((prop, idx) => `
                            <div class="metric-tab-content" id="tab-${idx}" style="display: ${idx === 0 ? 'block' : 'none'}">
                                <div class="property-details-grid">
                                    <div class="details-section">
                                        <h4>Purchase & Current Value</h4>
                                        <div class="detail-item">
                                            <span>Purchase Price</span>
                                            <span>${Formatting.currency(prop.purchasePrice)}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span>Current Value</span>
                                            <span>${Formatting.currency(prop.currentValue)}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span>Property Appreciation</span>
                                            <span class="positive">+${Formatting.currency(prop.propertyAppreciation)}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span>Appreciation Rate</span>
                                            <span>${prop.appreciationRate.toFixed(2)}%</span>
                                        </div>
                                    </div>

                                    <div class="details-section">
                                        <h4>Revenue & Expenses</h4>
                                        <div class="detail-item">
                                            <span>Annual Rent</span>
                                            <span>${Formatting.currency(prop.annualRent)}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span>Annual Expenses</span>
                                            <span>${Formatting.currency(prop.annualExpenses)}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span>Annual NOI</span>
                                            <span class="positive">${Formatting.currency(prop.annualNOI)}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span>Expense Ratio</span>
                                            <span>${prop.expenseRatio.toFixed(1)}%</span>
                                        </div>
                                    </div>

                                    <div class="details-section">
                                        <h4>Debt Metrics</h4>
                                        <div class="detail-item">
                                            <span>Current Debt</span>
                                            <span>${Formatting.currency(prop.totalDebt)}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span>Principal Paid</span>
                                            <span class="positive">${Formatting.currency(prop.debtPaid)}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span>LTV</span>
                                            <span>${prop.ltv.toFixed(1)}%</span>
                                        </div>
                                        <div class="detail-item">
                                            <span>Debt-to-Equity Ratio</span>
                                            <span>${prop.debtToEquityRatio.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div class="details-section">
                                        <h4>Returns & Performance</h4>
                                        <div class="detail-item">
                                            <span>Annual ROI</span>
                                            <span class="positive">${prop.annualROI.toFixed(2)}%</span>
                                        </div>
                                        <div class="detail-item">
                                            <span>Cumulative ROI</span>
                                            <span class="positive">${prop.cumulativeROI.toFixed(2)}%</span>
                                        </div>
                                        <div class="detail-item">
                                            <span>IRR (Annualized)</span>
                                            <span class="positive">${prop.irr.toFixed(2)}%</span>
                                        </div>
                                        <div class="detail-item">
                                            <span>Years Owned</span>
                                            <span>${prop.yearsOwned.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="metrics-navigation">
                        ${properties.map((prop, idx) => `
                            <button class="metric-nav-btn ${idx === 0 ? 'active' : ''}"
                                    onclick="InvestmentAnalysis.switchMetricTab(${idx}, ${properties.length})">
                                ${prop.address.split(',')[0]}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="analysis-actions">
                    <button class="btn-primary" onclick="FinancialAnalytics.loadFinancialAnalytics()">
                        Back to Dashboard
                    </button>
                    <button class="btn-secondary" onclick="InvestmentAnalysis.exportAnalysisReport()">
                        📊 Export Full Report
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Switch between detailed metric tabs
     */
    switchMetricTab: (tabIndex, totalTabs) => {
        for (let i = 0; i < totalTabs; i++) {
            const tabContent = document.getElementById(`tab-${i}`);
            if (tabContent) {
                tabContent.style.display = i === tabIndex ? 'block' : 'none';
            }
        }

        // Update button styles
        const buttons = document.querySelectorAll('.metric-nav-btn');
        buttons.forEach((btn, idx) => {
            btn.classList.toggle('active', idx === tabIndex);
        });
    },

    /**
     * Export comprehensive analysis report
     */
    exportAnalysisReport: async () => {
        try {
            const analysis = await InvestmentAnalysis.analyzeInvestmentPerformance();
            if (!analysis) {
                UI.showToast('Error generating report', 'error');
                return;
            }

            const csv = InvestmentAnalysis.generateAnalysisCSV(analysis);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `investment-analysis-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            UI.showToast('Analysis report exported', 'success');
        } catch (error) {
            console.error('Error exporting report:', error);
            UI.showToast('Error exporting report', 'error');
        }
    },

    /**
     * Generate comprehensive CSV report
     */
    generateAnalysisCSV: (analysis) => {
        let csv = 'Investment Analysis Report\n';
        csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;

        csv += 'PORTFOLIO SUMMARY\n';
        const props = analysis.properties;
        const avgROI = props.reduce((sum, p) => sum + p.roi, 0) / props.length;
        const avgCapRate = props.reduce((sum, p) => sum + p.capRate, 0) / props.length;
        csv += `Average Annual ROI: ${avgROI.toFixed(2)}%\n`;
        csv += `Average Cap Rate: ${avgCapRate.toFixed(2)}%\n`;
        csv += `Total Properties: ${props.length}\n`;
        csv += `Total Annual NOI: ${props.reduce((sum, p) => sum + p.annualNOI, 0).toFixed(2)}\n\n`;

        csv += 'PROPERTY-LEVEL ANALYSIS\n';
        csv += 'Rank,Address,Annual ROI,Cap Rate,Annual NOI,Current Value,Total Debt,Years Owned,Performance Score\n';
        props.sort((a, b) => b.roi - a.roi).forEach((prop, idx) => {
            csv += `${idx + 1},"${prop.address}",${prop.annualROI.toFixed(2)}%,${prop.capRate.toFixed(2)}%,${prop.annualNOI.toFixed(0)},${prop.currentValue.toFixed(0)},${prop.totalDebt.toFixed(0)},${prop.yearsOwned.toFixed(2)},${prop.performanceScore.toFixed(0)}\n`;
        });

        csv += '\n\nRECOMMENDATIONS\n';
        csv += 'Priority,Title,Description\n';
        analysis.recommendations.forEach(rec => {
            csv += `"${rec.priority}","${rec.title}","${rec.description}"\n`;
        });

        return csv;
    }
};

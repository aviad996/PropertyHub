// Portfolio Benchmarking System - Regional & Peer Comparison

const PortfolioBenchmarking = {
    /**
     * Initialize benchmarking module
     */
    init: async () => {
        try {
            await PortfolioBenchmarking.loadBenchmarkData();
        } catch (error) {
            console.error('Error initializing benchmarking:', error);
        }
    },

    /**
     * Load benchmark reference data
     */
    loadBenchmarkData: async () => {
        try {
            PortfolioBenchmarking.benchmarks = await API.getBenchmarkData() || PortfolioBenchmarking.getDefaultBenchmarks();
            return PortfolioBenchmarking.benchmarks;
        } catch (error) {
            console.error('Error loading benchmark data:', error);
            PortfolioBenchmarking.benchmarks = PortfolioBenchmarking.getDefaultBenchmarks();
            return PortfolioBenchmarking.benchmarks;
        }
    },

    /**
     * Get default benchmark data by region (based on NAR and CoStar data)
     */
    getDefaultBenchmarks: () => ({
        national: {
            capRate: 5.2,
            cashOnCash: 8.5,
            irr: 12.3,
            appreciation: 3.2,
            expenseRatio: 32,
            ltv: 70,
            cashFlowPerUnit: 450
        },
        regions: {
            'Northeast': {
                capRate: 4.1,
                cashOnCash: 6.8,
                irr: 10.5,
                appreciation: 2.5,
                expenseRatio: 35,
                ltv: 65
            },
            'Midwest': {
                capRate: 5.8,
                cashOnCash: 9.2,
                irr: 13.1,
                appreciation: 2.8,
                expenseRatio: 30,
                ltv: 72
            },
            'South': {
                capRate: 5.5,
                cashOnCash: 8.8,
                irr: 12.8,
                appreciation: 3.1,
                expenseRatio: 31,
                ltv: 71
            },
            'West': {
                capRate: 4.3,
                cashOnCash: 7.1,
                irr: 11.2,
                appreciation: 3.8,
                expenseRatio: 34,
                ltv: 68
            }
        },
        propertyTypes: {
            'Single Family': {
                capRate: 5.0,
                cashOnCash: 8.2,
                irr: 11.9,
                appreciation: 3.1,
                expenseRatio: 31
            },
            'Multi-Unit': {
                capRate: 5.5,
                cashOnCash: 8.8,
                irr: 12.7,
                appreciation: 3.0,
                expenseRatio: 30
            },
            'Mixed Use': {
                capRate: 5.3,
                cashOnCash: 8.5,
                irr: 12.3,
                appreciation: 3.2,
                expenseRatio: 33
            }
        }
    }),

    /**
     * Analyze portfolio against benchmarks
     */
    analyzeAgainstBenchmarks: async () => {
        try {
            const properties = await API.getProperties() || [];
            const mortgages = await API.getMortgages() || [];
            const expenses = await API.getExpenses() || [];
            const rentPayments = await API.getRentPayments() || [];

            if (properties.length === 0) return null;

            const benchmarks = PortfolioBenchmarking.benchmarks;
            const analysis = {
                portfolio: {},
                properties: [],
                gaps: {},
                opportunities: []
            };

            // Calculate portfolio metrics
            analysis.portfolio = PortfolioBenchmarking.calculatePortfolioMetrics(
                properties,
                mortgages,
                expenses,
                rentPayments
            );

            // Calculate per-property metrics
            for (const property of properties) {
                const propMetrics = PortfolioBenchmarking.calculatePropertyMetrics(
                    property,
                    mortgages.filter(m => m.property_id === property.id),
                    expenses.filter(e => e.property_id === property.id),
                    rentPayments.filter(r => r.property_id === property.id)
                );

                // Get benchmark for this property
                const regional = benchmarks.regions[property.state] || benchmarks.national;
                const typeYBench = benchmarks.propertyTypes[property.type] || benchmarks.propertyTypes['Single Family'];

                const performance = PortfolioBenchmarking.getPropertyPerformance(propMetrics, regional, typeYBench);

                analysis.properties.push({
                    id: property.id,
                    address: property.address,
                    metrics: propMetrics,
                    benchmark: regional,
                    performance
                });
            }

            // Calculate performance gaps
            analysis.gaps = PortfolioBenchmarking.calculateGaps(analysis.portfolio, benchmarks.national);

            // Identify opportunities
            analysis.opportunities = PortfolioBenchmarking.identifyOpportunities(analysis);

            return analysis;
        } catch (error) {
            console.error('Error analyzing against benchmarks:', error);
            return null;
        }
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
        let propertyCount = 0;

        for (const property of properties) {
            totalValue += parseFloat(property.current_value) || 0;
            propertyCount++;

            const propMortgages = mortgages.filter(m => m.property_id === property.id);
            totalDebt += propMortgages.reduce((sum, m) => sum + (parseFloat(m.current_balance) || 0), 0);
            totalDebtService += propMortgages.reduce((sum, m) => sum + (parseFloat(m.monthly_payment) || 0), 0);

            const propExpenses = expenses.filter(e => e.property_id === property.id);
            totalExpenses += propExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        }

        totalRent = rentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

        const totalEquity = totalValue - totalDebt;
        const annualNOI = totalRent - totalExpenses;
        const monthlyNOI = annualNOI / 12;
        const ltv = totalValue > 0 ? (totalDebt / totalValue) * 100 : 0;
        const capRate = totalValue > 0 ? (annualNOI / totalValue) * 100 : 0;
        const expenseRatio = totalRent > 0 ? (totalExpenses / totalRent) * 100 : 0;
        const cashOnCash = totalDebt > 0 ? (annualNOI / totalDebt) * 100 : 0;

        return {
            totalValue,
            totalDebt,
            totalEquity,
            totalRent,
            totalExpenses,
            annualNOI,
            monthlyNOI,
            totalDebtService,
            ltv,
            capRate,
            expenseRatio,
            cashOnCash,
            propertyCount,
            avgValuePerProperty: totalValue / propertyCount,
            avgCapRate: capRate,
            debtServiceRatio: totalRent > 0 ? (totalDebtService * 12 / totalRent) * 100 : 0
        };
    },

    /**
     * Calculate metrics for a single property
     */
    calculatePropertyMetrics: (property, mortgages, expenses, rentPayments) => {
        const annualRent = rentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const monthlyRent = annualRent / 12;
        const annualExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const totalDebt = mortgages.reduce((sum, m) => sum + (parseFloat(m.current_balance) || 0), 0);
        const monthlyDebtService = mortgages.reduce((sum, m) => sum + (parseFloat(m.monthly_payment) || 0), 0);
        const currentValue = parseFloat(property.current_value) || 0;

        const annualNOI = annualRent - annualExpenses;
        const ltv = currentValue > 0 ? (totalDebt / currentValue) * 100 : 0;
        const capRate = currentValue > 0 ? (annualNOI / currentValue) * 100 : 0;
        const expenseRatio = annualRent > 0 ? (annualExpenses / annualRent) * 100 : 0;
        const cashOnCash = totalDebt > 0 ? (annualNOI / totalDebt) * 100 : 0;

        return {
            address: property.address,
            monthlyRent,
            annualRent,
            annualExpenses,
            annualNOI,
            totalDebt,
            monthlyDebtService,
            currentValue,
            ltv,
            capRate,
            expenseRatio,
            cashOnCash
        };
    },

    /**
     * Get performance against benchmark
     */
    getPropertyPerformance: (metrics, benchmark, typeBench) => {
        return {
            capRate: {
                value: metrics.capRate,
                benchmark: (benchmark.capRate + typeBench.capRate) / 2,
                variance: metrics.capRate - (benchmark.capRate + typeBench.capRate) / 2,
                vs: metrics.capRate > ((benchmark.capRate + typeBench.capRate) / 2) ? 'Above' : 'Below'
            },
            cashOnCash: {
                value: metrics.cashOnCash,
                benchmark: (benchmark.cashOnCash + typeBench.cashOnCash) / 2,
                variance: metrics.cashOnCash - (benchmark.cashOnCash + typeBench.cashOnCash) / 2,
                vs: metrics.cashOnCash > ((benchmark.cashOnCash + typeBench.cashOnCash) / 2) ? 'Above' : 'Below'
            },
            expenseRatio: {
                value: metrics.expenseRatio,
                benchmark: (benchmark.expenseRatio + typeBench.expenseRatio) / 2,
                variance: (benchmark.expenseRatio + typeBench.expenseRatio) / 2 - metrics.expenseRatio, // Lower is better
                vs: metrics.expenseRatio < ((benchmark.expenseRatio + typeBench.expenseRatio) / 2) ? 'Better' : 'Worse'
            },
            ltv: {
                value: metrics.ltv,
                benchmark: benchmark.ltv,
                variance: benchmark.ltv - metrics.ltv, // Lower is better
                vs: metrics.ltv < benchmark.ltv ? 'Better' : 'Worse'
            }
        };
    },

    /**
     * Calculate performance gaps
     */
    calculateGaps: (portfolio, national) => {
        return {
            capRate: {
                portfolio: portfolio.capRate,
                benchmark: national.capRate,
                gap: portfolio.capRate - national.capRate,
                pct: ((portfolio.capRate - national.capRate) / national.capRate) * 100
            },
            cashOnCash: {
                portfolio: portfolio.cashOnCash,
                benchmark: national.cashOnCash,
                gap: portfolio.cashOnCash - national.cashOnCash,
                pct: ((portfolio.cashOnCash - national.cashOnCash) / national.cashOnCash) * 100
            },
            expenseRatio: {
                portfolio: portfolio.expenseRatio,
                benchmark: national.expenseRatio,
                gap: national.expenseRatio - portfolio.expenseRatio, // Lower is better
                pct: ((national.expenseRatio - portfolio.expenseRatio) / national.expenseRatio) * 100
            },
            ltv: {
                portfolio: portfolio.ltv,
                benchmark: national.ltv,
                gap: national.ltv - portfolio.ltv, // Lower is better
                pct: ((national.ltv - portfolio.ltv) / national.ltv) * 100
            }
        };
    },

    /**
     * Identify market opportunities
     */
    identifyOpportunities: (analysis) => {
        const opportunities = [];
        const portfolio = analysis.portfolio;
        const gaps = analysis.gaps;
        const underperformers = analysis.properties.filter(p => p.performance.capRate.vs === 'Below');

        // Cap Rate opportunity
        if (gaps.capRate.gap < -0.5) {
            opportunities.push({
                type: 'cap_rate_improvement',
                title: 'Cap Rate Opportunity',
                description: `Portfolio cap rate is ${Math.abs(gaps.capRate.gap).toFixed(2)}% below national average (${gaps.capRate.benchmark.toFixed(2)}%). Consider raising rents or reducing expenses.`,
                potential: 'High',
                action: 'Rent increase strategy'
            });
        }

        // Expense ratio improvement
        if (gaps.expenseRatio.gap < -2) {
            opportunities.push({
                type: 'expense_optimization',
                title: 'Expense Optimization',
                description: `Expense ratio could be improved by ${Math.abs(gaps.expenseRatio.gap).toFixed(1)}%. Benchmark is ${gaps.expenseRatio.benchmark.toFixed(1)}%, yours is ${gaps.expenseRatio.portfolio.toFixed(1)}%.`,
                potential: 'Medium',
                action: 'Review and negotiate service contracts'
            });
        }

        // LTV improvement
        if (gaps.ltv.gap < -5) {
            opportunities.push({
                type: 'leverage_optimization',
                title: 'Leverage Opportunity',
                description: `Portfolio LTV is ${gaps.ltv.gap.toFixed(1)}% better than benchmark. Consider strategic refinancing or leveraging equity for acquisitions.`,
                potential: 'High',
                action: 'Refinance for acquisition capital'
            });
        }

        // Underperformers
        if (underperformers.length > 0) {
            opportunities.push({
                type: 'underperformer_analysis',
                title: `${underperformers.length} Underperforming Property(s)`,
                description: `${underperformers.length} properties have below-benchmark cap rates. Consider rent increases, expense cuts, or strategic sale.`,
                potential: 'Medium',
                action: 'Analyze underperformers for turnaround'
            });
        }

        // Strong performers
        const overperformers = analysis.properties.filter(p => p.performance.capRate.vs === 'Above');
        if (overperformers.length > 0) {
            opportunities.push({
                type: 'strong_performers',
                title: `${overperformers.length} High-Performing Property(s)`,
                description: `${overperformers.length} properties exceed benchmark cap rates. These are your portfolio anchors - prioritize maintenance and tenant retention.`,
                potential: 'High',
                action: 'Focus on retention and preservation'
            });
        }

        return opportunities;
    },

    /**
     * Get market comparable data by region
     */
    getMarketComparables: (state) => {
        const benchmarks = PortfolioBenchmarking.benchmarks;
        const regional = benchmarks.regions[state] || benchmarks.national;

        return {
            region: state,
            metrics: regional,
            lastUpdated: new Date().toLocaleDateString()
        };
    },

    /**
     * Rank properties by performance
     */
    rankProperties: (analysis, metric = 'capRate') => {
        return analysis.properties
            .map(prop => ({
                ...prop,
                score: prop.metrics[metric]
            }))
            .sort((a, b) => b.score - a.score);
    },

    /**
     * Load benchmarking view
     */
    loadBenchmarking: async () => {
        try {
            const container = document.getElementById('benchmarking-content');
            if (!container) return;

            container.innerHTML = '<div class="loading">Analyzing portfolio against benchmarks...</div>';

            const analysis = await PortfolioBenchmarking.analyzeAgainstBenchmarks();
            if (!analysis) {
                UI.showToast('No data available for benchmarking', 'info');
                return;
            }

            PortfolioBenchmarking.renderBenchmarking(container, analysis);
        } catch (error) {
            console.error('Error loading benchmarking:', error);
            UI.showToast('Error loading benchmarking', 'error');
        }
    },

    /**
     * Render benchmarking dashboard
     */
    renderBenchmarking: (container, analysis) => {
        const gaps = analysis.gaps;
        const opportunities = analysis.opportunities;
        const topPerformers = PortfolioBenchmarking.rankProperties(analysis, 'capRate').slice(0, 3);
        const underperformers = PortfolioBenchmarking.rankProperties(analysis, 'capRate').slice(-3).reverse();

        container.innerHTML = `
            <div class="benchmarking-container">
                <div class="benchmark-header">
                    <h2>Portfolio Benchmarking Analysis</h2>
                    <p class="subheader">Comparing against national real estate investment benchmarks</p>
                </div>

                <div class="performance-overview">
                    <h3>Portfolio Performance vs Benchmarks</h3>
                    <div class="metrics-comparison">
                        <div class="comparison-item ${gaps.capRate.gap > 0 ? 'positive' : 'negative'}">
                            <span class="metric-name">Cap Rate</span>
                            <div class="metric-values">
                                <span class="portfolio-value">${analysis.portfolio.capRate.toFixed(2)}%</span>
                                <span class="vs">vs</span>
                                <span class="benchmark-value">${gaps.capRate.benchmark.toFixed(2)}%</span>
                            </div>
                            <div class="metric-gap ${gaps.capRate.gap > 0 ? 'positive' : 'negative'}">
                                ${gaps.capRate.gap > 0 ? '+' : ''}${gaps.capRate.gap.toFixed(2)}% (${gaps.capRate.pct.toFixed(1)}%)
                            </div>
                        </div>

                        <div class="comparison-item ${gaps.cashOnCash.gap > 0 ? 'positive' : 'negative'}">
                            <span class="metric-name">Cash-on-Cash</span>
                            <div class="metric-values">
                                <span class="portfolio-value">${analysis.portfolio.cashOnCash.toFixed(2)}%</span>
                                <span class="vs">vs</span>
                                <span class="benchmark-value">${gaps.cashOnCash.benchmark.toFixed(2)}%</span>
                            </div>
                            <div class="metric-gap ${gaps.cashOnCash.gap > 0 ? 'positive' : 'negative'}">
                                ${gaps.cashOnCash.gap > 0 ? '+' : ''}${gaps.cashOnCash.gap.toFixed(2)}% (${gaps.cashOnCash.pct.toFixed(1)}%)
                            </div>
                        </div>

                        <div class="comparison-item ${gaps.expenseRatio.gap > 0 ? 'positive' : 'negative'}">
                            <span class="metric-name">Expense Ratio</span>
                            <div class="metric-values">
                                <span class="portfolio-value">${analysis.portfolio.expenseRatio.toFixed(1)}%</span>
                                <span class="vs">vs</span>
                                <span class="benchmark-value">${gaps.expenseRatio.benchmark.toFixed(1)}%</span>
                            </div>
                            <div class="metric-gap ${gaps.expenseRatio.gap > 0 ? 'positive' : 'negative'}">
                                ${gaps.expenseRatio.gap > 0 ? '+' : ''}${gaps.expenseRatio.gap.toFixed(1)}% (${gaps.expenseRatio.pct.toFixed(1)}%)
                            </div>
                        </div>

                        <div class="comparison-item ${gaps.ltv.gap > 0 ? 'positive' : 'negative'}">
                            <span class="metric-name">LTV</span>
                            <div class="metric-values">
                                <span class="portfolio-value">${analysis.portfolio.ltv.toFixed(1)}%</span>
                                <span class="vs">vs</span>
                                <span class="benchmark-value">${gaps.ltv.benchmark.toFixed(1)}%</span>
                            </div>
                            <div class="metric-gap ${gaps.ltv.gap > 0 ? 'positive' : 'negative'}">
                                ${gaps.ltv.gap > 0 ? '+' : ''}${gaps.ltv.gap.toFixed(1)}% (${gaps.ltv.pct.toFixed(1)}%)
                            </div>
                        </div>
                    </div>
                </div>

                ${opportunities.length > 0 ? `
                    <div class="opportunities-section">
                        <h3>Market Opportunities Identified</h3>
                        <div class="opportunities-grid">
                            ${opportunities.map(opp => `
                                <div class="opportunity-card">
                                    <div class="opportunity-header">
                                        <strong>${opp.title}</strong>
                                        <span class="potential-badge ${opp.potential.toLowerCase()}">${opp.potential}</span>
                                    </div>
                                    <p class="opportunity-description">${opp.description}</p>
                                    <div class="opportunity-action">
                                        <span class="action-label">Action:</span>
                                        <span class="action-text">${opp.action}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="property-rankings">
                    <h3>Property Performance Ranking</h3>
                    <div class="rankings-container">
                        <div class="ranking-section">
                            <h4>🏆 Top Performers</h4>
                            <div class="ranking-list">
                                ${topPerformers.map((prop, idx) => `
                                    <div class="ranking-item top">
                                        <span class="rank">#${idx + 1}</span>
                                        <span class="address">${prop.address}</span>
                                        <span class="cap-rate">${prop.metrics.capRate.toFixed(2)}%</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="ranking-section">
                            <h4>⚠️ Underperformers</h4>
                            <div class="ranking-list">
                                ${underperformers.map((prop, idx) => `
                                    <div class="ranking-item bottom">
                                        <span class="rank">#${analysis.properties.length - idx}</span>
                                        <span class="address">${prop.address}</span>
                                        <span class="cap-rate">${prop.metrics.capRate.toFixed(2)}%</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="all-properties-ranking">
                    <h3>Complete Property Ranking by Cap Rate</h3>
                    <table class="ranking-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Address</th>
                                <th>Cap Rate</th>
                                <th>vs Benchmark</th>
                                <th>Annual NOI</th>
                                <th>Expense Ratio</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${PortfolioBenchmarking.rankProperties(analysis, 'capRate').map((prop, idx) => `
                                <tr>
                                    <td class="rank-num">${idx + 1}</td>
                                    <td>${prop.address}</td>
                                    <td class="metric-value">${prop.metrics.capRate.toFixed(2)}%</td>
                                    <td class="${prop.performance.capRate.vs === 'Above' ? 'positive' : 'negative'}">
                                        ${prop.performance.capRate.vs} (${prop.performance.capRate.variance.toFixed(2)}%)
                                    </td>
                                    <td>${Formatting.currency(prop.metrics.annualNOI)}</td>
                                    <td>${prop.metrics.expenseRatio.toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="benchmark-actions">
                    <button class="btn-primary" onclick="FinancialAnalytics.loadFinancialAnalytics()">
                        Back to Dashboard
                    </button>
                    <button class="btn-secondary" onclick="PortfolioBenchmarking.exportBenchmarkReport('${JSON.stringify(analysis).replace(/'/g, "&#39;")}')">
                        📊 Export Report
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Export benchmark report
     */
    exportBenchmarkReport: async (analysisJson) => {
        try {
            const analysis = JSON.parse(analysisJson);
            const csv = PortfolioBenchmarking.generateBenchmarkCSV(analysis);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `benchmark-report-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            UI.showToast('Benchmark report exported', 'success');
        } catch (error) {
            console.error('Error exporting report:', error);
            UI.showToast('Error exporting report', 'error');
        }
    },

    /**
     * Generate benchmark CSV
     */
    generateBenchmarkCSV: (analysis) => {
        let csv = 'Portfolio Benchmarking Report\n';
        csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;

        csv += 'PORTFOLIO PERFORMANCE vs BENCHMARKS\n';
        csv += 'Metric,Portfolio,Benchmark,Gap\n';
        csv += `Cap Rate,${analysis.portfolio.capRate.toFixed(2)}%,${analysis.gaps.capRate.benchmark.toFixed(2)}%,${analysis.gaps.capRate.gap.toFixed(2)}%\n`;
        csv += `Cash-on-Cash,${analysis.portfolio.cashOnCash.toFixed(2)}%,${analysis.gaps.cashOnCash.benchmark.toFixed(2)}%,${analysis.gaps.cashOnCash.gap.toFixed(2)}%\n`;
        csv += `Expense Ratio,${analysis.portfolio.expenseRatio.toFixed(1)}%,${analysis.gaps.expenseRatio.benchmark.toFixed(1)}%,${analysis.gaps.expenseRatio.gap.toFixed(1)}%\n`;
        csv += `LTV,${analysis.portfolio.ltv.toFixed(1)}%,${analysis.gaps.ltv.benchmark.toFixed(1)}%,${analysis.gaps.ltv.gap.toFixed(1)}%\n\n`;

        csv += 'PROPERTY-LEVEL RANKING\n';
        csv += 'Rank,Address,Cap Rate,Annual NOI,Expense Ratio,LTV,vs Benchmark\n';
        PortfolioBenchmarking.rankProperties({ properties: analysis.properties }, 'capRate').forEach((prop, idx) => {
            csv += `${idx + 1},"${prop.address}",${prop.metrics.capRate.toFixed(2)}%,${prop.metrics.annualNOI.toFixed(0)},${prop.metrics.expenseRatio.toFixed(1)}%,${prop.metrics.ltv.toFixed(1)}%,${prop.performance.capRate.vs}\n`;
        });

        return csv;
    }
};

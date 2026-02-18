// Machine Learning Analytics Module - Predictive Analysis & Market Insights

const MLAnalytics = {
    /**
     * Initialize ML analytics module
     */
    init: async () => {
        try {
            await MLAnalytics.loadMLModels();
        } catch (error) {
            console.error('Error initializing ML analytics:', error);
        }
    },

    /**
     * Load ML models
     */
    loadMLModels: async () => {
        try {
            MLAnalytics.models = {
                valuation: MLAnalytics.initializeValuationModel(),
                marketTrend: MLAnalytics.initializeMarketTrendModel(),
                riskPredictor: MLAnalytics.initializeRiskPredictorModel()
            };
            return MLAnalytics.models;
        } catch (error) {
            console.error('Error loading ML models:', error);
            return null;
        }
    },

    /**
     * Initialize property valuation prediction model
     */
    initializeValuationModel: () => {
        return {
            name: 'Property Valuation Predictor',
            weights: {
                appreciation: 0.35,
                marketTrend: 0.25,
                capRate: 0.20,
                ltv: 0.10,
                cashFlow: 0.10
            },
            threshold: 0.7
        };
    },

    /**
     * Initialize market trend detection model
     */
    initializeMarketTrendModel: () => {
        return {
            name: 'Market Trend Detector',
            weights: {
                priceMovement: 0.40,
                volumeChange: 0.25,
                timeSeriesPattern: 0.20,
                economicIndicators: 0.15
            },
            movingAveragePeriod: 12
        };
    },

    /**
     * Initialize risk predictor model
     */
    initializeRiskPredictorModel: () => {
        return {
            name: 'Risk Predictor',
            weights: {
                ltv: 0.30,
                cashFlow: 0.25,
                marketVolatility: 0.20,
                debtTrend: 0.15,
                diversification: 0.10
            },
            riskLevels: {
                low: { min: 0, max: 30 },
                medium: { min: 30, max: 60 },
                high: { min: 60, max: 100 }
            }
        };
    },

    /**
     * Predict property valuation for next 12 months
     */
    predictPropertyValuation: async (property, historicalData) => {
        try {
            const currentValue = parseFloat(property.current_value) || 0;
            const purchasePrice = parseFloat(property.purchase_price) || 0;

            // Historical appreciation rate
            const historicalAppreciation = purchasePrice > 0
                ? ((currentValue - purchasePrice) / purchasePrice)
                : 0;

            // Calculate average annual appreciation
            const yearsOwned = Math.max(1, (new Date() - new Date(property.purchase_date)) / (1000 * 60 * 60 * 24 * 365));
            const annualAppreciationRate = historicalAppreciation / yearsOwned;

            // Market trend factor (assume 3-5% market appreciation if no historical data)
            const marketTrendFactor = 0.035;

            // Combine factors for prediction
            const predictedAppreciationRate = (annualAppreciationRate * 0.6) + (marketTrendFactor * 0.4);

            // 12-month prediction
            const projectedValue = currentValue * (1 + predictedAppreciationRate);
            const projectedAppreciation = projectedValue - currentValue;
            const projectedAppreciationPercent = (projectedAppreciation / currentValue) * 100;

            // Confidence score based on data availability (0-100)
            const confidenceScore = Math.min(100, 50 + (yearsOwned * 10));

            return {
                propertyId: property.id,
                address: property.address,
                currentValue,
                projectedValue: Math.round(projectedValue),
                projectedAppreciation: Math.round(projectedAppreciation),
                projectedAppreciationPercent: projectedAppreciationPercent.toFixed(2),
                predictionPeriod: '12 months',
                confidenceScore: Math.min(100, confidenceScore),
                factors: {
                    historicalRate: (annualAppreciationRate * 100).toFixed(2) + '%',
                    marketTrend: (marketTrendFactor * 100).toFixed(2) + '%',
                    weightedAverage: (predictedAppreciationRate * 100).toFixed(2) + '%'
                }
            };
        } catch (error) {
            console.error('Error predicting property valuation:', error);
            return null;
        }
    },

    /**
     * Analyze market trends for portfolio
     */
    analyzeMarketTrends: async (properties, historicalPrices = {}) => {
        try {
            const trends = [];

            for (const property of properties) {
                const propertyHistory = historicalPrices[property.id] || [];

                if (propertyHistory.length > 0) {
                    const trend = MLAnalytics.detectTrend(property, propertyHistory);
                    trends.push(trend);
                } else {
                    // Generate synthetic trend based on current data
                    const trend = MLAnalytics.estimateTrendFromCurrent(property);
                    trends.push(trend);
                }
            }

            // Calculate portfolio-level trend
            const portfolioTrend = MLAnalytics.aggregateTrends(trends);

            return {
                propertyTrends: trends,
                portfolioTrend,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error analyzing market trends:', error);
            return null;
        }
    },

    /**
     * Detect trend from historical price data
     */
    detectTrend: (property, priceHistory) => {
        if (priceHistory.length < 2) {
            return MLAnalytics.estimateTrendFromCurrent(property);
        }

        // Calculate average price change
        const changes = [];
        for (let i = 1; i < priceHistory.length; i++) {
            const change = (priceHistory[i] - priceHistory[i - 1]) / priceHistory[i - 1];
            changes.push(change);
        }

        const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
        const volatility = Math.sqrt(
            changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length
        );

        // Determine trend direction
        let trendDirection = 'stable';
        if (avgChange > 0.02) trendDirection = 'uptrend';
        else if (avgChange < -0.02) trendDirection = 'downtrend';

        return {
            propertyId: property.id,
            address: property.address,
            trendDirection,
            averageMonthlyChange: (avgChange * 100).toFixed(2) + '%',
            volatility: (volatility * 100).toFixed(2) + '%',
            trendStrength: Math.abs(avgChange) / volatility, // Signal-to-noise ratio
            dataPoints: priceHistory.length
        };
    },

    /**
     * Estimate trend from current property data
     */
    estimateTrendFromCurrent: (property) => {
        const currentValue = parseFloat(property.current_value) || 0;
        const purchasePrice = parseFloat(property.purchase_price) || 0;
        const yearsOwned = Math.max(1, (new Date() - new Date(property.purchase_date)) / (1000 * 60 * 60 * 24 * 365));

        const totalAppreciation = (currentValue - purchasePrice) / purchasePrice;
        const annualRate = totalAppreciation / yearsOwned;

        let trendDirection = 'stable';
        if (annualRate > 0.03) trendDirection = 'uptrend';
        else if (annualRate < -0.01) trendDirection = 'downtrend';

        return {
            propertyId: property.id,
            address: property.address,
            trendDirection,
            averageAnnualChange: (annualRate * 100).toFixed(2) + '%',
            volatility: '2.5%', // Assumed volatility
            trendStrength: Math.abs(annualRate) / 0.025,
            dataPoints: 1,
            note: 'Estimated from current data'
        };
    },

    /**
     * Aggregate trends across portfolio
     */
    aggregateTrends: (trends) => {
        if (trends.length === 0) return null;

        const trendCounts = { uptrend: 0, downtrend: 0, stable: 0 };
        let totalChange = 0;
        let totalVolatility = 0;

        for (const trend of trends) {
            trendCounts[trend.trendDirection]++;

            const changeNum = parseFloat(trend.averageMonthlyChange) || parseFloat(trend.averageAnnualChange);
            totalChange += changeNum;

            const volNum = parseFloat(trend.volatility);
            totalVolatility += volNum;
        }

        const avgChange = totalChange / trends.length;
        const avgVolatility = totalVolatility / trends.length;
        const dominantTrend = Object.keys(trendCounts).reduce((a, b) =>
            trendCounts[a] > trendCounts[b] ? a : b
        );

        return {
            dominantTrend,
            trendDistribution: trendCounts,
            averageChange: avgChange.toFixed(2) + '%',
            averageVolatility: avgVolatility.toFixed(2) + '%',
            portfolioMomentum: dominantTrend === 'uptrend' ? 'Positive' : dominantTrend === 'downtrend' ? 'Negative' : 'Neutral'
        };
    },

    /**
     * Predict portfolio risk for next 12 months
     */
    predictPortfolioRisk: async (portfolio, properties) => {
        try {
            const riskFactors = {
                ltv: portfolio.ltv,
                cashFlow: portfolio.monthlyNOI,
                marketVolatility: 2.5, // Assumed market volatility %
                debtTrend: MLAnalytics.estimateDebtTrend(properties),
                diversification: MLAnalytics.calculateDiversification(properties)
            };

            const model = MLAnalytics.models.riskPredictor;
            let riskScore = 0;

            // LTV risk
            riskScore += (portfolio.ltv / 100) * model.weights.ltv * 100;

            // Cash flow risk (negative cash flow = higher risk)
            const cashFlowRisk = portfolio.monthlyNOI < 0 ? 100 :
                                portfolio.monthlyNOI < 500 ? 50 :
                                portfolio.monthlyNOI < 1000 ? 25 : 10;
            riskScore += cashFlowRisk * model.weights.cashFlow;

            // Market volatility
            riskScore += riskFactors.marketVolatility * model.weights.marketVolatility;

            // Debt trend
            riskScore += riskFactors.debtTrend * model.weights.debtTrend;

            // Diversification (more diversified = lower risk)
            riskScore += (100 - riskFactors.diversification) * model.weights.diversification;

            riskScore = Math.min(100, Math.max(0, riskScore));

            const riskLevel = Object.keys(model.riskLevels).find(level => {
                const range = model.riskLevels[level];
                return riskScore >= range.min && riskScore <= range.max;
            }) || 'unknown';

            return {
                riskScore: Math.round(riskScore),
                riskLevel,
                riskFactors,
                prediction: riskScore > 60 ? 'High risk detected - consider rebalancing' :
                           riskScore > 30 ? 'Moderate risk - monitor closely' :
                           'Low risk profile - portfolio stable',
                recommendations: MLAnalytics.generateRiskRecommendations(riskScore, riskFactors)
            };
        } catch (error) {
            console.error('Error predicting portfolio risk:', error);
            return null;
        }
    },

    /**
     * Estimate debt trend
     */
    estimateDebtTrend: (properties) => {
        // Simplified: assume debt is being paid down (negative trend = good)
        // In real implementation, would analyze actual debt reduction over time
        return 15; // 15% risk from debt trend
    },

    /**
     * Calculate portfolio diversification score
     */
    calculateDiversification: (properties) => {
        if (properties.length === 0) return 0;

        // Diversification based on property types
        const typeCount = {};
        for (const prop of properties) {
            typeCount[prop.type] = (typeCount[prop.type] || 0) + 1;
        }

        // Calculate Herfindahl index (concentration measure)
        let herfindahl = 0;
        const n = properties.length;

        for (const type in typeCount) {
            const share = typeCount[type] / n;
            herfindahl += share * share;
        }

        // Convert to diversification score (0-100)
        // Lower herfindahl = more diversified
        const diversificationScore = ((1 - herfindahl) / (1 - 1/n)) * 100;

        return Math.round(diversificationScore);
    },

    /**
     * Generate risk recommendations
     */
    generateRiskRecommendations: (riskScore, riskFactors) => {
        const recommendations = [];

        if (riskFactors.ltv > 80) {
            recommendations.push({
                priority: 'High',
                action: 'Reduce LTV',
                description: `LTV at ${riskFactors.ltv.toFixed(1)}% is high. Consider refinancing to reduce leverage.`
            });
        }

        if (riskFactors.cashFlow < 500) {
            recommendations.push({
                priority: 'High',
                action: 'Improve Cash Flow',
                description: 'Monthly NOI below $500. Increase rents or reduce expenses.'
            });
        }

        if (riskFactors.diversification < 40) {
            recommendations.push({
                priority: 'Medium',
                action: 'Diversify Portfolio',
                description: 'Portfolio concentration is high. Add properties of different types.'
            });
        }

        return recommendations;
    },

    /**
     * Generate ML-based buy/hold/sell recommendations
     */
    generatePropertyRecommendations: async (properties, investmentMetrics) => {
        try {
            const recommendations = [];

            for (const property of properties) {
                const metrics = investmentMetrics[property.id];
                if (!metrics) continue;

                // Valuation prediction
                const valuation = await MLAnalytics.predictPropertyValuation(property, {});

                // Score components
                const roiScore = Math.min(100, (metrics.roi || 0) * 5); // Normalize ROI to 0-100
                const capRateScore = Math.min(100, (metrics.capRate || 0) * 15);
                const ltvScore = Math.max(0, 100 - (metrics.ltv || 0));
                const cashFlowScore = metrics.monthlyNOI > 1000 ? 100 :
                                     metrics.monthlyNOI > 500 ? 75 :
                                     metrics.monthlyNOI > 0 ? 50 : 0;

                // Weighted score
                const overallScore = (roiScore * 0.35 + capRateScore * 0.25 + ltvScore * 0.25 + cashFlowScore * 0.15);

                // Recommendation logic
                let recommendation = 'HOLD';
                let rationale = '';

                if (overallScore > 75) {
                    recommendation = 'BUY_MORE';
                    rationale = 'Strong performer - consider acquiring similar properties.';
                } else if (overallScore > 60) {
                    recommendation = 'HOLD';
                    rationale = 'Solid performer - maintain current holdings.';
                } else if (overallScore > 40) {
                    recommendation = 'MONITOR';
                    rationale = 'Underperforming - implement improvement strategy or consider refinancing.';
                } else {
                    recommendation = 'SELL';
                    rationale = 'Poor performer - consider strategic sale and redeploy capital.';
                }

                recommendations.push({
                    propertyId: property.id,
                    address: property.address,
                    recommendation,
                    overallScore: Math.round(overallScore),
                    scoreComponents: {
                        roi: Math.round(roiScore),
                        capRate: Math.round(capRateScore),
                        leverage: Math.round(ltvScore),
                        cashFlow: Math.round(cashFlowScore)
                    },
                    rationale,
                    valuation: valuation ? valuation.projectedValue : null,
                    valuationGain: valuation ? valuation.projectedAppreciation : null
                });
            }

            return recommendations;
        } catch (error) {
            console.error('Error generating property recommendations:', error);
            return [];
        }
    },

    /**
     * Load ML analytics view
     */
    loadMLAnalytics: async () => {
        try {
            const container = document.getElementById('ml_analytics-content');
            if (!container) return;

            container.innerHTML = '<div class="loading">Analyzing market trends and predictions...</div>';

            const properties = await API.getProperties() || [];
            const mortgages = await API.getMortgages() || [];
            const expenses = await API.getExpenses() || [];
            const rentPayments = await API.getRentPayments() || [];

            if (properties.length === 0) {
                UI.showToast('No properties available for analysis', 'info');
                return;
            }

            // Generate predictions and analysis
            const predictions = [];
            for (const property of properties) {
                const pred = await MLAnalytics.predictPropertyValuation(property, {});
                if (pred) predictions.push(pred);
            }

            const trends = await MLAnalytics.analyzeMarketTrends(properties);

            // Calculate portfolio metrics for risk prediction
            let totalValue = 0, totalDebt = 0, totalRent = 0, totalExpenses = 0, monthlyDebtService = 0;
            for (const property of properties) {
                totalValue += parseFloat(property.current_value) || 0;
                const propMortgages = mortgages.filter(m => String(m.property_id) === String(property.id));
                totalDebt += propMortgages.reduce((sum, m) => sum + (parseFloat(m.current_balance) || 0), 0);
                monthlyDebtService += propMortgages.reduce((sum, m) => sum + (parseFloat(m.monthly_payment) || 0), 0);
                const propExpenses = expenses.filter(e => String(e.property_id) === String(property.id));
                totalExpenses += propExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
            }
            totalRent = rentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

            const portfolio = {
                ltv: totalValue > 0 ? (totalDebt / totalValue) * 100 : 0,
                monthlyNOI: (totalRent - totalExpenses) / 12
            };

            const investmentMetrics = {};
            for (const property of properties) {
                const propMortgages = mortgages.filter(m => String(m.property_id) === String(property.id));
                const propExpenses = expenses.filter(e => String(e.property_id) === String(property.id));
                const propRents = rentPayments.filter(r => String(r.property_id) === String(property.id));

                const totalPropDebt = propMortgages.reduce((sum, m) => sum + (parseFloat(m.current_balance) || 0), 0);
                const annualRent = propRents.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
                const annualExpenses = propExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                const currentValue = parseFloat(property.current_value) || 0;

                investmentMetrics[property.id] = {
                    roi: 12, // Placeholder
                    capRate: currentValue > 0 ? ((annualRent - annualExpenses) / currentValue) * 100 : 0,
                    ltv: currentValue > 0 ? (totalPropDebt / currentValue) * 100 : 0,
                    monthlyNOI: (annualRent - annualExpenses) / 12
                };
            }

            const riskPrediction = await MLAnalytics.predictPortfolioRisk(portfolio, properties);
            const recommendations = await MLAnalytics.generatePropertyRecommendations(properties, investmentMetrics);

            MLAnalytics.renderMLAnalytics(container, predictions, trends, riskPrediction, recommendations);
        } catch (error) {
            console.error('Error loading ML analytics:', error);
            UI.showToast('Error loading ML analytics', 'error');
        }
    },

    /**
     * Render ML analytics dashboard
     */
    renderMLAnalytics: (container, predictions, trends, riskPrediction, recommendations) => {
        container.innerHTML = `
            <div class="ml-analytics-container">
                <div class="ml-header">
                    <h2>Machine Learning Analytics & Predictions</h2>
                    <p class="subheader">AI-powered insights for portfolio optimization</p>
                </div>

                <div class="predictions-section">
                    <h3>🔮 Property Valuation Predictions (12 Months)</h3>
                    <div class="predictions-grid">
                        ${predictions.map(pred => `
                            <div class="prediction-card">
                                <strong>${pred.address}</strong>
                                <div class="prediction-metrics">
                                    <div class="metric">
                                        <span class="label">Current Value</span>
                                        <span class="value">${Formatting.currency(pred.currentValue)}</span>
                                    </div>
                                    <div class="metric">
                                        <span class="label">Projected Value</span>
                                        <span class="value positive">${Formatting.currency(pred.projectedValue)}</span>
                                    </div>
                                    <div class="metric">
                                        <span class="label">Expected Appreciation</span>
                                        <span class="value positive">+${Formatting.currency(pred.projectedAppreciation)}</span>
                                    </div>
                                    <div class="metric">
                                        <span class="label">Appreciation Rate</span>
                                        <span class="value">${pred.projectedAppreciationPercent}%</span>
                                    </div>
                                </div>
                                <div class="confidence-score">
                                    <span>Confidence: ${pred.confidenceScore.toFixed(0)}%</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${trends ? `
                    <div class="trends-section">
                        <h3>📈 Market Trend Analysis</h3>
                        <div class="portfolio-trend">
                            <div class="trend-card">
                                <span class="trend-label">Portfolio Momentum</span>
                                <span class="trend-value ${trends.portfolioTrend.portfolioMomentum === 'Positive' ? 'positive' : trends.portfolioTrend.portfolioMomentum === 'Negative' ? 'negative' : 'neutral'}">
                                    ${trends.portfolioTrend.portfolioMomentum}
                                </span>
                            </div>
                            <div class="trend-card">
                                <span class="trend-label">Dominant Trend</span>
                                <span class="trend-value">${trends.portfolioTrend.dominantTrend}</span>
                            </div>
                            <div class="trend-card">
                                <span class="trend-label">Average Change</span>
                                <span class="trend-value">${trends.portfolioTrend.averageChange}</span>
                            </div>
                        </div>
                        <div class="property-trends">
                            ${trends.propertyTrends.map(trend => `
                                <div class="trend-item">
                                    <span class="address">${trend.address}</span>
                                    <span class="trend ${trend.trendDirection}">${trend.trendDirection.toUpperCase()}</span>
                                    <span class="change">${trend.averageMonthlyChange || trend.averageAnnualChange}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${riskPrediction ? `
                    <div class="risk-prediction-section">
                        <h3>⚠️ 12-Month Risk Prediction</h3>
                        <div class="risk-prediction-card">
                            <div class="risk-score">
                                <span class="score-label">Risk Score</span>
                                <span class="score-value risk-${riskPrediction.riskLevel.toLowerCase()}">${riskPrediction.riskScore}/100</span>
                                <span class="risk-level">${riskPrediction.riskLevel} Risk</span>
                            </div>
                            <p class="prediction-text">${riskPrediction.prediction}</p>
                            ${riskPrediction.recommendations.length > 0 ? `
                                <div class="risk-recommendations">
                                    ${riskPrediction.recommendations.map(rec => `
                                        <div class="rec">
                                            <span class="priority">${rec.priority}</span>
                                            <span class="action">${rec.action}</span>
                                            <span class="desc">${rec.description}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <div class="recommendations-section">
                    <h3>🎯 AI-Powered Buy/Hold/Sell Recommendations</h3>
                    <div class="recommendations-grid">
                        ${recommendations.map(rec => `
                            <div class="recommendation-card recommendation-${rec.recommendation.toLowerCase()}">
                                <div class="rec-header">
                                    <strong>${rec.address}</strong>
                                    <span class="action-badge">${rec.recommendation}</span>
                                </div>
                                <div class="score-breakdown">
                                    <div class="score-bar">
                                        <div class="bar-fill" style="width: ${rec.overallScore}%"></div>
                                        <span class="score">${rec.overallScore}/100</span>
                                    </div>
                                </div>
                                <div class="score-components">
                                    <div class="component">ROI: ${rec.scoreComponents.roi}</div>
                                    <div class="component">Cap Rate: ${rec.scoreComponents.capRate}</div>
                                    <div class="component">Leverage: ${rec.scoreComponents.leverage}</div>
                                    <div class="component">Cash Flow: ${rec.scoreComponents.cashFlow}</div>
                                </div>
                                <p class="rationale">${rec.rationale}</p>
                                ${rec.valuation ? `
                                    <div class="valuation-hint">
                                        Projected: ${Formatting.currency(rec.valuation)}
                                        ${rec.valuationGain > 0 ? `(+${Formatting.currency(rec.valuationGain)})` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="ml-actions">
                    <button class="btn-primary" onclick="FinancialAnalytics.loadFinancialAnalytics()">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    }
};

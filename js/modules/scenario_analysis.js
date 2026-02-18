// Scenario Analysis Engine - What-If Modeling & Multi-Property Scenarios

const ScenarioAnalysis = {
    /**
     * Initialize scenario analysis module
     */
    init: async () => {
        try {
            await ScenarioAnalysis.loadScenarios();
        } catch (error) {
            console.error('Error initializing scenario analysis:', error);
        }
    },

    /**
     * Load all scenarios from API
     */
    loadScenarios: async () => {
        try {
            ScenarioAnalysis.scenarios = await API.getScenarios() || [];
            return ScenarioAnalysis.scenarios;
        } catch (error) {
            console.error('Error loading scenarios:', error);
            ScenarioAnalysis.scenarios = [];
            return [];
        }
    },

    /**
     * Get scenario templates
     */
    getScenarioTemplates: () => ({
        conservative: {
            name: 'Conservative',
            description: 'Lower growth, higher stability focus',
            params: {
                rentGrowth: 0.02,      // 2% annual rent growth
                expenseGrowth: 0.03,   // 3% annual expense growth
                propertyAppreciation: 0.02, // 2% property value growth
                refinancingCost: 4500,
                refinanceRate: 'current'
            }
        },
        moderate: {
            name: 'Moderate',
            description: 'Balanced growth and stability',
            params: {
                rentGrowth: 0.035,
                expenseGrowth: 0.025,
                propertyAppreciation: 0.035,
                refinancingCost: 4500,
                refinanceRate: 'market'
            }
        },
        aggressive: {
            name: 'Aggressive',
            description: 'Higher growth, optimization focus',
            params: {
                rentGrowth: 0.05,       // 5% annual rent growth
                expenseGrowth: 0.02,    // 2% annual expense growth
                propertyAppreciation: 0.05, // 5% property value growth
                refinancingCost: 4500,
                refinanceRate: 'optimized'
            }
        }
    }),

    /**
     * Create a new scenario
     */
    createScenario: async (params) => {
        try {
            const scenario = {
                id: Formatting.generateUUID(),
                name: params.name,
                description: params.description || '',
                template: params.template || 'custom',
                parameters: {
                    rentGrowth: parseFloat(params.rentGrowth) || 0.035,
                    expenseGrowth: parseFloat(params.expenseGrowth) || 0.025,
                    propertyAppreciation: parseFloat(params.propertyAppreciation) || 0.035,
                    refinancingCost: parseFloat(params.refinancingCost) || 4500,
                    refinanceRate: params.refinanceRate || 'market',
                    months: parseInt(params.months) || 60
                },
                createdDate: new Date().toISOString(),
                baselineData: null,
                projections: null,
                analysis: null
            };

            // Calculate baseline and projections
            scenario.baselineData = await ScenarioAnalysis.getBaselineData();
            scenario.projections = await ScenarioAnalysis.calculateProjections(scenario);
            scenario.analysis = ScenarioAnalysis.analyzeScenario(scenario);

            // Save to API
            await API.saveScenario(scenario);

            // Add to local array
            ScenarioAnalysis.scenarios.push(scenario);

            return scenario;
        } catch (error) {
            console.error('Error creating scenario:', error);
            throw error;
        }
    },

    /**
     * Get baseline (current) data for scenario modeling
     */
    getBaselineData: async () => {
        try {
            const properties = await API.getProperties() || [];
            const mortgages = await API.getMortgages() || [];
            const expenses = await API.getExpenses() || [];
            const rentPayments = await API.getRentPayments() || [];

            let baseline = {
                totalValue: 0,
                totalDebt: 0,
                totalAnnualRent: 0,
                totalAnnualExpenses: 0,
                properties: []
            };

            for (const property of properties) {
                const propMortgages = mortgages.filter(m => m.property_id === property.id);
                const propExpenses = expenses.filter(e => e.property_id === property.id);
                const propRents = rentPayments.filter(r => r.property_id === property.id);

                const totalDebt = propMortgages.reduce((sum, m) => sum + (parseFloat(m.current_balance) || 0), 0);
                const annualRent = propRents.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
                const annualExpenses = propExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                const currentValue = parseFloat(property.current_value) || 0;

                baseline.totalValue += currentValue;
                baseline.totalDebt += totalDebt;
                baseline.totalAnnualRent += annualRent;
                baseline.totalAnnualExpenses += annualExpenses;

                baseline.properties.push({
                    id: property.id,
                    address: property.address,
                    currentValue,
                    totalDebt,
                    annualRent,
                    annualExpenses,
                    monthlyPayment: propMortgages.reduce((sum, m) => sum + (parseFloat(m.monthly_payment) || 0), 0)
                });
            }

            return baseline;
        } catch (error) {
            console.error('Error getting baseline data:', error);
            return null;
        }
    },

    /**
     * Calculate 12-60 month projections for scenario
     */
    calculateProjections: async (scenario) => {
        try {
            const baseline = scenario.baselineData;
            if (!baseline) return null;

            const params = scenario.parameters;
            const months = params.months;

            const projections = [];

            for (let month = 0; month <= months; month++) {
                const years = month / 12;

                // Apply growth rates
                const projectedValue = baseline.totalValue * Math.pow(1 + params.propertyAppreciation, years);
                const projectedRent = baseline.totalAnnualRent * Math.pow(1 + params.rentGrowth, years);
                const projectedExpenses = baseline.totalAnnualExpenses * Math.pow(1 + params.expenseGrowth, years);

                // Debt declines with payments
                let projectedDebt = baseline.totalDebt;
                for (let m = 0; m < month; m++) {
                    const monthlyRate = 0.05 / 12; // Assume 5% average rate (simplified)
                    const interest = projectedDebt * monthlyRate;
                    const payment = baseline.properties.reduce((sum, p) => sum + p.monthlyPayment, 0);
                    const principal = payment - interest;
                    projectedDebt = Math.max(0, projectedDebt - principal);
                }

                const projectedEquity = projectedValue - projectedDebt;
                const monthlyNOI = (projectedRent - projectedExpenses) / 12;
                const ltv = projectedValue > 0 ? (projectedDebt / projectedValue) * 100 : 0;
                const capRate = projectedValue > 0 ? ((projectedRent - projectedExpenses) / projectedValue) * 100 : 0;

                projections.push({
                    month,
                    year: years,
                    projectedValue,
                    projectedDebt,
                    projectedEquity,
                    projectedRent,
                    projectedExpenses,
                    monthlyNOI,
                    ltv,
                    capRate,
                    roi: (projectedEquity / baseline.totalDebt) * 100 // Simple ROI
                });
            }

            return projections;
        } catch (error) {
            console.error('Error calculating projections:', error);
            return null;
        }
    },

    /**
     * Analyze scenario and generate insights
     */
    analyzeScenario: (scenario) => {
        const projections = scenario.projections;
        if (!projections || projections.length === 0) return null;

        const baseline = scenario.baselineData;
        const endProjection = projections[projections.length - 1];

        return {
            summary: {
                startValue: baseline.totalValue,
                endValue: endProjection.projectedValue,
                totalAppreciation: endProjection.projectedValue - baseline.totalValue,
                percentGrowth: ((endProjection.projectedValue - baseline.totalValue) / baseline.totalValue) * 100,

                startDebt: baseline.totalDebt,
                endDebt: endProjection.projectedDebt,
                debtReduction: baseline.totalDebt - endProjection.projectedDebt,

                startEquity: baseline.totalValue - baseline.totalDebt,
                endEquity: endProjection.projectedEquity,
                equityGrowth: endProjection.projectedEquity - (baseline.totalValue - baseline.totalDebt),

                startLTV: (baseline.totalDebt / baseline.totalValue) * 100,
                endLTV: endProjection.ltv,
                ltvImprovement: ((baseline.totalDebt / baseline.totalValue) - (endProjection.projectedDebt / endProjection.projectedValue)) * 100
            },
            cashFlowTrend: {
                startMonthlyNOI: (baseline.totalAnnualRent - baseline.totalAnnualExpenses) / 12,
                endMonthlyNOI: endProjection.monthlyNOI,
                totalCashFlowGenerated: projections.reduce((sum, p, idx) => {
                    if (idx > 0) {
                        return sum + p.monthlyNOI;
                    }
                    return sum;
                }, 0)
            },
            recommendations: ScenarioAnalysis.generateRecommendations(scenario),
            riskAssessment: ScenarioAnalysis.assessScenarioRisk(scenario)
        };
    },

    /**
     * Generate recommendations based on scenario analysis
     */
    generateRecommendations: (scenario) => {
        const analysis = scenario.analysis;
        const recommendations = [];

        // Appreciation vs Debt Reduction
        const appreciationRate = analysis.summary.percentGrowth;
        if (appreciationRate > 5) {
            recommendations.push({
                type: 'strong_appreciation',
                message: 'Strong property appreciation projected. Consider leveraging equity for new acquisitions.',
                priority: 'high'
            });
        }

        // LTV Improvement
        if (analysis.summary.ltvImprovement > 10) {
            recommendations.push({
                type: 'ltv_improvement',
                message: 'Significant LTV improvement. Portfolio leverage position will strengthen.',
                priority: 'medium'
            });
        }

        // Cash Flow Growth
        if (analysis.cashFlowTrend.endMonthlyNOI > analysis.cashFlowTrend.startMonthlyNOI) {
            const growthPercent = ((analysis.cashFlowTrend.endMonthlyNOI - analysis.cashFlowTrend.startMonthlyNOI) / analysis.cashFlowTrend.startMonthlyNOI) * 100;
            recommendations.push({
                type: 'cash_flow_growth',
                message: `Cash flow expected to grow ${growthPercent.toFixed(1)}%. Strong ongoing income projection.`,
                priority: 'medium'
            });
        }

        // High Debt Burden
        if (scenario.parameters.months >= 60 && analysis.summary.endLTV > 75) {
            recommendations.push({
                type: 'refinance_opportunity',
                message: 'Consider refinancing opportunities to reduce debt burden.',
                priority: 'high'
            });
        }

        return recommendations;
    },

    /**
     * Assess risk level of scenario
     */
    assessScenarioRisk: (scenario) => {
        const endProj = scenario.projections[scenario.projections.length - 1];
        let riskScore = 0; // 0-100, higher = more risky

        // LTV risk
        if (endProj.ltv > 85) riskScore += 30;
        else if (endProj.ltv > 75) riskScore += 15;

        // Cash flow risk (NOI < 0 is danger)
        if (endProj.monthlyNOI < 0) riskScore += 40;
        else if (endProj.monthlyNOI < 500) riskScore += 15;

        // Interest rate sensitivity (simplified)
        riskScore += 10; // Base rate risk

        return {
            score: Math.min(100, riskScore),
            level: riskScore > 60 ? 'High' : riskScore > 30 ? 'Medium' : 'Low',
            factors: [
                { name: 'Leverage Risk', impact: endProj.ltv > 85 ? 'High' : endProj.ltv > 75 ? 'Medium' : 'Low' },
                { name: 'Cash Flow Risk', impact: endProj.monthlyNOI < 500 ? 'High' : 'Low' },
                { name: 'Rate Risk', impact: 'Medium' }
            ]
        };
    },

    /**
     * Compare multiple scenarios side-by-side
     */
    compareScenarios: (scenarioIds) => {
        const selectedScenarios = ScenarioAnalysis.scenarios.filter(s => scenarioIds.includes(s.id));

        const comparison = {
            scenarios: [],
            metrics: {}
        };

        for (const scenario of selectedScenarios) {
            const endProj = scenario.projections[scenario.projections.length - 1];

            comparison.scenarios.push({
                id: scenario.id,
                name: scenario.name,
                template: scenario.template
            });

            // Accumulate metrics
            Object.keys(endProj).forEach(key => {
                if (!comparison.metrics[key]) {
                    comparison.metrics[key] = [];
                }
                comparison.metrics[key].push(endProj[key]);
            });
        }

        return comparison;
    },

    /**
     * Load scenario analysis view
     */
    loadScenarioAnalysis: async () => {
        try {
            const container = document.getElementById('scenario_analysis-content');
            if (!container) return;

            container.innerHTML = '<div class="loading">Loading scenario analysis...</div>';

            const scenarios = await ScenarioAnalysis.loadScenarios();
            ScenarioAnalysis.renderScenarioAnalysis(container, scenarios);
        } catch (error) {
            console.error('Error loading scenario analysis:', error);
            UI.showToast('Error loading scenario analysis', 'error');
        }
    },

    /**
     * Render scenario analysis dashboard
     */
    renderScenarioAnalysis: (container, scenarios) => {
        const templates = ScenarioAnalysis.getScenarioTemplates();

        container.innerHTML = `
            <div class="scenario-analysis-container">
                <div class="analysis-header">
                    <h2>Scenario Analysis & What-If Modeling</h2>
                    <button class="btn-primary" onclick="ScenarioAnalysis.openScenarioBuilder()">
                        + Create Scenario
                    </button>
                </div>

                <div class="scenario-templates">
                    <h3>Scenario Templates</h3>
                    <div class="template-grid">
                        ${Object.entries(templates).map(([key, template]) => `
                            <div class="template-card">
                                <h4>${template.name}</h4>
                                <p class="template-description">${template.description}</p>
                                <div class="template-params">
                                    <div class="param-item">
                                        <span class="param-label">Rent Growth:</span>
                                        <span class="param-value">${(template.params.rentGrowth * 100).toFixed(1)}%</span>
                                    </div>
                                    <div class="param-item">
                                        <span class="param-label">Expense Growth:</span>
                                        <span class="param-value">${(template.params.expenseGrowth * 100).toFixed(1)}%</span>
                                    </div>
                                    <div class="param-item">
                                        <span class="param-label">Property Appreciation:</span>
                                        <span class="param-value">${(template.params.propertyAppreciation * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                                <button class="btn-secondary" onclick="ScenarioAnalysis.createFromTemplate('${key}')">
                                    Use Template
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${scenarios.length > 0 ? `
                    <div class="scenarios-list">
                        <h3>Your Scenarios (${scenarios.length})</h3>
                        <div class="scenarios-grid">
                            ${scenarios.map((scenario, idx) => `
                                <div class="scenario-card">
                                    <div class="scenario-header">
                                        <strong>${scenario.name}</strong>
                                        <span class="scenario-template">${scenario.template}</span>
                                    </div>
                                    <p class="scenario-description">${scenario.description}</p>

                                    <div class="scenario-summary">
                                        <div class="summary-item">
                                            <span class="label">Portfolio Growth</span>
                                            <span class="value ${scenario.analysis.summary.percentGrowth > 0 ? 'positive' : 'negative'}">
                                                ${scenario.analysis.summary.percentGrowth > 0 ? '+' : ''}${scenario.analysis.summary.percentGrowth.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="label">Debt Reduction</span>
                                            <span class="value">${Formatting.currency(scenario.analysis.summary.debtReduction)}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="label">Equity Growth</span>
                                            <span class="value positive">${Formatting.currency(scenario.analysis.summary.equityGrowth)}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="label">LTV Improvement</span>
                                            <span class="value">${scenario.analysis.summary.ltvImprovement.toFixed(1)}%</span>
                                        </div>
                                    </div>

                                    <div class="risk-assessment">
                                        <span class="risk-label">Risk Level:</span>
                                        <span class="risk-badge risk-${scenario.analysis.riskAssessment.level.toLowerCase()}">
                                            ${scenario.analysis.riskAssessment.level}
                                        </span>
                                    </div>

                                    <div class="scenario-actions">
                                        <button class="btn-small" onclick="ScenarioAnalysis.viewScenarioDetail('${scenario.id}')">
                                            View Details
                                        </button>
                                        <button class="btn-small" onclick="ScenarioAnalysis.deleteScenario('${scenario.id}')">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="empty-state">
                        <p>No scenarios created yet. Get started by creating a new scenario or using a template.</p>
                    </div>
                `}

                <div class="scenario-actions">
                    <button class="btn-primary" onclick="FinancialAnalytics.loadFinancialAnalytics()">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Open scenario builder modal
     */
    openScenarioBuilder: () => {
        const modal = `
            <div class="modal-overlay" id="scenario-builder-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Create New Scenario</h3>
                        <button class="modal-close" onclick="document.getElementById('scenario-builder-modal').remove()">✕</button>
                    </div>

                    <form class="scenario-form" id="scenario-builder-form">
                        <div class="form-group">
                            <label for="scenario-name">Scenario Name *</label>
                            <input type="text" id="scenario-name" name="name" placeholder="e.g., 2024 Growth Plan" required>
                        </div>

                        <div class="form-group">
                            <label for="scenario-description">Description</label>
                            <textarea id="scenario-description" name="description" placeholder="Describe your scenario assumptions" rows="3"></textarea>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="scenario-rent-growth">Annual Rent Growth %</label>
                                <input type="number" id="scenario-rent-growth" name="rentGrowth" value="3.5" step="0.1" min="0" max="100">
                            </div>
                            <div class="form-group">
                                <label for="scenario-expense-growth">Annual Expense Growth %</label>
                                <input type="number" id="scenario-expense-growth" name="expenseGrowth" value="2.5" step="0.1" min="0" max="100">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="scenario-appreciation">Property Appreciation %</label>
                                <input type="number" id="scenario-appreciation" name="propertyAppreciation" value="3.5" step="0.1" min="0" max="100">
                            </div>
                            <div class="form-group">
                                <label for="scenario-months">Projection Period (months)</label>
                                <select id="scenario-months" name="months">
                                    <option value="12">12 months (1 year)</option>
                                    <option value="24">24 months (2 years)</option>
                                    <option value="36">36 months (3 years)</option>
                                    <option value="60" selected>60 months (5 years)</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="document.getElementById('scenario-builder-modal').remove()">
                                Cancel
                            </button>
                            <button type="submit" class="btn-primary">
                                Create Scenario
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modal);

        document.getElementById('scenario-builder-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const params = {
                name: formData.get('name'),
                description: formData.get('description'),
                rentGrowth: parseFloat(formData.get('rentGrowth')) / 100,
                expenseGrowth: parseFloat(formData.get('expenseGrowth')) / 100,
                propertyAppreciation: parseFloat(formData.get('propertyAppreciation')) / 100,
                months: parseInt(formData.get('months'))
            };

            try {
                await ScenarioAnalysis.createScenario(params);
                document.getElementById('scenario-builder-modal').remove();
                UI.showToast('Scenario created successfully', 'success');
                ScenarioAnalysis.loadScenarioAnalysis();
            } catch (error) {
                console.error('Error creating scenario:', error);
                UI.showToast('Error creating scenario', 'error');
            }
        });
    },

    /**
     * Create scenario from template
     */
    createFromTemplate: async (templateKey) => {
        try {
            const templates = ScenarioAnalysis.getScenarioTemplates();
            const template = templates[templateKey];

            const params = {
                name: template.name,
                description: template.description,
                template: templateKey,
                ...template.params
            };

            await ScenarioAnalysis.createScenario(params);
            UI.showToast(`${template.name} scenario created`, 'success');
            ScenarioAnalysis.loadScenarioAnalysis();
        } catch (error) {
            console.error('Error creating scenario from template:', error);
            UI.showToast('Error creating scenario', 'error');
        }
    },

    /**
     * View scenario detail
     */
    viewScenarioDetail: (scenarioId) => {
        const scenario = ScenarioAnalysis.scenarios.find(s => String(s.id) === String(scenarioId));
        if (!scenario) return;

        const projections = scenario.projections;
        const analysis = scenario.analysis;

        let detailHTML = `
            <div class="scenario-detail-container">
                <div class="detail-header">
                    <h2>${scenario.name}</h2>
                    <p class="detail-description">${scenario.description}</p>
                </div>

                <div class="detail-summary">
                    <div class="summary-card">
                        <h4>Projection Results (${scenario.parameters.months} months)</h4>
                        <div class="summary-metrics">
                            <div class="metric">
                                <span class="label">Portfolio Value</span>
                                <span class="value">${Formatting.currency(analysis.summary.startValue)} → ${Formatting.currency(analysis.summary.endValue)}</span>
                            </div>
                            <div class="metric">
                                <span class="label">Total Debt</span>
                                <span class="value">${Formatting.currency(analysis.summary.startDebt)} → ${Formatting.currency(analysis.summary.endDebt)}</span>
                            </div>
                            <div class="metric">
                                <span class="label">Equity</span>
                                <span class="value">${Formatting.currency(analysis.summary.startEquity)} → ${Formatting.currency(analysis.summary.endEquity)}</span>
                            </div>
                            <div class="metric">
                                <span class="label">LTV</span>
                                <span class="value">${analysis.summary.startLTV.toFixed(1)}% → ${analysis.summary.endLTV.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    <div class="summary-card">
                        <h4>Cash Flow Impact</h4>
                        <div class="summary-metrics">
                            <div class="metric">
                                <span class="label">Starting Monthly NOI</span>
                                <span class="value">${Formatting.currency(analysis.cashFlowTrend.startMonthlyNOI)}</span>
                            </div>
                            <div class="metric">
                                <span class="label">Ending Monthly NOI</span>
                                <span class="value">${Formatting.currency(analysis.cashFlowTrend.endMonthlyNOI)}</span>
                            </div>
                            <div class="metric">
                                <span class="label">Total Cumulative Cash Flow</span>
                                <span class="value">${Formatting.currency(analysis.cashFlowTrend.totalCashFlowGenerated)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="summary-card">
                        <h4>Risk Assessment</h4>
                        <div class="risk-score">
                            <span class="score">${analysis.riskAssessment.score}/100</span>
                            <span class="level risk-${analysis.riskAssessment.level.toLowerCase()}">${analysis.riskAssessment.level}</span>
                        </div>
                        <div class="risk-factors">
                            ${analysis.riskAssessment.factors.map(f => `
                                <div class="factor">
                                    <span class="factor-name">${f.name}</span>
                                    <span class="factor-impact impact-${f.impact.toLowerCase()}">${f.impact}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="recommendations-section">
                    <h3>Recommendations</h3>
                    ${analysis.recommendations.length > 0 ? `
                        <div class="recommendations-list">
                            ${analysis.recommendations.map(rec => `
                                <div class="recommendation ${rec.priority}">
                                    <span class="priority-badge">${rec.priority.toUpperCase()}</span>
                                    <span class="message">${rec.message}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>No specific recommendations at this time.</p>'}
                </div>

                <div class="projection-data">
                    <h3>60-Month Projection Data</h3>
                    <div class="projection-table">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th>Portfolio Value</th>
                                    <th>Total Debt</th>
                                    <th>Equity</th>
                                    <th>LTV</th>
                                    <th>Monthly NOI</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${projections.filter((_, idx) => idx % 6 === 0).map(proj => `
                                    <tr>
                                        <td>${proj.month} (Y${proj.year.toFixed(1)})</td>
                                        <td>${Formatting.currency(proj.projectedValue)}</td>
                                        <td>${Formatting.currency(proj.projectedDebt)}</td>
                                        <td>${Formatting.currency(proj.projectedEquity)}</td>
                                        <td>${proj.ltv.toFixed(1)}%</td>
                                        <td>${Formatting.currency(proj.monthlyNOI)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="detail-actions">
                    <button class="btn-primary" onclick="ScenarioAnalysis.loadScenarioAnalysis()">Back to Scenarios</button>
                    <button class="btn-secondary" onclick="ScenarioAnalysis.exportScenario('${scenarioId}')">📥 Export</button>
                </div>
            </div>
        `;

        document.getElementById('scenario_analysis-content').innerHTML = detailHTML;
    },

    /**
     * Delete scenario
     */
    deleteScenario: async (scenarioId) => {
        if (confirm('Are you sure you want to delete this scenario?')) {
            ScenarioAnalysis.scenarios = ScenarioAnalysis.scenarios.filter(s => s.id !== scenarioId);
            await API.deleteScenario(scenarioId).catch(() => {});
            UI.showToast('Scenario deleted', 'success');
            ScenarioAnalysis.loadScenarioAnalysis();
        }
    },

    /**
     * Export scenario data
     */
    exportScenario: async (scenarioId) => {
        const scenario = ScenarioAnalysis.scenarios.find(s => String(s.id) === String(scenarioId));
        if (!scenario) return;

        const csv = ScenarioAnalysis.generateScenarioCSV(scenario);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scenario-${scenario.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        UI.showToast('Scenario exported', 'success');
    },

    /**
     * Generate CSV from scenario
     */
    generateScenarioCSV: (scenario) => {
        let csv = 'Scenario Analysis Export\n';
        csv += `Name: ${scenario.name}\n`;
        csv += `Description: ${scenario.description}\n`;
        csv += `Created: ${new Date(scenario.createdDate).toLocaleDateString()}\n\n`;

        csv += 'PARAMETERS\n';
        csv += `Rent Growth: ${(scenario.parameters.rentGrowth * 100).toFixed(2)}%\n`;
        csv += `Expense Growth: ${(scenario.parameters.expenseGrowth * 100).toFixed(2)}%\n`;
        csv += `Property Appreciation: ${(scenario.parameters.propertyAppreciation * 100).toFixed(2)}%\n`;
        csv += `Projection Period: ${scenario.parameters.months} months\n\n`;

        csv += 'PROJECTIONS\n';
        csv += 'Month,Year,Portfolio Value,Total Debt,Equity,LTV %,Monthly NOI,Cap Rate %\n';
        scenario.projections.forEach(proj => {
            csv += `${proj.month},${proj.year.toFixed(2)},${proj.projectedValue.toFixed(2)},${proj.projectedDebt.toFixed(2)},${proj.projectedEquity.toFixed(2)},${proj.ltv.toFixed(2)},${proj.monthlyNOI.toFixed(2)},${proj.capRate.toFixed(2)}\n`;
        });

        return csv;
    }
};

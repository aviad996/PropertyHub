// Financial Decisions module
// Track all financial decisions (refinance, sell, hold, repair) with outcomes

const FinancialDecisions = {
    /**
     * Initialize financial decisions module
     */
    init: async () => {
        FinancialDecisions.setupEventListeners();
    },

    /**
     * Setup event listeners for decision tracking
     */
    setupEventListeners: () => {
        document.addEventListener('click', async (e) => {
            if (e.target.id === 'add-decision-btn') {
                FinancialDecisions.showDecisionForm();
            }
            if (e.target.classList.contains('edit-decision-btn')) {
                const decisionId = e.target.closest('.decision-item').dataset.decisionId;
                FinancialDecisions.editDecision(decisionId);
            }
            if (e.target.classList.contains('delete-decision-btn')) {
                const decisionId = e.target.closest('.decision-item').dataset.decisionId;
                await FinancialDecisions.deleteDecision(decisionId);
            }
            if (e.target.id === 'save-decision-btn') {
                await FinancialDecisions.saveDecision();
            }
        });
    },

    /**
     * Load financial decisions with outcomes
     */
    loadFinancialDecisions: async () => {
        try {
            const decisions = await API.getFinancialDecisions();
            const properties = await API.getProperties();

            if (!decisions || decisions.length === 0) {
                document.getElementById('decisions-container').innerHTML =
                    '<p class="loading">No decisions recorded yet. Start tracking your financial decisions.</p>';
                return;
            }

            FinancialDecisions.renderDecisionsList(decisions, properties);
        } catch (error) {
            console.error('Error loading financial decisions:', error);
            UI.showToast('Error loading financial decisions', 'error');
        }
    },

    /**
     * Render decisions list with outcomes
     */
    renderDecisionsList: (decisions, properties) => {
        const container = document.getElementById('decisions-container');

        const html = `
            <div class="decisions-section">
                <div class="section-header">
                    <h4>Financial Decision Log</h4>
                    <button id="add-decision-btn" class="btn-primary">+ Record Decision</button>
                </div>

                <div class="decisions-grid">
                    ${decisions.map(decision => {
                        const property = properties?.find(p => String(p.id) === String(decision.property_id));
                        const statusClass = decision.status || 'pending';
                        const outcomeClass = FinancialDecisions.getOutcomeClass(decision);

                        return `
                            <div class="decision-item" data-decision-id="${decision.id}">
                                <div class="decision-header">
                                    <span class="decision-type badge badge-${decision.decision_type}">
                                        ${FinancialDecisions.formatDecisionType(decision.decision_type)}
                                    </span>
                                    <span class="decision-status badge badge-${statusClass}">
                                        ${statusClass.charAt(0).toUpperCase() + statusClass.slice(1)}
                                    </span>
                                </div>

                                <div class="decision-content">
                                    <div class="decision-property">
                                        <strong>${property?.address || 'Unknown Property'}</strong>
                                    </div>
                                    <div class="decision-date">
                                        <small>Decided: ${Formatting.date(decision.decision_date)}</small>
                                    </div>

                                    ${decision.decision_type === 'refinance' ? `
                                        <div class="decision-metrics">
                                            <div class="metric">
                                                <span class="label">New Rate:</span>
                                                <span class="value">${decision.new_rate}%</span>
                                            </div>
                                            <div class="metric">
                                                <span class="label">Term:</span>
                                                <span class="value">${decision.new_term} years</span>
                                            </div>
                                            <div class="metric">
                                                <span class="label">Est. Savings:</span>
                                                <span class="value">${Formatting.currency(decision.projected_outcome)}</span>
                                            </div>
                                        </div>
                                    ` : ''}

                                    ${decision.projected_outcome ? `
                                        <div class="decision-projection">
                                            <strong>Projected Impact:</strong> ${Formatting.currency(decision.projected_outcome)}
                                        </div>
                                    ` : ''}

                                    ${decision.actual_outcome ? `
                                        <div class="decision-actual ${outcomeClass}">
                                            <strong>Actual Outcome:</strong> ${Formatting.currency(decision.actual_outcome)}
                                            ${FinancialDecisions.getOutcomeIndicator(decision)}
                                        </div>
                                    ` : ''}

                                    ${decision.notes ? `
                                        <div class="decision-notes">
                                            <em>${decision.notes}</em>
                                        </div>
                                    ` : ''}
                                </div>

                                <div class="decision-actions">
                                    <button class="edit-decision-btn" title="Edit">✏️</button>
                                    <button class="delete-decision-btn" title="Delete">🗑️</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="decision-analytics">
                <h4>Decision Analytics</h4>
                <div class="analytics-grid">
                    ${FinancialDecisions.renderDecisionAnalytics(decisions, properties)}
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Render decision analytics
     */
    renderDecisionAnalytics: (decisions, properties) => {
        const completed = decisions.filter(d => d.status === 'completed');
        const refineDecisions = decisions.filter(d => d.decision_type === 'refinance');
        const holdDecisions = decisions.filter(d => d.decision_type === 'hold');

        let html = `
            <div class="analytics-card">
                <div class="analytics-item">
                    <span class="label">Total Decisions:</span>
                    <span class="value">${decisions.length}</span>
                </div>
            </div>

            <div class="analytics-card">
                <div class="analytics-item">
                    <span class="label">Completed:</span>
                    <span class="value">${completed.length} (${((completed.length / decisions.length) * 100 || 0).toFixed(0)}%)</span>
                </div>
            </div>

            <div class="analytics-card">
                <div class="analytics-item">
                    <span class="label">Refinances:</span>
                    <span class="value">${refineDecisions.length}</span>
                </div>
            </div>

            <div class="analytics-card">
                <div class="analytics-item">
                    <span class="label">Holds (Strategy):</span>
                    <span class="value">${holdDecisions.length}</span>
                </div>
            </div>
        `;

        // Calculate success rate (where actual > projected for positive projections)
        if (completed.length > 0) {
            const successful = completed.filter(d => {
                const projected = parseFloat(d.projected_outcome) || 0;
                const actual = parseFloat(d.actual_outcome) || 0;
                return projected > 0 ? actual >= projected * 0.9 : actual <= projected * 1.1;
            });

            html += `
                <div class="analytics-card">
                    <div class="analytics-item">
                        <span class="label">Success Rate:</span>
                        <span class="value">${((successful.length / completed.length) * 100 || 0).toFixed(0)}%</span>
                    </div>
                </div>
            `;
        }

        return html;
    },

    /**
     * Show decision form modal
     */
    showDecisionForm: async () => {
        const properties = await API.getProperties();

        const modal = `
            <div class="modal-overlay" id="decision-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Record Financial Decision</h3>
                        <button class="close-modal" data-modal="decision-modal">×</button>
                    </div>

                    <form id="decision-form" class="decision-form">
                        <div class="form-group">
                            <label>Property*</label>
                            <select id="decision-property" required>
                                <option value="">-- Select Property --</option>
                                ${properties.map(p => `<option value="${p.id}">${p.address}</option>`).join('')}
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Decision Type*</label>
                            <select id="decision-type" required onchange="FinancialDecisions.updateDecisionFields()">
                                <option value="">-- Select Decision --</option>
                                <option value="refinance">Refinance</option>
                                <option value="raise_rent">Raise Rent</option>
                                <option value="repair">Property Repair/Upgrade</option>
                                <option value="sell">Sell Property</option>
                                <option value="hold">Hold (Strategy)</option>
                            </select>
                        </div>

                        <div id="decision-type-fields">
                            <!-- Dynamic fields based on decision type -->
                        </div>

                        <div class="form-group">
                            <label>Decision Date*</label>
                            <input type="date" id="decision-date" required>
                        </div>

                        <div class="form-group">
                            <label>Projected Outcome ($)</label>
                            <input type="number" id="projected-outcome" step="0.01" placeholder="e.g., 5000 for savings">
                        </div>

                        <div class="form-group">
                            <label>Status</label>
                            <select id="decision-status">
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Actual Outcome ($)</label>
                            <input type="number" id="actual-outcome" step="0.01" placeholder="Fill when completed">
                        </div>

                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="decision-notes" placeholder="Additional notes about this decision..."></textarea>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-secondary close-modal" data-modal="decision-modal">Cancel</button>
                            <button type="button" id="save-decision-btn" class="btn-primary">Save Decision</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modal);

        // Setup modal close
        document.querySelectorAll('[data-modal="decision-modal"]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('decision-modal').remove();
            });
        });

        // Set today's date by default
        document.getElementById('decision-date').valueAsDate = new Date();
    },

    /**
     * Update decision form fields based on type
     */
    updateDecisionFields: () => {
        const decisionType = document.getElementById('decision-type').value;
        const fieldsContainer = document.getElementById('decision-type-fields');

        let html = '';

        switch (decisionType) {
            case 'refinance':
                html = `
                    <div class="form-group">
                        <label>New Interest Rate (%)*</label>
                        <input type="number" id="new-rate" step="0.1" min="2" max="8" required>
                    </div>
                    <div class="form-group">
                        <label>New Term (years)*</label>
                        <input type="number" id="new-term" step="1" value="30" min="5" max="30" required>
                    </div>
                    <div class="form-group">
                        <label>Closing Costs ($)</label>
                        <input type="number" id="closing-costs" step="100" value="5000">
                    </div>
                `;
                break;

            case 'raise_rent':
                html = `
                    <div class="form-group">
                        <label>Rent Increase Amount ($)*</label>
                        <input type="number" id="rent-increase" step="50" required>
                    </div>
                    <div class="form-group">
                        <label>New Monthly Rent ($)</label>
                        <input type="number" id="new-rent" step="50">
                    </div>
                `;
                break;

            case 'repair':
                html = `
                    <div class="form-group">
                        <label>Repair/Upgrade Cost ($)*</label>
                        <input type="number" id="repair-cost" step="100" required>
                    </div>
                    <div class="form-group">
                        <label>Expected Value Increase ($)</label>
                        <input type="number" id="value-increase" step="100">
                    </div>
                    <div class="form-group">
                        <label>Expected Timeline (months)</label>
                        <input type="number" id="timeline-months" step="1" value="6">
                    </div>
                `;
                break;

            case 'sell':
                html = `
                    <div class="form-group">
                        <label>Expected Sale Price ($)*</label>
                        <input type="number" id="sale-price" step="1000" required>
                    </div>
                    <div class="form-group">
                        <label>Estimated Closing Costs ($)</label>
                        <input type="number" id="sell-closing-costs" step="100">
                    </div>
                `;
                break;

            case 'hold':
                html = `
                    <div class="form-group">
                        <label>Reason for Holding*</label>
                        <input type="text" id="hold-reason" placeholder="e.g., Waiting for market appreciation" required>
                    </div>
                `;
                break;
        }

        fieldsContainer.innerHTML = html;
    },

    /**
     * Save financial decision
     */
    saveDecision: async () => {
        try {
            const property = document.getElementById('decision-property').value;
            const type = document.getElementById('decision-type').value;
            const date = document.getElementById('decision-date').value;
            const status = document.getElementById('decision-status').value;
            const projectedOutcome = document.getElementById('projected-outcome').value;
            const actualOutcome = document.getElementById('actual-outcome').value;
            const notes = document.getElementById('decision-notes').value;

            if (!property || !type || !date) {
                UI.showToast('Please fill required fields', 'error');
                return;
            }

            const decision = {
                id: `dec-${Date.now()}`,
                property_id: property,
                decision_type: type,
                decision_date: date,
                status: status,
                projected_outcome: projectedOutcome || 0,
                actual_outcome: actualOutcome || 0,
                notes: notes,
                // Add type-specific fields
                new_rate: document.getElementById('new-rate')?.value,
                new_term: document.getElementById('new-term')?.value,
                closing_costs: document.getElementById('closing-costs')?.value,
                rent_increase: document.getElementById('rent-increase')?.value,
                repair_cost: document.getElementById('repair-cost')?.value,
                sale_price: document.getElementById('sale-price')?.value
            };

            await API.addFinancialDecision(decision);
            UI.showToast('Decision recorded successfully', 'success');

            document.getElementById('decision-modal').remove();
            await FinancialDecisions.loadFinancialDecisions();

        } catch (error) {
            console.error('Error saving decision:', error);
            UI.showToast('Error saving decision', 'error');
        }
    },

    /**
     * Delete financial decision
     */
    deleteDecision: async (decisionId) => {
        if (!confirm('Delete this decision record?')) return;

        try {
            await API.deleteFinancialDecision(decisionId);
            UI.showToast('Decision deleted', 'success');
            await FinancialDecisions.loadFinancialDecisions();
        } catch (error) {
            console.error('Error deleting decision:', error);
            UI.showToast('Error deleting decision', 'error');
        }
    },

    /**
     * Edit financial decision
     */
    editDecision: async (decisionId) => {
        // Placeholder for edit functionality
        UI.showToast('Edit functionality coming soon', 'info');
    },

    /**
     * Format decision type for display
     */
    formatDecisionType: (type) => {
        const mapping = {
            'refinance': 'Refinance',
            'raise_rent': 'Raise Rent',
            'repair': 'Repair/Upgrade',
            'sell': 'Sell',
            'hold': 'Hold Strategy'
        };
        return mapping[type] || type;
    },

    /**
     * Get outcome class for styling
     */
    getOutcomeClass: (decision) => {
        if (!decision.actual_outcome || !decision.projected_outcome) return 'neutral';

        const projected = parseFloat(decision.projected_outcome) || 0;
        const actual = parseFloat(decision.actual_outcome) || 0;

        if (projected > 0) {
            return actual >= projected * 0.9 ? 'positive' : actual > 0 ? 'partial' : 'negative';
        } else {
            return actual <= projected * 1.1 ? 'positive' : actual < 0 ? 'partial' : 'negative';
        }
    },

    /**
     * Get outcome indicator emoji
     */
    getOutcomeIndicator: (decision) => {
        const outcomeClass = FinancialDecisions.getOutcomeClass(decision);
        const indicators = {
            'positive': '✓ On Track',
            'partial': '◐ Partial',
            'negative': '✗ Below Target',
            'neutral': '—'
        };
        return indicators[outcomeClass] || '';
    }
};

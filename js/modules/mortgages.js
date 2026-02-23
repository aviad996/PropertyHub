// Mortgages module

const Mortgages = {
    currentEditId: null,

    /**
     * Initialize mortgages module
     */
    init: async () => {
        await Mortgages.populatePropertySelect();
        await Mortgages.loadMortgages();
        Mortgages.setupEventListeners();
    },

    /**
     * Populate property dropdown in mortgage form
     */
    populatePropertySelect: async () => {
        try {
            const properties = await API.getProperties();
            const select = document.getElementById('mortgage-property-select');

            if (!select) return;

            const options = properties.map(p => `<option value="${p.id}">${p.address}</option>`).join('');
            select.innerHTML = '<option value="">Select a property...</option>' + options;
        } catch (error) {
            console.error('Error populating property select:', error);
        }
    },

    /**
     * Load and display all mortgages
     */
    loadMortgages: async () => {
        try {
            const mortgages = await API.getMortgages();
            const properties = await API.getProperties();
            const allEscrowTxns = await API.getEscrowTransactions();

            const listContainer = document.getElementById('mortgages-list');

            if (!mortgages || mortgages.length === 0) {
                listContainer.innerHTML = '<p class="loading empty-state">No mortgages added yet. Click "New Mortgage" to add one!</p>';
                return;
            }

            const html = mortgages.map(mortgage => {
                const property = properties.find(p => p.id == mortgage.property_id);
                const propertyAddress = property?.address || 'Unknown Property';

                // Calculate P&I
                const principal = Mortgages.calculatePrincipalPayment(mortgage);
                const interest = (mortgage.monthly_payment || 0) - principal;

                // Calculate remaining years
                const yearsRemaining = mortgage.remaining_term_months ? (mortgage.remaining_term_months / 12).toFixed(1) : 'N/A';

                // Check refinance eligibility
                let canRefi = 'N/A';
                if (mortgage.refinance_eligible_date) {
                    const refinanceDate = new Date(mortgage.refinance_eligible_date);
                    const today = new Date();
                    if (!isNaN(refinanceDate.getTime())) {
                        canRefi = today >= refinanceDate ? '✓ Eligible' : `In ${Math.ceil((refinanceDate - today) / (1000 * 60 * 60 * 24))} days`;
                    }
                }

                // Calculate escrow balance from transactions
                const escrowTxns = allEscrowTxns.filter(t => String(t.mortgage_id) === String(mortgage.id));
                const escrowBalance = Mortgages.calculateEscrowBalance(escrowTxns);

                // Escrow section HTML
                let escrowSectionHtml = '';
                if (mortgage.escrow_payment) {
                    const typeLabels = {
                        'deposit': 'Deposit',
                        'tax_payment': 'Tax Payment',
                        'insurance_payment': 'Insurance Payment',
                        'refund': 'Refund',
                        'adjustment': 'Adjustment'
                    };

                    const txnRows = escrowTxns
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .map(t => {
                            const isDeposit = t.type === 'deposit' || t.type === 'refund';
                            const amountClass = isDeposit ? 'escrow-deposit' : 'escrow-disbursement';
                            const sign = isDeposit ? '+' : '-';
                            return `
                                <tr>
                                    <td>${Formatting.date(t.date)}</td>
                                    <td>${typeLabels[t.type] || t.type}</td>
                                    <td>${t.description || ''}</td>
                                    <td class="${amountClass}">${sign}${Formatting.currency(Math.abs(parseFloat(t.amount)))}</td>
                                    <td>${Formatting.currency(parseFloat(t.balance_after))}</td>
                                    <td><button class="escrow-delete-btn" data-id="${t.id}" data-mortgage-id="${mortgage.id}" title="Delete">✕</button></td>
                                </tr>
                            `;
                        }).join('');

                    escrowSectionHtml = `
                        <div class="escrow-account-section" data-mortgage-id="${mortgage.id}">
                            <div class="escrow-balance-card">
                                <div class="escrow-balance-header">
                                    <strong>Escrow Account</strong>
                                    <span class="escrow-balance-amount">${Formatting.currency(escrowBalance)}</span>
                                </div>
                                <div class="escrow-balance-details">
                                    <span>Monthly Deposit: ${Formatting.currency(mortgage.escrow_payment)}</span>
                                    <div class="escrow-actions">
                                        <button class="btn-small escrow-add-btn" data-mortgage-id="${mortgage.id}" data-property-id="${mortgage.property_id}">+ Add Transaction</button>
                                        ${escrowTxns.length > 0 ? `<button class="btn-small btn-outline escrow-toggle-btn" data-mortgage-id="${mortgage.id}">View History (${escrowTxns.length})</button>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="escrow-transactions-wrapper hidden" id="escrow-txns-${mortgage.id}">
                                ${escrowTxns.length > 0 ? `
                                    <table class="escrow-transactions-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Type</th>
                                                <th>Description</th>
                                                <th>Amount</th>
                                                <th>Balance</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>${txnRows}</tbody>
                                    </table>
                                ` : '<p class="loading empty-state">No transactions yet.</p>'}
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="list-item" data-id="${mortgage.id}">
                        <div class="list-item-content">
                            <div class="list-item-title">${propertyAddress}</div>
                            <div class="list-item-details">
                                <div class="detail-item">
                                    <span class="detail-label">Lender:</span> ${mortgage.lender}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Interest Rate:</span> ${(mortgage.interest_rate || 0).toFixed(3)}%
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Current Balance:</span> ${Formatting.currency(mortgage.current_balance)}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Monthly Payment:</span> ${Formatting.currency(mortgage.monthly_payment)}
                                </div>
                                <div class="detail-item" style="background-color: rgba(59, 130, 246, 0.1); padding: 8px; border-radius: 4px;">
                                    <strong>Payment Breakdown:</strong>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">→ Principal:</span> ${Formatting.currency(principal)}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">→ Interest:</span> ${Formatting.currency(interest)}
                                </div>
                                ${mortgage.escrow_payment ? `
                                    <div class="detail-item">
                                        <span class="detail-label">→ Escrow:</span> ${Formatting.currency(mortgage.escrow_payment)}
                                    </div>
                                ` : ''}
                                <div class="detail-item">
                                    <span class="detail-label">Remaining Term:</span> ${Formatting.monthsRemaining(mortgage.remaining_term_months)}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Refinance Eligible:</span> ${canRefi}
                                </div>
                            </div>
                            ${escrowSectionHtml}
                            <div class="mortgage-timeline-toggle">
                                <button class="btn-small btn-outline mortgage-timeline-btn" data-mortgage-id="${mortgage.id}">Show Payment Timeline</button>
                            </div>
                            <div class="mortgage-payment-cubes hidden" id="mortgage-cubes-${mortgage.id}"></div>
                        </div>
                        <div class="list-item-actions">
                            <button class="edit-btn" data-id="${mortgage.id}">Edit</button>
                            <button class="delete-btn" data-id="${mortgage.id}">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');

            listContainer.innerHTML = html;

            // Attach event listeners
            listContainer.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Mortgages.editMortgage(e.target.dataset.id));
            });

            listContainer.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Mortgages.deleteMortgage(e.target.dataset.id));
            });

            // Escrow event listeners
            listContainer.querySelectorAll('.escrow-add-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    Mortgages.showEscrowTransactionForm(e.target.dataset.mortgageId, e.target.dataset.propertyId);
                });
            });

            listContainer.querySelectorAll('.escrow-toggle-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const mortgageId = e.target.dataset.mortgageId;
                    const wrapper = document.getElementById(`escrow-txns-${mortgageId}`);
                    if (wrapper) {
                        wrapper.classList.toggle('hidden');
                        e.target.textContent = wrapper.classList.contains('hidden')
                            ? e.target.textContent.replace('Hide', 'View')
                            : e.target.textContent.replace('View', 'Hide');
                    }
                });
            });

            listContainer.querySelectorAll('.escrow-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    Mortgages.deleteEscrowTransaction(e.target.dataset.id);
                });
            });

            // Timeline toggle buttons
            listContainer.querySelectorAll('.mortgage-timeline-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const mortgageId = e.target.dataset.mortgageId;
                    const cubesContainer = document.getElementById(`mortgage-cubes-${mortgageId}`);
                    if (cubesContainer) {
                        const isHidden = cubesContainer.classList.contains('hidden');
                        cubesContainer.classList.toggle('hidden');
                        e.target.textContent = isHidden ? 'Hide Timeline' : 'Show Payment Timeline';
                        if (isHidden) {
                            Mortgages.loadPaymentCubes(mortgageId, cubesContainer, false);
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Error loading mortgages:', error);
            UI.showToast('Error loading mortgages', 'error');
        }
    },

    /**
     * Calculate principal payment using amortization formula
     */
    calculatePrincipalPayment: (mortgage) => {
        if (!mortgage.monthly_payment || !mortgage.interest_rate || !mortgage.remaining_term_months) {
            return 0;
        }

        const monthlyRate = mortgage.interest_rate / 100 / 12;
        const remainingPayments = mortgage.remaining_term_months;

        if (monthlyRate === 0) {
            return mortgage.monthly_payment;
        }

        // Interest for this month
        const interestPayment = mortgage.current_balance * monthlyRate;

        // Principal
        const principalPayment = mortgage.monthly_payment - interestPayment - (mortgage.escrow_payment || 0);

        return Math.max(0, principalPayment);
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: () => {
        // New mortgage button
        document.getElementById('new-mortgage-btn')?.addEventListener('click', () => {
            Mortgages.currentEditId = null;
            document.getElementById('mortgage-form').reset();
            document.querySelector('#mortgage-modal .modal-header h3').textContent = 'Add Mortgage';
            UI.modal.show('mortgage-modal');
        });

        // Close modal button
        document.querySelector('#mortgage-modal .close-btn')?.addEventListener('click', () => {
            UI.modal.hide('mortgage-modal');
        });

        // Cancel button
        document.getElementById('cancel-mortgage')?.addEventListener('click', () => {
            UI.modal.hide('mortgage-modal');
        });

        // Form submission
        document.getElementById('mortgage-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Mortgages.saveMortgage();
        });

        // Also add listener to header add button
        document.getElementById('add-item-btn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            if (btn.dataset.action === 'add-mortgage') {
                Mortgages.currentEditId = null;
                document.getElementById('mortgage-form').reset();
                document.querySelector('#mortgage-modal .modal-header h3').textContent = 'Add Mortgage';
                UI.modal.show('mortgage-modal');
            }
        });

        // Escrow listeners
        Mortgages.setupEscrowListeners();

        // Mortgage payment listeners
        Mortgages.setupMortgagePaymentListeners();
    },

    /**
     * Edit mortgage
     */
    editMortgage: async (mortgageId) => {
        try {
            const mortgages = await API.getMortgages();
            const mortgage = mortgages.find(m => m.id == mortgageId);

            if (!mortgage) return;

            Mortgages.currentEditId = mortgageId;
            const form = document.getElementById('mortgage-form');

            form.querySelector('[name="property_id"]').value = mortgage.property_id || '';
            form.querySelector('[name="lender"]').value = mortgage.lender || '';
            form.querySelector('[name="original_balance"]').value = mortgage.original_balance || '';
            form.querySelector('[name="current_balance"]').value = mortgage.current_balance || '';
            form.querySelector('[name="interest_rate"]').value = mortgage.interest_rate || '';
            form.querySelector('[name="monthly_payment"]').value = mortgage.monthly_payment || '';
            form.querySelector('[name="remaining_term_months"]').value = mortgage.remaining_term_months || '';
            form.querySelector('[name="refinance_eligible_date"]').value = mortgage.refinance_eligible_date || '';
            form.querySelector('[name="escrow_payment"]').value = mortgage.escrow_payment || '';
            form.querySelector('[name="start_date"]').value = mortgage.start_date || '';

            document.querySelector('#mortgage-modal .modal-header h3').textContent = 'Edit Mortgage';
            UI.modal.show('mortgage-modal');
        } catch (error) {
            console.error('Error editing mortgage:', error);
            UI.showToast('Error loading mortgage', 'error');
        }
    },

    /**
     * Save mortgage
     */
    saveMortgage: async () => {
        try {
            const form = document.getElementById('mortgage-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Validate required fields
            if (!data.property_id || !data.lender || !data.original_balance || !data.current_balance || !data.interest_rate || !data.monthly_payment || !data.remaining_term_months) {
                UI.showToast('Please fill in all required fields', 'error');
                return;
            }

            if (Mortgages.currentEditId) {
                // Update
                await API.updateMortgage(Mortgages.currentEditId, data);
                UI.showToast('Mortgage updated successfully', 'success');
            } else {
                // Add new
                await API.addMortgage(data);
                UI.showToast('Mortgage added successfully', 'success');
            }

            UI.modal.hide('mortgage-modal');
            await Mortgages.loadMortgages();
            await Dashboard.loadMetrics();
            await Dashboard.loadPropertiesSummary();
        } catch (error) {
            console.error('Error saving mortgage:', error);
            UI.showToast(error.message || 'Error saving mortgage', 'error');
        }
    },

    /**
     * Delete mortgage
     */
    deleteMortgage: async (mortgageId) => {
        if (!confirm('Are you sure you want to delete this mortgage? This cannot be undone.')) {
            return;
        }

        try {
            await API.deleteMortgage(mortgageId);
            UI.showToast('Mortgage deleted successfully', 'success');
            await Mortgages.loadMortgages();
            await Dashboard.loadMetrics();
            await Dashboard.loadPropertiesSummary();
        } catch (error) {
            console.error('Error deleting mortgage:', error);
            UI.showToast(error.message || 'Error deleting mortgage', 'error');
        }
    },

    // =====================================================
    // Escrow Account Tracking
    // =====================================================

    _escrowEditId: null,

    /**
     * Calculate escrow balance from transaction list
     */
    calculateEscrowBalance: (transactions) => {
        if (!transactions || transactions.length === 0) return 0;
        // Sort by date, return balance_after of the last transaction
        const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        const last = sorted[sorted.length - 1];
        return parseFloat(last.balance_after) || 0;
    },

    /**
     * Show escrow transaction form
     */
    showEscrowTransactionForm: (mortgageId, propertyId) => {
        Mortgages._escrowEditId = null;
        const form = document.getElementById('escrow-transaction-form');
        form.reset();
        form.querySelector('[name="mortgage_id"]').value = mortgageId;
        form.querySelector('[name="property_id"]').value = propertyId;
        form.querySelector('[name="date"]').value = new Date().toISOString().split('T')[0];
        document.querySelector('#escrow-transaction-modal .modal-header h3').textContent = 'Add Escrow Transaction';
        UI.modal.show('escrow-transaction-modal');
    },

    /**
     * Save escrow transaction
     */
    saveEscrowTransaction: async () => {
        try {
            const form = document.getElementById('escrow-transaction-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            if (!data.date || !data.type || !data.amount) {
                UI.showToast('Please fill in all required fields', 'error');
                return;
            }

            const amount = parseFloat(data.amount);
            if (isNaN(amount) || amount <= 0) {
                UI.showToast('Please enter a valid amount', 'error');
                return;
            }

            // Get existing transactions to calculate running balance
            const existingTxns = await API.getEscrowTransactions(data.mortgage_id);
            const currentBalance = Mortgages.calculateEscrowBalance(existingTxns);

            // Deposits and refunds add to balance, disbursements subtract
            const isDeposit = data.type === 'deposit' || data.type === 'refund';
            const signedAmount = isDeposit ? amount : -amount;
            const newBalance = currentBalance + signedAmount;

            data.amount = String(signedAmount);
            data.balance_after = String(newBalance);

            // Auto-fill description if empty
            if (!data.description) {
                const descriptions = {
                    'deposit': 'Monthly escrow deposit',
                    'tax_payment': 'Property tax payment',
                    'insurance_payment': 'Insurance premium payment',
                    'refund': 'Escrow refund',
                    'adjustment': 'Escrow adjustment'
                };
                data.description = descriptions[data.type] || '';
            }

            if (Mortgages._escrowEditId) {
                await API.updateEscrowTransaction(Mortgages._escrowEditId, data);
                UI.showToast('Transaction updated', 'success');
            } else {
                await API.addEscrowTransaction(data);
                UI.showToast('Transaction added', 'success');
            }

            UI.modal.hide('escrow-transaction-modal');
            await Mortgages.loadMortgages();
        } catch (error) {
            console.error('Error saving escrow transaction:', error);
            UI.showToast(error.message || 'Error saving transaction', 'error');
        }
    },

    /**
     * Delete escrow transaction
     */
    deleteEscrowTransaction: async (transactionId) => {
        if (!confirm('Delete this escrow transaction?')) return;

        try {
            await API.deleteEscrowTransaction(transactionId);

            // Recalculate balance_after for all remaining transactions
            // We need the mortgage_id — get it from the transaction before deleting
            // Since we already deleted, just reload and recalculate
            const allTxns = await API.getEscrowTransactions();

            // Group by mortgage_id and recalculate
            const byMortgage = {};
            allTxns.forEach(t => {
                if (!byMortgage[t.mortgage_id]) byMortgage[t.mortgage_id] = [];
                byMortgage[t.mortgage_id].push(t);
            });

            for (const [mortgageId, txns] of Object.entries(byMortgage)) {
                const sorted = txns.sort((a, b) => new Date(a.date) - new Date(b.date));
                let runningBalance = 0;
                for (const txn of sorted) {
                    runningBalance += parseFloat(txn.amount) || 0;
                    if (parseFloat(txn.balance_after) !== runningBalance) {
                        await API.updateEscrowTransaction(txn.id, { balance_after: String(runningBalance) });
                    }
                }
            }

            UI.showToast('Transaction deleted', 'success');
            await Mortgages.loadMortgages();
        } catch (error) {
            console.error('Error deleting escrow transaction:', error);
            UI.showToast(error.message || 'Error deleting transaction', 'error');
        }
    },

    /**
     * Setup escrow event listeners (called from setupEventListeners)
     */
    setupEscrowListeners: () => {
        // Escrow transaction form submission
        document.getElementById('escrow-transaction-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Mortgages.saveEscrowTransaction();
        });

        // Cancel escrow transaction
        document.getElementById('cancel-escrow-transaction')?.addEventListener('click', () => {
            UI.modal.hide('escrow-transaction-modal');
        });

        // Close escrow modal
        document.querySelector('#escrow-transaction-modal .close-btn')?.addEventListener('click', () => {
            UI.modal.hide('escrow-transaction-modal');
        });
    },

    // =====================================================
    // Mortgage Payment Cubes
    // =====================================================

    _mortgagePaymentEditId: null,

    /**
     * Estimate start date from remaining term if not provided
     * Assumes 30-year (360 month) original term
     */
    estimateStartDate: (mortgage) => {
        if (mortgage.start_date) return mortgage.start_date;
        const originalTerm = 360; // assume 30 year
        const elapsed = originalTerm - (mortgage.remaining_term_months || 0);
        const start = new Date();
        start.setMonth(start.getMonth() - elapsed);
        return start.toISOString().substring(0, 10);
    },

    /**
     * Generate month timeline for a mortgage
     */
    generateMortgageTimeline: (mortgage, showAll) => {
        const months = [];
        const startDate = Mortgages.estimateStartDate(mortgage);
        if (!startDate) return months;

        const current = new Date(startDate);
        current.setDate(1);
        const now = new Date();
        const limit = new Date();
        limit.setMonth(limit.getMonth() + 3); // show 3 months ahead
        limit.setDate(1);

        while (current <= limit) {
            months.push(current.toISOString().substring(0, 7));
            current.setMonth(current.getMonth() + 1);
        }

        // If not showAll, only return last 12 months + 3 future
        if (!showAll && months.length > 15) {
            const nowMonth = now.toISOString().substring(0, 7);
            const nowIdx = months.indexOf(nowMonth);
            const startIdx = Math.max(0, nowIdx - 11);
            return months.slice(startIdx);
        }
        return months;
    },

    /**
     * Load payment cubes for a specific mortgage
     */
    loadPaymentCubes: async (mortgageId, container, showAll) => {
        try {
            const mortgages = await API.getMortgages();
            const mortgage = mortgages.find(m => String(m.id) === String(mortgageId));
            if (!mortgage) return;

            const payments = await API.getMortgagePayments();
            const mortgagePayments = payments.filter(p => String(p.mortgage_id) === String(mortgageId));
            const months = Mortgages.generateMortgageTimeline(mortgage, showAll);
            const today = new Date().toISOString().substring(0, 7);

            // Build payment lookup
            const paymentMap = {};
            mortgagePayments.forEach(p => {
                const key = String(p.month).substring(0, 7); // normalize to YYYY-MM
                paymentMap[key] = p;
            });

            let paidCount = 0, totalCount = 0;

            const cubes = months.map(month => {
                const payment = paymentMap[month];
                const isFuture = month > today;
                let statusClass, statusIcon, tooltip;

                if (payment) {
                    statusClass = 'cube-' + payment.status;
                    if (payment.status === 'paid') {
                        paidCount++;
                        statusIcon = '&#10003;';
                    } else if (payment.status === 'partial') {
                        statusIcon = '&#8776;';
                    } else if (payment.status === 'late') {
                        statusIcon = '!';
                    } else {
                        statusIcon = '';
                    }
                    const amt = payment.amount_paid || payment.amount || 0;
                    tooltip = `${month} - ${payment.status.toUpperCase()} ${Formatting.currency(amt)}`;
                } else if (isFuture) {
                    statusClass = 'cube-future';
                    statusIcon = '';
                    tooltip = `${month} - Future`;
                } else {
                    statusClass = 'cube-pending';
                    statusIcon = '';
                    tooltip = `${month} - No payment recorded`;
                }

                if (!isFuture) totalCount++;
                const currentClass = month === today ? ' cube-current' : '';
                const [y, m] = month.split('-');
                const monthName = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('en-US', { month: 'short' });

                return `<div class="payment-cube ${statusClass}${currentClass}"
                             data-month="${month}" data-mortgage-id="${mortgageId}"
                             data-payment-id="${payment?.id || ''}"
                             title="${tooltip}">
                    <span class="cube-month">${monthName}</span>
                    <span class="cube-year">${y}</span>
                    ${statusIcon ? `<span class="cube-status-icon">${statusIcon}</span>` : ''}
                </div>`;
            }).join('');

            const showAllBtn = !showAll && months.length < Mortgages.generateMortgageTimeline(mortgage, true).length
                ? `<button class="btn-small btn-outline mortgage-show-all-btn" data-mortgage-id="${mortgageId}">Show All</button>`
                : '';

            container.innerHTML = `
                <div class="tenant-cubes-stats" style="margin-bottom: 8px;">
                    <span>${paidCount}/${totalCount} Paid</span>
                    ${showAllBtn}
                </div>
                <div class="payment-cubes-grid">${cubes}</div>
            `;

            // Attach click handlers to cubes
            container.querySelectorAll('.payment-cube:not(.cube-future)').forEach(cube => {
                cube.addEventListener('click', (e) => Mortgages.handleMortgageCubeClick(e.currentTarget));
            });

            // Show All button
            container.querySelector('.mortgage-show-all-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                Mortgages.loadPaymentCubes(mortgageId, container, true);
            });
        } catch (error) {
            console.error('Error loading mortgage payment cubes:', error);
            container.innerHTML = '<p class="loading">Error loading payment timeline.</p>';
        }
    },

    /**
     * Handle click on a mortgage payment cube
     */
    handleMortgageCubeClick: async (cubeEl) => {
        const month = cubeEl.dataset.month;
        const mortgageId = cubeEl.dataset.mortgageId;
        const paymentId = cubeEl.dataset.paymentId;

        const mortgages = await API.getMortgages();
        const mortgage = mortgages.find(m => String(m.id) === String(mortgageId));
        if (!mortgage) return;

        const form = document.getElementById('mortgage-payment-form');
        const deleteBtn = document.getElementById('delete-mortgage-payment');

        if (paymentId) {
            // Existing payment — edit
            const payments = await API.getMortgagePayments();
            const payment = payments.find(p => String(p.id) === String(paymentId));
            if (!payment) return;

            Mortgages._mortgagePaymentEditId = paymentId;
            document.getElementById('mp-mortgage-id').value = mortgageId;
            document.getElementById('mp-property-id').value = mortgage.property_id;
            document.getElementById('mp-month').value = payment.month;
            document.getElementById('mp-amount').value = payment.amount || '';
            document.getElementById('mp-amount-paid').value = payment.amount_paid || '';
            document.getElementById('mp-status').value = payment.status || 'paid';
            document.getElementById('mp-paid-date').value = payment.paid_date || '';
            document.querySelector('#mortgage-payment-modal .modal-header h3').textContent = 'Edit Payment';
            deleteBtn?.classList.remove('hidden');
        } else {
            // New payment — pre-fill with quick-pay values
            Mortgages._mortgagePaymentEditId = null;
            form.reset();
            document.getElementById('mp-mortgage-id').value = mortgageId;
            document.getElementById('mp-property-id').value = mortgage.property_id;
            document.getElementById('mp-month').value = month;
            document.getElementById('mp-amount').value = mortgage.monthly_payment || '';
            document.getElementById('mp-amount-paid').value = mortgage.monthly_payment || '';
            document.getElementById('mp-status').value = 'paid';
            document.getElementById('mp-paid-date').value = new Date().toISOString().split('T')[0];
            document.querySelector('#mortgage-payment-modal .modal-header h3').textContent = 'Record Payment';
            deleteBtn?.classList.add('hidden');
        }

        UI.modal.show('mortgage-payment-modal');
    },

    /**
     * Save a mortgage payment
     */
    saveMortgagePayment: async () => {
        try {
            const data = {
                mortgage_id: document.getElementById('mp-mortgage-id').value,
                property_id: document.getElementById('mp-property-id').value,
                month: document.getElementById('mp-month').value,
                amount: document.getElementById('mp-amount').value,
                amount_paid: document.getElementById('mp-amount-paid').value || document.getElementById('mp-amount').value,
                status: document.getElementById('mp-status').value,
                paid_date: document.getElementById('mp-paid-date').value
            };

            if (!data.month || !data.amount) {
                UI.showToast('Please fill in month and amount', 'error');
                return;
            }

            if (Mortgages._mortgagePaymentEditId) {
                await API.updateMortgagePayment(Mortgages._mortgagePaymentEditId, data);
                UI.showToast('Payment updated', 'success');
            } else {
                await API.addMortgagePayment(data);
                UI.showToast('Payment recorded', 'success');
            }

            UI.modal.hide('mortgage-payment-modal');
            await Mortgages.loadMortgages();
        } catch (error) {
            console.error('Error saving mortgage payment:', error);
            UI.showToast(error.message || 'Error saving payment', 'error');
        }
    },

    /**
     * Delete a mortgage payment
     */
    deleteMortgagePaymentRecord: async () => {
        if (!Mortgages._mortgagePaymentEditId) return;
        if (!confirm('Delete this mortgage payment record?')) return;

        try {
            await API.deleteMortgagePayment(Mortgages._mortgagePaymentEditId);
            UI.showToast('Payment deleted', 'success');
            UI.modal.hide('mortgage-payment-modal');
            await Mortgages.loadMortgages();
        } catch (error) {
            console.error('Error deleting mortgage payment:', error);
            UI.showToast(error.message || 'Error deleting payment', 'error');
        }
    },

    /**
     * Setup mortgage payment modal listeners (called from setupEventListeners)
     */
    setupMortgagePaymentListeners: () => {
        document.getElementById('mortgage-payment-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Mortgages.saveMortgagePayment();
        });

        document.getElementById('cancel-mortgage-payment')?.addEventListener('click', () => {
            UI.modal.hide('mortgage-payment-modal');
        });

        document.querySelector('#mortgage-payment-modal .close-btn')?.addEventListener('click', () => {
            UI.modal.hide('mortgage-payment-modal');
        });

        document.getElementById('delete-mortgage-payment')?.addEventListener('click', () => {
            Mortgages.deleteMortgagePaymentRecord();
        });
    }
};

// Expenses management module - Income & Expenses (P&L) view

const Expenses = {
    currentEditId: null,

    /**
     * Initialize expenses module
     */
    init: async () => {
        await Expenses.populatePropertySelect();
        Expenses.setupEventListeners();
        Expenses.initFilters();
        await Expenses.loadExpenses();
    },

    /**
     * Initialize filter controls with defaults
     */
    initFilters: () => {
        const monthInput = document.getElementById('pl-month-filter');
        const periodSelect = document.getElementById('pl-period-filter');
        if (monthInput) {
            monthInput.value = new Date().toISOString().substring(0, 7);
        }
        if (periodSelect) {
            periodSelect.value = 'month';
        }

        // Filter change listeners
        monthInput?.addEventListener('change', () => Expenses.loadExpenses());
        periodSelect?.addEventListener('change', () => Expenses.loadExpenses());
    },

    /**
     * Get filter date range based on controls
     */
    getFilterDateRange: () => {
        const monthInput = document.getElementById('pl-month-filter');
        const periodSelect = document.getElementById('pl-period-filter');
        const period = periodSelect?.value || 'month';
        const selectedMonth = monthInput?.value || new Date().toISOString().substring(0, 7);
        const [year, month] = selectedMonth.split('-').map(Number);

        let startDate, endDate;

        if (period === 'all') {
            return { startDate: null, endDate: null, label: 'All Time' };
        } else if (period === 'year') {
            startDate = `${year}-01`;
            endDate = `${year}-12`;
            return { startDate, endDate, label: `${year}` };
        } else if (period === 'quarter') {
            const q = Math.floor((month - 1) / 3);
            const qStart = q * 3 + 1;
            const qEnd = qStart + 2;
            startDate = `${year}-${String(qStart).padStart(2, '0')}`;
            endDate = `${year}-${String(qEnd).padStart(2, '0')}`;
            return { startDate, endDate, label: `Q${q + 1} ${year}` };
        } else {
            // month
            startDate = selectedMonth;
            endDate = selectedMonth;
            const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' });
            return { startDate, endDate, label: `${monthName} ${year}` };
        }
    },

    /**
     * Check if a YYYY-MM month falls within a date range
     */
    isMonthInRange: (monthStr, startDate, endDate) => {
        if (!startDate && !endDate) return true;
        if (startDate && monthStr < startDate) return false;
        if (endDate && monthStr > endDate) return false;
        return true;
    },

    /**
     * Check if a date string (YYYY-MM-DD) falls within a month range
     */
    isDateInRange: (dateStr, startMonth, endMonth) => {
        if (!startMonth && !endMonth) return true;
        if (!dateStr) return false;
        const month = dateStr.substring(0, 7);
        if (startMonth && month < startMonth) return false;
        if (endMonth && month > endMonth) return false;
        return true;
    },

    /**
     * Count months in range
     */
    getMonthsInRange: (startDate, endDate) => {
        if (!startDate || !endDate) return 1;
        const [sy, sm] = startDate.split('-').map(Number);
        const [ey, em] = endDate.split('-').map(Number);
        return (ey - sy) * 12 + (em - sm) + 1;
    },

    /**
     * Populate property dropdown in expense form
     */
    populatePropertySelect: async () => {
        try {
            const properties = await API.getProperties();
            const select = document.getElementById('expense-property-select');

            if (!select) return;

            const options = properties.map(p => `<option value="${p.id}">${p.address}</option>`).join('');
            select.innerHTML = '<option value="">Select property...</option>' + options;
        } catch (error) {
            console.error('Error populating property select:', error);
        }
    },

    /**
     * Load and display P&L view — income & expenses per property
     */
    loadExpenses: async () => {
        try {
            const [properties, tenants, mortgages, rentPayments, expenses] = await Promise.all([
                API.getProperties(),
                API.getTenants(),
                API.getMortgages(),
                API.getRentPayments(),
                API.getExpenses()
            ]);

            const container = document.getElementById('expenses-list');
            const { startDate, endDate, label } = Expenses.getFilterDateRange();
            const monthsInPeriod = Expenses.getMonthsInRange(startDate, endDate);

            let portfolioIncome = 0;
            let portfolioExpenses = 0;

            if (!properties || properties.length === 0) {
                container.innerHTML = '<p class="loading empty-state">No properties found. Add properties first.</p>';
                Expenses.renderPortfolioSummary(0, 0);
                return;
            }

            const html = properties.map(property => {
                const propId = String(property.id);

                // === INCOME: Rent from tenants ===
                const propTenants = tenants.filter(t => String(t.property_id) === propId && t.status === 'active');
                let incomeTotal = 0;
                let incomeRows = '';

                propTenants.forEach(tenant => {
                    const isSection8 = tenant.is_section8 === true || tenant.is_section8 === 'true' || tenant.is_section8 === 'on';

                    // Get actual paid rent in the period
                    const tenantPayments = rentPayments.filter(p =>
                        String(p.tenant_id) === String(tenant.id) &&
                        (p.status === 'paid' || p.status === 'partial') &&
                        Expenses.isMonthInRange(p.month, startDate, endDate)
                    );

                    const tenantIncome = tenantPayments.reduce((sum, p) => sum + (parseFloat(p.amount_paid) || parseFloat(p.amount) || 0), 0);
                    incomeTotal += tenantIncome;

                    if (isSection8 && tenantPayments.length > 0) {
                        const haTotal = tenantPayments.reduce((sum, p) => sum + (parseFloat(p.ha_paid) || 0), 0);
                        const tTotal = tenantPayments.reduce((sum, p) => sum + (parseFloat(p.tenant_paid) || 0), 0);
                        incomeRows += `
                            <tr class="pl-auto-row">
                                <td>${tenant.name} <span class="badge-section8 badge-small">S8</span></td>
                                <td class="pl-source">Auto (Rent Payments)</td>
                                <td class="amount-cell">${Formatting.currency(tenantIncome)}</td>
                            </tr>
                            <tr class="pl-sub-row">
                                <td>&nbsp;&nbsp;↳ HA Portion</td>
                                <td></td>
                                <td class="amount-cell">${Formatting.currency(haTotal)}</td>
                            </tr>
                            <tr class="pl-sub-row">
                                <td>&nbsp;&nbsp;↳ Tenant Portion</td>
                                <td></td>
                                <td class="amount-cell">${Formatting.currency(tTotal)}</td>
                            </tr>
                        `;
                    } else {
                        incomeRows += `
                            <tr class="pl-auto-row">
                                <td>${tenant.name}</td>
                                <td class="pl-source">Auto (Rent Payments)</td>
                                <td class="amount-cell">${Formatting.currency(tenantIncome)}</td>
                            </tr>
                        `;
                    }
                });

                if (propTenants.length === 0) {
                    incomeRows = `<tr class="pl-auto-row"><td colspan="3" style="text-align:center;opacity:0.5">No active tenants</td></tr>`;
                }

                // === FIXED EXPENSES: Mortgages ===
                const propMortgages = mortgages.filter(m => String(m.property_id) === propId);
                let fixedTotal = 0;
                let fixedRows = '';

                propMortgages.forEach(mortgage => {
                    const monthlyPmt = parseFloat(mortgage.monthly_payment) || 0;
                    const escrow = parseFloat(mortgage.escrow_payment) || 0;
                    const totalMonthly = monthlyPmt + escrow;
                    const periodAmount = totalMonthly * monthsInPeriod;
                    fixedTotal += periodAmount;

                    fixedRows += `
                        <tr class="pl-auto-row">
                            <td>${mortgage.lender} (P&I)</td>
                            <td class="pl-source">Auto (Mortgages)</td>
                            <td class="amount-cell">${Formatting.currency(monthlyPmt * monthsInPeriod)}</td>
                        </tr>
                    `;
                    if (escrow > 0) {
                        fixedRows += `
                            <tr class="pl-auto-row">
                                <td>${mortgage.lender} (Escrow)</td>
                                <td class="pl-source">Auto (Mortgages)</td>
                                <td class="amount-cell">${Formatting.currency(escrow * monthsInPeriod)}</td>
                            </tr>
                        `;
                    }
                });

                if (propMortgages.length === 0) {
                    fixedRows = `<tr class="pl-auto-row"><td colspan="3" style="text-align:center;opacity:0.5">No mortgages</td></tr>`;
                }

                // === VARIABLE EXPENSES: Manual entries ===
                const propExpenses = expenses.filter(e =>
                    String(e.property_id) === propId &&
                    Expenses.isDateInRange(e.date, startDate, endDate)
                );
                let variableTotal = propExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                let variableRows = '';

                if (propExpenses.length > 0) {
                    variableRows = propExpenses.map(expense => `
                        <tr>
                            <td>${expense.description || Expenses.formatCategory(expense.category)} <span class="category-badge category-${expense.category}" style="font-size:0.7em">${Expenses.formatCategory(expense.category)}</span></td>
                            <td>${Formatting.date(expense.date)}</td>
                            <td class="amount-cell">
                                ${Formatting.currency(expense.amount)}
                                <button class="btn-sm edit-expense-btn" data-id="${expense.id}" style="margin-left:4px">Edit</button>
                                <button class="btn-sm btn-danger delete-expense-btn" data-id="${expense.id}">Del</button>
                            </td>
                        </tr>
                    `).join('');
                } else {
                    variableRows = `<tr><td colspan="3" style="text-align:center;opacity:0.5">No expenses in period</td></tr>`;
                }

                const totalExpenses = fixedTotal + variableTotal;
                const net = incomeTotal - totalExpenses;
                const netClass = net >= 0 ? 'positive' : 'negative';

                portfolioIncome += incomeTotal;
                portfolioExpenses += totalExpenses;

                return `
                    <div class="property-pl-card">
                        <div class="property-pl-header">
                            <h4>${property.address}</h4>
                            <button class="btn-sm btn-outline pl-add-expense-btn" data-property-id="${propId}">+ Expense</button>
                        </div>

                        <div class="pl-section">
                            <div class="pl-section-title">Income</div>
                            <table class="pl-table">
                                <thead><tr><th>Source</th><th>Type</th><th>Amount</th></tr></thead>
                                <tbody>${incomeRows}</tbody>
                                <tfoot><tr class="pl-subtotal"><td colspan="2">Subtotal</td><td class="amount-cell">${Formatting.currency(incomeTotal)}</td></tr></tfoot>
                            </table>
                        </div>

                        <div class="pl-section">
                            <div class="pl-section-title">Fixed Expenses</div>
                            <table class="pl-table">
                                <thead><tr><th>Item</th><th>Type</th><th>Amount</th></tr></thead>
                                <tbody>${fixedRows}</tbody>
                                <tfoot><tr class="pl-subtotal"><td colspan="2">Subtotal</td><td class="amount-cell">${Formatting.currency(fixedTotal)}</td></tr></tfoot>
                            </table>
                        </div>

                        <div class="pl-section">
                            <div class="pl-section-title">Variable Expenses</div>
                            <table class="pl-table">
                                <thead><tr><th>Description</th><th>Date</th><th>Amount</th></tr></thead>
                                <tbody>${variableRows}</tbody>
                                <tfoot><tr class="pl-subtotal"><td colspan="2">Subtotal</td><td class="amount-cell">${Formatting.currency(variableTotal)}</td></tr></tfoot>
                            </table>
                        </div>

                        <div class="property-pl-footer">
                            <div class="pl-net-line ${netClass}">
                                <span>Net Cash Flow</span>
                                <span>${Formatting.currency(net)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;

            // Update portfolio summary
            Expenses.renderPortfolioSummary(portfolioIncome, portfolioExpenses);

            // Attach event listeners
            container.querySelectorAll('.edit-expense-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Expenses.editExpense(e.target.dataset.id));
            });
            container.querySelectorAll('.delete-expense-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Expenses.deleteExpense(e.target.dataset.id));
            });
            container.querySelectorAll('.pl-add-expense-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    Expenses.addExpenseForProperty(e.target.dataset.propertyId);
                });
            });
        } catch (error) {
            console.error('Error loading P&L view:', error);
            document.getElementById('expenses-list').innerHTML = '<p class="loading">Error loading income & expenses.</p>';
        }
    },

    /**
     * Render portfolio summary bar
     */
    renderPortfolioSummary: (income, expenses) => {
        const net = income - expenses;
        const incomeEl = document.getElementById('pl-total-income');
        const expenseEl = document.getElementById('pl-total-expenses');
        const netEl = document.getElementById('pl-net-cashflow');

        if (incomeEl) incomeEl.textContent = Formatting.currency(income);
        if (expenseEl) expenseEl.textContent = Formatting.currency(expenses);
        if (netEl) {
            netEl.textContent = Formatting.currency(net);
            const card = netEl.closest('.pl-summary-card');
            if (card) {
                card.classList.remove('positive', 'negative');
                card.classList.add(net >= 0 ? 'positive' : 'negative');
            }
        }
    },

    /**
     * Open expense modal with property pre-selected
     */
    addExpenseForProperty: async (propertyId) => {
        Expenses.currentEditId = null;
        document.getElementById('expense-form')?.reset();
        document.querySelector('#expense-modal .modal-header h3').textContent = 'Add Expense';
        await Expenses.populatePropertySelect();
        const select = document.getElementById('expense-property-select');
        if (select && propertyId) {
            select.value = propertyId;
        }
        // Set default date to today
        const dateInput = document.querySelector('#expense-form [name="date"]');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        UI.modal.show('expense-modal');
    },

    /**
     * Format category for display
     */
    formatCategory: (category) => {
        const map = {
            'closing_cost': 'Closing Cost',
            'taxes': 'Taxes',
            'insurance': 'Insurance',
            'maintenance': 'Maintenance',
            'hoa': 'HOA',
            'utilities': 'Utilities',
            'management': 'Management',
            'other': 'Other'
        };
        return map[category] || category || 'Other';
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: () => {
        // New expense button
        const openNewExpense = () => {
            Expenses.currentEditId = null;
            document.getElementById('expense-form')?.reset();
            document.querySelector('#expense-modal .modal-header h3').textContent = 'Add Expense';
            Expenses.populatePropertySelect();
            UI.modal.show('expense-modal');
        };
        document.getElementById('new-expense-btn')?.addEventListener('click', openNewExpense);

        // Header add button
        document.getElementById('add-item-btn')?.addEventListener('click', (e) => {
            if (e.currentTarget.dataset.action === 'add-expense') openNewExpense();
        });

        // Close modal
        document.querySelector('#expense-modal .close-btn')?.addEventListener('click', () => {
            UI.modal.hide('expense-modal');
        });

        // Cancel button
        document.getElementById('cancel-expense')?.addEventListener('click', () => {
            UI.modal.hide('expense-modal');
        });

        // Form submission
        document.getElementById('expense-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Expenses.saveExpense();
        });
    },

    /**
     * Edit expense
     */
    editExpense: async (expenseId) => {
        try {
            const expenses = await API.getExpenses();
            const expense = expenses.find(e => String(e.id) === String(expenseId));

            if (!expense) return;

            Expenses.currentEditId = expenseId;
            await Expenses.populatePropertySelect();

            const form = document.getElementById('expense-form');
            form.querySelector('[name="property_id"]').value = expense.property_id || '';
            form.querySelector('[name="category"]').value = expense.category || '';
            form.querySelector('[name="amount"]').value = expense.amount || '';
            form.querySelector('[name="date"]').value = expense.date || '';
            form.querySelector('[name="description"]').value = expense.description || '';

            document.querySelector('#expense-modal .modal-header h3').textContent = 'Edit Expense';
            UI.modal.show('expense-modal');
        } catch (error) {
            console.error('Error editing expense:', error);
            UI.showToast('Error loading expense', 'error');
        }
    },

    /**
     * Save expense (add or update)
     */
    saveExpense: async () => {
        try {
            const form = document.getElementById('expense-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Validate
            if (!data.property_id || !data.category || !data.amount || !data.date) {
                UI.showToast('Please fill in all required fields', 'error');
                return;
            }

            if (Expenses.currentEditId) {
                data.id = Expenses.currentEditId;
                await API.updateExpense(Expenses.currentEditId, data);
                UI.showToast('Expense updated successfully', 'success');
            } else {
                await API.addExpense(data);
                UI.showToast('Expense added successfully', 'success');
            }

            UI.modal.hide('expense-modal');
            Expenses.currentEditId = null;
            await Expenses.loadExpenses();
        } catch (error) {
            console.error('Error saving expense:', error);
            UI.showToast('Error saving expense', 'error');
        }
    },

    /**
     * Delete expense
     */
    deleteExpense: async (expenseId) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            await API.deleteExpense(expenseId);
            UI.showToast('Expense deleted', 'success');
            await Expenses.loadExpenses();
        } catch (error) {
            console.error('Error deleting expense:', error);
            UI.showToast('Error deleting expense', 'error');
        }
    }
};

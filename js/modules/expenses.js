// Expenses management module - track all property expenses

const Expenses = {
    currentEditId: null,

    /**
     * Initialize expenses module
     */
    init: async () => {
        await Expenses.populatePropertySelect();
        await Expenses.loadExpenses();
        Expenses.setupEventListeners();
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
     * Load and display all expenses
     */
    loadExpenses: async () => {
        try {
            const expenses = await API.getExpenses();
            const properties = await API.getProperties();
            const container = document.getElementById('expenses-list');

            if (!expenses || expenses.length === 0) {
                container.innerHTML = '<p class="loading">No expenses added yet. Click "New Expense" to add one!</p>';
                return;
            }

            // Group expenses by property
            const grouped = {};
            expenses.forEach(e => {
                if (!grouped[e.property_id]) {
                    grouped[e.property_id] = [];
                }
                grouped[e.property_id].push(e);
            });

            let html = '';
            for (const propId of Object.keys(grouped)) {
                const property = properties.find(p => String(p.id) === String(propId));
                const propertyAddress = property?.address || 'Unknown Property';
                const propExpenses = grouped[propId];
                const totalAmount = propExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

                html += `
                    <div class="property-expenses-group">
                        <div class="property-group-header">
                            <h4>📍 ${propertyAddress}</h4>
                            <span class="property-expense-total">Total: ${Formatting.currency(totalAmount)}</span>
                        </div>
                        <div class="expenses-table-wrapper">
                            <table class="expenses-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Category</th>
                                        <th>Description</th>
                                        <th>Amount</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${propExpenses.map(expense => `
                                        <tr>
                                            <td>${Formatting.date(expense.date)}</td>
                                            <td><span class="category-badge category-${expense.category}">${Expenses.formatCategory(expense.category)}</span></td>
                                            <td>${expense.description || '-'}</td>
                                            <td class="amount-cell">${Formatting.currency(expense.amount)}</td>
                                            <td class="actions-cell">
                                                <button class="btn-sm edit-expense-btn" data-id="${expense.id}">Edit</button>
                                                <button class="btn-sm btn-danger delete-expense-btn" data-id="${expense.id}">Delete</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html;

            // Attach event listeners
            container.querySelectorAll('.edit-expense-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Expenses.editExpense(e.target.dataset.id));
            });
            container.querySelectorAll('.delete-expense-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Expenses.deleteExpense(e.target.dataset.id));
            });
        } catch (error) {
            console.error('Error loading expenses:', error);
            document.getElementById('expenses-list').innerHTML = '<p class="loading">Error loading expenses.</p>';
        }
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

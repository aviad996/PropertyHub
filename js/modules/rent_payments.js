// Rent Payments module - track monthly rent collection and payment status

const RentPayments = {
    currentEditId: null,
    currentMonth: new Date().toISOString().substring(0, 7), // YYYY-MM format

    /**
     * Initialize rent payments module
     */
    init: async () => {
        await RentPayments.loadRentPayments();
        RentPayments.setupEventListeners();
    },

    /**
     * Load and display rent payments
     */
    loadRentPayments: async () => {
        try {
            const payments = await API.getRentPayments();
            const tenants = await API.getTenants();
            const properties = await API.getProperties();
            const container = document.getElementById('rent-payments-list');

            if (!payments || payments.length === 0) {
                container.innerHTML = '<p class="loading">No rent payments recorded yet. Click "Record Payment" to add one!</p>';
                return;
            }

            // Group by month
            const grouped = {};
            payments.forEach(p => {
                if (!grouped[p.month]) {
                    grouped[p.month] = [];
                }
                grouped[p.month].push(p);
            });

            // Sort months in reverse chronological order
            const sortedMonths = Object.keys(grouped).sort().reverse();

            const html = sortedMonths.map(month => {
                const monthPayments = grouped[month];
                let totalExpected = 0;
                let totalReceived = 0;
                let totalOutstanding = 0;
                let lateCount = 0;

                const paymentRows = monthPayments.map(payment => {
                    const tenant = tenants.find(t => String(t.id) === String(payment.tenant_id));
                    const propertyId = payment.property_id || (tenant ? tenant.property_id : null);
                    const property = propertyId ? properties.find(p => String(p.id) === String(propertyId)) : null;
                    const tenantName = tenant ? tenant.name : 'Unknown';
                    const propertyAddress = property ? property.address : 'Unknown';

                    totalExpected += payment.amount;

                    let statusBadge = '';
                    let statusClass = 'status-' + payment.status;

                    if (payment.status === 'paid') {
                        statusBadge = '✓ PAID';
                        totalReceived += payment.amount;
                    } else if (payment.status === 'pending') {
                        statusBadge = '⏳ PENDING';
                        totalOutstanding += payment.amount;
                    } else if (payment.status === 'late') {
                        statusBadge = '⚠️ LATE';
                        totalOutstanding += payment.amount;
                        lateCount++;
                    }

                    return `
                        <tr data-id="${payment.id}">
                            <td>${tenantName}</td>
                            <td>${propertyAddress}</td>
                            <td>${Formatting.currency(payment.amount)}</td>
                            <td class="${statusClass}"><span class="status-badge">${statusBadge}</span></td>
                            <td>${payment.paid_date ? Formatting.date(payment.paid_date) : '-'}</td>
                            <td class="payment-actions">
                                <button class="edit-btn btn-small" data-id="${payment.id}">Edit</button>
                                <button class="delete-btn btn-small" data-id="${payment.id}">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('');

                return `
                    <div class="rent-month-section">
                        <div class="month-header">
                            <h3>${new Date(month + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                            <div class="month-stats">
                                <span class="stat">Expected: ${Formatting.currency(totalExpected)}</span>
                                <span class="stat received">Received: ${Formatting.currency(totalReceived)}</span>
                                ${totalOutstanding > 0 ? `<span class="stat outstanding">Outstanding: ${Formatting.currency(totalOutstanding)}</span>` : ''}
                                ${lateCount > 0 ? `<span class="stat late">⚠️ ${lateCount} Late</span>` : ''}
                            </div>
                        </div>
                        <table class="payments-table">
                            <thead>
                                <tr>
                                    <th>Tenant</th>
                                    <th>Property</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Paid Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${paymentRows}
                            </tbody>
                        </table>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;

            // Attach event listeners
            container.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => RentPayments.editPayment(e.target.dataset.id));
            });

            container.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => RentPayments.deletePayment(e.target.dataset.id));
            });
        } catch (error) {
            console.error('Error loading rent payments:', error);
            UI.showToast('Error loading rent payments', 'error');
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: () => {
        // Record payment button
        document.getElementById('record-payment-btn')?.addEventListener('click', () => {
            RentPayments.currentEditId = null;
            document.getElementById('rent-payment-form').reset();
            document.querySelector('#rent-payment-modal .modal-header h3').textContent = 'Record Payment';

            // Set default month to current month
            document.getElementById('payment-month').value = RentPayments.currentMonth;

            UI.modal.show('rent-payment-modal');
        });

        // Close modal
        document.querySelector('#rent-payment-modal .close-btn')?.addEventListener('click', () => {
            UI.modal.hide('rent-payment-modal');
        });

        document.getElementById('cancel-rent-payment')?.addEventListener('click', () => {
            UI.modal.hide('rent-payment-modal');
        });

        // Form submission
        document.getElementById('rent-payment-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            RentPayments.savePayment();
        });

        // Tenant change - auto-fill amount
        document.getElementById('payment-tenant-select')?.addEventListener('change', async (e) => {
            if (e.target.value) {
                try {
                    const tenants = await API.getTenants();
                    const tenant = tenants.find(t => String(t.id) === String(e.target.value));
                    if (tenant && !document.getElementById('payment-amount').value) {
                        document.getElementById('payment-amount').value = tenant.monthly_rent || '';
                    }
                } catch (error) {
                    console.error('Error fetching tenant:', error);
                }
            }
        });
    },

    /**
     * Populate tenant dropdown for a property
     */
    populateTenantSelect: async (propertyId) => {
        try {
            const tenants = await API.getTenants();
            const propertyTenants = tenants.filter(t => String(t.property_id) === String(propertyId));
            const select = document.getElementById('payment-tenant-select');

            if (!select) return;

            const options = propertyTenants.map(t =>
                `<option value="${t.id}" data-rent="${t.monthly_rent}">${t.name}</option>`
            ).join('');

            select.innerHTML = '<option value="">Select tenant...</option>' + options;
        } catch (error) {
            console.error('Error populating tenant select:', error);
        }
    },

    /**
     * Edit payment
     */
    editPayment: async (paymentId) => {
        try {
            const payments = await API.getRentPayments();
            const payment = payments.find(p => String(p.id) === String(paymentId));

            if (!payment) return;

            RentPayments.currentEditId = paymentId;

            // Populate form
            document.getElementById('payment-month').value = payment.month || '';
            document.getElementById('payment-amount').value = payment.amount || '';
            document.getElementById('payment-status').value = payment.status || 'pending';
            document.getElementById('payment-paid-date').value = payment.paid_date || '';

            // Set tenant after property is set
            await RentPayments.populateTenantSelect(payment.property_id);
            document.getElementById('payment-tenant-select').value = payment.tenant_id || '';

            document.querySelector('#rent-payment-modal .modal-header h3').textContent = 'Edit Payment';
            UI.modal.show('rent-payment-modal');
        } catch (error) {
            console.error('Error editing payment:', error);
            UI.showToast('Error loading payment', 'error');
        }
    },

    /**
     * Save payment
     */
    savePayment: async () => {
        try {
            const month = document.getElementById('payment-month').value;
            const tenantId = document.getElementById('payment-tenant-select').value;
            const amount = parseFloat(document.getElementById('payment-amount').value);
            const status = document.getElementById('payment-status').value;
            const paidDate = document.getElementById('payment-paid-date').value;

            if (!month) {
                UI.showToast('Please select a month', 'error');
                return;
            }

            if (!tenantId) {
                UI.showToast('Please select a tenant', 'error');
                return;
            }

            if (!amount || amount <= 0) {
                UI.showToast('Please enter a valid amount', 'error');
                return;
            }

            if (status === 'paid' && !paidDate) {
                UI.showToast('Please enter paid date for completed payments', 'error');
                return;
            }

            // Get tenant to get property_id
            const tenants = await API.getTenants();
            const tenant = tenants.find(t => String(t.id) === String(tenantId));
            const propertyId = tenant?.property_id || '';

            const data = {
                month: month,
                tenant_id: tenantId,
                property_id: propertyId,
                amount: amount,
                status: status,
                paid_date: paidDate
            };

            if (RentPayments.currentEditId) {
                await API.updateRentPayment(RentPayments.currentEditId, data);
                UI.showToast('Payment updated successfully', 'success');
            } else {
                await API.addRentPayment(data);
                UI.showToast('Payment recorded successfully', 'success');
            }

            UI.modal.hide('rent-payment-modal');
            await RentPayments.loadRentPayments();
        } catch (error) {
            console.error('Error saving payment:', error);
            UI.showToast(error.message || 'Error saving payment', 'error');
        }
    },

    /**
     * Delete payment
     */
    deletePayment: async (paymentId) => {
        if (!confirm('Are you sure you want to delete this payment record?')) {
            return;
        }

        try {
            await API.deleteRentPayment(paymentId);
            UI.showToast('Payment deleted successfully', 'success');
            await RentPayments.loadRentPayments();
        } catch (error) {
            console.error('Error deleting payment:', error);
            UI.showToast(error.message || 'Error deleting payment', 'error');
        }
    }
};

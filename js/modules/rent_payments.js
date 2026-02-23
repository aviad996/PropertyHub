// Rent Payments module - track monthly rent collection and payment status

const RentPayments = {
    currentEditId: null,
    currentMonth: new Date().toISOString().substring(0, 7), // YYYY-MM format
    currentViewMode: 'cubes', // 'cubes' or 'table'

    /**
     * Initialize rent payments module
     */
    init: async () => {
        await RentPayments.populateAllTenants();
        RentPayments.setupEventListeners();
        RentPayments.setupViewToggle();
        if (RentPayments.currentViewMode === 'cubes') {
            await RentPayments.loadCubeView();
        } else {
            await RentPayments.loadRentPayments();
        }
    },

    /**
     * Generate array of YYYY-MM strings from start to end date
     */
    generateMonthRange: (startDate, endDate) => {
        const months = [];
        if (!startDate) return months;
        const current = new Date(startDate);
        current.setDate(1);
        const end = endDate ? new Date(endDate) : new Date();
        // Extend to at least current month + 1
        const now = new Date();
        now.setMonth(now.getMonth() + 1);
        const limit = new Date(Math.max(end.getTime(), now.getTime()));
        limit.setDate(1);

        while (current <= limit) {
            months.push(current.toISOString().substring(0, 7));
            current.setMonth(current.getMonth() + 1);
        }
        return months;
    },

    /**
     * Setup view toggle buttons
     */
    setupViewToggle: () => {
        document.getElementById('rent-view-cubes')?.addEventListener('click', () => {
            RentPayments.toggleView('cubes');
        });
        document.getElementById('rent-view-table')?.addEventListener('click', () => {
            RentPayments.toggleView('table');
        });
    },

    /**
     * Toggle between cube and table view
     */
    toggleView: async (mode) => {
        RentPayments.currentViewMode = mode;
        const cubesView = document.getElementById('rent-cubes-view');
        const tableView = document.getElementById('rent-payments-list');
        const cubesBtn = document.getElementById('rent-view-cubes');
        const tableBtn = document.getElementById('rent-view-table');

        if (mode === 'cubes') {
            cubesView?.classList.remove('hidden');
            tableView?.classList.add('hidden');
            cubesBtn?.classList.add('active');
            tableBtn?.classList.remove('active');
            await RentPayments.loadCubeView();
        } else {
            cubesView?.classList.add('hidden');
            tableView?.classList.remove('hidden');
            cubesBtn?.classList.remove('active');
            tableBtn?.classList.add('active');
            await RentPayments.loadRentPayments();
        }
    },

    /**
     * Load cube view — visual grid of monthly payment tiles per tenant
     */
    loadCubeView: async () => {
        try {
            const tenants = await API.getTenants();
            const payments = await API.getRentPayments();
            const properties = await API.getProperties();
            const container = document.getElementById('rent-cubes-view');
            if (!container) return;

            const activeTenants = tenants.filter(t => t.status === 'active');
            const today = new Date().toISOString().substring(0, 7);

            if (activeTenants.length === 0) {
                container.innerHTML = '<p class="loading empty-state">No active tenants. Add tenants to see payment cubes.</p>';
                return;
            }

            const html = activeTenants.map(tenant => {
                const property = properties.find(p => String(p.id) === String(tenant.property_id));
                const tenantPayments = payments.filter(p => String(p.tenant_id) === String(tenant.id));
                const months = RentPayments.generateMonthRange(tenant.lease_start_date, tenant.lease_end_date);

                // Build payment lookup: month -> payment record
                const paymentMap = {};
                tenantPayments.forEach(p => { paymentMap[p.month] = p; });

                const isSection8 = tenant.is_section8 === true || tenant.is_section8 === 'true' || tenant.is_section8 === 'on';

                let paidCount = 0, unpaidCount = 0;

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
                            unpaidCount++;
                            statusIcon = '&#8776;';
                        } else if (payment.status === 'late') {
                            unpaidCount++;
                            statusIcon = '!';
                        } else {
                            unpaidCount++;
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
                        unpaidCount++;
                        statusIcon = '';
                        tooltip = `${month} - No payment recorded`;
                    }

                    const currentClass = month === today ? ' cube-current' : '';
                    const [y, m] = month.split('-');
                    const monthName = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('en-US', { month: 'short' });

                    // Section 8 split display inside cube
                    let splitHtml = '';
                    if (isSection8 && payment && (payment.ha_paid || payment.tenant_paid)) {
                        const haOk = parseFloat(payment.ha_paid || 0) >= parseFloat(tenant.section8_ha_amount || 0);
                        const tOk = parseFloat(payment.tenant_paid || 0) >= parseFloat(tenant.section8_tenant_amount || 0);
                        splitHtml = `<div class="cube-split">
                            <span class="cube-ha" title="Housing Authority">${haOk ? '&#10003;' : '&#10007;'}</span>
                            <span class="cube-tenant" title="Tenant">${tOk ? '&#10003;' : '&#10007;'}</span>
                        </div>`;
                    }

                    return `<div class="payment-cube ${statusClass}${currentClass}"
                                 data-month="${month}" data-tenant-id="${tenant.id}"
                                 data-payment-id="${payment?.id || ''}"
                                 title="${tooltip}">
                        <span class="cube-month">${monthName}</span>
                        <span class="cube-year">${y}</span>
                        ${statusIcon ? `<span class="cube-status-icon">${statusIcon}</span>` : ''}
                        ${splitHtml}
                    </div>`;
                }).join('');

                const s8Badge = isSection8 ? ' <span class="badge-section8 badge-small">S8</span>' : '';

                return `<div class="tenant-cubes-section">
                    <div class="tenant-cubes-header">
                        <div class="tenant-cubes-name">
                            ${tenant.name}${s8Badge}
                            <span class="tenant-cubes-property">${property?.address || ''}</span>
                        </div>
                        <div class="tenant-cubes-stats">
                            <span>${Formatting.currency(tenant.monthly_rent)}/mo</span>
                            <span class="stat received">${paidCount} Paid</span>
                            ${unpaidCount > 0 ? `<span class="stat outstanding">${unpaidCount} Unpaid</span>` : ''}
                        </div>
                    </div>
                    <div class="payment-cubes-grid">${cubes}</div>
                </div>`;
            }).join('');

            container.innerHTML = html;

            // Attach click handlers to cubes
            container.querySelectorAll('.payment-cube:not(.cube-future)').forEach(cube => {
                cube.addEventListener('click', (e) => RentPayments.handleCubeClick(e.currentTarget));
            });
        } catch (error) {
            console.error('Error loading cube view:', error);
            const container = document.getElementById('rent-cubes-view');
            if (container) container.innerHTML = '<p class="loading">Error loading payment cubes.</p>';
        }
    },

    /**
     * Handle click on a payment cube
     */
    handleCubeClick: async (cubeEl) => {
        const month = cubeEl.dataset.month;
        const tenantId = cubeEl.dataset.tenantId;
        const paymentId = cubeEl.dataset.paymentId;

        if (paymentId) {
            // Existing payment — open edit form
            RentPayments.editPayment(paymentId);
        } else {
            // No payment exists — open new form pre-filled
            RentPayments.currentEditId = null;
            document.getElementById('rent-payment-form').reset();
            document.getElementById('payment-month').value = month;

            // Set tenant in dropdown
            await RentPayments.populateAllTenants();
            const select = document.getElementById('payment-tenant-select');
            if (select) {
                select.value = tenantId;
                // Trigger change to auto-fill amount and Section 8 fields
                select.dispatchEvent(new Event('change'));
            }

            // Auto-set status to paid + today's date for quick entry
            document.getElementById('payment-status').value = 'paid';
            document.getElementById('payment-paid-date').value = new Date().toISOString().split('T')[0];

            document.querySelector('#rent-payment-modal .modal-header h3').textContent = 'Record Payment';
            UI.modal.show('rent-payment-modal');
        }
    },

    /**
     * Populate tenant dropdown with all active tenants
     */
    populateAllTenants: async () => {
        try {
            const tenants = await API.getTenants();
            const properties = await API.getProperties();
            const select = document.getElementById('payment-tenant-select');
            if (!select) return;

            const options = tenants
                .filter(t => t.status === 'active')
                .map(t => {
                    const prop = properties.find(p => String(p.id) === String(t.property_id));
                    const addr = prop ? ` (${prop.address})` : '';
                    const s8 = (t.is_section8 === true || t.is_section8 === 'true' || t.is_section8 === 'on') ? ' [S8]' : '';
                    return `<option value="${t.id}" data-rent="${t.monthly_rent}">${t.name}${s8}${addr}</option>`;
                }).join('');

            select.innerHTML = '<option value="">Select tenant...</option>' + options;
        } catch (error) {
            console.error('Error populating tenant select:', error);
        }
    },

    /**
     * Calculate remaining months until lease end
     */
    getRemainingMonths: (leaseEndDate) => {
        if (!leaseEndDate) return null;
        const today = new Date();
        const end = new Date(leaseEndDate);
        const months = (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth());
        return months;
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
                container.innerHTML = '<p class="loading empty-state">No rent payments recorded yet. Click "Record Payment" to add one!</p>';
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
                let partialCount = 0;

                const paymentRows = monthPayments.map(payment => {
                    const tenant = tenants.find(t => String(t.id) === String(payment.tenant_id));
                    const propertyId = payment.property_id || (tenant ? tenant.property_id : null);
                    const property = propertyId ? properties.find(p => String(p.id) === String(propertyId)) : null;
                    const tenantName = tenant ? tenant.name : 'Unknown';
                    const propertyAddress = property ? property.address : 'Unknown';

                    // Check if tenant is Section 8
                    const isSection8 = tenant && (tenant.is_section8 === true || tenant.is_section8 === 'true' || tenant.is_section8 === 'on');

                    totalExpected += payment.amount;

                    // Calculate actual amount received
                    const amountPaid = payment.amount_paid !== undefined && payment.amount_paid !== '' && payment.amount_paid !== null
                        ? parseFloat(payment.amount_paid)
                        : (payment.status === 'paid' ? payment.amount : 0);

                    let statusBadge = '';
                    let statusClass = 'status-' + payment.status;

                    if (payment.status === 'paid') {
                        statusBadge = '✓ PAID';
                        totalReceived += payment.amount;
                    } else if (payment.status === 'partial') {
                        statusBadge = `⚡ PARTIAL`;
                        totalReceived += amountPaid;
                        totalOutstanding += (payment.amount - amountPaid);
                        partialCount++;
                    } else if (payment.status === 'pending') {
                        statusBadge = '⏳ PENDING';
                        totalOutstanding += payment.amount;
                    } else if (payment.status === 'late') {
                        statusBadge = '⚠️ LATE';
                        totalOutstanding += payment.amount;
                        lateCount++;
                    }

                    // Partial payment display
                    let amountDisplay = Formatting.currency(payment.amount);
                    if (payment.status === 'partial' && amountPaid > 0) {
                        amountDisplay = `<span class="partial-amount">${Formatting.currency(amountPaid)} / ${Formatting.currency(payment.amount)}</span>`;
                    }

                    // Section 8 split display
                    let section8Display = '';
                    if (isSection8) {
                        const haPaid = payment.ha_paid !== undefined && payment.ha_paid !== '' ? parseFloat(payment.ha_paid) : null;
                        const tenantPaid = payment.tenant_paid !== undefined && payment.tenant_paid !== '' ? parseFloat(payment.tenant_paid) : null;
                        const haExpected = tenant.section8_ha_amount || 0;
                        const tenantExpected = tenant.section8_tenant_amount || 0;

                        if (haPaid !== null || tenantPaid !== null) {
                            const haStatus = haPaid >= haExpected ? '✓' : '✗';
                            const tenantStatus = tenantPaid >= tenantExpected ? '✓' : '✗';
                            section8Display = `
                                <div class="payment-split">
                                    <span class="split-item ${haPaid >= haExpected ? 'split-paid' : 'split-unpaid'}">HA: ${Formatting.currency(haPaid || 0)} ${haStatus}</span>
                                    <span class="split-divider">|</span>
                                    <span class="split-item ${tenantPaid >= tenantExpected ? 'split-paid' : 'split-unpaid'}">Tenant: ${Formatting.currency(tenantPaid || 0)} ${tenantStatus}</span>
                                </div>`;
                        }
                    }

                    // Remaining payments for this tenant
                    const remainingMonths = tenant ? RentPayments.getRemainingMonths(tenant.lease_end_date) : null;
                    let remainingDisplay = '';
                    if (remainingMonths !== null) {
                        if (remainingMonths <= 0) {
                            remainingDisplay = '<span class="remaining-count remaining-expired" title="Lease expired">⚠️</span>';
                        } else if (remainingMonths <= 3) {
                            remainingDisplay = `<span class="remaining-count remaining-soon" title="${remainingMonths} payments remaining">🗓${remainingMonths}</span>`;
                        } else {
                            remainingDisplay = `<span class="remaining-count" title="${remainingMonths} payments remaining">🗓${remainingMonths}</span>`;
                        }
                    }

                    // Section 8 badge
                    const s8Badge = isSection8 ? '<span class="badge-section8 badge-small">S8</span>' : '';

                    return `
                        <tr data-id="${payment.id}">
                            <td>${tenantName} ${s8Badge} ${remainingDisplay}</td>
                            <td>${propertyAddress}</td>
                            <td>${amountDisplay}${section8Display}</td>
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
                                ${partialCount > 0 ? `<span class="stat partial">⚡ ${partialCount} Partial</span>` : ''}
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
        document.getElementById('record-payment-btn')?.addEventListener('click', async () => {
            RentPayments.currentEditId = null;
            document.getElementById('rent-payment-form').reset();
            document.querySelector('#rent-payment-modal .modal-header h3').textContent = 'Record Payment';

            // Set default month to current month
            document.getElementById('payment-month').value = RentPayments.currentMonth;

            // Refresh tenant list and hide Section 8 fields by default
            await RentPayments.populateAllTenants();
            document.getElementById('payment-section8-fields')?.classList.add('hidden');

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

        // Tenant change - auto-fill amount and show Section 8 fields if applicable
        document.getElementById('payment-tenant-select')?.addEventListener('change', async (e) => {
            if (e.target.value) {
                try {
                    const tenants = await API.getTenants();
                    const tenant = tenants.find(t => String(t.id) === String(e.target.value));
                    if (tenant) {
                        // Auto-fill expected amount
                        document.getElementById('payment-amount').value = tenant.monthly_rent || '';

                        // Check if Section 8 tenant
                        const isSection8 = tenant.is_section8 === true || tenant.is_section8 === 'true' || tenant.is_section8 === 'on';
                        const section8Fields = document.getElementById('payment-section8-fields');

                        if (isSection8 && section8Fields) {
                            section8Fields.classList.remove('hidden');
                            document.getElementById('payment-ha-paid').value = tenant.section8_ha_amount || '';
                            document.getElementById('payment-tenant-paid').value = tenant.section8_tenant_amount || '';
                            // Auto-calculate amount_paid from HA + tenant
                            const ha = parseFloat(tenant.section8_ha_amount) || 0;
                            const tp = parseFloat(tenant.section8_tenant_amount) || 0;
                            if (ha + tp > 0) {
                                const amountPaidField = document.getElementById('payment-amount-paid');
                                amountPaidField.value = (ha + tp).toFixed(2);
                            }
                        } else if (section8Fields) {
                            section8Fields.classList.add('hidden');
                            document.getElementById('payment-ha-paid').value = '';
                            document.getElementById('payment-tenant-paid').value = '';
                        }
                    }
                } catch (error) {
                    console.error('Error fetching tenant:', error);
                }
            } else {
                // No tenant selected, hide Section 8 fields
                document.getElementById('payment-section8-fields')?.classList.add('hidden');
            }
        });

        // Auto-calculate amount_paid from HA + tenant split
        const haPaidInput = document.getElementById('payment-ha-paid');
        const tenantPaidInput = document.getElementById('payment-tenant-paid');

        if (haPaidInput && tenantPaidInput) {
            const updateAmountPaid = () => {
                const ha = parseFloat(haPaidInput.value) || 0;
                const tp = parseFloat(tenantPaidInput.value) || 0;
                const total = ha + tp;
                if (total > 0) {
                    const amountPaidField = document.getElementById('payment-amount-paid');
                    amountPaidField.value = total.toFixed(2);
                    // Trigger auto-status detection
                    amountPaidField.dispatchEvent(new Event('input'));
                }
            };
            haPaidInput.addEventListener('input', updateAmountPaid);
            tenantPaidInput.addEventListener('input', updateAmountPaid);
        }

        // Auto-set status to partial when amount_paid < amount
        document.getElementById('payment-amount-paid')?.addEventListener('input', () => {
            const expected = parseFloat(document.getElementById('payment-amount').value) || 0;
            const paid = parseFloat(document.getElementById('payment-amount-paid').value) || 0;
            const statusSelect = document.getElementById('payment-status');

            if (paid > 0 && paid < expected) {
                statusSelect.value = 'partial';
            } else if (paid >= expected && paid > 0) {
                statusSelect.value = 'paid';
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
            document.getElementById('payment-amount-paid').value = payment.amount_paid || '';
            document.getElementById('payment-status').value = payment.status || 'pending';
            document.getElementById('payment-paid-date').value = payment.paid_date || '';

            // Section 8 fields
            const tenants = await API.getTenants();
            const tenant = tenants.find(t => String(t.id) === String(payment.tenant_id));
            const isSection8 = tenant && (tenant.is_section8 === true || tenant.is_section8 === 'true' || tenant.is_section8 === 'on');
            const section8Fields = document.getElementById('payment-section8-fields');

            if (isSection8 && section8Fields) {
                section8Fields.classList.remove('hidden');
                document.getElementById('payment-ha-paid').value = payment.ha_paid || '';
                document.getElementById('payment-tenant-paid').value = payment.tenant_paid || '';
            } else if (section8Fields) {
                section8Fields.classList.add('hidden');
            }

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
            const amountPaidRaw = document.getElementById('payment-amount-paid').value;
            const amountPaid = amountPaidRaw ? parseFloat(amountPaidRaw) : null;
            const status = document.getElementById('payment-status').value;
            const paidDate = document.getElementById('payment-paid-date').value;

            // Section 8 fields
            const haPaidRaw = document.getElementById('payment-ha-paid').value;
            const tenantPaidRaw = document.getElementById('payment-tenant-paid').value;

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
                amount_paid: amountPaid !== null ? amountPaid : (status === 'paid' ? amount : ''),
                status: status,
                paid_date: paidDate,
                ha_paid: haPaidRaw || '',
                tenant_paid: tenantPaidRaw || ''
            };

            if (RentPayments.currentEditId) {
                await API.updateRentPayment(RentPayments.currentEditId, data);
                UI.showToast('Payment updated successfully', 'success');
            } else {
                await API.addRentPayment(data);
                UI.showToast('Payment recorded successfully', 'success');
            }

            UI.modal.hide('rent-payment-modal');
            if (RentPayments.currentViewMode === 'cubes') {
                await RentPayments.loadCubeView();
            } else {
                await RentPayments.loadRentPayments();
            }
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
            if (RentPayments.currentViewMode === 'cubes') {
                await RentPayments.loadCubeView();
            } else {
                await RentPayments.loadRentPayments();
            }
        } catch (error) {
            console.error('Error deleting payment:', error);
            UI.showToast(error.message || 'Error deleting payment', 'error');
        }
    }
};

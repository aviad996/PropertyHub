// Tenants management module - track tenants, leases, and rent tracking

const Tenants = {
    currentEditId: null,

    /**
     * Initialize tenants module
     */
    init: async () => {
        await Tenants.populatePropertySelect();
        await Tenants.loadTenants();
        Tenants.setupEventListeners();
    },

    /**
     * Populate property dropdown
     */
    populatePropertySelect: async () => {
        try {
            const properties = await API.getProperties();
            Tenants._properties = properties; // cache for unit lookup
            const select = document.getElementById('tenant-property-select');

            if (!select) return;

            const options = properties.map(p => {
                const units = parseInt(p.units) || 1;
                const label = units > 1 ? `${p.address} (${units} units)` : p.address;
                return `<option value="${p.id}">${label}</option>`;
            }).join('');
            select.innerHTML = '<option value="">Select property...</option>' + options;
        } catch (error) {
            console.error('Error populating property select:', error);
        }
    },

    /**
     * Update unit selector based on selected property
     */
    updateUnitSelect: (propertyId) => {
        const unitGroup = document.getElementById('unit-select-group');
        const unitSelect = document.getElementById('tenant-unit-select');
        if (!unitGroup || !unitSelect) return;

        const property = (Tenants._properties || []).find(p => String(p.id) === String(propertyId));
        const units = parseInt(property?.units) || 1;

        if (units > 1) {
            // Multi-family: show unit selector
            unitGroup.style.display = '';
            unitSelect.required = true;
            let opts = '<option value="">Select unit...</option>';
            for (let i = 1; i <= units; i++) {
                opts += `<option value="${i}">Unit ${i}</option>`;
            }
            unitSelect.innerHTML = opts;
        } else {
            // Single-family: hide unit selector
            unitGroup.style.display = 'none';
            unitSelect.required = false;
            unitSelect.value = '';
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
     * Load and display all tenants
     */
    loadTenants: async () => {
        try {
            const tenants = await API.getTenants();
            const properties = await API.getProperties();
            const container = document.getElementById('tenants-list');

            if (!tenants || tenants.length === 0) {
                container.innerHTML = '<p class="loading">No tenants added yet. Click "New Tenant" to add one!</p>';
                return;
            }

            // Group tenants by property
            const grouped = {};
            tenants.forEach(t => {
                if (!grouped[t.property_id]) {
                    grouped[t.property_id] = [];
                }
                grouped[t.property_id].push(t);
            });

            const html = Object.entries(grouped).map(([propertyId, propertyTenants]) => {
                const property = properties.find(p => String(p.id) === String(propertyId));
                const propertyAddress = property ? property.address : 'Unknown Property';

                return `
                    <div class="tenants-section">
                        <h3>📍 ${propertyAddress}</h3>
                        <div class="tenants-grid">
                            ${propertyTenants.map(tenant => {
                                const leaseEnd = new Date(tenant.lease_end_date);
                                const today = new Date();
                                const daysUntilEnd = Math.ceil((leaseEnd - today) / (1000 * 60 * 60 * 24));
                                const statusBadge = daysUntilEnd < 60 ?
                                    `<span class="lease-warning">⚠️ Lease ending in ${daysUntilEnd} days</span>` :
                                    '';

                                // Section 8 badge
                                const isSection8 = tenant.is_section8 === true || tenant.is_section8 === 'true' || tenant.is_section8 === 'on';
                                const section8Badge = isSection8 ?
                                    `<span class="badge-section8">Section 8</span>` : '';

                                // Section 8 breakdown
                                const section8Detail = isSection8 && tenant.section8_ha_amount ?
                                    `<div class="detail">🏛️ HA: ${Formatting.currency(tenant.section8_ha_amount)} | Tenant: ${Formatting.currency(tenant.section8_tenant_amount || 0)}</div>` : '';

                                // Remaining payments count
                                const remainingMonths = Tenants.getRemainingMonths(tenant.lease_end_date);
                                let remainingBadge = '';
                                if (remainingMonths !== null) {
                                    if (remainingMonths <= 0) {
                                        remainingBadge = '<span class="remaining-count remaining-expired">⚠️ Lease expired</span>';
                                    } else if (remainingMonths <= 3) {
                                        remainingBadge = `<span class="remaining-count remaining-soon">🗓 ${remainingMonths} payments remaining</span>`;
                                    } else {
                                        remainingBadge = `<span class="remaining-count">🗓 ${remainingMonths} payments remaining</span>`;
                                    }
                                }

                                const unitBadge = tenant.unit_number ? `<span style="font-size:11px;background:rgba(59,130,246,0.2);padding:2px 6px;border-radius:4px;color:#60a5fa;margin-left:6px">Unit ${tenant.unit_number}</span>` : '';

                                return `
                                    <div class="tenant-card" data-id="${tenant.id}">
                                        <div class="tenant-header">
                                            <div class="tenant-name">${tenant.name} ${unitBadge} ${section8Badge}</div>
                                            <div class="tenant-status ${tenant.status}">${tenant.status}</div>
                                        </div>
                                        <div class="tenant-details">
                                            <div class="detail">📞 ${tenant.phone || 'N/A'}</div>
                                            <div class="detail">✉️ ${tenant.email || 'N/A'}</div>
                                            <div class="detail">💰 ${Formatting.currency(tenant.monthly_rent)}/month</div>
                                            ${section8Detail}
                                            <div class="detail">📅 ${Formatting.date(tenant.lease_start_date)} - ${Formatting.date(tenant.lease_end_date)}</div>
                                            ${tenant.security_deposit ? `<div class="detail">🔒 Deposit: ${Formatting.currency(tenant.security_deposit)}</div>` : ''}
                                        </div>
                                        ${remainingBadge}
                                        ${statusBadge}
                                        <div class="tenant-actions">
                                            <button class="edit-btn" data-id="${tenant.id}">Edit</button>
                                            <button class="delete-btn" data-id="${tenant.id}">Delete</button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;

            // Attach event listeners
            container.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Tenants.editTenant(e.target.dataset.id));
            });

            container.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Tenants.deleteTenant(e.target.dataset.id));
            });
        } catch (error) {
            console.error('Error loading tenants:', error);
            UI.showToast('Error loading tenants', 'error');
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: () => {
        // New tenant button
        const openNewTenant = () => {
            Tenants.currentEditId = null;
            document.getElementById('tenants-form').reset();
            document.querySelector('#tenants-modal .modal-header h3').textContent = 'Add Tenant';
            // Reset Section 8 fields
            document.getElementById('section8-fields')?.classList.add('hidden');
            document.getElementById('tenant-is-section8').checked = false;
            // Reset unit selector
            document.getElementById('unit-select-group').style.display = 'none';
            UI.modal.show('tenants-modal');
        };
        document.getElementById('new-tenant-btn')?.addEventListener('click', openNewTenant);

        // Header add button
        document.getElementById('add-item-btn')?.addEventListener('click', (e) => {
            if (e.currentTarget.dataset.action === 'add-tenant') openNewTenant();
        });

        // Property change → update unit selector
        document.getElementById('tenant-property-select')?.addEventListener('change', (e) => {
            Tenants.updateUnitSelect(e.target.value);
        });

        // Section 8 toggle
        document.getElementById('tenant-is-section8')?.addEventListener('change', (e) => {
            const fields = document.getElementById('section8-fields');
            if (e.target.checked) {
                fields.classList.remove('hidden');
            } else {
                fields.classList.add('hidden');
            }
        });

        // Auto-calculate Section 8 split when monthly rent or HA amount changes
        const rentInput = document.getElementById('tenant-monthly-rent');
        const haInput = document.getElementById('tenant-section8-ha');
        const tenantPayInput = document.getElementById('tenant-section8-tenant');

        if (haInput && tenantPayInput && rentInput) {
            haInput.addEventListener('input', () => {
                const rent = parseFloat(rentInput.value) || 0;
                const ha = parseFloat(haInput.value) || 0;
                tenantPayInput.value = Math.max(0, rent - ha).toFixed(2);
            });

            tenantPayInput.addEventListener('input', () => {
                const rent = parseFloat(rentInput.value) || 0;
                const tenantPay = parseFloat(tenantPayInput.value) || 0;
                haInput.value = Math.max(0, rent - tenantPay).toFixed(2);
            });

            rentInput.addEventListener('input', () => {
                if (document.getElementById('tenant-is-section8').checked && haInput.value) {
                    const rent = parseFloat(rentInput.value) || 0;
                    const ha = parseFloat(haInput.value) || 0;
                    tenantPayInput.value = Math.max(0, rent - ha).toFixed(2);
                }
            });
        }

        // Close modal
        document.querySelector('#tenants-modal .close-btn')?.addEventListener('click', () => {
            UI.modal.hide('tenants-modal');
        });

        document.getElementById('cancel-tenant')?.addEventListener('click', () => {
            UI.modal.hide('tenants-modal');
        });

        // Form submission
        document.getElementById('tenants-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Tenants.saveTenant();
        });
    },

    /**
     * Edit tenant
     */
    editTenant: async (tenantId) => {
        try {
            const tenants = await API.getTenants();
            const tenant = tenants.find(t => String(t.id) === String(tenantId));

            if (!tenant) return;

            Tenants.currentEditId = tenantId;
            const form = document.getElementById('tenants-form');

            form.querySelector('[name="property_id"]').value = tenant.property_id || '';
            // Update unit selector for this property, then set unit value
            Tenants.updateUnitSelect(tenant.property_id);
            if (tenant.unit_number) {
                const unitSelect = document.getElementById('tenant-unit-select');
                if (unitSelect) unitSelect.value = tenant.unit_number;
            }
            form.querySelector('[name="name"]').value = tenant.name || '';
            form.querySelector('[name="email"]').value = tenant.email || '';
            form.querySelector('[name="phone"]').value = tenant.phone || '';
            form.querySelector('[name="lease_start_date"]').value = tenant.lease_start_date || '';
            form.querySelector('[name="lease_end_date"]').value = tenant.lease_end_date || '';
            form.querySelector('[name="monthly_rent"]').value = tenant.monthly_rent || '';
            form.querySelector('[name="security_deposit"]').value = tenant.security_deposit || '';
            form.querySelector('[name="status"]').value = tenant.status || 'active';

            // Section 8 fields
            const isSection8 = tenant.is_section8 === true || tenant.is_section8 === 'true' || tenant.is_section8 === 'on';
            const section8Checkbox = document.getElementById('tenant-is-section8');
            const section8Fields = document.getElementById('section8-fields');
            section8Checkbox.checked = isSection8;

            if (isSection8) {
                section8Fields.classList.remove('hidden');
                document.getElementById('tenant-section8-ha').value = tenant.section8_ha_amount || '';
                document.getElementById('tenant-section8-tenant').value = tenant.section8_tenant_amount || '';
            } else {
                section8Fields.classList.add('hidden');
                document.getElementById('tenant-section8-ha').value = '';
                document.getElementById('tenant-section8-tenant').value = '';
            }

            document.querySelector('#tenants-modal .modal-header h3').textContent = 'Edit Tenant';
            UI.modal.show('tenants-modal');
        } catch (error) {
            console.error('Error editing tenant:', error);
            UI.showToast('Error loading tenant', 'error');
        }
    },

    /**
     * Save tenant
     */
    saveTenant: async () => {
        try {
            const form = document.getElementById('tenants-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            if (!data.name) {
                UI.showToast('Please enter tenant name', 'error');
                return;
            }

            if (!data.property_id) {
                UI.showToast('Please select a property', 'error');
                return;
            }

            if (!data.lease_start_date || !data.lease_end_date) {
                UI.showToast('Please enter lease dates', 'error');
                return;
            }

            if (new Date(data.lease_start_date) >= new Date(data.lease_end_date)) {
                UI.showToast('Lease start date must be before end date', 'error');
                return;
            }

            // Handle Section 8 checkbox (FormData doesn't include unchecked)
            const isSection8 = document.getElementById('tenant-is-section8').checked;
            data.is_section8 = isSection8 ? 'true' : 'false';

            if (!isSection8) {
                data.section8_ha_amount = '';
                data.section8_tenant_amount = '';
            }

            if (Tenants.currentEditId) {
                // Update
                await API.updateTenant(Tenants.currentEditId, data);
                UI.showToast('Tenant updated successfully', 'success');
            } else {
                // Add new
                await API.addTenant(data);
                UI.showToast('Tenant added successfully', 'success');
            }

            UI.modal.hide('tenants-modal');
            await Tenants.loadTenants();
        } catch (error) {
            console.error('Error saving tenant:', error);
            UI.showToast(error.message || 'Error saving tenant', 'error');
        }
    },

    /**
     * Delete tenant
     */
    deleteTenant: async (tenantId) => {
        if (!confirm('Are you sure you want to delete this tenant? Associated rent payments will remain.')) {
            return;
        }

        try {
            await API.deleteTenant(tenantId);
            UI.showToast('Tenant deleted successfully', 'success');
            await Tenants.loadTenants();
        } catch (error) {
            console.error('Error deleting tenant:', error);
            UI.showToast(error.message || 'Error deleting tenant', 'error');
        }
    }
};

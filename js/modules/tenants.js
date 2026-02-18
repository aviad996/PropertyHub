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
            const select = document.getElementById('tenant-property-select');

            if (!select) return;

            const options = properties.map(p => `<option value="${p.id}">${p.address}</option>`).join('');
            select.innerHTML = '<option value="">Select property...</option>' + options;
        } catch (error) {
            console.error('Error populating property select:', error);
        }
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
                const property = properties.find(p => p.id === propertyId);
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

                                return `
                                    <div class="tenant-card" data-id="${tenant.id}">
                                        <div class="tenant-header">
                                            <div class="tenant-name">${tenant.name}</div>
                                            <div class="tenant-status ${tenant.status}">${tenant.status}</div>
                                        </div>
                                        <div class="tenant-details">
                                            <div class="detail">📞 ${tenant.phone || 'N/A'}</div>
                                            <div class="detail">✉️ ${tenant.email || 'N/A'}</div>
                                            <div class="detail">💰 $${Formatting.currency(tenant.monthly_rent)}/month</div>
                                            <div class="detail">📅 ${Formatting.date(tenant.lease_start_date)} - ${Formatting.date(tenant.lease_end_date)}</div>
                                            ${tenant.security_deposit ? `<div class="detail">🔒 Deposit: $${Formatting.currency(tenant.security_deposit)}</div>` : ''}
                                        </div>
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
        document.getElementById('new-tenant-btn')?.addEventListener('click', () => {
            Tenants.currentEditId = null;
            document.getElementById('tenants-form').reset();
            document.querySelector('#tenants-modal .modal-header h3').textContent = 'Add Tenant';
            UI.modal.show('tenants-modal');
        });

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
            const tenant = tenants.find(t => t.id === tenantId);

            if (!tenant) return;

            Tenants.currentEditId = tenantId;
            const form = document.getElementById('tenants-form');

            form.querySelector('[name="property_id"]').value = tenant.property_id || '';
            form.querySelector('[name="name"]').value = tenant.name || '';
            form.querySelector('[name="email"]').value = tenant.email || '';
            form.querySelector('[name="phone"]').value = tenant.phone || '';
            form.querySelector('[name="lease_start_date"]').value = tenant.lease_start_date || '';
            form.querySelector('[name="lease_end_date"]').value = tenant.lease_end_date || '';
            form.querySelector('[name="monthly_rent"]').value = tenant.monthly_rent || '';
            form.querySelector('[name="security_deposit"]').value = tenant.security_deposit || '';
            form.querySelector('[name="status"]').value = tenant.status || 'active';

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

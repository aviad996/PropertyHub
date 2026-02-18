// Insurance management module - policy tracking and renewal management

const Insurance = {
    currentEditId: null,

    /**
     * Initialize insurance module
     */
    init: async () => {
        await Insurance.populatePropertySelect();
        await Insurance.loadInsurance();
        Insurance.setupEventListeners();
    },

    /**
     * Populate property dropdown
     */
    populatePropertySelect: async () => {
        try {
            const properties = await API.getProperties();
            const select = document.getElementById('insurance-property-select');

            if (!select) return;

            const options = properties.map(p => `<option value="${p.id}">${p.address}</option>`).join('');
            select.innerHTML = '<option value="">Select property...</option>' + options;
        } catch (error) {
            console.error('Error populating property select:', error);
        }
    },

    /**
     * Load and display all insurance policies
     */
    loadInsurance: async () => {
        try {
            const policies = await API.getInsurance();
            const properties = await API.getProperties();
            const container = document.getElementById('insurance-list');

            if (!policies || policies.length === 0) {
                container.innerHTML = '<p class="loading">No insurance policies added yet. Click "New Policy" to add one!</p>';
                return;
            }

            // Group by property, then by policy type
            const grouped = {};
            policies.forEach(p => {
                if (!grouped[p.property_id]) {
                    grouped[p.property_id] = {};
                }
                const type = p.policy_type || 'other';
                if (!grouped[p.property_id][type]) {
                    grouped[p.property_id][type] = [];
                }
                grouped[p.property_id][type].push(p);
            });

            const typeLabels = {
                property: '🏠 Property Insurance',
                liability: '⚖️ Liability Insurance',
                umbrella: '☂️ Umbrella Insurance',
                other: '📋 Other'
            };

            const typeIcons = {
                property: '🏠',
                liability: '⚖️',
                umbrella: '☂️',
                other: '📋'
            };

            const html = Object.entries(grouped).map(([propertyId, types]) => {
                const property = properties.find(p => String(p.id) === String(propertyId));
                const propertyAddress = property ? property.address : 'Unknown Property';

                let totalPremium = 0;
                types.property?.forEach(p => totalPremium += parseFloat(p.annual_premium) || 0);
                types.liability?.forEach(p => totalPremium += parseFloat(p.annual_premium) || 0);
                types.umbrella?.forEach(p => totalPremium += parseFloat(p.annual_premium) || 0);
                types.other?.forEach(p => totalPremium += parseFloat(p.annual_premium) || 0);

                return `
                    <div class="insurance-property">
                        <div class="property-header">
                            <h3>📍 ${propertyAddress}</h3>
                            <div class="property-premium">Total Annual Premium: ${Formatting.currency(totalPremium)}</div>
                        </div>

                        <div class="policies-grid">
                            ${Object.entries(types).map(([type, typePolicies]) => {
                                return typePolicies.map(policy => {
                                    const expiryDate = new Date(policy.expiry_date);
                                    const today = new Date();
                                    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

                                    let expiryStatus = 'expiry-good';
                                    let expiryLabel = `Expires in ${daysUntilExpiry} days`;

                                    if (daysUntilExpiry < 0) {
                                        expiryStatus = 'expiry-expired';
                                        expiryLabel = '⚠️ EXPIRED';
                                    } else if (daysUntilExpiry < 30) {
                                        expiryStatus = 'expiry-urgent';
                                        expiryLabel = `⚠️ Renewing in ${daysUntilExpiry} days`;
                                    } else if (daysUntilExpiry < 90) {
                                        expiryStatus = 'expiry-warning';
                                        expiryLabel = `🔔 Renewing in ${daysUntilExpiry} days`;
                                    }

                                    return `
                                        <div class="policy-card" data-id="${policy.id}">
                                            <div class="policy-header">
                                                <div class="policy-type">${typeLabels[type] || type}</div>
                                                <div class="policy-provider">${policy.provider}</div>
                                            </div>
                                            <div class="policy-details">
                                                ${policy.policy_number ? `<div class="detail">Policy #: ${policy.policy_number}</div>` : ''}
                                                ${policy.coverage_amount ? `<div class="detail">Coverage: ${Formatting.currency(policy.coverage_amount)}</div>` : ''}
                                                <div class="detail">Premium: ${Formatting.currency(policy.annual_premium || 0)}/year</div>
                                                <div class="detail ${expiryStatus}">${expiryLabel}</div>
                                                <div class="detail">Expires: ${Formatting.date(policy.expiry_date)}</div>
                                            </div>
                                            <div class="policy-actions">
                                                <button class="edit-btn" data-id="${policy.id}">Edit</button>
                                                <button class="delete-btn" data-id="${policy.id}">Delete</button>
                                            </div>
                                        </div>
                                    `;
                                }).join('');
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;

            // Attach event listeners
            container.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Insurance.editInsurance(e.target.dataset.id));
            });

            container.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Insurance.deleteInsurance(e.target.dataset.id));
            });
        } catch (error) {
            console.error('Error loading insurance:', error);
            UI.showToast('Error loading insurance policies', 'error');
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: () => {
        // New policy button
        document.getElementById('new-insurance-btn')?.addEventListener('click', () => {
            Insurance.currentEditId = null;
            document.getElementById('insurance-form').reset();
            document.querySelector('#insurance-modal .modal-header h3').textContent = 'Add Insurance Policy';
            UI.modal.show('insurance-modal');
        });

        // Close modal
        document.querySelector('#insurance-modal .close-btn')?.addEventListener('click', () => {
            UI.modal.hide('insurance-modal');
        });

        document.getElementById('cancel-insurance')?.addEventListener('click', () => {
            UI.modal.hide('insurance-modal');
        });

        // Form submission
        document.getElementById('insurance-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Insurance.saveInsurance();
        });
    },

    /**
     * Edit insurance policy
     */
    editInsurance: async (policyId) => {
        try {
            const policies = await API.getInsurance();
            const policy = policies.find(p => String(p.id) === String(policyId));

            if (!policy) return;

            Insurance.currentEditId = policyId;
            const form = document.getElementById('insurance-form');

            form.querySelector('[name="property_id"]').value = policy.property_id || '';
            form.querySelector('[name="policy_type"]').value = policy.policy_type || '';
            form.querySelector('[name="provider"]').value = policy.provider || '';
            form.querySelector('[name="policy_number"]').value = policy.policy_number || '';
            form.querySelector('[name="coverage_amount"]').value = policy.coverage_amount || '';
            form.querySelector('[name="annual_premium"]').value = policy.annual_premium || '';
            form.querySelector('[name="expiry_date"]').value = policy.expiry_date || '';

            document.querySelector('#insurance-modal .modal-header h3').textContent = 'Edit Insurance Policy';
            UI.modal.show('insurance-modal');
        } catch (error) {
            console.error('Error editing insurance:', error);
            UI.showToast('Error loading policy', 'error');
        }
    },

    /**
     * Save insurance policy
     */
    saveInsurance: async () => {
        try {
            const form = document.getElementById('insurance-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            if (!data.property_id) {
                UI.showToast('Please select a property', 'error');
                return;
            }

            if (!data.policy_type) {
                UI.showToast('Please select a policy type', 'error');
                return;
            }

            if (!data.provider) {
                UI.showToast('Please enter provider name', 'error');
                return;
            }

            if (!data.expiry_date) {
                UI.showToast('Please enter expiry date', 'error');
                return;
            }

            if (Insurance.currentEditId) {
                // Update
                await API.updateInsurance(Insurance.currentEditId, data);
                UI.showToast('Insurance policy updated successfully', 'success');
            } else {
                // Add new
                await API.addInsurance(data);
                UI.showToast('Insurance policy added successfully', 'success');
            }

            UI.modal.hide('insurance-modal');
            await Insurance.loadInsurance();
        } catch (error) {
            console.error('Error saving insurance:', error);
            UI.showToast(error.message || 'Error saving policy', 'error');
        }
    },

    /**
     * Delete insurance policy
     */
    deleteInsurance: async (policyId) => {
        if (!confirm('Are you sure you want to delete this insurance policy?')) {
            return;
        }

        try {
            await API.deleteInsurance(policyId);
            UI.showToast('Insurance policy deleted successfully', 'success');
            await Insurance.loadInsurance();
        } catch (error) {
            console.error('Error deleting insurance:', error);
            UI.showToast(error.message || 'Error deleting policy', 'error');
        }
    }
};

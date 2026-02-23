// Utilities management module - electricity, water, gas tracking

const Utilities = {
    currentEditId: null,

    /**
     * Initialize utilities module
     */
    init: async () => {
        await Utilities.loadUtilities();
        Utilities.setupEventListeners();
    },

    /**
     * Load and display utilities for all properties
     */
    loadUtilities: async () => {
        try {
            const properties = await API.getProperties();
            const container = document.getElementById('utilities-list');

            if (!properties || properties.length === 0) {
                container.innerHTML = '<p class="loading empty-state">No properties with utilities configured.</p>';
                return;
            }

            // Group by property and show utilities
            const html = properties.map(prop => {
                const utilities = {
                    electricity: {
                        provider: prop.electricity_provider || 'Not configured',
                        account: prop.electricity_account_num || '-',
                        responsibility: prop.electricity_responsibility || 'Owner'
                    },
                    water: {
                        provider: prop.water_provider || 'Not configured',
                        account: prop.water_account_num || '-',
                        responsibility: prop.water_responsibility || 'Owner'
                    },
                    gas: {
                        provider: prop.gas_provider || 'Not configured',
                        account: prop.gas_account_num || '-',
                        responsibility: prop.gas_responsibility || 'Owner'
                    }
                };

                return `
                    <div class="utilities-card" data-property-id="${prop.id}">
                        <div class="card-header">
                            <h3>${prop.address}</h3>
                            <button class="btn-small edit-btn" data-id="${prop.id}">Edit</button>
                        </div>

                        <div class="utilities-grid">
                            <!-- Electricity -->
                            <div class="utility-item">
                                <div class="utility-icon">⚡</div>
                                <div class="utility-info">
                                    <div class="utility-name">Electricity</div>
                                    <div class="utility-detail">Provider: ${utilities.electricity.provider}</div>
                                    <div class="utility-detail">Account: ${utilities.electricity.account}</div>
                                    <div class="utility-responsibility ${utilities.electricity.responsibility.toLowerCase()}">
                                        ${utilities.electricity.responsibility}
                                    </div>
                                </div>
                            </div>

                            <!-- Water -->
                            <div class="utility-item">
                                <div class="utility-icon">💧</div>
                                <div class="utility-info">
                                    <div class="utility-name">Water</div>
                                    <div class="utility-detail">Provider: ${utilities.water.provider}</div>
                                    <div class="utility-detail">Account: ${utilities.water.account}</div>
                                    <div class="utility-responsibility ${utilities.water.responsibility.toLowerCase()}">
                                        ${utilities.water.responsibility}
                                    </div>
                                </div>
                            </div>

                            <!-- Gas -->
                            <div class="utility-item">
                                <div class="utility-icon">🔥</div>
                                <div class="utility-info">
                                    <div class="utility-name">Gas</div>
                                    <div class="utility-detail">Provider: ${utilities.gas.provider}</div>
                                    <div class="utility-detail">Account: ${utilities.gas.account}</div>
                                    <div class="utility-responsibility ${utilities.gas.responsibility.toLowerCase()}">
                                        ${utilities.gas.responsibility}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;

            // Attach event listeners
            container.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Utilities.editUtilities(e.target.dataset.id));
            });
        } catch (error) {
            console.error('Error loading utilities:', error);
            UI.showToast('Error loading utilities', 'error');
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: () => {
        // Close modal
        document.querySelector('#utilities-modal .close-btn')?.addEventListener('click', () => {
            UI.modal.hide('utilities-modal');
        });

        document.getElementById('cancel-utilities')?.addEventListener('click', () => {
            UI.modal.hide('utilities-modal');
        });

        // Form submission
        document.getElementById('utilities-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Utilities.saveUtilities();
        });
    },

    /**
     * Edit utilities for a property
     */
    editUtilities: async (propertyId) => {
        try {
            const properties = await API.getProperties();
            const property = properties.find(p => String(p.id) === String(propertyId));

            if (!property) return;

            Utilities.currentEditId = propertyId;
            const form = document.getElementById('utilities-form');

            // Populate form
            form.querySelector('[name="address"]').value = property.address || '';
            form.querySelector('[name="electricity_provider"]').value = property.electricity_provider || '';
            form.querySelector('[name="electricity_account_num"]').value = property.electricity_account_num || '';
            form.querySelector('[name="electricity_responsibility"]').value = property.electricity_responsibility || 'Owner';
            form.querySelector('[name="water_provider"]').value = property.water_provider || '';
            form.querySelector('[name="water_account_num"]').value = property.water_account_num || '';
            form.querySelector('[name="water_responsibility"]').value = property.water_responsibility || 'Owner';
            form.querySelector('[name="gas_provider"]').value = property.gas_provider || '';
            form.querySelector('[name="gas_account_num"]').value = property.gas_account_num || '';
            form.querySelector('[name="gas_responsibility"]').value = property.gas_responsibility || 'Owner';

            document.querySelector('#utilities-modal .modal-header h3').textContent = 'Edit Utilities';
            UI.modal.show('utilities-modal');
        } catch (error) {
            console.error('Error editing utilities:', error);
            UI.showToast('Error loading utilities', 'error');
        }
    },

    /**
     * Save utilities
     */
    saveUtilities: async () => {
        try {
            const form = document.getElementById('utilities-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            if (!Utilities.currentEditId) {
                UI.showToast('No property selected', 'error');
                return;
            }

            await API.updateProperty(Utilities.currentEditId, data);
            UI.showToast('Utilities updated successfully', 'success');
            UI.modal.hide('utilities-modal');
            await Utilities.loadUtilities();
        } catch (error) {
            console.error('Error saving utilities:', error);
            UI.showToast(error.message || 'Error saving utilities', 'error');
        }
    }
};

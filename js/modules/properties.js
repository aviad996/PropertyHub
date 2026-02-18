// Properties module

const Properties = {
    currentEditId: null,

    /**
     * Initialize properties module
     */
    init: async () => {
        await Properties.loadProperties();
        Properties.setupEventListeners();
    },

    /**
     * Load and display all properties
     */
    loadProperties: async () => {
        try {
            const properties = await API.getProperties();
            const mortgages = await API.getMortgages();

            const listContainer = document.getElementById('properties-list');

            if (!properties || properties.length === 0) {
                listContainer.innerHTML = '<p class="loading">No properties added yet. Click "New Property" to add one!</p>';
                return;
            }

            const html = properties.map(prop => {
                const mortgage = mortgages?.find(m => String(m.property_id) === String(prop.id));
                const equity = (prop.current_value || 0) - (mortgage?.current_balance || 0);
                const ltv = mortgage ? ((mortgage.current_balance / prop.current_value) * 100).toFixed(1) : 'N/A';

                return `
                    <div class="list-item" data-id="${prop.id}">
                        <div class="list-item-content">
                            <div class="list-item-title">${prop.address}</div>
                            <div class="list-item-details">
                                <div class="detail-item">
                                    <span class="detail-label">Location:</span> ${prop.city}, ${prop.state}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Purchased:</span> ${Formatting.date(prop.purchase_date)}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Purchase Price:</span> ${Formatting.currency(prop.purchase_price)}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Current Value:</span> ${Formatting.currency(prop.current_value)}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Appreciation:</span> ${Formatting.currency(prop.current_value - prop.purchase_price)}
                                </div>
                                ${mortgage ? `
                                    <div class="detail-item">
                                        <span class="detail-label">Equity:</span> ${Formatting.currency(equity)} (${ltv}% LTV)
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Mortgage Balance:</span> ${Formatting.currency(mortgage.current_balance)}
                                    </div>
                                ` : '<div class="detail-item"><span class="detail-label">No mortgage</span></div>'}
                            </div>
                        </div>
                        <div class="list-item-actions">
                            <button class="edit-btn" data-id="${prop.id}">Edit</button>
                            <button class="delete-btn" data-id="${prop.id}">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');

            listContainer.innerHTML = html;

            // Attach event listeners
            listContainer.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Properties.editProperty(e.target.dataset.id));
            });

            listContainer.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Properties.deleteProperty(e.target.dataset.id));
            });
        } catch (error) {
            console.error('Error loading properties:', error);
            UI.showToast('Error loading properties', 'error');
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: () => {
        // New property button
        document.getElementById('new-property-btn')?.addEventListener('click', () => {
            Properties.currentEditId = null;
            document.getElementById('property-form').reset();
            document.querySelector('#property-modal .modal-header h3').textContent = 'Add Property';
            UI.modal.show('property-modal');
        });

        // Close modal button
        document.querySelector('#property-modal .close-btn')?.addEventListener('click', () => {
            UI.modal.hide('property-modal');
        });

        // Cancel button
        document.getElementById('cancel-property')?.addEventListener('click', () => {
            UI.modal.hide('property-modal');
        });

        // Form submission
        document.getElementById('property-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Properties.saveProperty();
        });

        // Also add listener to header add button
        document.getElementById('add-item-btn')?.addEventListener('click', () => {
            if (document.querySelector('[data-view="properties"]').classList.contains('active')) {
                Properties.currentEditId = null;
                document.getElementById('property-form').reset();
                document.querySelector('#property-modal .modal-header h3').textContent = 'Add Property';
                UI.modal.show('property-modal');
            }
        });
    },

    /**
     * Edit property
     */
    editProperty: async (propertyId) => {
        try {
            const properties = await API.getProperties();
            const property = properties.find(p => p.id == propertyId);

            if (!property) return;

            Properties.currentEditId = propertyId;
            const form = document.getElementById('property-form');

            form.querySelector('[name="address"]').value = property.address || '';
            form.querySelector('[name="city"]').value = property.city || '';
            form.querySelector('[name="state"]').value = property.state || '';
            form.querySelector('[name="zip"]').value = property.zip || '';
            form.querySelector('[name="purchase_price"]').value = property.purchase_price || '';
            form.querySelector('[name="purchase_date"]').value = property.purchase_date || '';
            form.querySelector('[name="current_value"]').value = property.current_value || '';
            form.querySelector('[name="type"]').value = property.type || 'single_family';

            document.querySelector('#property-modal .modal-header h3').textContent = 'Edit Property';
            UI.modal.show('property-modal');
        } catch (error) {
            console.error('Error editing property:', error);
            UI.showToast('Error loading property', 'error');
        }
    },

    /**
     * Save property
     */
    saveProperty: async () => {
        try {
            const form = document.getElementById('property-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Validate required fields
            if (!data.address || !data.city || !data.state || !data.purchase_price || !data.purchase_date || !data.current_value) {
                UI.showToast('Please fill in all required fields', 'error');
                return;
            }

            if (Properties.currentEditId) {
                // Update
                await API.updateProperty(Properties.currentEditId, data);
                UI.showToast('Property updated successfully', 'success');
            } else {
                // Add new
                await API.addProperty(data);
                UI.showToast('Property added successfully', 'success');
            }

            UI.modal.hide('property-modal');
            await Properties.loadProperties();
            await Dashboard.loadMetrics();
            await Dashboard.loadPropertiesSummary();
        } catch (error) {
            console.error('Error saving property:', error);
            UI.showToast(error.message || 'Error saving property', 'error');
        }
    },

    /**
     * Delete property
     */
    deleteProperty: async (propertyId) => {
        if (!confirm('Are you sure you want to delete this property? This cannot be undone.')) {
            return;
        }

        try {
            await API.deleteProperty(propertyId);
            UI.showToast('Property deleted successfully', 'success');
            await Properties.loadProperties();
            await Dashboard.loadMetrics();
            await Dashboard.loadPropertiesSummary();
        } catch (error) {
            console.error('Error deleting property:', error);
            UI.showToast(error.message || 'Error deleting property', 'error');
        }
    }
};

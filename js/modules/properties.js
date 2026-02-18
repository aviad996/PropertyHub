// Properties module

const Properties = {
    currentEditId: null,

    // Property types that need a units field
    multiUnitTypes: ['duplex', 'triplex', 'fourplex', 'multi_family', 'commercial'],

    // Auto-unit counts for standard multi-unit types
    autoUnitCounts: { 'duplex': 2, 'triplex': 3, 'fourplex': 4 },

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

                // Display property type nicely
                const typeDisplay = Properties.formatType(prop.type);
                const unitsDisplay = prop.units ? ` (${prop.units} units)` : '';

                return `
                    <div class="list-item" data-id="${prop.id}">
                        <div class="list-item-content">
                            <div class="list-item-title">${prop.address}</div>
                            <div class="list-item-details">
                                <div class="detail-item">
                                    <span class="detail-label">Location:</span> ${prop.city}, ${prop.state}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Type:</span> ${typeDisplay}${unitsDisplay}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Purchased:</span> ${Formatting.date(prop.purchase_date)}
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Purchase Price:</span> ${Formatting.currency(prop.purchase_price)}
                                </div>
                                ${prop.closing_costs ? `
                                <div class="detail-item">
                                    <span class="detail-label">Closing Costs:</span> ${Formatting.currency(prop.closing_costs)}
                                </div>` : ''}
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
                                ${prop.annual_taxes ? `
                                <div class="detail-item">
                                    <span class="detail-label">Annual Taxes:</span> ${Formatting.currency(prop.annual_taxes)} (${Formatting.currency(prop.annual_taxes / 12)}/mo)
                                </div>` : ''}
                                ${prop.annual_insurance ? `
                                <div class="detail-item">
                                    <span class="detail-label">Annual Insurance:</span> ${Formatting.currency(prop.annual_insurance)} (${Formatting.currency(prop.annual_insurance / 12)}/mo)
                                </div>` : ''}
                                ${prop.monthly_hoa ? `
                                <div class="detail-item">
                                    <span class="detail-label">HOA:</span> ${Formatting.currency(prop.monthly_hoa)}/mo
                                </div>` : ''}
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
     * Format property type for display
     */
    formatType: (type) => {
        const typeMap = {
            'single_family': 'Single Family',
            'Single Family': 'Single Family',
            'duplex': 'Duplex',
            'Duplex': 'Duplex',
            'triplex': 'Triplex',
            'Triplex': 'Triplex',
            'fourplex': 'Fourplex',
            'Fourplex': 'Fourplex',
            'multi_family': 'Multi-Family',
            'condo': 'Condo',
            'Condo': 'Condo',
            'townhouse': 'Townhouse',
            'Townhouse': 'Townhouse',
            'commercial': 'Commercial',
            'Commercial': 'Commercial'
        };
        return typeMap[type] || type || 'Single Family';
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: () => {
        // New property button
        document.getElementById('new-property-btn')?.addEventListener('click', () => {
            Properties.currentEditId = null;
            Properties.resetForm();
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

        // Property type change → show/hide units field
        document.getElementById('property-type-select')?.addEventListener('change', (e) => {
            Properties.handleTypeChange(e.target.value);
        });

        // Has mortgage checkbox toggle
        document.getElementById('has-mortgage')?.addEventListener('change', (e) => {
            const section = document.getElementById('mortgage-section');
            if (section) {
                section.style.display = e.target.checked ? 'block' : 'none';
            }
        });

        // Annual taxes → show monthly hint
        document.getElementById('prop-annual-taxes')?.addEventListener('input', (e) => {
            const annual = parseFloat(e.target.value) || 0;
            const hint = document.getElementById('prop-monthly-taxes-hint');
            if (hint) {
                hint.textContent = annual > 0 ? `= ${Formatting.currency(annual / 12)}/mo` : '';
            }
        });

        // Annual insurance → show monthly hint
        document.getElementById('prop-annual-insurance')?.addEventListener('input', (e) => {
            const annual = parseFloat(e.target.value) || 0;
            const hint = document.getElementById('prop-monthly-insurance-hint');
            if (hint) {
                hint.textContent = annual > 0 ? `= ${Formatting.currency(annual / 12)}/mo` : '';
            }
        });

        // Also add listener to header add button
        document.getElementById('add-item-btn')?.addEventListener('click', () => {
            if (document.querySelector('[data-view="properties"]')?.classList.contains('active')) {
                Properties.currentEditId = null;
                Properties.resetForm();
                document.querySelector('#property-modal .modal-header h3').textContent = 'Add Property';
                UI.modal.show('property-modal');
            }
        });
    },

    /**
     * Handle property type change - show/hide units field
     */
    handleTypeChange: (type) => {
        const unitsGroup = document.getElementById('units-group');
        const unitsInput = document.querySelector('[name="units"]');

        if (!unitsGroup || !unitsInput) return;

        if (Properties.multiUnitTypes.includes(type)) {
            unitsGroup.style.display = 'block';
            // Auto-fill for known types
            if (Properties.autoUnitCounts[type]) {
                unitsInput.value = Properties.autoUnitCounts[type];
                unitsInput.readOnly = true;
            } else {
                unitsInput.value = '';
                unitsInput.readOnly = false;
                unitsInput.focus();
            }
        } else {
            unitsGroup.style.display = 'none';
            unitsInput.value = '';
        }
    },

    /**
     * Reset form to clean state
     */
    resetForm: () => {
        const form = document.getElementById('property-form');
        form.reset();

        // Reset conditional sections
        const unitsGroup = document.getElementById('units-group');
        if (unitsGroup) unitsGroup.style.display = 'none';

        const mortgageSection = document.getElementById('mortgage-section');
        if (mortgageSection) mortgageSection.style.display = 'none';

        const hasMortgage = document.getElementById('has-mortgage');
        if (hasMortgage) hasMortgage.checked = false;

        // Clear hints
        const taxHint = document.getElementById('prop-monthly-taxes-hint');
        if (taxHint) taxHint.textContent = '';
        const insHint = document.getElementById('prop-monthly-insurance-hint');
        if (insHint) insHint.textContent = '';
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
            Properties.resetForm();

            const form = document.getElementById('property-form');

            // Basic fields
            form.querySelector('[name="address"]').value = property.address || '';
            form.querySelector('[name="city"]').value = property.city || '';
            form.querySelector('[name="state"]').value = property.state || '';
            form.querySelector('[name="zip"]').value = property.zip || '';
            form.querySelector('[name="purchase_price"]').value = property.purchase_price || '';
            form.querySelector('[name="purchase_date"]').value = property.purchase_date || '';
            form.querySelector('[name="current_value"]').value = property.current_value || '';
            form.querySelector('[name="closing_costs"]').value = property.closing_costs || '';

            // Type & units
            form.querySelector('[name="type"]').value = property.type || 'single_family';
            Properties.handleTypeChange(property.type || 'single_family');
            if (property.units) {
                form.querySelector('[name="units"]').value = property.units;
            }

            // Taxes & Insurance
            form.querySelector('[name="annual_taxes"]').value = property.annual_taxes || '';
            form.querySelector('[name="annual_insurance"]').value = property.annual_insurance || '';
            form.querySelector('[name="monthly_hoa"]').value = property.monthly_hoa || '';

            // Trigger hint updates
            if (property.annual_taxes) {
                const hint = document.getElementById('prop-monthly-taxes-hint');
                if (hint) hint.textContent = `= ${Formatting.currency(property.annual_taxes / 12)}/mo`;
            }
            if (property.annual_insurance) {
                const hint = document.getElementById('prop-monthly-insurance-hint');
                if (hint) hint.textContent = `= ${Formatting.currency(property.annual_insurance / 12)}/mo`;
            }

            // Check if property has a mortgage - load it into inline form
            const mortgages = await API.getMortgages();
            const mortgage = mortgages?.find(m => String(m.property_id) === String(propertyId));
            if (mortgage) {
                const hasMortgage = document.getElementById('has-mortgage');
                if (hasMortgage) hasMortgage.checked = true;
                const section = document.getElementById('mortgage-section');
                if (section) section.style.display = 'block';

                form.querySelector('[name="mortgage_lender"]').value = mortgage.lender || '';
                form.querySelector('[name="mortgage_amount"]').value = mortgage.current_balance || mortgage.original_balance || '';
                form.querySelector('[name="mortgage_rate"]').value = mortgage.interest_rate || '';

                // Convert remaining_term_months to term select
                const termMonths = parseInt(mortgage.remaining_term_months) || 360;
                const termSelect = form.querySelector('[name="mortgage_term"]');
                // Pick closest standard term
                if (termMonths <= 120) termSelect.value = '120';
                else if (termMonths <= 180) termSelect.value = '180';
                else if (termMonths <= 240) termSelect.value = '240';
                else termSelect.value = '360';

                form.querySelector('[name="mortgage_payment"]').value = mortgage.monthly_payment || '';
                form.querySelector('[name="mortgage_escrow"]').value = mortgage.escrow_payment || '';
            }

            document.querySelector('#property-modal .modal-header h3').textContent = 'Edit Property';
            UI.modal.show('property-modal');
        } catch (error) {
            console.error('Error editing property:', error);
            UI.showToast('Error loading property', 'error');
        }
    },

    /**
     * Calculate monthly mortgage payment using amortization formula
     */
    calculateMonthlyPayment: (principal, annualRate, termMonths) => {
        if (!principal || !annualRate || !termMonths) return 0;
        const monthlyRate = annualRate / 100 / 12;
        if (monthlyRate === 0) return principal / termMonths;
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
            (Math.pow(1 + monthlyRate, termMonths) - 1);
    },

    /**
     * Save property (+ optional mortgage + auto-create expenses)
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

            // Extract mortgage data before saving property
            const hasMortgage = document.getElementById('has-mortgage')?.checked;
            const mortgageData = hasMortgage ? {
                lender: data.mortgage_lender,
                original_balance: parseFloat(data.mortgage_amount) || 0,
                current_balance: parseFloat(data.mortgage_amount) || 0,
                interest_rate: parseFloat(data.mortgage_rate) || 0,
                remaining_term_months: parseInt(data.mortgage_term) || 360,
                monthly_payment: parseFloat(data.mortgage_payment) || 0,
                escrow_payment: parseFloat(data.mortgage_escrow) || 0
            } : null;

            // Auto-calculate mortgage payment if not provided
            if (mortgageData && !mortgageData.monthly_payment && mortgageData.original_balance && mortgageData.interest_rate) {
                mortgageData.monthly_payment = parseFloat(
                    Properties.calculateMonthlyPayment(
                        mortgageData.original_balance,
                        mortgageData.interest_rate,
                        mortgageData.remaining_term_months
                    ).toFixed(2)
                );
            }

            // Remove mortgage fields from property data
            delete data.mortgage_lender;
            delete data.mortgage_amount;
            delete data.mortgage_rate;
            delete data.mortgage_term;
            delete data.mortgage_payment;
            delete data.mortgage_escrow;

            let propertyId;

            if (Properties.currentEditId) {
                // Update existing property
                await API.updateProperty(Properties.currentEditId, data);
                propertyId = Properties.currentEditId;
                UI.showToast('Property updated successfully', 'success');
            } else {
                // Add new property
                const result = await API.addProperty(data);
                propertyId = result?.id || result?.data?.id;
                UI.showToast('Property added successfully', 'success');
            }

            // Handle mortgage creation/update
            if (mortgageData && propertyId) {
                mortgageData.property_id = propertyId;

                // Check if mortgage already exists for this property
                const existingMortgages = await API.getMortgages();
                const existingMortgage = existingMortgages?.find(m => String(m.property_id) === String(propertyId));

                if (existingMortgage) {
                    await API.updateMortgage(existingMortgage.id, mortgageData);
                } else {
                    await API.addMortgage(mortgageData);
                }
            }

            // Auto-create expense records for taxes and insurance if provided (new property only)
            if (!Properties.currentEditId && propertyId) {
                const expensePromises = [];

                if (parseFloat(data.annual_taxes) > 0) {
                    expensePromises.push(API.addExpense({
                        property_id: propertyId,
                        category: 'taxes',
                        amount: parseFloat(data.annual_taxes),
                        date: new Date().toISOString().split('T')[0],
                        description: 'Annual property taxes'
                    }));
                }

                if (parseFloat(data.annual_insurance) > 0) {
                    expensePromises.push(API.addExpense({
                        property_id: propertyId,
                        category: 'insurance',
                        amount: parseFloat(data.annual_insurance),
                        date: new Date().toISOString().split('T')[0],
                        description: 'Annual insurance premium'
                    }));
                }

                if (parseFloat(data.monthly_hoa) > 0) {
                    expensePromises.push(API.addExpense({
                        property_id: propertyId,
                        category: 'hoa',
                        amount: parseFloat(data.monthly_hoa) * 12,
                        date: new Date().toISOString().split('T')[0],
                        description: 'Annual HOA dues'
                    }));
                }

                if (expensePromises.length > 0) {
                    await Promise.all(expensePromises);
                }
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

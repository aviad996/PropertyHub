// Properties module

const Properties = {
    currentEditId: null,

    // Property types that need a units field
    multiUnitTypes: ['duplex', 'triplex', 'fourplex', 'multi_family', 'commercial'],

    // Auto-unit counts for standard multi-unit types
    autoUnitCounts: { 'duplex': 2, 'triplex': 3, 'fourplex': 4 },

    // Closing costs breakdown field names (single source of truth)
    ccFields: ['cc_appraisal', 'cc_inspection', 'cc_title', 'cc_escrow', 'cc_loan_fees', 'cc_survey', 'cc_insurance', 'cc_prepaid_interest', 'cc_taxes', 'cc_other'],

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
                                ${prop.rehab_costs ? `
                                <div class="detail-item">
                                    <span class="detail-label">Rehab Costs:</span> ${Formatting.currency(prop.rehab_costs)}${prop.rehab_items ? ` (${JSON.parse(prop.rehab_items).length} items)` : ''}
                                </div>` : ''}
                                ${prop.holding_costs ? `
                                <div class="detail-item">
                                    <span class="detail-label">Holding Costs:</span> ${Formatting.currency(prop.holding_costs)}
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
                                ${(() => {
                                    const pp = parseFloat(prop.purchase_price) || 0;
                                    const cc = parseFloat(prop.closing_costs) || 0;
                                    const rc = parseFloat(prop.rehab_costs) || 0;
                                    const hc = parseFloat(prop.holding_costs) || 0;
                                    const loan = parseFloat(mortgage?.original_balance || mortgage?.current_balance) || 0;
                                    const totalInvested = pp + cc + rc + hc - loan;
                                    return totalInvested > 0 ? `
                                <div class="detail-item" style="font-weight:600;color:var(--primary-color)">
                                    <span class="detail-label">Cash Invested:</span> ${Formatting.currency(totalInvested)}
                                </div>` : '';
                                })()}
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

        // === Closing Costs Breakdown Toggle ===
        document.getElementById('toggle-closing-breakdown')?.addEventListener('click', () => {
            const breakdown = document.getElementById('closing-costs-breakdown');
            const btn = document.getElementById('toggle-closing-breakdown');
            const totalEl = document.getElementById('closing-costs-total');
            if (breakdown) {
                const isVisible = breakdown.style.display !== 'none';
                breakdown.style.display = isVisible ? 'none' : 'block';
                btn.textContent = isVisible ? '+ Itemize' : '− Hide Breakdown';
                if (!isVisible) {
                    // Showing breakdown — make total readonly (auto-summed)
                    if (totalEl) totalEl.readOnly = true;
                    // Only auto-sum if breakdown fields have values
                    const hasBreakdownValues = Properties.ccFields.some(f => {
                        const el = document.querySelector(`[name="${f}"]`);
                        return el && parseFloat(el.value) > 0;
                    });
                    if (hasBreakdownValues) {
                        Properties.updateClosingCostsTotal();
                    }
                } else {
                    // Hiding breakdown — make total editable again
                    if (totalEl) totalEl.readOnly = false;
                }
            }
        });

        // Auto-sum closing costs breakdown fields → total
        document.querySelectorAll('.cc-field').forEach(field => {
            field.addEventListener('input', () => {
                Properties.updateClosingCostsTotal();
                Properties.updateCashInvested();
            });
        });

        // Closing costs total manual entry → update cash invested
        document.getElementById('closing-costs-total')?.addEventListener('input', () => {
            Properties.updateCashInvested();
        });

        // Rehab & holding costs → update cash invested
        document.querySelectorAll('.cash-invested-field').forEach(field => {
            field.addEventListener('input', () => {
                Properties.updateCashInvested();
            });
        });

        // Purchase price & mortgage amount → update cash invested
        document.querySelector('[name="purchase_price"]')?.addEventListener('input', () => {
            Properties.updateCashInvested();
        });
        document.querySelector('[name="mortgage_amount"]')?.addEventListener('input', () => {
            Properties.updateCashInvested();
        });

        // === Rehab Itemization Toggle ===
        document.getElementById('toggle-rehab-breakdown')?.addEventListener('click', () => {
            const breakdown = document.getElementById('rehab-items-breakdown');
            const btn = document.getElementById('toggle-rehab-breakdown');
            const totalEl = document.getElementById('rehab-costs-total');
            if (breakdown) {
                const isVisible = breakdown.style.display !== 'none';
                breakdown.style.display = isVisible ? 'none' : 'block';
                btn.textContent = isVisible ? '+ Itemize' : '− Hide Breakdown';
                if (!isVisible) {
                    // Showing breakdown — make total readonly
                    if (totalEl) totalEl.readOnly = true;
                    // If no rows exist yet, add one blank row
                    const existingRows = document.querySelectorAll('.rehab-item-row');
                    if (existingRows.length === 0) {
                        Properties.addRehabItemRow();
                    }
                } else {
                    // Hiding breakdown — make total editable again
                    if (totalEl) totalEl.readOnly = false;
                }
            }
        });

        // Add rehab item button
        document.getElementById('add-rehab-item-btn')?.addEventListener('click', () => {
            Properties.addRehabItemRow();
            // Focus the new description field
            const rows = document.querySelectorAll('.rehab-item-row');
            const lastRow = rows[rows.length - 1];
            lastRow?.querySelector('.rehab-item-desc')?.focus();
        });

        // === Import from Closing Document ===
        document.getElementById('import-closing-btn')?.addEventListener('click', () => {
            Properties.showImportModal();
        });

        document.getElementById('extract-data-btn')?.addEventListener('click', () => {
            Properties.extractFromPaste();
        });

        document.getElementById('fill-form-btn')?.addEventListener('click', () => {
            Properties.fillFormFromParsed();
        });

        document.getElementById('try-again-btn')?.addEventListener('click', () => {
            document.getElementById('import-step-paste').classList.remove('hidden');
            document.getElementById('import-step-preview').classList.add('hidden');
            document.getElementById('closing-doc-text').value = '';
            document.getElementById('closing-doc-text').focus();
        });

        document.querySelector('#import-closing-modal .close-btn')?.addEventListener('click', () => {
            UI.modal.hide('import-closing-modal');
        });

        document.querySelector('#import-closing-modal .import-cancel-btn')?.addEventListener('click', () => {
            UI.modal.hide('import-closing-modal');
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
     * Auto-sum all cc_* breakdown fields → closing_costs total
     */
    updateClosingCostsTotal: () => {
        const form = document.getElementById('property-form');
        if (!form) return;
        let anyFieldHasValue = false;
        const total = Properties.ccFields.reduce((sum, f) => {
            const el = form.querySelector(`[name="${f}"]`);
            const val = parseFloat(el?.value) || 0;
            if (val > 0) anyFieldHasValue = true;
            return sum + val;
        }, 0);
        const totalEl = document.getElementById('closing-costs-total');
        // Only overwrite total if at least one breakdown field has a value
        if (totalEl && anyFieldHasValue) {
            totalEl.value = total.toFixed(2);
        }
    },

    /**
     * Auto-calculate Total Cash Invested = Purchase + Closing + Rehab + Holding - Loan
     */
    updateCashInvested: () => {
        const form = document.getElementById('property-form');
        if (!form) return;
        const purchase = parseFloat(form.querySelector('[name="purchase_price"]')?.value) || 0;
        const closing = parseFloat(form.querySelector('[name="closing_costs"]')?.value) || 0;
        const rehab = parseFloat(form.querySelector('[name="rehab_costs"]')?.value) || 0;
        const holding = parseFloat(form.querySelector('[name="holding_costs"]')?.value) || 0;
        const hasMortgage = document.getElementById('has-mortgage')?.checked;
        const loan = hasMortgage ? (parseFloat(form.querySelector('[name="mortgage_amount"]')?.value) || 0) : 0;
        const cashInvested = purchase + closing + rehab + holding - loan;
        const display = document.getElementById('cash-to-close-display');
        if (display) {
            display.value = cashInvested > 0 ? cashInvested.toFixed(2) : '';
        }
        const hint = document.getElementById('cash-invested-hint');
        if (hint && purchase > 0) {
            hint.textContent = `${Formatting.currency(purchase)} + ${Formatting.currency(closing)} + ${Formatting.currency(rehab)} + ${Formatting.currency(holding)} − ${Formatting.currency(loan)}`;
        }
    },

    /**
     * Add a rehab item row to the itemization section
     */
    addRehabItemRow: (description = '', amount = '') => {
        const list = document.getElementById('rehab-items-list');
        if (!list) return;

        const row = document.createElement('div');
        row.className = 'rehab-item-row';
        row.innerHTML = `
            <input type="text" placeholder="Description (e.g. Kitchen remodel)"
                   class="rehab-item-desc" value="${String(description).replace(/"/g, '&quot;')}">
            <input type="number" step="0.01" placeholder="0.00"
                   class="rehab-item-amount" value="${amount}">
            <button type="button" class="rehab-item-remove" title="Remove item">&times;</button>
        `;

        // Wire up the remove button
        row.querySelector('.rehab-item-remove').addEventListener('click', () => {
            row.remove();
            Properties.updateRehabTotal();
        });

        // Wire up amount change to auto-sum
        row.querySelector('.rehab-item-amount').addEventListener('input', () => {
            Properties.updateRehabTotal();
        });

        list.appendChild(row);
    },

    /**
     * Update rehab_costs total from all itemized rows + store JSON in hidden field
     */
    updateRehabTotal: () => {
        const rows = document.querySelectorAll('.rehab-item-row');
        const items = [];
        let total = 0;

        rows.forEach(row => {
            const desc = row.querySelector('.rehab-item-desc')?.value?.trim() || '';
            const amt = parseFloat(row.querySelector('.rehab-item-amount')?.value) || 0;
            if (desc || amt > 0) {
                items.push({ description: desc, amount: amt });
            }
            total += amt;
        });

        // Update the total field
        const totalEl = document.getElementById('rehab-costs-total');
        if (totalEl && rows.length > 0) {
            totalEl.value = total > 0 ? total.toFixed(2) : '';
        }

        // Store items as JSON in hidden field
        const hiddenEl = document.getElementById('rehab-items-data');
        if (hiddenEl) {
            hiddenEl.value = items.length > 0 ? JSON.stringify(items) : '';
        }

        // Update cash invested
        Properties.updateCashInvested();
    },

    /**
     * Load rehab items from a JSON array into the form
     */
    loadRehabItems: (itemsJson) => {
        const list = document.getElementById('rehab-items-list');
        if (!list) return;

        // Clear existing rows
        list.innerHTML = '';

        let items = [];
        if (typeof itemsJson === 'string' && itemsJson) {
            try {
                items = JSON.parse(itemsJson);
            } catch (e) {
                console.warn('Failed to parse rehab_items JSON:', e);
                return;
            }
        } else if (Array.isArray(itemsJson)) {
            items = itemsJson;
        }

        if (items.length === 0) return;

        items.forEach(item => {
            Properties.addRehabItemRow(item.description || '', item.amount || '');
        });

        // Show the breakdown and make total readonly
        const breakdown = document.getElementById('rehab-items-breakdown');
        if (breakdown) breakdown.style.display = 'block';
        const btn = document.getElementById('toggle-rehab-breakdown');
        if (btn) btn.textContent = '− Hide Breakdown';
        const totalEl = document.getElementById('rehab-costs-total');
        if (totalEl) totalEl.readOnly = true;

        Properties.updateRehabTotal();
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

        // Reset closing costs breakdown
        const closingBreakdown = document.getElementById('closing-costs-breakdown');
        if (closingBreakdown) closingBreakdown.style.display = 'none';
        const breakdownBtn = document.getElementById('toggle-closing-breakdown');
        if (breakdownBtn) breakdownBtn.textContent = '+ Itemize';
        const closingTotal = document.getElementById('closing-costs-total');
        if (closingTotal) closingTotal.readOnly = false;

        // Reset rehab breakdown
        const rehabBreakdown = document.getElementById('rehab-items-breakdown');
        if (rehabBreakdown) rehabBreakdown.style.display = 'none';
        const rehabBtn = document.getElementById('toggle-rehab-breakdown');
        if (rehabBtn) rehabBtn.textContent = '+ Itemize';
        const rehabTotal = document.getElementById('rehab-costs-total');
        if (rehabTotal) rehabTotal.readOnly = false;
        const rehabList = document.getElementById('rehab-items-list');
        if (rehabList) rehabList.innerHTML = '';
        const rehabData = document.getElementById('rehab-items-data');
        if (rehabData) rehabData.value = '';

        // Reset cash invested hint
        const cashHint = document.getElementById('cash-invested-hint');
        if (cashHint) cashHint.textContent = 'Purchase + Closing + Rehab + Holding − Loan';

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
            // Format date for HTML date input (needs YYYY-MM-DD)
            const rawDate = property.purchase_date || '';
            form.querySelector('[name="purchase_date"]').value = rawDate ? rawDate.substring(0, 10) : '';
            form.querySelector('[name="current_value"]').value = property.current_value || '';
            form.querySelector('[name="closing_costs"]').value = property.closing_costs || '';

            // Closing costs breakdown fields
            let hasBreakdown = false;
            Properties.ccFields.forEach(f => {
                const el = form.querySelector(`[name="${f}"]`);
                if (el && property[f]) {
                    el.value = property[f];
                    hasBreakdown = true;
                }
            });
            // If breakdown fields exist, show the breakdown section
            if (hasBreakdown) {
                const breakdown = document.getElementById('closing-costs-breakdown');
                if (breakdown) breakdown.style.display = 'block';
                const btn = document.getElementById('toggle-closing-breakdown');
                if (btn) btn.textContent = '− Hide Breakdown';
                // Make total readonly when breakdown is shown
                const totalEl = document.getElementById('closing-costs-total');
                if (totalEl) totalEl.readOnly = true;
            }

            // Rehab & holding costs
            form.querySelector('[name="rehab_costs"]').value = property.rehab_costs || '';
            form.querySelector('[name="holding_costs"]').value = property.holding_costs || '';

            // Load rehab items if they exist
            if (property.rehab_items) {
                Properties.loadRehabItems(property.rehab_items);
            }

            // Type & units
            const propType = property.type || 'single_family';
            form.querySelector('[name="type"]').value = propType;
            Properties.handleTypeChange(propType);
            // Only set units if the units field is visible (multi-unit types)
            if (property.units && Properties.multiUnitTypes.includes(propType)) {
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

            // Recalculate cash invested with loaded data
            Properties.updateCashInvested();

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

            // If rehab items exist, ensure rehab_costs is the computed total
            if (data.rehab_items && data.rehab_items.trim()) {
                try {
                    const items = JSON.parse(data.rehab_items);
                    const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                    data.rehab_costs = total.toFixed(2);
                } catch (e) {
                    // If parsing fails, keep the manual rehab_costs value
                }
            }

            console.log('saveProperty data:', JSON.stringify(data));

            // Validate required fields
            if (!data.address || !data.city || !data.state || !data.purchase_price || !data.purchase_date || !data.current_value) {
                console.error('Validation failed:', { address: data.address, city: data.city, state: data.state, purchase_price: data.purchase_price, purchase_date: data.purchase_date, current_value: data.current_value });
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
    },

    // =====================================================
    // Import from Closing Document
    // =====================================================

    _parsedData: null,

    showImportModal: () => {
        document.getElementById('import-step-paste').classList.remove('hidden');
        document.getElementById('import-step-preview').classList.add('hidden');
        document.getElementById('closing-doc-text').value = '';
        UI.modal.show('import-closing-modal');
        setTimeout(() => document.getElementById('closing-doc-text').focus(), 100);
    },

    extractFromPaste: () => {
        const text = document.getElementById('closing-doc-text').value.trim();
        if (!text) {
            UI.showToast('Please paste your closing document text first', 'error');
            return;
        }

        const parsed = Properties.parseClosingDocument(text);
        Properties._parsedData = parsed;

        const fieldCount = Object.values(parsed).filter(v => v !== null && v !== '' && v !== undefined).length;

        if (fieldCount === 0) {
            UI.showToast('Could not extract any data. Try a different document or check the pasted text.', 'error');
            return;
        }

        // Show preview
        Properties.renderPreview(parsed);
        document.getElementById('import-step-paste').classList.add('hidden');
        document.getElementById('import-step-preview').classList.remove('hidden');
    },

    /**
     * Parse closing document text using regex patterns
     */
    parseClosingDocument: (text) => {
        // Keep original for multi-line address parsing
        const original = text;
        // Normalize for single-line pattern matching
        const norm = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ');
        // Collapsed version (no newlines)
        const collapsed = norm.replace(/\n+/g, ' ').trim();

        const result = {};

        // --- Helper: extract dollar amount ---
        const parseDollar = (str) => {
            if (!str) return null;
            const cleaned = str.replace(/[$,\s]/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? null : num;
        };

        // --- Helper: try multiple patterns, return first match group ---
        const tryPatterns = (patterns, source) => {
            source = source || collapsed;
            for (const pat of patterns) {
                const m = source.match(pat);
                if (m && m[1]) return m[1].trim();
            }
            return null;
        };

        // === PROPERTY ADDRESS ===
        const addrPatterns = [
            /(?:property\s*address|subject\s*property|property\s*location)[:\s]*([^\n]+)/i,
            /(?:property)[:\s]+(\d+[^\n]+)/i,
        ];
        const addrRaw = tryPatterns(addrPatterns, norm);
        if (addrRaw) {
            Properties._parseAddress(addrRaw, result);
        }
        // Fallback: look for city/state/zip pattern in the text
        if (!result.state) {
            const csz = collapsed.match(/,\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
            if (csz) {
                result.state = csz[1];
                result.zip = csz[2];
                // Try to get city before state
                const beforeState = collapsed.substring(0, csz.index);
                const cityMatch = beforeState.match(/,\s*([A-Za-z\s]+)$/);
                if (cityMatch) result.city = cityMatch[1].trim();
            }
        }

        // === SALE / PURCHASE PRICE ===
        result.purchase_price = parseDollar(tryPatterns([
            /(?:sale|contract\s*sales?|purchase)\s*price[:\s]*\$?([\d,]+\.?\d*)/i,
            /(?:sales?\s*price\s*of\s*property)[:\s]*\$?([\d,]+\.?\d*)/i,
            /(?:total\s*sales?\s*price)[:\s]*\$?([\d,]+\.?\d*)/i,
        ]));

        // === CLOSING / SETTLEMENT DATE ===
        const dateRaw = tryPatterns([
            /(?:closing|settlement|disbursement)\s*date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
            /(?:closing|settlement|disbursement)\s*date[:\s]*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
            /(?:date\s*of\s*closing)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
            /(?:date\s*issued)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        ]);
        if (dateRaw) {
            result.purchase_date = Properties._parseDate(dateRaw);
        }

        // === LOAN AMOUNT ===
        result.mortgage_amount = parseDollar(tryPatterns([
            /(?:loan\s*amount|amount\s*financed|principal\s*amount)[:\s]*\$?([\d,]+\.?\d*)/i,
            /(?:new\s*loan\s*amount)[:\s]*\$?([\d,]+\.?\d*)/i,
            /(?:first\s*mortgage)[:\s]*\$?([\d,]+\.?\d*)/i,
        ]));

        // === INTEREST RATE ===
        const rateRaw = tryPatterns([
            /(?:interest\s*rate|note\s*rate|your\s*interest\s*rate)[:\s]*([\d]+\.?\d*)\s*%/i,
            /(?:initial\s*interest\s*rate)[:\s]*([\d]+\.?\d*)\s*%/i,
            /([\d]+\.?\d*)\s*%\s*(?:per\s*annum|annual|interest)/i,
        ]);
        if (rateRaw) {
            result.mortgage_rate = parseFloat(rateRaw);
        }

        // === LOAN TERM ===
        const termRaw = tryPatterns([
            /(?:loan\s*term|term)[:\s]*(\d+)\s*(?:year|yr)/i,
            /(\d+)\s*[-]?\s*year\s*(?:fixed|arm|loan|mortgage|term)/i,
            /(?:maturity)[:\s]*(\d+)\s*(?:year|month)/i,
        ]);
        if (termRaw) {
            const years = parseInt(termRaw);
            if (years > 0 && years <= 40) {
                result.mortgage_term = (years * 12).toString();
            }
        }
        // Also try months directly
        if (!result.mortgage_term) {
            const termMonths = tryPatterns([
                /(?:loan\s*term|term)[:\s]*(\d+)\s*month/i,
                /(\d+)\s*months?\s*(?:term|loan)/i,
            ]);
            if (termMonths) {
                result.mortgage_term = termMonths;
            }
        }

        // === LENDER ===
        result.mortgage_lender = tryPatterns([
            /(?:lender|creditor|loan\s*originator|servicer)[:\s]*([A-Za-z][A-Za-z\s&.,'-]+?)(?=\s+(?:Monthly|Principal|Loan|Interest|Address|NMLS|Phone|Tel|Fax|Contact|Email|\d|$))/i,
            /(?:name\s*of\s*lender)[:\s]*([A-Za-z][A-Za-z\s&.,'-]+?)(?=\s+(?:Monthly|Principal|Loan|Interest|Address|NMLS|\d|$))/i,
        ]);
        // Clean up lender name
        if (result.mortgage_lender) {
            result.mortgage_lender = result.mortgage_lender.replace(/\s+/g, ' ').trim();
            // Remove trailing common words
            result.mortgage_lender = result.mortgage_lender.replace(/\s+(address|nmls|phone|tel|fax).*$/i, '').trim();
        }

        // === MONTHLY PAYMENT ===
        result.mortgage_payment = parseDollar(tryPatterns([
            /(?:monthly\s*(?:mortgage\s*)?payment|total\s*monthly\s*amount|estimated\s*total\s*monthly\s*payment)[:\s]*\$?([\d,]+\.?\d*)/i,
            /(?:principal\s*(?:&|and)\s*interest)[:\s]*\$?([\d,]+\.?\d*)/i,
            /(?:p\s*&?\s*i)[:\s]*\$?([\d,]+\.?\d*)/i,
        ]));

        // === PROPERTY TAXES (annual) ===
        const taxRaw = parseDollar(tryPatterns([
            /(?:(?:annual|yearly)\s*)?(?:property\s*tax(?:es)?|real\s*estate\s*tax(?:es)?)[:\s]*\$?([\d,]+\.?\d*)/i,
            /(?:county\s*tax(?:es)?)[:\s]*\$?([\d,]+\.?\d*)/i,
            /(?:tax(?:es)?\s*(?:per\s*year|annually|annual))[:\s]*\$?([\d,]+\.?\d*)/i,
        ]));
        if (taxRaw) {
            // If it looks monthly (< $500), multiply by 12
            result.annual_taxes = taxRaw < 500 ? taxRaw * 12 : taxRaw;
        }

        // === INSURANCE (annual) ===
        const insRaw = parseDollar(tryPatterns([
            /(?:(?:annual|yearly)\s*)?(?:homeowner'?s?\s*insurance|hazard\s*insurance|property\s*insurance)[:\s]*\$?([\d,]+\.?\d*)/i,
            /(?:insurance\s*(?:premium|per\s*year|annually|annual))[:\s]*\$?([\d,]+\.?\d*)/i,
        ]));
        if (insRaw) {
            result.annual_insurance = insRaw < 300 ? insRaw * 12 : insRaw;
        }

        // === HOA ===
        const hoaRaw = parseDollar(tryPatterns([
            /(?:hoa\s*(?:dues|fees?)?|homeowners?\s*association\s*(?:dues|fees?)?|association\s*(?:dues|fees?))[:\s]*\$?([\d,]+\.?\d*)/i,
            /(?:monthly\s*(?:hoa|association))[:\s]*\$?([\d,]+\.?\d*)/i,
        ]));
        if (hoaRaw) {
            // If it looks annual (> $1000), divide by 12
            result.monthly_hoa = hoaRaw > 1000 ? Math.round(hoaRaw / 12 * 100) / 100 : hoaRaw;
        }

        // === CLOSING COSTS ===
        result.closing_costs = parseDollar(tryPatterns([
            /(?:total\s*closing\s*costs?|total\s*settlement\s*charges?)[:\s]*\$?([\d,]+\.?\d*)/i,
            /(?:closing\s*costs?\s*(?:total|paid))[:\s]*\$?([\d,]+\.?\d*)/i,
        ]));

        // === ESCROW ===
        result.mortgage_escrow = parseDollar(tryPatterns([
            /(?:initial\s*escrow|(?:monthly\s*)?escrow\s*(?:payment|amount))[:\s]*\$?([\d,]+\.?\d*)/i,
            /(?:escrow)[:\s]*\$?([\d,]+\.?\d*)\s*(?:per\s*month|monthly|\/mo)/i,
        ]));

        return result;
    },

    /**
     * Parse address string into components
     */
    _parseAddress: (addrStr, result) => {
        // Try: "123 Main St, City, ST 12345"
        const full = addrStr.match(/^(.+?),\s*(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
        if (full) {
            result.address = full[1].trim();
            result.city = full[2].trim();
            result.state = full[3];
            result.zip = full[4];
            return;
        }

        // Try: "123 Main St City ST 12345"
        const noComma = addrStr.match(/^(.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
        if (noComma) {
            const beforeState = noComma[1].trim();
            result.state = noComma[2];
            result.zip = noComma[3];
            // Try to split address and city
            const parts = beforeState.split(/,\s*/);
            if (parts.length >= 2) {
                result.address = parts[0];
                result.city = parts[parts.length - 1];
            } else {
                // Guess: last word(s) are city
                const words = beforeState.split(' ');
                if (words.length > 3) {
                    // Address is probably the first part with numbers
                    const numIdx = words.findIndex((w, i) => i > 0 && !/^\d/.test(w) && /^[A-Z]/.test(w) && i > words.length - 3);
                    if (numIdx > 0) {
                        result.address = words.slice(0, numIdx).join(' ');
                        result.city = words.slice(numIdx).join(' ');
                    } else {
                        result.address = beforeState;
                    }
                } else {
                    result.address = beforeState;
                }
            }
            return;
        }

        // Fallback: just use the whole thing as address
        result.address = addrStr.replace(/\s+/g, ' ').trim();
    },

    /**
     * Parse various date formats into YYYY-MM-DD
     */
    _parseDate: (dateStr) => {
        if (!dateStr) return '';
        dateStr = dateStr.trim();

        // Try MM/DD/YYYY or MM-DD-YYYY
        let m = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (m) {
            return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
        }

        // Try YYYY-MM-DD (already correct format)
        m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (m) return m[0];

        // Try "Month DD, YYYY" or "Month DD YYYY"
        m = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
        if (m) {
            const months = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
            const mon = months[m[1].toLowerCase().substring(0, 3)];
            if (mon) {
                return `${m[3]}-${String(mon).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
            }
        }

        return '';
    },

    /**
     * Render preview of extracted data
     */
    renderPreview: (data) => {
        const fields = [
            { key: 'address', label: 'Address' },
            { key: 'city', label: 'City' },
            { key: 'state', label: 'State' },
            { key: 'zip', label: 'ZIP' },
            { key: 'purchase_price', label: 'Purchase Price', format: 'currency' },
            { key: 'purchase_date', label: 'Closing Date', format: 'date' },
            { key: 'closing_costs', label: 'Closing Costs', format: 'currency' },
            { key: 'annual_taxes', label: 'Annual Taxes', format: 'currency' },
            { key: 'annual_insurance', label: 'Annual Insurance', format: 'currency' },
            { key: 'monthly_hoa', label: 'Monthly HOA', format: 'currency' },
            { key: 'mortgage_lender', label: 'Lender' },
            { key: 'mortgage_amount', label: 'Loan Amount', format: 'currency' },
            { key: 'mortgage_rate', label: 'Interest Rate', format: 'percent' },
            { key: 'mortgage_term', label: 'Loan Term', format: 'term' },
            { key: 'mortgage_payment', label: 'Monthly Payment', format: 'currency' },
            { key: 'mortgage_escrow', label: 'Monthly Escrow', format: 'currency' },
        ];

        let found = 0;
        let total = fields.length;

        const rows = fields.map(f => {
            const val = data[f.key];
            const hasValue = val !== null && val !== undefined && val !== '';
            if (hasValue) found++;

            let displayVal = '';
            if (hasValue) {
                if (f.format === 'currency') displayVal = Formatting.currency(val);
                else if (f.format === 'percent') displayVal = val + '%';
                else if (f.format === 'term') {
                    const months = parseInt(val);
                    displayVal = months ? `${Math.round(months / 12)} years (${months} months)` : val;
                }
                else if (f.format === 'date') displayVal = Formatting.date(val);
                else displayVal = val;
            }

            return `
                <div class="preview-row ${hasValue ? 'found' : 'not-found'}">
                    <span class="preview-label">${f.label}</span>
                    <span class="preview-value">${hasValue ? displayVal : '—'}</span>
                    <span class="preview-status">${hasValue ? '&#10003;' : '?'}</span>
                </div>
            `;
        }).join('');

        document.getElementById('import-summary').innerHTML =
            `<p>Found <strong>${found}</strong> of ${total} fields. Review the data below, then click "Fill Form & Review" to edit before saving.</p>`;

        document.getElementById('parsed-preview').innerHTML = rows;
    },

    /**
     * Fill the property form with parsed data and open it for review
     */
    fillFormFromParsed: () => {
        const data = Properties._parsedData;
        if (!data) return;

        // Close import modal, open property form
        UI.modal.hide('import-closing-modal');

        Properties.currentEditId = null;
        Properties.resetForm();

        const form = document.getElementById('property-form');

        // Basic property fields
        if (data.address) form.querySelector('[name="address"]').value = data.address;
        if (data.city) form.querySelector('[name="city"]').value = data.city;
        if (data.state) form.querySelector('[name="state"]').value = data.state;
        if (data.zip) form.querySelector('[name="zip"]').value = data.zip;
        if (data.purchase_price) form.querySelector('[name="purchase_price"]').value = data.purchase_price;
        if (data.purchase_date) form.querySelector('[name="purchase_date"]').value = data.purchase_date;
        if (data.closing_costs) form.querySelector('[name="closing_costs"]').value = data.closing_costs;

        // Current value defaults to purchase price (user can update later)
        if (data.purchase_price) {
            form.querySelector('[name="current_value"]').value = data.purchase_price;
        }

        // Taxes & Insurance
        if (data.annual_taxes) {
            form.querySelector('[name="annual_taxes"]').value = data.annual_taxes;
            const hint = document.getElementById('prop-monthly-taxes-hint');
            if (hint) hint.textContent = `= ${Formatting.currency(data.annual_taxes / 12)}/mo`;
        }
        if (data.annual_insurance) {
            form.querySelector('[name="annual_insurance"]').value = data.annual_insurance;
            const hint = document.getElementById('prop-monthly-insurance-hint');
            if (hint) hint.textContent = `= ${Formatting.currency(data.annual_insurance / 12)}/mo`;
        }
        if (data.monthly_hoa) {
            form.querySelector('[name="monthly_hoa"]').value = data.monthly_hoa;
        }

        // Mortgage (if any mortgage data was extracted)
        const hasMortgageData = data.mortgage_amount || data.mortgage_rate || data.mortgage_lender;
        if (hasMortgageData) {
            const checkbox = document.getElementById('has-mortgage');
            if (checkbox) checkbox.checked = true;
            const section = document.getElementById('mortgage-section');
            if (section) section.style.display = 'block';

            if (data.mortgage_lender) form.querySelector('[name="mortgage_lender"]').value = data.mortgage_lender;
            if (data.mortgage_amount) form.querySelector('[name="mortgage_amount"]').value = data.mortgage_amount;
            if (data.mortgage_rate) form.querySelector('[name="mortgage_rate"]').value = data.mortgage_rate;
            if (data.mortgage_payment) form.querySelector('[name="mortgage_payment"]').value = data.mortgage_payment;
            if (data.mortgage_escrow) form.querySelector('[name="mortgage_escrow"]').value = data.mortgage_escrow;

            // Set term select
            if (data.mortgage_term) {
                const termSelect = form.querySelector('[name="mortgage_term"]');
                const months = parseInt(data.mortgage_term);
                if (months <= 120) termSelect.value = '120';
                else if (months <= 180) termSelect.value = '180';
                else if (months <= 240) termSelect.value = '240';
                else termSelect.value = '360';
            }
        }

        document.querySelector('#property-modal .modal-header h3').textContent = 'Review Imported Property';
        UI.modal.show('property-modal');
        UI.showToast(`Imported ${Object.values(data).filter(v => v).length} fields — please review and save`, 'success');
    }
};

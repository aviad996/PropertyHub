// Contacts management module - utilities, contractors, HOA contacts

const Contacts = {
    currentEditId: null,

    /**
     * Initialize contacts module
     */
    init: async () => {
        await Contacts.populatePropertySelect();
        await Contacts.loadContacts();
        Contacts.setupEventListeners();
    },

    /**
     * Populate property dropdown
     */
    populatePropertySelect: async () => {
        try {
            const properties = await API.getProperties();
            const select = document.getElementById('contact-property-select');

            if (!select) return;

            const options = properties.map(p => `<option value="${p.id}">${p.address}</option>`).join('');
            select.innerHTML = '<option value="">All Properties</option>' + options;
        } catch (error) {
            console.error('Error populating property select:', error);
        }
    },

    /**
     * Load and display all contacts
     */
    loadContacts: async () => {
        try {
            const contacts = await API.getContacts();
            const properties = await API.getProperties();
            const listContainer = document.getElementById('contacts-list');

            if (!contacts || contacts.length === 0) {
                listContainer.innerHTML = '<p class="loading">No contacts added yet. Click "New Contact" to add one!</p>';
                return;
            }

            // Group contacts by type
            const grouped = {
                utility_company: [],
                contractor: [],
                hoa: [],
                property_manager: [],
                other: []
            };

            contacts.forEach(c => {
                const type = c.contact_type || 'other';
                if (grouped[type]) {
                    grouped[type].push(c);
                }
            });

            const typeLabels = {
                utility_company: '⚡ Utility Companies',
                contractor: '🔧 Contractors',
                hoa: '🏢 HOA',
                property_manager: '👤 Property Managers',
                other: '📋 Other'
            };

            const html = Object.entries(grouped).map(([type, items]) => {
                if (items.length === 0) return '';

                return `
                    <div class="contacts-section">
                        <h3>${typeLabels[type]} (${items.length})</h3>
                        <div class="contacts-grid">
                            ${items.map(contact => {
                                const property = properties.find(p => p.id === contact.property_id);
                                return `
                                    <div class="contact-card" data-id="${contact.id}">
                                        <div class="contact-header">
                                            <div class="contact-name">${contact.name}</div>
                                            ${property ? `<div class="contact-property">${property.address}</div>` : ''}
                                        </div>
                                        <div class="contact-details">
                                            ${contact.phone ? `<div class="detail">📞 ${contact.phone}</div>` : ''}
                                            ${contact.email ? `<div class="detail">✉️ ${contact.email}</div>` : ''}
                                            ${contact.service_type ? `<div class="detail">🏷️ ${contact.service_type}</div>` : ''}
                                            ${contact.notes ? `<div class="detail notes">📝 ${contact.notes}</div>` : ''}
                                        </div>
                                        <div class="contact-actions">
                                            <button class="edit-btn" data-id="${contact.id}">Edit</button>
                                            <button class="delete-btn" data-id="${contact.id}">Delete</button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('');

            listContainer.innerHTML = html;

            // Attach event listeners
            listContainer.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Contacts.editContact(e.target.dataset.id));
            });

            listContainer.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Contacts.deleteContact(e.target.dataset.id));
            });
        } catch (error) {
            console.error('Error loading contacts:', error);
            UI.showToast('Error loading contacts', 'error');
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: () => {
        // New contact button
        document.getElementById('new-contact-btn')?.addEventListener('click', () => {
            Contacts.currentEditId = null;
            document.getElementById('contacts-form').reset();
            document.querySelector('#contacts-modal .modal-header h3').textContent = 'Add Contact';
            UI.modal.show('contacts-modal');
        });

        // Close modal
        document.querySelector('#contacts-modal .close-btn')?.addEventListener('click', () => {
            UI.modal.hide('contacts-modal');
        });

        document.getElementById('cancel-contact')?.addEventListener('click', () => {
            UI.modal.hide('contacts-modal');
        });

        // Form submission
        document.getElementById('contacts-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Contacts.saveContact();
        });
    },

    /**
     * Edit contact
     */
    editContact: async (contactId) => {
        try {
            const contacts = await API.getContacts();
            const contact = contacts.find(c => c.id === contactId);

            if (!contact) return;

            Contacts.currentEditId = contactId;
            const form = document.getElementById('contacts-form');

            form.querySelector('[name="property_id"]').value = contact.property_id || '';
            form.querySelector('[name="contact_type"]').value = contact.contact_type || 'other';
            form.querySelector('[name="name"]').value = contact.name || '';
            form.querySelector('[name="phone"]').value = contact.phone || '';
            form.querySelector('[name="email"]').value = contact.email || '';
            form.querySelector('[name="address"]').value = contact.address || '';
            form.querySelector('[name="service_type"]').value = contact.service_type || '';
            form.querySelector('[name="notes"]').value = contact.notes || '';

            document.querySelector('#contacts-modal .modal-header h3').textContent = 'Edit Contact';
            UI.modal.show('contacts-modal');
        } catch (error) {
            console.error('Error editing contact:', error);
            UI.showToast('Error loading contact', 'error');
        }
    },

    /**
     * Save contact
     */
    saveContact: async () => {
        try {
            const form = document.getElementById('contacts-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            if (!data.name) {
                UI.showToast('Please enter a contact name', 'error');
                return;
            }

            if (Contacts.currentEditId) {
                // Update
                await API.updateContact(Contacts.currentEditId, data);
                UI.showToast('Contact updated successfully', 'success');
            } else {
                // Add new
                await API.addContact(data);
                UI.showToast('Contact added successfully', 'success');
            }

            UI.modal.hide('contacts-modal');
            await Contacts.loadContacts();
        } catch (error) {
            console.error('Error saving contact:', error);
            UI.showToast(error.message || 'Error saving contact', 'error');
        }
    },

    /**
     * Delete contact
     */
    deleteContact: async (contactId) => {
        if (!confirm('Are you sure you want to delete this contact?')) {
            return;
        }

        try {
            await API.deleteContact(contactId);
            UI.showToast('Contact deleted successfully', 'success');
            await Contacts.loadContacts();
        } catch (error) {
            console.error('Error deleting contact:', error);
            UI.showToast(error.message || 'Error deleting contact', 'error');
        }
    }
};

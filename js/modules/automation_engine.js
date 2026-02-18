// Automation Engine & Recurring Tasks module
// Schedule recurring tasks, set automation rules, trigger reminders

const AutomationEngine = {
    /**
     * Initialize automation engine
     */
    init: async () => {
        AutomationEngine.setupEventListeners();
    },

    /**
     * Setup event listeners for automation
     */
    setupEventListeners: () => {
        document.addEventListener('click', async (e) => {
            if (e.target.id === 'create-automation-btn') {
                AutomationEngine.showAutomationBuilder();
            }
            if (e.target.id === 'save-automation-btn') {
                await AutomationEngine.saveAutomation();
            }
            if (e.target.id === 'run-automations-btn') {
                await AutomationEngine.runAllAutomations();
            }
            if (e.target.id === 'export-schedule-btn') {
                await AutomationEngine.exportSchedule();
            }
            if (e.target.classList.contains('delete-automation-btn')) {
                const automationId = e.target.dataset.automationId;
                await AutomationEngine.deleteAutomation(automationId);
            }
            if (e.target.classList.contains('run-automation-btn')) {
                const automationId = e.target.dataset.automationId;
                await AutomationEngine.runAutomation(automationId);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.id === 'automation-type-select') {
                AutomationEngine.updateAutomationFields();
            }
            if (e.target.id === 'recurrence-type-select') {
                AutomationEngine.updateRecurrenceFields();
            }
        });
    },

    /**
     * Load automation dashboard
     */
    loadAutomationEngine: async () => {
        try {
            const properties = await API.getProperties();
            const tasks = await API.getTasks();
            const insurance = await API.getInsurance();
            const rentPayments = await API.getRentPayments();

            if (!properties || properties.length === 0) {
                document.getElementById('automation-container').innerHTML =
                    '<p class="loading">No properties found. Add properties to create automations.</p>';
                return;
            }

            AutomationEngine.renderAutomationDashboard(properties, tasks, insurance, rentPayments);
        } catch (error) {
            console.error('Error loading automation engine:', error);
            UI.showToast('Error loading automation engine', 'error');
        }
    },

    /**
     * Render automation dashboard
     */
    renderAutomationDashboard: (properties, tasks, insurance, rentPayments) => {
        const container = document.getElementById('automation-container');

        const html = `
            <div class="automation-dashboard">
                <div class="automation-controls">
                    <h4>Automation Scheduler</h4>
                    <div class="control-buttons">
                        <button id="create-automation-btn" class="btn-primary">⚙️ Create Automation</button>
                        <button id="run-automations-btn" class="btn-secondary">▶️ Run Now</button>
                        <button id="export-schedule-btn" class="btn-secondary">📥 Export Schedule</button>
                    </div>
                </div>

                <div id="automation-results" class="automation-results">
                    <!-- Results will be rendered here -->
                </div>

                <!-- Automation Builder Modal -->
                <div id="automation-modal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Create Automation Rule</h3>
                            <button class="close-btn" data-modal="automation-modal">×</button>
                        </div>
                        <form id="automation-form" class="automation-form">
                            <div class="form-group">
                                <label>Automation Name *</label>
                                <input type="text" id="automation-name" placeholder="e.g., Monthly rent reminders" required>
                            </div>

                            <div class="form-group">
                                <label>Automation Type *</label>
                                <select id="automation-type-select" required>
                                    <option value="">-- Select Type --</option>
                                    <option value="task-creation">Recurring Task Creation</option>
                                    <option value="reminder">Automatic Reminder</option>
                                    <option value="lease-renewal">Lease Renewal Alert</option>
                                    <option value="insurance-renewal">Insurance Renewal Alert</option>
                                    <option value="rent-collection">Rent Collection Reminder</option>
                                </select>
                            </div>

                            <div id="automation-type-fields">
                                <!-- Dynamic fields based on automation type -->
                            </div>

                            <div class="form-group">
                                <label>Recurrence Pattern *</label>
                                <select id="recurrence-type-select" required>
                                    <option value="">-- Select Pattern --</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="annually">Annually</option>
                                    <option value="custom">Custom Days Before Event</option>
                                </select>
                            </div>

                            <div id="recurrence-fields">
                                <!-- Dynamic recurrence fields -->
                            </div>

                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="send-notification" checked>
                                    Send notification when task created
                                </label>
                            </div>

                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="auto-enabled" checked>
                                    Enable this automation
                                </label>
                            </div>

                            <div class="form-actions">
                                <button type="button" class="btn-secondary" data-modal="automation-modal">Cancel</button>
                                <button type="button" id="save-automation-btn" class="btn-primary">Save Automation</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Setup modal close buttons
        document.querySelectorAll('[data-modal="automation-modal"]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('automation-modal').classList.add('hidden');
            });
        });

        AutomationEngine.loadAutomationsList(properties);
    },

    /**
     * Load automations list
     */
    loadAutomationsList: async (properties) => {
        try {
            const automations = await API.getAutomations() || [];

            const resultsContainer = document.getElementById('automation-results');

            if (automations.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No automations created yet. Create your first automation to get started!</p>
                    </div>
                `;
                return;
            }

            let html = `
                <div class="automations-list">
                    <h4>Active Automations (${automations.length})</h4>
                    <div class="automations-grid">
                        ${automations.map(auto => {
                            const nextRun = AutomationEngine.calculateNextRun(auto);
                            const statusClass = auto.enabled ? 'enabled' : 'disabled';

                            return `
                                <div class="automation-card ${statusClass}">
                                    <div class="card-header">
                                        <div class="automation-info">
                                            <h5>${auto.name}</h5>
                                            <span class="automation-type">${AutomationEngine.formatType(auto.type)}</span>
                                        </div>
                                        <span class="status-badge ${statusClass}">
                                            ${auto.enabled ? '✓ Active' : '○ Inactive'}
                                        </span>
                                    </div>

                                    <div class="automation-details">
                                        <div class="detail">
                                            <span class="label">Pattern:</span>
                                            <span class="value">${AutomationEngine.formatRecurrence(auto.recurrence)}</span>
                                        </div>
                                        <div class="detail">
                                            <span class="label">Next Run:</span>
                                            <span class="value">${nextRun}</span>
                                        </div>
                                        <div class="detail">
                                            <span class="label">Last Run:</span>
                                            <span class="value">${auto.last_run ? Formatting.date(auto.last_run) : 'Never'}</span>
                                        </div>
                                        ${auto.task_count ? `
                                            <div class="detail">
                                                <span class="label">Tasks Created:</span>
                                                <span class="value">${auto.task_count}</span>
                                            </div>
                                        ` : ''}
                                    </div>

                                    <div class="automation-actions">
                                        <button class="run-automation-btn" data-automation-id="${auto.id}" title="Run now">▶️ Run</button>
                                        <button class="delete-automation-btn" data-automation-id="${auto.id}" title="Delete">🗑️</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="automations-summary">
                    <h4>Automation Summary</h4>
                    <div class="summary-cards">
                        <div class="summary-card">
                            <span class="label">Total Automations</span>
                            <span class="value">${automations.length}</span>
                        </div>
                        <div class="summary-card">
                            <span class="label">Active</span>
                            <span class="value">${automations.filter(a => a.enabled).length}</span>
                        </div>
                        <div class="summary-card">
                            <span class="label">Total Tasks Created</span>
                            <span class="value">${automations.reduce((sum, a) => sum + (a.task_count || 0), 0)}</span>
                        </div>
                        <div class="summary-card">
                            <span class="label">Next Scheduled Run</span>
                            <span class="value">${AutomationEngine.getNextScheduledRun(automations)}</span>
                        </div>
                    </div>
                </div>
            `;

            resultsContainer.innerHTML = html;
        } catch (error) {
            console.error('Error loading automations:', error);
            UI.showToast('Error loading automations', 'error');
        }
    },

    /**
     * Show automation builder
     */
    showAutomationBuilder: () => {
        document.getElementById('automation-modal').classList.remove('hidden');
        AutomationEngine.updateAutomationFields();
    },

    /**
     * Update automation fields based on type
     */
    updateAutomationFields: () => {
        const type = document.getElementById('automation-type-select').value;
        const fieldsContainer = document.getElementById('automation-type-fields');

        let html = '';

        switch (type) {
            case 'task-creation':
                html = `
                    <div class="form-group">
                        <label>Task Title Template *</label>
                        <input type="text" id="task-title" placeholder="e.g., Collect rent from [property]" required>
                    </div>
                    <div class="form-group">
                        <label>Task Category *</label>
                        <select id="task-category" required>
                            <option value="">Select category...</option>
                            <option value="maintenance">🔧 Maintenance</option>
                            <option value="inspection">🔍 Inspection</option>
                            <option value="lease_renewal">📄 Lease Renewal</option>
                            <option value="insurance">📋 Insurance</option>
                            <option value="rent_collection">💰 Rent Collection</option>
                            <option value="other">📝 Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Properties (select all that apply)</label>
                        <div class="properties-checkbox-list" id="properties-list">
                            <!-- Will be populated from properties data -->
                        </div>
                    </div>
                `;
                break;

            case 'lease-renewal':
                html = `
                    <div class="form-group">
                        <label>Days Before Lease Expires *</label>
                        <input type="number" id="days-before-lease" value="60" min="1" max="365" required>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="auto-create-renewal-task" checked>
                            Auto-create renewal task
                        </label>
                    </div>
                `;
                break;

            case 'insurance-renewal':
                html = `
                    <div class="form-group">
                        <label>Days Before Policy Expires *</label>
                        <input type="number" id="days-before-insurance" value="30" min="1" max="365" required>
                    </div>
                    <div class="form-group">
                        <label>Policy Types (select all that apply)</label>
                        <div class="policy-checkbox-list">
                            <label><input type="checkbox" value="property" checked> Property Insurance</label>
                            <label><input type="checkbox" value="liability" checked> Liability Insurance</label>
                            <label><input type="checkbox" value="umbrella"> Umbrella Insurance</label>
                        </div>
                    </div>
                `;
                break;

            case 'rent-collection':
                html = `
                    <div class="form-group">
                        <label>Days Before Rent Due *</label>
                        <input type="number" id="days-before-rent" value="5" min="1" max="30" required>
                    </div>
                    <div class="form-group">
                        <label>Remind on Specific Date of Month</label>
                        <input type="number" id="rent-reminder-day" placeholder="Day of month (1-31)" min="1" max="31">
                    </div>
                `;
                break;

            case 'reminder':
                html = `
                    <div class="form-group">
                        <label>Reminder Title *</label>
                        <input type="text" id="reminder-title" placeholder="e.g., Annual property inspection" required>
                    </div>
                    <div class="form-group">
                        <label>Reminder Description</label>
                        <textarea id="reminder-description" placeholder="Additional details..." rows="3"></textarea>
                    </div>
                `;
                break;
        }

        fieldsContainer.innerHTML = html;
    },

    /**
     * Update recurrence fields
     */
    updateRecurrenceFields: () => {
        const recurrence = document.getElementById('recurrence-type-select').value;
        const fieldsContainer = document.getElementById('recurrence-fields');

        let html = '';

        switch (recurrence) {
            case 'weekly':
                html = `
                    <div class="form-group">
                        <label>Day of Week *</label>
                        <select id="recurrence-day-of-week" required>
                            <option value="">Select day...</option>
                            <option value="0">Sunday</option>
                            <option value="1">Monday</option>
                            <option value="2">Tuesday</option>
                            <option value="3">Wednesday</option>
                            <option value="4">Thursday</option>
                            <option value="5">Friday</option>
                            <option value="6">Saturday</option>
                        </select>
                    </div>
                `;
                break;

            case 'monthly':
                html = `
                    <div class="form-group">
                        <label>Day of Month *</label>
                        <input type="number" id="recurrence-day-of-month" value="1" min="1" max="31" required>
                    </div>
                `;
                break;

            case 'custom':
                html = `
                    <div class="form-group">
                        <label>Days Before Event *</label>
                        <input type="number" id="recurrence-days-before" placeholder="e.g., 30 days before lease expiry" required>
                    </div>
                `;
                break;
        }

        fieldsContainer.innerHTML = html;
    },

    /**
     * Save automation
     */
    saveAutomation: async () => {
        try {
            const name = document.getElementById('automation-name').value;
            const type = document.getElementById('automation-type-select').value;
            const recurrence = document.getElementById('recurrence-type-select').value;
            const sendNotification = document.getElementById('send-notification').checked;
            const enabled = document.getElementById('auto-enabled').checked;

            if (!name || !type || !recurrence) {
                UI.showToast('Please fill in all required fields', 'error');
                return;
            }

            const automation = {
                id: `auto-${Date.now()}`,
                name: name,
                type: type,
                recurrence: recurrence,
                send_notification: sendNotification,
                enabled: enabled,
                created_date: new Date().toISOString(),
                last_run: null,
                task_count: 0,
                config: {}
            };

            // Capture type-specific config
            switch (type) {
                case 'task-creation':
                    automation.config.task_title = document.getElementById('task-title').value;
                    automation.config.task_category = document.getElementById('task-category').value;
                    break;
                case 'lease-renewal':
                    automation.config.days_before = parseInt(document.getElementById('days-before-lease').value);
                    automation.config.auto_create_task = document.getElementById('auto-create-renewal-task').checked;
                    break;
                case 'insurance-renewal':
                    automation.config.days_before = parseInt(document.getElementById('days-before-insurance').value);
                    break;
                case 'rent-collection':
                    automation.config.days_before = parseInt(document.getElementById('days-before-rent').value);
                    automation.config.reminder_day = document.getElementById('rent-reminder-day').value;
                    break;
            }

            // Capture recurrence config
            switch (recurrence) {
                case 'weekly':
                    automation.config.day_of_week = parseInt(document.getElementById('recurrence-day-of-week').value);
                    break;
                case 'monthly':
                    automation.config.day_of_month = parseInt(document.getElementById('recurrence-day-of-month').value);
                    break;
            }

            await API.saveAutomation(automation);
            UI.showToast('Automation created successfully', 'success');
            document.getElementById('automation-modal').classList.add('hidden');

            // Reload automations list
            const properties = await API.getProperties();
            AutomationEngine.loadAutomationsList(properties);

        } catch (error) {
            console.error('Error saving automation:', error);
            UI.showToast('Error saving automation', 'error');
        }
    },

    /**
     * Run all automations
     */
    runAllAutomations: async () => {
        try {
            UI.showToast('Running all automations...', 'info');

            const automations = await API.getAutomations() || [];
            const properties = await API.getProperties();
            const tasks = await API.getTasks() || [];
            const tenants = await API.getTenants() || [];
            const insurance = await API.getInsurance() || [];

            let tasksCreated = 0;
            let remindersSet = 0;

            for (const automation of automations.filter(a => a.enabled)) {
                const result = await AutomationEngine.executeAutomation(automation, properties, tasks, tenants, insurance);
                tasksCreated += result.tasksCreated || 0;
                remindersSet += result.remindersSet || 0;

                // Update last run
                automation.last_run = new Date().toISOString();
                await API.updateAutomation(automation.id, automation);
            }

            UI.showToast(`✓ Automations completed: ${tasksCreated} tasks created, ${remindersSet} reminders set`, 'success');

            // Reload
            AutomationEngine.loadAutomationsList(properties);

        } catch (error) {
            console.error('Error running automations:', error);
            UI.showToast('Error running automations', 'error');
        }
    },

    /**
     * Execute single automation
     */
    executeAutomation: async (automation, properties, tasks, tenants, insurance) => {
        const result = { tasksCreated: 0, remindersSet: 0 };

        switch (automation.type) {
            case 'task-creation':
                // Create recurring task
                const newTask = {
                    id: `task-${Date.now()}`,
                    title: automation.config.task_title,
                    category: automation.config.task_category,
                    due_date: AutomationEngine.calculateNextDueDate(automation.recurrence),
                    status: 'pending',
                    created_date: new Date().toISOString()
                };
                await API.addTask(newTask);
                result.tasksCreated++;
                break;

            case 'lease-renewal':
                // Find leases expiring within days_before
                const expiringLeases = tenants.filter(t => {
                    const leaseEnd = new Date(t.lease_end_date);
                    const daysUntilExpiry = (leaseEnd - new Date()) / (1000 * 60 * 60 * 24);
                    return daysUntilExpiry <= automation.config.days_before && daysUntilExpiry > 0;
                });

                for (const lease of expiringLeases) {
                    if (automation.config.auto_create_task) {
                        const property = properties.find(p => p.id === lease.property_id);
                        const renewalTask = {
                            id: `task-${Date.now()}-renewal`,
                            property_id: lease.property_id,
                            title: `Renew lease for ${lease.name} at ${property?.address}`,
                            category: 'lease_renewal',
                            due_date: new Date(lease.lease_end_date).toISOString().split('T')[0],
                            status: 'pending'
                        };
                        await API.addTask(renewalTask);
                        result.tasksCreated++;
                    }
                    result.remindersSet++;
                }
                break;

            case 'insurance-renewal':
                // Find policies expiring within days_before
                const expiringPolicies = insurance.filter(i => {
                    const expiry = new Date(i.expiry_date);
                    const daysUntilExpiry = (expiry - new Date()) / (1000 * 60 * 60 * 24);
                    return daysUntilExpiry <= automation.config.days_before && daysUntilExpiry > 0;
                });

                for (const policy of expiringPolicies) {
                    const property = properties.find(p => p.id === policy.property_id);
                    const renewalTask = {
                        id: `task-${Date.now()}-insurance`,
                        property_id: policy.property_id,
                        title: `Renew ${policy.policy_type} insurance for ${property?.address}`,
                        category: 'insurance',
                        due_date: new Date(policy.expiry_date).toISOString().split('T')[0],
                        status: 'pending'
                    };
                    await API.addTask(renewalTask);
                    result.tasksCreated++;
                    result.remindersSet++;
                }
                break;

            case 'rent-collection':
                result.remindersSet += properties.length;
                break;
        }

        return result;
    },

    /**
     * Run single automation
     */
    runAutomation: async (automationId) => {
        try {
            const automations = await API.getAutomations() || [];
            const automation = automations.find(a => a.id === automationId);

            if (!automation) {
                UI.showToast('Automation not found', 'error');
                return;
            }

            const properties = await API.getProperties();
            const tasks = await API.getTasks() || [];
            const tenants = await API.getTenants() || [];
            const insurance = await API.getInsurance() || [];

            const result = await AutomationEngine.executeAutomation(automation, properties, tasks, tenants, insurance);

            automation.last_run = new Date().toISOString();
            automation.task_count = (automation.task_count || 0) + result.tasksCreated;
            await API.updateAutomation(automationId, automation);

            UI.showToast(`✓ Automation ran: ${result.tasksCreated} tasks created`, 'success');
            AutomationEngine.loadAutomationsList(properties);

        } catch (error) {
            console.error('Error running automation:', error);
            UI.showToast('Error running automation', 'error');
        }
    },

    /**
     * Delete automation
     */
    deleteAutomation: async (automationId) => {
        if (!confirm('Delete this automation?')) return;

        try {
            await API.deleteAutomation(automationId);
            UI.showToast('Automation deleted', 'success');

            const properties = await API.getProperties();
            AutomationEngine.loadAutomationsList(properties);
        } catch (error) {
            console.error('Error deleting automation:', error);
            UI.showToast('Error deleting automation', 'error');
        }
    },

    /**
     * Calculate next run date
     */
    calculateNextRun: (automation) => {
        const now = new Date();
        let nextRun = new Date();

        switch (automation.recurrence) {
            case 'daily':
                nextRun.setDate(nextRun.getDate() + 1);
                break;
            case 'weekly':
                const dayOfWeek = automation.config.day_of_week || 1;
                const currentDay = nextRun.getDay();
                const daysAhead = dayOfWeek - currentDay;
                if (daysAhead <= 0) nextRun.setDate(nextRun.getDate() + 7 + daysAhead);
                else nextRun.setDate(nextRun.getDate() + daysAhead);
                break;
            case 'monthly':
                const dayOfMonth = automation.config.day_of_month || 1;
                nextRun.setMonth(nextRun.getMonth() + 1);
                nextRun.setDate(dayOfMonth);
                break;
            case 'quarterly':
                nextRun.setMonth(nextRun.getMonth() + 3);
                break;
            case 'annually':
                nextRun.setFullYear(nextRun.getFullYear() + 1);
                break;
        }

        return Formatting.date(nextRun.toISOString().split('T')[0]);
    },

    /**
     * Calculate next due date for task
     */
    calculateNextDueDate: (recurrence) => {
        const now = new Date();

        switch (recurrence) {
            case 'daily':
                now.setDate(now.getDate() + 1);
                break;
            case 'weekly':
                now.setDate(now.getDate() + 7);
                break;
            case 'monthly':
                now.setMonth(now.getMonth() + 1);
                break;
            case 'quarterly':
                now.setMonth(now.getMonth() + 3);
                break;
            case 'annually':
                now.setFullYear(now.getFullYear() + 1);
                break;
        }

        return now.toISOString().split('T')[0];
    },

    /**
     * Format automation type for display
     */
    formatType: (type) => {
        const mapping = {
            'task-creation': 'Recurring Task',
            'reminder': 'Reminder',
            'lease-renewal': 'Lease Renewal',
            'insurance-renewal': 'Insurance Renewal',
            'rent-collection': 'Rent Collection'
        };
        return mapping[type] || type;
    },

    /**
     * Format recurrence for display
     */
    formatRecurrence: (recurrence) => {
        const mapping = {
            'daily': 'Every day',
            'weekly': 'Every week',
            'monthly': 'Every month',
            'quarterly': 'Every quarter',
            'annually': 'Every year',
            'custom': 'Custom days before event'
        };
        return mapping[recurrence] || recurrence;
    },

    /**
     * Get next scheduled run
     */
    getNextScheduledRun: (automations) => {
        if (automations.length === 0) return 'None scheduled';

        const nextRuns = automations
            .filter(a => a.enabled)
            .map(a => {
                const parts = AutomationEngine.calculateNextRun(a).split('/');
                return new Date(parts[2], parts[0] - 1, parts[1]);
            })
            .sort((a, b) => a - b);

        return nextRuns.length > 0 ? Formatting.date(nextRuns[0].toISOString().split('T')[0]) : 'None scheduled';
    },

    /**
     * Export schedule
     */
    exportSchedule: async () => {
        try {
            const automations = await API.getAutomations() || [];

            let csv = 'PropertyHub Automation Schedule\n';
            csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
            csv += 'Automation Name,Type,Recurrence,Status,Last Run,Next Run\n';

            automations.forEach(auto => {
                csv += `"${auto.name}",${AutomationEngine.formatType(auto.type)},${AutomationEngine.formatRecurrence(auto.recurrence)},${auto.enabled ? 'Active' : 'Inactive'},${auto.last_run || 'Never'},${AutomationEngine.calculateNextRun(auto)}\n`;
            });

            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
            element.setAttribute('download', `PropertyHub-Automation-Schedule-${Date.now()}.csv`);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            UI.showToast('Schedule exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting schedule:', error);
            UI.showToast('Error exporting schedule', 'error');
        }
    }
};

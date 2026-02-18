// Tasks management module - maintenance, inspections, and reminders

const Tasks = {
    currentEditId: null,

    /**
     * Initialize tasks module
     */
    init: async () => {
        await Tasks.populatePropertySelect();
        await Tasks.loadTasks();
        Tasks.setupEventListeners();
    },

    /**
     * Populate property dropdown
     */
    populatePropertySelect: async () => {
        try {
            const properties = await API.getProperties();
            const select = document.getElementById('task-property-select');

            if (!select) return;

            const options = properties.map(p => `<option value="${p.id}">${p.address}</option>`).join('');
            select.innerHTML = '<option value="">Select property...</option>' + options;
        } catch (error) {
            console.error('Error populating property select:', error);
        }
    },

    /**
     * Load and display all tasks
     */
    loadTasks: async () => {
        try {
            const tasks = await API.getTasks();
            const properties = await API.getProperties();
            const container = document.getElementById('tasks-list');

            if (!tasks || tasks.length === 0) {
                container.innerHTML = '<p class="loading">No tasks added yet. Click "New Task" to add one!</p>';
                return;
            }

            // Separate into pending and completed
            const pending = tasks.filter(t => t.status === 'pending').sort((a, b) => {
                return new Date(a.due_date) - new Date(b.due_date);
            });

            const completed = tasks.filter(t => t.status === 'completed').sort((a, b) => {
                return new Date(b.created_date) - new Date(a.created_date);
            });

            const categoryLabels = {
                maintenance: '🔧 Maintenance',
                inspection: '🔍 Inspection',
                lease_renewal: '📄 Lease Renewal',
                insurance: '📋 Insurance',
                rent_collection: '💰 Rent Collection',
                other: '📝 Other'
            };

            const categoryColors = {
                maintenance: '#FF9500',
                inspection: '#34C759',
                lease_renewal: '#007AFF',
                insurance: '#FF3B30',
                rent_collection: '#30B0C0',
                other: '#8E8E93'
            };

            const renderTasks = (taskList, isPending) => {
                return taskList.map(task => {
                    const property = properties.find(p => p.id === task.property_id);
                    const propertyAddress = property ? property.address : 'Unknown Property';
                    const dueDate = new Date(task.due_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    dueDate.setHours(0, 0, 0, 0);

                    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    let dueDateStatus = 'due-good';
                    let dueDateLabel = Formatting.date(task.due_date);

                    if (daysUntilDue < 0) {
                        dueDateStatus = 'due-overdue';
                        dueDateLabel = `⚠️ OVERDUE (${Math.abs(daysUntilDue)} days ago)`;
                    } else if (daysUntilDue === 0) {
                        dueDateStatus = 'due-today';
                        dueDateLabel = '🔔 DUE TODAY';
                    } else if (daysUntilDue <= 7) {
                        dueDateStatus = 'due-soon';
                        dueDateLabel = `Due in ${daysUntilDue} days`;
                    }

                    const categoryLabel = categoryLabels[task.category] || task.category;
                    const categoryColor = categoryColors[task.category] || '#8E8E93';

                    return `
                        <div class="task-card" data-id="${task.id}">
                            <div class="task-header">
                                <div class="task-title">${task.title}</div>
                                <span class="category-badge" style="background-color: ${categoryColor}">${categoryLabel}</span>
                            </div>
                            <div class="task-details">
                                <div class="detail">📍 ${propertyAddress}</div>
                                <div class="detail ${dueDateStatus}">${dueDateLabel}</div>
                                ${task.assigned_to ? `<div class="detail">👤 Assigned to: ${task.assigned_to}</div>` : ''}
                            </div>
                            <div class="task-actions">
                                ${isPending ? `
                                    <button class="complete-btn btn-small" data-id="${task.id}" title="Mark as complete">✓ Complete</button>
                                ` : ''}
                                <button class="edit-btn btn-small" data-id="${task.id}">Edit</button>
                                <button class="delete-btn btn-small" data-id="${task.id}">Delete</button>
                            </div>
                        </div>
                    `;
                }).join('');
            };

            let html = '';

            // Pending section
            if (pending.length > 0) {
                const overdueCount = pending.filter(t => new Date(t.due_date) < new Date()).length;
                html += `
                    <div class="tasks-section">
                        <div class="section-header">
                            <h3>⏳ Pending Tasks (${pending.length})</h3>
                            ${overdueCount > 0 ? `<span class="overdue-badge">⚠️ ${overdueCount} Overdue</span>` : ''}
                        </div>
                        <div class="tasks-grid">
                            ${renderTasks(pending, true)}
                        </div>
                    </div>
                `;
            }

            // Completed section
            if (completed.length > 0) {
                html += `
                    <div class="tasks-section">
                        <div class="section-header">
                            <h3>✅ Completed Tasks (${completed.length})</h3>
                        </div>
                        <div class="tasks-grid completed">
                            ${renderTasks(completed, false)}
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html;

            // Attach event listeners
            container.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Tasks.editTask(e.target.dataset.id));
            });

            container.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Tasks.deleteTask(e.target.dataset.id));
            });

            container.querySelectorAll('.complete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => Tasks.completeTask(e.target.dataset.id));
            });
        } catch (error) {
            console.error('Error loading tasks:', error);
            UI.showToast('Error loading tasks', 'error');
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: () => {
        // New task button
        document.getElementById('new-task-btn')?.addEventListener('click', () => {
            Tasks.currentEditId = null;
            document.getElementById('task-form').reset();
            document.querySelector('[name="status"][value="pending"]').checked = true;
            document.querySelector('#task-modal .modal-header h3').textContent = 'Add Task';
            UI.modal.show('task-modal');
        });

        // Close modal
        document.querySelector('#task-modal .close-btn')?.addEventListener('click', () => {
            UI.modal.hide('task-modal');
        });

        document.getElementById('cancel-task')?.addEventListener('click', () => {
            UI.modal.hide('task-modal');
        });

        // Form submission
        document.getElementById('task-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Tasks.saveTask();
        });
    },

    /**
     * Edit task
     */
    editTask: async (taskId) => {
        try {
            const tasks = await API.getTasks();
            const task = tasks.find(t => t.id === taskId);

            if (!task) return;

            Tasks.currentEditId = taskId;
            const form = document.getElementById('task-form');

            form.querySelector('[name="property_id"]').value = task.property_id || '';
            form.querySelector('[name="title"]').value = task.title || '';
            form.querySelector('[name="category"]').value = task.category || '';
            form.querySelector('[name="due_date"]').value = task.due_date || '';
            form.querySelector('[name="assigned_to"]').value = task.assigned_to || '';
            form.querySelector(`[name="status"][value="${task.status}"]`).checked = true;

            document.querySelector('#task-modal .modal-header h3').textContent = 'Edit Task';
            UI.modal.show('task-modal');
        } catch (error) {
            console.error('Error editing task:', error);
            UI.showToast('Error loading task', 'error');
        }
    },

    /**
     * Save task
     */
    saveTask: async () => {
        try {
            const form = document.getElementById('task-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            if (!data.property_id) {
                UI.showToast('Please select a property', 'error');
                return;
            }

            if (!data.title) {
                UI.showToast('Please enter task title', 'error');
                return;
            }

            if (!data.due_date) {
                UI.showToast('Please enter due date', 'error');
                return;
            }

            if (Tasks.currentEditId) {
                // Update
                await API.updateTask(Tasks.currentEditId, data);
                UI.showToast('Task updated successfully', 'success');
            } else {
                // Add new
                await API.addTask(data);
                UI.showToast('Task added successfully', 'success');
            }

            UI.modal.hide('task-modal');
            await Tasks.loadTasks();
        } catch (error) {
            console.error('Error saving task:', error);
            UI.showToast(error.message || 'Error saving task', 'error');
        }
    },

    /**
     * Complete task (mark as completed without editing)
     */
    completeTask: async (taskId) => {
        try {
            const tasks = await API.getTasks();
            const task = tasks.find(t => t.id === taskId);

            if (!task) return;

            await API.updateTask(taskId, { status: 'completed' });
            UI.showToast('Task marked as completed', 'success');
            await Tasks.loadTasks();
        } catch (error) {
            console.error('Error completing task:', error);
            UI.showToast(error.message || 'Error completing task', 'error');
        }
    },

    /**
     * Delete task
     */
    deleteTask: async (taskId) => {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            await API.deleteTask(taskId);
            UI.showToast('Task deleted successfully', 'success');
            await Tasks.loadTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
            UI.showToast(error.message || 'Error deleting task', 'error');
        }
    }
};

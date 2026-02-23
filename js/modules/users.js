// Users Management Module - Multi-user roles and access control

const Users = {
    // User data
    users: [],
    currentUser: null,
    sessions: [],

    /**
     * Initialize users module
     */
    init: async () => {
        try {
            await Users.loadUsers();
            await Users.loadCurrentUser();
            Users.setupUI();
            console.log('Users module initialized');
        } catch (error) {
            console.error('Error initializing Users module:', error);
        }
    },

    /**
     * Load all users from API
     */
    loadUsers: async () => {
        try {
            const response = await API.getUsers();
            Users.users = response || [];
            return Users.users;
        } catch (error) {
            console.error('Error loading users:', error);
            return [];
        }
    },

    /**
     * Load current user
     */
    loadCurrentUser: async () => {
        try {
            const userEmail = await API.getUserEmail();
            Users.currentUser = {
                email: userEmail,
                role: await API.getCurrentUserRole(),
                joinedDate: new Date(),
                lastActive: new Date()
            };
            return Users.currentUser;
        } catch (error) {
            console.error('Error loading current user:', error);
        }
    },

    /**
     * Setup UI for user management
     */
    setupUI: () => {
        Users.setupManagementView();
        Users.setupInviteModal();
        Users.setupInviteButton();
        Users.setupCancelButtons();
    },

    /**
     * Setup user management view
     */
    setupManagementView: () => {
        const container = document.getElementById('users-list');
        if (!container) return;

        Users.renderUsersList();
    },

    /**
     * Setup invite button
     */
    setupInviteButton: () => {
        const btn = document.getElementById('invite-user-btn');
        if (btn && Users.isOwner()) {
            btn.addEventListener('click', () => Users.openInviteModal());
        } else if (btn) {
            btn.style.display = 'none';
        }
    },

    /**
     * Setup cancel buttons
     */
    setupCancelButtons: () => {
        const cancelInvite = document.getElementById('cancel-invite');
        if (cancelInvite) {
            cancelInvite.addEventListener('click', () => {
                document.getElementById('invite-modal').classList.add('hidden');
            });
        }
    },

    /**
     * Render users list
     */
    renderUsersList: () => {
        const container = document.getElementById('users-list');
        if (!container) return;

        if (Users.users.length === 0) {
            container.innerHTML = '<p class="loading empty-state">No users yet</p>';
            return;
        }

        const html = Users.users.map(user => `
            <div class="user-card">
                <div class="user-info">
                    <div class="user-avatar">${user.email.charAt(0).toUpperCase()}</div>
                    <div class="user-details">
                        <div class="user-email">${user.email}</div>
                        <div class="user-role">
                            <span class="role-badge role-${user.role}">${Users.formatRole(user.role)}</span>
                        </div>
                        <div class="user-meta">
                            Joined: ${Formatting.date(user.joinedDate || new Date())}
                        </div>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn-small" onclick="Users.editUser('${user.email}')"
                        ${Users.isOwner() ? '' : 'disabled'}>
                        Edit
                    </button>
                    <button class="btn-small btn-danger" onclick="Users.revokeUser('${user.email}')"
                        ${Users.isOwner() && user.email !== Users.currentUser.email ? '' : 'disabled'}>
                        Revoke
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    },

    /**
     * Setup invite modal
     */
    setupInviteModal: () => {
        const modal = document.getElementById('invite-modal');
        if (!modal) return;

        const form = modal.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                Users.submitInvite(form);
            });
        }

        // Close button
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }
    },

    /**
     * Open invite modal
     */
    openInviteModal: () => {
        const modal = document.getElementById('invite-modal');
        if (modal) {
            modal.classList.remove('hidden');
            const form = modal.querySelector('form');
            if (form) form.reset();
        }
    },

    /**
     * Submit invite form
     */
    submitInvite: async (form) => {
        try {
            const email = form.querySelector('input[name="email"]').value;
            const role = form.querySelector('select[name="role"]').value;

            if (!email || !role) {
                UI.showToast('Please fill in all fields', 'error');
                return;
            }

            const result = await API.addUser({
                email: email,
                role: role
            });

            if (result) {
                UI.showToast(`Invitation sent to ${email}`, 'success');
                form.reset();
                document.getElementById('invite-modal').classList.add('hidden');
                await Users.loadUsers();
                Users.renderUsersList();
            }
        } catch (error) {
            console.error('Error sending invite:', error);
            UI.showToast('Error sending invitation', 'error');
        }
    },

    /**
     * Edit user role
     */
    editUser: async (email) => {
        if (!Users.isOwner()) {
            UI.showToast('Only owners can edit users', 'error');
            return;
        }

        const user = Users.users.find(u => u.email === email);
        if (!user) return;

        const newRole = prompt(`Change role for ${email}:\n\nCurrent: ${user.role}\n\nNew role (owner/manager/accountant/tenant):`, user.role);

        if (!newRole || newRole === user.role) return;

        try {
            const result = await API.updateUserRole(email, newRole);
            if (result) {
                UI.showToast(`Updated ${email} to ${Users.formatRole(newRole)}`, 'success');
                await Users.loadUsers();
                Users.renderUsersList();
            }
        } catch (error) {
            console.error('Error updating user:', error);
            UI.showToast('Error updating user', 'error');
        }
    },

    /**
     * Revoke user access
     */
    revokeUser: async (email) => {
        if (!Users.isOwner()) {
            UI.showToast('Only owners can revoke users', 'error');
            return;
        }

        if (email === Users.currentUser.email) {
            UI.showToast('You cannot revoke your own access', 'error');
            return;
        }

        const confirmed = confirm(`Are you sure you want to revoke access for ${email}? This cannot be undone.`);
        if (!confirmed) return;

        try {
            const result = await API.deleteUser(email);
            if (result) {
                UI.showToast(`Access revoked for ${email}`, 'success');
                await Users.loadUsers();
                Users.renderUsersList();
            }
        } catch (error) {
            console.error('Error revoking user:', error);
            UI.showToast('Error revoking user access', 'error');
        }
    },

    /**
     * Load activity audit log
     */
    loadActivityLog: async () => {
        try {
            const container = document.getElementById('activity-log');
            if (!container) return;

            const activities = await API.getActivityLog();
            if (!activities || activities.length === 0) {
                container.innerHTML = '<p class="loading empty-state">No activities recorded</p>';
                return;
            }

            const html = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-time">${Formatting.dateTime(activity.timestamp)}</div>
                    <div class="activity-user">${activity.user}</div>
                    <div class="activity-action">${activity.action}</div>
                    <div class="activity-details">${activity.details || ''}</div>
                </div>
            `).join('');

            container.innerHTML = `<div class="activity-log-table">${html}</div>`;
        } catch (error) {
            console.error('Error loading activity log:', error);
        }
    },

    /**
     * Check if current user is owner
     */
    isOwner: () => {
        return Users.currentUser && Users.currentUser.role === 'owner';
    },

    /**
     * Check if current user is manager
     */
    isManager: () => {
        return Users.currentUser && (Users.currentUser.role === 'manager' || Users.isOwner());
    },

    /**
     * Check if current user is accountant
     */
    isAccountant: () => {
        return Users.currentUser && (Users.currentUser.role === 'accountant' || Users.isOwner());
    },

    /**
     * Check if current user is tenant
     */
    isTenant: () => {
        return Users.currentUser && Users.currentUser.role === 'tenant';
    },

    /**
     * Format role for display
     */
    formatRole: (role) => {
        const roleMap = {
            'owner': '👑 Owner',
            'manager': '📋 Manager',
            'accountant': '📊 Accountant',
            'tenant': '👤 Tenant'
        };
        return roleMap[role] || role;
    },

    /**
     * Get active sessions
     */
    getActiveSessions: () => {
        return Users.sessions.filter(s => s.active);
    },

    /**
     * End session
     */
    endSession: async (sessionId) => {
        try {
            await API.endSession(sessionId);
            await Users.loadActiveSessions();
        } catch (error) {
            console.error('Error ending session:', error);
        }
    },

    /**
     * Load active sessions
     */
    loadActiveSessions: async () => {
        try {
            Users.sessions = await API.getActiveSessions();
            Users.renderActiveSessions();
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    },

    /**
     * Render active sessions
     */
    renderActiveSessions: () => {
        const container = document.getElementById('active-sessions');
        if (!container) return;

        if (Users.sessions.length === 0) {
            container.innerHTML = '<p class="loading empty-state">No active sessions</p>';
            return;
        }

        const html = Users.sessions.map(session => `
            <div class="session-item">
                <div class="session-info">
                    <div class="session-device">${session.device || 'Unknown Device'}</div>
                    <div class="session-location">${session.location || 'Unknown Location'}</div>
                    <div class="session-time">Last active: ${Formatting.dateTime(session.lastActive)}</div>
                </div>
                <button class="btn-small btn-danger" onclick="Users.endSession('${session.id}')">
                    End
                </button>
            </div>
        `).join('');

        container.innerHTML = html;
    }
};

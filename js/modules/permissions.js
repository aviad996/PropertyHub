// Permissions Module - Role-based access control (RBAC)

const Permissions = {
    /**
     * Permission definitions by role
     */
    rolePermissions: {
        owner: {
            // Full access to everything
            users: ['read', 'create', 'update', 'delete'],
            properties: ['read', 'create', 'update', 'delete'],
            mortgages: ['read', 'create', 'update', 'delete'],
            expenses: ['read', 'create', 'update', 'delete'],
            rent_payments: ['read', 'create', 'update', 'delete'],
            tenants: ['read', 'create', 'update', 'delete'],
            insurance: ['read', 'create', 'update', 'delete'],
            tasks: ['read', 'create', 'update', 'delete'],
            utilities: ['read', 'create', 'update', 'delete'],
            contacts: ['read', 'create', 'update', 'delete'],
            analytics: ['read'],
            refinance: ['read'],
            financial_decisions: ['read', 'create', 'update', 'delete'],
            financial_analytics: ['read'],
            financial_reports: ['read'],
            kpi_monitoring: ['read'],
            scenario_analysis: ['read'],
            benchmarking: ['read'],
            investment_analysis: ['read'],
            ml_analytics: ['read'],
            predictive: ['read'],
            tax: ['read'],
            automation: ['read'],
            mobile_app: ['read'],
            dashboard: ['read'],
            audit_log: ['read'],
            settings: ['read', 'update'],
            exports: ['read']
        },
        manager: {
            // Can manage day-to-day operations
            users: [], // Cannot manage users
            properties: ['read', 'update'], // Cannot create/delete
            mortgages: ['read'], // View only
            expenses: ['read', 'create', 'update'],
            rent_payments: ['read', 'create', 'update'],
            tenants: ['read', 'create', 'update'],
            insurance: ['read'],
            tasks: ['read', 'create', 'update'],
            utilities: ['read', 'update'],
            contacts: ['read', 'create', 'update'],
            analytics: ['read'], // High-level only
            refinance: ['read'],
            financial_decisions: [],
            financial_analytics: ['read'],
            financial_reports: ['read'],
            kpi_monitoring: ['read'],
            scenario_analysis: ['read'],
            benchmarking: ['read'],
            investment_analysis: ['read'],
            ml_analytics: ['read'],
            predictive: [],
            tax: [],
            automation: [],
            mobile_app: ['read'],
            dashboard: ['read'],
            audit_log: [],
            settings: [],
            exports: []
        },
        accountant: {
            // Read-only access to financials, generate reports
            users: [],
            properties: ['read'],
            mortgages: ['read'],
            expenses: ['read'],
            rent_payments: ['read'],
            tenants: [], // Cannot see tenant details
            insurance: ['read'],
            tasks: [],
            utilities: [],
            contacts: [],
            analytics: ['read'], // Full analytics
            refinance: ['read'],
            financial_decisions: ['read'],
            financial_analytics: ['read'],
            financial_reports: ['read'],
            kpi_monitoring: ['read'],
            scenario_analysis: ['read'],
            benchmarking: ['read'],
            investment_analysis: ['read'],
            ml_analytics: ['read'],
            predictive: [],
            tax: ['read'],
            automation: [],
            mobile_app: [],
            dashboard: ['read'],
            audit_log: ['read'], // Can see all activity
            settings: [],
            exports: ['read']
        },
        tenant: {
            // Minimal access - own lease and payments
            users: [],
            properties: [], // Cannot see properties
            mortgages: [],
            expenses: [],
            rent_payments: ['read'], // Own payments only
            tenants: [], // Own info only
            insurance: [],
            tasks: [],
            utilities: [],
            contacts: [],
            analytics: [],
            refinance: [],
            financial_decisions: [],
            financial_analytics: [],
            financial_reports: [],
            kpi_monitoring: [],
            scenario_analysis: [],
            benchmarking: [],
            investment_analysis: [],
            ml_analytics: [],
            predictive: [],
            tax: [],
            automation: [],
            mobile_app: ['read'],
            dashboard: [], // Minimal info
            audit_log: [],
            settings: ['read'],
            exports: []
        }
    },

    /**
     * Check if user has permission for an action
     */
    hasPermission: (module, action) => {
        if (!Users.currentUser) {
            // In demo mode (no GAS configured), allow all access
            return true;
        }

        const role = Users.currentUser.role;
        const permissions = Permissions.rolePermissions[role];

        if (!permissions) {
            console.warn(`Unknown role: ${role}`);
            return false;
        }

        const modulePermissions = permissions[module];
        if (!modulePermissions) {
            console.warn(`Unknown module: ${module}`);
            return false;
        }

        return modulePermissions.includes(action);
    },

    /**
     * Check if user can read a module
     */
    canRead: (module) => {
        return Permissions.hasPermission(module, 'read');
    },

    /**
     * Check if user can create in a module
     */
    canCreate: (module) => {
        return Permissions.hasPermission(module, 'create');
    },

    /**
     * Check if user can update in a module
     */
    canUpdate: (module) => {
        return Permissions.hasPermission(module, 'update');
    },

    /**
     * Check if user can delete in a module
     */
    canDelete: (module) => {
        return Permissions.hasPermission(module, 'delete');
    },

    /**
     * Filter navigation based on permissions
     */
    filterNavigation: () => {
        const navItems = document.querySelectorAll('.nav-item');
        const moduleMap = {
            'dashboard': 'dashboard',
            'properties': 'properties',
            'mortgages': 'mortgages',
            'expenses': 'expenses',
            'utilities': 'utilities',
            'contacts': 'contacts',
            'tenants': 'tenants',
            'rent_payments': 'rent_payments',
            'insurance': 'insurance',
            'tasks': 'tasks',
            'analytics': 'analytics',
            'refinance': 'refinance',
            'financial_decisions': 'financial_decisions',
            'users': 'users'
        };

        navItems.forEach(item => {
            const viewName = item.dataset.view;
            const module = moduleMap[viewName];

            if (!module) return;

            const hasAccess = Permissions.canRead(module);
            if (!hasAccess) {
                item.style.display = 'none';
            } else {
                item.style.display = '';
            }

            // Special rules
            if (module === 'users' && !Users.isOwner()) {
                item.style.display = 'none';
            }
        });
    },

    /**
     * Filter UI elements based on permissions
     */
    filterUIElements: () => {
        // Hide action buttons for read-only roles
        // Exclude add-item-btn (shared header button) and add-rehab-item-btn (form sub-item button)
        const addButtons = document.querySelectorAll('[id*="new-"][id*="-btn"], [id*="add-"][id*="-btn"]:not(#add-item-btn):not(#add-rehab-item-btn), [id*="-property-btn"]');
        // Map button ID fragments to permission module names
        const btnToModule = {
            'property': 'properties', 'mortgage': 'mortgages', 'expense': 'expenses',
            'contact': 'contacts', 'tenant': 'tenants', 'insurance': 'insurance',
            'task': 'tasks', 'rent-payment': 'rent_payments', 'utility': 'utilities'
        };
        addButtons.forEach(btn => {
            const rawType = btn.id.replace(/^new-|^add-/, '').replace(/-btn$/, '');
            const module = btnToModule[rawType] || rawType;
            if (!Permissions.canCreate(module)) {
                btn.style.display = 'none';
            }
        });

        // Hide delete buttons for non-owners
        const deleteButtons = document.querySelectorAll('[data-action*="delete"], [class*="btn-danger"]');
        deleteButtons.forEach(btn => {
            if (!Users.isOwner() && !Permissions.canDelete('properties')) {
                btn.style.display = 'none';
            }
        });
    },

    /**
     * Filter data by role
     */
    filterDataByRole: (data, module) => {
        if (!Array.isArray(data)) return data;

        const role = Users.currentUser.role;

        // Managers: filter to only assigned properties
        if (role === 'manager' && module === 'properties') {
            return data.filter(prop => {
                // Property assignment logic (placeholder)
                return true;
            });
        }

        // Accountants: filter to financial data only
        if (role === 'accountant') {
            if (['tenants', 'tasks', 'contacts'].includes(module)) {
                return [];
            }
        }

        // Tenants: filter to own data only
        if (role === 'tenant') {
            if (module === 'rent_payments') {
                const userEmail = Users.currentUser.email;
                return data.filter(payment => payment.tenantEmail === userEmail);
            }
            return [];
        }

        return data;
    },

    /**
     * Get permission denied message
     */
    getAccessDeniedMessage: (module, action) => {
        const actionText = action === 'read' ? 'view' : action;
        const messages = {
            owner: `Only owners can ${actionText} ${module}`,
            manager: `Managers cannot ${actionText} ${module}`,
            accountant: `Accountants cannot ${actionText} ${module}`,
            tenant: `Tenants cannot ${actionText} ${module}`
        };
        return messages[Users.currentUser.role] || 'Access denied';
    },

    /**
     * Enforce permission on view load
     */
    enforceViewPermission: (viewName) => {
        const module = viewName;

        if (!Permissions.canRead(module)) {
            UI.showToast(Permissions.getAccessDeniedMessage(module, 'read'), 'error');
            // Redirect to dashboard
            UI.switchView('dashboard');
            return false;
        }

        return true;
    },

    /**
     * Wrap async action with permission check
     */
    checkActionPermission: async (module, action, callback) => {
        if (!Permissions.hasPermission(module, action)) {
            UI.showToast(Permissions.getAccessDeniedMessage(module, action), 'error');
            return false;
        }

        try {
            await callback();
            return true;
        } catch (error) {
            console.error(`Error performing ${action} on ${module}:`, error);
            UI.showToast(`Error: ${error.message}`, 'error');
            return false;
        }
    },

    /**
     * Get viewable properties for current user
     */
    getViewableProperties: async () => {
        try {
            const allProperties = await API.getProperties();
            return Permissions.filterDataByRole(allProperties, 'properties');
        } catch (error) {
            console.error('Error getting viewable properties:', error);
            return [];
        }
    },

    /**
     * Audit log for permission changes
     */
    logPermissionCheck: (module, action, allowed) => {
        // Optional: Log permission checks to audit trail
        if (!allowed) {
            console.warn(`Permission denied: ${Users.currentUser.email} attempted ${action} on ${module}`);
        }
    },

    /**
     * Initialize permissions on app start
     */
    init: async () => {
        try {
            // Wait for users module to load current user
            if (!Users.currentUser) {
                console.error('Cannot initialize permissions without current user');
                return;
            }

            // Filter navigation based on role
            Permissions.filterNavigation();

            // Filter UI elements
            Permissions.filterUIElements();

            console.log(`Permissions initialized for role: ${Users.currentUser.role}`);
        } catch (error) {
            console.error('Error initializing permissions:', error);
        }
    }
};

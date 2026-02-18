// Local storage utilities

const Storage = {
    prefix: 'propertyhub_',

    /**
     * Set item in localStorage
     */
    set: (key, value) => {
        try {
            localStorage.setItem(Storage.prefix + key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage.set error:', e);
        }
    },

    /**
     * Get item from localStorage
     */
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(Storage.prefix + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage.get error:', e);
            return defaultValue;
        }
    },

    /**
     * Remove item from localStorage
     */
    remove: (key) => {
        try {
            localStorage.removeItem(Storage.prefix + key);
        } catch (e) {
            console.error('Storage.remove error:', e);
        }
    },

    /**
     * Clear all PropertyHub data
     */
    clear: () => {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(Storage.prefix)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {
            console.error('Storage.clear error:', e);
        }
    },

    /**
     * Cache data with timestamp
     */
    cache: (key, value, ttl = 300000) => { // Default 5 minutes
        Storage.set(key, {
            data: value,
            timestamp: Date.now(),
            ttl: ttl
        });
    },

    /**
     * Get cached data if not expired
     */
    getCache: (key, defaultValue = null) => {
        const cached = Storage.get(key);
        if (!cached) return defaultValue;

        const { data, timestamp, ttl } = cached;
        if (Date.now() - timestamp > ttl) {
            Storage.remove(key);
            return defaultValue;
        }

        return data;
    }
};

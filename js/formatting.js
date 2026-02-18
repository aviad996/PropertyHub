// Formatting utilities

const Formatting = {
    /**
     * Format number as currency
     */
    currency: (value) => {
        if (value === null || value === undefined) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    },

    /**
     * Format number with commas
     */
    number: (value, decimals = 0) => {
        if (value === null || value === undefined) return '0';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(value);
    },

    /**
     * Format date
     */
    date: (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Format date and time
     */
    dateTime: (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Format percentage
     */
    percentage: (value, decimals = 2) => {
        if (value === null || value === undefined) return '0%';
        return (value * 100).toFixed(decimals) + '%';
    },

    /**
     * Format large numbers with K/M suffix
     */
    shortNumber: (value) => {
        if (value === null || value === undefined) return '0';
        if (Math.abs(value) >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        }
        if (Math.abs(value) >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toString();
    },

    /**
     * Format address
     */
    address: (address, city, state, zip) => {
        const parts = [address, city, state, zip].filter(Boolean);
        return parts.join(', ');
    },

    /**
     * Calculate months remaining
     */
    monthsRemaining: (months) => {
        if (!months) return '';
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;

        if (years > 0 && remainingMonths > 0) {
            return `${years}y ${remainingMonths}m`;
        } else if (years > 0) {
            return `${years} year${years > 1 ? 's' : ''}`;
        } else {
            return `${months} month${months > 1 ? 's' : ''}`;
        }
    }
};

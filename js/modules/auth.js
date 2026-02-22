// Authentication module - PIN code lock screen

const Auth = {
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 5 * 60 * 1000, // 5 minutes

    /**
     * Check if user is authenticated (session-based)
     */
    isAuthenticated: () => {
        return sessionStorage.getItem('ph_authenticated') === 'true';
    },

    /**
     * Initialize auth - show PIN screen or proceed
     * Returns true if authenticated, false if PIN screen shown
     */
    init: () => {
        if (Auth.isAuthenticated()) {
            Auth.hidePinScreen();
            return true;
        }
        Auth.showPinScreen();
        Auth.setupListeners();
        return false;
    },

    /**
     * Show PIN lock screen, hide app
     */
    showPinScreen: () => {
        const pinScreen = document.getElementById('pin-screen');
        if (pinScreen) pinScreen.classList.remove('hidden');
        const appContainer = document.querySelector('.app-container');
        if (appContainer) appContainer.style.display = 'none';
        // Focus PIN input
        setTimeout(() => {
            const input = document.getElementById('pin-input');
            if (input) input.focus();
        }, 100);
    },

    /**
     * Hide PIN screen, show app
     */
    hidePinScreen: () => {
        const pinScreen = document.getElementById('pin-screen');
        if (pinScreen) pinScreen.classList.add('hidden');
        const appContainer = document.querySelector('.app-container');
        if (appContainer) appContainer.style.display = '';
    },

    /**
     * Setup event listeners for PIN input
     */
    setupListeners: () => {
        const submitBtn = document.getElementById('pin-submit');
        if (submitBtn) {
            submitBtn.addEventListener('click', Auth.verify);
        }

        const pinInput = document.getElementById('pin-input');
        if (pinInput) {
            pinInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') Auth.verify();
            });
            // Only allow numeric input
            pinInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
        }
    },

    /**
     * Hash PIN using SHA-256 with salt
     */
    hashPin: async (pin) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(pin + '_propertyhub_salt');
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Verify entered PIN
     */
    verify: async () => {
        // Check lockout
        const lockUntil = localStorage.getItem('ph_lock_until');
        if (lockUntil && Date.now() < parseInt(lockUntil)) {
            const mins = Math.ceil((parseInt(lockUntil) - Date.now()) / 60000);
            Auth.showError(`Too many attempts. Try again in ${mins} minute(s).`);
            return;
        }

        const pinInput = document.getElementById('pin-input');
        const pin = pinInput ? pinInput.value : '';

        if (!pin || pin.length < 4) {
            Auth.showError('Enter at least 4 digits');
            return;
        }

        // Disable button while verifying
        const submitBtn = document.getElementById('pin-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Verifying...';
        }

        try {
            const hash = await Auth.hashPin(pin);

            if (hash === CONFIG.pinHash) {
                // Success - authenticate session
                sessionStorage.setItem('ph_authenticated', 'true');
                localStorage.removeItem('ph_attempts');
                localStorage.removeItem('ph_lock_until');
                Auth.hideError();
                Auth.hidePinScreen();

                // Now initialize the app
                await App.init();
            } else {
                // Failed attempt
                let attempts = parseInt(localStorage.getItem('ph_attempts') || '0') + 1;
                localStorage.setItem('ph_attempts', String(attempts));

                if (attempts >= Auth.MAX_ATTEMPTS) {
                    localStorage.setItem('ph_lock_until',
                        String(Date.now() + Auth.LOCKOUT_DURATION));
                    localStorage.setItem('ph_attempts', '0');
                    Auth.showError('Too many failed attempts. Locked for 5 minutes.');
                } else {
                    const remaining = Auth.MAX_ATTEMPTS - attempts;
                    Auth.showError(`Wrong PIN (${remaining} attempt${remaining > 1 ? 's' : ''} left)`);
                }

                // Clear and refocus
                if (pinInput) {
                    pinInput.value = '';
                    pinInput.focus();
                }
            }
        } catch (error) {
            console.error('Auth error:', error);
            Auth.showError('Authentication error. Please try again.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Unlock';
            }
        }
    },

    /**
     * Show error message
     */
    showError: (msg) => {
        const el = document.getElementById('pin-error');
        if (el) {
            el.textContent = msg;
            el.classList.remove('hidden');
        }
    },

    /**
     * Hide error message
     */
    hideError: () => {
        const el = document.getElementById('pin-error');
        if (el) {
            el.textContent = '';
            el.classList.add('hidden');
        }
    },

    /**
     * Logout - clear session and reload
     */
    logout: () => {
        sessionStorage.removeItem('ph_authenticated');
        location.reload();
    }
};

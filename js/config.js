// Configuration

// ====== IMPORTANT: Update this with your Google Apps Script deployment URL ======
// After you deploy the Apps Script, copy the URL and paste it here
const GAS_DEPLOYMENT_URL = 'https://script.google.com/macros/s/AKfycbw6q6TWkAha58KTOWvEMRP4F25msEiZphIw_7xo3a8xx8WPb1zlD8S8G3ja63Bnt_cm/exec';

// API Security Key - must match the key in Google Apps Script
const GAS_API_KEY = 'jgoS42yMFR_t888ZMvLUcZhuEr0v1dhxIemZQOyBgBY';

// Other configuration
const CONFIG = {
    gasUrl: GAS_DEPLOYMENT_URL,
    apiKey: GAS_API_KEY,
    pinHash: '840328ff3e5f3f710d20d5de9d29d6505fb391390d1600d2f341eb8d76e65d18', // SHA-256 hashed PIN
    syncInterval: 30000, // Sync every 30 seconds
    maxRetries: 3,
    requestTimeout: 30000, // 30 seconds (GAS cold starts can be slow)
};

// Check if GAS URL is configured
if (GAS_DEPLOYMENT_URL.includes('YOUR_DEPLOYMENT_ID')) {
    console.warn('⚠️  GAS_DEPLOYMENT_URL not configured. Update js/config.js with your Google Apps Script URL.');
}

/**
 * myPilotPost Marketing Configuration
 * Centralized environment-aware settings
 */
const MPP_CONFIG = {
    // Determine Dashboard URL based on environment
    APP_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5173'
        : 'https://app.mypilotpost.com',
    
    // Determine API URL (if needed by static pages)
    API_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8788'
        : 'https://mypilotpost-api.littchel.workers.dev'
};

/**
 * Redirects the user to a specific path in the Dashboard app
 * @param {string} path - The path to navigate to (e.g. '/login', '/register')
 * @param {Object} params - Optional query parameters to include
 */
function redirectToApp(path = '', params = {}) {
    const url = new URL(MPP_CONFIG.APP_URL + path);
    Object.keys(params).forEach(key => {
        if (params[key]) url.searchParams.append(key, params[key]);
    });
    window.location.href = url.toString();
}

// Export for use in scripts if needed, though usually used globally in HTML
window.MPP_CONFIG = MPP_CONFIG;
window.redirectToApp = redirectToApp;

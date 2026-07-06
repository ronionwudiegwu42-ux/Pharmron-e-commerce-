// Environment detection and API configuration
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = IS_LOCAL ? 'http://localhost:5000' : 'https://pharmron.com.ng';

// Export for use in other scripts
window.PHARMRON_CONFIG = { IS_LOCAL, API_BASE };
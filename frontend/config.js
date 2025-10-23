// frontend/config.js
const PROD_API = "https://zonedegrimpe-api-f8fehxc0hhcmdfh5.francecentral-01.azurewebsites.net";

function isLocalHost(host) {
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(host);
}

// Configuration globale pour l'application
window.APP_CONFIG = {
  API_URL: (typeof import !== "undefined" && import.meta?.env?.VITE_API_BASE_URL) || 
           (typeof window !== "undefined" && isLocalHost(window.location.hostname) ? "http://localhost:3000" : PROD_API)
};

export const API_BASE_URL = window.APP_CONFIG.API_URL;

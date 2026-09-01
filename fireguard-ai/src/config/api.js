// Central API configuration — dynamically detects development vs production
const isBrowser = typeof window !== 'undefined';
const isLocal = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL ||
  (isLocal ? 'http://localhost:4000' : 'https://forest-fire-node-api.onrender.com');

export const MODEL_API_URL =
  import.meta.env.VITE_MODEL_API_URL ||
  (isLocal ? 'http://localhost:5000' : 'https://forest-fire-flask-api-mtdg.onrender.com');

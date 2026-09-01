// Central API configuration — reads from environment variables
// Set VITE_AUTH_API_URL and VITE_MODEL_API_URL in your .env or Vercel dashboard

export const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:4000';
export const MODEL_API_URL = import.meta.env.VITE_MODEL_API_URL || 'http://localhost:5000';

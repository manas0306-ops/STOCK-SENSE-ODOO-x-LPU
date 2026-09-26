import { handleMockRequest } from './demoStore';

const isStaticDeploy = typeof window !== 'undefined' && (
  window.location.hostname.includes('github.io') ||
  window.location.hostname.includes('vercel.app') ||
  window.location.hostname.includes('netlify.app')
);

const API_BASE = import.meta.env.VITE_API_URL || (isStaticDeploy ? '' : '/api');

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('stocksense_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (isStaticDeploy && !import.meta.env.VITE_API_URL) {
    return handleMockRequest(endpoint, options);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    if (response.status === 404 || response.status === 405) {
      return handleMockRequest(endpoint, options);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        localStorage.removeItem('stocksense_token');
        localStorage.removeItem('stocksense_user');
        window.location.href = '/login';
      }
      const error = new Error(data.message || 'An error occurred');
      error.status = response.status;
      error.code = data.code;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status && err.status !== 404 && err.status !== 405) {
      throw err;
    }
    return handleMockRequest(endpoint, options);
  }
}

export default {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};

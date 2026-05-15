import axios, { type AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '@/config/env';

// Create a custom axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Store current initData
let currentInitData: string | undefined;

/**
 * Event name dispatched on `window` when the API rejects our init data with
 * 401. The backend enforces a 24h freshness window on Telegram init_data, so
 * a 401 almost always means the mini app was left open for more than a day.
 * The only client-side recovery is a full reload (which makes Telegram issue
 * fresh init_data) — the App listens for this event and prompts the user.
 */
export const AUTH_EXPIRED_EVENT = 'tma:auth-expired';

// Request interceptor to add auth header with Telegram Mini App init data
apiClient.interceptors.request.use(
  (config) => {
    // Use the current initData if available
    if (currentInitData && config.headers) {
      config.headers['Authorization'] = `tma ${currentInitData}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — categorize failures so callers (and the user) get
// a meaningful signal instead of an undifferentiated "API Error".
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '<unknown>';

    if (status === 401) {
      // Stale / expired init_data. Notify the app so it can prompt a reload.
      console.warn(`[api] 401 Unauthorized on ${url} — init_data likely expired`);
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    } else if (status === 403) {
      console.warn(`[api] 403 Forbidden on ${url}`);
    } else if (status && status >= 500) {
      console.error(`[api] ${status} server error on ${url}`);
    } else if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      console.error(`[api] network error on ${url}: ${error.message}`);
    } else {
      console.error(`[api] request failed on ${url}:`, error.message);
    }

    return Promise.reject(error);
  }
);

// Helper function to set the initData
export const setInitData = (initData: string | undefined) => {
  currentInitData = initData;
};

// Helper function to get current initData (for debugging)
export const getInitData = () => currentInitData;

export default apiClient;

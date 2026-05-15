/**
 * Конфигурация окружения.
 * Использует переменные окружения Vite (префикс VITE_).
 */

// Production fallback points at the real API. The previous fallback was a
// personal ngrok tunnel — if the .env file were ever missing at build time,
// the whole app would silently talk to a stranger's tunnel. Default to the
// production origin instead so a missing env var degrades safely.
const PROD_API_ORIGIN = 'https://giftoutfit.ru';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || PROD_API_ORIGIN;

export const PROXY_SERVER =
  import.meta.env.VITE_PROXY_SERVER || `${PROD_API_ORIGIN}/proxy/image/`;

// Loud warning if the build had no env file — visible in DevTools, harmless
// in normal operation (vars are baked in at build time).
if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    '[env] VITE_API_BASE_URL not set at build time — falling back to',
    PROD_API_ORIGIN,
  );
}

// Для отладки можно проверить текущее окружение
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const mode = import.meta.env.MODE;

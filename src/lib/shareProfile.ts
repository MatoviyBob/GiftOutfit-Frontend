/**
 * Генерирует deeplink для шейринга профиля пользователя.
 * Если передан referralCode — добавляет его в startapp, чтобы при переходе
 * автоматически регистрировался реферал.
 *
 * @param userId       - Telegram ID пользователя
 * @param referralCode - Личный реферальный код (из /me/settings)
 */
export function generateProfileShareLink(userId: number, referralCode?: string | null): string {
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'giftoutfit_bot';
  const startapp = referralCode
    ? `profile_${userId}_ref_${referralCode}`
    : `profile_${userId}`;
  return `https://t.me/${botUsername}/app?startapp=${startapp}`;
}

/**
 * Генерирует чистую реферальную ссылку пользователя (без привязки к профилю).
 * Открывает бота с deep link, при первом /start регистрирует реферала.
 */
export function generateReferralLink(referralCode: string): string {
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'giftoutfit_bot';
  return `https://t.me/${botUsername}?start=ref_${referralCode}`;
}

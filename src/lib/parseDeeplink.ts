/**
 * Парсит start_param из Telegram deeplink и извлекает ID пользователя.
 *
 * Поддерживаемые форматы startapp:
 *   profile_123456789                  — просто профиль
 *   profile_123456789_ref_ABC123xyz    — профиль + реферальный код
 *   ref_ABC123xyz                      — только реферальный код (userId = null)
 *   123456789                          — числовой ID напрямую
 */
export function parseProfileUserIdFromStartParam(startParam: string | undefined | null): number | null {
  if (!startParam) return null;

  // Формат: "profile_123456789" или "profile_123456789_ref_CODE"
  if (startParam.startsWith('profile_')) {
    const withoutPrefix = startParam.slice('profile_'.length); // "123456789" или "123456789_ref_CODE"
    const userId = parseInt(withoutPrefix.split('_ref_')[0], 10);
    return isNaN(userId) ? null : userId;
  }

  // Только реферал — не содержит userId
  if (startParam.startsWith('ref_')) return null;

  // Fallback: числовой ID
  const userId = parseInt(startParam, 10);
  return isNaN(userId) ? null : userId;
}

/**
 * Извлекает реферальный код из startParam, если он есть.
 * Форматы: "ref_CODE" или "profile_123_ref_CODE"
 */
export function parseReferralCodeFromStartParam(startParam: string | undefined | null): string | null {
  if (!startParam) return null;
  const match = startParam.match(/_ref_([A-Za-z0-9]+)$/) ?? startParam.match(/^ref_([A-Za-z0-9]+)$/);
  return match ? match[1] : null;
}

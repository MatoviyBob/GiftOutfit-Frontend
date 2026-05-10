/**
 * Утилиты для построения URL подарков
 */

import { PROXY_SERVER } from '@/config/env';

/** Размеры изображений подарков */
export const IMG_SIZE = {
  THUMB: 'thumb',
  GRID: 'grid',
} as const;

export type ImgSize = typeof IMG_SIZE[keyof typeof IMG_SIZE];

const IMAGE_PROXY_SETTING_KEY = 'image-proxy-enabled'

/** Нормализует Unicode-апостроф (U+2019) в ASCII (U+0027) до кодирования URL */
const normalizeApostrophe = (s: string): string => s.replace(/\u2019/g, "'")

/** Сегмент пути для CDN: апостроф + слеш как обратный слеш (AC/DC → AC%5CDC) */
const encodePathSegment = (s: string | null | undefined): string => {
  if (!s) return ''
  return encodeURIComponent(normalizeApostrophe(s).replace(/\//g, '\\')).replace(/'/g, '%27')
}

/**
 * Проверяет, включено ли проксирование изображений
 */
const isImageProxyEnabled = (): boolean => {
  const stored = localStorage.getItem(IMAGE_PROXY_SETTING_KEY)
  // По умолчанию включено (true), если значение не сохранено
  return stored === null ? true : stored === 'true'
}

/**
 * Проксирует URL изображения через сервер
 * Если проксирование отключено, возвращает оригинальный URL
 */
export const proxyImageUrl = (url: string): string => {
  if (!isImageProxyEnabled()) {
    return url.replace(/'/g, '%27')
  }
  return `${PROXY_SERVER}?url=${encodeURIComponent(url)}`
}

/**
 * Проксирует URL Lottie файла через сервер
 * Lottie файлы ВСЕГДА загружаются через прокси
 */
export const proxyLottieUrl = (url: string): string => {
  return `${PROXY_SERVER}?url=${encodeURIComponent(url).replace(/'/g, '%27')}`
}

export const buildGiftModelUrl = (giftName: string, model: string, _size?: ImgSize): string => {
  const url = `https://cdn.changes.tg/gifts/models/${encodePathSegment(giftName)}/png/${encodePathSegment(model)}.png`
  return proxyImageUrl(url)
}

export const buildGiftPatternUrl = (giftName: string | null | undefined, pattern: string | null | undefined, _size?: ImgSize): string => {
  if (!giftName || !pattern) return ''
  const url = `https://cdn.changes.tg/gifts/patterns/${encodePathSegment(giftName)}/png/${encodePathSegment(pattern)}.png`
  return proxyImageUrl(url)
}

export const buildGiftLottieUrl = (giftName: string, model: string): string => {
  const url = `https://cdn.changes.tg/gifts/models/${encodePathSegment(giftName)}/lottie/${encodePathSegment(model)}.json`
  return proxyLottieUrl(url)
}

export const buildTelegramGiftUrl = (giftName: string, giftId: number): string => {
  return `https://t.me/nft/${giftName.replace(/\s+/g, '')}-${giftId}`
}


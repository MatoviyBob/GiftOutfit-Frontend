import apiClient from './apiClient'

export type ConstructorGiftResult = {
  gift_number: number
  model: string
  backdrop: string
  symbol: string
  url: string
}

/** Symbol entry returned by /symbols and /all-symbols endpoints. */
export type ConstructorSymbol = {
  symbol: string
  gift_number: number
}

/** Backend may return either a raw array or { key: string[] }. Normalize to string[]. */
function toArray(data: unknown, key: string): string[] {
  if (Array.isArray(data)) return data as string[]
  if (data && typeof data === 'object' && key in data) {
    const val = (data as Record<string, unknown>)[key]
    return Array.isArray(val) ? (val as string[]) : []
  }
  return []
}

/**
 * Normalise symbol list from backend.
 * Backend returns [{symbol, gift_number}] objects; old format was string[].
 * Both shapes are handled for backward compatibility.
 */
function toSymbolArray(data: unknown, key: string): ConstructorSymbol[] {
  const items: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && key in data
      ? (() => { const v = (data as Record<string, unknown>)[key]; return Array.isArray(v) ? v : [] })()
      : []

  return items.map((item) => {
    if (typeof item === 'string') {
      // legacy plain-string format — gift_number unknown
      return { symbol: item, gift_number: 0 }
    }
    const s = item as Record<string, unknown>
    return {
      symbol: String(s.symbol ?? ''),
      gift_number: typeof s.gift_number === 'number' ? s.gift_number : 0,
    }
  }).filter((s) => s.symbol !== '')
}

export const getConstructorCollections = async (): Promise<string[]> => {
  const { data } = await apiClient.get<unknown>('/constructor/collections')
  return toArray(data, 'collections')
}

export const getConstructorModels = async (collection: string): Promise<string[]> => {
  const { data } = await apiClient.get<unknown>(
    `/constructor/collections/${encodeURIComponent(collection)}/models`
  )
  return toArray(data, 'models')
}

export const getConstructorBackdrops = async (
  collection: string,
  model: string
): Promise<string[]> => {
  const { data } = await apiClient.get<unknown>(
    `/constructor/collections/${encodeURIComponent(collection)}/backdrops`,
    { params: { model } }
  )
  return toArray(data, 'backdrops')
}

export const getConstructorSymbols = async (
  collection: string,
  model: string,
  backdrop: string
): Promise<ConstructorSymbol[]> => {
  const { data } = await apiClient.get<unknown>(
    `/constructor/collections/${encodeURIComponent(collection)}/symbols`,
    { params: { model, backdrop } }
  )
  return toSymbolArray(data, 'symbols')
}

export const getConstructorGift = async (
  collection: string,
  model: string,
  backdrop: string,
  symbol: string,
  giftNumber?: number,
): Promise<ConstructorGiftResult> => {
  const { data } = await apiClient.get<ConstructorGiftResult>(
    `/constructor/collections/${encodeURIComponent(collection)}/gift`,
    { params: { model, backdrop, symbol, ...(giftNumber ? { gift_number: giftNumber } : {}) } }
  )
  return data
}

/** All unique backdrops across the catalog (for freeform mode). */
export const getConstructorAllBackdrops = async (): Promise<string[]> => {
  const { data } = await apiClient.get<unknown>('/constructor/backdrops')
  return toArray(data, 'backdrops')
}

/** All symbols (with gift_number) for a collection — freeform mode. */
export const getConstructorCollectionAllSymbols = async (collection: string): Promise<ConstructorSymbol[]> => {
  const { data } = await apiClient.get<unknown>(
    `/constructor/collections/${encodeURIComponent(collection)}/all-symbols`
  )
  return toSymbolArray(data, 'symbols')
}

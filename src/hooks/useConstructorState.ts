import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Gift } from '@/types/gift'
import {
  getConstructorCollections,
  getConstructorModels,
  getConstructorBackdrops,
  getConstructorSymbols,
  getConstructorGift,
  type ConstructorGiftResult,
  type ConstructorSymbol,
} from '@/api/constructor'

const STALE_TIME = 1000 * 60 * 60 * 24

export type UseConstructorStateParams = {
  selectedGift: Gift | null | undefined
  isConstructorMode: boolean
  isDrawerOpen?: boolean
}

export function useConstructorState({
  selectedGift,
  isConstructorMode,
  isDrawerOpen = true,
}: UseConstructorStateParams) {
  const queryClient = useQueryClient()
  const enabled = isConstructorMode && !!isDrawerOpen

  const collection = selectedGift?.name ?? null
  const model = selectedGift?.model ?? null
  const backdrop = selectedGift?.background?.name ?? null

  const collectionsQuery = useQuery({
    queryKey: ['constructor', 'collections'],
    queryFn: getConstructorCollections,
    enabled,
    staleTime: STALE_TIME,
  })

  const modelsQuery = useQuery({
    queryKey: ['constructor', 'models', collection],
    queryFn: () => getConstructorModels(collection!),
    enabled: enabled && !!collection,
    staleTime: STALE_TIME,
  })

  const backdropsQuery = useQuery({
    queryKey: ['constructor', 'backdrops', collection, model],
    queryFn: () => getConstructorBackdrops(collection!, model!),
    enabled: enabled && !!collection && !!model,
    staleTime: STALE_TIME,
  })

  const symbolsQuery = useQuery({
    queryKey: ['constructor', 'symbols', collection, model, backdrop],
    queryFn: () => getConstructorSymbols(collection!, model!, backdrop!),
    enabled: enabled && !!collection && !!model && !!backdrop,
    staleTime: STALE_TIME,
  })

  const fetchGiftMutation = useMutation({
    mutationFn: ({ symbol, giftNumber }: { symbol: string; giftNumber?: number }) =>
      getConstructorGift(collection!, model!, backdrop!, symbol, giftNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['constructor', 'gift', collection, model, backdrop],
      })
    },
  })

  const ensureStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? (v as string[]) : []

  /**
   * Safely normalise whatever React Query cached.
   * Old cache may contain plain strings (before ConstructorSymbol migration).
   * New format is {symbol, gift_number} objects.
   * Both are handled — strings are promoted to {symbol, gift_number: 0}.
   */
  const ensureSymbolArray = (v: unknown): ConstructorSymbol[] => {
    if (!Array.isArray(v)) return []
    return v.flatMap((item): ConstructorSymbol[] => {
      if (typeof item === 'string') {
        return item ? [{ symbol: item, gift_number: 0 }] : []
      }
      if (item && typeof item === 'object') {
        const s = item as Record<string, unknown>
        const symbol = typeof s.symbol === 'string' ? s.symbol : ''
        if (!symbol) return []
        return [{ symbol, gift_number: typeof s.gift_number === 'number' ? s.gift_number : 0 }]
      }
      return []
    })
  }

  const collections = ensureStringArray(collectionsQuery.data)
  const models = ensureStringArray(modelsQuery.data)
  const backdrops = ensureStringArray(backdropsQuery.data)
  const symbols = ensureSymbolArray(symbolsQuery.data)

  const isLoadingCollections = collectionsQuery.isLoading
  const isLoadingModels = modelsQuery.isLoading
  const isLoadingBackdrops = backdropsQuery.isLoading
  // symbolsEnabled mirrors the query's own `enabled` flag.
  const symbolsEnabled = enabled && !!collection && !!model && !!backdrop
  // isPending covers the brief idle gap (enabled=true but fetch not started yet).
  // Used only for the GiftFieldButton disabled-state — keeps the button disabled
  // until symbols have actually arrived.
  const isLoadingSymbols = symbolsEnabled && symbolsQuery.isPending
  // isFetching is true only while an HTTP request is in flight — never gets stuck.
  // Used for the SearchDrawer loading indicator so it can't loop forever.
  const isFetchingSymbols = symbolsEnabled && symbolsQuery.isFetching

  const error =
    collectionsQuery.error ??
    modelsQuery.error ??
    backdropsQuery.error ??
    symbolsQuery.error ??
    fetchGiftMutation.error
    ? (collectionsQuery.error ||
        modelsQuery.error ||
        backdropsQuery.error ||
        symbolsQuery.error ||
        fetchGiftMutation.error) as Error
    : null

  return {
    collections,
    models,
    backdrops,
    symbols,
    isLoadingCollections,
    isLoadingModels,
    isLoadingBackdrops,
    isLoadingSymbols,
    isFetchingSymbols,
    isFetchingGift: fetchGiftMutation.isPending,
    error,
    fetchGift: fetchGiftMutation.mutateAsync,
  }
}

export type { ConstructorGiftResult, ConstructorSymbol }

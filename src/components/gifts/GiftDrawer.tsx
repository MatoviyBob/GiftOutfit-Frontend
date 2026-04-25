import type { FC } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import type { Gift, GiftBackground } from '@/types/gift'
import { useGiftStore, giftFields } from '@/stores/giftStore'
import { useTranslation, getGiftFieldLabelKey } from '@/i18n'
import { SearchDrawer } from '../search/SearchDrawer'
import { useMutation, useQueryClient, useQuery, useQueries } from '@tanstack/react-query'
import { getConstructorCollections, getConstructorModels, getConstructorCollectionAllSymbols, type ConstructorSymbol } from '@/api/constructor'
import { updateGiftCell, togglePinGift, getGrids, type Grid } from '@/api/gifts'
import { retrieveLaunchParams } from '@telegram-apps/sdk-react'
import { Pin } from 'lucide-react'
import { toast } from 'sonner'
import { Spinner } from '../ui/spinner'
import { useBackgrounds } from '@/hooks/useGiftQueries'
import type { GiftCollectionResponse } from '@/hooks/useGiftCollection'
import { buildGiftModelUrl, buildGiftPatternUrl } from '@/lib/giftUrls'
import apiClient from '@/api/apiClient'
import { useConstructorState } from '@/hooks/useConstructorState'
import { useFreeformBackdropsAndSymbols } from '@/hooks/useFreeformBackdropsAndSymbols'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useDrawerItems, type DrawerItem } from '@/hooks/useDrawerItems'
import { GiftPreview } from './GiftPreview'
import { GiftFieldButton } from './GiftFieldButton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'


type ConstructorMode = 'constructor' | 'freeform'

// Нормализация названия коллекции для сравнения
function normalizeCollectionName(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase()
}

// Парсинг поискового запроса: извлечение названия коллекции и id
function parseSearchQuery(query: string): { collectionQuery: string; giftId: number | null } {
  const trimmed = query.trim()
  if (!trimmed) return { collectionQuery: '', giftId: null }

  // Пытаемся найти число в конце строки
  const numberMatch = trimmed.match(/(\d+)$/)
  if (numberMatch) {
    const giftId = parseInt(numberMatch[1], 10)
    const collectionQuery = trimmed.slice(0, numberMatch.index).trim()
    return { collectionQuery, giftId }
  }

  return { collectionQuery: trimmed, giftId: null }
}

export const GiftDrawer: FC = () => {
  const { t } = useTranslation()
  const selectedCell = useGiftStore((state) => state.selectedCell)
  const clearSelectedCell = useGiftStore((state) => state.clearSelectedCell)
  const editingFieldKey = useGiftStore((state) => state.editingFieldKey)
  const setEditingFieldKey = useGiftStore((state) => state.setEditingFieldKey)
  const selectField = useGiftStore((s) => s.selectField)

  const [constructorMode, setConstructorMode] = useState<ConstructorMode>('constructor')
  const prevModeRef = useRef<ConstructorMode>('constructor')
  const [isCollectionSearchOpen, setIsCollectionSearchOpen] = useState(false)
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('')

  const isOwnProfile = selectedCell?.isOwnProfile !== false

  // If we somehow have editing state when opening a read-only drawer, force close it.
  useEffect(() => {
    if (!isOwnProfile && editingFieldKey) {
      setEditingFieldKey(null)
    }
  }, [isOwnProfile, editingFieldKey, setEditingFieldKey])

  // При переключении на freeform режим сбрасываем id в 0, если он был установлен
  useEffect(() => {
    if (constructorMode === 'freeform' && selectedCell?.gift && selectedCell.gift.id > 0 && isOwnProfile) {
      selectField('id', '0', undefined, 'freeform')
    }
  }, [constructorMode, selectedCell, isOwnProfile, selectField])

  // При переключении с freeform на constructor убираем pattern и background
  useEffect(() => {
    if (
      prevModeRef.current === 'freeform' &&
      constructorMode === 'constructor' &&
      selectedCell?.gift &&
      isOwnProfile &&
      (selectedCell.gift.pattern || selectedCell.gift.background)
    ) {
      const updatedGift = {
        ...selectedCell.gift,
        pattern: undefined,
        background: undefined,
      }
      const updatedCell = {
        ...selectedCell,
        gift: updatedGift,
      }
      useGiftStore.setState({ selectedCell: updatedCell })
    }
    prevModeRef.current = constructorMode
  }, [constructorMode, selectedCell, isOwnProfile])

  const isConstructorModeActive = constructorMode === 'constructor'
  const legacyEnabled = constructorMode === 'freeform'

  const giftName = legacyEnabled ? selectedCell?.gift?.name : undefined
  const { data: backgrounds } = useBackgrounds()

  // Коллекции для обоих режимов: GET /constructor/collections (proxy/changes-tg/gifts больше не используется)
  const collectionsQuery = useQuery({
    queryKey: ['constructor', 'collections'],
    queryFn: getConstructorCollections,
    enabled: !!selectedCell,
    staleTime: 1000 * 60 * 60 * 24,
  })
  const gifts = useMemo(() => {
    const d = collectionsQuery.data
    return Array.isArray(d) ? d : []
  }, [collectionsQuery.data])

  // Freeform models: GET /constructor/collections/{collection}/models
  const freeformModelsQuery = useQuery({
    queryKey: ['constructor', 'models', giftName],
    queryFn: () => getConstructorModels(giftName!),
    enabled: legacyEnabled && !!giftName,
    staleTime: 1000 * 60 * 60 * 24,
  })
  const freeformModels = useMemo(() => {
    const d = freeformModelsQuery.data
    return Array.isArray(d) ? d : []
  }, [freeformModelsQuery.data])

  const freeformSymbolsQuery = useQuery({
    queryKey: ['constructor', 'collection-all-symbols', giftName],
    queryFn: () => getConstructorCollectionAllSymbols(giftName!),
    enabled: legacyEnabled && !!giftName,
    staleTime: 1000 * 60 * 60 * 24,
  })
  const freeformSymbols = useMemo((): ConstructorSymbol[] => {
    const d = freeformSymbolsQuery.data
    if (!Array.isArray(d)) return []
    return d.flatMap((item): ConstructorSymbol[] => {
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
  }, [freeformSymbolsQuery.data])

  const giftTree = useMemo(() => ({}), [])

  const constructorState = useConstructorState({
    selectedGift: selectedCell?.gift,
    isConstructorMode: isConstructorModeActive,
    isDrawerOpen: !!selectedCell,
  })

  const freeformBackdropsAndSymbols = useFreeformBackdropsAndSymbols(
    legacyEnabled && !!selectedCell
  )

  useEffect(() => {
    if (!isConstructorModeActive || !constructorState.error) return
    const err = constructorState.error as { response?: { status?: number } }
    if (err?.response?.status === 404) return
    toast(t('common.error'), {
      description: constructorState.error?.message ?? t('toast.errorUpdateGift'),
    })
  }, [isConstructorModeActive, constructorState.error, t])

  // Constructor-mode drawer items (from new API)
  const constructorDrawerItems = useMemo(() => {
    if (!isConstructorModeActive || !editingFieldKey) return []
    const {
      collections,
      models,
      backdrops,
      symbols,
    } = constructorState
    const collection = selectedCell?.gift?.name

    if (editingFieldKey === 'gifts') {
      return collections.map((name, id) => ({
        id,
        title: name,
        image: buildGiftModelUrl(name, 'Original'),
      }))
    }
    if (editingFieldKey === 'model' && collection) {
      return models.map((name, id) => ({
        id,
        title: name,
        image: buildGiftModelUrl(collection, name),
      }))
    }
    if (editingFieldKey === 'background' && collection && selectedCell?.gift?.model) {
      return backdrops.map((backdropName, id) => ({
        id,
        title: backdropName,
        background: backgrounds?.find((bg: GiftBackground) => bg.name === backdropName),
      }))
    }
    if (editingFieldKey === 'pattern' && collection) {
      return symbols.map((s) => ({
        id: s.gift_number,
        title: s.symbol,
        pattern: buildGiftPatternUrl(collection, s.symbol),
        gift_number: s.gift_number,
      }))
    }
    return []
  }, [
    isConstructorModeActive,
    editingFieldKey,
    constructorState,
    selectedCell?.gift?.name,
    selectedCell?.gift?.model,
    backgrounds,
  ])

  // Freeform-mode drawer items: model (.../models), background (.../backdrops), pattern (.../all-symbols по коллекции)
  const freeformDrawerItems = useMemo(() => {
    if (isConstructorModeActive || !editingFieldKey) return []
    const { backdrops } = freeformBackdropsAndSymbols
    const collectionName = selectedCell?.gift?.name

    if (editingFieldKey === 'model' && collectionName) {
      return freeformModels.map((modelName, id) => ({
        id,
        title: modelName,
        image: buildGiftModelUrl(collectionName, modelName),
      }))
    }
    if (editingFieldKey === 'background') {
      return backdrops.map((backdropName, id) => ({
        id,
        title: backdropName,
        background: backgrounds?.find((bg: GiftBackground) => bg.name === backdropName),
      }))
    }
    if (editingFieldKey === 'pattern' && collectionName) {
      // Freeform: show unique patterns only (no duplicates, no gift numbers)
      const seen = new Set<string>()
      return freeformSymbols
        .filter((s) => {
          if (seen.has(s.symbol)) return false
          seen.add(s.symbol)
          return true
        })
        .map((s, index) => ({
          id: index,
          title: s.symbol,
          pattern: buildGiftPatternUrl(collectionName, s.symbol),
        }))
    }
    return []
  }, [
    isConstructorModeActive,
    editingFieldKey,
    freeformBackdropsAndSymbols,
    freeformModels,
    freeformSymbols,
    selectedCell?.gift?.name,
    backgrounds,
  ])

  // Парсинг поискового запроса для коллекций
  const parsedQuery = useMemo(() => {
    if (collectionSearchQuery.length < 2) return null
    return parseSearchQuery(collectionSearchQuery)
  }, [collectionSearchQuery])

  // Умная фильтрация коллекций по частичному совпадению
  const filteredCollections = useMemo(() => {
    if (!parsedQuery || !gifts || gifts.length === 0) return []
    
    const normalizedQuery = normalizeCollectionName(parsedQuery.collectionQuery)
    if (!normalizedQuery) return []

    return (gifts as string[])
      .filter((collectionName: string) => {
        const normalized = normalizeCollectionName(collectionName)
        return normalized.includes(normalizedQuery)
      })
      .slice(0, 10) // Ограничиваем до 10 коллекций
  }, [parsedQuery, gifts])

  // Поиск по коллекции: proxy/api/gifts больше не используется; при необходимости подключать constructor API
  const collectionQueries = useQueries({
    queries: filteredCollections.map((collectionName: string) => {
      const apiCollectionName = collectionName.replace(/\s+/g, '').toLowerCase()
      return {
        queryKey: ['gift-collection-search', apiCollectionName],
        queryFn: async () => {
          const res = await apiClient.get(`/proxy/api/gifts/${encodeURIComponent(apiCollectionName)}`)
          return res.data as GiftCollectionResponse
        },
        enabled: false,
        staleTime: 1000 * 60 * 60 * 24,
      }
    }),
  })

  // Фильтрация подарков из загруженных коллекций
  const collectionGiftItems = useMemo(() => {
    if (!isCollectionSearchOpen || collectionSearchQuery.length < 2) return []

    const items: Array<{
      id: string
      title: string
      image?: string
      collection: string
      gift_number: number
      model: string
      backdrop: string
      symbol: string
    }> = []

    collectionQueries.forEach((queryResult, index) => {
      if (queryResult.data && queryResult.data.gifts && filteredCollections[index]) {
        const collectionName = filteredCollections[index] as string
        const gifts = queryResult.data.gifts

        // Если есть id в запросе, фильтруем по нему
        if (parsedQuery?.giftId !== null) {
          const matchingGift = gifts.find((g) => g.gift_number === parsedQuery!.giftId)
          if (matchingGift) {
            items.push({
              id: `${collectionName}-${matchingGift.gift_number}`,
              title: `${collectionName} #${matchingGift.gift_number}`,
              image: buildGiftModelUrl(collectionName, matchingGift.model),
              collection: collectionName,
              gift_number: matchingGift.gift_number,
              model: matchingGift.model,
              backdrop: matchingGift.backdrop,
              symbol: matchingGift.symbol,
            })
          }
        } else {
          // Если id нет, показываем все подарки из коллекции
          gifts.forEach((gift) => {
            items.push({
              id: `${collectionName}-${gift.gift_number}`,
              title: `${collectionName} #${gift.gift_number}`,
              image: buildGiftModelUrl(collectionName, gift.model),
              collection: collectionName,
              gift_number: gift.gift_number,
              model: gift.model,
              backdrop: gift.backdrop,
              symbol: gift.symbol,
            })
          })
        }
      }
    })

    // Сортировка: точные совпадения сначала
    const normalizedQuery = parsedQuery ? normalizeCollectionName(parsedQuery.collectionQuery) : ''
    items.sort((a, b) => {
      const aNormalized = normalizeCollectionName(a.collection)
      const bNormalized = normalizeCollectionName(b.collection)
      const aExact = aNormalized === normalizedQuery
      const bExact = bNormalized === normalizedQuery
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      return a.gift_number - b.gift_number
    })

    // Ограничиваем до 30 результатов
    return items.slice(0, 30)
  }, [collectionQueries, filteredCollections, parsedQuery, isCollectionSearchOpen, collectionSearchQuery])

  // Обработчик выбора подарка из коллекции
  const handleCollectionSelect = (item: {
    collection: string
    gift_number: number
    model: string
    backdrop: string
    symbol: string
  }) => {
    if (!isOwnProfile || !selectedCell) return

    // Находим background по имени backdrop
    const background = backgrounds?.find((bg: GiftBackground) => bg.name === item.backdrop)

    // Устанавливаем все параметры подарка
    const updatedGift: Gift = {
      id: item.gift_number,
      name: item.collection,
      model: item.model,
      background: background,
      pattern: item.symbol,
    }

    const updatedCell = {
      ...selectedCell,
      gift: updatedGift,
    }

    useGiftStore.setState({ selectedCell: updatedCell })
    setIsCollectionSearchOpen(false)
    setCollectionSearchQuery('')
    setConstructorMode('constructor')
  }

  const drawerItems = useDrawerItems({
    editingFieldKey,
    selectedGift: selectedCell?.gift,
    gifts,
    backgrounds,
    giftTree,
    mode: constructorMode,
  })

  const searchDrawerItems =
    isConstructorModeActive && editingFieldKey
      ? constructorDrawerItems
      : !isConstructorModeActive && editingFieldKey && (editingFieldKey === 'model' || editingFieldKey === 'background' || editingFieldKey === 'pattern')
        ? freeformDrawerItems
        : drawerItems

  // Whether the data for the currently-edited field is being fetched RIGHT NOW.
  // Uses isFetching (not isPending) so it can never get stuck in a true state:
  // isFetching is false the moment the HTTP request finishes (success or error),
  // whereas isPending stays true for disabled queries.
  // The GiftFieldButton disabled-state uses isLoadingSymbols (isPending-based)
  // for stricter gating; this flag is only for the SearchDrawer spinner.
  const searchDrawerIsLoading = useMemo(() => {
    if (!editingFieldKey) return false
    if (isConstructorModeActive) {
      if (editingFieldKey === 'gifts')      return constructorState.isLoadingCollections
      if (editingFieldKey === 'model')      return constructorState.isLoadingModels
      if (editingFieldKey === 'background') return constructorState.isLoadingBackdrops
      // isFetchingSymbols = symbolsEnabled && symbolsQuery.isFetching (never stuck)
      if (editingFieldKey === 'pattern')    return constructorState.isFetchingSymbols
    } else {
      if (editingFieldKey === 'gifts')      return collectionsQuery.isLoading
      if (editingFieldKey === 'model')      return freeformModelsQuery.isLoading
      if (editingFieldKey === 'background') return freeformBackdropsAndSymbols.isLoadingBackdrops
      // isFetching: true only during active HTTP request, never permanently true
      if (editingFieldKey === 'pattern')    return freeformSymbolsQuery.isFetching
    }
    return false
  }, [
    editingFieldKey,
    isConstructorModeActive,
    constructorState.isLoadingCollections,
    constructorState.isLoadingModels,
    constructorState.isLoadingBackdrops,
    constructorState.isFetchingSymbols,
    collectionsQuery.isLoading,
    freeformModelsQuery.isLoading,
    freeformBackdropsAndSymbols.isLoadingBackdrops,
    freeformSymbolsQuery.isFetching,
  ])

  const handleSelect = async (item: DrawerItem) => {
    if (!isOwnProfile) return
    if (!editingFieldKey) return

    if (isConstructorModeActive && editingFieldKey === 'pattern') {
      const collection = selectedCell?.gift?.name
      const model = selectedCell?.gift?.model
      const backdrop = selectedCell?.gift?.background?.name
      if (!collection || !model || !backdrop || !selectedCell) return
      try {
        const result = await constructorState.fetchGift({ symbol: item.title, giftNumber: item.gift_number })
        const background = backgrounds?.find((bg: GiftBackground) => bg.name === result.backdrop)
        const updatedGift: Gift = {
          id: result.gift_number,
          name: collection,
          model: result.model,
          background: background,
          pattern: result.symbol,
          url: result.url,
        }
        useGiftStore.setState({
          selectedCell: {
            ...selectedCell,
            gift: updatedGift,
          },
        })
        setEditingFieldKey(null)
      } catch (err: unknown) {
        const is404 = err && typeof err === 'object' && 'response' in err && (err as { response?: { status?: number } }).response?.status === 404
        toast(t('common.error'), {
          description: is404 ? t('giftDrawer.errorCombinationNotFound') : t('toast.errorUpdateGift'),
        })
        setEditingFieldKey(null)
      }
      return
    }

    if (editingFieldKey === 'background') {
      selectField('background', item.title, { background: item.background }, constructorMode)
    } else if (editingFieldKey === 'pattern') {
      selectField('pattern', item.title, undefined, constructorMode)
      if (constructorMode === 'constructor' && item.id !== undefined) {
        selectField('id', String(item.id), undefined, constructorMode)
      }
    } else {
      selectField(editingFieldKey, item.title, undefined, constructorMode)
    }

    setEditingFieldKey(null)
  }

  const queryClient = useQueryClient()
  
  // Получаем grids для определения main album
  const lp = retrieveLaunchParams()
  const user = lp.tgWebAppData?.user
  const { data: grids = [] } = useQuery<Grid[]>({
    queryKey: ['grids', user?.id],
    queryFn: () => getGrids(user!.id),
    enabled: isOwnProfile && !!user?.id && !!selectedCell,
  })
  
  // Используем grids из useQuery, который автоматически обновляется после optimistic update
  // Определяем, является ли текущий grid main album (первый grid)
  const isMainAlbum = useMemo(() => {
    return grids.length > 0 && selectedCell && grids[0]?.id === selectedCell.gridId
  }, [grids, selectedCell])
  
  // Получаем текущий статус закрепления из актуальных данных
  const currentCell = useMemo(() => {
    if (!selectedCell || grids.length === 0) return null
    return grids
      .find(g => g.id === selectedCell.gridId)
      ?.rows[selectedCell.rowIndex]
      ?.cells[selectedCell.cellIndex] || null
  }, [grids, selectedCell])
  
  const isPinned = useMemo(() => {
    return currentCell?.pinned === true
  }, [currentCell])

  const updateGiftMutation = useMutation({
    mutationFn: (gift?: Gift | null) => {
      if (!selectedCell) {
        throw new Error('No selected cell')
      }
      return updateGiftCell(
        selectedCell.gridId,
        selectedCell.rowIndex,
        selectedCell.cellIndex,
        gift !== undefined ? gift : (selectedCell.gift ?? null)
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grids', user?.id] })
      clearSelectedCell()
    },
    onError: () => {
      toast(t('common.error'), {
        description: t('toast.errorUpdateGift'),
      })
    },
  })

  const handleDelete = () => {
    if (!isOwnProfile) return
    updateGiftMutation.mutate(null)
  }

  const handleApply = () => {
    if (!isOwnProfile) return
    updateGiftMutation.mutate(selectedCell?.gift ?? null)
  }

  const togglePinMutation = useMutation({
    mutationFn: (pinned: boolean) => {
      if (!selectedCell) {
        throw new Error('No selected cell')
      }
      return togglePinGift(
        selectedCell.gridId,
        selectedCell.rowIndex,
        selectedCell.cellIndex,
        pinned
      )
    },
    onMutate: async (pinned: boolean) => {
      if (!selectedCell || user?.id == null) return undefined
      const queryKey = ['grids', user.id] as const
      await queryClient.cancelQueries({ queryKey })
      const previousGrids = queryClient.getQueryData<Grid[]>(queryKey)
      queryClient.setQueryData<Grid[]>(queryKey, (old) => {
        if (!old) return old
        return old.map((grid) => {
          if (grid.id !== selectedCell.gridId) return grid
          return {
            ...grid,
            rows: grid.rows.map((row, ri) => {
              if (ri !== selectedCell!.rowIndex) return row
              return {
                ...row,
                cells: row.cells.map((cell, ci) => {
                  if (ci !== selectedCell!.cellIndex) return cell
                  return { ...cell, pinned }
                }),
              }
            }),
          }
        })
      })
      return { previousGrids }
    },
    onError: (_err, _pinned, context) => {
      if (context?.previousGrids != null && user?.id != null) {
        queryClient.setQueryData(['grids', user.id], context.previousGrids)
      }
      toast(t('common.error'), {
        description: t('toast.errorTogglePin'),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grids', user?.id] })
    },
  })

  const handleTogglePin = () => {
    if (!isOwnProfile) return
    if (!selectedCell) return
    togglePinMutation.mutate(!isPinned)
  }

  return (
    <Drawer
      open={!!selectedCell}
      onOpenChange={(open) => {
        if (!open) {
          clearSelectedCell()
        }
      }}
      repositionInputs={false}
    >
      <DrawerContent className="z-1000 h-screen rounded-none bg-transparent border-none [&>div:first-child]:hidden">
        {selectedCell !== undefined && (
          <div className="flex w-full h-full flex-col gap-3 pb-6 bg-background rounded-t-3xl text-white overflow-y-auto">
            <GiftPreview
              gift={selectedCell?.gift}
              onDelete={isOwnProfile ? handleDelete : undefined}
            />

            <div>
              {/* Табы для выбора режима конструктора */}
              {isOwnProfile && (
                <div className="mx-4 mb-3 flex justify-center">
                  <Tabs value={constructorMode} onValueChange={(value) => setConstructorMode(value as ConstructorMode)}>
                    <TabsList className="inline-flex gap-x-2 p-0 px-1 justify-center bg-card/50 rounded-full border border-solid border-border">
                      <TabsTrigger
                        value="constructor"
                        className="px-4 !grow-0 whitespace-nowrap bg-transparent !data-[state=active]:bg-card dark:!data-[state=active]:bg-card rounded-full border-0 border-transparent data-[state=active]:border-primary !shadow-none !data-[state=active]:shadow-none shrink-0 text-muted-foreground data-[state=active]:text-foreground h-auto cursor-pointer"
                      >
                        <span>{t('giftDrawer.constructor')}</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="freeform"
                        className="px-4 !grow-0 whitespace-nowrap bg-transparent !data-[state=active]:bg-card dark:!data-[state=active]:bg-card rounded-full border-0 border-transparent data-[state=active]:border-primary !shadow-none !data-[state=active]:shadow-none shrink-0 text-muted-foreground data-[state=active]:text-foreground h-auto cursor-pointer"
                      >
                        <span>{t('giftDrawer.freeform')}</span>
                      </TabsTrigger>
                      {/* <TabsTrigger
                        value="collection"
                        className="px-4 !grow-0 whitespace-nowrap bg-transparent !data-[state=active]:bg-card dark:!data-[state=active]:bg-card rounded-full border-0 border-transparent data-[state=active]:border-primary !shadow-none !data-[state=active]:shadow-none shrink-0 text-muted-foreground data-[state=active]:text-foreground h-auto cursor-pointer"
                        onClick={() => {
                          setIsCollectionSearchOpen(true)
                        }}
                      >
                        <span>{t('giftDrawer.collection')}</span>
                      </TabsTrigger> */}
                    </TabsList>
                  </Tabs>
                </div>
              )}

              <div className="bg-card/50 mx-4 divide-y divide-border rounded-xl border border-solid border-border overflow-hidden">
                {giftFields.map((field, i) => {
                  const fieldLoading = isConstructorModeActive
                    ? (i === 0
                        ? constructorState.isLoadingCollections
                        : i === 1
                          ? constructorState.isLoadingModels
                          : i === 2
                            ? constructorState.isLoadingBackdrops
                            : constructorState.isLoadingSymbols)
                    : i === 0
                      ? collectionsQuery.isLoading
                      : i === 1
                        ? freeformModelsQuery.isLoading
                        : i === 2
                          ? freeformBackdropsAndSymbols.isLoadingBackdrops
                          : freeformSymbolsQuery.isLoading

                  return (
                    <GiftFieldButton
                      key={field.key}
                      label={t(getGiftFieldLabelKey(field.key))}
                      fieldKey={field.key}
                      gift={selectedCell?.gift}
                      isLoading={fieldLoading}
                      isDisabled={!isOwnProfile}
                      onClick={() => {
                        if (!isOwnProfile) return
                        setEditingFieldKey(field.key)
                      }}
                    />
                  )
                })}
                
                {/* Переключатель закрепления (только для main album) */}
                {isOwnProfile && isMainAlbum && selectedCell?.gift && (
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Pin className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('giftDrawer.pinToProfile')}</span>
                    </div>
                    <button
                      onClick={handleTogglePin}
                      disabled={togglePinMutation.isPending}
                      className={`relative inline-flex h-6 w-11 items-center justify-center rounded-full transition-colors ${
                        isPinned ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      {togglePinMutation.isPending ? (
                        <Spinner className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3" />
                      ) : (
                        <span
                          className={`absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isPinned ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {isOwnProfile && (
                <DrawerFooter className="px-4 pb-4">
                  <Button
                    size="default"
                    className="h-11 w-full rounded-full text-white font-semibold"
                    onClick={handleApply}
                    disabled={updateGiftMutation.isPending}
                  >
                    {updateGiftMutation.isPending ? <Spinner /> : t('common.apply')}
                  </Button>
                </DrawerFooter>
              )}
            </div>
          </div>
        )}

        <SearchDrawer
          open={isOwnProfile && !!editingFieldKey}
          onOpenChange={(open) => {
            if (!open) {
              setEditingFieldKey(null)
            }
          }}
          title={editingFieldKey ? t(getGiftFieldLabelKey(editingFieldKey)) : ''}
          items={searchDrawerItems
            .map((item) => ({
              ...item,
              id: String(item.id),
            }))
            .sort((a, b) =>
              // Patterns: group by name first, then by gift_number within same name
              editingFieldKey === 'pattern'
                ? a.title.localeCompare(b.title) || (Number(a.id) - Number(b.id))
                : a.title.localeCompare(b.title)
            )}
          isLoading={searchDrawerIsLoading}
          handleSelect={handleSelect}
        />

        {/* SearchDrawer для поиска коллекций */}
        <SearchDrawer
          open={isOwnProfile && isCollectionSearchOpen}
          onOpenChange={(open) => {
            setIsCollectionSearchOpen(open)
            if (!open) {
              setCollectionSearchQuery('')
            }
          }}
          title={t('giftDrawer.searchCollection')}
          items={
            collectionQueries.some((q) => q.isLoading)
              ? [] // Показываем спиннер при загрузке
              : [...collectionGiftItems]
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((item) => ({
                    id: item.id,
                    title: item.title,
                    image: item.image,
                  }))
          }
          handleSelect={(item) => {
            const collectionItem = collectionGiftItems.find((i) => i.id === item.id)
            if (collectionItem) {
              handleCollectionSelect(collectionItem)
            }
          }}
          query={collectionSearchQuery}
          onQueryChange={setCollectionSearchQuery}
        />
      </DrawerContent>
    </Drawer>
  )
}
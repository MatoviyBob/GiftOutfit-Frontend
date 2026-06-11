import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GiftGrid } from '../gifts/GiftGrid'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGrids, reorderGrids, type Grid } from '@/api/gifts';
import { Spinner } from '../ui/spinner';
import { useState, useRef, useCallback, useEffect } from 'react';
import { AddAlbumDialog } from '../gifts/AddAlbumDialog';
import { RenameAlbumDialog } from '../gifts/RenameAlbumDialog';
import { useHasActiveSubscription } from '@/hooks/useSubscription';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button'
import { Sparkles, Pencil } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

// ── Sortable tab item ──────────────────────────────────────────────────────────
type SortableTabProps = {
  grid: Grid
  isMain: boolean
  isEditMode: boolean
  isActive: boolean
  onSelect: () => void
  onPencilClick: () => void
  onLongPress: () => void   // called when long-press fires
}

const LONG_PRESS_MS = 600
const LONG_PRESS_MOVE_THRESHOLD = 8 // px — abort if finger moved this much

const SortableTab = ({
  grid,
  isMain,
  isEditMode,
  isActive,
  onSelect,
  onPencilClick,
  onLongPress,
}: SortableTabProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: grid.id,
    // Only draggable when edit mode is active and not main
    disabled: isMain || !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // ── Long-press detection (per-tab, so overlay is NOT needed) ──────────────
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const firedRef = useRef(false)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    firedRef.current = false
    startPosRef.current = null
  }

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only primary button (finger / left mouse) starts long-press
    if (e.button !== 0 && e.pointerType !== 'touch') return
    if (isMain || isEditMode) return   // Main can't be edited; edit mode already active

    startPosRef.current = { x: e.clientX, y: e.clientY }
    firedRef.current = false
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      timerRef.current = null
      onLongPress()
    }, LONG_PRESS_MS)
  }, [isMain, isEditMode, onLongPress])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!startPosRef.current || !timerRef.current) return
    const dx = Math.abs(e.clientX - startPosRef.current.x)
    const dy = Math.abs(e.clientY - startPosRef.current.y)
    if (dx > LONG_PRESS_MOVE_THRESHOLD || dy > LONG_PRESS_MOVE_THRESHOLD) {
      clearTimer()
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) clearTimer()
  }, [])

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [])

  return (
    <div
      ref={setNodeRef}
      style={style}
      // DnD listeners only injected when edit mode is active (prevents touch-scroll interference)
      {...(isEditMode && !isMain ? { ...attributes, ...listeners } : {})}
      className="relative flex items-center shrink-0"
      // Long-press handlers sit on the wrapper div, NOT interfering with DnD
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <TabsTrigger
        value={String(grid.id)}
        // In edit mode prevent tab-switch; clicks only used for exit (handled by Tabs onValueChange)
        onClick={isEditMode ? (e) => { e.preventDefault(); e.stopPropagation() } : onSelect}
        className={`px-3 !grow-0 whitespace-nowrap bg-transparent !data-[state=active]:bg-card dark:!data-[state=active]:bg-card rounded-full border-0 border-transparent data-[state=active]:border-primary !shadow-none !data-[state=active]:shadow-none shrink-0 text-muted-foreground data-[state=active]:text-foreground h-auto disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none ${
          isEditMode && !isMain ? 'animate-tab-shake' : ''
        } ${isActive && !isEditMode ? 'text-foreground' : ''}`}
      >
        <span>{grid.name}</span>
      </TabsTrigger>

      {/* Pencil badge — edit mode only, non-main tabs */}
      {isEditMode && !isMain && (
        <button
          className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-10 cursor-pointer"
          // Stop the DnD listeners from capturing this pointer down
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onPencilClick() }}
        >
          <Pencil className="w-2.5 h-2.5 text-white" />
        </button>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function ProfileGroupTabs({ user, isOwnProfile = false }: { user: TelegramUser; isOwnProfile?: boolean }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{ id: number; name: string } | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: grids = [], isLoading } = useQuery({
    queryKey: ['grids', user.id],
    queryFn: () => getGrids(user.id),
  });
  const hasActiveSubscription = useHasActiveSubscription();

  // Local order for optimistic drag reorder
  const [localOrder, setLocalOrder] = useState<number[] | null>(null)

  const orderedGrids = localOrder
    ? localOrder.map(id => grids.find(g => g.id === id)).filter(Boolean) as Grid[]
    : grids

  // Reset localOrder when server data changes (new grid added, etc.)
  const gridIdsKey = grids.map(g => g.id).join(',')
  const prevGridIdsKey = useRef('')
  if (gridIdsKey !== prevGridIdsKey.current) {
    prevGridIdsKey.current = gridIdsKey
    if (localOrder !== null) setLocalOrder(null)
  }

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => reorderGrids(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grids', user.id] }),
    onError: () => {
      setLocalOrder(null)
      toast(t('common.error'), { description: t('toast.errorReorderAlbum') })
    },
  })

  // ── Left-click drag-to-scroll (desktop) ───────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDraggingScroll = useRef(false)

  const handleScrollMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Left mouse button only; don't interfere when in edit mode (DnD handles it)
    if (e.button !== 0 || isEditMode) return

    const startX = e.clientX
    const startScrollLeft = scrollRef.current?.scrollLeft ?? 0
    isDraggingScroll.current = false

    const onMouseMove = (mv: MouseEvent) => {
      const dx = mv.clientX - startX
      if (Math.abs(dx) > 4) {
        isDraggingScroll.current = true
        if (scrollRef.current) scrollRef.current.scrollLeft = startScrollLeft - dx
      }
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      // Keep isDraggingScroll true briefly so the click handler can read it
      setTimeout(() => { isDraggingScroll.current = false }, 50)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [isEditMode])

  // ── Drag-and-drop for tabs ─────────────────────────────────────────────────
  // Items are `disabled` when !isEditMode, so sensors don't interfere with
  // normal touch-scroll even though both PointerSensor and TouchSensor are active.
  const sensors = useMemo(() => useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  ), []) // sensors are stable for the lifetime of the tabs component

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const currentIds = (localOrder ?? grids.map(g => g.id))
    const oldIndex = currentIds.indexOf(active.id as number)
    const newIndex = currentIds.indexOf(over.id as number)

    // Main album stays first
    if (newIndex === 0) return

    const newOrder = arrayMove(currentIds, oldIndex, newIndex)
    setLocalOrder(newOrder)
    reorderMutation.mutate(newOrder)
  }

  // ── Tab change ─────────────────────────────────────────────────────────────
  const handleTabChange = (value: string) => {
    if (isEditMode) {
      // Any tab tap in edit mode exits it (unless caught by SortableTab's onClick)
      setIsEditMode(false)
      return
    }
    if (value !== 'add_album') {
      setActiveTab(value)
    } else {
      if (!hasActiveSubscription) {
        navigate('/subscription')
        return
      }
      setIsDialogOpen(true)
      setActiveTab(activeTab)
    }
  }

  if (isLoading) {
    // Skeleton for faster perceived loading - shows structure immediately
    return (
      <div className="w-full">
        {/* Fake tabs skeleton */}
        <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide mb-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-8 w-20 rounded-full bg-muted animate-pulse shrink-0"
            />
          ))}
        </div>

        {/* Fake grid skeleton (3x3) */}
        <div className="px-4 space-y-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((col) => (
                <div
                  key={col}
                  className="aspect-square rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const tabIds = orderedGrids.map(g => g.id)

  return (
    <>
      <Tabs
        defaultValue={String(grids[0]?.id)}
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full overflow-x-hidden relative"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
            <div
              ref={scrollRef}
              className="relative w-full overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
              onMouseDown={handleScrollMouseDown}
              onClickCapture={(e) => {
                // If the user was scrolling (dragged > 4px), swallow the click
                // so the tab under the cursor doesn't switch
                if (isDraggingScroll.current) {
                  e.stopPropagation()
                  e.preventDefault()
                }
              }}
            >
              <TabsList className="inline-flex gap-x-2 p-0 px-4 w-max min-w-full justify-center">
                {orderedGrids.map((grid, index) => (
                  <SortableTab
                    key={grid.id}
                    grid={grid}
                    isMain={index === 0}
                    isEditMode={isEditMode && isOwnProfile}
                    isActive={activeTab === String(grid.id) || (!activeTab && index === 0)}
                    onSelect={() => setActiveTab(String(grid.id))}
                    onPencilClick={() => setRenameTarget({ id: grid.id, name: grid.name })}
                    onLongPress={() => setIsEditMode(true)}
                  />
                ))}

                {isOwnProfile && !isEditMode && (
                  <TabsTrigger
                    key="add_album"
                    value="add_album"
                    onClick={() => { return }}
                    className="px-3 !grow-0 whitespace-nowrap bg-transparent !data-[state=active]:bg-muted dark:!data-[state=active]:bg-muted rounded-full border-0 border-transparent !shadow-none !data-[state=active]:shadow-none shrink-0 text-muted-foreground h-auto cursor-pointer"
                  >
                    + {t('dialogs.addAlbum')}
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          </SortableContext>
        </DndContext>

        {/* Gifts Content */}
        {orderedGrids.map((grid, index) => {
          const showSubscriptionPrompt = isOwnProfile && !hasActiveSubscription && index !== 0;
          return (
            <TabsContent key={grid.id} value={String(grid.id)} className="px-4 overflow-x-hidden">
              {showSubscriptionPrompt ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="mb-6">
                    <Sparkles className="size-16 text-blue-500 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2 text-center">
                    {t('subscription.subscribeToUnlock')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                    {t('subscription.subscribeToUnlockDesc')}
                  </p>
                  <Button asChild className="rounded-full">
                    <Link to="/subscription">
                      {t('subscription.getSubscription')}
                    </Link>
                  </Button>
                </div>
              ) : (
                <GiftGrid
                  gridId={grid.id}
                  rows={grid.rows.map(r => r.cells)}
                  isMainAlbum={index === 0}
                  isOwnProfile={isOwnProfile}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <AddAlbumDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

      {renameTarget && (
        <RenameAlbumDialog
          open={!!renameTarget}
          onOpenChange={(open) => { if (!open) setRenameTarget(null) }}
          gridId={renameTarget.id}
          currentName={renameTarget.name}
        />
      )}
    </>
  )
}

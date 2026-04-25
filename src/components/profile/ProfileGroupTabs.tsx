import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GiftGrid } from '../gifts/GiftGrid'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGrids, reorderGrids, type Grid } from '@/api/gifts';
import { Spinner } from '../ui/spinner';
import { useState, useRef, useCallback } from 'react';
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
}

const SortableTab = ({ grid, isMain, isEditMode, isActive, onSelect, onPencilClick }: SortableTabProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: grid.id,
    disabled: isMain || !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isEditMode && !isMain ? { ...attributes, ...listeners } : {})}
      className="relative flex items-center shrink-0 touch-none"
    >
      <TabsTrigger
        value={String(grid.id)}
        onClick={isEditMode ? (e) => { e.preventDefault(); e.stopPropagation() } : onSelect}
        className={`px-3 !grow-0 whitespace-nowrap bg-transparent !data-[state=active]:bg-card dark:!data-[state=active]:bg-card rounded-full border-0 border-transparent data-[state=active]:border-primary !shadow-none !data-[state=active]:shadow-none shrink-0 text-muted-foreground data-[state=active]:text-foreground h-auto disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none ${
          isEditMode && !isMain ? 'animate-tab-shake' : ''
        } ${isActive ? 'text-foreground' : ''}`}
      >
        <span>{grid.name}</span>
      </TabsTrigger>

      {/* Pencil icon — edit mode only, non-main tabs */}
      {isEditMode && !isMain && (
        <button
          className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-10 cursor-pointer"
          onPointerDown={(e) => { e.stopPropagation() }}
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

  const { data: grids = [], isLoading } = useQuery({ queryKey: ['grids', user.id], queryFn: () => getGrids(user.id) });
  const hasActiveSubscription = useHasActiveSubscription();

  // Local order for optimistic drag reorder
  const [localOrder, setLocalOrder] = useState<number[] | null>(null)

  const orderedGrids = localOrder
    ? localOrder.map(id => grids.find(g => g.id === id)).filter(Boolean) as Grid[]
    : grids

  // Sync localOrder when grids change (e.g. after invalidation)
  const prevGridIds = useRef<string>('')
  const gridIds = grids.map(g => g.id).join(',')
  if (gridIds !== prevGridIds.current) {
    prevGridIds.current = gridIds
    setLocalOrder(null)
  }

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => reorderGrids(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grids', user.id] })
    },
    onError: () => {
      setLocalOrder(null)
      toast(t('common.error'), { description: t('toast.errorReorderAlbum') })
    },
  })

  // ── Long-press detection ───────────────────────────────────────────────────
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startLongPress = useCallback(() => {
    if (!isOwnProfile) return
    longPressTimer.current = setTimeout(() => {
      setIsEditMode(true)
    }, 500)
  }, [isOwnProfile])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }, [])

  // ── Tab scroll with mouse wheel (desktop) ─────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return
    // If the scroll is more vertical-ish, let it propagate; otherwise hijack
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    e.preventDefault()
    scrollRef.current.scrollLeft += e.deltaY
  }, [])

  // ── Drag-and-drop for tabs ─────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const currentIds = (localOrder ?? grids.map(g => g.id))
    const oldIndex = currentIds.indexOf(active.id as number)
    const newIndex = currentIds.indexOf(over.id as number)

    // Main album (index 0) can't be displaced
    if (newIndex === 0) return

    const newOrder = arrayMove(currentIds, oldIndex, newIndex)
    setLocalOrder(newOrder)
    reorderMutation.mutate(newOrder)
  }

  // ── Tab change ─────────────────────────────────────────────────────────────
  const handleTabChange = (value: string) => {
    if (isEditMode) {
      setIsEditMode(false)
      return
    }
    if (value !== 'add_album') {
      setActiveTab(value)
    } else {
      if (!hasActiveSubscription) {
        navigate('/subscription')
        return;
      }
      setIsDialogOpen(true)
      setActiveTab(activeTab)
    }
  }

  if (isLoading) {
    return (
      <div className="flex w-full justify-center">
        <Spinner className="mt-5 size-8" />
      </div>
    )
  }

  const tabIds = orderedGrids.map(g => g.id)

  return (
    <>
      {/* Overlay to exit edit mode by tapping outside */}
      {isEditMode && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setIsEditMode(false)}
        />
      )}

      <Tabs
        defaultValue={String(grids[0]?.id)}
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full overflow-x-hidden relative z-20"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
            <div
              ref={scrollRef}
              className="relative w-full overflow-x-auto scrollbar-hide"
              onWheel={handleWheel}
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
                  />
                ))}

                {/* Add Album button */}
                {isOwnProfile && !isEditMode && (
                  <TabsTrigger
                    key="add_album"
                    value="add_album"
                    onClick={() => { return }}
                    onPointerDown={startLongPress}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    className="px-3 !grow-0 whitespace-nowrap bg-transparent !data-[state=active]:bg-muted dark:!data-[state=active]:bg-muted rounded-full border-0 border-transparent !shadow-none !data-[state=active]:shadow-none shrink-0 text-muted-foreground h-auto cursor-pointer"
                  >
                    + {t('dialogs.addAlbum')}
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          </SortableContext>
        </DndContext>

        {/* Hidden long-press listener on the whole tab bar */}
        {isOwnProfile && grids.length > 1 && !isEditMode && (
          <div
            className="absolute inset-0 z-[-1]"
            onPointerDown={startLongPress}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
          />
        )}

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

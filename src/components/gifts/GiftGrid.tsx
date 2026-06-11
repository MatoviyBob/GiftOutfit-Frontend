import { type FC, memo, useCallback } from "react";
import { useState } from "react";
import { popup, retrieveLaunchParams } from "@telegram-apps/sdk-react";
import { toast } from "sonner"
import { useTranslation } from '@/i18n'
import { GiftCard } from "./GiftCard";
import type { Gift } from '@/types/gift';
import { Button } from '../ui/button';
import { useGiftStore } from '@/stores/giftStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addRow, deleteLastRow, deleteGrid, batchUpdateCells, type Grid, type Cell } from '@/api/gifts';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable,
  MouseSensor,
} from '@dnd-kit/core';

const COLS = 3;

type GiftGridProps = {
  gridId: number
  rows: Cell[][]
  isMainAlbum?: boolean
  isOwnProfile?: boolean
}

type CellId = `${number}-${number}` | 'before-first'

function parseCellId(id: string): { rowIndex: number; cellIndex: number } {
  const [rowIndex, cellIndex] = id.split('-').map(Number);
  return { rowIndex, cellIndex };
}

function createCellId(rowIndex: number, cellIndex: number): CellId {
  return `${rowIndex}-${cellIndex}`;
}

// ── Flat ↔ 2D helpers ─────────────────────────────────────────────────────────
function flatIndex(rowIndex: number, cellIndex: number): number {
  return rowIndex * COLS + cellIndex;
}

/** Build a new flat array with source inserted at target position (shifting others). */
function buildInsertedFlat(flat: Cell[], sourceIdx: number, targetIdx: number): Cell[] | null {
  if (sourceIdx === targetIdx) return null;

  // Prevent if any cell in the shift range is pinned (except source itself)
  const min = Math.min(sourceIdx, targetIdx);
  const max = Math.max(sourceIdx, targetIdx);
  for (let i = min; i <= max; i++) {
    if (i !== sourceIdx && flat[i]?.pinned) return null;
  }

  const result = [...flat];
  const [moved] = result.splice(sourceIdx, 1);
  // After removing source, target position may have shifted
  const adjustedTarget = targetIdx > sourceIdx ? targetIdx - 1 : targetIdx;
  result.splice(adjustedTarget, 0, moved);
  return result;
}

// ── Before-first drop zone ─────────────────────────────────────────────────────
const BeforeFirstDropZone: FC<{ isOver: boolean }> = ({ isOver }) => {
  const { setNodeRef } = useDroppable({ id: 'before-first' });
  return (
    <div
      ref={setNodeRef}
      className="absolute -left-3 top-0 bottom-0 w-5 z-10 flex items-center justify-center"
    >
      <div
        className={`w-0.5 rounded-full transition-all duration-150 ${isOver ? 'h-4/5 bg-primary' : 'h-0 bg-transparent'}`}
      />
    </div>
  );
};

// ── Draggable cell ─────────────────────────────────────────────────────────────
type DraggableCellProps = {
  id: CellId
  rowIndex: number
  cellIndex: number
  cell: Cell
  isOwnProfile: boolean
  onCellClick: (rowIndex: number, cellIndex: number, gift: Cell['gift']) => void
  isOver?: boolean
  priority?: boolean
}

const DraggableCell: FC<DraggableCellProps> = memo(({ id, cell, onCellClick, isOver, isOwnProfile, rowIndex, cellIndex, priority = false }) => {
  const gift = cell.gift
  const isPinned = cell.pinned || false

  const { attributes, listeners, setNodeRef } = useDraggable({
    id,
    disabled: !gift || isPinned || !isOwnProfile,
  });

  const { setNodeRef: setDroppableRef, isOver: isDroppableOver } = useDroppable({ id });

  return (
    <div
      ref={(node) => { setNodeRef(node); setDroppableRef(node); }}
      className={`relative ${isDroppableOver || isOver ? 'ring-1 ring-primary rounded-lg ring-offset-1' : ''}`}
    >
      <div {...(isOwnProfile ? { ...attributes, ...listeners } : {})}>
        <GiftCard
          gift={gift}
          isPinned={isPinned}
          isOwnProfile={isOwnProfile}
          onClick={() => onCellClick(rowIndex, cellIndex, gift)}
          priority={priority}
        />
      </div>
    </div>
  );
});

// ── Main grid component ────────────────────────────────────────────────────────
export const GiftGrid: FC<GiftGridProps> = ({ gridId, rows, isMainAlbum = false, isOwnProfile = false }) => {
  const { t } = useTranslation()
  void isMainAlbum
  const setSelectedCell = useGiftStore().setSelectedCell
  const queryClient = useQueryClient()

  const lp = retrieveLaunchParams();
  const userId = lp.tgWebAppData?.user?.id;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // ── Row management mutations ──────────────────────────────────────────────────
  const addRowMutation = useMutation({
    mutationFn: () => addRow(gridId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grids', userId] }),
    onError: (error) => toast(t('toast.cantAddRow'), { description: error.message }),
  })

  const deleteLastRowMutation = useMutation({
    mutationFn: () => deleteLastRow(gridId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grids', userId] }),
    onError: (error) => toast(t('toast.cantDeleteRow'), { description: error.message }),
  })

  const deleteGridMutation = useMutation({
    mutationFn: () => deleteGrid(gridId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grids', userId] })
      toast(t('toast.albumDeleted'), { description: t('toast.albumDeletedDesc') })
    },
    onError: () => toast(t('common.error'), { description: t('toast.errorDeleteAlbum') }),
  })

  const clearGridMutation = useMutation({
    mutationFn: async () => {
      // Build all the cells we need to clear in the main 3 rows
      const updates: Array<{ row_index: number; cell_index: number; gift: Gift | null }> = []
      for (let rowIndex = 0; rowIndex < Math.min(rows.length, 3); rowIndex++) {
        for (let cellIndex = 0; cellIndex < COLS; cellIndex++) {
          updates.push({ row_index: rowIndex, cell_index: cellIndex, gift: null })
        }
      }

      // Send everything in a single fast batch request
      if (updates.length > 0) {
        await batchUpdateCells(gridId, updates)
      }

      // Remove any extra rows beyond the default 3 (these are cheap single calls)
      const extraRows = rows.length - 3
      for (let i = 0; i < extraRows; i++) {
        await deleteLastRow(gridId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grids', userId] })
      toast(t('toast.albumCleared'), { description: t('toast.albumClearedDesc') })
    },
    onError: () => toast(t('common.error'), { description: t('toast.errorClearAlbum') }),
  })

  // ── Insert mutation (replaces swap) ──────────────────────────────────────────
  const insertGiftMutation = useMutation({
    mutationFn: async ({ newFlat, oldFlat }: { newFlat: Cell[]; oldFlat: Cell[] }) => {
      // Collect only the cells that actually changed into a single batch
      const updates: Array<{ row_index: number; cell_index: number; gift: Gift | null }> = []
      for (let i = 0; i < newFlat.length; i++) {
        const n = newFlat[i];
        const o = oldFlat[i];
        const changed =
          n?.gift?.id !== o?.gift?.id ||
          n?.gift?.name !== o?.gift?.name;
        if (changed) {
          const rowIdx = Math.floor(i / COLS);
          const cellIdx = i % COLS;
          updates.push({ row_index: rowIdx, cell_index: cellIdx, gift: n?.gift ?? null })
        }
      }

      if (updates.length > 0) {
        await batchUpdateCells(gridId, updates)
      }
    },
    onMutate: async ({ newFlat }) => {
      await queryClient.cancelQueries({ queryKey: ['grids', userId] });
      const previousGrids = queryClient.getQueryData<Grid[]>(['grids', userId]);

      queryClient.setQueryData<Grid[]>(['grids', userId], (old) => {
        if (!old) return old;
        return old.map(grid => {
          if (grid.id !== gridId) return grid;
          const newRows = grid.rows.map((row, ri) => ({
            ...row,
            cells: row.cells.map((_, ci) => {
              const linearIdx = flatIndex(ri, ci);
              return newFlat[linearIdx] ?? { gift: null, pinned: false };
            }),
          }));
          return { ...grid, rows: newRows };
        });
      });

      return { previousGrids };
    },
    onError: (error, _vars, context) => {
      if (context?.previousGrids) {
        queryClient.setQueryData(['grids', userId], context.previousGrids);
      }
      toast(t('common.error'), { description: error.message || t('toast.errorMoveGift') });
    },
  });

  // ── Drag state ────────────────────────────────────────────────────────────────
  const [activeId, setActiveId] = useState<CellId | null>(null);
  const [overId, setOverId] = useState<CellId | null>(null);

  const handleCellClick = useCallback((rowIndex: number, cellIndex: number, gift: Cell['gift']) => {
    if (!isOwnProfile && !gift) return;
    setSelectedCell({ gridId, rowIndex, cellIndex, gift, isOwnProfile });
  }, [gridId, isOwnProfile, setSelectedCell]);

  const handleDragStart = (event: { active: { id: string | number } }) => {
    if (!isOwnProfile) return;
    setActiveId(event.active.id as CellId);
  };

  const handleDragOver = (event: { over: { id: string | number } | null }) => {
    if (!isOwnProfile) return;
    setOverId(event.over ? event.over.id as CellId : null);
  };

  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    if (!isOwnProfile) return;
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) return;

    const sourceId = active.id as string;
    const targetId = over.id as string;

    // Parse source (always a valid cell id)
    const source = parseCellId(sourceId);
    const sourceIdx = flatIndex(source.rowIndex, source.cellIndex);

    // Determine target flat index
    let targetIdx: number;
    if (targetId === 'before-first') {
      targetIdx = 0;
    } else {
      const target = parseCellId(targetId);
      targetIdx = flatIndex(target.rowIndex, target.cellIndex);
    }

    if (sourceIdx === targetIdx) return;

    // Get current flat cells from query cache
    const grids = queryClient.getQueryData<Grid[]>(['grids', userId]) || [];
    const currentGrid = grids.find(g => g.id === gridId);
    if (!currentGrid) {
      toast(t('common.error'), { description: t('toast.errorGridNotFound') });
      return;
    }

    const oldFlat: Cell[] = currentGrid.rows.flatMap(row => row.cells);

    // Check if source is pinned
    if (oldFlat[sourceIdx]?.pinned) {
      toast(t('common.error'), { description: t('toast.errorMovePinned') });
      return;
    }

    // Build new flat array with insertion
    const newFlat = buildInsertedFlat(oldFlat, sourceIdx, targetIdx);
    if (!newFlat) {
      // Blocked by pinned cell in range
      toast(t('common.error'), { description: t('toast.errorMovePinned') });
      return;
    }

    insertGiftMutation.mutate({ newFlat, oldFlat });
  };

  // ── Popups ────────────────────────────────────────────────────────────────────
  const openPopup = () => {
    popup.show({
      title: t('giftDrawer.deleteAlbumTitle'),
      message: t('giftDrawer.deleteAlbumMessage'),
      buttons: [
        { id: "delete", type: "destructive", text: t('giftDrawer.deleteAlbum') },
        { id: "cancel", type: "cancel" }
      ]
    }).then((buttonId) => { if (buttonId === "delete") deleteGridMutation.mutate() });
  }

  const openClearPopup = () => {
    popup.show({
      title: t('giftDrawer.clearAlbumTitle'),
      message: t('giftDrawer.clearAlbumMessage'),
      buttons: [
        { id: "clear", type: "destructive", text: t('giftDrawer.clearAlbum') },
        { id: "cancel", type: "cancel" }
      ]
    }).then((buttonId) => { if (buttonId === "clear") clearGridMutation.mutate() });
  }

  // ── Active gift for overlay ───────────────────────────────────────────────────
  const activeGift: Gift | null = activeId && activeId !== 'before-first'
    ? (() => {
        const { rowIndex, cellIndex } = parseCellId(activeId);
        return rows[rowIndex]?.[cellIndex]?.gift || null;
      })()
    : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-3 gap-2 relative">
              {/* Before-first drop zone — only on first row during drag */}
              {rowIndex === 0 && activeId && (
                <BeforeFirstDropZone isOver={overId === 'before-first'} />
              )}

              {row.map((cell, cellIndex) => {
                const cellId = createCellId(rowIndex, cellIndex);
                const isPriority = isMainAlbum && rowIndex === 0 && cellIndex < 3;
                return (
                  <DraggableCell
                    key={cellId}
                    id={cellId}
                    rowIndex={rowIndex}
                    cellIndex={cellIndex}
                    cell={cell}
                    isOwnProfile={isOwnProfile}
                    isOver={overId === cellId && activeId !== cellId}
                    onCellClick={handleCellClick}
                    priority={isPriority}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <DragOverlay>
          <div className="opacity-80">
            <GiftCard gift={activeGift} onClick={() => {}} isOwnProfile={true} />
          </div>
        </DragOverlay>
      </DndContext>

      {isOwnProfile && (
        <>
          <Button
            size="default"
            className="mt-3 h-11 w-full rounded-full bg-card text-foreground font-semibold cursor-pointer"
            onClick={() => addRowMutation.mutate()}
            disabled={addRowMutation.isPending}
          >
            {addRowMutation.isPending ? t('giftDrawer.adding') : t('giftDrawer.addRow')}
          </Button>

          <Button
            size="default"
            className="mt-2 h-11 w-full rounded-full bg-card text-foreground font-semibold cursor-pointer"
            onClick={() => deleteLastRowMutation.mutate()}
            disabled={deleteLastRowMutation.isPending || rows.length <= 1}
          >
            {deleteLastRowMutation.isPending ? t('giftDrawer.removing') : t('giftDrawer.removeLastRow')}
          </Button>

          <Button
            size="default"
            className="mt-2 h-11 w-full rounded-full bg-card text-destructive font-semibold cursor-pointer hover:bg-card/80"
            onClick={openClearPopup}
            disabled={clearGridMutation.isPending}
          >
            {clearGridMutation.isPending ? t('giftDrawer.removing') : t('giftDrawer.clearAlbum')}
          </Button>

          <Button
            size="default"
            className="mt-2 h-11 w-full rounded-full bg-destructive/15 text-destructive font-semibold cursor-pointer hover:bg-destructive/25"
            onClick={openPopup}
            disabled={deleteGridMutation.isPending}
          >
            {t('giftDrawer.deleteAlbum')}
          </Button>
        </>
      )}
    </>
  );
}

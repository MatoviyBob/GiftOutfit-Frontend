import { create } from 'zustand'
import type { Gift } from '@/types/gift'

export interface SelectedCell {
    gridId: number;
    rowIndex: number;
    cellIndex: number;
    gift?: Gift | null;
    /**
     * True if the viewer is the owner of this profile (editable).
     * False if viewing someone else's profile (read-only).
     */
    isOwnProfile?: boolean;
}

export const giftFields = [
    { label: 'Gifts', key: 'gifts' },
    { label: 'Model', key: 'model' },
    { label: 'Background', key: 'background' },
    { label: 'Pattern', key: 'pattern' },
]

export type GiftFieldKey = typeof giftFields[number]['key']

type GiftStore = {
    selectedCell: SelectedCell | null;
    setSelectedCell: (cell: SelectedCell) => void;
    clearSelectedCell: () => void;

    editingFieldKey: string | null
    setEditingFieldKey: (key: string | null) => void

    selectField: (key: string, value: string, extra?: unknown, mode?: 'constructor' | 'freeform') => void

    /** Gift currently in clipboard for copy/paste */
    copiedGift: Gift | null
    copyGift: (gift: Gift | null) => void
    clearCopiedGift: () => void
}

export const useGiftStore = create<GiftStore>((set, get) => ({
    selectedCell: null,
    setSelectedCell: (cell) => set({ selectedCell: cell }),
    clearSelectedCell: () => set({ selectedCell: null, editingFieldKey: null }),

    editingFieldKey: null,
    setEditingFieldKey: (key) => set(() => ({ editingFieldKey: key })),

    copiedGift: null,
    copyGift: (gift) => set({ copiedGift: gift }),
    clearCopiedGift: () => set({ copiedGift: null }),
  
    selectField: (key, value, extra, mode = 'constructor') => {
      const state = get()

      // Prevent any edits when viewing someone else's profile
      if (state.selectedCell?.isOwnProfile === false) {
        return
      }
      if (!state.selectedCell) {
        return
      }
      
      let updatedGift = state.selectedCell.gift

      if (key.toString() === 'gifts') {
        if (state.selectedCell?.gift) {
            updatedGift = {
              ...state.selectedCell.gift,
              name: value,
              model: undefined,
              pattern: undefined,
              background: undefined,
              // В freeform режиме id всегда 0
              id: mode === 'freeform' ? 0 : (state.selectedCell.gift.id ?? 0),
            }
        } else {
            updatedGift = {
                id: 0,
                name: value,
                model: undefined,
                pattern: undefined,
                background: undefined,
            }
        }
      }

      // Если изменяем модель — обновляем selectedGift
      if (state.selectedCell?.gift && key.toString() === 'model') {
        updatedGift = {
          ...state.selectedCell.gift,
          model: value,
          background: undefined,
          pattern: undefined,
          // В freeform режиме id всегда 0
          id: mode === 'freeform' ? 0 : (state.selectedCell.gift.id ?? 0),
        }
      }
  
      // Если фон — обновляем background
      if (
        state.selectedCell?.gift &&
        key.toString() === 'background' &&
        typeof extra === 'object' &&
        extra !== null &&
        'background' in extra
      ) {
        const background = (extra as { background?: Gift['background'] }).background
        if (!background) {
          return
        }
        updatedGift = {
          ...state.selectedCell.gift,
          background,
          pattern: undefined,
          // В freeform режиме id всегда 0
          id: mode === 'freeform' ? 0 : (state.selectedCell.gift.id ?? 0),
        }
      }

      if (state.selectedCell?.gift && key.toString() === 'pattern') {
        updatedGift = {
          ...state.selectedCell.gift,
          pattern: value,
          // В freeform режиме id всегда 0, в constructor сохраняем текущий id
          id: mode === 'freeform' ? 0 : (state.selectedCell.gift.id ?? 0),
        }
      }

      if (state.selectedCell?.gift && key.toString() === 'id') {
        // В freeform режиме не устанавливаем id (оставляем 0)
        if (mode === 'freeform') {
          updatedGift = {
            ...state.selectedCell.gift,
            id: 0,
          }
        } else {
          updatedGift = {
            ...state.selectedCell.gift,
            id: Number(value),
          }
        }
      }

      const updatedCell: SelectedCell = {
        ...state.selectedCell,
        gift: updatedGift,
      }
  
      set({
        selectedCell: updatedCell,
      })
    },
}))
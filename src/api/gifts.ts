import apiClient from './apiClient';
import type { Gift } from '@/types/gift';

// Тип для ячейки с информацией о закреплении
export interface Cell {
    gift: Gift | null;
    pinned?: boolean;
    pinned_position?: number | null;
}

// Типы для гридов и строк
export interface GridRow {
    row_index: number;
    cells: Cell[];
}

export interface Grid {
    id: number;
    name: string;
    rows: GridRow[];
}

export const createGrid = async (name: string) => {
    const res = await apiClient.post(`/me/grids`, { name })
    return res.data
}

export const deleteGrid = async (id: number) => {
    const res = await apiClient.delete(`/me/grids/${id}`)
    return res.data
}

export const renameGrid = async (id: number, name: string) => {
    const res = await apiClient.patch(`/me/grids/${id}`, { name })
    return res.data
}

export const reorderGrids = async (ids: number[]) => {
    const res = await apiClient.patch(`/me/grids/reorder`, { ids })
    return res.data
}

// GET все гриды с их строками и ячейками
export const getGrids = async (userId: number): Promise<Grid[]> => {
    const { data } = await apiClient.get(`/users/${userId}/grids`); // пример user_id
    // Если нужно, можно трансформировать данные сразу в нужный формат
    return data.map((grid: any) => ({
      id: grid.id,
      name: grid.name,
      rows: grid.rows.map((row: any) => ({
        row_index: row.row_index,
        cells: row.cells.map((cell: any): Cell => {
          // Если cell - null, возвращаем пустую ячейку
          if (!cell) {
            return {
              gift: null,
              pinned: false,
              pinned_position: null
            };
          }
          
          // Если cell уже имеет структуру Cell с полем gift
          if (cell && 'gift' in cell) {
            return {
              gift: cell.gift || null,
              pinned: cell.pinned || false,
              pinned_position: cell.pinned_position ?? null
            };
          }
          
          // Если cell - это Gift с полями pinned/pinned_position напрямую (структура с бэкенда)
          // Бэкенд возвращает подарок с полями pinned и pinned_position прямо в объекте подарка
          const pinned = cell.pinned === true || cell.pinned === false ? cell.pinned : false;
          const pinnedPosition = cell.pinned_position !== undefined ? cell.pinned_position : null;
          
          // Создаем чистый объект подарка без полей pinned/pinned_position
          const gift: Gift = {
            id: cell.id,
            name: cell.name,
            model: cell.model,
            background: cell.background,
            pattern: cell.pattern
          };
          
          return {
            gift: gift,
            pinned: pinned,
            pinned_position: pinnedPosition
          };
        }),
      })),
    }));
};

// GET все гриды и rows, возвращаем плоский список подарков
// export const getGifts = async (): Promise<Gift[]> => {
//   const { data } = await api.get('/users/307291324/grids'); // пример
//   const gifts: Gift[] = [];
//   data.forEach((grid: any) => {
//     grid.rows.forEach((row: any) => {
//       row.cells.forEach((cell: any) => {
//         gifts.push(cell);
//       });
//     });
//   });
//   console.log(gifts)
//   return gifts;
// };

// POST добавление строки
export const addRow = async (gridId: number) => {
  const { data } = await apiClient.post(`/grids/${gridId}/rows`, {});
  return data;
};

/**
 * Delete last row of the grid.
 * @param gridId - ID of the grid
 * @returns the deleted row
 */
export const deleteLastRow = async (gridId: number) => {
  const { data } = await apiClient.delete(`/grids/${gridId}/rows/last`);
  return data;
};

export const updateGiftCell = async (
    gridId: number,
    rowIndex: number,
    cellIndex: number,
    gift: Gift | null
) => {
    return await apiClient.put(
      `/grids/${gridId}/rows/${rowIndex}/cells/${cellIndex}`,
      { gift }
    )
}

// POST атомарный свап двух ячеек
export const swapGiftCells = async (
    gridId: number,
    sourceRow: number,
    sourceCell: number,
    targetRow: number,
    targetCell: number
) => {
    return await apiClient.post(
        `/grids/${gridId}/cells/swap`,
        {
            source: {
                row_index: sourceRow,
                cell_index: sourceCell
            },
            target: {
                row_index: targetRow,
                cell_index: targetCell
            }
        }
    )
}

// POST закрепление/открепление подарка
export const togglePinGift = async (
    gridId: number,
    rowIndex: number,
    cellIndex: number,
    pinned: boolean
) => {
    return await apiClient.post(
        `/grids/${gridId}/cells/${rowIndex}/${cellIndex}/pin`,
        { pinned }
    )
}
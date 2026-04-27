import { useState } from 'react';

// Tracks per-cell inline-edit state for DataTable rows.
// `editingCell` is the string `${itemId}-${columnId}`. We use lastIndexOf('-')
// when parsing because itemIds are UUIDs that contain dashes themselves.
export function useInlineEdit<T>() {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<T>>({});

  const startEdit = (itemId: string, columnId: string, item: Partial<T>) => {
    setEditingCell(`${itemId}-${columnId}`);
    setEditData(item);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditData({});
  };

  const parseEditingCell = (): { itemId: string; columnId: string } | null => {
    if (!editingCell) return null;
    const i = editingCell.lastIndexOf('-');
    return {
      itemId: editingCell.substring(0, i),
      columnId: editingCell.substring(i + 1),
    };
  };

  return {
    editingCell,
    editData,
    setEditData,
    startEdit,
    cancelEdit,
    parseEditingCell,
  };
}

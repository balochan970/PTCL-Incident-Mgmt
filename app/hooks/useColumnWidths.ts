import { useState, useEffect } from 'react';

interface ColumnConfig {
  key: string;
  defaultWidth: number;
  minWidth?: number;
}

export const useColumnWidths = (tableId: string, columns: ColumnConfig[]) => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});

  // Load saved widths from localStorage on mount
  useEffect(() => {
    const savedWidths: { [key: string]: number } = {};
    let hasChanges = false;

    columns.forEach((col, index) => {
      const savedWidth = localStorage.getItem(`${tableId}-col-${index}`);
      if (savedWidth) {
        const width = Math.max(parseInt(savedWidth), col.minWidth || 50);
        savedWidths[col.key] = width;
        hasChanges = true;
      } else {
        savedWidths[col.key] = col.defaultWidth;
      }
    });

    if (hasChanges) {
      setColumnWidths(savedWidths);
    }
  }, [tableId, columns]);

  const handleColumnResize = (columnKey: string, columnIndex: number, newWidth: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: newWidth
    }));
    localStorage.setItem(`${tableId}-col-${columnIndex}`, newWidth.toString());
  };

  return {
    columnWidths,
    handleColumnResize,
    getColumnWidth: (key: string) => columnWidths[key] || columns.find(col => col.key === key)?.defaultWidth || 100
  };
};

export default useColumnWidths; 
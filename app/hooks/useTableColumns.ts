import { useState, useEffect } from 'react';

interface ColumnConfig {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth?: number;
  sortable?: boolean;
}

const regularReportsColumns: ColumnConfig[] = [
  { key: 'selection', label: '', defaultWidth: 40, minWidth: 40 },
  { key: 'incidentNumber', label: 'Ticket #', defaultWidth: 100, minWidth: 80, sortable: true },
  { key: 'timestamp', label: 'Fault Occurred (Date/Time)', defaultWidth: 180, minWidth: 150, sortable: true },
  { key: 'domain', label: 'Domain', defaultWidth: 100, minWidth: 80, sortable: true },
  { key: 'exchangeName', label: 'Exchange', defaultWidth: 150, minWidth: 120, sortable: true },
  { key: 'faultType', label: 'Fault Type', defaultWidth: 100, minWidth: 80, sortable: true },
  { key: 'equipmentType', label: 'Equipment Type', defaultWidth: 120, minWidth: 100, sortable: true },
  { key: 'nodes', label: 'Nodes', defaultWidth: 200, minWidth: 150, sortable: true },
  { key: 'faultEndTime', label: 'Fault End (Date/Time)', defaultWidth: 150, minWidth: 120, sortable: true },
  { key: 'status', label: 'Status', defaultWidth: 100, minWidth: 80, sortable: true },
  { key: 'closedBy', label: 'Ticket Closed by', defaultWidth: 100, minWidth: 80, sortable: true },
  { key: 'totalTime', label: 'Total Outage Time', defaultWidth: 100, minWidth: 80, sortable: true },
  { key: 'actions', label: 'Actions', defaultWidth: 80, minWidth: 60 }
];

const gponReportsColumns: ColumnConfig[] = [
  { key: 'selection', label: '', defaultWidth: 40, minWidth: 40 },
  { key: 'incidentNumber', label: 'Ticket #', defaultWidth: 120, minWidth: 100, sortable: true },
  { key: 'timestamp', label: 'Fault Occurred (Date/Time)', defaultWidth: 180, minWidth: 150, sortable: true },
  { key: 'exchangeName', label: 'Exchange', defaultWidth: 150, minWidth: 120, sortable: true },
  { key: 'fdh', label: 'FDH', defaultWidth: 120, minWidth: 100, sortable: true },
  { key: 'fats', label: 'FATs', defaultWidth: 200, minWidth: 150, sortable: true },
  { key: 'oltIp', label: 'OLT IP', defaultWidth: 120, minWidth: 100, sortable: true },
  { key: 'fsps', label: 'F/S/P', defaultWidth: 120, minWidth: 100 },
  { key: 'faultEndTime', label: 'Fault End Time (Date/Time)', defaultWidth: 180, minWidth: 150, sortable: true },
  { key: 'status', label: 'Status', defaultWidth: 100, minWidth: 80, sortable: true },
  { key: 'closedBy', label: 'Closed By', defaultWidth: 120, minWidth: 100, sortable: true },
  { key: 'totalTime', label: 'Total Time', defaultWidth: 100, minWidth: 80, sortable: true },
  { key: 'actions', label: 'Actions', defaultWidth: 80, minWidth: 60 }
];

export const useTableColumns = (tableType: 'regular' | 'gpon') => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const columns = tableType === 'regular' ? regularReportsColumns : gponReportsColumns;
  const tableId = `${tableType}-reports`;

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
    columns,
    columnWidths,
    handleColumnResize,
    getColumnWidth: (key: string) => columnWidths[key] || columns.find(col => col.key === key)?.defaultWidth || 100
  };
};

export default useTableColumns; 
import React, { useCallback, useEffect, useState } from 'react';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

interface TableHeaderProps {
  children: React.ReactNode;
  width: number;
  minWidth?: number;
  onResize: (width: number) => void;
  tableId: string;
  columnIndex: number;
  sortKey?: string;
  onSort?: () => void;
  sortDirection?: 'asc' | 'desc' | null;
}

const TableHeader: React.FC<TableHeaderProps> = ({
  children,
  width,
  minWidth = 50,
  onResize,
  tableId,
  columnIndex,
  sortKey,
  onSort,
  sortDirection
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(width);
  const [hasResized, setHasResized] = useState(false);

  // Load saved width from localStorage on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem(`${tableId}-col-${columnIndex}`);
    if (savedWidth) {
      onResize(Math.max(parseInt(savedWidth), minWidth));
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start resize if clicking the handle
    if (!(e.target as HTMLElement).classList.contains('resize-handle')) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setHasResized(false);
    setStartX(e.clientX);
    setStartWidth(width);
    document.body.classList.add('table-resizing');
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const diff = e.clientX - startX;
    if (Math.abs(diff) > 5) {
      setHasResized(true);
    }
    const newWidth = Math.max(startWidth + diff, minWidth);
    onResize(newWidth);
    
    // Save to localStorage
    localStorage.setItem(`${tableId}-col-${columnIndex}`, newWidth.toString());
  }, [isResizing, startX, startWidth, minWidth, onResize, tableId, columnIndex]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.classList.remove('table-resizing');
    // Reset hasResized after a short delay
    setTimeout(() => {
      setHasResized(false);
    }, 100);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    // Prevent sort if we just finished resizing
    if (hasResized) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onSort?.();
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const getSortIcon = () => {
    if (!sortDirection) return <FaSort />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  return (
    <th 
      style={{ width: `${width}px`, minWidth: `${minWidth}px` }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {children}
        {sortKey && <span>{getSortIcon()}</span>}
      </div>
      <div className="resize-handle" />
    </th>
  );
};

export default TableHeader; 
import React, { useCallback, useEffect, useState } from 'react';

interface ResizableHeaderProps {
  children: React.ReactNode;
  width: number;
  minWidth?: number;
  onResize: (width: number) => void;
  tableId: string;
  columnIndex: number;
}

const ResizableHeader: React.FC<ResizableHeaderProps> = ({
  children,
  width,
  minWidth = 50,
  onResize,
  tableId,
  columnIndex
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(width);

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem(`${tableId}-col-${columnIndex}`);
    if (savedWidth) {
      onResize(Math.max(parseInt(savedWidth), minWidth));
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
    document.body.classList.add('table-resizing');
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const diff = e.clientX - startX;
    const newWidth = Math.max(startWidth + diff, minWidth);
    onResize(newWidth);
    
    // Save to localStorage
    localStorage.setItem(`${tableId}-col-${columnIndex}`, newWidth.toString());
  }, [isResizing, startX, startWidth, minWidth, onResize, tableId, columnIndex]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.classList.remove('table-resizing');
  }, []);

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

  return (
    <th style={{ width: `${width}px`, minWidth: `${minWidth}px` }}>
      {children}
      <div
        className="resize-handle"
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      />
    </th>
  );
};

export default ResizableHeader; 
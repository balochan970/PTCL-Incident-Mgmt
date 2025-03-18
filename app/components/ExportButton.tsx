"use client";

import { useState } from 'react';
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { exportToCSV } from '../utils/exportUtils';
import * as XLSX from 'xlsx';

interface ExportButtonProps {
  data: any[];
  filename: string;
  headers?: string[];
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export default function ExportButton({
  data,
  filename,
  headers,
  label = 'Export',
  variant = 'outline',
  size = 'default',
  className = '',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = (format: 'csv' | 'xlsx') => {
    setIsExporting(true);
    
    try {
      if (format === 'csv') {
        exportToCSV(data, filename, headers);
      } else if (format === 'xlsx') {
        exportToXLSX(data, filename, headers);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToXLSX = (data: any[], filename: string, headers?: string[]) => {
    // Create a worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Create a workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    
    // Generate XLSX file and trigger download
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={`flex items-center gap-2 dark:bg-dark-surface dark:text-dark-text dark:hover:bg-dark-surface/90 ${className}`}
          disabled={isExporting || !data.length}
        >
          <span className="text-lg">📊</span>
          {isExporting ? 'Exporting...' : label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="dark:bg-dark-surface dark:text-dark-text dark:border-dark-border">
        <DropdownMenuItem 
          onClick={() => handleExport('csv')}
          className="cursor-pointer dark:hover:bg-dark-background"
        >
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('xlsx')}
          className="cursor-pointer dark:hover:bg-dark-background"
        >
          Export as Excel (XLSX)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 
/**
 * Utility functions for exporting data to various formats
 */

/**
 * Convert an array of objects to CSV format
 * @param data Array of objects to convert
 * @param headers Optional custom headers (uses object keys if not provided)
 * @returns CSV string
 */
export function convertToCSV(data: any[], headers?: string[]): string {
  if (!data || !data.length) return '';

  // Get headers from the first object if not provided
  const headerRow = headers || Object.keys(data[0]);
  
  // Create CSV header row
  let csv = headerRow.join(',') + '\n';
  
  // Add data rows
  data.forEach(item => {
    const row = headerRow.map(header => {
      // Get the value for this header
      const value = header.includes('.') 
        ? header.split('.').reduce((obj, key) => obj?.[key], item) 
        : item[header];
      
      // Format the value for CSV
      const formatted = formatValueForCSV(value);
      return formatted;
    });
    
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

/**
 * Format a value for CSV to handle special characters
 * @param value Value to format
 * @returns Formatted value
 */
function formatValueForCSV(value: any): string {
  if (value === null || value === undefined) return '';
  
  // Handle dates
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  // Handle Firebase Timestamp objects
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  
  // Convert to string
  const str = String(value);
  
  // Escape quotes and wrap in quotes if contains special characters
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Export data to CSV and trigger download
 * @param data Array of objects to export
 * @param filename Filename for the download (without extension)
 * @param headers Optional custom headers
 */
export function exportToCSV(data: any[], filename: string, headers?: string[]): void {
  const csv = convertToCSV(data, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Create download link
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  // Append to document, trigger download, and clean up
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format date for display
 * @param timestamp Firebase timestamp or Date object
 * @param includeTime Whether to include time in the output
 * @returns Formatted date string
 */
export function formatDate(timestamp: any, includeTime: boolean = true): string {
  if (!timestamp) return 'N/A';
  
  try {
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    
    if (includeTime) {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    return 'Invalid Date';
  }
} 
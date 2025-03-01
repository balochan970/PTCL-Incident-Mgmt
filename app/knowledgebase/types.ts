export interface Contact {
  id: string;
  name: string;
  number: string;
  backupNumber?: string;
  exchangeName: string;
  supervisorName: string;
  remarks?: string;
  designation?: string;
  department?: string;
  timestamp?: Date;
  email?: string;
}

export interface ExcelContact {
  // Standard fields
  name: string;
  number: string;
  designation?: string;
  department?: string;
  email?: string;
  remarks?: string;
  exchangeName: string;
  supervisorName: string;
  backupNumber?: string;

  // Excel-specific field names (capitalized)
  Name?: string;
  Number?: string;
  Designation?: string;
  Department?: string;
  'Email (Optional)'?: string;
  'Remarks (Optional)'?: string;
  ExchangeName?: string;
  SupervisorName?: string;
  BackupNumber?: string;
} 
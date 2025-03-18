import { Timestamp } from 'firebase/firestore';

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

// New types for enhanced knowledge base

export interface Documentation {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  version: string;
  attachments?: string[];
  parentId?: string;
  isVersionHistory?: boolean;
}

export interface TroubleshootingGuide {
  id: string;
  title: string;
  problem: string;
  symptoms: string[];
  solutions: TroubleshootingSolution[];
  equipmentType: string;
  faultType: string;
  author: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  rating?: number;
  ratingCount?: number;
}

export interface TroubleshootingSolution {
  id: string;
  steps: string[];
  expectedOutcome: string;
  successRate?: number;
  timeToResolve?: string;
}

export interface BestPractice {
  id: string;
  title: string;
  category: string;
  content: string;
  examples: string[];
  author: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  rating?: number;
  ratingCount?: number;
} 
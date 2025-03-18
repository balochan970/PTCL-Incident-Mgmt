import { Timestamp } from 'firebase/firestore';
import { Location } from '@/lib/utils/location';

export interface Incident {
  id: string;
  incidentNumber: string;
  exchangeName: string;
  faultType: string;
  equipmentType: string;
  domain: string;
  nodes: {
    nodeA: string;
    nodeB: string;
    nodeC?: string;
    nodeD?: string;
  };
  outageNodes?: Record<string, boolean>;
  stakeholders?: string[];
  ticketGenerator: string;
  timestamp: Timestamp;
  faultEndTime?: Timestamp;
  status: string;
  closedBy?: string;
  faultRestorer?: string;
  remarks?: string;
  location?: Location;
  locationUpdatedAt?: string;
  [key: string]: any;
} 
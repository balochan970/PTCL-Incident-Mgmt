export interface Location {
  lat: number;
  lng: number;
  address?: string;
  source: 'google_maps' | 'coordinates' | 'address';
}

export interface IncidentLocation extends Location {
  incidentId: string;
  incidentType: 'gpon' | 'switch';
  timestamp: number;
}

export interface Incident {
  id: string;
  incidentNumber?: string;
  faultType?: string;
  domain?: string;
  equipmentType?: string;
  exchangeName?: string;
  status: string;
  timestamp: any;
  faultEndTime?: any;
  nodeA?: string;
  nodeB?: string;
  nodes?: {
    nodeA?: string;
    nodeB?: string;
  };
  fdh?: string;
  fats?: Array<{ id?: string; value?: string }>;
  fsps?: Array<{ id?: string; value?: string }>;
  oltIp?: string;
  remarks?: string;
  ticketGenerator?: string;
  isOutage?: boolean;
  stakeholders?: string[];
  location?: Location;
}

export interface LocationUpdatePayload {
  incidentId: string;
  location: Location;
} 
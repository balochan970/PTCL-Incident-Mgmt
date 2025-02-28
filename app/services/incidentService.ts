import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, doc, runTransaction, Timestamp, updateDoc } from 'firebase/firestore';
import { Location, LocationUpdatePayload } from '../types/incident';

// Keep track of recent submissions to prevent duplicates on the client side
const recentSubmissions = new Map<string, { timestamp: number, incidentNumber: string }>();
const SUBMISSION_TIMEOUT = 30000; // 30 seconds

// Helper function to generate a simple hash for the submission data
function generateSubmissionKey(data: any): string {
  return JSON.stringify({
    exchangeName: data.exchangeName,
    nodes: data.nodes,
    stakeholders: data.stakeholders,
    faultType: data.faultType,
    timestamp: Math.floor(Date.now() / 10000) // Round to nearest 10 seconds
  });
}

export interface IncidentData {
  exchangeName: string;
  nodes: any;
  stakeholders: string[];
  faultType: string;
  equipmentType: string;
  domain: string;
  ticketGenerator: string;
  isMultipleFault?: boolean;
  outageNodes?: any;
  remarks?: string;
}

export interface GPONFaultData {
  fdh: string;
  fats: Array<{ id: string; value: string }>;
  oltIp: string;
  fsps: Array<{ id: string; value: string }>;
  isOutage: boolean;
  remarks?: string;
}

export interface GPONIncidentData {
  exchangeName: string;
  stakeholders: string[];
  ticketGenerator: string;
  faults: GPONFaultData[];
}

/**
 * Create a single incident with duplicate prevention
 */
export async function createIncident(data: IncidentData): Promise<string> {
  // Generate a key for this submission
  const submissionKey = generateSubmissionKey(data);

  // Check if this is a duplicate submission
  if (recentSubmissions.has(submissionKey)) {
    console.log('Client-side duplicate prevention activated');
    return recentSubmissions.get(submissionKey)!.incidentNumber;
  }

  try {
    // Get the next incident number using a transaction
    const nextIncidentNumber = await runTransaction(db, async (transaction) => {
      const counterRef = doc(db, 'incidentCounters', 'counter');
      const counterDoc = await transaction.get(counterRef);
      
      let currentCounter = 1;
      if (counterDoc.exists()) {
        currentCounter = counterDoc.data().lastIncidentNumber + 1;
      }
      
      // Update the counter
      transaction.set(counterRef, { lastIncidentNumber: currentCounter }, { merge: true });
      
      // Format the incident number with leading zeros (6 digits)
      return `IM${String(currentCounter).padStart(6, '0')}`;
    });

    // Save the new incident to Firestore
    await addDoc(collection(db, 'incidents'), {
      exchangeName: data.exchangeName,
      nodes: data.nodes,
      stakeholders: data.stakeholders,
      faultType: data.faultType,
      equipmentType: data.equipmentType,
      domain: data.domain,
      ticketGenerator: data.ticketGenerator,
      isMultipleFault: data.isMultipleFault || false,
      incidentNumber: nextIncidentNumber,
      status: 'In Progress',
      timestamp: new Date(),
      outageNodes: data.outageNodes || {
        nodeA: false,
        nodeB: false,
        nodeC: false,
        nodeD: false
      }
    });

    // Add to recent submissions
    recentSubmissions.set(submissionKey, { 
      timestamp: Date.now(),
      incidentNumber: nextIncidentNumber
    });
    
    // Set timeout to remove from cache
    setTimeout(() => recentSubmissions.delete(submissionKey), SUBMISSION_TIMEOUT);

    return nextIncidentNumber;
  } catch (error) {
    console.error('Error creating incident:', error);
    throw new Error('Failed to create incident');
  }
}

/**
 * Create multiple GPON incidents with duplicate prevention
 */
export async function createGPONIncidents(data: GPONIncidentData): Promise<string[]> {
  // Generate a key for this submission
  const submissionKey = JSON.stringify({
    exchangeName: data.exchangeName,
    stakeholders: data.stakeholders,
    ticketGenerator: data.ticketGenerator,
    faultsCount: data.faults.length,
    timestamp: Math.floor(Date.now() / 10000) // Round to nearest 10 seconds
  });

  // Check if this is a duplicate submission
  if (recentSubmissions.has(submissionKey)) {
    console.log('Client-side duplicate prevention activated');
    return recentSubmissions.get(submissionKey)!.incidentNumber.split(',');
  }

  try {
    const incidentNumbers: string[] = [];
    const timestamp = new Date();

    // Create an incident for each fault
    for (const fault of data.faults) {
      // Get the next incident number using a transaction
      const nextIncidentNumber = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', 'gponIncidents');
        const counterDoc = await transaction.get(counterRef);
        
        let currentCounter = 1;
        if (counterDoc.exists()) {
          currentCounter = counterDoc.data().currentValue + 1;
        }
        
        // Update the counter
        transaction.set(counterRef, { currentValue: currentCounter }, { merge: true });
        
        // Format the incident number with leading zeros (6 digits)
        return `GIM${String(currentCounter).padStart(6, '0')}`;
      });

      // Add the incident to Firestore in the gponIncidents collection
      await addDoc(collection(db, 'gponIncidents'), {
        incidentNumber: nextIncidentNumber,
        exchangeName: data.exchangeName,
        stakeholders: data.stakeholders,
        ticketGenerator: data.ticketGenerator,
        fdh: fault.fdh,
        fats: fault.fats,
        oltIp: fault.oltIp,
        fsps: fault.fsps,
        isOutage: fault.isOutage,
        remarks: fault.remarks || '',
        timestamp,
        status: 'In Progress'
      });

      incidentNumbers.push(nextIncidentNumber);
    }

    // Add to recent submissions
    recentSubmissions.set(submissionKey, { 
      timestamp: Date.now(),
      incidentNumber: incidentNumbers.join(',')
    });
    
    // Set timeout to remove from cache
    setTimeout(() => recentSubmissions.delete(submissionKey), SUBMISSION_TIMEOUT);

    return incidentNumbers;
  } catch (error) {
    console.error('Error creating GPON incidents:', error);
    throw new Error('Failed to create GPON incidents');
  }
}

export async function updateIncidentLocation(
  incidentId: string,
  location: Location,
  isGpon: boolean = false
): Promise<void> {
  const collectionName = isGpon ? 'gpon_incidents' : 'incidents';
  const incidentRef = doc(db, collectionName, incidentId);
  
  await updateDoc(incidentRef, {
    location: {
      ...location,
      updatedAt: new Date().getTime()
    }
  });
} 
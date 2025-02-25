import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, Timestamp, doc, getDoc, updateDoc, runTransaction, query, where, getDocs } from 'firebase/firestore';
import crypto from 'crypto';

// Keep track of recent submissions to prevent duplicates
const recentSubmissions = new Map<string, { timestamp: number, incidentNumbers: string[] }>();
const SUBMISSION_TIMEOUT = 30000; // 30 seconds (increased from 5 seconds)
const DUPLICATE_CHECK_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds

// Define types for our data structures
interface GPONFault {
  fdh: string;
  oltIp: string;
  isOutage: boolean;
  fats: Array<{ id: string; value: string }>;
  fsps: Array<{ id: string; value: string }>;
  remarks?: string;
}

interface GPONIncident {
  incidentNumber: string;
  exchangeName: string;
  stakeholders: string[];
  ticketGenerator: string;
  fdh: string;
  fats: Array<{ id: string; value: string }>;
  oltIp: string;
  fsps: Array<{ id: string; value: string }>;
  isOutage: boolean;
  remarks: string;
  timestamp: Timestamp;
  submissionHash?: string;
  status: string;
}

// Helper function to generate a hash for the submission data
function generateSubmissionHash(data: any): string {
  const { exchangeName, stakeholders, ticketGenerator, faults } = data;
  const stringToHash = JSON.stringify({
    exchangeName,
    stakeholders,
    ticketGenerator,
    faults: faults.map((fault: any) => ({
      fdh: fault.fdh,
      oltIp: fault.oltIp,
      isOutage: fault.isOutage
    }))
  });
  return crypto.createHash('md5').update(stringToHash).digest('hex');
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { exchangeName, stakeholders, ticketGenerator, faults } = data;

    // Validate required fields
    if (!exchangeName || !stakeholders || !ticketGenerator || !faults || faults.length === 0) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a unique hash for this submission
    const submissionHash = generateSubmissionHash(data);

    // Check in-memory cache for recent submissions
    if (recentSubmissions.has(submissionHash)) {
      console.log('Duplicate submission prevented (in-memory cache)');
      return NextResponse.json({ 
        message: 'Duplicate submission prevented', 
        incidentNumbers: recentSubmissions.get(submissionHash)?.incidentNumbers || [] 
      }, { status: 409 });
    }

    // Check Firestore for recent submissions (within the last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - DUPLICATE_CHECK_WINDOW);
    const gponIncidentsRef = collection(db, 'gponIncidents');
    const q = query(
      gponIncidentsRef,
      where('exchangeName', '==', exchangeName),
      where('timestamp', '>=', Timestamp.fromDate(fiveMinutesAgo))
    );
    
    const querySnapshot = await getDocs(q);
    
    // Group incidents by submission batch (using submissionHash)
    const recentBatches = new Map<string, GPONIncident[]>();
    querySnapshot.docs.forEach(doc => {
      const incident = doc.data() as GPONIncident;
      if (incident.submissionHash) {
        if (!recentBatches.has(incident.submissionHash)) {
          recentBatches.set(incident.submissionHash, []);
        }
        recentBatches.get(incident.submissionHash)?.push(incident);
      }
    });
    
    // Check each batch to see if it matches our current submission
    for (const [hash, incidents] of Array.from(recentBatches.entries())) {
      // If the number of incidents matches and they have the same key properties
      if (incidents.length === faults.length) {
        // Check if stakeholders and ticketGenerator match
        const sameStakeholders = JSON.stringify(incidents[0].stakeholders.sort()) === JSON.stringify(stakeholders.sort());
        const sameTicketGenerator = incidents[0].ticketGenerator === ticketGenerator;
        
        if (sameStakeholders && sameTicketGenerator) {
          // Check if all faults match (simplified check)
          const incidentNumbers = incidents.map(incident => incident.incidentNumber);
          console.log('Duplicate submission prevented (Firestore check)');
          return NextResponse.json({ 
            message: 'Duplicate submission prevented', 
            incidentNumbers 
          }, { status: 409 });
        }
      }
    }

    const incidentNumbers: string[] = [];
    const timestamp = Timestamp.now();

    // Create an incident for each fault using a transaction
    for (const fault of faults) {
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
        const incidentNumber = `GIM${String(currentCounter).padStart(6, '0')}`;

        // Create the incident document
        const incidentRef = doc(collection(db, 'gponIncidents'));
        transaction.set(incidentRef, {
          incidentNumber,
          exchangeName,
          stakeholders,
          ticketGenerator,
          fdh: fault.fdh,
          fats: fault.fats,
          oltIp: fault.oltIp,
          fsps: fault.fsps,
          isOutage: fault.isOutage,
          remarks: fault.remarks || '',
          timestamp,
          submissionHash, // Add the submission hash to track related incidents
          status: 'In Progress'
        });

        return incidentNumber;
      });

      incidentNumbers.push(nextIncidentNumber);
    }

    // Add to recent submissions cache with the incident numbers
    recentSubmissions.set(submissionHash, { 
      timestamp: Date.now(),
      incidentNumbers
    });
    
    // Set timeout to remove from cache
    setTimeout(() => recentSubmissions.delete(submissionHash), SUBMISSION_TIMEOUT);

    return NextResponse.json({
      message: 'GPON incidents created successfully',
      incidentNumbers
    });
  } catch (error) {
    console.error('Error creating GPON incidents:', error);
    return NextResponse.json(
      { message: 'Error creating GPON incidents' },
      { status: 500 }
    );
  }
} 
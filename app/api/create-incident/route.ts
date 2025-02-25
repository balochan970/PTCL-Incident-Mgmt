// app/api/create-incident/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseConfig';
import { collection, doc, getDoc, updateDoc, addDoc, runTransaction, query, where, getDocs, Timestamp } from 'firebase/firestore';
import crypto from 'crypto';

// Keep track of recent submissions to prevent duplicates
const recentSubmissions = new Map();
const SUBMISSION_TIMEOUT = 30000; // 30 seconds (increased from 5 seconds)
const DUPLICATE_CHECK_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds

// Helper function to generate a hash for the submission data
function generateSubmissionHash(data: any): string {
  const { exchangeName, nodes, stakeholders, faultType, equipmentType, domain } = data;
  const stringToHash = JSON.stringify({
    exchangeName,
    nodes,
    stakeholders,
    faultType,
    equipmentType,
    domain
  });
  return crypto.createHash('md5').update(stringToHash).digest('hex');
}

export async function POST(req: NextRequest) {  
  try {
    const data = await req.json();
    const { 
      exchangeName, 
      nodes, 
      stakeholders, 
      faultType,
      equipmentType,
      domain,
      ticketGenerator,
      isMultipleFault,
      outageNodes 
    } = data;

    // Ensure all required fields are provided
    if (!exchangeName || !nodes || !stakeholders || !faultType) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Generate a unique hash for this submission
    const submissionHash = generateSubmissionHash(data);

    // Check in-memory cache for recent submissions
    if (recentSubmissions.has(submissionHash)) {
      console.log('Duplicate submission prevented (in-memory cache)');
      return NextResponse.json({ 
        message: 'Duplicate submission prevented', 
        incidentNumber: recentSubmissions.get(submissionHash).incidentNumber 
      }, { status: 409 });
    }

    // Check Firestore for recent submissions (within the last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - DUPLICATE_CHECK_WINDOW);
    const incidentsRef = collection(db, 'incidents');
    const q = query(
      incidentsRef,
      where('exchangeName', '==', exchangeName),
      where('faultType', '==', faultType),
      where('timestamp', '>=', fiveMinutesAgo)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Check if any of the recent incidents match our submission
    for (const doc of querySnapshot.docs) {
      const incident = doc.data();
      
      // Compare key fields to determine if it's a duplicate
      const sameNodes = JSON.stringify(incident.nodes) === JSON.stringify(nodes);
      const sameStakeholders = JSON.stringify(incident.stakeholders.sort()) === JSON.stringify(stakeholders.sort());
      
      if (sameNodes && sameStakeholders) {
        console.log('Duplicate submission prevented (Firestore check)');
        return NextResponse.json({ 
          message: 'Duplicate submission prevented', 
          incidentNumber: incident.incidentNumber 
        }, { status: 409 });
      }
    }

    // Use a transaction to ensure atomic counter update and incident creation
    const newIncidentNumber = await runTransaction(db, async (transaction) => {
      const counterDocRef = doc(db, 'incidentCounters', 'counter');
      const counterDocSnap = await transaction.get(counterDocRef);

      if (!counterDocSnap.exists()) {
        throw new Error('Counter document does not exist.');
      }

      const lastIncidentNumber = counterDocSnap.data().lastIncidentNumber;
      const nextNumber = lastIncidentNumber + 1;
      const newIncidentNumber = `IM${String(nextNumber).padStart(6, '0')}`;

      // Update the counter
      transaction.update(counterDocRef, {
        lastIncidentNumber: nextNumber,
      });

      // Create the new incident
      const incidentRef = doc(collection(db, 'incidents'));
      transaction.set(incidentRef, {
        exchangeName,
        nodes,
        stakeholders,
        faultType,
        equipmentType,
        domain,
        ticketGenerator,
        isMultipleFault: isMultipleFault || false,
        incidentNumber: newIncidentNumber,
        status: 'In Progress',
        timestamp: new Date(),
        submissionHash,
        outageNodes: outageNodes || {
          nodeA: false,
          nodeB: false,
          nodeC: false,
          nodeD: false
        }
      });

      return newIncidentNumber;
    });

    // Add to recent submissions cache with the incident number
    recentSubmissions.set(submissionHash, { 
      timestamp: Date.now(),
      incidentNumber: newIncidentNumber
    });
    
    // Set timeout to remove from cache
    setTimeout(() => recentSubmissions.delete(submissionHash), SUBMISSION_TIMEOUT);

    return NextResponse.json({
      message: 'Incident Created',
      incidentNumber: newIncidentNumber,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error during form submission:", error.message);
      return NextResponse.json({ message: "Error saving to Firestore", error: error.message }, { status: 500 });
    } else {
      console.error("Unknown error during form submission:", error);
      return NextResponse.json({ message: "An unknown error occurred" }, { status: 500 });
    }
  }
}

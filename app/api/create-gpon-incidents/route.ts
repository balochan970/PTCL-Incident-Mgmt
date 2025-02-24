import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, Timestamp, doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';

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

    const incidentNumbers: string[] = [];
    const timestamp = Timestamp.now();

    // Create an incident for each fault
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
        return `GIM${String(currentCounter).padStart(6, '0')}`;
      });

      // Add the incident to Firestore in the gponIncidents collection
      await addDoc(collection(db, 'gponIncidents'), {
        incidentNumber: nextIncidentNumber,
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
        status: 'In Progress'
      });

      incidentNumbers.push(nextIncidentNumber);
    }

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
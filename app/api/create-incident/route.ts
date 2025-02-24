// app/api/create-incident/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseConfig';
import { collection, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {  
  try {
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
    } = await req.json();

    // Log the data being saved for debugging purposes
    console.log({
      exchangeName,
      nodes,
      stakeholders,
      faultType,
      equipmentType,
      domain,
      ticketGenerator,
      isMultipleFault,
      outageNodes,
    });

    // Ensure all required fields are provided
    if (!exchangeName || !nodes || !stakeholders || !faultType) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Get the current counter document
    const counterDocRef = doc(db, 'incidentCounters', 'counter');
    const counterDocSnap = await getDoc(counterDocRef);

    let newIncidentNumber;
    if (counterDocSnap.exists()) {
      const lastIncidentNumber = counterDocSnap.data().lastIncidentNumber;
      
      // Increment the incident number
      const nextNumber = lastIncidentNumber + 1;
      newIncidentNumber = `IM${String(nextNumber).padStart(6, '0')}`; // Format to IM000001, etc.

      // Update the counter in Firestore
      await updateDoc(counterDocRef, {
        lastIncidentNumber: nextNumber,
      });
    } else {
      throw new Error('Counter document does not exist.');
    }

    // Save the new incident to Firestore
    await addDoc(collection(db, 'incidents'), {
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
      outageNodes: outageNodes || {
        nodeA: false,
        nodeB: false,
        nodeC: false,
        nodeD: false
      }
    });

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

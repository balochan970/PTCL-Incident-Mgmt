// @ts-nocheck
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, DocumentData, QueryDocumentSnapshot } = require('firebase/firestore');
const { hashPassword } = require('../lib/utils/password');
import type { QueryDocumentSnapshot as FirestoreQueryDocumentSnapshot } from '@firebase/firestore-types';

const firebaseConfig = {
  apiKey: "AIzaSyAoyZAdKkt9w3t3yLGd4Z_rLGedoqqnbJY",
  authDomain: "ptcl-incident-mgmt.firebaseapp.com",
  projectId: "ptcl-incident-mgmt",
  storageBucket: "ptcl-incident-mgmt.appspot.com",
  messagingSenderId: "983290159872",
  appId: "ptcl-incident-mgmt",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeAuthCredentials() {
  try {
    console.log('Starting auth credentials initialization...');

    // First, clear any existing auth users to avoid duplicates
    const authUsersRef = collection(db, 'auth_users');
    const existingUsers = await getDocs(authUsersRef);
    
    // Delete existing users
    const deletePromises = existingUsers.docs.map((doc: FirestoreQueryDocumentSnapshot) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`Cleared ${existingUsers.size} existing auth users`);

    // Create new users with hashed passwords
    const users = [
      {
        username: 'switch.access',
        password: 'swnmskhi@1234',
        role: 'switch_access'
      },
      {
        username: 'txm.transport',
        password: 'txmnmskhi@1234',
        role: 'transport'
      }
    ];

    // Add users with hashed passwords
    for (const user of users) {
      console.log(`Processing user: ${user.username}`);
      const hashedPassword = await hashPassword(user.password);
      console.log('Password hashed successfully');

      const docRef = await addDoc(authUsersRef, {
        username: user.username,
        password: hashedPassword,
        role: user.role,
        createdAt: new Date()
      });
      console.log(`Created user: ${user.username} with ID: ${docRef.id}`);

      // Verify the user was created
      const verifyQuery = query(authUsersRef, where('username', '==', user.username));
      const verifySnapshot = await getDocs(verifyQuery);
      if (!verifySnapshot.empty) {
        console.log(`Verified user ${user.username} exists in database`);
      } else {
        console.error(`Failed to verify user ${user.username} in database`);
      }
    }

    // Final verification
    const finalUsers = await getDocs(authUsersRef);
    console.log(`Total users in database: ${finalUsers.size}`);
    finalUsers.forEach((doc) => {
      const data = doc.data();
      console.log(`Found user: ${data.username}, role: ${data.role}`);
    });

    console.log('Authentication credentials initialized successfully!');
  } catch (error) {
    console.error('Error initializing auth credentials:', error);
    throw error; // Re-throw to see the full error stack
  }
}

// Run the initialization
initializeAuthCredentials().catch(error => {
  console.error('Failed to initialize auth credentials:', error);
  process.exit(1);
}); 
import { initializeApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAoyZAdKkt9w3t3yLGd4Z_rLGedoqqnbJY",
  authDomain: "ptcl-incident-mgmt.firebaseapp.com",
  projectId: "ptcl-incident-mgmt",
  storageBucket: "ptcl-incident-mgmt.appspot.com",
  messagingSenderId: "983290159872",
  appId: "ptcl-incident-mgmt"
};

let db: Firestore;

// Initialize Firebase with error handling
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error("Error initializing Firebase:", error);
  throw error;
}

export { db };

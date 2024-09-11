import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAoyZAdKkt9w3t3yLGd4Z_rLGedoqqnbJY",  // Add your actual API key here
  authDomain: "ptcl-incident-mgmt.firebaseapp.com",
  projectId: "ptcl-incident-mgmt",
  storageBucket: "ptcl-incident-mgmt.appspot.com",
  messagingSenderId: "983290159872",
  appId: "ptcl-incident-mgmt",  // Replace with your actual app ID from Firebase project settings
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

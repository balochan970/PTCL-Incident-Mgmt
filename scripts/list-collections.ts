import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

// Load environment variables from .env.local
const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('No .env.local file found, falling back to .env');
  dotenv.config();
}

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

async function listFirebaseCollections() {
  console.log(`Listing collections in Firebase project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  
  try {
    // This part won't work with the client SDK. Admin SDK would be required.
    // Just listing common collection names to manually check
    const commonCollections = [
      'documentation',
      'troubleshooting_guides',
      'troubleshooting',
      'troubleshootingGuides',
      'best_practices',
      'bestPractices',
      'knowledgebase',
      // Add other potential collection names
    ];
    
    console.log('Common collection names to check:');
    commonCollections.forEach(name => console.log(`- ${name}`));
    
    console.log('\nNOTE: To list all collections, you would need to use the Firebase Admin SDK, which requires service account credentials.');
  } catch (error) {
    console.error('Error listing collections:', error);
  }
}

// Run the function
listFirebaseCollections().then(() => console.log('Done')); 
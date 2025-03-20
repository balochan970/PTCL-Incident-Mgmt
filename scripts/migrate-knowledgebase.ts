import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, DocumentData, Timestamp } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
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

// Log configuration (without sensitive info)
console.log('Environment loaded:');
console.log(`- Firebase projectId: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
console.log(`- Supabase URL defined: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`);
console.log(`- Supabase KEY defined: ${!!process.env.SUPABASE_KEY}`);

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Supabase config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

// Helper to prepare values for Supabase
function prepareForSupabase(value: any): any {
  // Convert Timestamps to ISO strings
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  // Ensure arrays are properly formatted
  if (Array.isArray(value)) {
    return value.map(item => typeof item === 'object' ? prepareForSupabase(item) : item);
  }
  // Process nested objects
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = prepareForSupabase(val);
    }
    return result;
  }
  return value;
}

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

// Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Main migration function
async function migrateKnowledgebaseData(): Promise<void> {
  console.log('Starting migration of Knowledgebase data from Firebase to Supabase...');
  
  try {
    // Migrate Documentation
    await migrateDocumentation();
    
    // Migrate Troubleshooting Guides
    await migrateTroubleshootingGuides();
    
    // Migrate Best Practices
    await migrateBestPractices();
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Migrate Documentation
async function migrateDocumentation(): Promise<void> {
  console.log('Migrating Documentation...');
  
  // Get all documentation from Firebase
  const collectionPath = 'documentation';
  console.log(`Querying Firebase collection: ${collectionPath}`);
  
  const q = query(collection(firestore, collectionPath), orderBy('updatedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  console.log(`Found ${querySnapshot.size} documentation items to migrate.`);
  
  // Additional check for empty collection
  if (querySnapshot.size === 0) {
    console.log(`The '${collectionPath}' collection appears to be empty. Please ensure the collection exists and contains data.`);
  }
  
  for (const doc of querySnapshot.docs) {
    const data = doc.data();
    const id = doc.id;
    
    console.log(`Processing document: ${data.title || id}`);
    
    // Map Firebase fields to Supabase fields
    const supaDoc = {
      id,
      title: data.title,
      content: data.content,
      category: data.category,
      tags: data.tags || [],
      image_url: data.imageUrl || '',
      author: data.author,
      version: data.version || '1.0',
      attachments: data.attachments || [],
      parent_id: data.parentId || null,
      is_version_history: data.isVersionHistory || false,
      created_at: prepareForSupabase(data.createdAt),
      updated_at: prepareForSupabase(data.updatedAt)
    };
    
    // Insert into Supabase
    const { error } = await supabase
      .from('documentation')
      .upsert(supaDoc, { onConflict: 'id' });
    
    if (error) {
      console.error(`Error migrating documentation ${id}:`, error);
    } else {
      console.log(`Migrated documentation: ${data.title}`);
    }
  }
  
  console.log('Documentation migration completed.');
}

// Migrate Troubleshooting Guides
async function migrateTroubleshootingGuides(): Promise<void> {
  console.log('Migrating Troubleshooting Guides...');
  
  // Try both common collection names
  const collectionPaths = ['troubleshooting_guides', 'troubleshooting', 'troubleshootingGuides'];
  let migrated = false;
  
  for (const collectionPath of collectionPaths) {
    console.log(`Trying Firebase collection: ${collectionPath}`);
    
    const q = query(collection(firestore, collectionPath), orderBy('updatedAt', 'desc'));
    let querySnapshot;
    
    try {
      querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} items in ${collectionPath}`);
      
      if (querySnapshot.size > 0) {
        migrated = true;
        
        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          const id = doc.id;
          
          console.log(`Processing guide: ${data.title || id}`);
          
          // Map Firebase fields to Supabase fields
          const supaGuide = {
            id,
            title: data.title,
            problem: data.problem,
            symptoms: data.symptoms || [],
            equipment_type: data.equipmentType,
            fault_type: data.faultType,
            solutions: data.solutions || [],
            author: data.author,
            rating: data.rating || 0,
            rating_count: data.ratingCount || 0,
            created_at: prepareForSupabase(data.createdAt),
            updated_at: prepareForSupabase(data.updatedAt)
          };
          
          // Insert into Supabase
          const { error } = await supabase
            .from('troubleshooting_guides')
            .upsert(supaGuide, { onConflict: 'id' });
          
          if (error) {
            console.error(`Error migrating troubleshooting guide ${id}:`, error);
          } else {
            console.log(`Migrated troubleshooting guide: ${data.title}`);
          }
        }
      }
    } catch (error) {
      console.log(`Error accessing collection ${collectionPath}:`, error);
    }
  }
  
  if (!migrated) {
    console.log('No troubleshooting guides found in any of the expected collections.');
  }
  
  console.log('Troubleshooting Guides migration completed.');
}

// Migrate Best Practices
async function migrateBestPractices(): Promise<void> {
  console.log('Migrating Best Practices...');
  
  // Try both common collection names
  const collectionPaths = ['best_practices', 'bestPractices'];
  let migrated = false;
  
  for (const collectionPath of collectionPaths) {
    console.log(`Trying Firebase collection: ${collectionPath}`);
    
    const q = query(collection(firestore, collectionPath), orderBy('updatedAt', 'desc'));
    let querySnapshot;
    
    try {
      querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} items in ${collectionPath}`);
      
      if (querySnapshot.size > 0) {
        migrated = true;
        
        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          const id = doc.id;
          
          console.log(`Processing best practice: ${data.title || id}`);
          
          // Map Firebase fields to Supabase fields
          const supaPractice = {
            id,
            title: data.title,
            category: data.category,
            description: data.content || '', // Map content to description
            recommendations: data.examples || [], // Map examples to recommendations
            benefits_and_outcomes: [], // Default empty array for benefitsAndOutcomes
            author: data.author,
            likes: 0, // Initialize likes at 0
            dislikes: 0, // Initialize dislikes at 0
            created_at: prepareForSupabase(data.createdAt),
            updated_at: prepareForSupabase(data.updatedAt)
          };
          
          // Insert into Supabase
          const { error } = await supabase
            .from('best_practices')
            .upsert(supaPractice, { onConflict: 'id' });
          
          if (error) {
            console.error(`Error migrating best practice ${id}:`, error);
          } else {
            console.log(`Migrated best practice: ${data.title}`);
          }
        }
      }
    } catch (error) {
      console.log(`Error accessing collection ${collectionPath}:`, error);
    }
  }
  
  if (!migrated) {
    console.log('No best practices found in any of the expected collections.');
  }
  
  console.log('Best Practices migration completed.');
}

// Run the migration
migrateKnowledgebaseData().catch(console.error); 
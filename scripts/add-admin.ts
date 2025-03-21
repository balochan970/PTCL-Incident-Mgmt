import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, DocumentReference, Timestamp } from 'firebase/firestore';
import * as bcryptjs from 'bcryptjs';

interface AdminUser {
  username: string;
  password: string;
  role: string;
  createdAt: Timestamp;
}

const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
};

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

async function addAdminUser(): Promise<void> {
  try {
    console.log('Starting admin user creation...');

    const authUsersRef = collection(db, 'auth_users');
    
    // Check if admin already exists
    const adminQuery = query(authUsersRef, where('username', '==', 'administrator'));
    const existingAdmin = await getDocs(adminQuery);
    
    if (!existingAdmin.empty) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user with hashed password
    const hashedPassword = await hashPassword('adminofnmsktr2@1234');
    
    const adminUser: AdminUser = {
      username: 'administrator',
      password: hashedPassword,
      role: 'admin',
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(authUsersRef, adminUser);

    console.log(`Created admin user with ID: ${docRef.id}`);

    // Verify the user was created
    const verifyQuery = query(authUsersRef, where('username', '==', 'administrator'));
    const verifySnapshot = await getDocs(verifyQuery);
    
    if (!verifySnapshot.empty) {
      console.log('Verified admin user exists in database');
    } else {
      console.error('Failed to verify admin user in database');
    }

  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

// Run the script
addAdminUser()
  .then(() => {
    console.log('Admin user creation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  }); 
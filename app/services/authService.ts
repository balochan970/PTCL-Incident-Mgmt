import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { comparePassword } from '@/lib/utils/password';

export interface User {
  username: string;
  role: string;
  isAdmin: boolean;
  isAuthenticated: boolean;
  timestamp: number;
}

export const authenticateUser = async (username: string, userPassword: string): Promise<User> => {
  try {
    const trimmedUsername = username.trim();
    const authUsersRef = collection(db, 'auth_users');
    const q = query(authUsersRef, where('username', '==', trimmedUsername));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('Invalid username or password');
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    const isValidPassword = await comparePassword(userPassword, userData.password);

    if (!isValidPassword) {
      throw new Error('Invalid username or password');
    }

    // Special check for administrator account
    const isAdmin = trimmedUsername === 'administrator';

    return {
      username: userData.username,
      role: userData.role,
      isAdmin,
      isAuthenticated: true,
      timestamp: new Date().getTime()
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

export const isUserAdmin = (authData: any): boolean => {
  try {
    return authData?.username === 'administrator';
  } catch {
    return false;
  }
};

export const verifyAuthentication = (authData: any): boolean => {
  if (!authData) return false;
  
  try {
    const now = new Date().getTime();
    const timestamp = authData.timestamp || 0;
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    return (
      authData.isAuthenticated && 
      authData.username && 
      authData.role &&
      (now - timestamp <= expiryTime)
    );
  } catch {
    return false;
  }
}; 
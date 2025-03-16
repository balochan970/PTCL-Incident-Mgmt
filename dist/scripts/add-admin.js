"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
const password_1 = require("../lib/utils/password");
const firebaseConfig = {
    apiKey: "AIzaSyAoyZAdKkt9w3t3yLGd4Z_rLGedoqqnbJY",
    authDomain: "ptcl-incident-mgmt.firebaseapp.com",
    projectId: "ptcl-incident-mgmt",
    storageBucket: "ptcl-incident-mgmt.appspot.com",
    messagingSenderId: "983290159872",
    appId: "ptcl-incident-mgmt",
};
const app = (0, app_1.initializeApp)(firebaseConfig);
const db = (0, firestore_1.getFirestore)(app);
async function addAdminUser() {
    try {
        console.log('Starting admin user creation...');
        const authUsersRef = (0, firestore_1.collection)(db, 'auth_users');
        // Check if admin already exists
        const adminQuery = (0, firestore_1.query)(authUsersRef, (0, firestore_1.where)('username', '==', 'administrator'));
        const existingAdmin = await (0, firestore_1.getDocs)(adminQuery);
        if (!existingAdmin.empty) {
            console.log('Admin user already exists');
            return;
        }
        // Create admin user with hashed password
        const hashedPassword = await (0, password_1.hashPassword)('adminofnmsktr2@1234');
        const docRef = await (0, firestore_1.addDoc)(authUsersRef, {
            username: 'administrator',
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date()
        });
        console.log(`Created admin user with ID: ${docRef.id}`);
        // Verify the user was created
        const verifyQuery = (0, firestore_1.query)(authUsersRef, (0, firestore_1.where)('username', '==', 'administrator'));
        const verifySnapshot = await (0, firestore_1.getDocs)(verifyQuery);
        if (!verifySnapshot.empty) {
            console.log('Verified admin user exists in database');
        }
        else {
            console.error('Failed to verify admin user in database');
        }
    }
    catch (error) {
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

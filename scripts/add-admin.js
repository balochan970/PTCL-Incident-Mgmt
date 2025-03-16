var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var initializeApp = require('firebase/app').initializeApp;
var _a = require('firebase/firestore'), getFirestore = _a.getFirestore, collection = _a.collection, addDoc = _a.addDoc, query = _a.query, where = _a.where, getDocs = _a.getDocs;
var hashPassword = require('../lib/utils/password').hashPassword;
var firebaseConfig = {
    apiKey: "AIzaSyAoyZAdKkt9w3t3yLGd4Z_rLGedoqqnbJY",
    authDomain: "ptcl-incident-mgmt.firebaseapp.com",
    projectId: "ptcl-incident-mgmt",
    storageBucket: "ptcl-incident-mgmt.appspot.com",
    messagingSenderId: "983290159872",
    appId: "ptcl-incident-mgmt",
};
var app = initializeApp(firebaseConfig);
var db = getFirestore(app);
function addAdminUser() {
    return __awaiter(this, void 0, void 0, function () {
        var authUsersRef, adminQuery, existingAdmin, hashedPassword, docRef, verifyQuery, verifySnapshot, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    console.log('Starting admin user creation...');
                    authUsersRef = collection(db, 'auth_users');
                    adminQuery = query(authUsersRef, where('username', '==', 'administrator'));
                    return [4 /*yield*/, getDocs(adminQuery)];
                case 1:
                    existingAdmin = _a.sent();
                    if (!existingAdmin.empty) {
                        console.log('Admin user already exists');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, hashPassword('adminofnmsktr2@1234')];
                case 2:
                    hashedPassword = _a.sent();
                    return [4 /*yield*/, addDoc(authUsersRef, {
                            username: 'administrator',
                            password: hashedPassword,
                            role: 'admin',
                            createdAt: new Date()
                        })];
                case 3:
                    docRef = _a.sent();
                    console.log("Created admin user with ID: ".concat(docRef.id));
                    verifyQuery = query(authUsersRef, where('username', '==', 'administrator'));
                    return [4 /*yield*/, getDocs(verifyQuery)];
                case 4:
                    verifySnapshot = _a.sent();
                    if (!verifySnapshot.empty) {
                        console.log('Verified admin user exists in database');
                    }
                    else {
                        console.error('Failed to verify admin user in database');
                    }
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error('Error creating admin user:', error_1);
                    throw error_1;
                case 6: return [2 /*return*/];
            }
        });
    });
}
// Run the script
addAdminUser()
    .then(function () {
    console.log('Admin user creation completed');
    process.exit(0);
})
    .catch(function (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
});

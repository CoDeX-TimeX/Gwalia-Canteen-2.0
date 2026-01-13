// ============================================
// Firebase Configuration
// ============================================
// IMPORTANT: In production, use environment variables!

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDGNfaSsDoVEn9e_EEA36J7FbtDG9Zpcww",
    authDomain: "gwalia-canteen-db.firebaseapp.com",
    projectId: "gwalia-canteen-db",
    storageBucket: "gwalia-canteen-db.firebasestorage.app",
    messagingSenderId: "609249581676",
    appId: "1:609249581676:web:9495fd520ba2681ac4d649"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
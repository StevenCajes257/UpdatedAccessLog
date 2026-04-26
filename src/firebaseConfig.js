// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from '@firebase/app-check';

// Firebase configuration - using hardcoded values that work
const firebaseConfig = {
  apiKey: "AIzaSyBDDiDI424BDQD3ALg3ZVYTiroPvBpS0Kg",
  authDomain: "esp32-access-log-8c91d.firebaseapp.com",
  projectId: "esp32-access-log-8c91d",
  storageBucket: "esp32-access-log-8c91d.firebasestorage.app",
  messagingSenderId: "738380253487",
  appId: "1:123456789012:web:abcdef123456",
  databaseURL: "https://esp32-access-log-8c91d-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check - only in production to avoid development errors
// The reCAPTCHA site key is hardcoded since it works
const RECAPTCHA_SITE_KEY = "6LeYMrMsAAAAADQqAwR04Qr4jSG4qcZ_JCRJFyv3";

// Only initialize App Check in production (build) or if explicitly enabled
// This prevents the "Missing required parameters: sitekey" error in development
// App Check disabled for local testing (the instructor will test on localhost)

// if (import.meta.env.PROD) {
//   initializeAppCheck(app, {
//     provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
//     isTokenAutoRefreshEnabled: true
//   });
// }

// For local development debugging (shows debug tokens in console)
// Uncomment the line below if you want to test App Check in development
// if (import.meta.env.DEV) {
//   self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
// }

const database = getDatabase(app);
const auth = getAuth(app);

export { app, database, auth, firebaseConfig };
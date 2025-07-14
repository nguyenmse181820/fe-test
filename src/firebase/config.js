// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCticw9e7neL4ZaQSDQrI99av-THO2L0EU",
  authDomain: "vestige-461305.firebaseapp.com",
  projectId: "vestige-461305",
  storageBucket: "vestige-461305.firebasestorage.app",
  messagingSenderId: "724636018273",
  appId: "1:724636018273:web:beeacd2df118275d30ac20",
  measurementId: "G-0G4JBDDMSF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const storage = getStorage(app);

export { storage, analytics };
export default app;

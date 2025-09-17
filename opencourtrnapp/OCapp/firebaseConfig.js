import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCPNNbrsM-QzwpjLeZv1HInHkDD6CC1PDU",
  authDomain: "opencourt-e25b2.firebaseapp.com",
  projectId: "opencourt-e25b2",
  storageBucket: "opencourt-e25b2.firebasestorage.app",
  messagingSenderId: "612797510883",
  appId: "1:612797510883:web:bbc7d22d3214fa461241d6",
  measurementId: "G-B88X5WET2K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

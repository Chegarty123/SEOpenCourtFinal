// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 👇 React Native auth imports
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPNNbrsM-QzwpjLeZv1HInHkDD6CC1PDU",
  authDomain: "opencourt-e25b2.firebaseapp.com",
  projectId: "opencourt-e25b2",
  storageBucket: "opencourt-e25b2.firebasestorage.app",
  messagingSenderId: "612797510883",
  appId: "1:612797510883:web:bbc7d22d3214fa461241d6",
  measurementId: "G-B88X5WET2K",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 🔐 Auth with persistent storage in React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);

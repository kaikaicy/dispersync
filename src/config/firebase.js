// src/config/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyCFBZmXKVqh3MzgE44oVO_E-zLY3XrAQEk",
  authDomain: "dispersync-3f4fd.firebaseapp.com",
  projectId: "dispersync-3f4fd",
  storageBucket: "dispersync-3f4fd.firebasestorage.app",
  messagingSenderId: "554326849790",
  appId: "1:554326849790:web:b2ae78c7a1d3559b21cdaf",
  measurementId: "G-VBMEDLFE1E"
};

const app =initializeApp(firebaseConfig);
// IMPORTANT: initializeAuth must happen before any getAuth() is called.
// Cache on globalThis to survive Fast Refresh without re-initializing.


const auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
const db = getFirestore(app);

export { app, auth, db };

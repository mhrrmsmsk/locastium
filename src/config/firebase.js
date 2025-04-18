// src/config/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBiwUcWY_RraComT9_Nqp7HSxnaLINbOkw",
  authDomain: "astem-location-app.firebaseapp.com",
  databaseURL: "", // (Firebase Realtime Database kullanmıyorsan boş bırak)
  projectId: "astem-location-app",
  storageBucket: "astem-location-app.appspot.com",
  messagingSenderId: "206078340385",
  appId: "1:206078340385:android:966318c5e26d8c464be260"
};

// ✅ Firebase App init
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ React Native özel auth init
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // Eğer zaten başlatılmışsa tekrar alma
  if (e.code === "auth/already-initialized") {
    auth = getAuth(app);
  } else {
    throw e;
  }
}

const db = getFirestore(app);

export { auth, db };
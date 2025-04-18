import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await AsyncStorage.setItem("@user", JSON.stringify(firebaseUser));

        // Firestore'dan user bilgilerini çek
        try {
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData({ ...docSnap.data(), uid: firebaseUser.uid });
          } else {
            console.warn("Firestore'da kullanıcı dokümanı bulunamadı.");
            setUserData(null);
          }
        } catch (error) {
          console.error("Kullanıcı verileri alınırken hata:", error);
          setUserData(null); // önemli!
        }
      } else {
        setUser(null);
        setUserData(null);
        await AsyncStorage.removeItem("@user");
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
  
      console.log("✅ Giriş yapılan UID:", firebaseUser.uid);
  
      const docRef = doc(db, "users", firebaseUser.uid);
      const docSnap = await getDoc(docRef);
  
      if (!docSnap.exists()) {
        throw new Error("Firestore'da kullanıcı verisi bulunamadı.");
      }
  
      const fullUserData = {
        ...docSnap.data(),
        uid: firebaseUser.uid,
      };
  
      setUser(firebaseUser);
      setUserData(fullUserData);
      await AsyncStorage.setItem("@user", JSON.stringify(firebaseUser));
  
      return fullUserData;
    } catch (error) {
      console.error("🚨 Giriş sırasında hata:", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
    await AsyncStorage.removeItem("@user");
  };

  return (
    <AuthContext.Provider value={{ user, userData, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
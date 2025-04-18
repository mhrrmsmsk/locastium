// services/userService.js
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../config/firebase"; // ✅ firestore değil db
import { doc, setDoc } from "firebase/firestore";

export const createManualUser = async ({ email, password, firstName, lastName, city, vehicle }) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    await setDoc(doc(db, "users", uid), {
      firstName,
      lastName,
      email,
      city,
      vehicle,
      createdAt: new Date(),
    });

    console.log("✅ Kullanıcı başarıyla Firestore'a kaydedildi!");
  } catch (error) {
    console.error("❌ Kullanıcı oluşturulurken hata:", error.message);
    throw error; // çağıran koda fırlat
  }
};
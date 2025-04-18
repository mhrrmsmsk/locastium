import React, { useEffect, useState } from "react";
import {
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/authContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useNavigation } from "@react-navigation/native";

const CreateRoute = () => {
  const { user } = useAuth();
  const [city, setCity] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // 1️⃣ Kullanıcının şehir bilgisini Firestore'dan çek
  const fetchUserCity = async () => {
    try {
      if (!user?.uid) return;
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const userCity = docSnap.data().city?.trim();
        setCity(userCity);
        console.log("📍 Kullanıcı şehri:", userCity);
      } else {
        console.warn("⚠️ Kullanıcı verisi bulunamadı.");
      }
    } catch (err) {
      console.error("❌ Şehir bilgisi alınamadı:", err.message);
    }
  };

  // 2️⃣ İlçeleri Overpass API'den çek
  const fetchDistricts = async (cityName) => {
    setLoading(true);
    const query = `
      [out:json][timeout:25];
      area["name"="${cityName}"]["admin_level"="4"]->.a;
      relation(area.a)["admin_level"="6"]["type"="boundary"];
      out body;
    `;
    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      const data = await response.json();
      if (!data.elements || data.elements.length === 0) {
        console.warn("⚠️ Overpass veri bulunamadı.");
        setDistricts([]);
        return;
      }
      const names = data.elements.map((el) => el.tags?.name).filter(Boolean);
      const unique = [...new Set(names)].sort();
      setDistricts(unique);
    } catch (error) {
      console.error("❌ İlçeler alınamadı:", error.message);
      setDistricts([]);
    } finally {
      setLoading(false);
    }
  };

  // 3️⃣ İlk açılışta şehri al
  useEffect(() => {
    fetchUserCity();
  }, []);

  // 4️⃣ Şehir geldiğinde ilçeleri çek
  useEffect(() => {
    if (city) fetchDistricts(city);
  }, [city]);

  return (
    <SafeAreaView className="flex-1 bg-white pt-8">
      {/* Üst Sol Geri Butonu */}


      <ScrollView contentContainerStyle={{ padding: 20 }} className="flex-1">
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="absolute top-4 left-4 z-10 bg-white border border-gray-200 px-3 py-2 rounded p-3 shadow-lg"
      >
        <Text className="text-gray-800 font-bold">← Geri</Text>
      </TouchableOpacity>
        <Text className="text-2xl font-bold text-center mb-4 text-gray-800 shadow-lg">
          {city ? `${city} İlçeleri` : "İlçe Listesi"}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#1E90FF" className="my-6" />
        ) : districts.length > 0 ? (
          districts.map((district, index) => (
            <TouchableOpacity
              key={index}
              onPress={() =>
                navigation.navigate("CreateRouteNeigh", { district, city })
              }
              className="bg-blue-100 rounded-xl p-4 mb-3 shadow-md"
            >
              <Text className="text-lg font-semibold text-center text-blue-800">
                {district}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text className="text-center text-red-600">
            İlçeler bulunamadı. Lütfen şehir adını kontrol edin.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateRoute;
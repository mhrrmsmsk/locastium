// screens/RouteHistory.js
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/authContext';

const RouteHistory = () => {
  const { userData } = useAuth();
  const navigation = useNavigation();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndGroup = async () => {
      if (!userData?.uid) {
        setLoading(false);
        return;
      }
      try {
        // 1️⃣ Tüm kullanıcı rotalarını çek
        const q = query(
          collection(db, "routes"),
          where("userId", "==", userData.uid)
        );
        const snap = await getDocs(q);
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // 2️⃣ Zaman damgasına göre sırala (yeniden yeni önce)
        all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        // 3️⃣ Sadece mahalle adına göre grupla
        const byNeighborhood = all.reduce((acc, r) => {
          const key = r.neighborhood || "Bilinmeyen";
          if (!acc[key]) acc[key] = { neighborhood: key, routes: [] };
          acc[key].routes.push(r);
          return acc;
        }, {});
        // 4️⃣ Diziye çevir
        setGroups(Object.values(byNeighborhood));
      } catch (err) {
        console.error(err);
        Alert.alert("Hata", "Rotalar yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };
    fetchAndGroup();
  }, [userData]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#007bff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white pt-8">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="absolute top-4 left-4 z-10 bg-white border border-gray-200 px-3 py-2 rounded shadow-lg"
        >
          <Text className="text-gray-800 font-bold">← Geri</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-center mb-4 text-gray-800">
          {groups.length > 0 ? "Kayıtlı Mahalleler" : "Kayıtlı Rota Bulunamadı"}
        </Text>

        {groups.map(group => (
          <TouchableOpacity
            key={group.neighborhood}
            onPress={() =>
              navigation.navigate("ShowHistoryRoute", {
                routeGroup: group
              })
            }
            className="bg-blue-100 rounded-xl p-4 mb-3 shadow-md"
          >
            <Text className="text-lg font-semibold text-center text-blue-800">
              {group.neighborhood} ({group.routes.length} rota)
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default RouteHistory;
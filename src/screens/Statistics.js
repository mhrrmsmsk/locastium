// screens/Roads.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../auth/authContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

export default function Statistics() {
  const navigation = useNavigation();
  const { userData } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userData?.uid) return setLoading(false);
      try {
        const q = query(
          collection(db, "routes"),
          where("userId", "==", userData.uid)
        );
        const snap = await getDocs(q);
        const routes = snap.docs.map((doc) => doc.data());

        const totalRoutes = routes.length;
        const totalDistance = routes.reduce(
          (sum, r) => sum + (r.routeLengthKm || 0),
          0
        );
        const totalDuration = routes.reduce(
          (sum, r) => sum + (r.sessionDurationHrs || 0),
          0
        );
        const totalScore = routes.reduce(
          (sum, r) => sum + (r.driverScore || 0),
          0
        );
        const avgScore = totalRoutes > 0 ? totalScore / totalRoutes : 0;

        setStats({ totalRoutes, totalDistance, totalDuration, avgScore });
      } catch (err) {
        console.error("İstatistikler yüklenemedi:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userData]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#007bff" />
        <Text className="mt-4 text-gray-600">Yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text className="text-gray-600">İstatistik bulunamadı.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white p-4 pt-8">
      {/* Back button and title on the same row */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 bg-white border border-gray-200 px-3 py-2 rounded shadow-lg"
        >
          <Text className="text-gray-800 font-bold">←Geri</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-800 ml-4">
          Sürüş İstatistikleri
        </Text>
      </View>

      {/* Rest of your stats UI unchanged */}
      <View className="bg-gray-100 rounded-lg p-4 mb-4">
        <Text className="text-lg text-gray-700">
          Toplam Rota:{" "}
          <Text className="font-semibold text-gray-900">
            {stats.totalRoutes}
          </Text>
        </Text>
      </View>

      <View className="bg-gray-100 rounded-lg p-4 mb-4">
        <Text className="text-lg text-gray-700">
          Toplam Mesafe:{" "}
          <Text className="font-semibold text-gray-900">
            {stats.totalDistance.toFixed(2)} km
          </Text>
        </Text>
      </View>

      <View className="bg-gray-100 rounded-lg p-4 mb-4">
        <Text className="text-lg text-gray-700">
          Toplam Süre:{" "}
          <Text className="font-semibold text-gray-900">
            {stats.totalDuration.toFixed(2)} saat
          </Text>
        </Text>
      </View>

      <View className="bg-gray-100 rounded-lg p-4">
        <Text className="text-lg text-gray-700">
          Ortalama Puan:{" "}
          <Text className="font-semibold text-gray-900">
            {stats.avgScore.toFixed(1)}
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
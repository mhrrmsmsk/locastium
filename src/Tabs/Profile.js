import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Linking,
  ImageBackground,
  Image,
} from "react-native";
import { useAuth } from "../auth/authContext";

export default function Profile() {
  const { logout, userData } = useAuth();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!userData) {
      timerRef.current = setTimeout(() => {
        Alert.alert("Oturum Sonlandırıldı", "Kullanıcı bilgileri alınamadı.");
        logout();
      }, 1 * 60 * 1000);
    } else {

      clearTimeout(timerRef.current);
    }

    return () => clearTimeout(timerRef.current);
  }, [userData]);

  const handleLogout = async () => {
    await logout();
  };

  const handleSupport = () => {
    const supportNumber = "905398570144";
    const message = "Merhaba, destek almak istiyorum.";
    const url = `whatsapp://send?phone=${supportNumber}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("WhatsApp Bulunamadı", "Cihazınızda WhatsApp yüklü değil.");
      }
    });
  };

  if (!userData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-600">Kullanıcı bilgileri yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  const fields = [
    ["İsim", userData.firstName],
    ["Soyisim", userData.lastName],
    ["E-Posta", userData.email],
    ["Çalıştığı İl", userData.city],
    ["Kullandığı Araç", userData.vehicle],
  ];

  return (
    <ImageBackground
      source={require("../assets/images/background_simple.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView className="flex-1 bg-gray-50 p-4 pt-8">
        <View className="items-center mb-6">
          <Image
            source={require("../assets/images/astem-logo.png")}
            style={{
              width: 500,
              height: 250,
              resizeMode: "contain",
              marginTop: 20,
              marginBottom: 20,
            }}
          />
        </View>
        <Text className="text-2xl font-bold text-gray-800 items-center mb-6">
          Profil Bilgileri
        </Text>

        <View className="bg-white rounded-lg shadow p-4 mb-8">
          {fields.map(([label, value]) => (
            <View
              key={label}
              className="flex-row justify-between py-2 border-b last:border-b-0 border-gray-200"
            >
              <Text className="text-gray-700">{label}</Text>
              <Text className="text-gray-900 font-medium">{value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500 rounded-lg py-3 mb-4 items-center"
        >
          <Text className="text-white font-bold">Çıkış Yap</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSupport}
          className="bg-green-500 rounded-lg py-3 items-center"
        >
          <Text className="text-white font-bold">Destek</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </ImageBackground>
  );
}
import React, { useEffect, useState } from "react";
import { ScrollView, ActivityIndicator, TouchableOpacity, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

const CreateRouteNeigh = () => {
  const route = useRoute();
  // Eğer route.params tanımsızsa, boş bir nesne kullanarak destructuring'den kaynaklı hataları önleyin.
  const { district = "", city = "" } = route.params || {};

  const [neighborhoods, setNeighborhoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // Mahalleleri çekmek için Overpass API sorgusu
  const fetchNeighborhoods = async () => {
    setLoading(true);
    const query = `
      [out:json][timeout:25];
      area["name"="${district}"]["admin_level"="6"]->.a;
      relation(area.a)["admin_level"="8"]["type"="boundary"];
      out body;
    `;

    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      const data = await response.json();
      const names = data.elements
        .map((el) => el.tags?.name)
        .filter(Boolean);
      const unique = [...new Set(names)].sort();
      setNeighborhoods(unique);
    } catch (err) {
      console.error("❌ Mahalleler alınamadı:", err.message);
      setNeighborhoods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Eğer district boş ise hata mesajı verip geri dönebilirsiniz.
    if (!district) {
      console.error("District parametresi tanımlı değil!");
      return;
    }
    fetchNeighborhoods();
  }, [district]);

  return (
    <SafeAreaView className="flex-1 bg-white pt-8">
      <ScrollView contentContainerStyle={{ padding: 20 }} className="flex-1">

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="absolute top-4 left-4 z-10 bg-white border border-gray-200 px-3 py-2 rounded p-3 shadow-lg"
      >
        <Text className="text-gray-800 font-bold">← Geri</Text>
      </TouchableOpacity>

        {/* Sayfa Başlığı */}
        <Text className="text-2xl font-bold text-center mb-4 text-gray-800">
          {district ? `${district} Mahalleleri` : "Mahalle Listesi"}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#1E90FF" className="my-6" />
        ) : neighborhoods.length > 0 ? (
          neighborhoods.map((n, idx) => (
            // Key olarak mahalle ismi ile indexi birleştirin, böylece benzersiz olur.
            <TouchableOpacity
              key={`${n}-${idx}`}
              onPress={() =>
                navigation.navigate("RouteMap", { district, neighborhood: n })
              }
              className="bg-blue-100 rounded-xl p-4 mb-3 shadow-md"
            >
              <Text className="text-lg font-semibold text-center text-blue-800">
                {n}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text className="text-center text-red-600">
            Mahalle bulunamadı.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateRouteNeigh;
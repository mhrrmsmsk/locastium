import React, { useState, useEffect, useRef } from "react";
import { View, Text, Alert, ActivityIndicator, TouchableOpacity, StatusBar, SafeAreaView } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import Checkbox from "expo-checkbox";
import * as FileSystem from "expo-file-system";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../auth/authContext";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { db } from "../config/firebase";


function haversine([lat1, lon1], [lat2, lon2]) {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371e3;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1), Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

export default function RouteMap() {
  const navigation = useNavigation();
  const { userData } = useAuth();
  const [userLocation, setUserLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isMoving, setIsMoving] = useState(false);
  const [allRoutes, setAllRoutes] = useState([]);
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const previousLocation = useRef(null);
  const appStartTimeRef = useRef(Date.now());

  const { neighborhood, district } = useRoute().params;

  // Konum izleme ve snapping
  useEffect(() => {
    let isMounted = true;
    let watchId;

    const loadLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Hata", "Konum izni reddedildi!");
          return;
        }

        watchId = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 3, // 3 metre değişim
          },
          async (location) => {
            try {
              const { latitude, longitude } = location.coords;
              if (
                previousLocation.current &&
                getDistance(
                  previousLocation.current.lat,
                  previousLocation.current.lng,
                  latitude,
                  longitude
                ) < 2
              ) {
                return;
              }

              const response = await fetch(
                `https://router.project-osrm.org/nearest/v1/driving/${longitude},${latitude}`
              );

              if (!response.ok) throw new Error("API bağlantı hatası");

              const data = await response.json();
              if (data.code === "Ok" && data.waypoints?.length > 0) {
                const snapped = {
                  lat: data.waypoints[0].location[1],
                  lng: data.waypoints[0].location[0],
                };

                if (isMounted) {
                  setUserLocation(snapped);
                  previousLocation.current = snapped;
                }
              }
            } catch (error) {
              console.error("Konum snapping hatası:", error);
            }
          }
        );
      } catch (error) {
        console.error("Konum izleme hatası:", error);
      }
    };

    loadLocation();
    return () => {
      isMounted = false;
      if (watchId) watchId.remove();
    };
  }, []);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) *
        Math.cos(φ2) *
        Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Overpass API'den rota verilerini çekme
  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        const city = userData?.city?.trim();
        if (!city) return;

        const query = `
          [out:json][timeout:25];
          area["name"="${city}"]["admin_level"="4"]->.city;
          area["name"="${district}"]["admin_level"="6"](area.city)->.district;
          area["name"="${neighborhood}"]["admin_level"="8"](area.district)->.neighborhood;
          way(area.neighborhood)[highway][highway!="footway"][highway!="cycleway"];
          out geom;
        `;
        const response = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "data=" + encodeURIComponent(query),
        });
        const data = await response.json();
        setAllRoutes(data);
      } catch (error) {
        console.error("OSM veri çekme hatası:", error);
        setAllRoutes({ elements: [] });
      }
    };
    fetchGeoData();
  }, [userData?.city, district, neighborhood]);

  // Kaydedilen rotaları yükleme (Checkbox aktifse)
  useEffect(() => {
    const loadSavedRoutes = async () => {
      try {
        // Eğer userData veya userData.uid yoksa, işleme devam etmeyin.
        if (!userData?.uid) return;
  
        // "routes" koleksiyonundan, userId değeri userData.uid ile eşleşen kayıtları sorgulayın.
        const q = query(
          collection(db, "routes"),
          where("userId", "==", userData.uid)
        );
        
        const querySnapshot = await getDocs(q);
        
        // Her belgeyi id'siyle birlikte diziye aktarın.
        const routesArray = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
  
        setSavedRoutes(routesArray);
      } catch (error) {
        console.error("Kaydedilen rotalar yüklenirken hata:", error);
      }
    };
  
    if (showSavedRoutes) loadSavedRoutes();
  }, [showSavedRoutes, userData]);

  // Kullanıcı konumunu her saniye güncelle
  useEffect(() => {
    let locationInterval;
    if (userLocation) {
      locationInterval = setInterval(async () => {
        const location = await Location.getCurrentPositionAsync({});
        const newLocation = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };
        setUserLocation(newLocation);
      }, 1000);
    }
    return () => clearInterval(locationInterval);
  }, [userLocation]);

  // Hareket halindeyken (isMoving) her 3 saniyede yol koordinatını güncelle
  useEffect(() => {
    let checkInterval;
    if (isMoving) {
      checkInterval = setInterval(async () => {
        try {
          const location = await Location.getCurrentPositionAsync({});
          const newLocation = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };

          const response = await fetch(
            `https://router.project-osrm.org/nearest/v1/driving/${newLocation.lng},${newLocation.lat}`
          );
          if (!response.ok) throw new Error("API bağlantı hatası");
          const data = await response.json();
          if (data.code === "Ok" && data.waypoints?.length > 0) {
            const snappedLocation = {
              lat: data.waypoints[0].location[1],
              lng: data.waypoints[0].location[0],
            };

            if (
              previousLocation.current &&
              previousLocation.current.lat === snappedLocation.lat &&
              previousLocation.current.lng === snappedLocation.lng
            ) {
              return;
            }
            setRouteCoordinates((prevCoords) => [...prevCoords, snappedLocation]);
            previousLocation.current = snappedLocation;
          }
        } catch (error) {
          console.error("Konum snapping hatası:", error);
        }
      }, 3000);
    }
    return () => clearInterval(checkInterval);
  }, [isMoving]);

  // Kullanıcı konumu henüz yüklenmediyse yükleme ekranı
  if (!userLocation) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <ActivityIndicator size="large" color="#007bff" />
        <Text className="mt-4 text-base text-gray-700">Cihaz konumu yükleniyor...</Text>
      </View>
    );
  }


  
  const saveRouteToFile = async () => {
    try {
      // Kullanıcı verisini kontrol et
      if (!userData || !userData.uid) {
        Alert.alert("Hata", "Kullanıcı oturumu bulunamadı. Lütfen oturum açın.");
        return;
      }
  
      const timestamp = Date.now();
      const routeName = `${userData.city}-${district}-${neighborhood}-${timestamp}`;
  
      // 1️⃣ Compute total distance in km
      let totalMeters = 0;
      for (let i = 1; i < routeCoordinates.length; i++) {
        totalMeters += haversine(
          [routeCoordinates[i - 1].lat, routeCoordinates[i - 1].lng],
          [routeCoordinates[i].lat, routeCoordinates[i].lng]
        );
      }
      const routeLengthKm = totalMeters / 1000;
  
      // 2️⃣ Compute session duration in hours
      const sessionMs = appStartTimeRef.current
        ? timestamp - appStartTimeRef.current
        : 0;
      const sessionDurationHrs = sessionMs / (1000 * 60 * 60);
  
      // 3️⃣ Simple driver score (e.g. 10 points per km)
      const driverScore = Math.round(routeLengthKm * 10);
  
      const routeData = {
        name: routeName,
        userId: userData.uid, // Artık userData.uid'nin tanımlı olduğundan eminiz
        city: userData.city || "Bilinmiyor", // city yoksa varsayılan değer
        district,
        neighborhood,
        timestamp: new Date(timestamp).toISOString(),
        routeCoordinates,
        routeLengthKm,
        sessionDurationHrs,
      };
  
      await addDoc(collection(db, "routes"), routeData);
  
      Alert.alert(
        "Başarı",
        `Rota kaydedildi!\n` +
        `Uzunluk: ${routeLengthKm.toFixed(2)} km\n` +
        `Süre: ${sessionDurationHrs.toFixed(2)} saat\n` +
        `Puan: ${driverScore}`
      );
    } catch (error) {
      console.error("Rota kaydedilirken hata oluştu:", error);
      Alert.alert("Hata", "Rota kaydedilirken bir hata oluştu: " + error.message);
    }
  };

  // Haritaya eklenecek HTML içeriği (WebView içinde)
  const mapHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>OpenStreetMap</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${userLocation.lat}, ${userLocation.lng}], 17);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 30,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const marker = L.marker([${userLocation.lat}, ${userLocation.lng}]).addTo(map)
          .openPopup();

        const polyline = L.polyline(${JSON.stringify(routeCoordinates)}, { color: 'red', weight: 10  }).addTo(map);

        const routes = ${JSON.stringify(allRoutes)};
        routes.elements
          .filter(el => el.type === "way" && el.geometry)
          .forEach(el => {
            const latlngs = el.geometry.map(coord => [coord.lat, coord.lon]);
            L.polyline(latlngs, { color: 'blue', weight: 5 }).addTo(map);
          });

        ${showSavedRoutes ? `
          if (${JSON.stringify(savedRoutes)}.length > 0) {
            const savedRoutesArray = ${JSON.stringify(savedRoutes)};
            savedRoutesArray.forEach(route => {
              L.polyline(route.map(coord => [coord.lat, coord.lng]), { color: 'red', weight: 8, dashArray: '5,5' }).addTo(map);
            });
          }
        ` : ''}

        function updateMap(lat, lng) {
          marker.setLatLng([lat, lng]);
        }

        setInterval(() => {
          updateMap(${userLocation.lat}, ${userLocation.lng});
        }, 1000);
      </script>
    </body>
  </html>
  `;

  return (
    <SafeAreaView className="flex-1 bg-white pt-8">
      {/* Geri Dön Butonu */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="absolute top-10 right-5 bg-blue-500 px-4 py-2 rounded z-10"
      >
        <Text className="text-white text-base font-bold">← Geri</Text>
      </TouchableOpacity>

      <View className="flex-1">
        {/* Kaydedilen Rotaları Göster Checkbox */}
        <View className="flex-row items-center p-4 bg-white">
          <Checkbox
            value={showSavedRoutes}
            onValueChange={setShowSavedRoutes}
            color={showSavedRoutes ? "#007bff" : undefined}
          />
          <Text className="ml-2 text-base text-gray-700">Kaydedilen Rotaları Göster</Text>
        </View>

        {/* Harita (WebView) */}
        <View className="flex-1">
          <WebView source={{ html: mapHtml }} style={{ flex: 1 }} />
        </View>

        {/* Butonlar */}
        <View className="flex-row justify-around p-4 bg-white">
          {/* Başlat */}
          <TouchableOpacity
            onPress={() => setIsMoving(true)}
            disabled={isMoving}
            className={`py-2 px-4 rounded ${isMoving ? "bg-gray-400" : "bg-green-500"}`}
          >
            <Text className="text-white font-semibold">Başlat</Text>
          </TouchableOpacity>

          {/* Kaydet */}
          <TouchableOpacity
            onPress={saveRouteToFile}
            disabled={routeCoordinates.length === 0}
            className={`py-2 px-4 rounded ${routeCoordinates.length === 0 ? "bg-gray-400" : "bg-blue-500"}`}
          >
            <Text className="text-white font-semibold">Kaydet</Text>
          </TouchableOpacity>

          {/* Durdur */}
          <TouchableOpacity
            onPress={() => setIsMoving(false)}
            disabled={!isMoving}
            className={`py-2 px-4 rounded ${!isMoving ? "bg-gray-400" : "bg-red-500"}`}
          >
            <Text className="text-white font-semibold">Durdur</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
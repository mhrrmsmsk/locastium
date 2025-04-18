// screens/ShowHistoryRoute.js
import React, { useState, useEffect, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import { useRoute, useNavigation } from "@react-navigation/native";
import Checkbox from "expo-checkbox";
import { useAuth } from "../auth/authContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

export default function ShowHistoryRoute() {
  const { params } = useRoute();
  const navigation = useNavigation();
  const { routeGroup } = params || {};
  const { userData } = useAuth();

  const [showAll, setShowAll] = useState(false);
  const [allRoutes, setAllRoutes] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const [showRoads, setShowRoads] = useState(false);
  const [roads, setRoads] = useState([]); // array of ways, each is array of {lat,lng}
  const [loadingRoads, setLoadingRoads] = useState(false);

  // 1️⃣ fetch all user routes when toggled on
  useEffect(() => {
    if (!showAll || !userData?.uid) return;
    (async () => {
      setLoadingAll(true);
      try {
        const q = query(
          collection(db, "routes"),
          where("userId", "==", userData.uid)
        );
        const snap = await getDocs(q);
        setAllRoutes(snap.docs.map(d => d.data()));
      } catch (err) {
        console.error("Tüm rotalar çekilirken hata:", err);
      } finally {
        setLoadingAll(false);
      }
    })();
  }, [showAll, userData]);

  // 2️⃣ fetch neighborhood roads when toggled on
  useEffect(() => {
    if (!showRoads) {
      setRoads([]);
      return;
    }
    (async () => {
      setLoadingRoads(true);
      try {
        // Overpass: get ways in this neighborhood
        const overpass = `
          [out:json][timeout:25];
          area["name"="${routeGroup.neighborhood}"]["admin_level"="8"]->.n;
          way(area.n)[highway][highway!="footway"][highway!="cycleway"];
          out geom;
        `;
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          headers: {"Content-Type":"application/x-www-form-urlencoded"},
          body: `data=${encodeURIComponent(overpass)}`,
        });
        const data = await res.json();
        const ways = data.elements
          .filter(e => e.geometry)
          .map(w => w.geometry.map(pt => ({ lat: pt.lat, lng: pt.lon })));
        setRoads(ways);
      } catch (err) {
        console.error("Mahalle yolları çekilirken hata:", err);
      } finally {
        setLoadingRoads(false);
      }
    })();
  }, [showRoads, routeGroup]);

  if (!routeGroup?.routes?.length) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-700 text-lg">
          Kayıtlı rota verisi bulunamadı.
        </Text>
      </SafeAreaView>
    );
  }

  // 3️⃣ build coordinate arrays
  const groupCoordinates = routeGroup.routes
    .filter(r => r.routeCoordinates?.length)
    .map(r => r.routeCoordinates);

  const additionalRoutes = useMemo(() => {
    if (!showAll) return [];
    return allRoutes
      .filter(r =>
        r.routeCoordinates?.length &&
        `${r.city}-${r.district}-${r.neighborhood}` !==
          `${routeGroup.city}-${routeGroup.district}-${routeGroup.neighborhood}`
      )
      .map(r => r.routeCoordinates);
  }, [showAll, allRoutes, routeGroup]);

  // 4️⃣ build the HTML with all layers
  const mapHtml = useMemo(() => `
    <!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <style>html,body,#map{height:100%;margin:0;padding:0}</style>
    </head><body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const map = L.map('map').setView(
          [${groupCoordinates[0][0].lat}, ${groupCoordinates[0][0].lng}], 15
        );
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
          maxZoom:19, attribution:'© OpenStreetMap contributors'
        }).addTo(map);

        // selected group in red
        let bounds = [];
        ${JSON.stringify(groupCoordinates)}.forEach(coords => {
          const latlngs = coords.map(c=>[c.lat,c.lng]);
          const pl = L.polyline(latlngs,{color:'red',weight:10}).addTo(map);
          bounds.push(pl.getBounds());
        });
        if(bounds.length){
          const gb = bounds[0];
          bounds.slice(1).forEach(b=>gb.extend(b));
          map.fitBounds(gb);
        }

        // additional routes in red
        ${JSON.stringify(additionalRoutes)}.forEach(coords => {
          const latlngs = coords.map(c=>[c.lat,c.lng]);
          L.polyline(latlngs,{color:'red',weight:10}).addTo(map);
        });

        // neighborhood roads in blue weight 5
        ${JSON.stringify(roads)}.forEach(geom => {
          const latlngs = geom.map(c=>[c.lat,c.lng]);
          L.polyline(latlngs,{color:'blue',weight:5}).addTo(map);
        });
      </script>
    </body></html>
  `, [groupCoordinates, additionalRoutes, roads]);

  return (
    <SafeAreaView className="flex-1 bg-white pt-8">
      {/* Back */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="absolute top-10 right-5 bg-blue-500 px-4 py-2 rounded z-10"
      >
        <Text className="text-white text-base font-bold">← Geri</Text>
      </TouchableOpacity>

      {/* Toggles */}
      <View className="bg-white border-b border-gray-200">
        <View className="h-14 flex-row items-center justify-between px-4">
          <View className="flex-row items-center">
            <Checkbox
              value={showAll}
              onValueChange={setShowAll}
              style={{ width: 22, height: 22 }}
              color={showAll ? "#3B82F6" : undefined}
            />
            <Text className="ml-3 text-gray-800 font-medium">
              Tüm Rotaları Göster
            </Text>
          </View>
          {loadingAll && <ActivityIndicator size="small" color="#3B82F6" />}
        </View>
        <View className="h-14 flex-row items-center justify-between px-4">
          <View className="flex-row items-center">
            <Checkbox
              value={showRoads}
              onValueChange={setShowRoads}
              style={{ width: 22, height: 22 }}
              color={showRoads ? "#3B82F6" : undefined}
            />
            <Text className="ml-3 text-gray-800 font-medium">
              Mahalle Yollarını Göster
            </Text>
          </View>
          {loadingRoads && <ActivityIndicator size="small" color="#3B82F6" />}
        </View>
      </View>

      {/* Map reloads when either toggle changes */}
      <WebView
        key={`${showAll}-${showRoads}`}
        source={{ html: mapHtml }}
        style={{ flex: 1 }}
        originWhitelist={["*"]}
      />
    </SafeAreaView>
  );
}
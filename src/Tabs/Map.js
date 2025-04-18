// screens/Map.js
import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { useAuth } from "../auth/authContext";

// Firestore imports
import { collection, query as firestoreQuery, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

export default function Map() {
  const { userData } = useAuth();
  const webViewRef = useRef(null);

  const [mapHtml, setMapHtml] = useState("");
  const [currentCoords, setCurrentCoords] = useState(null);

  // panels
  const [searchVisible, setSearchVisible] = useState(false);
  const [districtsVisible, setDistrictsVisible] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);

  // search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // districts & saved routes
  const [districts, setDistricts] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState([]);

  // loading spinners
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingDistrictRoads, setLoadingDistrictRoads] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // directions
  const [directions, setDirections] = useState([]);

  // 1️⃣ Leaflet HTML
  useEffect(() => {
    const html = `
      <!DOCTYPE html><html><head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
        <style>html,body,#map{height:100%;margin:0;padding:0}</style>
      </head><body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          window.map = L.map('map').setView([0,0],2);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
            maxZoom:19, attribution:'&copy; OSM'
          }).addTo(window.map);
          window.searchLayer = L.layerGroup().addTo(window.map);
          window.routeLayer  = L.layerGroup().addTo(window.map);
          window.districtLayer = L.layerGroup().addTo(window.map);
          window.savedLayer = L.layerGroup().addTo(window.map);
        </script>
      </body></html>
    `;
    setMapHtml(html);
  }, []);

  // 2️⃣ Watch device location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Hata", "Konum izni reddedildi.");
        return;
      }
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 1, timeInterval: 5000 },
        loc =>
          setCurrentCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          })
      );
      return () => sub.remove();
    })();
  }, []);

  // Helper to draw polylines
  const injectRoute = (coords, layer = "routeLayer", opts = { color: "blue", weight: 5 }) => {
    const js = `
      (function(){
        window.${layer}.clearLayers();
        var poly = L.polyline(${JSON.stringify(coords)}, ${JSON.stringify(opts)}).addTo(window.${layer});
        window.map.fitBounds(poly.getBounds());
      })();
      true;
    `;
    webViewRef.current.injectJavaScript(js);
  };

  // Center on user
  const goToCurrent = () => {
    if (!currentCoords) return Alert.alert("Hata", "Konum henüz alınamadı.");
    const { latitude, longitude } = currentCoords;
    const js = `
      window.map.setView([${latitude},${longitude}],15);
      L.marker([${latitude},${longitude}])
        .addTo(window.map)
        .bindPopup("Buradasınız!")
        .openPopup();
      true;
    `;
    webViewRef.current.injectJavaScript(js);
  };

  // Clear helpers
  const clearSearch = () => {
    webViewRef.current.injectJavaScript(`window.searchLayer.clearLayers(); true;`);
    setResults([]); setQuery(""); setSearchVisible(false);
  };
  const clearDistricts = () => {
    webViewRef.current.injectJavaScript(`window.districtLayer.clearLayers(); true;`);
    setDistricts([]); setDistrictsVisible(false);
  };
  const clearSaved = () => {
    webViewRef.current.injectJavaScript(`window.savedLayer.clearLayers(); true;`);
    setSavedRoutes([]); setSavedVisible(false);
  };
  const finishRoute = () => {
    webViewRef.current.injectJavaScript(`
      window.routeLayer.clearLayers();
      window.searchLayer.clearLayers();
      window.districtLayer.clearLayers();
      window.savedLayer.clearLayers();
      true;
    `);
    setDirections([]);
    clearSearch(); clearDistricts(); clearSaved();
  };

  // 5️⃣ Overpass search around
  const doSearch = async () => {
    if (!query.trim() || !currentCoords) return;
    setLoadingResults(true);
    const overpass = `
      [out:json][timeout:25];
      (
        node(around:1000,${currentCoords.latitude},${currentCoords.longitude})[name~"${query}",i];
        node(around:1000,${currentCoords.latitude},${currentCoords.longitude})[amenity~"${query}",i];
      );
      out center;
    `;
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(overpass)}`,
      });
      const data = await res.json();
      const elems = data.elements || [];
      if (!elems.length) {
        Alert.alert("Uyarı", "Yakınlarda sonuç bulunamadı.");
        clearSearch();
        return;
      }
      setResults(elems);
      const safe = JSON.stringify(
        elems.map((el, i) => ({
          lat: el.lat,
          lon: el.lon,
          name: (el.tags.name || el.tags.amenity || "Bilinmeyen").replace(/'/g, "\\'"),
          idx: i,
        }))
      );
      const js = `
        (function(){
          window.searchLayer.clearLayers();
          JSON.parse('${safe}').forEach(item => {
            var m = L.marker([item.lat,item.lon]).addTo(window.searchLayer).bindPopup(item.name);
            m.on('click', () => window.ReactNativeWebView.postMessage('SELECT:'+item.idx));
          });
        })(); true;
      `;
      webViewRef.current.injectJavaScript(js);
    } catch (err) {
      console.error(err);
      Alert.alert("Hata", "Arama başarısız.");
    } finally {
      setLoadingResults(false);
    }
  };

  // 6️⃣ Handle marker → OSRM route & steps
  const handleMessage = async e => {
    const msg = e.nativeEvent.data;
    if (!msg.startsWith("SELECT:")) return;
    const idx = parseInt(msg.split(":")[1], 10);
    const item = results[idx];
    if (!item || !currentCoords) return Alert.alert("Hata", "Önce konum alınmalı.");
    const lat = item.lat, lon = item.lon;
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${currentCoords.longitude},${currentCoords.latitude};${lon},${lat}` +
      `?overview=full&geometries=geojson&steps=true`;
    try {
      const r = await fetch(url), j = await r.json();
      const coords = j.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      injectRoute(coords, "routeLayer", { color: "blue", weight: 5 });
      const steps = [];
      j.routes[0].legs.forEach(leg =>
        leg.steps.forEach(s => {
          steps.push(s.maneuver.instruction || `${s.maneuver.type} ${s.name || ""}`.trim());
        })
      );
      setDirections(steps);
    } catch (err) {
      console.error(err);
      Alert.alert("Hata", "Rota alınamadı.");
    }
    setSearchVisible(false);
  };

  // 7️⃣ Load districts via Overpass
  const loadDistricts = async () => {
    if (!userData?.city) return Alert.alert("Hata", "Şehir bilgisi yok.");
    setDistrictsVisible(true);
    setDistricts([]);
    setLoadingDistricts(true);

    const overpass = `
      [out:json][timeout:25];
      area["name"="${userData.city}"]["admin_level"="4"]->.a;
      relation(area.a)["admin_level"="6"];
      out tags;
    `;
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(overpass)}`,
      });
      const data = await res.json();
      const names = data.elements.map(el => el.tags.name).filter(n => n);
      if (!names.length) Alert.alert("Uyarı", "Hiç ilçe bulunamadı.");
      setDistricts(names);
    } catch (err) {
      console.error(err);
      Alert.alert("Hata", "İlçeler yüklenemedi.");
    } finally {
      setLoadingDistricts(false);
    }
  };

  // 8️⃣ Draw district roads
  const selectDistrict = async name => {
    clearDistricts();
    setLoadingDistrictRoads(true);

    const overpass = `
      [out:json][timeout:25];
      area["name"="${name}"]["admin_level"="6"]->.d;
      way(area.d)[highway][highway!="footway"][highway!="cycleway"];
      out geom;
    `;

    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(overpass)}`,
      });
      const data = await res.json();
      const ways = data.elements.filter(e => e.geometry);
      if (!ways.length) {
        Alert.alert("Uyarı", "Bu ilçede yol verisi bulunamadı.");
        return;
      }
      const safe = JSON.stringify(ways.map(w => ({ geometry: w.geometry })));
      const js = `
        (function(){
          window.districtLayer.clearLayers();
          var allCoords = [];
          JSON.parse('${safe}').forEach(w => {
            var coords = w.geometry.map(pt => [pt.lat, pt.lon]);
            allCoords = allCoords.concat(coords);
            L.polyline(coords, { color:'blue', weight:5 }).addTo(window.districtLayer);
          });
          if(allCoords.length) window.map.fitBounds(L.latLngBounds(allCoords));
        })(); true;
      `;
      webViewRef.current.injectJavaScript(js);
    } catch (err) {
      console.error(err);
      Alert.alert("Hata", "İlçe yolları yüklenemedi.");
    } finally {
      setLoadingDistrictRoads(false);
    }
  };

  // 9️⃣ Load saved routes from Firestore
  const toggleSaved = async () => {
    if (savedVisible) {
      // hide
      webViewRef.current.injectJavaScript(`window.savedLayer.clearLayers(); true;`);
      setSavedVisible(false);
      return;
    }
    // show
    if (!userData?.uid) {
      Alert.alert("Hata", "User ID yok.");
      return;
    }
    setLoadingSaved(true);
    try {
      const q = firestoreQuery(
        collection(db, "routes"),
        where("userId", "==", userData.uid)
      );
      const snap = await getDocs(q);
      const arr = snap.docs.map(d => d.data().routeCoordinates);
      // draw each in red
      arr.forEach(rc => {
        webViewRef.current.injectJavaScript(`
          L.polyline(${JSON.stringify(rc)},{color:'red',weight:10}).addTo(window.savedLayer);
        `);
      });
      setSavedVisible(true);
    } catch (err) {
      console.error(err);
      Alert.alert("Hata", "Kaydedilen rotalar yüklenemedi.");
    } finally {
      setLoadingSaved(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 pt-8">
      {mapHtml && (
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={{ flex: 1 }}
          onMessage={handleMessage}
          originWhitelist={["*"]}
        />
      )}

      {/* Loading overlays */}
      {(loadingDistricts || loadingDistrictRoads || loadingSaved) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      )}

      {/* Buttons */}
      <TouchableOpacity style={[styles.button, { left: 20, bottom: 80 }]} onPress={goToCurrent}>
        <Text>📍</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { left: 80, bottom: 80 }]} onPress={() => setSearchVisible(true)}>
        <Text>🔍</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { right: 80, bottom: 80 }]} onPress={loadDistricts}>
        <Text>İ</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { right: 20, bottom: 80 }]} onPress={toggleSaved}>
        <Text style={{ fontWeight: "bold", color: savedVisible ? "#aaa" : "red", fontSize: 12 }}>R</Text>
      </TouchableOpacity>

      {/* Search Panel */}
      {searchVisible && (
        <View style={styles.searchPanel}>
          <TextInput
            style={styles.searchInput}
            placeholder="Ara..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={doSearch}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={doSearch}>
            {loadingResults ? <ActivityIndicator /> : <Text>🔍</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={clearSearch}>
            <Text>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Districts Panel */}
      {districtsVisible && (
        <View style={styles.listPanel}>
          <ScrollView>
            {districts.map((d, i) => (
              <TouchableOpacity key={i} style={styles.listItem} onPress={() => selectDistrict(d)}>
                <Text>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={clearDistricts}>
            <Text>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Directions Panel */}
      {directions.length > 0 && (
        <View style={styles.directionsPanel}>
          <View style={styles.directionsHeader}>
            <Text style={styles.directionsTitle}>Yol Tarifi</Text>
            <TouchableOpacity onPress={finishRoute}>
              <Text style={styles.finishText}>Bitir</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.directionsList}>
            {directions.map((d, i) => (
              <Text key={i} style={styles.stepText}>
                {i + 1}. {d}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  searchPanel: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    zIndex: 1000,
  },
  searchInput: { flex: 1, height: 40, paddingHorizontal: 10, fontSize: 16 },
  searchBtn: { marginLeft: 8, padding: 8 },
  closeBtn: { marginLeft: 8, padding: 8 },

  listPanel: {
    position: "absolute",
    top: 80,
    left: 20,
    right: 20,
    bottom: 80,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    padding: 12,
    zIndex: 1000,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Full-screen overlay for district list & roads loading
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1001,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
  },

  listItem: { padding: 10, borderBottomWidth: 1, borderColor: "#ddd" },

  directionsPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "40%",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  directionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  directionsTitle: { fontSize: 18, fontWeight: "bold" },
  finishText: { fontSize: 16, color: "#DC2626" },
  directionsList: { paddingRight: 8 },
  stepText: { fontSize: 14, marginBottom: 6 },
});
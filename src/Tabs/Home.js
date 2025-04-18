// screens/Home.js
import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  TouchableOpacity,
  ImageBackground,
  Image,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/authContext";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.7;
const SPACING = 20;

const cards = [
  { title: "Rota Oluştur", route: "CreateRoute", color: "#BFDBFE" },
  { title: "Geçmiş Rotalar", route: "RouteHistory", color: "#BBF7D0" },
  { title: "İstatistik", route: "Statistics", color: "#E9D5FF" },
];

const Home = ({ navigation }) => {
  const { userData } = useAuth();
  // Try displayName, then fallback to a generic label
  const userName = userData?.displayName || userData?.firstName || "Kullanıcı";

  const scrollX = useRef(new Animated.Value(0)).current;

  return (
    <ImageBackground
      source={require("../assets/images/background_simple.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView className="flex-1 items-center pt-8">
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

        {/* Hoşgeldin Kullanıcı */}
        <Text className="text-3xl font-extrabold text-gray-700 mb-8">
          Hoşgeldin, {userName}!
        </Text>

        {/* Kartlar */}
        <Animated.FlatList
          data={cards}
          keyExtractor={(item) => item.route}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + SPACING}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingHorizontal: (width - CARD_WIDTH) / 2,
            alignItems: "center",
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          renderItem={({ item, index }) => {
            const inputRange = [
              (index - 1) * (CARD_WIDTH + SPACING),
              index * (CARD_WIDTH + SPACING),
              (index + 1) * (CARD_WIDTH + SPACING),
            ];
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.9, 1, 0.9],
              extrapolate: "clamp",
            });
            return (
              <TouchableOpacity
                onPress={() => navigation.navigate(item.route)}
                activeOpacity={0.9}
              >
                <Animated.View
                  style={{
                    width: CARD_WIDTH,
                    height: 200,
                    marginRight: SPACING,
                    backgroundColor: item.color,
                    borderRadius: 30,
                    justifyContent: "center",
                    alignItems: "center",
                    transform: [{ scale }],
                    shadowColor: "#000",
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 5 },
                  }}
                >
                  <Text className="text-xl font-bold text-gray-800 text-center px-2">
                    {item.title}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </ImageBackground>
  );
};

export default Home;
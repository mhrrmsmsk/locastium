// TabNavigator.js
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React, { useState } from "react";
import { Dimensions, View, Text, Image } from "react-native";
import Home from "../Tabs/Home";
import Map from "../Tabs/Map";
import Profile from "../Tabs/Profile";
import { getPathDown } from "./curve";
import { Svg, Path } from "react-native-svg";
import { scale } from "react-native-size-scaling";
import RouteStack from "./RouteStack";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";

const Tab = createBottomTabNavigator();
export const Tabs = () => {
    const [maxWidth] = useState(Dimensions.get("window").width);
    const returnpathDown = getPathDown(maxWidth, 60, 50);

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: "transparent",
                    position: "absolute",
                    elevation: 0,
                    height: scale(60),
                    borderTopWidth: 0,
                },
                tabBarBackground: () => (
                    <Svg width={maxWidth} height={scale(60)} style={{ position: 'absolute', bottom: 0 }}>
                        <Path fill="white" d={returnpathDown} />
                    </Svg>
                ),
            }}
        >
      <Tab.Screen
        name="HomeScreen"
        component={RouteStack}
        options={({ route }) => {
          // bu sayfalarda tabBar gizlenecek:
          const hiddenScreens = ["CreateRoute", "CreateRouteNeigh", "RouteMap"];
          const currentRoute = getFocusedRouteNameFromRoute(route) ?? "Home";
          const hideTabBar = hiddenScreens.includes(currentRoute);

          return {
            headerShown: false,
            tabBarStyle: hideTabBar
              ? { display: "none" }
              : {
                  backgroundColor: "transparent",
                  position: "absolute",
                  elevation: 0,
                  height: scale(60),
                  borderTopWidth: 0,
                },
            tabBarIcon: () => (
              <Image
                style={{ width: 32, height: 32 }}
                source={{ uri: "https://img.icons8.com/sf-regular-filled/48/null/home-page.png" }}
              />
            ),
          };
        }}
      />

            <Tab.Screen
                name="Map"
                component={Map}
                options={{
                    headerShown: false,
                    tabBarIcon: () => (
                        <View
                            style={{
                                position: 'absolute',
                                top: -28,
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                backgroundColor: 'white',
                            }}
                        >
                            <Image
                                style={{ width: 32, height: 32 }}
                                source={{ uri: "https://img.icons8.com/small/64/null/map.png" }}
                            />
                        </View>
                    ),
                }}
            />

            <Tab.Screen
                name="Profile"
                component={Profile}
                options={{
                    headerShown: false,
                    tabBarIcon: () => (
                        <Image
                            style={{ width: 32, height: 32 }}
                            source={{ uri: "https://img.icons8.com/small/64/null/gender-neutral-user.png" }}
                        />

                    ),
                }}
            />
        </Tab.Navigator>
    );
};
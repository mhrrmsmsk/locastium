import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import RootStack from "./src/navigation/RootStack";
import { AuthProvider, useAuth } from "./src/auth/authContext";
import "./global.css"
const AppWrapper = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

const App = () => {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <RootStack isAuthenticated={!!user} />
    </NavigationContainer>
  );
};

export default AppWrapper;
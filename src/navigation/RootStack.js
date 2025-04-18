import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import LogIn from '../screens/LogIn';
import { Tabs } from './TabNavigator';
import { useAuth } from '../auth/authContext'; // burası önemli!
import { View, ActivityIndicator } from 'react-native';
const Stack = createNativeStackNavigator();

const RootStack = () => {
    const { user, loading } = useAuth(); // 🔁 loading durumu da geldi
  
    if (loading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1E90FF" />
        </View>
      );
    }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Tabs" component={Tabs} />
      ) : (
        <Stack.Screen name="Login" component={LogIn} />
      )}
    </Stack.Navigator>
  );
};

export default RootStack;
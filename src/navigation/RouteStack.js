import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CreateRoute from '../screens/CreateRoute';
import CreateRouteNeigh from '../screens/CreateRouteNeigh';
import RouteHistory from '../screens/RouteHistory';
import RouteMap from '../screens/RouteMap';
import Home from "../Tabs/Home";
import ShowHistoryRoute from '../screens/ShowHistoryRoute';
import Profile from '../Tabs/Profile';
import Map from '../Tabs/Map';
import Statistics from '../screens/Statistics';

const Stack = createNativeStackNavigator();

const RouteStack = () => {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={Home} options={{ title: "Ana Sayfa", headerShown: false}} />
      <Stack.Screen name='Map' component={Map} options={{title:"Harita", headerShown: false}}/>
      <Stack.Screen name='Profile' component={Profile} options={{title:"Harita", headerShown: false}}/>
      <Stack.Screen name="CreateRoute" component={CreateRoute} options={{ title: "Rota Oluştur", headerShown: false }} />
      <Stack.Screen name="CreateRouteNeigh" component={CreateRouteNeigh} options={{ title: "Rota Oluştur", headerShown: false }} />
      <Stack.Screen name="RouteHistory" component={RouteHistory} options={{ title: "Geçmiş Rotalar", headerShown: false }} />
      <Stack.Screen name="RouteMap" component={RouteMap} options={{ title: "Yol Haritası", headerShown: false }} />
      <Stack.Screen name="ShowHistoryRoute" component={ShowHistoryRoute} options={{ title: "Rota Oluştur", headerShown: false }} />
      <Stack.Screen name="Statistics" component={Statistics} options={{ title: "Yollar", headerShown: false }} />
      

    </Stack.Navigator>
  );
};

export default RouteStack;
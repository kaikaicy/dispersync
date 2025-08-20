import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from './SplashScreen';
import LoginPage from './src/screen/LoginPage';
import MainScreen from './MainScreen';
import ConnectDeviceScreen from './ConnectDeviceScreen';
import ProfileScreen from './ProfileScreen';
import Transaction from './Transaction';
import Cull from './Cull';
import Status from './Status';
import Beneficiary from './Beneficiary';
import Dispersal from './Dispersal';
import INSPECT from './INSPECT'; // adjust path if needed

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash">
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginPage} options={{ headerShown: false }} />
        <Stack.Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ConnectDeviceScreen" component={ConnectDeviceScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Transaction" component={Transaction} options={{ headerShown: false }} />
        {/* <Stack.Screen name="Cull" component={Cull} options={{ headerShown: false }} /> */}
        {/* <Stack.Screen name="Status" component={Status} options={{ headerShown: false }} /> */}
        {/* <Stack.Screen name="Beneficiary" component={Beneficiary} options={{ headerShown: false }} /> */}
        {/* <Stack.Screen name="Dispersal" component={Dispersal} options={{ headerShown: false }} /> */}
        <Stack.Screen name="INSPECT" component={INSPECT} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

// screens
import SplashScreen from "./screens/SplashScreen";   // 👈 NEW
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import MainTabs from "./screens/MainTabs";
import MapScreen from "./screens/MapScreen";
import CourtDetailScreen from "./screens/CourtDetailScreen";
import UserProfileScreen from "./screens/UserProfileScreen";
import CourtChatScreen from "./screens/CourtChatScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Splash"   // 👈 Start on Splash
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="MapScreen" component={MapScreen} />
        <Stack.Screen name="CourtDetail" component={CourtDetailScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="CourtChat" component={CourtChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

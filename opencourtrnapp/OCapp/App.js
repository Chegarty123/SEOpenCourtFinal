// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// screens
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import MainTabs from "./screens/MainTabs";
import MapScreen from "./screens/MapScreen";
import CourtDetailScreen from "./screens/CourtDetailScreen";
import UserProfileScreen from "./screens/UserProfileScreen";
import CourtChatScreen from "./screens/CourtChatScreen"; // 👈 NEW
import { StatusBar } from "expo-status-bar";


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>

      <StatusBar style="dark" />
      
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MapScreen"
          component={MapScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CourtDetail"
          component={CourtDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
          options={{ title: "Player Profile" }}
        />
        <Stack.Screen
          name="CourtChat"
          component={CourtChatScreen}
          options={{ headerShown: false }} // full custom header
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

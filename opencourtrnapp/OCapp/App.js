// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

// screens
import SplashScreen from "./screens/SplashScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import ProfileOnboardingScreen from "./screens/ProfileOnboardingScreen";
import MainTabs from "./screens/MainTabs";
import MapScreen from "./screens/MapScreen";
import CourtDetailScreen from "./screens/CourtDetailScreen";
import UserProfileScreen from "./screens/UserProfileScreen";
import CourtChatScreen from "./screens/CourtChatScreen";
import DmChatScreen from "./screens/DmChatScreen";
import GroupChatSettingsScreen from "./screens/GroupChatSettingsScreen";


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right", // default for most pushes
        }}
      >
        {/* First screen – just appears, no transition into it */}
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
        />

        {/* Splash -> Login will fade */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ animation: "fade" }}
        />

        {/* Login -> Signup slides from right, Signup -> Login slides from left */}
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
        />

        {/* Profile onboarding after signup */}
        <Stack.Screen
          name="ProfileOnboarding"
          component={ProfileOnboardingScreen}
          options={{ animation: "slide_from_right" }}
        />

        {/* Splash -> MainTabs (home) will also fade */}
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ animation: "fade" }}
        />

        {/* These all use slide_from_right (default) */}
        <Stack.Screen name="MapScreen" component={MapScreen} />
        <Stack.Screen name="CourtDetail" component={CourtDetailScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="CourtChat" component={CourtChatScreen} />
        <Stack.Screen name="DirectMessage" component={DmChatScreen} />
        <Stack.Screen name="GroupChatSettings" component={GroupChatSettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// screens/MainTabs.js
import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "./HomeScreen";
import MapScreen from "./MapScreen";
import ProfileScreen from "./ProfileScreen";
import SettingsScreen from "./SettingsScreen"; // Friends
import MessagesScreen from "./MessagesScreen";


const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#38bdf8",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? 0 : 2,
        },
        tabBarStyle: {
          backgroundColor: "#020617",
          borderTopColor: "rgba(148,163,184,0.6)",
          borderTopWidth: 0.5,
          height: Platform.OS === "ios" ? 80 : 60,
          paddingBottom: Platform.OS === "ios" ? 10 : 6,
          paddingTop: 6,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = "radio-outline";

          if (route.name === "Home") iconName = focused ? "home" : "home-outline";
          else if (route.name === "Map")
            iconName = focused ? "map" : "map-outline";
          else if (route.name === "Profile")
            iconName = focused ? "person" : "person-outline";
          else if (route.name === "Friends")
            iconName = focused ? "people" : "people-outline";

          return <Ionicons name={iconName} size={20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
      <Tab.Screen
        name="Friends"
        component={SettingsScreen}
        options={{ tabBarLabel: "Friends" }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: "Messages",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

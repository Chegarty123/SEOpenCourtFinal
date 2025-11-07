// screens/MainTabs.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "./HomeScreen";
import MapScreen from "./MapScreen";
import ProfileScreen from "./ProfileScreen";
import SettingsScreen from "./SettingsScreen"; // Friends

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        // colors
        tabBarActiveTintColor: "#1f6fb2",
        tabBarInactiveTintColor: "#94a3b8",

        // nicer label styling (React Navigation handles layout so no weird wrapping)
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          paddingBottom: 4,
        },

        // full-width bar at bottom so it doesn’t overlap cards
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0.5,
          borderTopColor: "#e2e8f0",
          height: 64,
        },

        tabBarIcon: ({ color, size }) => {
          let iconName = "home-outline";

          if (route.name === "Home") {
            iconName = "home-outline";
          } else if (route.name === "Map") {
            iconName = "map-outline";
          } else if (route.name === "Profile") {
            iconName = "person-outline";
          } else if (route.name === "Friends") {
            iconName = "people-outline";
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarLabel: "Map" }}
      />
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
    </Tab.Navigator>
  );
}

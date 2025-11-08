// screens/MainTabs.js
import React, { useEffect, useState } from "react";
import { Platform, View, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "./HomeScreen";
import MapScreen from "./MapScreen";
import ProfileScreen from "./ProfileScreen";
import SettingsScreen from "./SettingsScreen"; // Friends
import MessagesScreen from "./MessagesScreen";

import { auth, db } from "../firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

const Tab = createBottomTabNavigator();

function MessagesTabIcon({ color, size }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const convRef = collection(db, "dmConversations");
    const unsub = onSnapshot(convRef, (snap) => {
      let count = 0;

      snap.forEach((d) => {
        const data = d.data();
        const participants = data.participants || [];
        if (!participants.includes(user.uid)) return;

        const lastSender = data.lastMessageSenderId;
        const updatedAt = data.updatedAt || data.createdAt || null;
        const readBy = data.readBy || {};
        const myRead = readBy[user.uid];

        let unread = false;

        if (lastSender && lastSender !== user.uid) {
          if (!myRead) {
            unread = true;
          } else if (
            updatedAt &&
            typeof updatedAt.toMillis === "function" &&
            typeof myRead.toMillis === "function" &&
            updatedAt.toMillis() > myRead.toMillis()
          ) {
            unread = true;
          }
        }

        if (unread) count += 1;
      });

      setUnreadCount(count);
    });

    return () => unsub();
  }, []);

  return (
    <View
      style={{
        width: size + 6,
        height: size + 6,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Ionicons name="chatbubbles-outline" size={size} color={color} />
      {unreadCount > 0 && (
        <View
          style={{
            position: "absolute",
            right: -4,
            top: -2,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: "#ef4444",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 3,
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontSize: 10,
              fontWeight: "700",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#38bdf8",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#020617",
          borderTopColor: "#1f2937",
          height: Platform.OS === "ios" ? 72 : 60,
          paddingBottom: Platform.OS === "ios" ? 8 : 6,
          paddingTop: 4,
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === "Home") {
            return <Ionicons name="home-outline" size={size} color={color} />;
          }
          if (route.name === "Map") {
            return <Ionicons name="map-outline" size={size} color={color} />;
          }
          if (route.name === "Profile") {
            return (
              <Ionicons name="person-outline" size={size} color={color} />
            );
          }
          if (route.name === "Friends") {
            return (
              <Ionicons name="people-outline" size={size} color={color} />
            );
          }
          if (route.name === "Messages") {
            return <MessagesTabIcon color={color} size={size} />;
          }
          return null;
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
        options={{ tabBarLabel: "Messages" }}
      />
    </Tab.Navigator>
  );
}

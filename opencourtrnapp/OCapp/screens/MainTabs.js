// screens/MainTabs.js
import React, { useEffect, useState, useRef } from "react";
import {
  Platform,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from "react-native";
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

/* ----------------- Unread badge on Messages tab ----------------- */
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
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ----------------- MainTabs with DM Notification Banner ----------------- */

export default function MainTabs({ navigation }) {
  const [dmBanner, setDmBanner] = useState(null); // { fromName, textPreview, conversationId, otherUserId, otherProfilePic }
  const bannerAnim = useRef(new Animated.Value(-40)).current;
  const hideTimeoutRef = useRef(null);

  const lastConvTimestampsRef = useRef({}); // convId -> last updatedAt ms
  const initialLoadedRef = useRef(false);

  // Helper to show banner
  const showDmBanner = (payload) => {
    // Clear any previous timer
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    setDmBanner(payload);

    // Start from hidden position
    bannerAnim.setValue(-40);
    Animated.timing(bannerAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    // Auto-hide after 4s
    hideTimeoutRef.current = setTimeout(() => {
      hideDmBanner();
    }, 4000);
  };

  const hideDmBanner = () => {
    Animated.timing(bannerAnim, {
      toValue: -40,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDmBanner(null);
    });
  };

  const handleBannerPress = () => {
    if (!dmBanner) return;
    hideDmBanner();

    navigation.navigate("DirectMessage", {
      conversationId: dmBanner.conversationId,
      otherUserId: dmBanner.otherUserId,
      otherUsername: dmBanner.fromName,
      otherProfilePic: dmBanner.otherProfilePic || null,
    });
  };

  // Listen globally to dmConversations for *new* messages
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const convRef = collection(db, "dmConversations");

    const unsub = onSnapshot(convRef, (snap) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // First snapshot: just seed the timestamps so we don't fire old conversations
      if (!initialLoadedRef.current) {
        const base = {};
        snap.forEach((d) => {
          const data = d.data();
          const participants = data.participants || [];
          if (!participants.includes(currentUser.uid)) return;

          const ts = data.updatedAt || data.createdAt;
          if (ts && typeof ts.toMillis === "function") {
            base[d.id] = ts.toMillis();
          }
        });
        lastConvTimestampsRef.current = base;
        initialLoadedRef.current = true;
        return;
      }

      // Subsequent updates: look at docChanges for new messages
      snap.docChanges().forEach((change) => {
        if (change.type !== "added" && change.type !== "modified") return;

        const d = change.doc;
        const data = d.data();
        const participants = data.participants || [];
        if (!participants.includes(currentUser.uid)) return;

        const ts = data.updatedAt || data.createdAt;
        if (!ts || typeof ts.toMillis !== "function") return;
        const updatedMs = ts.toMillis();

        const prevMs = lastConvTimestampsRef.current[d.id] || 0;
        // Update stored value
        lastConvTimestampsRef.current[d.id] = updatedMs;

        // If not actually newer, ignore
        if (updatedMs <= prevMs) return;

        const lastSender = data.lastMessageSenderId;
        if (!lastSender || lastSender === currentUser.uid) {
          // ignore messages from myself
          return;
        }

        // Build sender info + preview
        const otherId =
          participants.find((p) => p !== currentUser.uid) || currentUser.uid;
        const pInfo = data.participantInfo || {};
        const otherInfo = pInfo[otherId] || {};

        const fromName =
          otherInfo.username ||
          (otherInfo.email
            ? otherInfo.email.split("@")[0]
            : "Player");

        let textPreview = data.lastMessage || "";
        if (!textPreview && data.lastMessageType === "gif") {
          textPreview = "GIF";
        }
        if (!textPreview) textPreview = "New message";

        showDmBanner({
          fromName,
          textPreview,
          conversationId: d.id,
          otherUserId: otherId,
          otherProfilePic: otherInfo.profilePic || null,
        });
      });
    });

    return () => {
      unsub();
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
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

      {/* DM in-app banner */}
      {dmBanner && (
        <Animated.View
          style={[
            styles.dmBannerContainer,
            { transform: [{ translateY: bannerAnim }] },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.dmBanner}
            onPress={handleBannerPress}
          >
            <View style={styles.dmBannerAvatarWrap}>
              {dmBanner.otherProfilePic ? (
                <Image
                  source={{ uri: dmBanner.otherProfilePic }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <View style={styles.dmBannerAvatarPlaceholder}>
                  <Text style={styles.dmBannerAvatarInitial}>
                    {dmBanner.fromName?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.dmBannerTitle}>
                Message from {dmBanner.fromName}
              </Text>
              <Text
                style={styles.dmBannerPreview}
                numberOfLines={2}
              >
                {dmBanner.textPreview}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  unreadBadge: {
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
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  dmBannerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 12,
    zIndex: 50,
    elevation: 50,
  },
  dmBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.98)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  dmBannerAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    backgroundColor: "#020617",
  },
  dmBannerAvatarPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  dmBannerAvatarInitial: {
    color: "#e5f3ff",
    fontWeight: "700",
  },
  dmBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e5f3ff",
  },
  dmBannerPreview: {
    marginTop: 2,
    fontSize: 12,
    color: "#cbd5f5",
  },
});

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
import { collection, onSnapshot, doc, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import { useNavigationContext } from "../contexts/NavigationContext";

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

/* ----------------- Incoming friend requests badge on Friends tab ----------------- */
function FriendsTabIcon({ color, size }) {
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const incomingRequests = data.incomingRequests || [];
      setRequestCount(incomingRequests.length);
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
      <Ionicons name="people-outline" size={size} color={color} />
      {requestCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>
            {requestCount > 9 ? "9+" : requestCount}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ----------------- MainTabs with DM Notification Banner ----------------- */

export default function MainTabs({ navigation }) {
  const { currentConversationId, currentCourtId } = useNavigationContext();
  const [dmBanner, setDmBanner] = useState(null); // { type, fromName, textPreview, conversationId, courtId, otherUserId, otherProfilePic, isGroup, groupTitle, courtName }
  const bannerAnim = useRef(new Animated.Value(-40)).current;
  const hideTimeoutRef = useRef(null);

  const lastConvTimestampsRef = useRef({}); // convId -> last updatedAt ms
  const initialLoadedRef = useRef(false);
  const lastCourtTimestampsRef = useRef({}); // courtId -> last updatedAt ms
  const courtInitialLoadedRef = useRef(false);

  // Helper to show banner
  const showDmBanner = (payload) => {
    // Don't show notification if user is currently in that chat
    if (payload.type === "dm" && payload.conversationId === currentConversationId) {
      return;
    }
    if (payload.type === "court" && payload.courtId === currentCourtId) {
      return;
    }

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

    if (dmBanner.type === "court") {
      // Navigate to court chat
      navigation.navigate("CourtChat", {
        courtId: dmBanner.courtId,
        courtName: dmBanner.courtName,
        courtAddress: dmBanner.courtAddress || "",
        courtImage: dmBanner.courtImage || null,
      });
    } else {
      // Navigate to DM
      const isGroup = !!dmBanner.isGroup;
      const title = isGroup
        ? dmBanner.groupTitle || dmBanner.fromName || "Group chat"
        : dmBanner.fromName;

      navigation.navigate("DirectMessage", {
        conversationId: dmBanner.conversationId,
        otherUserId: isGroup ? null : dmBanner.otherUserId,
        otherUsername: isGroup ? null : dmBanner.fromName,
        otherProfilePic: isGroup ? null : dmBanner.otherProfilePic || null,
        isGroup,
        title,
      });
    }
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
        // Is this a group conversation?
        const isGroup =
          data.type === "group" || (participants && participants.length > 2);

        const pInfo = data.participantInfo || {};

        // Who actually sent the last message?
        const senderInfo = pInfo[lastSender] || {};

        const fromName =
          senderInfo.username ||
          (senderInfo.email
            ? senderInfo.email.split("@")[0]
            : "Player");

        // Group title (if group), else null
        const groupTitle = isGroup ? data.name || "Group chat" : null;

        // Text preview
        let textPreview = data.lastMessage || "";
        if (!textPreview && data.lastMessageType === "gif") {
          textPreview = "GIF";
        }
        if (!textPreview) textPreview = "New message";

        showDmBanner({
          type: "dm",
          fromName,
          textPreview,
          conversationId: d.id,
          // For groups we won't use otherUserId in the DM screen
          otherUserId: isGroup ? null : lastSender,
          otherProfilePic: senderInfo.profilePic || null,
          isGroup,
          groupTitle,
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

  // Listen globally to courts for *new* messages
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const courtsRef = collection(db, "courts");
    const q = query(courtsRef, where("participants", "array-contains", user.uid));

    const unsub = onSnapshot(q, (snap) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // First snapshot: seed timestamps
      if (!courtInitialLoadedRef.current) {
        const base = {};
        snap.forEach((d) => {
          const data = d.data();
          const ts = data.updatedAt;
          if (ts && typeof ts.toMillis === "function") {
            base[d.id] = ts.toMillis();
          }
        });
        lastCourtTimestampsRef.current = base;
        courtInitialLoadedRef.current = true;
        return;
      }

      // Subsequent updates: look at docChanges for new messages
      snap.docChanges().forEach((change) => {
        if (change.type !== "added" && change.type !== "modified") return;

        const d = change.doc;
        const data = d.data();

        const ts = data.updatedAt;
        if (!ts || typeof ts.toMillis !== "function") return;
        const updatedMs = ts.toMillis();

        const prevMs = lastCourtTimestampsRef.current[d.id] || 0;
        lastCourtTimestampsRef.current[d.id] = updatedMs;

        if (updatedMs <= prevMs) return;

        const lastSender = data.lastMessageSenderId;
        if (!lastSender || lastSender === currentUser.uid) {
          return; // ignore own messages
        }

        const senderName = data.lastMessageSenderName || "Player";
        const courtName = data.name || "Court Chat";

        let textPreview = data.lastMessage || "";
        if (!textPreview && data.lastMessageType === "gif") {
          textPreview = "GIF";
        }
        if (!textPreview) textPreview = "New message";

        showDmBanner({
          type: "court",
          fromName: senderName,
          textPreview,
          courtId: d.id,
          courtName,
          courtAddress: data.address || "",
          courtImage: data.image || null,
        });
      });
    });

    return () => unsub();
  }, []);

  // Listen for reaction notifications
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const notifRef = collection(db, "users", user.uid, "notifications");
    const q = query(notifRef, where("read", "==", false));

    const unsub = onSnapshot(q, async (snap) => {
      snap.docChanges().forEach(async (change) => {
        if (change.type !== "added") return;

        const d = change.doc;
        const data = d.data();

        if (data.type !== "reaction") return;

        // Build notification message
        const chatLocation = data.chatType === "court"
          ? ` in ${data.courtName}`
          : data.isGroup
          ? ` in ${data.chatName}`
          : "";

        showDmBanner({
          type: "reaction",
          fromName: data.reactorName,
          textPreview: `${data.emoji} ${data.messagePreview}`,
          conversationId: data.chatType === "dm" ? data.chatId : null,
          courtId: data.chatType === "court" ? data.chatId : null,
          courtName: data.chatType === "court" ? data.courtName : null,
          isGroup: data.isGroup || false,
          groupTitle: data.chatName || null,
          emoji: data.emoji,
          chatLocation,
        });

        // Mark as read and delete after showing
        try {
          await updateDoc(doc(db, "users", user.uid, "notifications", d.id), { read: true });
          // Auto-delete old notifications (older than 7 days)
          if (data.timestamp && typeof data.timestamp.toMillis === "function") {
            const age = Date.now() - data.timestamp.toMillis();
            if (age > 7 * 24 * 60 * 60 * 1000) {
              await deleteDoc(doc(db, "users", user.uid, "notifications", d.id));
            }
          }
        } catch (err) {
          console.log("Error updating notification:", err);
        }
      });
    });

    return () => unsub();
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
              return <FriendsTabIcon color={color} size={size} />;
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
                {dmBanner.type === "reaction"
                  ? `${dmBanner.fromName} reacted${dmBanner.chatLocation || ""}`
                  : dmBanner.type === "court"
                  ? `${dmBanner.fromName} in ${dmBanner.courtName}`
                  : dmBanner.isGroup
                  ? `${dmBanner.fromName} in ${dmBanner.groupTitle}`
                  : `Message from ${dmBanner.fromName}`}
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

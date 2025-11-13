// components/NotificationBanner.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebaseConfig";
import { collection, onSnapshot, query, where, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { useNavigationContext } from "../contexts/NavigationContext";

export default function NotificationBanner() {
  const navigation = useNavigation();
  const { currentConversationId, currentCourtId } = useNavigationContext();
  const [banner, setBanner] = useState(null);
  const bannerAnim = useRef(new Animated.Value(-80)).current;
  const hideTimeoutRef = useRef(null);

  const lastConvTimestampsRef = useRef({});
  const initialLoadedRef = useRef(false);
  const lastCourtTimestampsRef = useRef({});
  const courtInitialLoadedRef = useRef(false);

  // Helper to show banner
  const showBanner = (payload) => {
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

    setBanner(payload);

    // Start from hidden position
    bannerAnim.setValue(-80);
    Animated.timing(bannerAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    // Auto-hide after 4s
    hideTimeoutRef.current = setTimeout(() => {
      hideBanner();
    }, 4000);
  };

  const hideBanner = () => {
    Animated.timing(bannerAnim, {
      toValue: -80,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setBanner(null);
    });
  };

  const handleBannerPress = () => {
    if (!banner) return;
    hideBanner();

    if (banner.type === "court") {
      navigation.navigate("CourtChat", {
        courtId: banner.courtId,
        courtName: banner.courtName,
        courtAddress: banner.courtAddress || "",
        courtImage: banner.courtImage || null,
      });
    } else {
      const isGroup = !!banner.isGroup;
      const title = isGroup
        ? banner.groupTitle || banner.fromName || "Group chat"
        : banner.fromName;

      navigation.navigate("DirectMessage", {
        conversationId: banner.conversationId,
        otherUserId: isGroup ? null : banner.otherUserId,
        otherUsername: isGroup ? null : banner.fromName,
        otherProfilePic: isGroup ? null : banner.otherProfilePic || null,
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
        lastConvTimestampsRef.current[d.id] = updatedMs;

        if (updatedMs <= prevMs) return;

        const lastSender = data.lastMessageSenderId;
        if (!lastSender || lastSender === currentUser.uid) {
          return;
        }

        const isGroup =
          data.type === "group" || (participants && participants.length > 2);

        const pInfo = data.participantInfo || {};
        const senderInfo = pInfo[lastSender] || {};

        const fromName =
          senderInfo.username ||
          (senderInfo.email
            ? senderInfo.email.split("@")[0]
            : "Player");

        const groupTitle = isGroup ? data.name || "Group chat" : null;

        let textPreview = data.lastMessage || "";
        if (!textPreview && data.lastMessageType === "gif") {
          textPreview = "GIF";
        }
        if (!textPreview) textPreview = "New message";

        showBanner({
          type: "dm",
          fromName,
          textPreview,
          conversationId: d.id,
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
          return;
        }

        const senderName = data.lastMessageSenderName || "Player";
        const courtName = data.name || "Court Chat";

        let textPreview = data.lastMessage || "";
        if (!textPreview && data.lastMessageType === "gif") {
          textPreview = "GIF";
        }
        if (!textPreview) textPreview = "New message";

        showBanner({
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

        const chatLocation = data.chatType === "court"
          ? ` in ${data.courtName}`
          : data.isGroup
          ? ` in ${data.chatName}`
          : "";

        showBanner({
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
          otherProfilePic: data.reactorProfilePic || null,
        });

        try {
          await updateDoc(doc(db, "users", user.uid, "notifications", d.id), { read: true });
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

  if (!banner) return null;

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        { transform: [{ translateY: bannerAnim }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.banner}
        onPress={handleBannerPress}
      >
        <View style={styles.avatarWrap}>
          {banner.otherProfilePic ? (
            <Image
              source={{ uri: banner.otherProfilePic }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {banner.fromName?.[0]?.toUpperCase() || "U"}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.bannerTitle}>
            {banner.type === "reaction"
              ? `${banner.fromName} reacted${banner.chatLocation || ""}`
              : banner.type === "court"
              ? `${banner.fromName} in ${banner.courtName}`
              : banner.isGroup
              ? `${banner.fromName} in ${banner.groupTitle}`
              : `Message from ${banner.fromName}`}
          </Text>
          <Text
            style={styles.bannerPreview}
            numberOfLines={2}
          >
            {banner.textPreview}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 50,
    zIndex: 9999,
    paddingHorizontal: 12,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.98)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
    backgroundColor: "#020617",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  avatarInitial: {
    color: "#e5f3ff",
    fontWeight: "700",
    fontSize: 16,
  },
  bannerTitle: {
    color: "#e5f3ff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  bannerPreview: {
    color: "#9ca3af",
    fontSize: 13,
  },
});

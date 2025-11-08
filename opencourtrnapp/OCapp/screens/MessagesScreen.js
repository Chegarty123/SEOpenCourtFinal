// screens/MessagesScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  StatusBar,
  Platform,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp,
  where,
  query,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export default function MessagesScreen({ navigation }) {
  const currentUser = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [me, setMe] = useState(null);
  const [friends, setFriends] = useState([]);
  const [newChatVisible, setNewChatVisible] = useState(false);
  const [creatingFor, setCreatingFor] = useState(null);

  // Load my user doc & friends
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const myRef = doc(db, "users", currentUser.uid);
    const unsub = onSnapshot(myRef, async (snap) => {
      if (!snap.exists()) {
        setMe(null);
        setFriends([]);
        return;
      }
      const data = snap.data();
      const meObj = { uid: currentUser.uid, ...data };
      setMe(meObj);

      const friendIds = data.friends || [];
      if (friendIds.length === 0) {
        setFriends([]);
      } else {
        const profiles = await Promise.all(
          friendIds.map(async (fid) => {
            try {
              const fSnap = await getDoc(doc(db, "users", fid));
              if (!fSnap.exists()) return null;
              return { id: fid, ...fSnap.data() };
            } catch (err) {
              console.log("Error fetching friend profile:", err);
              return null;
            }
          })
        );
        setFriends(profiles.filter(Boolean));
      }
    });

    return () => unsub();
  }, [currentUser]);

  // Load existing conversations (client-side filter by participants)
  useEffect(() => {
    if (!currentUser) return;

    const convRef = collection(db, "dmConversations");

    const unsub = onSnapshot(
      convRef,
      (snap) => {
        const arr = [];
        snap.forEach((d) => {
          const data = d.data();
          const participants = data.participants || [];

          // only keep convos that include this user
          if (!participants.includes(currentUser.uid)) return;

          const otherId =
            participants.find((p) => p !== currentUser.uid) ||
            currentUser.uid;
          const pInfo = data.participantInfo || {};
          const otherInfo = pInfo[otherId] || {};

          arr.push({
            id: d.id,
            participants,
            otherId,
            otherName:
              otherInfo.username ||
              (otherInfo.email
                ? otherInfo.email.split("@")[0]
                : "Player"),
            otherProfilePic: otherInfo.profilePic || null,
            lastMessage: data.lastMessage || "",
            lastMessageType: data.lastMessageType || "text",
            lastMessageSenderId: data.lastMessageSenderId || null,
            updatedAt: data.updatedAt || data.createdAt || null,
            readBy: data.readBy || {},
          });
        });

        // newest → oldest by updatedAt
        arr.sort((a, b) => {
          const ta =
            a.updatedAt && typeof a.updatedAt.toMillis === "function"
              ? a.updatedAt.toMillis()
              : 0;
          const tb =
            b.updatedAt && typeof b.updatedAt.toMillis === "function"
              ? b.updatedAt.toMillis()
              : 0;
          return tb - ta;
        });

        setConversations(arr);
        setLoading(false);
      },
      (err) => {
        console.log("Error loading conversations:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  const formatTime = (ts) => {
    if (!ts || typeof ts.toDate !== "function") return "";
    const date = ts.toDate();
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (isToday) {
      const hours = date.getHours();
      const mins = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const hh = hours % 12 === 0 ? 12 : hours % 12;
      const mm = mins < 10 ? `0${mins}` : mins;
      return `${hh}:${mm} ${ampm}`;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // base preview (with sent/read if last msg from me)
  const previewText = (conv) => {
    const base =
      !conv.lastMessage
        ? "Start the conversation"
        : conv.lastMessageType === "gif"
        ? "GIF"
        : conv.lastMessage;

    if (!currentUser) return base;

    const sentByMe = conv.lastMessageSenderId === currentUser.uid;
    if (!sentByMe) return base;

    const readBy = conv.readBy || {};
    const otherRead = readBy[conv.otherId];
    let prefix = "Sent · ";

    if (
      otherRead &&
      typeof otherRead.toMillis === "function" &&
      conv.updatedAt &&
      typeof conv.updatedAt.toMillis === "function"
    ) {
      const isRead = otherRead.toMillis() >= conv.updatedAt.toMillis();
      prefix = isRead ? "Read · " : "Sent · ";
    }

    return `${prefix}${base}`;
  };

  // unread logic per conversation
  const hasUnread = (conv) => {
    if (!currentUser) return false;

    // if last message is from YOU, consider it read from your perspective
    if (
      !conv.lastMessageSenderId ||
      conv.lastMessageSenderId === currentUser.uid
    ) {
      return false;
    }

    const readBy = conv.readBy || {};
    const myRead = readBy[currentUser.uid];

    // never recorded a read time for this convo yet
    if (!myRead) return true;

    if (
      !conv.updatedAt ||
      typeof conv.updatedAt.toMillis !== "function" ||
      typeof myRead.toMillis !== "function"
    ) {
      return false;
    }

    // if convo updated after your last read, and last msg is from other → unread
    return conv.updatedAt.toMillis() > myRead.toMillis();
  };

  const openConversation = (conv) => {
    navigation.navigate("DirectMessage", {
      conversationId: conv.id,
      otherUserId: conv.otherId,
      otherUsername: conv.otherName,
      otherProfilePic: conv.otherProfilePic,
    });
  };

  // no duplicate conversations per friend
  const startConversation = async (friend) => {
    if (!currentUser || !me || !friend) return;

    setCreatingFor(friend.id);
    try {
      // 1) check local list first
      const existingLocal = conversations.find(
        (c) =>
          c.participants &&
          c.participants.length === 2 &&
          c.participants.includes(currentUser.uid) &&
          c.participants.includes(friend.id)
      );

      if (existingLocal) {
        setNewChatVisible(false);
        setCreatingFor(null);
        navigation.navigate("DirectMessage", {
          conversationId: existingLocal.id,
          otherUserId: friend.id,
          otherUsername: friend.username,
          otherProfilePic: friend.profilePic || null,
        });
        return;
      }

      // 2) double-check on Firestore (in case conversations state is stale)
      const convRef = collection(db, "dmConversations");
      const q = query(
        convRef,
        where("participants", "array-contains", currentUser.uid)
      );
      const snap = await getDocs(q);

      let existingRemote = null;
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const parts = data.participants || [];
        if (parts.includes(friend.id)) {
          existingRemote = {
            id: docSnap.id,
            data,
          };
        }
      });

      if (existingRemote) {
        setNewChatVisible(false);
        setCreatingFor(null);
        navigation.navigate("DirectMessage", {
          conversationId: existingRemote.id,
          otherUserId: friend.id,
          otherUsername: friend.username,
          otherProfilePic: friend.profilePic || null,
        });
        return;
      }

      // 3) actually create a new conversation
      const newConvRef = await addDoc(collection(db, "dmConversations"), {
        participants: [currentUser.uid, friend.id],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: "",
        lastMessageType: null,
        lastMessageSenderId: null,
        participantInfo: {
          [currentUser.uid]: {
            username:
              me.username ||
              (me.email ? me.email.split("@")[0] : "You"),
            profilePic: me.profilePic || null,
          },
          [friend.id]: {
            username: friend.username,
            profilePic: friend.profilePic || null,
          },
        },
      });

      setNewChatVisible(false);
      setCreatingFor(null);

      navigation.navigate("DirectMessage", {
        conversationId: newConvRef.id,
        otherUserId: friend.id,
        otherUsername: friend.username,
        otherProfilePic: friend.profilePic || null,
      });
    } catch (err) {
      console.log("Error starting conversation:", err);
      setCreatingFor(null);
    }
  };

  // delete a conversation
  const handleDeleteConversation = (conv) => {
    Alert.alert(
      "Delete conversation?",
      `This will remove your DM with ${conv.otherName} from Messages.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "dmConversations", conv.id));
            } catch (err) {
              console.log("Error deleting conversation:", err);
            }
          },
        },
      ]
    );
  };

  const renderConversationRow = ({ item }) => {
    const unread = hasUnread(item);

    return (
      <TouchableOpacity
        style={ui.convRow}
        onPress={() => openConversation(item)}
        onLongPress={() => handleDeleteConversation(item)}
        delayLongPress={300}
        activeOpacity={0.9}
      >
        <View style={ui.avatarWrap}>
          {item.otherProfilePic ? (
            <Image source={{ uri: item.otherProfilePic }} style={ui.avatar} />
          ) : (
            <View style={ui.avatarPlaceholder}>
              <Text style={ui.avatarInitial}>
                {item.otherName?.[0]?.toUpperCase() || "U"}
              </Text>
            </View>
          )}
        </View>

        <View style={ui.convTextWrap}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={[ui.convName, unread && ui.convNameUnread]}
              numberOfLines={1}
            >
              {item.otherName}
            </Text>
          </View>
          <Text
            style={[ui.convPreview, unread && ui.convPreviewUnread]}
            numberOfLines={1}
          >
            {previewText(item)}
          </Text>
        </View>

        <View style={ui.timeWrap}>
          <Text style={ui.convTime}>{formatTime(item.updatedAt)}</Text>
          <Ionicons name="chevron-forward" size={16} color="#6b7280" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderFriendRow = (friend) => (
    <TouchableOpacity
      key={friend.id}
      style={ui.friendRow}
      onPress={() => startConversation(friend)}
      activeOpacity={0.9}
    >
      <View style={ui.friendAvatarWrap}>
        {friend.profilePic ? (
          <Image source={{ uri: friend.profilePic }} style={ui.friendAvatar} />
        ) : (
          <View style={ui.friendAvatarPlaceholder}>
            <Text style={ui.friendAvatarInitial}>
              {friend.username?.[0]?.toUpperCase() || "U"}
            </Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ui.friendName}>{friend.username}</Text>
        <Text style={ui.friendSub}>Tap to start a new chat</Text>
      </View>
      {creatingFor === friend.id && (
        <ActivityIndicator size="small" color="#60a5fa" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[
        ui.screen,
        { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
      ]}
    >
      <StatusBar barStyle="light-content" />

      {/* header */}
      <View style={ui.header}>
        <Text style={ui.headerTitle}>Messages</Text>
        <TouchableOpacity
          onPress={() => setNewChatVisible(true)}
          style={ui.headerIconBtn}
        >
          <Ionicons name="create-outline" size={20} color="#e5e7eb" />
        </TouchableOpacity>
      </View>

      {/* body */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={ui.centered}>
            <ActivityIndicator size="large" color="#60a5fa" />
          </View>
        ) : conversations.length === 0 ? (
          <View style={ui.emptyState}>
            <Ionicons name="chatbubbles-outline" size={40} color="#9ca3af" />
            <Text style={ui.emptyTitle}>No messages yet</Text>
            <Text style={ui.emptyText}>
              Start a conversation with one of your friends.
            </Text>
            <TouchableOpacity
              onPress={() => setNewChatVisible(true)}
              style={ui.emptyButton}
            >
              <Text style={ui.emptyButtonText}>New message</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversationRow}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
          />
        )}
      </View>

      {/* New Chat Modal */}
      <Modal
        visible={newChatVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNewChatVisible(false)}
      >
        <View style={ui.modalBackdrop}>
          <View style={ui.modalContainer}>
            <View style={ui.modalHeader}>
              <Text style={ui.modalTitle}>New message</Text>
              <TouchableOpacity onPress={() => setNewChatVisible(false)}>
                <Ionicons name="close" size={24} color="#e5e7eb" />
              </TouchableOpacity>
            </View>

            {friends.length === 0 ? (
              <View style={{ paddingVertical: 20 }}>
                <Text style={ui.emptyText}>
                  You don&apos;t have any friends yet.
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {friends.map(renderFriendRow)}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const ui = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e5f3ff",
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    backgroundColor: "#020617",
    marginRight: 10,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e5f3ff",
  },
  convTextWrap: {
    flex: 1,
  },
  convName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e5f3ff",
  },
  convNameUnread: {
    fontWeight: "700",
    color: "#e5f3ff",
  },
  convPreview: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },
  convPreviewUnread: {
    fontWeight: "600",
    color: "#e5f3ff",
  },
  timeWrap: {
    marginLeft: 8,
    alignItems: "flex-end",
  },
  convTime: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#e5f3ff",
  },
  emptyText: {
    marginTop: 4,
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: "#2563eb",
    borderRadius: 999,
  },
  emptyButtonText: {
    color: "#f9fafb",
    fontWeight: "700",
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.9)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "75%",
    backgroundColor: "rgba(15,23,42,0.98)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e5f3ff",
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  friendAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
    backgroundColor: "#020617",
    marginRight: 10,
  },
  friendAvatar: {
    width: "100%",
    height: "100%",
  },
  friendAvatarPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  friendAvatarInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e5f3ff",
  },
  friendName: {
    fontSize: 15,
    color: "#f9fafb",
    fontWeight: "600",
  },
  friendSub: {
    fontSize: 12,
    color: "#9ca3af",
  },
});

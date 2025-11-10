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
  TextInput,
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

// Helper to build a nice default group name from participant info
const buildGroupTitle = (participants, participantInfo, myId) => {
  const others = (participants || []).filter((p) => p !== myId);
  const names = others.map((pid) => {
    const info = participantInfo?.[pid] || {};
    if (info.username) return info.username;
    if (info.email) return info.email.split("@")[0];
    return "Player";
  });

  if (!names.length) return "Group chat";
  if (names.length <= 3) return names.join(", ");

  const firstTwo = names.slice(0, 2).join(", ");
  const remaining = names.length - 2;
  return `${firstTwo} +${remaining}`;
};

export default function MessagesScreen({ navigation }) {
  const currentUser = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [me, setMe] = useState(null);
  const [friends, setFriends] = useState([]);
  const [newChatVisible, setNewChatVisible] = useState(false);
  const [creatingFor, setCreatingFor] = useState(null);

  // NEW: group-chat creation state
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // NEW: live user profiles from users collection (for up-to-date avatars)
  const [userProfiles, setUserProfiles] = useState({});

  const resetNewChatState = () => {
    setCreatingFor(null);
    setSelectedFriends([]);
    setGroupName("");
    setCreatingGroup(false);
  };

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

          const pInfo = data.participantInfo || {};
          const isGroup =
            data.type === "group" || (participants && participants.length > 2);

          let otherId = null;
          let otherInfo = {};
          let otherName = "";
          let otherProfilePic = null;

          if (isGroup) {
            const title =
              data.name ||
              buildGroupTitle(participants, pInfo, currentUser.uid);
            otherName = title;
          } else {
            otherId =
              participants.find((p) => p !== currentUser.uid) ||
              currentUser.uid;
            otherInfo = pInfo[otherId] || {};
            otherName =
              otherInfo.username ||
              (otherInfo.email
                ? otherInfo.email.split("@")[0]
                : "Player");
            otherProfilePic = otherInfo.profilePic || null;
          }

          const convType = isGroup ? "group" : (data.type || "dm");
          const title =
            isGroup ? (data.name || otherName || "Group chat") : otherName;

          arr.push({
            id: d.id,
            participants,
            type: convType,
            isGroup,
            name: data.name || (isGroup ? otherName : null),
            title,
            otherId,
            otherName,
            otherProfilePic,
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

  // NEW: Load live profile data for conversation participants from users collection
  useEffect(() => {
    if (!currentUser || conversations.length === 0) {
      setUserProfiles({});
      return;
    }

    const otherIdsSet = new Set();

    conversations.forEach((conv) => {
      (conv.participants || []).forEach((p) => {
        if (p && p !== currentUser.uid) {
          otherIdsSet.add(p);
        }
      });
    });

    const otherIds = Array.from(otherIdsSet);
    if (otherIds.length === 0) {
      setUserProfiles({});
      return;
    }

    const fetchProfiles = async () => {
      try {
        const entries = await Promise.all(
          otherIds.map(async (uid) => {
            try {
              const snap = await getDoc(doc(db, "users", uid));
              if (!snap.exists()) return null;
              const d = snap.data() || {};
              return [
                uid,
                {
                  username:
                    d.username ||
                    (d.email ? d.email.split("@")[0] : "Player"),
                  profilePic: d.profilePic || null,
                },
              ];
            } catch (err) {
              console.log("Error fetching user profile for messages:", err);
              return null;
            }
          })
        );

        const map = {};
        entries.forEach((entry) => {
          if (!entry) return;
          const [uid, profile] = entry;
          map[uid] = profile;
        });

        setUserProfiles(map);
      } catch (err) {
        console.log("Error building userProfiles map:", err);
      }
    };

    fetchProfiles();
  }, [currentUser, conversations]);

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

    // For group chats, just show the base preview (no Sent/Read prefix for now)
    if (conv.isGroup) return base;

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
    const liveProfile =
      !conv.isGroup && conv.otherId ? userProfiles[conv.otherId] : null;

    const finalName = conv.isGroup
      ? conv.title || conv.otherName
      : liveProfile?.username || conv.otherName;

    const finalAvatar = conv.isGroup
      ? null
      : liveProfile?.profilePic || conv.otherProfilePic || null;

    navigation.navigate("DirectMessage", {
      conversationId: conv.id,
      otherUserId: conv.isGroup ? null : conv.otherId,
      otherUsername: conv.isGroup ? null : finalName,
      otherProfilePic: finalAvatar,
      isGroup: !!conv.isGroup,
      title: finalName,
    });
  };

  // no duplicate conversations per friend (1:1 DM)
  const startConversation = async (friend) => {
    if (!currentUser || !me || !friend) return;

    setCreatingFor(friend.id);
    try {
      // 1) check local list first
      const existingLocal = conversations.find(
        (c) =>
          !c.isGroup &&
          c.participants &&
          c.participants.length === 2 &&
          c.participants.includes(currentUser.uid) &&
          c.participants.includes(friend.id)
      );

      if (existingLocal) {
        setNewChatVisible(false);
        resetNewChatState();
        navigation.navigate("DirectMessage", {
          conversationId: existingLocal.id,
          otherUserId: friend.id,
          otherUsername: friend.username,
          otherProfilePic: friend.profilePic || null,
          isGroup: false,
          title: friend.username,
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
        const isGroupRemote =
          data.type === "group" || (parts && parts.length > 2);
        if (!isGroupRemote && parts.includes(friend.id)) {
          existingRemote = {
            id: docSnap.id,
            data,
          };
        }
      });

      if (existingRemote) {
        setNewChatVisible(false);
        resetNewChatState();
        navigation.navigate("DirectMessage", {
          conversationId: existingRemote.id,
          otherUserId: friend.id,
          otherUsername: friend.username,
          otherProfilePic: friend.profilePic || null,
          isGroup: false,
          title: friend.username,
        });
        return;
      }

      // 3) actually create a new conversation
      const newConvRef = await addDoc(collection(db, "dmConversations"), {
        type: "dm",
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
      resetNewChatState();

      navigation.navigate("DirectMessage", {
        conversationId: newConvRef.id,
        otherUserId: friend.id,
        otherUsername: friend.username,
        otherProfilePic: friend.profilePic || null,
        isGroup: false,
        title: friend.username,
      });
    } catch (err) {
      console.log("Error starting conversation:", err);
      setCreatingFor(null);
    }
  };

  // NEW: toggle friend selection for group chat
  const toggleFriendSelected = (friendId) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  // NEW: create a group conversation with selected friends
  const createGroupConversation = async () => {
    if (!currentUser || !me) return;
    if (selectedFriends.length < 2) {
      Alert.alert(
        "Add more friends",
        "Pick at least two friends to start a group chat."
      );
      return;
    }

    const trimmedName = groupName.trim();
    if (!trimmedName) {
      Alert.alert("Name your group", "Please enter a group name.");
      return;
    }

    setCreatingGroup(true);
    try {
      const participantIds = [currentUser.uid, ...selectedFriends];

      const participantInfo = {
        [currentUser.uid]: {
          username:
            me.username ||
            (me.email ? me.email.split("@")[0] : "You"),
          profilePic: me.profilePic || null,
        },
      };

      selectedFriends.forEach((fid) => {
        const f = friends.find((fr) => fr.id === fid);
        if (!f) return;
        participantInfo[f.id] = {
          username:
            f.username ||
            (f.email ? f.email.split("@")[0] : "Player"),
          profilePic: f.profilePic || null,
        };
      });

      const newConvRef = await addDoc(collection(db, "dmConversations"), {
        type: "group",
        name: trimmedName,
        participants: participantIds,
        participantInfo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: "",
        lastMessageType: null,
        lastMessageSenderId: null,
        readBy: {},
      });

      setNewChatVisible(false);
      resetNewChatState();

      navigation.navigate("DirectMessage", {
        conversationId: newConvRef.id,
        otherUserId: null,
        otherUsername: null,
        otherProfilePic: null,
        isGroup: true,
        title: trimmedName,
      });
    } catch (err) {
      console.log("Error creating group conversation:", err);
      setCreatingGroup(false);
    }
  };

  // delete a conversation
  const handleDeleteConversation = (conv) => {
    const titleForAlert = conv.isGroup
      ? conv.title || "this group"
      : conv.otherName;

    Alert.alert(
      "Delete conversation?",
      `This will remove ${titleForAlert} from Messages on your device.`,
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

    // Live profile (from users) for 1:1 DMs
    const liveProfile =
      !item.isGroup && item.otherId ? userProfiles[item.otherId] : null;

    const displayName = item.isGroup
      ? item.title || item.otherName
      : liveProfile?.username || item.otherName;

    const avatarUri = liveProfile?.profilePic || item.otherProfilePic || null;

    // For group chats, get profile pictures of other members
    const getGroupAvatars = () => {
      if (!item.isGroup) return [];
      const otherMembers = (item.participants || [])
        .filter((p) => p !== currentUser?.uid)
        .slice(0, 2); // Get first 2 members (excluding current user)

      return otherMembers.map((memberId) => {
        const profile = userProfiles[memberId];
        return {
          id: memberId,
          profilePic: profile?.profilePic,
          username: profile?.username || item.participantInfo?.[memberId]?.username || "U",
        };
      });
    };

    const groupAvatars = item.isGroup ? getGroupAvatars() : [];

    return (
      <TouchableOpacity
        style={ui.convRow}
        onPress={() => openConversation(item)}
        onLongPress={() => handleDeleteConversation(item)}
        delayLongPress={300}
        activeOpacity={0.9}
      >
        <View style={ui.avatarWrap}>
          {item.isGroup ? (
            <View style={ui.groupAvatarContainer}>
              {groupAvatars.length >= 2 ? (
                <>
                  {/* First avatar (back) */}
                  {groupAvatars[1].profilePic ? (
                    <Image
                      source={{ uri: groupAvatars[1].profilePic }}
                      style={[ui.groupAvatar, ui.groupAvatarBack]}
                    />
                  ) : (
                    <View style={[ui.groupAvatarPlaceholder, ui.groupAvatarBack]}>
                      <Text style={ui.groupAvatarInitial}>
                        {groupAvatars[1].username[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {/* Second avatar (front) */}
                  {groupAvatars[0].profilePic ? (
                    <Image
                      source={{ uri: groupAvatars[0].profilePic }}
                      style={[ui.groupAvatar, ui.groupAvatarFront]}
                    />
                  ) : (
                    <View style={[ui.groupAvatarPlaceholder, ui.groupAvatarFront]}>
                      <Text style={ui.groupAvatarInitial}>
                        {groupAvatars[0].username[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </>
              ) : groupAvatars.length === 1 ? (
                // Only one other member
                groupAvatars[0].profilePic ? (
                  <Image
                    source={{ uri: groupAvatars[0].profilePic }}
                    style={ui.avatar}
                  />
                ) : (
                  <View style={ui.avatarPlaceholder}>
                    <Text style={ui.avatarInitial}>
                      {groupAvatars[0].username[0]?.toUpperCase()}
                    </Text>
                  </View>
                )
              ) : (
                // Fallback to icon if no members found
                <View style={[ui.avatarPlaceholder, { backgroundColor: "#020617" }]}>
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color="#93c5fd"
                    style={{ marginBottom: 1 }}
                  />
                </View>
              )}
            </View>
          ) : avatarUri ? (
            <Image source={{ uri: avatarUri }} style={ui.avatar} />
          ) : (
            <View style={ui.avatarPlaceholder}>
              <Text style={ui.avatarInitial}>
                {displayName?.[0]?.toUpperCase() || "U"}
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
              {displayName}
            </Text>
            {item.isGroup && (
              <View style={ui.groupChip}>
                <Ionicons
                  name="people-outline"
                  size={11}
                  color="#93c5fd"
                  style={{ marginRight: 4 }}
                />
                <Text style={ui.groupChipText}>Group</Text>
              </View>
            )}
          </View>
          <Text
            style={[ui.convPreview, unread && ui.convPreviewUnread]}
            numberOfLines={1}
          >
            {previewText(item)}
          </Text>
        </View>

        <View style={ui.timeWrap}>
          <Text style={[ui.convTime, unread && ui.convTimeUnread]}>
            {formatTime(item.updatedAt)}
          </Text>
          {unread ? (
            <View style={ui.unreadDot} />
          ) : (
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFriendRow = (friend) => {
    const isSelected = selectedFriends.includes(friend.id);
    const anySelected = selectedFriends.length > 0;

    const onPress = () => {
      if (anySelected) {
        toggleFriendSelected(friend.id);
      } else {
        startConversation(friend);
      }
    };

    const onLongPress = () => {
      toggleFriendSelected(friend.id);
    };

    return (
      <TouchableOpacity
        key={friend.id}
        style={[
          ui.friendRow,
          isSelected && { backgroundColor: "#020617", borderColor: "#60a5fa" },
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={250}
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
          <Text style={ui.friendSub}>
            {isSelected
              ? "Selected for group chat"
              : anySelected
              ? "Tap to toggle selection"
              : "Tap to start a DM • long-press for group"}
          </Text>
        </View>
        {creatingFor === friend.id && !anySelected ? (
          <ActivityIndicator size="small" color="#60a5fa" />
        ) : isSelected ? (
          <Ionicons name="checkmark-circle" size={22} color="#60a5fa" />
        ) : null}
      </TouchableOpacity>
    );
  };

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
          onPress={() => {
            resetNewChatState();
            setNewChatVisible(true);
          }}
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
              onPress={() => {
                resetNewChatState();
                setNewChatVisible(true);
              }}
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
        onRequestClose={() => {
          setNewChatVisible(false);
          resetNewChatState();
        }}
      >
        <View style={ui.modalBackdrop}>
          <View style={ui.modalContainer}>
            <View style={ui.modalHeader}>
              <Text style={ui.modalTitle}>New message</Text>
              <TouchableOpacity
                onPress={() => {
                  setNewChatVisible(false);
                  resetNewChatState();
                }}
              >
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
              <>
                <Text style={ui.selectionHint}>
                  Tap a friend to start a DM. Long-press to select multiple for a
                  group chat.
                </Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 10 }}
                >
                  {friends.map(renderFriendRow)}
                </ScrollView>
              </>
            )}

            {/* Group chat builder */}
            {selectedFriends.length >= 2 && (
              <View style={ui.groupPanel}>
                <Text style={ui.groupPanelTitle}>Create group chat</Text>
                <Text style={ui.groupMembersText}>
                  {selectedFriends.length} friends selected
                </Text>
                <TextInput
                  style={ui.groupInput}
                  placeholder="Group name"
                  placeholderTextColor="#6b7280"
                  value={groupName}
                  onChangeText={setGroupName}
                />
                <TouchableOpacity
                  onPress={createGroupConversation}
                  disabled={creatingGroup || !groupName.trim()}
                  style={[
                    ui.groupCreateBtn,
                    (!groupName.trim() || creatingGroup) &&
                      ui.groupCreateBtnDisabled,
                  ]}
                  activeOpacity={0.9}
                >
                  {creatingGroup ? (
                    <ActivityIndicator size="small" color="#e5e7eb" />
                  ) : (
                    <>
                      <Ionicons
                        name="people-outline"
                        size={16}
                        color="#e5e7eb"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={ui.groupCreateBtnText}>Start group chat</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e5f3ff",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 6,
  },
  emptyButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#2563eb",
  },
  emptyButtonText: {
    color: "#e5f3ff",
    fontWeight: "600",
  },
  convRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  avatarWrap: {
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#e5f3ff",
    fontWeight: "700",
    fontSize: 16,
  },
  groupAvatarContainer: {
    width: 40,
    height: 40,
    position: "relative",
  },
  groupAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#020617",
    position: "absolute",
  },
  groupAvatarBack: {
    top: 0,
    right: 0,
  },
  groupAvatarFront: {
    bottom: 0,
    left: 0,
  },
  groupAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#020617",
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  groupAvatarInitial: {
    color: "#e5f3ff",
    fontWeight: "700",
    fontSize: 11,
  },
  convTextWrap: {
    flex: 1,
  },
  convName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e5e7eb",
    marginRight: 6,
  },
  convNameUnread: {
    color: "#f9fafb",
    fontWeight: "700",
  },
  convPreview: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },
  convPreviewUnread: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  timeWrap: {
    alignItems: "flex-end",
    marginLeft: 8,
    justifyContent: "center",
  },
  convTime: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
  },
  convTimeUnread: {
    color: "#60a5fa",
    fontWeight: "600",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#60a5fa",
    marginTop: 2,
  },
  groupChip: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.8)",
    backgroundColor: "rgba(15,23,42,0.95)",
    flexDirection: "row",
    alignItems: "center",
  },
  groupChipText: {
    fontSize: 10,
    color: "#93c5fd",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.8)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalContainer: {
    backgroundColor: "rgba(15,23,42,0.98)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e5f3ff",
  },
  selectionHint: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 8,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  friendAvatarWrap: {
    marginRight: 10,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
  },
  friendAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  friendAvatarInitial: {
    color: "#e5f3ff",
    fontWeight: "700",
  },
  friendName: {
    fontSize: 15,
    color: "#e5e7eb",
    fontWeight: "500",
  },
  friendSub: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  groupPanel: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
  },
  groupPanelTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e5f3ff",
  },
  groupMembersText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
    marginBottom: 6,
  },
  groupInput: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#e5e7eb",
    fontSize: 14,
    backgroundColor: "#020617",
  },
  groupCreateBtn: {
    marginTop: 10,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  groupCreateBtnDisabled: {
    opacity: 0.5,
  },
  groupCreateBtnText: {
    color: "#e5f3ff",
    fontWeight: "600",
    fontSize: 14,
  },
});

// screens/DmChatScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import {
  collection,
  doc,
  onSnapshot,
  getDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { searchGifs, REACTION_EMOJIS } from "../services/gifService";
import { formatTime, formatDateLabel, getDateKey } from "../utils/dateUtils";
import { useMessages } from "../hooks/useMessages";
import { useTypingIndicator } from "../hooks/useTypingIndicator";

// Badge images
const BADGE_IMAGES = {
  "Co-Founder": require("../assets/co-founder.png"),
  "Alpha": require("../assets/alpha.png"),
  "Rookie": require("../assets/rookie.png"),
};

export default function DmChatScreen({ route, navigation }) {
  const {
    conversationId,
    otherUserId,
    otherUsername,
    otherProfilePic,
    isGroup = false,
    title,
  } = route.params || {};
  const user = auth.currentUser;

  const [myProfile, setMyProfile] = useState({
    uid: user?.uid || "me",
    name: user?.email ? user.email.split("@")[0] : "you",
  });

  // Use custom hooks for messages and typing
  const { messages, loading: messagesLoading } = useMessages(
    conversationId,
    user?.uid,
    "dm"
  );
  const { typingLabel, setTypingStatus } = useTypingIndicator(
    conversationId,
    user?.uid,
    myProfile.name,
    "dm"
  );

  const [draftMessage, setDraftMessage] = useState("");
  const chatScrollRef = useRef(null);
  const messageInputRef = useRef(null);

  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifResults, setGifResults] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);

  const [reactionPickerFor, setReactionPickerFor] = useState(null);

  // reply-to state
  const [replyingTo, setReplyingTo] = useState(null); // { id, user, text, type, gifUrl }

  const isAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const prevMsgCountRef = useRef(0);
  const initialScrollDoneRef = useRef(false);
  const [initialRenderDone, setInitialRenderDone] = useState(false);

  const lastTapRef = useRef({ time: 0, msgId: null });
  const headerSwipeStartY = useRef(null);

  const [reactionDetail, setReactionDetail] = useState(null);
  const [reactionDetailLoading, setReactionDetailLoading] =
    useState(false);

  // messagesLoaded is now handled by the messagesLoading from useMessages hook
  const messagesLoaded = !messagesLoading && messages.length >= 0;

  // read receipts state (conversation-level)
  const [readBy, setReadBy] = useState({});

  const displayTitle = title || otherUsername || "Chat";
  const headerSubtitle = isGroup ? "Group chat" : "Direct messages";
  const [participants, setParticipants] = useState([]);
  const [participantInfo, setParticipantInfo] = useState({});
  const [liveUserProfiles, setLiveUserProfiles] = useState({});
  const [userBadges, setUserBadges] = useState({}); // Store badges for each user

  const scrollToBottom = () => {
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
      isAtBottomRef.current = true;
      setIsAtBottom(true);
      setHasNewMessage(false);
    }, 50);
  };

  // auto-scroll when keyboard shows
  useEffect(() => {
    const subShow = Keyboard.addListener("keyboardDidShow", scrollToBottom);
    return () => {
      subShow.remove();
    };
  }, []);

  // Reset initial scroll flag when switching conversations
  useEffect(() => {
    initialScrollDoneRef.current = false;
    setInitialRenderDone(false);
  }, [conversationId]);

  // Time and date formatting now handled by imported utilities

  // Load my profile
  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "users", user.uid);
    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setMyProfile((prev) => ({
            ...prev,
            uid: user.uid,
            name: data.username || prev.name,
          }));
        }
      })
      .catch((err) => console.log("Error fetching user profile:", err));
  }, [user]);

  // Messages are now handled by useMessages hook
  // Detect new messages for "jump to latest" pill
  useEffect(() => {
    if (initialRenderDone && messages.length > prevMsgCountRef.current) {
      if (!isAtBottomRef.current) {
        setHasNewMessage(true);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length, initialRenderDone]);

  // Fetch badges for all message senders
  useEffect(() => {
    if (!messages.length) return;

    const fetchUserBadges = async () => {
      const uniqueUserIds = [...new Set(messages.map(m => m.userId))];
      const badgesMap = { ...userBadges };

      for (const userId of uniqueUserIds) {
        // Skip if we already have this user's badge info
        if (badgesMap[userId] !== undefined) continue;

        try {
          const userSnap = await getDoc(doc(db, "users", userId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            badgesMap[userId] = userData.selectedBadge || null;
          } else {
            badgesMap[userId] = null;
          }
        } catch (err) {
          console.log("Error fetching badge for user:", userId, err);
          badgesMap[userId] = null;
        }
      }

      setUserBadges(badgesMap);
    };

    fetchUserBadges();
  }, [messages]);

  // Typing indicator now handled by useTypingIndicator hook

  const handleChangeText = (txt) => {
    setDraftMessage(txt);
    setTypingStatus(!!txt.trim());
  };

  // Subscribe to dmConversations doc for readBy
  useEffect(() => {
    if (!conversationId) return;

    const convRef = doc(db, "dmConversations", conversationId);
    const unsub = onSnapshot(convRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setReadBy(data.readBy || {});

      // 👇 NEW: group meta
      setParticipants(data.participants || []);
      setParticipantInfo(data.participantInfo || {});
    });

    return () => unsub();
  }, [conversationId]);

  // Load live user profiles for group chat avatars
  useEffect(() => {
    if (!isGroup || participants.length === 0) {
      setLiveUserProfiles({});
      return;
    }

    const fetchProfiles = async () => {
      try {
        const otherMembers = participants.filter((p) => p !== user?.uid).slice(0, 2);
        const profiles = await Promise.all(
          otherMembers.map(async (uid) => {
            try {
              const snap = await getDoc(doc(db, "users", uid));
              if (!snap.exists()) return null;
              const data = snap.data();
              return [uid, {
                username: data.username || (data.email ? data.email.split("@")[0] : "Player"),
                profilePic: data.profilePic || null,
              }];
            } catch (err) {
              console.log("Error fetching profile for group avatar:", err);
              return null;
            }
          })
        );

        const profileMap = {};
        profiles.forEach((entry) => {
          if (entry) {
            const [uid, profile] = entry;
            profileMap[uid] = profile;
          }
        });

        setLiveUserProfiles(profileMap);
      } catch (err) {
        console.log("Error loading group member profiles:", err);
      }
    };

    fetchProfiles();
  }, [isGroup, participants, user]);


  // Mark conversation read for me
  const markConversationRead = async () => {
    if (!conversationId || !user) return;
    try {
      const convRef = doc(db, "dmConversations", conversationId);
      const field = `readBy.${user.uid}`;
      await updateDoc(convRef, { [field]: serverTimestamp() });
    } catch (err) {
      console.log("Error marking conversation read:", err);
    }
  };

  // initial read mark on mount / convo change
  useEffect(() => {
    markConversationRead();
  }, [conversationId]);

  // mark read whenever message count changes
  useEffect(() => {
    if (!messages.length) return;
    markConversationRead();
  }, [messages.length]);

  const updateConversationMeta = async (messageType, textForPreview) => {
    if (!conversationId || !user) return;
    try {
      const convRef = doc(db, "dmConversations", conversationId);
      const preview =
        messageType === "gif"
          ? "[GIF]"
          : (textForPreview || "").slice(0, 300);

      await updateDoc(convRef, {
        lastMessage: preview,
        lastMessageType: messageType,
        lastMessageSenderId: user.uid,
        updatedAt: serverTimestamp(),
        [`readBy.${user.uid}`]: serverTimestamp(),
      });
    } catch (err) {
      console.log("Error updating conversation meta:", err);
    }
  };

  const handleSend = async () => {
    const trimmed = draftMessage.trim();
    if (!trimmed || !conversationId || !user) return;

    try {
      const msgsRef = collection(
        db,
        "dmConversations",
        conversationId,
        "messages"
      );

      const newMsg = {
        text: trimmed,
        userId: user.uid,
        username: myProfile.name,
        type: "text",
        gifUrl: null,
        ts: serverTimestamp(),
        reactions: {},
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              user: replyingTo.user,
              text: replyingTo.text || "",
              type: replyingTo.type,
              gifUrl: replyingTo.gifUrl || null,
            }
          : null,
      };

      await addDoc(msgsRef, newMsg);
      setDraftMessage("");
      setTypingStatus(false);
      setReplyingTo(null);
      scrollToBottom();
      await updateConversationMeta("text", trimmed);
    } catch (err) {
      console.log("Error sending DM:", err);
    }
  };

  const sendGifMessage = async (gifUrl) => {
    if (!gifUrl || !conversationId || !user) return;

    try {
      const msgsRef = collection(
        db,
        "dmConversations",
        conversationId,
        "messages"
      );

      const newMsg = {
        text: "",
        userId: user.uid,
        username: myProfile.name,
        type: "gif",
        gifUrl,
        ts: serverTimestamp(),
        reactions: {},
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              user: replyingTo.user,
              text: replyingTo.text || "",
              type: replyingTo.type,
              gifUrl: replyingTo.gifUrl || null,
            }
          : null,
      };

      await addDoc(msgsRef, newMsg);
      scrollToBottom();
      setGifPickerVisible(false);
      setGifSearch("");
      setGifResults([]);
      setReplyingTo(null);
      await updateConversationMeta("gif", "");
    } catch (err) {
      console.log("Error sending GIF message:", err);
    }
  };

  // Tenor GIF search using centralized service
  const handleSearchGifs = async () => {
    if (!gifSearch.trim()) {
      setGifResults([]);
      return;
    }
    setGifLoading(true);
    try {
      const results = await searchGifs(gifSearch.trim(), 25);
      setGifResults(results);
    } catch (err) {
      console.log("Error fetching GIFs:", err);
    } finally {
      setGifLoading(false);
    }
  };

  // Typing label now provided by useTypingIndicator hook

  const handlePressUser = (userId) => {
    if (!userId) return;
    navigation.navigate("UserProfile", { userId });
  };

  // Double-tap to heart
  const handleMessagePress = (msgId) => {
    const now = Date.now();
    const { time, msgId: lastId } = lastTapRef.current;

    if (lastId === msgId && now - time < 250) {
      toggleReaction(msgId, "❤️");
    }

    lastTapRef.current = { time: now, msgId };
  };

  const toggleReaction = async (msgId, emoji) => {
    if (!conversationId || !user || !msgId || !emoji) return;

    try {
      const msgRef = doc(
        db,
        "dmConversations",
        conversationId,
        "messages",
        msgId
      );
      const snap = await getDoc(msgRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const reactions = data.reactions || {};

      // First, remove user from all other emojis (one reaction per user)
      const updatedReactions = {};
      Object.keys(reactions).forEach((key) => {
        const reactionList = Array.isArray(reactions[key]) ? reactions[key] : [];
        updatedReactions[key] = reactionList.filter((u) => u !== user.uid);
      });

      // Then toggle the selected emoji
      const currentUsers = updatedReactions[emoji] || [];
      const wasAlreadyReacted = reactions[emoji]?.includes(user.uid);

      if (wasAlreadyReacted) {
        // Remove reaction (already filtered above)
        updatedReactions[emoji] = currentUsers;
      } else {
        // Add new reaction
        updatedReactions[emoji] = [...currentUsers, user.uid];
      }

      await updateDoc(msgRef, { reactions: updatedReactions });
    } catch (err) {
      console.log("Error toggling reaction:", err);
    }
  };

  const openReactionPicker = (msgId) => {
    setReactionPickerFor(msgId);
  };

  const closeReactionPicker = () => {
    setReactionPickerFor(null);
  };

  // Start replying to a specific message
  const startReplyToMessage = (message) => {
    if (!message) return;
    setReplyingTo({
      id: message.id,
      user: message.user,
      text: message.text || "",
      type: message.type || (message.gifUrl ? "gif" : "text"),
      gifUrl: message.gifUrl || null,
    });
    closeReactionPicker();
    // Auto-focus the input to bring up the keyboard
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Delete / unsend message (guarded: only your own messages)
  const handleDeleteMessage = async (messageId) => {
    if (!conversationId || !user || !messageId) return;
    try {
      const msgRef = doc(
        db,
        "dmConversations",
        conversationId,
        "messages",
        messageId
      );

      // Safety check: only allow deleting your own messages
      const snap = await getDoc(msgRef);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.userId !== user.uid) {
        console.log("Blocked delete for non-owned message");
        return;
      }

      await deleteDoc(msgRef);
      closeReactionPicker();
    } catch (err) {
      console.log("Error deleting message:", err);
    }
  };

  // Reaction details ("who reacted with what")
  const openReactionDetails = async (message) => {
    const reactions = message.reactions || {};
    const entries = Object.entries(reactions).filter(
      ([, users]) => Array.isArray(users) && users.length > 0
    );
    if (!entries.length) return;

    setReactionDetailLoading(true);
    setReactionDetail({ messageId: message.id, entries: [] });

    try {
      const detailedEntries = await Promise.all(
        entries.map(async ([emoji, userIds]) => {
          const users = await Promise.all(
            userIds.map(async (uid) => {
              try {
                const snap = await getDoc(doc(db, "users", uid));
                if (snap.exists()) {
                  const data = snap.data();
                  const name =
                    data.username ||
                    (data.email ? data.email.split("@")[0] : "Player");
                  return { id: uid, name };
                }
              } catch (err) {
                console.log("Error fetching user for reaction:", err);
              }
              return { id: uid, name: "Player" };
            })
          );
          return { emoji, users };
        })
      );

      setReactionDetail({
        messageId: message.id,
        entries: detailedEntries,
      });
    } catch (err) {
      console.log("Error building reaction detail:", err);
    } finally {
      setReactionDetailLoading(false);
    }
  };

  const closeReactionDetails = () => {
    setReactionDetail(null);
    setReactionDetailLoading(false);
  };

  // Placeholder text but with Court-style input layout
  const inputPlaceholder = isGroup
    ? "Message this group…"
    : `Message ${otherUsername || "your friend"}…`;

  return (
    <View style={{ flex: 1, backgroundColor: "#020617" }}>
      <StatusBar barStyle="light-content" />
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 50,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#1f2937",
          backgroundColor: "#020617",
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(15,23,42,0.9)",
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.5)",
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#e5e7eb" />
        </TouchableOpacity>

        <View
          style={{
            marginLeft: 12,
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
          }}
        >
          {/* Avatar section */}
          {isGroup ? (
            // Group chat: show stacked avatars
            <View
              style={{
                width: 32,
                height: 32,
                marginRight: 8,
                position: "relative",
              }}
            >
              {(() => {
                const otherMembers = participants.filter((p) => p !== user?.uid).slice(0, 2);
                const groupAvatars = otherMembers.map((memberId) => {
                  const profile = liveUserProfiles[memberId] || participantInfo[memberId] || {};
                  return {
                    id: memberId,
                    profilePic: profile.profilePic,
                    username: profile.username || "U",
                  };
                });

                if (groupAvatars.length >= 2) {
                  return (
                    <>
                      {/* First avatar (back) */}
                      {groupAvatars[1].profilePic ? (
                        <Image
                          source={{ uri: groupAvatars[1].profilePic }}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 2,
                            borderColor: "#020617",
                            position: "absolute",
                            top: 0,
                            right: 0,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 2,
                            borderColor: "#020617",
                            backgroundColor: "#0f172a",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "absolute",
                            top: 0,
                            right: 0,
                          }}
                        >
                          <Text
                            style={{
                              color: "#e5f3ff",
                              fontWeight: "700",
                              fontSize: 9,
                            }}
                          >
                            {groupAvatars[1].username[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {/* Second avatar (front) */}
                      {groupAvatars[0].profilePic ? (
                        <Image
                          source={{ uri: groupAvatars[0].profilePic }}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 2,
                            borderColor: "#020617",
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 2,
                            borderColor: "#020617",
                            backgroundColor: "#0f172a",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                          }}
                        >
                          <Text
                            style={{
                              color: "#e5f3ff",
                              fontWeight: "700",
                              fontSize: 9,
                            }}
                          >
                            {groupAvatars[0].username[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </>
                  );
                } else if (groupAvatars.length === 1) {
                  // Only one other member - show single avatar
                  return groupAvatars[0].profilePic ? (
                    <Image
                      source={{ uri: groupAvatars[0].profilePic }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "rgba(148,163,184,0.6)",
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "rgba(148,163,184,0.6)",
                        backgroundColor: "#0f172a",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#e5f3ff",
                          fontWeight: "700",
                        }}
                      >
                        {groupAvatars[0].username[0]?.toUpperCase()}
                      </Text>
                    </View>
                  );
                } else {
                  // Fallback to icon
                  return (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "rgba(148,163,184,0.6)",
                        backgroundColor: "#0f172a",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="people-outline" size={16} color="#93c5fd" />
                    </View>
                  );
                }
              })()}
            </View>
          ) : (
            // 1:1 DM: show single avatar
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.6)",
                backgroundColor: "#020617",
                marginRight: 8,
              }}
            >
              {otherProfilePic ? (
                <Image
                  source={{ uri: otherProfilePic }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0f172a",
                  }}
                >
                  <Text
                    style={{
                      color: "#e5f3ff",
                      fontWeight: "700",
                    }}
                  >
                    {displayTitle?.[0]?.toUpperCase() || "C"}
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.7}
            onPress={() => {
              if (isGroup) {
                navigation.navigate("GroupChatSettings", {
                  conversationId,
                  groupName: displayTitle,
                });
              } else if (otherUserId) {
                navigation.navigate("UserProfile", { userId: otherUserId });
              }
            }}
          >
            <Text
              style={{
                color: "#e5f3ff",
                fontSize: 16,
                fontWeight: "700",
              }}
              numberOfLines={1}
            >
              {displayTitle}
            </Text>
            <Text
              style={{
                color: "#9ca3af",
                fontSize: 12,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {headerSubtitle}
            </Text>
          </TouchableOpacity>

          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.7)",
              backgroundColor: "rgba(15,23,42,0.96)",
              flexDirection: "row",
              alignItems: "center",
              opacity: 0.9,
            }}
          >
            <Ionicons
              name={isGroup ? "people-outline" : "chatbubble-ellipses-outline"}
              size={14}
              color="#93c5fd"
              style={{ marginRight: 4 }}
            />
            <Text
              style={{
                color: "#93c5fd",
                fontSize: 11,
                fontWeight: "600",
                textTransform: "uppercase",
              }}
            >
              {isGroup ? "Group" : "1:1"}
            </Text>
          </View>
        </View>
      </View>

      {/* CHAT BODY */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={chatScrollRef}
            style={{
              flex: 1,
              paddingHorizontal: 12,
              paddingTop: 12,
              opacity: initialRenderDone || messages.length === 0 ? 1 : 0,
            }}
            contentContainerStyle={{
              paddingBottom: 16,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={() => {
              // First load: jump to bottom without animation, then fade in
              if (!initialScrollDoneRef.current) {
                if (messages.length === 0) return;
                initialScrollDoneRef.current = true;
                chatScrollRef.current?.scrollToEnd({ animated: false });
                setInitialRenderDone(true);
                return;
              }
              // After that, only auto-scroll if the user is already at the bottom
              if (isAtBottomRef.current) {
                scrollToBottom();
              }
            }}
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } =
                nativeEvent;
              const paddingToBottom = 40;
              const atBottom =
                layoutMeasurement.height + contentOffset.y >=
                contentSize.height - paddingToBottom;

              setIsAtBottom(atBottom);
              isAtBottomRef.current = atBottom;
              if (atBottom) {
                setHasNewMessage(false);
              }
            }}
            scrollEventThrottle={16}
          >
            {messagesLoaded && messages.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  marginTop: 40,
                }}
              >
                <Text style={{ color: "#64748b" }}>
                  No messages yet. Say hi!
                </Text>
              </View>
            ) : null}

            {(() => {
              let lastDateKey = null;
              return messages.map((m) => {
                const reactions = m.reactions || {};
                const reactionEntries = Object.entries(reactions).filter(
                  ([, users]) => Array.isArray(users) && users.length > 0
                );

                const isMine = m.mine;
                const bubbleAlign = isMine ? "flex-end" : "flex-start";
                const bgColor = isMine
                  ? "rgba(59,130,246,0.15)"
                  : "rgba(30,41,59,0.6)";

                // sent/read receipt per message (1:1 only)
                let receiptLabel = "";
                let isReadByOther = false;
                if (
                  !isGroup &&
                  isMine &&
                  m.ts &&
                  typeof m.ts.toMillis === "function"
                ) {
                  const otherReadTs = otherUserId
                    ? readBy?.[otherUserId]
                    : null;
                  if (
                    otherReadTs &&
                    typeof otherReadTs.toMillis === "function"
                  ) {
                    isReadByOther =
                      otherReadTs.toMillis() >= m.ts.toMillis();
                    receiptLabel = isReadByOther ? "Read" : "Sent";
                  } else {
                    receiptLabel = "Sent";
                  }
                }

                let dateLabel = "";
                if (m.ts && typeof m.ts.toDate === "function") {
                  const key = getDateKey(m.ts);
                  if (key !== lastDateKey) {
                    lastDateKey = key;
                    dateLabel = formatDateLabel(m.ts);
                  }
                }

                return (
                  <View key={m.id} style={{ marginBottom: 10 }}>
                    {dateLabel ? (
                      <View
                        style={{
                          alignItems: "center",
                          marginVertical: 16,
                          position: "relative",
                        }}
                      >
                        <View
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: 0,
                            right: 0,
                            height: 1,
                            backgroundColor: "rgba(148,163,184,0.25)",
                          }}
                        />
                        <View
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 4,
                            borderRadius: 999,
                            backgroundColor: "#0f172a",
                            borderWidth: 1,
                            borderColor: "rgba(148,163,184,0.7)",
                          }}
                        >
                          <Text
                            style={{
                              color: "#e5f3ff",
                              fontSize: 12,
                              fontWeight: "700",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {dateLabel}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    <View
                      style={{
                        alignItems: bubbleAlign,
                      }}
                    >
                      {/* Emoji reactions row - ABOVE message bubble */}
                      {reactionPickerFor === m.id && (
                        <View
                          style={{
                            flexDirection: "row",
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            alignItems: "center",
                            backgroundColor: "rgba(15,23,42,0.95)",
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: "rgba(148,163,184,0.3)",
                            marginBottom: 6,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 5,
                          }}
                        >
                          {REACTION_EMOJIS.map((emoji, idx) => (
                            <TouchableOpacity
                              key={emoji}
                              activeOpacity={0.6}
                              style={{
                                marginRight: idx === REACTION_EMOJIS.length - 1 ? 0 : 6,
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "rgba(30,41,59,0.8)",
                              }}
                              onPress={() => {
                                toggleReaction(m.id, emoji);
                                closeReactionPicker();
                              }}
                            >
                              <Text style={{ fontSize: 20 }}>{emoji}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      <TouchableOpacity
                        activeOpacity={0.85}
                        onLongPress={() => openReactionPicker(m.id)}
                        onPress={() => handleMessagePress(m.id)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 18,
                          maxWidth: "78%",
                          backgroundColor: bgColor,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 2,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: isMine ? "#93c5fd" : "#cbd5e1",
                            }}
                          >
                            {isMine ? "You" : m.user}
                          </Text>
                          {userBadges[m.userId] && BADGE_IMAGES[userBadges[m.userId]] && (
                            <Image
                              source={BADGE_IMAGES[userBadges[m.userId]]}
                              style={{ width: 16, height: 16, marginLeft: 4 }}
                            />
                          )}
                        </View>

                        {/* replied-to snippet */}
                        {m.replyTo && (
                          <View
                            style={{
                              marginBottom: 4,
                              paddingVertical: 4,
                              paddingHorizontal: 8,
                              borderLeftWidth: 2,
                              borderLeftColor: "rgba(96,165,250,0.9)",
                              backgroundColor: "rgba(15,23,42,0.9)",
                              borderRadius: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "600",
                                color: "#bfdbfe",
                                marginBottom: 2,
                              }}
                              numberOfLines={1}
                            >
                              {m.replyTo.user === myProfile.name
                                ? "You"
                                : m.replyTo.user}
                            </Text>
                            {m.replyTo.type === "gif" && m.replyTo.gifUrl ? (
                              <Image
                                source={{ uri: m.replyTo.gifUrl }}
                                style={{
                                  width: 80,
                                  height: 80,
                                  borderRadius: 6,
                                  backgroundColor: "#020617",
                                }}
                                resizeMode="cover"
                              />
                            ) : (
                              <Text
                                style={{ fontSize: 12, color: "#e5e7eb" }}
                              >
                                {m.replyTo.text || ""}
                              </Text>
                            )}
                          </View>
                        )}

                        {m.type === "gif" && m.gifUrl ? (
                          <Image
                            source={{ uri: m.gifUrl }}
                            style={{
                              width: 200,
                              height: 180,
                              borderRadius: 10,
                              backgroundColor: "#020617",
                            }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text
                            style={{
                              color: "#f1f5f9",
                              fontSize: 15,
                              lineHeight: 21,
                            }}
                          >
                            {m.text}
                          </Text>
                        )}

                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: "#9ca3af",
                              fontSize: 11,
                            }}
                          >
                            {formatTime(m.ts)}
                            {receiptLabel
                              ? isMine
                                ? ` • ${receiptLabel}`
                                : ""
                              : ""}
                          </Text>

                          {reactionEntries.length > 0 && (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginRight: 4,
                                gap: 4,
                              }}
                            >
                              {reactionEntries.map(
                                ([emoji, users], idx) => {
                                  const hasReacted = users.includes(user.uid);
                                  return (
                                    <TouchableOpacity
                                      key={`${m.id}-${emoji}-${idx}`}
                                      onPress={() =>
                                        toggleReaction(m.id, emoji)
                                      }
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 12,
                                        backgroundColor: hasReacted
                                          ? "rgba(59,130,246,0.2)"
                                          : "rgba(15,23,42,0.6)",
                                        borderWidth: 1,
                                        borderColor: hasReacted
                                          ? "rgba(59,130,246,0.5)"
                                          : "rgba(148,163,184,0.3)",
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 14,
                                          marginRight: 4,
                                        }}
                                      >
                                        {emoji}
                                      </Text>
                                      <Text
                                        style={{
                                          fontSize: 12,
                                          color: hasReacted ? "#93c5fd" : "#9ca3af",
                                          fontWeight: hasReacted ? "600" : "400",
                                        }}
                                      >
                                        {users.length}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                }
                              )}

                              <TouchableOpacity
                                onPress={() => openReactionDetails(m)}
                                style={{
                                  marginLeft: 2,
                                  paddingHorizontal: 2,
                                }}
                              >
                                <Ionicons
                                  name="information-circle-outline"
                                  size={14}
                                  color="#cbd5f5"
                                />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* Action buttons row - BELOW message bubble */}
                      {reactionPickerFor === m.id && (
                        <View
                          style={{
                            marginTop: 6,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {/* Reply button */}
                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 16,
                              backgroundColor: "rgba(15,23,42,0.95)",
                              borderWidth: 1,
                              borderColor: "rgba(59,130,246,0.4)",
                              flexDirection: "row",
                              alignItems: "center",
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.2,
                              shadowRadius: 3,
                              elevation: 3,
                            }}
                            onPress={() => startReplyToMessage(m)}
                          >
                            <Ionicons
                              name="arrow-undo-outline"
                              size={16}
                              color="#93c5fd"
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              style={{
                                color: "#93c5fd",
                                fontSize: 14,
                                fontWeight: "600",
                              }}
                            >
                              Reply
                            </Text>
                          </TouchableOpacity>

                          {/* Delete button only for your own messages */}
                          {isMine && (
                            <TouchableOpacity
                              activeOpacity={0.7}
                              style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 16,
                                backgroundColor: "rgba(15,23,42,0.95)",
                                borderWidth: 1,
                                borderColor: "rgba(239,68,68,0.4)",
                                flexDirection: "row",
                                alignItems: "center",
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.2,
                                shadowRadius: 3,
                                elevation: 3,
                              }}
                              onPress={() => handleDeleteMessage(m.id)}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={16}
                                color="#fca5a5"
                                style={{ marginRight: 6 }}
                              />
                              <Text
                                style={{
                                  color: "#fca5a5",
                                  fontSize: 14,
                                  fontWeight: "600",
                                }}
                              >
                                Delete
                              </Text>
                            </TouchableOpacity>
                          )}

                          {/* Close button */}
                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 16,
                              backgroundColor: "rgba(15,23,42,0.95)",
                              borderWidth: 1,
                              borderColor: "rgba(148,163,184,0.3)",
                              alignItems: "center",
                              justifyContent: "center",
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.2,
                              shadowRadius: 3,
                              elevation: 3,
                            }}
                            onPress={closeReactionPicker}
                          >
                            <Ionicons
                              name="close"
                              size={18}
                              color="#9ca3af"
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              });
            })()}
          </ScrollView>

          {hasNewMessage && !isAtBottom && (
            <TouchableOpacity
              onPress={scrollToBottom}
              style={{
                position: "absolute",
                bottom: 76,
                alignSelf: "center",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "rgba(15,23,42,0.95)",
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.8)",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="arrow-down-circle-outline"
                size={16}
                color="#93c5fd"
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  color: "#e5f3ff",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Jump to latest
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Typing indicator */}
        {!!typingLabel && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 4,
            }}
          >
            <Text style={{ color: "#9ca3af", fontSize: 12 }}>
              {typingLabel}
            </Text>
          </View>
        )}

        {/* Replying bar */}
        {replyingTo && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 6,
              backgroundColor: "#020617",
              borderTopWidth: 1,
              borderTopColor: "#1f2937",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  flex: 1,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderLeftWidth: 3,
                  borderLeftColor: "#60a5fa",
                  backgroundColor: "#020617",
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: "#9ca3af",
                    fontSize: 11,
                    marginBottom: 2,
                  }}
                  numberOfLines={1}
                >
                  Replying to{" "}
                  {replyingTo.user === myProfile.name ? "you" : replyingTo.user}
                </Text>
                {replyingTo.type === "gif" && replyingTo.gifUrl ? (
                  <Image
                    source={{ uri: replyingTo.gifUrl }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 6,
                      backgroundColor: "#020617",
                      marginTop: 2,
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    style={{ color: "#e5e7eb", fontSize: 13 }}
                  >
                    {replyingTo.text || ""}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={cancelReply}
                style={{ marginLeft: 8, padding: 4 }}
              >
                <Ionicons name="close" size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* INPUT BAR — now matches CourtChatScreen */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: "#1f2937",
            backgroundColor: "#020617",
            marginBottom: 4,
          }}
        >
          <TouchableOpacity
            onPress={() => setGifPickerVisible(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#0f172a",
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.7)",
              marginRight: 8,
              marginBottom: 4,
            }}
          >
            <Ionicons name="image-outline" size={20} color="#e5e7eb" />
          </TouchableOpacity>

          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "flex-end",
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 20,
              backgroundColor: "#020617",
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.9)",
              maxHeight: 120,
            }}
          >
            <TextInput
              ref={messageInputRef}
              style={{
                flex: 1,
                color: "#e5e7eb",
                fontSize: 15,
                paddingVertical: 8,
                maxHeight: 100,
              }}
              placeholder={inputPlaceholder}
              placeholderTextColor="#6b7280"
              value={draftMessage}
              onChangeText={handleChangeText}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              multiline
              textAlignVertical="center"
            />
            <TouchableOpacity
              onPress={handleSend}
              style={{
                marginLeft: 6,
                marginBottom: 4,
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: draftMessage.trim()
                  ? "#2563eb"
                  : "rgba(31,41,55,0.9)",
              }}
            >
              <Ionicons
                name="paper-plane"
                size={17}
                color={draftMessage.trim() ? "#eff6ff" : "#6b7280"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* GIF PICKER MODAL — now matches CourtChatScreen */}
      <Modal
        visible={gifPickerVisible}
        animationType="slide"
        onRequestClose={() => setGifPickerVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#020617" }}>
          {/* GIF picker header (swipe down here to close) */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingTop: 50,
              paddingHorizontal: 16,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#1f2937",
              backgroundColor: "#020617",
            }}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) => {
              headerSwipeStartY.current = e.nativeEvent.pageY;
            }}
            onResponderRelease={(e) => {
              if (headerSwipeStartY.current != null) {
                const deltaY =
                  e.nativeEvent.pageY - headerSwipeStartY.current;
                if (deltaY > 50) {
                  setGifPickerVisible(false);
                }
              }
              headerSwipeStartY.current = null;
            }}
          >
            <TouchableOpacity
              onPress={() => setGifPickerVisible(false)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(15,23,42,0.9)",
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.7)",
                marginRight: 10,
              }}
            >
              <Ionicons name="chevron-down" size={22} color="#e5e7eb" />
            </TouchableOpacity>

            <Text
              style={{
                color: "#f9fafb",
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              Search GIFs
            </Text>
          </View>

          {/* Search input */}
          <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.7)",
                borderRadius: 10,
                paddingHorizontal: 10,
                marginBottom: 10,
                backgroundColor: "#020617",
              }}
            >
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                style={{
                  flex: 1,
                  marginLeft: 6,
                  paddingVertical: 8,
                  color: "#e5f3ff",
                }}
                placeholder="Search GIFs (e.g. dunk, hype)"
                placeholderTextColor="#9ca3af"
                value={gifSearch}
                onChangeText={setGifSearch}
                onSubmitEditing={handleSearchGifs}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={handleSearchGifs}>
                <Ionicons
                  name="arrow-forward-circle"
                  size={22}
                  color="#60a5fa"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* GIF results */}
          <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 4 }}>
            {gifLoading ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator size="large" color="#60a5fa" />
                <Text
                  style={{
                    color: "#9ca3af",
                    marginTop: 10,
                  }}
                >
                  Loading GIFs...
                </Text>
              </View>
            ) : (
              <FlatList
                data={gifResults}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={{
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
                contentContainerStyle={{
                  paddingHorizontal: 4,
                  paddingTop: 4,
                  paddingBottom: 16,
                }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => sendGifMessage(item.url)}
                    style={{
                      width: "49%",
                      aspectRatio: 1,
                      borderRadius: 8,
                      overflow: "hidden",
                      backgroundColor: "#020617",
                      borderWidth: 1,
                      borderColor: "#1f2937",
                    }}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 8,
                      }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text
                    style={{
                      color: "#9ca3af",
                      textAlign: "center",
                      marginTop: 8,
                    }}
                  >
                    Search for a GIF to get started
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* REACTION DETAILS (unchanged) */}
      <Modal
        visible={!!reactionDetail}
        transparent
        animationType="fade"
        onRequestClose={closeReactionDetails}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.8)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#020617",
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.8)",
              width: "80%",
              maxHeight: "70%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color: "#e5f3ff",
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                Reactions
              </Text>
              <TouchableOpacity onPress={closeReactionDetails}>
                <Ionicons name="close" size={20} color="#e5e7eb" />
              </TouchableOpacity>
            </View>

            {reactionDetailLoading ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="small" color="#60a5fa" />
              </View>
            ) : reactionDetail && reactionDetail.entries.length > 0 ? (
              <ScrollView>
                {reactionDetail.entries.map((entry) => (
                  <View key={entry.emoji} style={{ marginBottom: 10 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ fontSize: 18, marginRight: 6 }}>
                        {entry.emoji}
                      </Text>
                      <Text
                        style={{
                          color: "#e5f3ff",
                          fontSize: 13,
                          fontWeight: "600",
                        }}
                      >
                        {entry.users.length}{" "}
                        {entry.users.length === 1 ? "person" : "people"}
                      </Text>
                    </View>
                    {entry.users.map((u) => (
                      <TouchableOpacity
                        key={u.id}
                        onPress={() => {
                          closeReactionDetails();
                          handlePressUser(u.id);
                        }}
                        style={{
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: "#cbd5f5",
                            fontSize: 13,
                          }}
                        >
                          {u.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={{ color: "#9ca3af", fontSize: 13 }}>
                No reactions yet.
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

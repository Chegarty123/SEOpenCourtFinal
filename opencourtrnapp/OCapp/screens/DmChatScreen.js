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
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import {
  collection,
  doc,
  onSnapshot,
  getDoc,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { searchGifs, REACTION_EMOJIS } from "../services/gifService";
import { formatTime, formatDateLabel, getDateKey } from "../utils/dateUtils";

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

  const [messages, setMessages] = useState([]);
  const [draftMessage, setDraftMessage] = useState("");
  const chatScrollRef = useRef(null);

  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifResults, setGifResults] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);

  const [typingUsers, setTypingUsers] = useState([]);
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
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  // read receipts state (conversation-level)
  const [readBy, setReadBy] = useState({});

  const displayTitle = title || otherUsername || "Chat";
  const headerSubtitle = isGroup ? "Group chat" : "Direct messages";
  const [participants, setParticipants] = useState([]);
  const [participantInfo, setParticipantInfo] = useState({});
  const [showGroupMembers, setShowGroupMembers] = useState(false);

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

  // Subscribe to messages for this conversation
  useEffect(() => {
    if (!conversationId || !user) return;

    const msgsRef = collection(
      db,
      "dmConversations",
      conversationId,
      "messages"
    );
    const qMsgs = query(msgsRef, orderBy("ts", "asc"));

    const unsub = onSnapshot(qMsgs, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          text: data.text || "",
          ts: data.ts || data.createdAt || null,
          userId: data.userId,
          user:
            data.username ||
            data.user ||
            (data.userId === user.uid ? "You" : "Player"),
          type: data.type || "text",
          gifUrl: data.gifUrl || null,
          reactions: data.reactions || {},
          mine: data.userId === user.uid,
          replyTo: data.replyTo || null,
        });
      });
      setMessages(list);

      // new message detection for "jump to latest" pill
      if (initialRenderDone && list.length > prevMsgCountRef.current) {
        if (!isAtBottomRef.current) {
          setHasNewMessage(true);
        }
      }
      prevMsgCountRef.current = list.length;

      setMessagesLoaded(true);
    });

    return () => unsub();
  }, [conversationId, user, initialRenderDone]);

  // Typing indicator subscription
  useEffect(() => {
    if (!conversationId || !user) return;

    const typingRef = collection(
      db,
      "dmConversations",
      conversationId,
      "typing"
    );
    const qTyping = query(typingRef);

    const unsub = onSnapshot(qTyping, (snap) => {
      const arr = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const uid = data.userId;
        if (uid && uid !== user.uid && data.isTyping) {
          const name =
            data.username ||
            (data.email ? data.email.split("@")[0] : "Player");
          arr.push(name);
        }
      });
      setTypingUsers(arr);
    });

    return () => unsub();
  }, [conversationId, user]);

  const setTypingStatus = async (isTyping) => {
    if (!conversationId || !user) return;
    try {
      const typingDoc = doc(
        db,
        "dmConversations",
        conversationId,
        "typing",
        user.uid
      );
      await setDoc(
        typingDoc,
        {
          userId: user.uid,
          username: myProfile.name,
          isTyping,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.log("Error updating typing status:", err);
    }
  };

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

  // Typing label
  let typingLabel = "";
  if (typingUsers.length === 1) {
    typingLabel = `${typingUsers[0]} is typing...`;
  } else if (typingUsers.length === 2) {
    typingLabel = `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
  } else if (typingUsers.length > 2) {
    typingLabel = `${typingUsers[0]} and ${
      typingUsers.length - 1
    } others are typing...`;
  }

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
      const currentList = Array.isArray(reactions[emoji])
        ? reactions[emoji]
        : [];

      const alreadyReacted = currentList.includes(user.uid);
      let newList;
      if (alreadyReacted) {
        newList = currentList.filter((uid) => uid !== user.uid);
      } else {
        newList = [...currentList, user.uid];
      }

      const updatedReactions = {
        ...reactions,
        [emoji]: newList,
      };

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

          <View style={{ flex: 1 }}>
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
          </View>

          <Pressable
            disabled={!isGroup}
            onPress={() => {
              if (isGroup) setShowGroupMembers(true);
            }}
            style={({ pressed }) => [
              {
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.7)",
                backgroundColor: "rgba(15,23,42,0.96)",
                flexDirection: "row",
                alignItems: "center",
                opacity: isGroup ? 1 : 0.9,
              },
              isGroup &&
                pressed && {
                  backgroundColor: "rgba(37,99,235,0.35)",
                  transform: [{ scale: 0.96 }],
                },
            ]}
            android_ripple={
              isGroup
                ? { color: "rgba(148,163,184,0.4)", borderless: true }
                : undefined
            }
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
          </Pressable>
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
                const bgColor = isMine ? "#0f172a" : "#020617";
                const borderColor = isMine
                  ? "rgba(96,165,250,0.7)"
                  : "rgba(148,163,184,0.6)";

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
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onLongPress={() => openReactionPicker(m.id)}
                        onPress={() => handleMessagePress(m.id)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 12,
                          maxWidth: "78%",
                          backgroundColor: bgColor,
                          borderWidth: 1,
                          borderColor,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            marginBottom: 2,
                            color: isMine ? "#e5f3ff" : "#cbd5f5",
                          }}
                        >
                          {isMine ? "You" : m.user}
                        </Text>

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
                            <Text
                              style={{ fontSize: 12, color: "#e5e7eb" }}
                              numberOfLines={1}
                            >
                              {m.replyTo.type === "gif"
                                ? "[GIF]"
                                : m.replyTo.text || ""}
                            </Text>
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
                              color: "#e5e7eb",
                              fontSize: 15,
                              lineHeight: 20,
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
                                marginRight: 0,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 999,
                                backgroundColor: "rgba(15,23,42,0.9)",
                                borderWidth: 1,
                                borderColor: "rgba(148,163,184,0.7)",
                              }}
                            >
                              {reactionEntries.map(
                                ([emoji, users], idx) => (
                                  <TouchableOpacity
                                    key={`${m.id}-${emoji}-${idx}`}
                                    onPress={() =>
                                      toggleReaction(m.id, emoji)
                                    }
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      marginRight: 4,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 12,
                                        color: "#e5e7eb",
                                      }}
                                    >
                                      {emoji} {users.length}
                                    </Text>
                                  </TouchableOpacity>
                                )
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

                      {/* Inline reaction picker, CourtChat-style */}
                      {reactionPickerFor === m.id && (
                        <View
                          style={{
                            flexDirection: "row",
                            marginTop: 4,
                            paddingHorizontal: 8,
                            alignItems: "center",
                          }}
                        >
                          {REACTION_EMOJIS.map((emoji) => (
                            <TouchableOpacity
                              key={emoji}
                              style={{
                                marginRight: 8,
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#0f172a",
                                borderWidth: 1,
                                borderColor: "rgba(148,163,184,0.8)",
                              }}
                              onPress={() => {
                                toggleReaction(m.id, emoji);
                                closeReactionPicker();
                              }}
                            >
                              <Text style={{ fontSize: 18 }}>{emoji}</Text>
                            </TouchableOpacity>
                          ))}

                          {/* Reply button */}
                          <TouchableOpacity
                            style={{
                              marginRight: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 999,
                              backgroundColor: "#0f172a",
                              borderWidth: 1,
                              borderColor: "rgba(96,165,250,0.8)",
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                            onPress={() => startReplyToMessage(m)}
                          >
                            <Ionicons
                              name="return-down-back"
                              size={14}
                              color="#bfdbfe"
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={{
                                color: "#bfdbfe",
                                fontSize: 12,
                                fontWeight: "600",
                              }}
                            >
                              Reply
                            </Text>
                          </TouchableOpacity>

                          {/* Delete button only for your own messages */}
                          {isMine && (
                            <TouchableOpacity
                              style={{
                                marginRight: 8,
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#1f2937",
                                borderWidth: 1,
                                borderColor: "rgba(248,113,113,0.7)",
                              }}
                              onPress={() => handleDeleteMessage(m.id)}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color="#fca5a5"
                              />
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={{
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            onPress={closeReactionPicker}
                          >
                            <Ionicons
                              name="close-circle-outline"
                              size={22}
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
                <Text
                  style={{ color: "#e5e7eb", fontSize: 13 }}
                  numberOfLines={1}
                >
                  {replyingTo.type === "gif"
                    ? "[GIF]"
                    : replyingTo.text || ""}
                </Text>
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
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: "#1f2937",
            backgroundColor: "#020617",
            marginBottom: 4, // lift slightly off bottom
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
            }}
          >
            <Ionicons name="image-outline" size={20} color="#e5e7eb" />
          </TouchableOpacity>

          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: "#020617",
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.9)",
            }}
          >
            <TextInput
              style={{
                flex: 1,
                color: "#e5e7eb",
                fontSize: 15,
                paddingVertical: 6,
              }}
              placeholder={inputPlaceholder}
              placeholderTextColor="#6b7280"
              value={draftMessage}
              onChangeText={handleChangeText}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              onPress={handleSend}
              style={{
                marginLeft: 6,
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

            {/* GROUP MEMBERS MODAL */}
            {isGroup && (
        <Modal
          visible={showGroupMembers}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGroupMembers(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(15,23,42,0.8)",
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 16,
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(15,23,42,0.98)",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.8)",
                width: "85%",
                maxHeight: "70%",
                padding: 16,
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
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  Group members
                </Text>
                <TouchableOpacity
                  onPress={() => setShowGroupMembers(false)}
                >
                  <Ionicons name="close" size={20} color="#e5e7eb" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 6 }}
              >
                {(participants.length
                  ? participants
                  : Object.keys(participantInfo || {})
                ).map((uid) => {
                  const info = participantInfo?.[uid] || {};
                  const isMe = uid === user?.uid;
                  const displayName =
                    info.username ||
                    (info.email ? info.email.split("@")[0] : "Player");

                  return (
                    <TouchableOpacity
                      key={uid}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 6,
                      }}
                      onPress={() => {
                        setShowGroupMembers(false);
                        if (!isMe) {
                          navigation.navigate("UserProfile", { userId: uid });
                        }
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          marginRight: 10,
                          overflow: "hidden",
                          borderWidth: 1,
                          borderColor: "rgba(148,163,184,0.7)",
                          backgroundColor: "#020617",
                        }}
                      >
                        {info.profilePic ? (
                          <Image
                            source={{ uri: info.profilePic }}
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
                              {(displayName || "P")[0].toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: "#e5f3ff",
                            fontSize: 14,
                            fontWeight: "600",
                          }}
                          numberOfLines={1}
                        >
                          {displayName}
                          {isMe ? " (You)" : ""}
                        </Text>
                        {info.email && (
                          <Text
                            style={{
                              color: "#9ca3af",
                              fontSize: 12,
                            }}
                            numberOfLines={1}
                          >
                            {info.email}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

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

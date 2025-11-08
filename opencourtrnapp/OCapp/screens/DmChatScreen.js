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
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const TENOR_API_KEY = "AIzaSyDYgE5Z7qvK2PDPY8sg1GiqGcC_AVxFdho";
const REACTION_EMOJIS = ["👍", "🔥", "😂", "💪", "❤️"];

export default function DmChatScreen({ route, navigation }) {
  const { conversationId, otherUserId, otherUsername, otherProfilePic } =
    route.params || {};
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

  const isAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const prevMsgCountRef = useRef(0);
  const initialScrollDoneRef = useRef(false);
  const [initialRenderDone, setInitialRenderDone] = useState(false);

  const lastTapRef = useRef({ time: 0, msgId: null });
  const headerSwipeStartY = useRef(null);

  const [reactionDetail, setReactionDetail] = useState(null);
  const [reactionDetailLoading, setReactionDetailLoading] = useState(false);

  // 👇 read receipts state
  const [readBy, setReadBy] = useState({});

  const scrollToBottom = () => {
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
      isAtBottomRef.current = true;
      setIsAtBottom(true);
      setHasNewMessage(false);
    }, 50);
  };

  useEffect(() => {
    const subShow = Keyboard.addListener("keyboardDidShow", scrollToBottom);
    return () => {
      subShow.remove();
    };
  }, []);

  useEffect(() => {
    initialScrollDoneRef.current = false;
    setInitialRenderDone(false);
  }, [conversationId]);

  const renderTime = (ts) => {
    if (!ts || typeof ts.toDate !== "function") return "now";
    const dateObj = ts.toDate();
    const hours = dateObj.getHours();
    const mins = dateObj.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const hh = hours % 12 === 0 ? 12 : hours % 12;
    const mm = mins < 10 ? `0${mins}` : mins;
    return `${hh}:${mm} ${ampm}`;
  };

  const isSameDay = (d1, d2) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const formatDateLabel = (ts) => {
    if (!ts || typeof ts.toDate !== "function") return "";
    const date = ts.toDate();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(date, today)) return "Today";
    if (isSameDay(date, yesterday)) return "Yesterday";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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

  // Listen to DM messages
  useEffect(() => {
    if (!conversationId) return;

    const msgsRef = collection(
      db,
      "dmConversations",
      conversationId,
      "messages"
    );
    const qMsgs = query(msgsRef, orderBy("ts", "asc"));

    const unsub = onSnapshot(qMsgs, (snapshot) => {
      const chatArr = [];
      snapshot.forEach((d) => {
        const data = d.data();
        chatArr.push({
          id: d.id,
          userId: data.userId,
          user: data.username || "player",
          text: data.text || "",
          type: data.type || (data.gifUrl ? "gif" : "text"),
          gifUrl: data.gifUrl || null,
          reactions: data.reactions || {},
          ts: data.ts,
          mine: data.userId === user.uid,
        });
      });

      const prevCount = prevMsgCountRef.current;
      const newCount = chatArr.length;
      const gotNewMessage = newCount > prevCount;
      prevMsgCountRef.current = newCount;

      setMessages(chatArr);

      if (!isAtBottomRef.current && gotNewMessage) {
        setHasNewMessage(true);
      }
    });

    return () => unsub();
  }, [conversationId, user]);

  // Typing indicator
  useEffect(() => {
    if (!conversationId || !user) return;

    const typingRef = collection(
      db,
      "dmConversations",
      conversationId,
      "typing"
    );
    const unsub = onSnapshot(typingRef, (snap) => {
      const currentTyping = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (docSnap.id !== user.uid && data.isTyping) {
          currentTyping.push(data.username || "Someone");
        }
      });
      setTypingUsers(currentTyping);
    });

    return () => unsub();
  }, [conversationId, user]);

  const setTypingStatus = async (isTyping) => {
    if (!conversationId || !user) return;
    const typingDoc = doc(
      db,
      "dmConversations",
      conversationId,
      "typing",
      user.uid
    );
    try {
      await setDoc(
        typingDoc,
        {
          isTyping,
          username: myProfile.name || user.email.split("@")[0],
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.log("Error setting typing status:", err);
    }
  };

  const handleChangeText = (text) => {
    setDraftMessage(text);
    setTypingStatus(text.length > 0);
  };

  const updateConversationMeta = async (payload) => {
    if (!conversationId) return;
    try {
      await updateDoc(doc(db, "dmConversations", conversationId), payload);
    } catch (err) {
      console.log("Error updating conversation meta:", err);
    }
  };

  // Send text
  const handleSend = async () => {
    if (!draftMessage.trim() || !conversationId || !user) return;

    const msgsRef = collection(
      db,
      "dmConversations",
      conversationId,
      "messages"
    );

    const messageObj = {
      userId: user.uid,
      username: myProfile.name,
      text: draftMessage.trim(),
      type: "text",
      gifUrl: null,
      ts: serverTimestamp(),
      reactions: {},
    };

    try {
      await addDoc(msgsRef, messageObj);
      await updateConversationMeta({
        lastMessage: draftMessage.trim(),
        lastMessageType: "text",
        lastMessageSenderId: user.uid,
        updatedAt: serverTimestamp(),
      });
      setDraftMessage("");
      setTypingStatus(false);
      scrollToBottom();
    } catch (err) {
      console.log("Error sending message:", err);
    }
  };

  // Send GIF
  const sendGifMessage = async (gifUrl) => {
    if (!gifUrl || !conversationId || !user) return;

    const msgsRef = collection(
      db,
      "dmConversations",
      conversationId,
      "messages"
    );

    const messageObj = {
      userId: user.uid,
      username: myProfile.name,
      text: "",
      type: "gif",
      gifUrl,
      ts: serverTimestamp(),
      reactions: {},
    };

    try {
      await addDoc(msgsRef, messageObj);
      await updateConversationMeta({
        lastMessage: "GIF",
        lastMessageType: "gif",
        lastMessageSenderId: user.uid,
        updatedAt: serverTimestamp(),
      });
      setGifPickerVisible(false);
      setGifSearch("");
      setGifResults([]);
      scrollToBottom();
    } catch (err) {
      console.log("Error sending GIF message:", err);
    }
  };

  // Reactions
  const toggleReaction = async (messageId, emoji) => {
    if (!conversationId || !user) return;
    const msgRef = doc(
      db,
      "dmConversations",
      conversationId,
      "messages",
      messageId
    );

    try {
      const snap = await getDoc(msgRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const reactions = data.reactions || {};

      const currentUsers = reactions[emoji] || [];
      const updatedUsers = currentUsers.includes(user.uid)
        ? currentUsers.filter((u) => u !== user.uid)
        : [...currentUsers, user.uid];

      const updatedReactions = {
        ...reactions,
        [emoji]: updatedUsers,
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
      await deleteDoc(msgRef);
      closeReactionPicker();
    } catch (err) {
      console.log("Error deleting message:", err);
    }
  };

  // Tenor search
  const searchGifs = async () => {
    if (!gifSearch.trim()) {
      setGifResults([]);
      return;
    }
    setGifLoading(true);
    try {
      const queryStr = encodeURIComponent(gifSearch.trim());
      const url = `https://tenor.googleapis.com/v2/search?q=${queryStr}&key=${TENOR_API_KEY}&client_key=OpenCourt&limit=25`;

      const res = await fetch(url);
      const json = await res.json();

      const results = (json.results || []).map((r) => {
        const media = r.media_formats?.tinygif || r.media_formats?.gif;
        return {
          id: r.id,
          url: media?.url,
        };
      });

      setGifResults(results.filter((g) => !!g.url));
    } catch (err) {
      console.log("Error fetching GIFs:", err);
    } finally {
      setGifLoading(false);
    }
  };

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

  const handleMessagePress = (msgId) => {
    const now = Date.now();
    const { time, msgId: lastId } = lastTapRef.current;

    if (lastId === msgId && now - time < 250) {
      toggleReaction(msgId, "❤️");
    }

    lastTapRef.current = { time: now, msgId };
  };

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

  // 👇 subscribe to dmConversations doc for readBy
  useEffect(() => {
    if (!conversationId) return;

    const convRef = doc(db, "dmConversations", conversationId);
    const unsub = onSnapshot(convRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setReadBy(data.readBy || {});
    });

    return () => unsub();
  }, [conversationId]);

  // 👇 mark conversation read for me
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

  useEffect(() => {
    markConversationRead();
  }, [conversationId]);

  useEffect(() => {
    if (!messages.length) return;
    markConversationRead();
  }, [messages.length]);

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
                  {otherUsername?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#f9fafb",
                fontSize: 16,
                fontWeight: "700",
              }}
              numberOfLines={1}
            >
              {otherUsername || "Direct Message"}
            </Text>
            <Text
              style={{
                color: "#9ca3af",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              Direct messages
            </Text>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: "#0f172a",
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.6)",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={14}
            color="#e5f3ff"
          />
          <Text
            style={{
              color: "#e5f3ff",
              fontSize: 12,
              marginLeft: 4,
              fontWeight: "600",
            }}
          >
            1:1
          </Text>
        </View>
      </View>

      {/* CHAT + INPUT */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
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
              if (!initialScrollDoneRef.current) {
                if (messages.length === 0) return;
                initialScrollDoneRef.current = true;
                chatScrollRef.current?.scrollToEnd({ animated: false });
                setInitialRenderDone(true);
                return;
              }
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
            {messages.length === 0 ? (
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

                // sent/read receipt per message
                let receiptLabel = "";
                let isReadByOther = false;
                if (isMine && m.ts && typeof m.ts.toMillis === "function") {
                  const otherReadTs = readBy?.[otherUserId];
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
                  const d = m.ts.toDate();
                  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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
                            justifyContent: "flex-end",
                            marginTop: 6,
                            alignItems: "center",
                          }}
                        >
                          {reactionEntries.length > 0 && (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginRight: 6,
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

                          {receiptLabel ? (
                            <Text
                              style={{
                                fontSize: 11,
                                color: isReadByOther
                                  ? "#a5b4fc"
                                  : "#9ca3af",
                                marginRight: 6,
                              }}
                            >
                              {receiptLabel}
                            </Text>
                          ) : null}

                          <Text
                            style={{
                              fontSize: 11,
                              color: "#9ca3af",
                            }}
                          >
                            {renderTime(m.ts)}
                          </Text>
                        </View>
                      </TouchableOpacity>

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
                              <Text style={{ fontSize: 18 }}>
                                {emoji}
                              </Text>
                            </TouchableOpacity>
                          ))}

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

          {!isAtBottom && hasNewMessage && (
            <TouchableOpacity
              onPress={scrollToBottom}
              style={{
                position: "absolute",
                bottom: 74,
                alignSelf: "center",
                backgroundColor: "#0f172a",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "rgba(96,165,250,0.8)",
              }}
            >
              <Ionicons name="chevron-down" size={16} color="#bfdbfe" />
              <Text
                style={{
                  color: "#bfdbfe",
                  marginLeft: 6,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                New messages
              </Text>
            </TouchableOpacity>
          )}

          {typingLabel ? (
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 4,
                backgroundColor: "#020617",
              }}
            >
              <Text
                style={{
                  color: "#9ca3af",
                  fontSize: 12,
                  fontStyle: "italic",
                }}
              >
                {typingLabel}
              </Text>
            </View>
          ) : null}

          {/* INPUT BAR */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
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
                placeholder={
                  otherUsername
                    ? `Message ${otherUsername}…`
                    : "Message…"
                }
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
        </View>
      </KeyboardAvoidingView>

      {/* GIF PICKER */}
      <Modal
        visible={gifPickerVisible}
        animationType="slide"
        onRequestClose={() => setGifPickerVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#020617" }}>
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
                onSubmitEditing={searchGifs}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={searchGifs}>
                <Ionicons
                  name="arrow-forward-circle"
                  size={22}
                  color="#60a5fa"
                />
              </TouchableOpacity>
            </View>
          </View>

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

      {/* REACTION DETAILS MODAL */}
      <Modal
        visible={!!reactionDetail}
        transparent
        animationType="fade"
        onRequestClose={closeReactionDetails}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.75)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: "#020617",
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.7)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  color: "#e5f3ff",
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                Reactions
              </Text>
              <TouchableOpacity onPress={closeReactionDetails}>
                <Ionicons
                  name="close-circle-outline"
                  size={24}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            {reactionDetailLoading ? (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 12,
                }}
              >
                <ActivityIndicator size="small" color="#60a5fa" />
                <Text
                  style={{
                    marginTop: 8,
                    color: "#9ca3af",
                    fontSize: 13,
                  }}
                >
                  Loading reactions...
                </Text>
              </View>
            ) : !reactionDetail || !reactionDetail.entries.length ? (
              <Text
                style={{
                  color: "#9ca3af",
                  fontSize: 13,
                }}
              >
                No reactions yet.
              </Text>
            ) : (
              <ScrollView
                style={{ maxHeight: 260 }}
                contentContainerStyle={{ paddingVertical: 4 }}
              >
                {reactionDetail.entries.map((entry) => (
                  <View key={entry.emoji} style={{ marginBottom: 10 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          marginRight: 6,
                        }}
                      >
                        {entry.emoji}
                      </Text>
                      <Text
                        style={{
                          color: "#e5e7eb",
                          fontSize: 13,
                          fontWeight: "600",
                        }}
                      >
                        {entry.users.length}{" "}
                        {entry.users.length === 1 ? "person" : "people"}
                      </Text>
                    </View>
                    {entry.users.map((u) => (
                      <Text
                        key={u.id}
                        style={{
                          marginLeft: 4,
                          color: "#cbd5f5",
                          fontSize: 13,
                          marginBottom: 2,
                        }}
                      >
                        • {u.name}
                      </Text>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

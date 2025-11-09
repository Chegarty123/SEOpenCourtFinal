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
  const [messagesLoaded, setMessagesLoaded] = useState(false);


  // read receipts state (conversation-level)
  const [readBy, setReadBy] = useState({});

  const displayTitle = title || otherUsername || "Chat";
  const headerSubtitle = isGroup ? "Group chat" : "Direct messages";

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

  // Subscribe to messages for this conversation
  useEffect(() => {
    if (!conversationId || !user) return;

    const msgsRef = collection(db, "dmConversations", conversationId, "messages");
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
            data.username || (data.email ? data.email.split("@")[0] : "Player");
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
      };

      await addDoc(msgsRef, newMsg);
      setDraftMessage("");
      setTypingStatus(false);
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
      };

      await addDoc(msgsRef, newMsg);
      scrollToBottom();
      setGifPickerVisible(false);
      setGifSearch("");
      setGifResults([]);
      await updateConversationMeta("gif", "");
    } catch (err) {
      console.log("Error sending GIF message:", err);
    }
  };

  // Tenor GIF search
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

  // Delete / unsend message (only for your own messages in UI)
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
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
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
                            {renderTime(m.ts)}
                            {receiptLabel
                              ? isMine
                                ? ` • ${receiptLabel}`
                                : ""
                              : ""}
                          </Text>

                          {reactionEntries.length > 0 && (
                            <TouchableOpacity
                              onPress={() => openReactionDetails(m)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 999,
                                backgroundColor: "rgba(15,23,42,0.9)",
                              }}
                            >
                              {reactionEntries.map(([emoji, users]) => (
                                <View
                                  key={emoji}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginLeft: 4,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 13,
                                    }}
                                  >
                                    {emoji}
                                  </Text>
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      color: "#cbd5f5",
                                      marginLeft: 2,
                                    }}
                                  >
                                    {users.length}
                                  </Text>
                                </View>
                              ))}
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
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
              marginBottom: 4, // lift slightly off bottom
            }}
          >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
            }}
          >
            <TouchableOpacity
              onPress={() => setGifPickerVisible(true)}
              style={{
                marginRight: 8,
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#0f172a",
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.7)",
              }}
            >
              <Ionicons name="image-outline" size={18} color="#93c5fd" />
            </TouchableOpacity>

            <View
              style={{
                flex: 1,
                minHeight: 40,
                maxHeight: 120,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.7)",
                backgroundColor: "rgba(15,23,42,0.96)",
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <TextInput
                style={{
                  color: "#e5e7eb",
                  fontSize: 15,
                  maxHeight: 100,
                }}
                placeholder={
                  isGroup
                    ? "Message the group..."
                    : `Message ${otherUsername || "your friend"}...`
                }
                placeholderTextColor="#6b7280"
                multiline
                value={draftMessage}
                onChangeText={handleChangeText}
              />
            </View>

            <TouchableOpacity
              onPress={handleSend}
              disabled={!draftMessage.trim()}
              style={{
                marginLeft: 8,
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: draftMessage.trim()
                  ? "#2563eb"
                  : "rgba(15,23,42,0.9)",
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.7)",
              }}
            >
              <Ionicons
                name="send"
                size={18}
                color={draftMessage.trim() ? "#e5f3ff" : "#6b7280"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* GIF PICKER MODAL */}
      <Modal
        visible={gifPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGifPickerVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.9)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              maxHeight: "70%",
              backgroundColor: "#020617",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.8)",
            }}
          >
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 10,
                paddingBottom: 8,
                borderBottomWidth: 1,
                borderBottomColor: "#1f2937",
                flexDirection: "row",
                alignItems: "center",
              }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                headerSwipeStartY.current = e.nativeEvent.pageY;
              }}
              onResponderMove={(e) => {
                const startY = headerSwipeStartY.current;
                if (startY == null) return;
                const dy = e.nativeEvent.pageY - startY;
                if (dy > 70) {
                  setGifPickerVisible(false);
                  headerSwipeStartY.current = null;
                }
              }}
              onResponderRelease={() => {
                headerSwipeStartY.current = null;
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 999,
                  backgroundColor: "#4b5563",
                  marginRight: 10,
                }}
              />
              <Text
                style={{
                  color: "#e5f3ff",
                  fontSize: 15,
                  fontWeight: "600",
                  flex: 1,
                }}
              >
                Send a GIF
              </Text>
              <TouchableOpacity onPress={() => setGifPickerVisible(false)}>
                <Ionicons name="close" size={22} color="#e5e7eb" />
              </TouchableOpacity>
            </View>

            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.7)",
                  backgroundColor: "#020617",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Ionicons name="search" size={16} color="#9ca3af" />
                <TextInput
                  style={{
                    flex: 1,
                    marginLeft: 6,
                    color: "#e5e7eb",
                    fontSize: 14,
                  }}
                  placeholder="Search Tenor..."
                  placeholderTextColor="#6b7280"
                  value={gifSearch}
                  onChangeText={setGifSearch}
                  onSubmitEditing={searchGifs}
                  returnKeyType="search"
                />
              </View>
              <TouchableOpacity
                onPress={searchGifs}
                style={{
                  marginLeft: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: "#2563eb",
                }}
              >
                <Text
                  style={{
                    color: "#e5f3ff",
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Search
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                flex: 1,
                paddingHorizontal: 10,
                paddingBottom: 10,
              }}
            >
              {gifLoading ? (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ActivityIndicator size="large" color="#60a5fa" />
                </View>
              ) : (
                <FlatList
                  data={gifResults}
                  keyExtractor={(item) => item.id}
                  numColumns={3}
                  columnWrapperStyle={{ justifyContent: "space-between" }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{
                        width: "32%",
                        aspectRatio: 1,
                        borderRadius: 10,
                        overflow: "hidden",
                        marginBottom: 8,
                        backgroundColor: "#020617",
                      }}
                      onPress={() => sendGifMessage(item.url)}
                    >
                      <Image
                        source={{ uri: item.url }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 40,
                      }}
                    >
                      <Text style={{ color: "#6b7280", fontSize: 13 }}>
                        Search for a GIF to get started.
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* REACTION PICKER */}
      <Modal
        visible={!!reactionPickerFor}
        transparent
        animationType="fade"
        onRequestClose={closeReactionPicker}
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
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.8)",
              minWidth: 220,
            }}
          >
            <Text
              style={{
                color: "#e5f3ff",
                fontWeight: "600",
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              React to message
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    toggleReaction(reactionPickerFor, emoji);
                    closeReactionPicker();
                  }}
                  style={{
                    padding: 6,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => handleDeleteMessage(reactionPickerFor)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 6,
              }}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color="#fca5a5"
                style={{ marginRight: 6 }}
              />
              <Text style={{ color: "#fca5a5", fontSize: 13 }}>
                Delete for everyone
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={closeReactionPicker}
              style={{
                marginTop: 8,
                alignSelf: "flex-end",
              }}
            >
              <Text style={{ color: "#9ca3af", fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* REACTION DETAILS */}
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
                  <View
                    key={entry.emoji}
                    style={{ marginBottom: 10 }}
                  >
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

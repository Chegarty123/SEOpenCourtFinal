// screens/CourtChatScreen.js
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
} from "firebase/firestore";

const TENOR_API_KEY = "AIzaSyDYgE5Z7qvK2PDPY8sg1GiqGcC_AVxFdho"; // your Tenor key
const REACTION_EMOJIS = ["👍", "🔥", "😂", "💪", "❤️"];

export default function CourtChatScreen({ route, navigation }) {
  const { courtId, marker } = route.params || {};
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
  const [reactionPickerFor, setReactionPickerFor] = useState(null); // msg.id or null

  // scroll state for "new messages" pill
  const isAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const prevMsgCountRef = useRef(0);
  const initialScrollDoneRef = useRef(false);
  const [initialRenderDone, setInitialRenderDone] = useState(false);

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

  // Reset initial scroll flag when switching courts
  useEffect(() => {
    initialScrollDoneRef.current = false;
    setInitialRenderDone(false);
  }, [courtId]);

  // Format Firestore timestamp -> "4:33 PM"
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

  // Load my profile info
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

  // Listen to chat messages
  useEffect(() => {
    if (!courtId) return;

    const msgsRef = collection(db, "courts", courtId, "messages");
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
  }, [courtId, user]);

  // Typing indicator
  useEffect(() => {
    if (!courtId || !user) return;

    const typingRef = collection(db, "courts", courtId, "typing");
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
  }, [courtId, user]);

  // Update my typing status
  const setTypingStatus = async (isTyping) => {
    if (!courtId || !user) return;
    const typingDoc = doc(db, "courts", courtId, "typing", user.uid);
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

  // Send text message
  const handleSend = async () => {
    if (!draftMessage.trim() || !courtId || !user) return;

    const courtRef = doc(db, "courts", courtId);
    const msgsRef = collection(courtRef, "messages");

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
      setDraftMessage("");
      setTypingStatus(false);
      scrollToBottom();
    } catch (err) {
      console.log("Error sending message:", err);
    }
  };

  // Send GIF message
  const sendGifMessage = async (gifUrl) => {
    if (!gifUrl || !courtId || !user) return;

    const courtRef = doc(db, "courts", courtId);
    const msgsRef = collection(courtRef, "messages");

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
      setGifPickerVisible(false);
      setGifSearch("");
      setGifResults([]);
      scrollToBottom();
    } catch (err) {
      console.log("Error sending GIF message:", err);
    }
  };

  // Reaction toggling per user
  const toggleReaction = async (messageId, emoji) => {
    if (!courtId || !user) return;
    const msgRef = doc(db, "courts", courtId, "messages", messageId);

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

  return (
    <View style={{ flex: 1, backgroundColor: "#020617" }}>
      <StatusBar barStyle="light-content" />
      {/* HEADER BAR */}
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

        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text
            style={{
              color: "#f9fafb",
              fontSize: 16,
              fontWeight: "700",
            }}
            numberOfLines={1}
          >
            {marker?.name || "Court"}
          </Text>
          <Text
            style={{
              color: "#9ca3af",
              fontSize: 12,
              marginTop: 2,
            }}
          >
            Court chat • Open run updates
          </Text>
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
          <Ionicons name="people" size={14} color="#e5f3ff" />
          <Text
            style={{
              color: "#e5f3ff",
              fontSize: 12,
              marginLeft: 4,
              fontWeight: "600",
            }}
          >
            Live
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
            keyboardDismissMode="on-drag"   // 👈 dismiss keyboard when you scroll
            onContentSizeChange={() => {
              // First load: jump to bottom without animation
              if (!initialScrollDoneRef.current) {
                if (messages.length === 0) return;
                initialScrollDoneRef.current = true;
                chatScrollRef.current?.scrollToEnd({ animated: false });
                setInitialRenderDone(true);
                return;
              }
              // After that, only auto-scroll if user is at bottom
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
                  No messages yet. Start the conversation!
                </Text>
              </View>
            ) : null}

            {messages.map((m) => {
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

              return (
                <View
                  key={m.id}
                  style={{
                    marginBottom: 10,
                    alignItems: bubbleAlign,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onLongPress={() => openReactionPicker(m.id)}
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
                            marginRight: 6,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 999,
                            backgroundColor: "rgba(15,23,42,0.9)",
                            borderWidth: 1,
                            borderColor: "rgba(148,163,184,0.7)",
                          }}
                        >
                          {reactionEntries.map(([emoji, users], idx) => (
                            <Text
                              key={`${m.id}-${emoji}-${idx}`}
                              style={{
                                fontSize: 12,
                                marginRight: 4,
                                color: "#e5e7eb", // easier to see
                              }}
                            >
                              {emoji} {users.length}
                            </Text>
                          ))}
                        </View>
                      )}

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

                  {/* Inline reaction picker */}
                  {reactionPickerFor === m.id && (
                    <View
                      style={{
                        flexDirection: "row",
                        marginTop: 4,
                        paddingHorizontal: 8,
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
                      <TouchableOpacity
                        style={{
                          marginLeft: 4,
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
              );
            })}
          </ScrollView>

          {/* New message pill */}
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

          {/* Typing indicator */}
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
                placeholder="Message This Court…"
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

      {/* GIF PICKER MODAL */}
      <Modal
        visible={gifPickerVisible}
        animationType="slide"
        onRequestClose={() => setGifPickerVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#020617" }}>
          {/* GIF picker header */}
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
    </View>
  );
}

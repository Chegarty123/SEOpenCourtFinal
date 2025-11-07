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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { styles } from "../styles/globalStyles";

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

  // Load my profile name
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMyProfile({
          uid: user.uid,
          name: data.username || user.email.split("@")[0],
        });
      }
    });
    return () => unsub();
  }, [user]);

  // Live chat messages
  useEffect(() => {
    if (!courtId || !user) return;

    const msgsRef = collection(db, "courts", courtId, "messages");
    const qMsgs = query(msgsRef, orderBy("ts", "asc"));

    const unsub = onSnapshot(qMsgs, (snap) => {
      const chatArr = [];
      snap.forEach((d) => {
        const data = d.data();
        chatArr.push({
          id: d.id,
          userId: data.userId,
          user: data.username || "player",
          text: data.text || "",
          type: data.type || (data.gifUrl ? "gif" : "text"),
          gifUrl: data.gifUrl || null,
          reactions: data.reactions || {}, // { "🔥": ["uid1", "uid2"], ... }
          ts: data.ts,
          mine: data.userId === user.uid,
        });
      });

      const prevCount = prevMsgCountRef.current;
      const newCount = chatArr.length;
      const gotNewMessage = newCount > prevCount;
      prevMsgCountRef.current = newCount;

      setMessages(chatArr);

      // IMPORTANT: no unconditional scroll here.
      // If user is not at bottom and a new message arrives,
      // just show the "New messages" pill.
      if (!isAtBottomRef.current && gotNewMessage) {
        setHasNewMessage(true);
      }
    });

    return () => unsub();
  }, [courtId, user]);

  // Typing indicators: listen for other users typing at this court
  useEffect(() => {
    if (!courtId || !user) return;

    const typingRef = collection(db, "courts", courtId, "typing");
    const unsub = onSnapshot(typingRef, (snap) => {
      const now = Date.now();
      const active = [];
      snap.forEach((d) => {
        const data = d.data();
        if (!data.isTyping) return;
        if (data.userId === user.uid) return;
        if (data.ts && typeof data.ts.toDate === "function") {
          const age = now - data.ts.toDate().getTime();
          if (age > 15000) return; // older than 15s = stale
        }
        active.push(data.username || "player");
      });
      setTypingUsers(active);
    });

    return () => unsub();
  }, [courtId, user]);

  // Update my typing status whenever draftMessage changes
  useEffect(() => {
    if (!courtId || !user || !myProfile?.name) return;

    const typingDocRef = doc(db, "courts", courtId, "typing", user.uid);
    const isTyping = draftMessage.trim().length > 0;

    setDoc(
      typingDocRef,
      {
        userId: user.uid,
        username: myProfile.name,
        isTyping,
        ts: serverTimestamp(),
      },
      { merge: true }
    ).catch((err) => console.log("typing status error", err));

    return () => {
      setDoc(
        typingDocRef,
        {
          userId: user.uid,
          username: myProfile.name,
          isTyping: false,
          ts: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {});
    };
  }, [draftMessage, courtId, user, myProfile?.name]);

  const handleSend = async () => {
    if (!draftMessage.trim() || !user || !courtId) return;

    const msgsRef = collection(db, "courts", courtId, "messages");
    try {
      await addDoc(msgsRef, {
        userId: user.uid,
        username: myProfile.name,
        type: "text",
        text: draftMessage.trim(),
        gifUrl: null,
        reactions: {},
        ts: serverTimestamp(),
      });
      setDraftMessage("");
      setReactionPickerFor(null);
      scrollToBottom(); // when YOU send, always go down
    } catch (err) {
      console.warn("send message failed", err);
    }
  };

  const sendGif = async (gifUrl) => {
    if (!gifUrl || !user || !courtId) return;
    const msgsRef = collection(db, "courts", courtId, "messages");

    try {
      await addDoc(msgsRef, {
        userId: user.uid,
        username: myProfile.name,
        type: "gif",
        text: null,
        gifUrl,
        reactions: {},
        ts: serverTimestamp(),
      });
      setGifPickerVisible(false);
      setReactionPickerFor(null);
      scrollToBottom();
    } catch (err) {
      console.warn("send gif failed", err);
    }
  };

  const fetchGifs = async (queryText) => {
    if (!queryText) return;
    try {
      setGifLoading(true);
      setGifResults([]);

      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
        queryText
      )}&key=${TENOR_API_KEY}&limit=24&media_filter=gif,tinygif`;

      const res = await fetch(url);
      const json = await res.json();
      const results = (json.results || [])
        .map((item) => {
          const tiny =
            item.media_formats?.tinygif?.url ||
            item.media_formats?.gif?.url ||
            null;
          return { id: item.id, url: tiny };
        })
        .filter((g) => g.url);

      setGifResults(results);
    } catch (err) {
      console.warn("GIF search failed", err);
    } finally {
      setGifLoading(false);
    }
  };

  // Toggle / set reaction: each user can have at most ONE reaction per message
  const toggleReaction = async (msg, emoji) => {
    if (!user || !courtId || !msg?.id || !emoji) return;
    const msgRef = doc(db, "courts", courtId, "messages", msg.id);

    const currentReactions = msg.reactions || {};
    let previousEmoji = null;

    Object.entries(currentReactions).forEach(([e, userIds]) => {
      if (Array.isArray(userIds) && userIds.includes(user.uid)) {
        previousEmoji = e;
      }
    });

    const updates = {};

    if (previousEmoji === emoji) {
      // toggle off same emoji
      updates[`reactions.${emoji}`] = arrayRemove(user.uid);
    } else {
      if (previousEmoji) {
        updates[`reactions.${previousEmoji}`] = arrayRemove(user.uid);
      }
      updates[`reactions.${emoji}`] = arrayUnion(user.uid);
    }

    if (Object.keys(updates).length === 0) return;

    try {
      await updateDoc(msgRef, updates);
    } catch (err) {
      console.log("toggle reaction error", err);
    }
  };

  if (!courtId || !user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#eef2f7",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#475569" }}>
          Something went wrong loading this chat.
        </Text>
      </View>
    );
  }

  // Build typing label
  let typingLabel = "";
  if (typingUsers.length === 1) {
    typingLabel = `${typingUsers[0]} is typing...`;
  } else if (typingUsers.length === 2) {
    typingLabel = `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
  } else if (typingUsers.length > 2) {
    typingLabel = `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#eef2f7" }}>
      {/* HEADER */}
      <View
        style={{
          paddingTop: Platform.OS === "ios" ? 52 : 20,
          paddingBottom: 14,
          paddingHorizontal: 16,
          backgroundColor: "#38bdf8",
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.9)",
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 12,
            }}
          >
            <Ionicons name="chevron-back" size={20} color="#0b2239" />
            <Text
              style={{
                marginLeft: 4,
                fontSize: 14,
                fontWeight: "600",
                color: "#0b2239",
              }}
            >
              Back
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={{ color: "#e0f2fe", fontSize: 13 }}>Court chat</Text>
          <Text
            style={{
              color: "#f9fafb",
              fontSize: 20,
              fontWeight: "800",
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {marker?.name || "Court"}
          </Text>
        </View>
      </View>

      {/* CHAT + INPUT */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={chatScrollRef}
            style={{ flex: 1, paddingHorizontal: 12, paddingTop: 12 }}
            contentContainerStyle={{
              paddingBottom: 16,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            // Only auto-scroll on content change if we're already at bottom
            onContentSizeChange={() => {
              if (isAtBottomRef.current) {
                scrollToBottom();
              }
            }}
            onScrollBeginDrag={() => Keyboard.dismiss()}
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
                ([, userIds]) => Array.isArray(userIds) && userIds.length > 0
              );

              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={1}
                  onLongPress={() =>
                    setReactionPickerFor(
                      reactionPickerFor === m.id ? null : m.id
                    )
                  }
                >
                  <View
                    style={[
                      styles.chatBubble,
                      m.mine ? styles.chatBubbleMine : styles.chatBubbleOther,
                      { marginBottom: 8 },
                    ]}
                  >
                    <Text
                      style={
                        m.mine ? styles.chatUserMine : styles.chatUserOther
                      }
                    >
                      {m.mine ? "You" : m.user}
                    </Text>

                    {m.type === "gif" && m.gifUrl ? (
                      <Image
                        source={{ uri: m.gifUrl }}
                        style={{
                          width: 200,
                          height: 200,
                          borderRadius: 12,
                          marginTop: 4,
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={[styles.chatText, { marginTop: 2 }]}>
                        {m.text}
                      </Text>
                    )}

                    {/* Time + reaction summary + reaction picker button */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 6,
                      }}
                    >
                      {/* time: white on my messages, gray on others */}
                      <Text
                        style={[
                          styles.chatTime,
                          m.mine && { color: "#e5f3ff" },
                        ]}
                      >
                        {renderTime(m.ts)}
                      </Text>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        {reactionEntries.map(([emoji, userIds]) => {
                          const userIdsArr = Array.isArray(userIds)
                            ? userIds
                            : [];
                          const count = userIdsArr.length;
                          if (count === 0) return null;
                          const iReacted =
                            user && userIdsArr.includes(user.uid);

                          return (
                            <TouchableOpacity
                              key={emoji}
                              onPress={() => toggleReaction(m, emoji)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 12,
                                marginLeft: 4,
                                backgroundColor: iReacted
                                  ? "rgba(59,130,246,0.15)"
                                  : "rgba(148,163,184,0.15)",
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={{ fontSize: 12 }}>{emoji}</Text>
                              <Text
                                style={{
                                  marginLeft: 3,
                                  fontSize: 11,
                                  color: iReacted ? "#1d4ed8" : "#475569",
                                }}
                              >
                                {count}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}

                        {/* Open emoji picker for this message via icon as well */}
                        <TouchableOpacity
                          onPress={() =>
                            setReactionPickerFor(
                              reactionPickerFor === m.id ? null : m.id
                            )
                          }
                          style={{
                            marginLeft: reactionEntries.length > 0 ? 6 : 0,
                            paddingHorizontal: 4,
                            paddingVertical: 2,
                          }}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Ionicons
                            name={
                              reactionPickerFor === m.id
                                ? "close-circle-outline"
                                : "add-circle-outline"
                            }
                            size={18}
                            color="#94a3b8"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Inline emoji picker row (preset emojis) */}
                    {reactionPickerFor === m.id && (
                      <View
                        style={{
                          flexDirection: "row",
                          marginTop: 4,
                          paddingVertical: 4,
                        }}
                      >
                        {REACTION_EMOJIS.map((emoji) => (
                          <TouchableOpacity
                            key={emoji}
                            onPress={() => {
                              toggleReaction(m, emoji);
                              setReactionPickerFor(null); // close row after choosing
                            }}
                            style={{
                              marginRight: 6,
                              paddingHorizontal: 6,
                              paddingVertical: 4,
                              borderRadius: 12,
                              backgroundColor: "rgba(148,163,184,0.2)",
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={{ fontSize: 15 }}>{emoji}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {typingLabel ? (
              <View
                style={{
                  marginTop: 4,
                  marginBottom: 4,
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    fontStyle: "italic",
                  }}
                >
                  {typingLabel}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* NEW MESSAGE BANNER */}
          {hasNewMessage && !isAtBottom && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={scrollToBottom}
              style={{
                position: "absolute",
                bottom: 80, // sits above input bar
                alignSelf: "center",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "#0f172a",
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Ionicons name="arrow-down" size={14} color="#e5f3ff" />
              <Text
                style={{
                  marginLeft: 6,
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#e5f3ff",
                }}
              >
                New messages
              </Text>
            </TouchableOpacity>
          )}

          {/* INPUT BAR */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#fff",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: "#d6e2ee",
              marginBottom: 14, // keeps it clear of the bottom corners
            }}
          >
            <TouchableOpacity
              onPress={() => setGifPickerVisible(true)}
              style={{ marginRight: 8 }}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={22} color="#1f6fb2" />
            </TouchableOpacity>

            <TextInput
              style={[styles.chatInput, { marginRight: 10 }]}
              placeholder="Message this court."
              placeholderTextColor="#8aa0b6"
              value={draftMessage}
              onChangeText={setDraftMessage}
              returnKeyType="send"
              onFocus={scrollToBottom}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={handleSend}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={18} color="#fff" />
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
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 12,
              maxHeight: "70%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#0b2239" }}
              >
                Search GIFs
              </Text>
              <TouchableOpacity
                onPress={() => setGifPickerVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#d6e2ee",
                borderRadius: 10,
                paddingHorizontal: 10,
                marginBottom: 10,
              }}
            >
              <Ionicons name="search" size={18} color="#64748b" />
              <TextInput
                style={{ flex: 1, marginLeft: 6, paddingVertical: 8 }}
                placeholder="Search GIFs (e.g. dunk, hype)"
                placeholderTextColor="#9ca3af"
                value={gifSearch}
                onChangeText={setGifSearch}
                onSubmitEditing={() => fetchGifs(gifSearch)}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={() => fetchGifs(gifSearch)}>
                <Text
                  style={{ color: "#1f6fb2", fontWeight: "600", marginLeft: 6 }}
                >
                  Go
                </Text>
              </TouchableOpacity>
            </View>

            {gifLoading ? (
              <View
                style={{
                  paddingVertical: 20,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                data={gifResults}
                keyExtractor={(item) => item.id}
                numColumns={3}
                columnWrapperStyle={{ gap: 6 }}
                contentContainerStyle={{ paddingBottom: 8, gap: 6 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => sendGif(item.url)}
                    style={{ flex: 1, aspectRatio: 1 }}
                    activeOpacity={0.8}
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
                      textAlign: "center",
                      color: "#6b7280",
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

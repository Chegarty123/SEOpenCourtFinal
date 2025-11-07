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
} from "firebase/firestore";
import { styles } from "../styles/globalStyles";

const TENOR_API_KEY = "AIzaSyDYgE5Z7qvK2PDPY8sg1GiqGcC_AVxFdho"; // 👈 put your key

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

  const scrollToBottom = () => {
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", scrollToBottom);
    return () => sub.remove();
  }, []);

  const renderTime = (ts) => {
    if (!ts) return "now";
    const dateObj = ts.toDate();
    const hours = dateObj.getHours();
    const mins = dateObj.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const hh = hours % 12 === 0 ? 12 : hours % 12;
    const mm = mins < 10 ? `0${mins}` : mins;
    return `${hh}:${mm} ${ampm}`;
  };

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
          ts: data.ts,
          mine: data.userId === user.uid,
        });
      });
      setMessages(chatArr);
      scrollToBottom();
    });

    return () => unsub();
  }, [courtId, user]);

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
        ts: serverTimestamp(),
      });
      setDraftMessage("");
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
        ts: serverTimestamp(),
      });
      setGifPickerVisible(false);
      scrollToBottom();
    } catch (err) {
      console.warn("send gif failed", err);
    }
  };

  const fetchGifs = async (query) => {
    if (!query) return;
    try {
      setGifLoading(true);
      setGifResults([]);

      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
        query
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
            onContentSizeChange={scrollToBottom}
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

            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.chatBubble,
                  m.mine ? styles.chatBubbleMine : styles.chatBubbleOther,
                  { marginBottom: 8 },
                ]}
              >
                <Text
                  style={m.mine ? styles.chatUserMine : styles.chatUserOther}
                >
                  {m.mine ? "You" : m.user}
                </Text>

                {m.type === "gif" && m.gifUrl ? (
                  <Image
                    source={{ uri: m.gifUrl }}
                    style={{ width: 200, height: 200, borderRadius: 12 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.chatText}>{m.text}</Text>
                )}

                <Text style={styles.chatTime}>{renderTime(m.ts)}</Text>
              </View>
            ))}
          </ScrollView>

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

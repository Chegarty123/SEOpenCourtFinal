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
  LayoutAnimation,
  UIManager,
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

const TENOR_API_KEY = "AIzaSyDYgE5Z7qvK2PDPY8sg1GiqGcC_AVxFdho";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

  const smoothDismissKeyboard = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Keyboard.dismiss();
  };

  const renderTime = (ts) => {
    if (!ts) return "now";
    const d = ts.toDate();
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    const hh = h % 12 === 0 ? 12 : h % 12;
    const mm = m < 10 ? `0${m}` : m;
    return `${hh}:${mm} ${ampm}`;
  };

  // load my profile
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMyProfile({
          uid: user.uid,
          name: data.username || user.email.split("@")[0],
        });
      }
    });
    return () => unsub();
  }, [user]);

  // live chat messages
  useEffect(() => {
    if (!courtId || !user) return;
    const msgsRef = collection(db, "courts", courtId, "messages");
    const q = query(msgsRef, orderBy("ts", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((d) => {
        const data = d.data();
        arr.push({
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
      setMessages(arr);
      scrollToBottom();
    });

    return () => unsub();
  }, [courtId, user]);

  const handleSend = async () => {
    if (!draftMessage.trim() || !user || !courtId) return;
    const msgsRef = collection(db, "courts", courtId, "messages");
    await addDoc(msgsRef, {
      userId: user.uid,
      username: myProfile.name,
      type: "text",
      text: draftMessage.trim(),
      gifUrl: null,
      ts: serverTimestamp(),
    });
    setDraftMessage("");
  };

  const sendGif = async (gifUrl) => {
    if (!gifUrl || !user || !courtId) return;
    const msgsRef = collection(db, "courts", courtId, "messages");
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
  };

  const fetchGifs = async (query) => {
    if (!query) return;
    try {
      setGifLoading(true);
      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
        query
      )}&key=${TENOR_API_KEY}&limit=24&media_filter=gif,tinygif`;
      const res = await fetch(url);
      const json = await res.json();
      const results = (json.results || [])
        .map((i) => ({
          id: i.id,
          url:
            i.media_formats?.tinygif?.url || i.media_formats?.gif?.url || null,
        }))
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
            justifyContent: "flex-start",
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.9)",
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 12,
            }}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color="#0b2239"
              style={{ marginRight: 2, marginTop: 1 }}
            />
            <Text
              style={{
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
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToBottom}
            onScrollBeginDrag={smoothDismissKeyboard}
          >
            {messages.length === 0 ? (
              <View style={{ alignItems: "center", marginTop: 40 }}>
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
              marginBottom: Platform.OS === "ios" ? 10 : 6,
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

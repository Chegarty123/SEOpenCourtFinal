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
  Keyboard,              // 👈 NEW
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

  const scrollToBottom = () => {
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  // 👇 Scroll again when the keyboard is fully open
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", scrollToBottom);
    return () => sub.remove();
  }, []);

  // Format Firestore timestamp -> "4:33 PM"
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
          text: data.text,
          ts: data.ts,
          mine: data.userId === user.uid,
        });
      });
      setMessages(chatArr);
      // keep us at the bottom whenever new messages land
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
        text: draftMessage.trim(),
        ts: serverTimestamp(),
      });
      setDraftMessage("");
      // keyboardDidShow + contentSizeChange will keep scroll correct
    } catch (err) {
      console.warn("send message failed", err);
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
      {/* HEADER (back chip + title) */}
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
        // 👇 this tells iOS how far down your custom header is
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={chatScrollRef}
            style={{ flex: 1, paddingHorizontal: 12, paddingTop: 12 }}
            contentContainerStyle={{
              paddingBottom: 16, // space above input
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
                <Text style={styles.chatText}>{m.text}</Text>
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
            <TextInput
              style={[styles.chatInput, { marginRight: 10 }]}
              placeholder="Message this court."
              placeholderTextColor="#8aa0b6"
              value={draftMessage}
              onChangeText={setDraftMessage}
              returnKeyType="send"
              onFocus={scrollToBottom}  // when you tap, jump to latest
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
    </View>
  );
}

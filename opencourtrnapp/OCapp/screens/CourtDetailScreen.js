// screens/CourtDetailScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { styles } from "../styles/globalStyles";

export default function CourtDetailScreen({ route, navigation }) {
  const { marker } = route.params || {};
  const courtId = marker?.id;
  const user = auth.currentUser;

  const chatScrollRef = useRef(null);

  const [myProfile, setMyProfile] = useState({
    uid: user?.uid || "me",
    name: user?.email ? user.email.split("@")[0] : "you",
    avatar: null,
    note: "hooping now",
  });

  const [playersHere, setPlayersHere] = useState([]);
  const [checkedIn, setCheckedIn] = useState(false);

  const [messages, setMessages] = useState([]);
  const [draftMessage, setDraftMessage] = useState("");

  // format Firestore timestamp -> "4:33 PM"
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

  // live-load my profile (so we know my avatar/name for check-ins & chat)
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);

    const unsub = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setMyProfile({
            uid: user.uid,
            name:
              data.username ||
              (user.email ? user.email.split("@")[0] : "you"),
            avatar: data.profilePic || null, // base64 data URL from ProfileScreen
            note: "hooping now",
          });
        } else {
          setMyProfile({
            uid: user.uid,
            name: user.email ? user.email.split("@")[0] : "you",
            avatar: null,
            note: "hooping now",
          });
        }
      },
      (err) => {
        console.warn("Failed to load profile", err);
        setMyProfile({
          uid: user?.uid || "me",
          name: user?.email ? user.email.split("@")[0] : "you",
          avatar: null,
          note: "hooping now",
        });
      }
    );

    return () => unsub();
  }, [user]);

  // keep my check-in avatar in sync with my profile while I'm checked in
  useEffect(() => {
    if (!user || !courtId) return;
    if (!checkedIn) return;

    const myCheckinRef = doc(db, "courts", courtId, "checkins", user.uid);

    setDoc(
      myCheckinRef,
      {
        username: myProfile.name || "player",
        avatar:
          myProfile.avatar || "https://i.pravatar.cc/100?img=68",
        note: myProfile.note || "hooping now",
      },
      { merge: true }
    ).catch((err) => {
      console.warn("sync check-in avatar failed", err);
    });
  }, [
    myProfile.avatar,
    myProfile.name,
    myProfile.note,
    checkedIn,
    courtId,
    user,
  ]);

  // live check-ins
  useEffect(() => {
    if (!courtId || !user) return;

    const checkinsRef = collection(db, "courts", courtId, "checkins");

    const unsub = onSnapshot(checkinsRef, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id, // this is the userId
          name: data.username || "player",
          avatar:
            data.avatar ||
            "https://i.pravatar.cc/100?img=68",
          note: data.note || "hooping now",
          ts: data.ts,
        });
      });

      setPlayersHere(list);

      const amICheckedIn = list.some((p) => p.id === user.uid);
      setCheckedIn(amICheckedIn);
    });

    return () => unsub();
  }, [courtId, user]);

  // live chat
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

      // scroll to bottom after messages update
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });

    return () => unsub();
  }, [courtId, user]);

  // toggle check-in
  const handleCheckInToggle = async () => {
    if (!user || !courtId) return;

    const myCheckinRef = doc(db, "courts", courtId, "checkins", user.uid);

    if (!checkedIn) {
      // check in
      try {
        await setDoc(myCheckinRef, {
          username: myProfile.name || "player",
          avatar:
            myProfile.avatar ||
            "https://i.pravatar.cc/100?img=68",
          note: myProfile.note || "hooping now",
          ts: serverTimestamp(),
        });
      } catch (err) {
        console.warn("check-in failed", err);
      }
    } else {
      // check out
      try {
        await deleteDoc(myCheckinRef);
      } catch (err) {
        console.warn("check-out failed", err);
      }
    }
  };

  // send message
  const handleSend = async () => {
    if (!draftMessage.trim() || !user || !courtId) return;

    const msgsRef = collection(db, "courts", courtId, "messages");

    try {
      await addDoc(msgsRef, {
        userId: user.uid,
        username: myProfile.name || "you",
        text: draftMessage.trim(),
        ts: serverTimestamp(),
      });
      setDraftMessage("");

      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
    } catch (err) {
      console.warn("send message failed", err);
    }
  };

  return (
    // wraps entire screen to lift input bar above keyboard on iOS
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#eef2f7" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <View style={[styles.courtScreenWrap, { flex: 1 }]}>
        {/* HERO HEADER */}
        <View style={styles.courtHeroContainer}>
          <Image
            source={{ uri: marker?.image }}
            style={styles.courtHeroImage}
            resizeMode="cover"
          />
          <View style={styles.courtHeroOverlay} />

          {/* Back button */}
          <View style={styles.courtHeroTopRow}>
            <TouchableOpacity
              style={styles.courtBackBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={20} color="#0b2239" />
              <Text style={styles.courtBackBtnText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Court info */}
          <View style={styles.courtHeroBottom}>
            <Text style={styles.courtName}>
              {marker?.name || "Court Name"}
            </Text>
            <Text style={styles.courtSubText}>
              {marker?.description ||
                "Outdoor court • Lights • Full court"}
            </Text>

            <View style={styles.courtStatsRow}>
              <View style={styles.courtStatChip}>
                <Ionicons
                  name="people-outline"
                  size={16}
                  color="#0b2239"
                />
                <Text style={styles.courtStatText}>
                  {playersHere.length} here now
                </Text>
              </View>

              <View style={styles.courtStatChip}>
                <Ionicons name="star" size={16} color="#0b2239" />
                <Text style={styles.courtStatText}>4.6 rating</Text>
              </View>
            </View>
          </View>
        </View>

        {/* MAIN CONTENT BELOW HERO */}
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {/* WHO'S HERE CARD */}
          <View style={styles.courtCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderText}>Who's on this court</Text>

              <View style={styles.cardHeaderRight}>
                <Ionicons
                  name="radio-button-on-outline"
                  size={14}
                  color={checkedIn ? "#10b981" : "#64748b"}
                />
                <Text
                  style={[
                    styles.cardHeaderPresence,
                    { color: checkedIn ? "#10b981" : "#64748b" },
                  ]}
                >
                  {checkedIn
                    ? "You are checked in"
                    : "You are not checked in"}
                </Text>
              </View>
            </View>

            {/* avatars row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.playersRow}
            >
              {playersHere.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.playerBubble}
                  onPress={() =>
                    navigation.navigate("UserProfile", {
                      userId: p.id,
                    })
                  }
                >
                  <Image
                    source={
                      p.avatar
                        ? { uri: p.avatar }
                        : require("../images/defaultProfile.png")
                    }
                    style={styles.playerAvatar}
                  />
                  <Text style={styles.playerName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.playerNote} numberOfLines={1}>
                    {p.note}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* check in/out button */}
            <TouchableOpacity
              style={[
                styles.checkInBtn,
                checkedIn && styles.checkOutBtn,
              ]}
              onPress={handleCheckInToggle}
              activeOpacity={0.9}
            >
              <Ionicons
                name={checkedIn ? "log-out-outline" : "log-in-outline"}
                size={18}
                color="#fff"
              />
              <Text style={styles.checkInBtnText}>
                {checkedIn ? "Check Out" : "Check In"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* CHAT CARD */}
          <View style={styles.courtCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderText}>Court Chat</Text>
              <Text style={styles.chatHintText}>
                Use this to set up games or ask if it’s active.
              </Text>
            </View>

            {/* scrollable chat window */}
            <View style={styles.chatMessagesOuter}>
              <ScrollView
                ref={chatScrollRef}
                style={styles.chatScroll}
                contentContainerStyle={styles.chatScrollContent}
                showsVerticalScrollIndicator={true}
              >
                {messages.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      styles.chatBubble,
                      m.mine
                        ? styles.chatBubbleMine
                        : styles.chatBubbleOther,
                    ]}
                  >
                    {!m.mine && (
                      <Text style={styles.chatUserOther}>{m.user}</Text>
                    )}
                    {m.mine && (
                      <Text style={styles.chatUserMine}>You</Text>
                    )}

                    <Text
                      style={[
                        styles.chatText,
                        m.mine && { color: "#fff" },
                      ]}
                    >
                      {m.text}
                    </Text>
                    <Text
                      style={[
                        styles.chatTime,
                        m.mine && { color: "#cbd5e1" },
                      ]}
                    >
                      {renderTime(m.ts)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        {/* INPUT BAR (fixed at bottom, lifts with keyboard) */}
        <View style={styles.chatInputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder="Message this court..."
            placeholderTextColor="#8aa0b6"
            value={draftMessage}
            onChangeText={setDraftMessage}
            returnKeyType="send"
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
  );
}

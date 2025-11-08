// screens/CourtDetailScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";

export default function CourtDetailScreen({ route, navigation }) {
  const { marker } = route.params || {};
  const courtId = marker?.id;
  const user = auth.currentUser;

  // current user profile (for check-in info)
  const [myProfile, setMyProfile] = useState({
    uid: user?.uid || "me",
    name: user?.email ? user.email.split("@")[0] : "you",
    avatar: null,
    note: "hooping now",
  });

  const [playersHere, setPlayersHere] = useState([]);
  const [checkedIn, setCheckedIn] = useState(false);
  const [messages, setMessages] = useState([]);

  // format Firestore timestamp -> "4:33 PM"
  const renderTime = (ts) => {
    if (!ts) return "now";
    const dateObj = ts.toDate();
    let hours = dateObj.getHours();
    const mins = dateObj.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hours}:${minsStr} ${ampm}`;
  };

  // load my profile from Firestore so check-in uses username + avatar
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setMyProfile({
            uid: user.uid,
            name:
              data.username ||
              (user.email ? user.email.split("@")[0] : "you"),
            avatar: data.profilePic || null,
            note: "hooping now",
          });
        } else {
          // fallback
          setMyProfile({
            uid: user.uid,
            name: user.email ? user.email.split("@")[0] : "you",
            avatar: null,
            note: "hooping now",
          });
        }
      },
      (err) => {
        console.warn("failed to load my profile", err);
      }
    );

    return () => unsub();
  }, [user]);

  // listen to check-ins on this court
  useEffect(() => {
    if (!courtId || !user) return;

    const checkinsRef = collection(db, "courts", courtId, "checkins");

    const unsub = onSnapshot(checkinsRef, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id, // userId
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

  // listen to recent messages for preview
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
          ts: data.ts,
          mine: data.userId === user.uid,
        });
      });
      setMessages(chatArr);
    });

    return () => unsub();
  }, [courtId, user]);

  // toggle check-in / check-out
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

  const lastMessage =
    messages && messages.length > 0
      ? messages[messages.length - 1]
      : null;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#020617",
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
      }}
    >
      <StatusBar barStyle="light-content" />

      {/* background blobs to match rest of dark theme */}
      <View pointerEvents="none" style={ui.blobTop} />
      <View pointerEvents="none" style={ui.blobBottom} />

      <View style={ui.screen}>
        {/* HERO with image + back button */}
        <View style={ui.hero}>
          {marker?.image ? (
            <Image
              source={{ uri: marker.image }}
              style={ui.heroImage}
              resizeMode="cover"
            />
          ) : null}
          <View style={ui.heroOverlay} />

          {/* back arrow */}
          <View style={ui.heroTopRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.9}
              style={ui.heroBackBtn}
            >
              <Ionicons name="chevron-back" size={22} color="#e5f3ff" />
            </TouchableOpacity>
          </View>

          {/* court info over image */}
          <View style={ui.heroBottom}>
            <Text style={ui.courtName}>
              {marker?.name || "Court name"}
            </Text>
            <Text style={ui.courtSubText}>
              {marker?.description || "Outdoor court • Lights • Full court"}
            </Text>

            <View style={ui.courtStatsRow}>
              <View style={ui.courtStatChip}>
                <Ionicons
                  name="people-outline"
                  size={14}
                  color="#e5f3ff"
                />
                <Text style={ui.courtStatText}>
                  {playersHere.length} here now
                </Text>
              </View>

              {typeof marker?.distanceMiles === "number" && (
                <View style={ui.courtStatChip}>
                  <Ionicons name="navigate-outline" size={14} color="#e5f3ff" />
                  <Text style={ui.courtStatText}>
                    {marker.distanceMiles.toFixed(1)} mi away
                  </Text>
                </View>
              )}

              <View style={ui.courtStatChip}>
                <Ionicons name="star" size={14} color="#e5f3ff" />
                <Text style={ui.courtStatText}>4.6 rating</Text>
              </View>
            </View>
          </View>
        </View>

        {/* MAIN CONTENT */}
        <ScrollView
          contentContainerStyle={ui.content}
          showsVerticalScrollIndicator={false}
        >
          {/* WHO'S HERE CARD */}
          <View style={ui.card}>
            <View style={ui.cardHeaderRow}>
              <Text style={ui.cardHeaderText}>Who&apos;s on this court</Text>

              <View style={ui.cardHeaderRight}>
                <Ionicons
                  name="radio-button-on-outline"
                  size={14}
                  color={checkedIn ? "#10b981" : "#64748b"}
                />
                <Text
                  style={[
                    ui.cardHeaderPresence,
                    { color: checkedIn ? "#22c55e" : "#9ca3af" },
                  ]}
                >
                  {checkedIn ? "You are here" : "You're not checked in"}
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={ui.playersRow}
            >
              {playersHere.length === 0 && (
                <Text style={ui.emptyText}>
                  Nobody&apos;s checked in yet. Be the first to pull up.
                </Text>
              )}

              {playersHere.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={ui.playerBubble}
                  onPress={() =>
                    navigation.navigate("UserProfile", { userId: p.id })
                  }
                  activeOpacity={0.9}
                >
                  <Image
                    source={
                      p.avatar
                        ? { uri: p.avatar }
                        : require("../images/defaultProfile.png")
                    }
                    style={ui.playerAvatar}
                  />
                  <Text style={ui.playerName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={ui.playerNote} numberOfLines={1}>
                    {p.note}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Check in / out button */}
            <TouchableOpacity
              style={[
                ui.checkInBtn,
                checkedIn && ui.checkOutBtn,
              ]}
              onPress={handleCheckInToggle}
              activeOpacity={0.9}
            >
              <Ionicons
                name={checkedIn ? "log-out-outline" : "log-in-outline"}
                size={18}
                color="#fff"
              />
              <Text style={ui.checkInBtnText}>
                {checkedIn ? "Check Out" : "Check In"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* CHAT PREVIEW CARD */}
          <View style={ui.card}>
            <View style={ui.cardHeaderRow}>
              <Text style={ui.cardHeaderText}>Court chat</Text>
            </View>

            {lastMessage ? (
              <View style={ui.chatPreviewWrap}>
                <Text
                  style={[
                    ui.chatMetaText,
                    { marginBottom: 4 },
                  ]}
                >
                  Last message · {renderTime(lastMessage.ts)}
                </Text>
                <View
                  style={[
                    ui.chatBubble,
                    lastMessage.mine
                      ? ui.chatBubbleMine
                      : ui.chatBubbleOther,
                  ]}
                >
                  <Text
                    style={
                      lastMessage.mine ? ui.chatUserMine : ui.chatUserOther
                    }
                  >
                    {lastMessage.user}
                  </Text>
                  <Text
                    style={
                      lastMessage.mine ? ui.chatTextMine : ui.chatTextOther
                    }
                    numberOfLines={2}
                  >
                    {lastMessage.text || "Media"}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={ui.chatHintText}>
                No messages yet. Start the first conversation for this court.
              </Text>
            )}

            <TouchableOpacity
              style={[ui.checkInBtn, { backgroundColor: "#1f6fb2", marginTop: 6 }]}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate("CourtChat", {
                  courtId,
                  marker,
                })
              }
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#fff"
              />
              <Text style={ui.checkInBtnText}>Open court chat</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const ui = {
  screen: {
    flex: 1,
    backgroundColor: "#020617",
  },
  blobTop: {
    position: "absolute",
    top: -100,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(56,189,248,0.22)",
  },
  blobBottom: {
    position: "absolute",
    top: 220,
    left: -110,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(251,146,60,0.16)",
  },
  hero: {
    width: "100%",
    height: 230,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    backgroundColor: "#020617",
    marginBottom: 8,
  },
  heroImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(15,23,42,0.55)",
  },
  heroTopRow: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  heroBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
  },
  courtName: {
    color: "#f9fafb",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  courtSubText: {
    color: "#d1d5db",
    fontSize: 13,
    marginBottom: 12,
  },
  courtStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  courtStatChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  courtStatText: {
    color: "#e5f3ff",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "rgba(15,23,42,0.98)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.45)",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardHeaderText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#e5f3ff",
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardHeaderPresence: {
    fontSize: 13,
    fontWeight: "600",
  },
  playersRow: {
    paddingVertical: 8,
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 13,
  },
  playerBubble: {
    width: 96,
    marginRight: 12,
    alignItems: "center",
    backgroundColor: "#020617",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
  },
  playerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "#38bdf8",
    marginBottom: 6,
  },
  playerName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e5f3ff",
    maxWidth: "100%",
    textAlign: "center",
  },
  playerNote: {
    fontSize: 11,
    color: "#9ca3af",
    maxWidth: "100%",
    textAlign: "center",
  },
  checkInBtn: {
    marginTop: 14,
    backgroundColor: "#1f6fb2",
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  checkOutBtn: {
    backgroundColor: "#ef4444",
  },
  checkInBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  chatHintText: {
    marginTop: 4,
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "400",
  },
  chatPreviewWrap: {
    marginTop: 4,
  },
  chatMetaText: {
    color: "#9ca3af",
    fontSize: 11,
  },
  chatBubble: {
    maxWidth: "100%",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  chatBubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#1f6fb2",
  },
  chatBubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
  },
  chatUserMine: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  chatUserOther: {
    color: "#e5f3ff",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  chatTextMine: {
    color: "#e5f3ff",
    fontSize: 13,
  },
  chatTextOther: {
    color: "#e5f3ff",
    fontSize: 13,
  },
};

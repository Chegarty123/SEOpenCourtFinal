// screens/CourtDetailScreen.js
import markers from "../assets/markers"; // make sure this is imported at the top if not already
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  Platform,
  Modal,
  Alert
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
  getDocs
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
  const [playerProfiles, setPlayerProfiles] = useState({}); // 🔵 live user docs
  const [checkedIn, setCheckedIn] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [showCheckInWarning, setShowCheckInWarning] = useState(false);
  const [checkedInCourtName, setCheckedInCourtName] = useState("");
  const [checkInLoading, setCheckInLoading] = useState(false);

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

  // 🔵 pull live profile data from users/{uid} for everyone checked in
  useEffect(() => {
    if (!playersHere || playersHere.length === 0) {
      setPlayerProfiles({});
      return;
    }

    let cancelled = false;

    const fetchProfiles = async () => {
      try {
        const entries = await Promise.all(
          playersHere.map(async (p) => {
            try {
              const snap = await getDoc(doc(db, "users", p.id));
              if (!snap.exists()) return null;
              const data = snap.data() || {};
              return [
                p.id,
                {
                  username:
                    data.username ||
                    (data.email ? data.email.split("@")[0] : "Player"),
                  profilePic: data.profilePic || null,
                },
              ];
            } catch (err) {
              console.log("Error fetching user profile for court:", err);
              return null;
            }
          })
        );

        if (cancelled) return;

        const map = {};
        entries.forEach((entry) => {
          if (!entry) return;
          const [uid, profile] = entry;
          map[uid] = profile;
        });

        setPlayerProfiles(map);
      } catch (err) {
        console.log("Error building playerProfiles map:", err);
      }
    };

    fetchProfiles();

    return () => {
      cancelled = true;
    };
  }, [playersHere]);

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
  if (!user || !courtId || checkInLoading) return;
  setCheckInLoading(true);

  const myCheckinRef = doc(db, "courts", courtId, "checkins", user.uid);

  if (!checkedIn) {
    try {
      // ✅ Check if user is already checked in elsewhere
      let alreadyCourt = null;

      for (const marker of markers) {
        const otherCourtId = String(marker.id);
        if (otherCourtId === courtId) continue;

        const otherCheckinRef = doc(db, "courts", otherCourtId, "checkins", user.uid);
        const otherSnap = await getDoc(otherCheckinRef);

        if (otherSnap.exists()) {
          alreadyCourt = marker.name || "another court";
          break;
        }
      }

      if (alreadyCourt) {
        Alert.alert(
          "Already Checked In",
          `You're already checked into ${alreadyCourt}.\nTo check in here, please check out of that court first.`,
          [{ text: "OK", style: "cancel" }]
        );
        return;
      }

      // ✅ Safe to check in
      await setDoc(myCheckinRef, {
        username: myProfile.name || "player",
        avatar: myProfile.avatar || "https://i.pravatar.cc/100?img=68",
        note: myProfile.note || "hooping now",
        ts: serverTimestamp(),
      });
      
// ✅ Award Rookie badge if first check-in
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const earnedBadges = data.badges || [];
      if (!earnedBadges.includes("Rookie")) {
        earnedBadges.push("Rookie");
        await setDoc(userRef, { badges: earnedBadges }, { merge: true });
      }
    }
    } catch (err) {
      console.warn("check-in failed", err);
    } finally {
      setCheckInLoading(false);
    }
  } else {
    // Check out
    try {
      await deleteDoc(myCheckinRef);
    } catch (err) {
      console.warn("check-out failed", err);
    } finally {
      setCheckInLoading(false);
    }
  }
};




  const lastMessage =
    messages && messages.length > 0
      ? messages[messages.length - 1]
      : null;

  const MAX_VISIBLE_PLAYERS = 5;
  const visiblePlayers = playersHere.slice(0, MAX_VISIBLE_PLAYERS);
  const remainingCount = playersHere.length - MAX_VISIBLE_PLAYERS;

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

              {visiblePlayers.map((p) => {
                const liveProfile = playerProfiles[p.id] || null;
                const avatarUri =
                  liveProfile?.profilePic || p.avatar || null;
                const displayName =
                  liveProfile?.username || p.name || "player";

                return (
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
                        avatarUri
                          ? { uri: avatarUri }
                          : require("../images/defaultProfile.png")
                      }
                      style={ui.playerAvatar}
                    />
                    <Text style={ui.playerName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text style={ui.playerNote} numberOfLines={1}>
                      {p.note}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {remainingCount > 0 && (
                <TouchableOpacity
                  style={ui.morePlayersPill}
                  onPress={() => setShowAllPlayers(true)}
                  activeOpacity={0.9}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#60a5fa" />
                  <Text style={ui.morePlayersText}>
                    {remainingCount} more
                  </Text>
                </TouchableOpacity>
              )}
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
              <Text style={[
      ui.buttonText,
      { color: "#ffffff", fontWeight: "700" }, // ✅ ensures text stays white
    ]}>
  {checkInLoading
    ? checkedIn
      ? "Checking out..."
      : "Checking in..."
    : checkedIn
      ? "Check Out"
      : "Check In"}
</Text>

            </TouchableOpacity>
          </View>

          {/* CHAT PREVIEW CARD */}
          <View style={ui.card}>
            <View style={ui.cardHeaderRow}>
              <Text style={ui.cardHeaderText}>Court chat</Text>
              {messages.length > 0 && (
                <View style={ui.messageBadge}>
                  <Text style={ui.messageBadgeText}>{messages.length}</Text>
                </View>
              )}
            </View>

            {lastMessage ? (
              <View style={ui.chatPreviewWrap}>
                <View style={ui.chatPreviewHeader}>
                  <View style={ui.chatMetaRow}>
                    <Ionicons name="time-outline" size={12} color="#9ca3af" />
                    <Text style={ui.chatMetaText}>
                      {renderTime(lastMessage.ts)}
                    </Text>
                  </View>
                </View>
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
              <View style={ui.emptyMessageState}>
                <Ionicons name="chatbubbles-outline" size={32} color="#64748b" />
                <Text style={ui.chatHintText}>
                  No messages yet. Start the conversation.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={ui.modernChatButton}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate("CourtChat", {
                  courtId,
                  marker,
                })
              }
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={18}
                color="#e5f3ff"
              />
              <Text style={ui.modernChatButtonText}>Open court chat</Text>
              <Ionicons name="arrow-forward" size={16} color="#e5f3ff" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* ALL PLAYERS MODAL */}
      <Modal
        visible={showAllPlayers}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAllPlayers(false)}
      >
        <View style={ui.modalBackdrop}>
          <View style={ui.modalContainer}>
            <View style={ui.modalHeader}>
              <Text style={ui.modalTitle}>
                All players ({playersHere.length})
              </Text>
              <TouchableOpacity onPress={() => setShowAllPlayers(false)}>
                <Ionicons name="close" size={24} color="#e5e7eb" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={ui.modalPlayerList}
            >
              {playersHere.map((p) => {
                const liveProfile = playerProfiles[p.id] || null;
                const avatarUri =
                  liveProfile?.profilePic || p.avatar || null;
                const displayName =
                  liveProfile?.username || p.name || "player";

                return (
                  <TouchableOpacity
                    key={p.id}
                    style={ui.modalPlayerRow}
                    onPress={() => {
                      setShowAllPlayers(false);
                      navigation.navigate("UserProfile", { userId: p.id });
                    }}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={
                        avatarUri
                          ? { uri: avatarUri }
                          : require("../images/defaultProfile.png")
                      }
                      style={ui.modalPlayerAvatar}
                    />
                    <View style={ui.modalPlayerInfo}>
                      <Text style={ui.modalPlayerName}>{displayName}</Text>
                      <Text style={ui.modalPlayerNote}>{p.note}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* CHECK-IN WARNING MODAL */}
<Modal
  visible={showCheckInWarning}
  transparent
  animationType="fade"
  onRequestClose={() => setShowCheckInWarning(false)}
>
  <View style={ui.modalBackdrop}>
    <View style={ui.modalContainer}>
      <Text style={ui.modalTitle}>Already Checked In</Text>
      <Text style={{ color: "#e5e7eb", fontSize: 14, marginBottom: 16 }}>
        You’re already checked into <Text style={{ fontWeight: "bold" }}>{checkedInCourtName}</Text>.
        To check in here, please check out of that court first.
      </Text>
      <TouchableOpacity
        style={[ui.modernChatButton, { backgroundColor: "#ef4444" }]}
        onPress={() => setShowCheckInWarning(false)}
      >
        <Ionicons name="close" size={18} color="#fff" />
        <Text style={[ui.modernChatButtonText, { color: "#fff" }]}>
          OK
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

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
    backgroundColor: "#2563eb",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkOutBtn: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
  },
  checkInBtnText: {
    color: "#e5f3ff",
    fontSize: 15,
    fontWeight: "700",
  },
  morePlayersPill: {
    width: 96,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37,99,235,0.1)",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.4)",
    borderStyle: "dashed",
  },
  morePlayersText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#60a5fa",
    marginTop: 4,
    textAlign: "center",
  },
  chatHintText: {
    color: "#9ca3af",
    fontSize: 13,
    textAlign: "center",
  },
  chatPreviewWrap: {
    marginTop: 8,
  },
  chatPreviewHeader: {
    marginBottom: 6,
  },
  chatMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chatMetaText: {
    color: "#9ca3af",
    fontSize: 11,
    fontWeight: "500",
  },
  emptyMessageState: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  messageBadge: {
    backgroundColor: "#2563eb",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBadgeText: {
    color: "#e5f3ff",
    fontSize: 11,
    fontWeight: "700",
  },
  chatBubble: {
    maxWidth: "100%",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chatBubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(37,99,235,0.15)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.3)",
  },
  chatBubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(15,23,42,0.6)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
  },
  chatUserMine: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 3,
  },
  chatUserOther: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 3,
  },
  chatTextMine: {
    color: "#f1f5f9",
    fontSize: 14,
    lineHeight: 20,
  },
  chatTextOther: {
    color: "#f1f5f9",
    fontSize: 14,
    lineHeight: 20,
  },
  modernChatButton: {
    marginTop: 12,
    backgroundColor: "#2563eb",
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modernChatButtonText: {
    color: "#e5f3ff",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "rgba(15,23,42,0.98)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
    width: "100%",
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.3)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#e5f3ff",
  },
  modalPlayerList: {
    paddingTop: 8,
  },
  modalPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "rgba(2,6,23,0.5)",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
  },
  modalPlayerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#60a5fa",
    marginRight: 12,
  },
  modalPlayerInfo: {
    flex: 1,
  },
  modalPlayerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#e5f3ff",
    marginBottom: 2,
  },
  modalPlayerNote: {
    fontSize: 12,
    color: "#9ca3af",
  },
};

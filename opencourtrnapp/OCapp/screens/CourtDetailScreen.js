import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { styles } from "../styles/globalStyles";

export default function CourtDetailScreen({ route, navigation }) {
  const { marker } = route.params || {};
  const [checkedIn, setCheckedIn] = useState(false);

  const user = auth.currentUser;

  const [myProfile, setMyProfile] = useState({
    id: "you",
    name: "you",
    avatar: null,
    note: "hooping now",
  });

  // players currently at the court (placeholder data to start)
  const [playersHere, setPlayersHere] = useState([
    {
      id: "1",
      name: "alex.m",
      avatar: "https://i.pravatar.cc/100?img=12",
      note: "looking for 3v3",
    },
    {
      id: "2",
      name: "jay23",
      avatar: "https://i.pravatar.cc/100?img=32",
      note: "running full court rn",
    },
    {
      id: "3",
      name: "mia.b",
      avatar: "https://i.pravatar.cc/100?img=5",
      note: "here til 6pm",
    },
  ]);

  const [messages, setMessages] = useState([
    {
      id: "m1",
      user: "jay23",
      text: "We need one more for 4v4.",
      time: "4:12 PM",
      mine: false,
    },
    {
      id: "m2",
      user: "alex.m",
      text: "I’m walking over now.",
      time: "4:13 PM",
      mine: true,
    },
    {
      id: "m3",
      user: "mia.b",
      text: "Is it packed?",
      time: "4:14 PM",
      mine: false,
    },
  ]);

  const [draftMessage, setDraftMessage] = useState("");

  // load the signed-in user's profile info so we can show them in check-in
  useEffect(() => {
    const loadMyProfile = async () => {
      if (!user) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userDocRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          setMyProfile({
            id: "you",
            name: data.username
              || (user.email ? user.email.split("@")[0] : "you"),
            avatar: data.profilePic ? data.profilePic : null,
            note: "hooping now",
          });
        } else {
          setMyProfile({
            id: "you",
            name: user.email ? user.email.split("@")[0] : "you",
            avatar: null,
            note: "hooping now",
          });
        }
      } catch (err) {
        console.warn("Failed to load profile", err);
        setMyProfile({
          id: "you",
          name: user?.email ? user.email.split("@")[0] : "you",
          avatar: null,
          note: "hooping now",
        });
      }
    };

    loadMyProfile();
  }, [user]);

  const handleCheckInToggle = () => {
    setCheckedIn((prev) => !prev);

    setPlayersHere((prevPlayers) => {
      const meIndex = prevPlayers.findIndex((p) => p.id === "you");

      if (!checkedIn) {
        // checking IN
        if (meIndex === -1) {
          const myPlayerCard = {
            id: "you",
            name: myProfile.name || "you",
            avatar: myProfile.avatar
              ? myProfile.avatar
              : "https://i.pravatar.cc/100?img=68",
            note: myProfile.note || "hooping now",
          };
          return [myPlayerCard, ...prevPlayers];
        }
        return prevPlayers;
      } else {
        // checking OUT
        if (meIndex !== -1) {
          const copy = [...prevPlayers];
          copy.splice(meIndex, 1);
          return copy;
        }
        return prevPlayers;
      }
    });
  };

  const handleSend = () => {
    if (!draftMessage.trim()) return;

    const newMsg = {
      id: `m${Date.now()}`,
      user: myProfile.name || "you",
      text: draftMessage.trim(),
      time: "now",
      mine: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setDraftMessage("");
  };

  return (
    <View style={styles.courtScreenWrap}>
      {/* HERO */}
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

      {/* BODY */}
      <ScrollView
        style={styles.courtContentScroll}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* who is here / check in */}
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
                  {
                    color: checkedIn ? "#10b981" : "#64748b",
                  },
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
              <View key={p.id} style={styles.playerBubble}>
                <Image
                  source={{ uri: p.avatar }}
                  style={styles.playerAvatar}
                />
                <Text style={styles.playerName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.playerNote} numberOfLines={1}>
                  {p.note}
                </Text>
              </View>
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

        {/* chat */}
        <View style={styles.courtCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderText}>Court Chat</Text>
            <Text style={styles.chatHintText}>
              Use this to set up games or ask if it’s active.
            </Text>
          </View>

          <View style={styles.chatMessagesWrap}>
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
                  {m.time}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* input bar */}
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
  );
}

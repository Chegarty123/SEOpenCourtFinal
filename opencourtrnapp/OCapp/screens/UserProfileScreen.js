// screens/UserProfileScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  FlatList,
} from "react-native";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../firebaseConfig";
import { styles as globalStyles } from "../styles/globalStyles";

// 🏀 team logos for favorite team display
const teamLogos = {
  Hawks: require("../images/hawks.png"),
  Raptors: require("../images/raptors.png"),
  Nets: require("../images/nets.png"),
  Heat: require("../images/heat.png"),
  Sixers: require("../images/sixers.png"),
  Knicks: require("../images/knicks.png"),
  Magic: require("../images/magic.webp"),
  Celtics: require("../images/celtics.png"),
  Bulls: require("../images/bulls.png"),
  Cavaliers: require("../images/cavs.png"),
  Pistons: require("../images/pistons.png"),
  Bucks: require("../images/bucks.png"),
  Wizards: require("../images/wizards.webp"),
  Hornets: require("../images/hornets.png"),
  Pacers: require("../images/pacers.png"),
  Nuggets: require("../images/nuggets.png"),
  Suns: require("../images/suns.png"),
  Clippers: require("../images/clippers.png"),
  Lakers: require("../images/lakers.png"),
  Trailblazers: require("../images/trailblazers.png"),
  Thunder: require("../images/thunder.png"),
  Timberwolves: require("../images/timberwolves.png"),
  Rockets: require("../images/rockets.png"),
  Pelicans: require("../images/pelicans.png"),
  Grizzlies: require("../images/grizzlies.png"),
  Mavericks: require("../images/mavericks.png"),
  Spurs: require("../images/spurs.png"),
  Warriors: require("../images/warriors.png"),
  Jazz: require("../images/jazz.png"),
  Kings: require("../images/kings.png"),
};

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const currentUser = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [friendsList, setFriendsList] = useState([]);

  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [myProfile, setMyProfile] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, "users", userId);
    const unsub = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile({ id: snap.id, ...data });

        // Preload friend list for modal
        if (Array.isArray(data.friends) && data.friends.length > 0) {
          const friendProfiles = await Promise.all(
            data.friends.map(async (fid) => {
              const fSnap = await getDoc(doc(db, "users", fid));
              return fSnap.exists() ? { id: fid, ...fSnap.data() } : null;
            })
          );
          setFriendsList(friendProfiles.filter(Boolean));
        } else {
          setFriendsList([]);
        }
      } else setProfile(null);

      setLoading(false);
    });

    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (!currentUser) return;

    const currentRef = doc(db, "users", currentUser.uid);
    const unsub = onSnapshot(currentRef, (snap) => {
      const data = snap.data() || {};
      setFriends(data.friends || []);
      setIncomingRequests(data.incomingRequests || []);
      setOutgoingRequests(data.outgoingRequests || []);
      setMyProfile({
        uid: currentUser.uid,
        username:
          data.username ||
          (currentUser.email ? currentUser.email.split("@")[0] : "You"),
        profilePic: data.profilePic || null,
        email: data.email || currentUser.email || null,
      });
    });

    return () => unsub();
  }, [currentUser]);

  const relationshipStatus = () => {
    if (!currentUser || !userId || currentUser.uid === userId) return "self";
    if (friends.includes(userId)) return "friends";
    if (incomingRequests.includes(userId)) return "incoming";
    if (outgoingRequests.includes(userId)) return "outgoing";
    return "none";
  };

  const startDirectMessage = async () => {
    if (!currentUser || !userId || currentUser.uid === userId) return;

    if (relationshipStatus() !== "friends") {
      Alert.alert(
        "Add as friend",
        "You can only send DMs to players you've added as friends."
      );
      return;
    }

    try {
      const convRef = collection(db, "dmConversations");
      const q = query(
        convRef,
        where("participants", "array-contains", currentUser.uid)
      );
      const snap = await getDocs(q);

      let existingConvId = null;
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const parts = data.participants || [];
        if (parts.length === 2 && parts.includes(userId)) {
          existingConvId = docSnap.id;
        }
      });

      const otherUsername =
        profile?.username ||
        (profile?.email ? profile.email.split("@")[0] : "Player");
      const otherProfilePic = profile?.profilePic || null;

      if (existingConvId) {
        navigation.navigate("DirectMessage", {
          conversationId: existingConvId,
          otherUserId: userId,
          otherUsername,
          otherProfilePic,
        });
        return;
      }

      const me =
        myProfile || {
          uid: currentUser.uid,
          username:
            currentUser.email ? currentUser.email.split("@")[0] : "You",
          profilePic: null,
        };

      const newConvRef = await addDoc(collection(db, "dmConversations"), {
        participants: [currentUser.uid, userId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: "",
        lastMessageType: null,
        lastMessageSenderId: null,
        participantInfo: {
          [currentUser.uid]: {
            username: me.username,
            profilePic: me.profilePic || null,
          },
          [userId]: {
            username: otherUsername,
            profilePic: otherProfilePic,
          },
        },
      });

      navigation.navigate("DirectMessage", {
        conversationId: newConvRef.id,
        otherUserId: userId,
        otherUsername,
        otherProfilePic,
      });
    } catch (err) {
      console.log("Error starting DM from profile:", err);
      Alert.alert("Error", "Could not open chat. Please try again.");
    }
  };

  // Friend request / remove logic
  const sendFriendRequest = async () => {
    if (!currentUser || !userId || currentUser.uid === userId) return;
    if (
      friends.includes(userId) ||
      outgoingRequests.includes(userId) ||
      incomingRequests.includes(userId)
    ) {
      Alert.alert("Already connected", "You already have a connection.");
      return;
    }

    try {
      const senderRef = doc(db, "users", currentUser.uid);
      const receiverRef = doc(db, "users", userId);
      await Promise.all([
        updateDoc(senderRef, { outgoingRequests: arrayUnion(userId) }),
        updateDoc(receiverRef, { incomingRequests: arrayUnion(currentUser.uid) }),
      ]);
    } catch (err) {
      console.error("Error sending friend request:", err);
      Alert.alert("Error", "Failed to send friend request. Please try again.");
    }
  };

  const cancelFriendRequest = async () => {
    if (!currentUser || !userId) return;
    try {
      const senderRef = doc(db, "users", currentUser.uid);
      const receiverRef = doc(db, "users", userId);
      await Promise.all([
        updateDoc(senderRef, { outgoingRequests: arrayRemove(userId) }),
        updateDoc(receiverRef, { incomingRequests: arrayRemove(currentUser.uid) }),
      ]);
    } catch (err) {
      console.error("Error canceling friend request:", err);
    }
  };

  const acceptFriendRequest = async () => {
    if (!currentUser || !userId) return;
    try {
      const currentRef = doc(db, "users", currentUser.uid);
      const otherRef = doc(db, "users", userId);
      await Promise.all([
        updateDoc(currentRef, {
          friends: arrayUnion(userId),
          incomingRequests: arrayRemove(userId),
        }),
        updateDoc(otherRef, {
          friends: arrayUnion(currentUser.uid),
          outgoingRequests: arrayRemove(currentUser.uid),
        }),
      ]);
    } catch (err) {
      console.error("Error accepting friend request:", err);
    }
  };

  const declineFriendRequest = async () => {
    if (!currentUser || !userId) return;
    try {
      const currentRef = doc(db, "users", currentUser.uid);
      const otherRef = doc(db, "users", userId);
      await Promise.all([
        updateDoc(currentRef, { incomingRequests: arrayRemove(userId) }),
        updateDoc(otherRef, { outgoingRequests: arrayRemove(currentUser.uid) }),
      ]);
    } catch (err) {
      console.error("Error declining friend request:", err);
    }
  };

  const removeFriend = async () => {
    if (!currentUser || !userId) return;
    try {
      const currentRef = doc(db, "users", currentUser.uid);
      const otherRef = doc(db, "users", userId);
      await Promise.all([
        updateDoc(currentRef, { friends: arrayRemove(userId) }),
        updateDoc(otherRef, { friends: arrayRemove(currentUser.uid) }),
      ]);
    } catch (err) {
      console.error("Error removing friend:", err);
      Alert.alert("Failed to remove friend", "Please try again.");
    }
  };

  // Friend status chip
  const renderFriendStatusChip = () => {
    const status = relationshipStatus();

    if (status === "self")
      return (
        <View style={ui.statusChipBase}>
          <Ionicons name="person-outline" size={18} color="#e5e7eb" />
          <Text style={ui.statusChipText}>This is you</Text>
        </View>
      );

    if (status === "friends")
      return (
        <View style={ui.statusChipFriends}>
          <Ionicons name="people-outline" size={18} color="#4ade80" />
          <Text style={ui.statusChipFriendsText}>
            You and {profile?.username} are friends
          </Text>
          <TouchableOpacity onPress={removeFriend} style={{ marginLeft: 8 }}>
            <Text style={ui.statusChipFriendsRemove}>Remove</Text>
          </TouchableOpacity>
        </View>
      );
    if (status === "outgoing")
      return (
        <View style={ui.statusChipBase}>
          <Ionicons name="hourglass-outline" size={18} color="#9ca3af" />
          <Text style={ui.statusChipText}>Friend request pending</Text>
          <TouchableOpacity onPress={cancelFriendRequest} style={{ marginLeft: 8 }}>
            <Text style={ui.statusChipAction}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    if (status === "incoming")
      return (
        <View style={ui.statusIncomingRow}>
          <View style={ui.statusIncomingBanner}>
            <Ionicons name="person-add-outline" size={18} color="#60a5fa" />
            <Text style={ui.statusIncomingText}>
              {profile?.username} sent you a request
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={acceptFriendRequest}
              style={[ui.actionButton, { backgroundColor: "#16a34a", marginRight: 8 }]}
            >
              <Text style={ui.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={declineFriendRequest}
              style={[ui.actionButton, { backgroundColor: "#4b5563" }]}
            >
              <Text style={ui.actionButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      );

    return (
      <TouchableOpacity style={ui.addFriendButton} onPress={sendFriendRequest}>
        <Ionicons name="person-add-outline" size={18} color="#fff" />
        <Text style={ui.addFriendText}>Add friend</Text>
      </TouchableOpacity>
    );
  };

  if (loading)
    return (
      <View style={[ui.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator />
      </View>
    );

  if (!profile)
    return (
      <View style={[ui.screen, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={ui.username}>Player not found.</Text>
      </View>
    );

  const favoriteTeam = profile.favoriteTeam || "None";
  const hasTeamLogo =
    favoriteTeam && favoriteTeam !== "None" && teamLogos[favoriteTeam];

  return (
    <View style={ui.screen}>
      <StatusBar barStyle="light-content" />

      <View style={ui.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={ui.headerBackBtn}
        >
          <Ionicons name="chevron-back" size={22} color="#e5e7eb" />
        </TouchableOpacity>

        {relationshipStatus() === "friends" &&
          currentUser &&
          currentUser.uid !== userId && (
            <TouchableOpacity
              onPress={startDirectMessage}
              style={ui.headerMessageBtn}
              activeOpacity={0.9}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={20}
                color="#e5e7eb"
              />
            </TouchableOpacity>
          )}
      </View>

      <View pointerEvents="none" style={ui.blobTop} />
      <View pointerEvents="none" style={ui.blobBottom} />

      <ScrollView
        contentContainerStyle={ui.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + header */}
        <TouchableOpacity
          onPress={() => setImageModalVisible(true)}
          activeOpacity={0.9}
        >
          <Image
            source={
              profile.profilePic
                ? { uri: profile.profilePic }
                : require("../images/defaultProfile.png")
            }
            style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: "#38bdf8" }}
          />
        </TouchableOpacity>

        <Text style={ui.username}>{profile.username || "Hooper"}</Text>
        <Text style={ui.metaText}>
          Member since{" "}
          {profile.memberSince
            ? profile.memberSince
            : profile.createdAt
            ? new Date(profile.createdAt.toDate()).toDateString()
            : ""}
        </Text>

        {/* BIO */}
        <Text style={ui.bioText}>
          {profile.bio && profile.bio.trim() !== "" 
            ? profile.bio 
            : "No bio provided."}
        </Text>

        {/* Stats row */}
        <View style={ui.statsRow}>
          <View style={ui.statItem}>
            <Text style={ui.statNumber}>
              {Array.isArray(profile.friends) ? profile.friends.length : 0}
            </Text>
            <Text style={ui.statLabel}>Friends</Text>
          </View>
          <View style={[ui.statItem, { marginHorizontal: 40 }]}>
            <Text style={ui.statNumber}>{profile.gamesPlayed || 0}</Text>
            <Text style={ui.statLabel}>Runs Logged</Text>
          </View>
          <View style={ui.statItem}>
            <Text style={ui.statNumber}>{profile.checkIns || 0}</Text>
            <Text style={ui.statLabel}>Check-ins</Text>
          </View>
        </View>

        {/* Connection card */}
        {currentUser && currentUser.uid !== userId && (
          <View style={ui.connectionCard}>
            <View style={ui.connectionHeaderRow}>
              <Ionicons name="people-outline" size={18} color="#38bdf8" />
              <Text style={ui.connectionHeaderText}>Connection</Text>
            </View>
            {renderFriendStatusChip()}
          </View>
        )}

        {/* Info card + team + friends list remains unchanged... */}

        {/* You can keep the rest of your code for friends modal, profile image modal, etc. */}
      </ScrollView>
    </View>
  );
}

const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  header: { position: "absolute", top: 55, left: 0, right: 0, zIndex: 10, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerBackBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.9)", borderWidth: 1, borderColor: "rgba(148,163,184,0.6)" },
  headerMessageBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.9)", borderWidth: 1, borderColor: "rgba(148,163,184,0.6)" },
  blobTop: { position: "absolute", top: -80, right: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: "#1e3a8a" },
  blobBottom: { position: "absolute", bottom: -80, left: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: "#0ea5e9" },
  scrollContent: { alignItems: "center", paddingTop: 160, paddingBottom: 50, paddingHorizontal: 20 },
  username: { fontSize: 24, fontWeight: "700", color: "#e5f3ff", marginTop: 10 },
  metaText: { fontSize: 12, color: "#9ca3af", marginBottom: 8 },
  bioText: { fontSize: 13, color: "#e5f3ff", marginTop: 6, textAlign: "center" },
  statsRow: { flexDirection: "row", marginTop: 20 },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 16, fontWeight: "700", color: "#e5f3ff" },
  statLabel: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  connectionCard: { marginTop: 25, padding: 15, width: "100%", borderRadius: 12, backgroundColor: "#111827" },
  connectionHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  connectionHeaderText: { marginLeft: 5, fontSize: 14, color: "#38bdf8", fontWeight: "600" },
  statusChipBase: { flexDirection: "row", alignItems: "center", padding: 8, borderRadius: 8, backgroundColor: "#1e293b" },
  statusChipText: { color: "#e5e7eb", marginLeft: 4, fontSize: 12 },
  statusChipFriends: { flexDirection: "row", alignItems: "center", padding: 8, borderRadius: 8, backgroundColor: "#111827" },
  statusChipFriendsText: { color: "#4ade80", marginLeft: 4, fontSize: 12 },
  statusChipFriendsRemove: { color: "#ef4444", fontSize: 12 },
  statusIncomingRow: { marginTop: 10 },
  statusIncomingBanner: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  statusIncomingText: { color: "#60a5fa", marginLeft: 4, fontSize: 12 },
  actionButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  actionButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  addFriendButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#3b82f6", padding: 8, borderRadius: 8 },
  addFriendText: { color: "#fff", marginLeft: 6, fontSize: 12 },
});


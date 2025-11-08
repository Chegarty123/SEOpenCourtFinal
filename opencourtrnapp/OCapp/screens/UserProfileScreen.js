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

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, "users", userId);
    const unsub = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        if (data.friends && data.friends.length > 0) {
          // fetch each friend's profile
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
        updateDoc(receiverRef, {
          incomingRequests: arrayUnion(currentUser.uid),
        }),
      ]);
    } catch (err) {
      console.error("Error sending request:", err);
    }
  };

  const cancelFriendRequest = async () => {
    const senderRef = doc(db, "users", currentUser.uid);
    const receiverRef = doc(db, "users", userId);
    await Promise.all([
      updateDoc(senderRef, { outgoingRequests: arrayRemove(userId) }),
      updateDoc(receiverRef, {
        incomingRequests: arrayRemove(currentUser.uid),
      }),
    ]);
  };

  const acceptRequest = async () => {
    const requesterRef = doc(db, "users", userId);
    const currentRef = doc(db, "users", currentUser.uid);
    await Promise.all([
      updateDoc(currentRef, {
        friends: arrayUnion(userId),
        incomingRequests: arrayRemove(userId),
      }),
      updateDoc(requesterRef, {
        friends: arrayUnion(currentUser.uid),
        outgoingRequests: arrayRemove(currentUser.uid),
      }),
    ]);
  };

  const declineRequest = async () => {
    const requesterRef = doc(db, "users", userId);
    const currentRef = doc(db, "users", currentUser.uid);
    await Promise.all([
      updateDoc(currentRef, { incomingRequests: arrayRemove(userId) }),
      updateDoc(requesterRef, {
        outgoingRequests: arrayRemove(currentUser.uid),
      }),
    ]);
  };

  const removeFriend = async () => {
    Alert.alert("Remove friend?", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const currentRef = doc(db, "users", currentUser.uid);
          const otherRef = doc(db, "users", userId);
          await Promise.all([
            updateDoc(currentRef, { friends: arrayRemove(userId) }),
            updateDoc(otherRef, { friends: arrayRemove(currentUser.uid) }),
          ]);
        },
      },
    ]);
  };

  const renderFriendStatusChip = () => {
    const status = relationshipStatus();
    if (status === "self") return null;
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
            <TouchableOpacity onPress={acceptRequest} style={{ marginRight: 6 }}>
              <Ionicons name="checkmark-circle-outline" size={26} color="#16a34a" />
            </TouchableOpacity>
            <TouchableOpacity onPress={declineRequest}>
              <Ionicons name="close-circle-outline" size={26} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      );
    return (
      <TouchableOpacity onPress={sendFriendRequest} style={ui.addFriendButton}>
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#e5e7eb" />
        </TouchableOpacity>
      </View>

      <View pointerEvents="none" style={ui.blobTop} />
      <View pointerEvents="none" style={ui.blobBottom} />

      <ScrollView contentContainerStyle={ui.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => setImageModalVisible(true)}>
          <Image
            source={
              profile.profilePic
                ? { uri: profile.profilePic }
                : require("../images/defaultProfile.png")
            }
            style={globalStyles.profileImage}
          />
        </TouchableOpacity>

        <Text style={ui.username}>{profile.username}</Text>
        <Text style={ui.metaText}>Member since {profile.memberSince}</Text>

        {/* FRIENDS COUNT - now clickable */}
        <View style={ui.statsRow}>
          <TouchableOpacity onPress={() => setFriendsModalVisible(true)} style={ui.statItem}>
            <Text style={ui.statNumber}>{profile.friends?.length || 0}</Text>
            <Text style={ui.statLabel}>Friends</Text>
          </TouchableOpacity>
        </View>

        {currentUser && currentUser.uid !== userId && (
          <View style={ui.connectionCard}>
            <View style={ui.connectionHeaderRow}>
              <Ionicons name="people-outline" size={18} color="#38bdf8" />
              <Text style={ui.connectionHeaderText}>Connection</Text>
            </View>
            {renderFriendStatusChip()}
          </View>
        )}

        <View style={ui.infoCard}>
          <Text style={ui.sectionLabel}>Natural Position</Text>
          <Text style={ui.sectionValue}>{profile.position}</Text>

          <Text style={[ui.sectionLabel, { marginTop: 14 }]}>Grade Level</Text>
          <Text style={ui.sectionValue}>{profile.gradeLevel}</Text>

          <Text style={[ui.sectionLabel, { marginTop: 14 }]}>
            Favorite NBA Team
          </Text>
          {/* team row with logo + name */}
          <View style={ui.teamRow}>
            {hasTeamLogo ? (
              <View style={ui.teamDisplay}>
                <Image
                  source={teamLogos[favoriteTeam]}
                  style={ui.teamLogo}
                  resizeMode="contain"
                />
                <Text style={ui.teamName}>{favoriteTeam}</Text>
              </View>
            ) : (
              <Text style={ui.sectionValue}>None</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Friend List Modal */}
      <Modal
        visible={friendsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFriendsModalVisible(false)}
      >
        <View style={ui.modalBackdrop}>
          <View style={ui.friendModalContainer}>
            <View style={ui.friendModalHeader}>
              <Text style={ui.friendModalTitle}>Friends</Text>
              <TouchableOpacity onPress={() => setFriendsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {friendsList.length > 0 ? (
              <FlatList
                data={friendsList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={ui.friendItem}
                    onPress={() => {
                      setFriendsModalVisible(false);
                      // push a new UserProfile screen for that friend
                      navigation.push("UserProfile", { userId: item.id });
                    }}
                  >
                    <Image
                      source={
                        item.profilePic
                          ? { uri: item.profilePic }
                          : require("../images/defaultProfile.png")
                      }
                      style={ui.friendImage}
                    />
                    <Text style={ui.friendName}>{item.username}</Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <Text style={ui.emptyText}>No friends yet.</Text>
            )}

          </View>
        </View>
      </Modal>

      {/* Profile Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <Pressable style={ui.modalBackdrop} onPress={() => setImageModalVisible(false)}>
          <Image
            source={
              profile.profilePic
                ? { uri: profile.profilePic }
                : require("../images/defaultProfile.png")
            }
            style={ui.modalImage}
          />
          <Ionicons name="close-circle" size={36} color="#fff" style={ui.modalClose} />
        </Pressable>
      </Modal>
    </View>
  );
}

const ui = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617",
  },
  header: {
    position: "absolute",
    top: 55,
    left: 20,
    zIndex: 10,
  },
  blobTop: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(56,189,248,0.22)",
  },
  blobBottom: {
    position: "absolute",
    top: 180,
    left: -110,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(251,146,60,0.16)",
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  username: { fontSize: 20, fontWeight: "700", color: "#e5f3ff", marginTop: 10 },
  metaText: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
    marginBottom: 10,
    width: "80%",
  },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 16, fontWeight: "700", color: "#f9fafb" },
  statLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  connectionCard: {
    width: "100%",
    maxWidth: 420,
    marginTop: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.98)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.55)",
  },
  connectionHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  connectionHeaderText: { marginLeft: 6, fontSize: 14, fontWeight: "700", color: "#e5f3ff" },
  statusChipBase: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.65)",
  },
  statusChipText: { marginLeft: 8, fontSize: 13, fontWeight: "500", color: "#e5e7eb" },
  statusChipAction: { fontSize: 12, fontWeight: "600", color: "#f97373" },
  statusChipFriends: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(22,163,74,0.18)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.7)",
  },
  statusChipFriendsText: { marginLeft: 8, fontSize: 13, fontWeight: "600", color: "#bbf7d0" },
  statusChipFriendsRemove: { fontSize: 12, fontWeight: "600", color: "#fecaca" },
  statusIncomingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusIncomingBanner: {
    flex: 1,
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(37,99,235,0.20)",
  },
  statusIncomingText: { marginLeft: 4, fontSize: 13, fontWeight: "600", color: "#dbeafe" },
  addFriendButton: {
    alignSelf: "flex-start",
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#1f6fb2",
  },
  addFriendText: { marginLeft: 8, fontSize: 14, fontWeight: "700", color: "#fff" },
  infoCard: {
    width: "100%",
    maxWidth: 420,
    marginTop: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.98)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.55)",
  },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#cbd5f5" },
  sectionValue: { marginTop: 2, fontSize: 13, color: "#e5f3ff" },

  // 🏀 favorite team row
  teamRow: {
    marginTop: 4,
  },
  teamDisplay: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
  },
  teamLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
  },
  teamName: {
    fontSize: 13,
    color: "#e5f3ff",
    fontWeight: "600",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  friendModalContainer: {
    width: "85%",
    maxHeight: "70%",
    backgroundColor: "rgba(15,23,42,0.95)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
  },
  friendModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  friendModalTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  friendImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendName: { fontSize: 15, color: "#f3f4f6", fontWeight: "600" },
  emptyText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 20,
  },
  modalImage: {
    width: "90%",
    height: "60%",
    borderRadius: 12,
    resizeMode: "contain",
  },
  modalClose: { position: "absolute", top: 50, right: 30 },
});

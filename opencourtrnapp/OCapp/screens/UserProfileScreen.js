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
import { NBA_TEAM_LOGOS } from "../utils/profileUtils";

// Team logos now imported from centralized utility

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

  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const badgeDescriptions = {
  "Rookie": "Awarded for a user's first court check-in.",
  // "MVP": "Awarded for being voted MVP in a run.",
  // "Sniper": "Awarded for being voted the best shooter in a run.",
  "Co-Founder": "Verified Co-Founder of OpenCourt",
  "Alpha": "OG Alpha Tester for OpenCourt"
};
const BADGE_IMAGES = {
  "Co-Founder": require("../assets/co-founder.png"),
  "Alpha": require("../assets/alpha.png"),
  "Rookie": require("../assets/rookie.png"),
};


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
      } else {
        setProfile(null);
      }

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
        updateDoc(receiverRef, {
          incomingRequests: arrayUnion(currentUser.uid),
        }),
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
        updateDoc(receiverRef, {
          incomingRequests: arrayRemove(currentUser.uid),
        }),
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
        updateDoc(currentRef, {
          incomingRequests: arrayRemove(userId),
        }),
        updateDoc(otherRef, {
          outgoingRequests: arrayRemove(currentUser.uid),
        }),
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
        updateDoc(currentRef, {
          friends: arrayRemove(userId),
        }),
        updateDoc(otherRef, {
          friends: arrayRemove(currentUser.uid),
        }),
      ]);
    } catch (err) {
      console.error("Error removing friend:", err);
      Alert.alert("Failed to remove friend", "Please try again.");
    }
  };

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
          <TouchableOpacity
            onPress={cancelFriendRequest}
            style={{ marginLeft: 8 }}
          >
            <Text style={ui.statusChipAction}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );

    if (status === "incoming")
      return (
        <View style={ui.statusIncomingRow}>
          <View style={ui.statusIncomingBanner}>
            <Ionicons
              name="person-add-outline"
              size={18}
              color="#60a5fa"
            />
            <Text style={ui.statusIncomingText}>
              {profile?.username} sent you a request
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={acceptFriendRequest}
              style={[
                ui.actionButton,
                { backgroundColor: "#16a34a", marginRight: 8 },
              ]}
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
      <TouchableOpacity
        style={ui.addFriendButton}
        onPress={sendFriendRequest}
      >
        <Ionicons name="person-add-outline" size={18} color="#fff" />
        <Text style={ui.addFriendText}>Add friend</Text>
      </TouchableOpacity>
    );
  };

  if (loading)
    return (
      <View
        style={[
          ui.screen,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator />
      </View>
    );

  if (!profile)
    return (
      <View
        style={[
          ui.screen,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={ui.username}>Player not found.</Text>
      </View>
    );

  const favoriteTeam = profile.favoriteTeam || "None";
  const hasTeamLogo =
    favoriteTeam && favoriteTeam !== "None" && NBA_TEAM_LOGOS[favoriteTeam];

  return (
    <View style={ui.screen}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
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
            <Pressable
              onPress={startDirectMessage}
              style={({ pressed }) => [
                ui.headerMessageBtn,
                pressed && {
                  backgroundColor: "#0b1120",          // slightly darker
                  borderColor: "#60a5fa",              // subtle accent on press
                  transform: [{ scale: 0.96 }],        // tiny “press in” effect
                },
              ]}
              android_ripple={{ color: "rgba(148,163,184,0.4)", borderless: true }}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={20}
                color="#e5e7eb"
              />
            </Pressable>
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
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              borderWidth: 2,
              borderColor: "#38bdf8",
            }}
          />
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
  <Text style={ui.username}>{profile.username || "Hooper"}</Text>
  {profile.selectedBadge && (
    <TouchableOpacity onPress={() => setBadgeModalVisible(true)}>
      <Image source={BADGE_IMAGES[profile.selectedBadge]} style={{ width: 26, height: 26, marginLeft: 6, marginTop: 10}} />
    </TouchableOpacity>
  )}
</View>

        {/* BIO */}
        <Text style={ui.bioText}>
          {profile.bio && profile.bio.trim() !== ""
            ? profile.bio
            : "No bio provided."}
        </Text>

        <Text style={ui.metaText}>
          Member since{" "}
          {profile.memberSince
            ? profile.memberSince
            : profile.createdAt
            ? new Date(profile.createdAt.toDate()).toDateString()
            : ""}
        </Text>

        {/* Stats row */}
        <View style={ui.statsRow}>
          <View style={ui.statItem}>
            <Text style={ui.statNumber}>
              {Array.isArray(profile.friends)
                ? profile.friends.length
                : 0}
            </Text>
            <Text style={ui.statLabel}>Friends</Text>
          </View>
          <View style={[ui.statItem, { marginHorizontal: 40 }]}>
            <Text style={ui.statNumber}>
              {profile.gamesPlayed || 0}
            </Text>
            <Text style={ui.statLabel}>Runs Logged</Text>
          </View>
          <View style={ui.statItem}>
            <Text style={ui.statNumber}>
              {profile.checkIns || 0}
            </Text>
            <Text style={ui.statLabel}>Check-ins</Text>
          </View>
        </View>

        {/* Connection card */}
        {currentUser && currentUser.uid !== userId && (
          <View style={ui.connectionCard}>
            <View style={ui.connectionHeaderRow}>
              <Ionicons
                name="people-outline"
                size={18}
                color="#38bdf8"
              />
              <Text style={ui.connectionHeaderText}>Connection</Text>
            </View>
            {renderFriendStatusChip()}
          </View>
        )}

        {/* Info card */}
        <View style={ui.infoCard}>
          <View style={ui.infoHeaderRow}>
            <Ionicons
              name="basketball-outline"
              size={18}
              color="#f97316"
            />
            <Text style={ui.infoHeaderText}>Hooper profile</Text>
          </View>

          <View style={ui.infoRow}>
            <Text style={ui.infoLabel}>Position</Text>
            <Text style={ui.infoValue}>
              {profile.position || "Not set"}
            </Text>
          </View>

          <View style={ui.infoRow}>
            <Text style={ui.infoLabel}>Grade</Text>
            <Text style={ui.infoValue}>
              {profile.gradeLevel || "Not set"}
            </Text>
          </View>

          <View style={[ui.infoRow, { alignItems: "flex-start" }]}>
            <Text style={ui.infoLabel}>Favorite team</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {hasTeamLogo && (
                <Image
                  source={NBA_TEAM_LOGOS[favoriteTeam]}
                  style={ui.infoTeamLogo}
                />
              )}
              <Text style={ui.infoValue}>
                {favoriteTeam && favoriteTeam !== "None"
                  ? favoriteTeam
                  : "Not set"}
              </Text>
            </View>
          </View>
        </View>

        {/* Friends card */}
        <View style={ui.friendsCard}>
          <View style={ui.friendsHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="people-outline"
                size={18}
                color="#38bdf8"
              />
              <Text style={ui.friendsHeaderText}>Friends</Text>
            </View>
            {friendsList.length > 0 && (
              <TouchableOpacity onPress={() => setFriendsModalVisible(true)}>
                <Text style={ui.viewAllButtonText}>View all</Text>
              </TouchableOpacity>
            )}
          </View>

          {friendsList.length === 0 ? (
            <Text style={ui.emptyText}>
              {profile.username || "This hooper"} hasn&apos;t added any
              friends yet.
            </Text>
          ) : (
            <FlatList
              data={friendsList.slice(0, 8)}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={ui.friendAvatarContainer}
                  onPress={() =>
                    navigation.push("UserProfile", { userId: item.id })
                  }
                >
                  <Image
                    source={
                      item.profilePic
                        ? { uri: item.profilePic }
                        : require("../images/defaultProfile.png")
                    }
                    style={ui.friendAvatar}
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </ScrollView>

      {/* Profile image modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <Pressable
          style={ui.modalBackdrop}
          onPress={() => setImageModalVisible(false)}
        >
          <View style={ui.modalImageWrapper}>
            <Image
              source={
                profile.profilePic
                  ? { uri: profile.profilePic }
                  : require("../images/defaultProfile.png")
              }
              style={ui.modalImage}
            />
          </View>
          <TouchableOpacity
            onPress={() => setImageModalVisible(false)}
            style={ui.modalClose}
          >
            <Ionicons
              name="close-circle-outline"
              size={32}
              color="#e5e7eb"
            />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* Friends modal */}
      <Modal
        visible={friendsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFriendsModalVisible(false)}
      >
        <View style={ui.modalBackdrop}>
          <View style={ui.modalContent}>
            <View style={ui.modalHeaderRow}>
              <Text style={ui.modalTitle}>Friends</Text>
              <TouchableOpacity onPress={() => setFriendsModalVisible(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color="#e5e7eb"
                />
              </TouchableOpacity>
            </View>
            {friendsList.length === 0 ? (
              <Text style={ui.emptyText}>
                {profile.username || "This hooper"} has no friends
                listed.
              </Text>
            ) : (
              <FlatList
                data={friendsList}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => (
                  <View style={ui.modalSeparator} />
                )}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={ui.modalFriendRow}
                    onPress={() => {
                      setFriendsModalVisible(false);
                      navigation.push("UserProfile", { userId: item.id });
                    }}
                  >
                    <Image
                      source={
                        item.profilePic
                          ? { uri: item.profilePic }
                          : require("../images/defaultProfile.png")
                      }
                      style={ui.modalFriendAvatar}
                    />
                    <View>
                      <Text style={ui.modalFriendName}>
                        {item.username || "Hooper"}
                      </Text>
                      <Text style={ui.modalFriendMeta}>
                        {item.position || "Position not set"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
      <Modal visible={badgeModalVisible} transparent animationType="fade">
  <View style={ui.modalBackdrop}>
    <View style={[ui.modalContent, ui.badgeModalContent]}>
      <Text style={ui.modalTitle}>{profile.selectedBadge}</Text>
      <Image
  source={BADGE_IMAGES[profile.selectedBadge]}
  style={{ width: 48, height: 48, marginVertical: 12 }}
/>
      <Text style={ui.modalDescription}>
        {badgeDescriptions[profile.selectedBadge] || "No description available."}
      </Text>
      <TouchableOpacity onPress={() => setBadgeModalVisible(false)}>
        <Text style={ui.modalCloseText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
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
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
  },
  headerMessageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
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
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(251,146,60,0.16)",
  },
  scrollContent: {
    alignItems: "center",
    paddingTop: 160,
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e5f3ff",
    marginTop: 10,
  },
  bioText: {
    fontSize: 13,
    color: "#e5f3ff",
    marginTop: 6,
    textAlign: "center",
  },
  metaText: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },
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
  connectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  connectionHeaderText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#38bdf8",
    fontWeight: "600",
  },
  statusChipBase: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
  },
  statusChipText: {
    color: "#e5e7eb",
    marginLeft: 6,
    fontSize: 12,
  },
  statusChipFriends: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#022c22",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.8)",
  },
  statusChipFriendsText: {
    color: "#bbf7d0",
    marginLeft: 6,
    fontSize: 12,
    flexShrink: 1,
  },
  statusChipFriendsRemove: {
    color: "#f97316",
    fontSize: 12,
    fontWeight: "600",
  },
  statusChipAction: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: "600",
  },
  statusIncomingRow: {
    marginTop: 4,
  },
  statusIncomingBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  statusIncomingText: {
    color: "#60a5fa",
    marginLeft: 6,
    fontSize: 12,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  actionButtonText: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "600",
  },
  addFriendButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#2563eb",
  },
  addFriendText: {
    color: "#f9fafb",
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  infoCard: {
    width: "100%",
    maxWidth: 420,
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.98)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
  },
  infoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoHeaderText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#f97316",
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: "#9ca3af",
  },
  infoValue: {
    fontSize: 13,
    color: "#e5e7eb",
    fontWeight: "500",
  },
  infoTeamLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
  },
  friendsCard: {
    width: "100%",
    maxWidth: 420,
    marginTop: 14,
    marginBottom: 32,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.98)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
  },
  friendsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  friendsHeaderText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#38bdf8",
    fontWeight: "600",
  },
  viewAllButtonText: {
    fontSize: 12,
    color: "#60a5fa",
    fontWeight: "600",
  },
  friendAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    marginRight: 6,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
  },
  friendAvatar: {
    width: "100%",
    height: "100%",
  },
  emptyText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalImageWrapper: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.8)",
  },
  modalImage: {
    width: "100%",
    height: 260,
    borderRadius: 12,
    resizeMode: "cover",
  },
  modalClose: {
    position: "absolute",
    top: 50,
    right: 30,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "75%",
    backgroundColor: "#020617",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.9)",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e5f3ff",
  },
  modalSeparator: {
    height: 1,
    backgroundColor: "rgba(15,23,42,0.9)",
    marginVertical: 8,
  },
  modalFriendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  modalFriendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  modalFriendName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  modalFriendMeta: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  modalDescription: { fontSize: 13, color: "#e5e7eb", marginTop: 8, textAlign: "center" },
modalCloseText: { fontSize: 14, color: "#60a5fa", marginTop: 12, fontWeight: "600" },
badgeModalContent: {
  alignItems: "center", // centers horizontally
  justifyContent: "center", // centers vertically if needed
  textAlign: "center",
},
});

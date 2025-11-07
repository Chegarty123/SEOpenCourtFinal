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
import { styles } from "../styles/globalStyles";

export default function UserProfileScreen({ route }) {
  const { userId } = route.params || {};
  const currentUser = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false); // 👈 NEW

  // friendship state
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const refDoc = doc(db, "users", userId);
        const snap = await getDoc(refDoc);

        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            username: data.username || "Player",
            profilePic: data.profilePic || null,
            position: data.position || "Unknown position",
            gradeLevel: data.gradeLevel || "Unknown grade",
            favoriteTeam: data.favoriteTeam || "None",
            memberSince: data.memberSince || "Unknown",
          });
        } else {
          setProfile({
            username: "Player",
            profilePic: null,
            position: "Unknown position",
            gradeLevel: "Unknown grade",
            favoriteTeam: "None",
            memberSince: "Unknown",
          });
        }
      } catch (err) {
        console.log("Error loading user profile:", err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  useEffect(() => {
    if (!currentUser) return;
    const currentRef = doc(db, "users", currentUser.uid);
    const unsubSnap = onSnapshot(currentRef, (snap) => {
      const data = snap.data() || {};
      setFriends(data.friends || []);
      setIncomingRequests(data.incomingRequests || []);
      setOutgoingRequests(data.outgoingRequests || []);
    });
    return unsubSnap;
  }, [currentUser]);

  // friend logic (unchanged)
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
      setOutgoingRequests((prev) => [...prev, userId]);
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
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

  const relationship =
    !currentUser || !userId
      ? "none"
      : currentUser.uid === userId
      ? "self"
      : friends.includes(userId)
      ? "friends"
      : outgoingRequests.includes(userId)
      ? "outgoing"
      : incomingRequests.includes(userId)
      ? "incoming"
      : "none";

  const renderFriendStatusChip = () => {
    if (!currentUser || !userId || relationship === "self") return null;

    // same chip UI as before
    if (relationship === "friends") {
      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 999,
            backgroundColor: "#dcfce7",
          }}
        >
          <Ionicons name="people-outline" size={18} color="#16a34a" />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 13,
              fontWeight: "600",
              color: "#166534",
            }}
          >
            You and {profile?.username || "this player"} are friends
          </Text>
        </View>
      );
    }

    if (relationship === "outgoing") {
      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 999,
            backgroundColor: "#f3f4f6",
          }}
        >
          <Ionicons name="hourglass-outline" size={18} color="#9ca3af" />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 13,
              fontWeight: "500",
              color: "#6b7280",
            }}
          >
            Friend request pending
          </Text>
        </View>
      );
    }

    if (relationship === "incoming") {
      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 999,
              backgroundColor: "#e0f2fe",
              flex: 1,
              marginRight: 12,
            }}
          >
            <Ionicons name="person-add-outline" size={18} color="#1f6fb2" />
            <Text
              style={{
                marginLeft: 8,
                fontSize: 13,
                fontWeight: "600",
                color: "#0b2239",
              }}
            >
              {profile?.username || "This player"} sent you a request
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={acceptRequest} style={{ marginRight: 8 }}>
              <Ionicons
                name="checkmark-circle-outline"
                size={26}
                color="#16a34a"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={declineRequest}>
              <Ionicons name="close-circle-outline" size={26} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={sendFriendRequest}
        activeOpacity={0.9}
        style={{
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "center",
          paddingVertical: 10,
          paddingHorizontal: 18,
          borderRadius: 999,
          backgroundColor: "#1f6fb2",
        }}
      >
        <Ionicons name="person-add-outline" size={18} color="#fff" />
        <Text
          style={{
            marginLeft: 8,
            color: "#fff",
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          Add friend
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator />
        <Text style={styles.memberSince}>Loading player...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Text style={styles.username}>Player not found.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Profile Picture with zoom feature */}
          <TouchableOpacity onPress={() => setImageModalVisible(true)}>
            <Image
              source={
                profile.profilePic
                  ? { uri: profile.profilePic }
                  : require("../images/defaultProfile.png")
              }
              style={styles.profileImage}
            />
          </TouchableOpacity>

          <Text style={styles.username}>{profile.username}</Text>
          <Text style={styles.memberSince}>
            Member since {profile.memberSince}
          </Text>

          {/* Connection / friend status block */}
          {currentUser && currentUser.uid !== userId && (
            <View
              style={{
                width: "100%",
                maxWidth: 400,
                marginTop: 4,
                padding: 14,
                backgroundColor: "#fff",
                borderRadius: 14,
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="people-outline" size={18} color="#0b2239" />
                <Text
                  style={{
                    marginLeft: 6,
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#0b2239",
                  }}
                >
                  Connection
                </Text>
              </View>

              {renderFriendStatusChip()}
            </View>
          )}

          {/* Position / grade / favorite team card */}
          <View style={styles.positionContainer}>
            <Text style={styles.label}>Natural Position</Text>
            <Text style={styles.positionDisplay}>{profile.position}</Text>

            <View style={styles.gradeContainer}>
              <Text style={styles.label}>Grade Level</Text>
              <Text style={styles.gradeDisplay}>{profile.gradeLevel}</Text>
            </View>

            <View style={styles.teamContainer}>
              <Text style={styles.label}>Favorite NBA Team</Text>
              <Text style={styles.teamDisplay}>{profile.favoriteTeam}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fullscreen modal image viewer */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setImageModalVisible(false)}
        >
          <Image
            source={
              profile.profilePic
                ? { uri: profile.profilePic }
                : require("../images/defaultProfile.png")
            }
            style={{
              width: "90%",
              height: "60%",
              borderRadius: 12,
              resizeMode: "contain",
            }}
          />
          <Ionicons
            name="close-circle"
            size={36}
            color="#fff"
            style={{ position: "absolute", top: 50, right: 30 }}
          />
        </Pressable>
      </Modal>
    </>
  );
}

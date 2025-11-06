// screens/FriendScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { db, auth } from "../firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles/globalStyles";

const defaultAvatar = require("../images/defaultProfile.png");

export default function FriendScreen() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  // Track auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsubAuth;
  }, []);

  // Fetch all users except self
  useEffect(() => {
    if (!currentUser) return;

    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const list = [];
        usersSnapshot.forEach((docSnap) => {
          if (docSnap.id !== currentUser.uid) {
            const data = docSnap.data();
            list.push({
              uid: docSnap.id,
              username: data.username || "Unnamed",
              avatar: data.profilePic ? { uri: data.profilePic } : defaultAvatar,
            });
          }
        });
        setAllUsers(list);
      } catch (err) {
        console.error("Error loading users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  // Listen to current user's friend data
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

  // Send friend request
  const sendFriendRequest = async (user) => {
    if (!currentUser) return;
    try {
      if (
        outgoingRequests.includes(user.uid) ||
        incomingRequests.includes(user.uid) ||
        friends.includes(user.uid)
      ) {
        Alert.alert("Already connected", "You already have a connection with this user.");
        return;
      }

      const senderRef = doc(db, "users", currentUser.uid);
      const receiverRef = doc(db, "users", user.uid);

      await Promise.all([
        updateDoc(senderRef, { outgoingRequests: arrayUnion(user.uid) }),
        updateDoc(receiverRef, { incomingRequests: arrayUnion(currentUser.uid) }),
      ]);
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  };

  const acceptRequest = async (uid) => {
    try {
      const requesterRef = doc(db, "users", uid);
      const currentRef = doc(db, "users", currentUser.uid);

      await Promise.all([
        updateDoc(currentRef, {
          friends: arrayUnion(uid),
          incomingRequests: arrayRemove(uid),
        }),
        updateDoc(requesterRef, {
          friends: arrayUnion(currentUser.uid),
          outgoingRequests: arrayRemove(currentUser.uid),
        }),
      ]);
    } catch (err) {
      console.error("Error accepting request:", err);
    }
  };

  const declineRequest = async (uid) => {
    try {
      const requesterRef = doc(db, "users", uid);
      const currentRef = doc(db, "users", currentUser.uid);

      await Promise.all([
        updateDoc(currentRef, { incomingRequests: arrayRemove(uid) }),
        updateDoc(requesterRef, { outgoingRequests: arrayRemove(currentUser.uid) }),
      ]);
    } catch (err) {
      console.error("Error declining request:", err);
    }
  };

  const removeFriend = async (uid) => {
    try {
      const currentRef = doc(db, "users", currentUser.uid);
      const friendRef = doc(db, "users", uid);

      await Promise.all([
        updateDoc(currentRef, { friends: arrayRemove(uid) }),
        updateDoc(friendRef, { friends: arrayRemove(currentUser.uid) }),
      ]);
    } catch (err) {
      console.error("Error removing friend:", err);
      Alert.alert("Failed to remove friend", "Please try again.");
    }
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(searchText.toLowerCase()) &&
      !friends.includes(u.uid)
  );

  if (loading || !currentUser) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading friends...</Text>
      </View>
    );
  }

  const renderUserRow = (user, actionType = "add") => (
    <View
      key={user.uid}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomColor: "#e5e7eb",
        borderBottomWidth: 1,
      }}
    >
      <Image
        source={user.avatar}
        style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }}
      />
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#0b2239", flex: 1 }}>
        {user.username}
      </Text>
      {actionType === "add" && (
        <TouchableOpacity onPress={() => sendFriendRequest(user)}>
          <Ionicons name="person-add-outline" size={22} color="#1f6fb2" />
        </TouchableOpacity>
      )}
      {actionType === "accept" && (
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity onPress={() => acceptRequest(user.uid)} style={{ marginRight: 10 }}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#16a34a" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => declineRequest(user.uid)}>
            <Ionicons name="close-circle-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}
      {actionType === "remove" && (
        <TouchableOpacity onPress={() => removeFriend(user.uid)}>
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.homeWrap} contentContainerStyle={{ paddingBottom: 24 }}>
      <TextInput
        placeholder="Search users..."
        value={searchText}
        onChangeText={setSearchText}
        style={{
          backgroundColor: "#fff",
          padding: 10,
          borderRadius: 10,
          marginBottom: 15,
          fontSize: 16,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 5,
          elevation: 2,
        }}
      />

      {searchText.length > 0 && (
        <View style={styles.courtCard}>
          <Text style={styles.cardHeaderText}>Search Results</Text>
          {filteredUsers.length === 0 ? (
            <Text style={{ color: "#64748b", marginTop: 8 }}>No users found.</Text>
          ) : (
            filteredUsers.map((u) => renderUserRow(u, "add"))
          )}
        </View>
      )}

      <View style={styles.courtCard}>
        <Text style={styles.cardHeaderText}>Incoming Friend Requests</Text>
        {incomingRequests.length === 0 ? (
          <Text style={{ color: "#64748b", marginTop: 8 }}>No incoming requests.</Text>
        ) : (
          allUsers
            .filter((u) => incomingRequests.includes(u.uid))
            .map((u) => renderUserRow(u, "accept"))
        )}
      </View>

      <View style={styles.courtCard}>
        <Text style={styles.cardHeaderText}>Friends</Text>
        {friends.length === 0 ? (
          <Text style={{ color: "#64748b", marginTop: 8 }}>No friends yet.</Text>
        ) : (
          allUsers.filter((u) => friends.includes(u.uid)).map((u) => renderUserRow(u, "remove"))
        )}
      </View>
    </ScrollView>
  );
}

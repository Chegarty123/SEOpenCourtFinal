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
import { db } from "../firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { auth } from "../firebaseConfig"; 
import { onAuthStateChanged } from "firebase/auth";
import { styles } from "../styles/globalStyles.js";

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

  // Listen to current user's friend data in real-time
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

  // Send Friend Request
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

      console.log(`Friend request sent from ${currentUser.uid} to ${user.uid}`);
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  };

  // Accept Friend Request
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

  // Decline Friend Request
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

  // Remove friend (mutual removal)
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

  const renderSearchUser = (user) => {
    const isFriend = friends.includes(user.uid);
    const isOutgoing = outgoingRequests.includes(user.uid);
    const isIncoming = incomingRequests.includes(user.uid);

    return (
      <View
        key={user.uid}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#fff",
          padding: 10,
          borderRadius: 10,
          marginBottom: 5,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 5,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image
            source={user.avatar}
            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
          />
          <Text style={{ fontSize: 16 }}>{user.username}</Text>
        </View>

        {isFriend ? (
          <Text style={{ color: "green", fontWeight: "600" }}>Friends</Text>
        ) : isOutgoing ? (
          <Text style={{ color: "#999" }}>Requested</Text>
        ) : isIncoming ? (
          <Text style={{ color: "#f39c12" }}>Incoming</Text>
        ) : (
          <TouchableOpacity
            style={{
              backgroundColor: "#3498db",
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 5,
            }}
            onPress={() => sendFriendRequest(user)}
          >
            <Text style={{ color: "white" }}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFriendCard = (user) => (
    <View
      key={user.uid}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 10,
        marginBottom: 5,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Image
          source={user.avatar}
          style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
        />
        <Text style={{ fontSize: 16 }}>{user.username}</Text>
      </View>
      <TouchableOpacity
        onPress={() => removeFriend(user.uid)}
        style={{
          backgroundColor: "#e74c3c",
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 5,
        }}
      >
        <Text style={{ color: "#fff" }}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  const filteredUsers = allUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(searchText.toLowerCase()) &&
      !friends.includes(u.uid)
  );

  if (loading || !currentUser) {
    return (
      <View
        style={[styles.container, { justifyContent: "center", alignItems: "center" }]}
      >
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading friends...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 15, backgroundColor: "#f5f5f5" }}>
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
        <View style={{ marginBottom: 20 }}>
          {filteredUsers.length === 0 ? (
            <Text style={{ color: "#888" }}>No users found.</Text>
          ) : (
            filteredUsers.map(renderSearchUser)
          )}
        </View>
      )}

      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        Incoming Friend Requests
      </Text>
      {incomingRequests.length === 0 ? (
        <Text style={{ color: "#888", marginBottom: 15 }}>No incoming requests.</Text>
      ) : (
        allUsers
          .filter((u) => incomingRequests.includes(u.uid))
          .map((user) => (
            <View
              key={user.uid}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#fff",
                padding: 10,
                borderRadius: 10,
                marginBottom: 5,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 5,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={user.avatar}
                  style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
                />
                <Text style={{ fontSize: 16 }}>{user.username}</Text>
              </View>

              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: "green",
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 5,
                    marginRight: 5,
                  }}
                  onPress={() => acceptRequest(user.uid)}
                >
                  <Text style={{ color: "white" }}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: "red",
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 5,
                  }}
                  onPress={() => declineRequest(user.uid)}
                >
                  <Text style={{ color: "white" }}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
      )}

      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10, marginTop: 20 }}>
        Friends
      </Text>
      {friends.length === 0 ? (
        <Text style={{ color: "#888" }}>No friends yet. Add some from above!</Text>
      ) : (
        allUsers.filter((u) => friends.includes(u.uid)).map(renderFriendCard)
      )}
    </ScrollView>
  );
}

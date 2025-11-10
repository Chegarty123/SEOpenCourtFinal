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
  StatusBar,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

export default function FriendScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [showAllSearchResults, setShowAllSearchResults] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [sectionsExpanded, setSectionsExpanded] = useState({
    incoming: true,
    pending: false,
    friends: true,
  });

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
        Alert.alert(
          "Already connected",
          "You already have a connection with this user."
        );
        return;
      }

      // Instant UI feedback
      setOutgoingRequests((prev) => [...prev, user.uid]);

      const senderRef = doc(db, "users", currentUser.uid);
      const receiverRef = doc(db, "users", user.uid);

      await Promise.all([
        updateDoc(senderRef, { outgoingRequests: arrayUnion(user.uid) }),
        updateDoc(receiverRef, { incomingRequests: arrayUnion(currentUser.uid) }),
      ]);
    } catch (err) {
      console.error("Error sending friend request:", err);
      setOutgoingRequests((prev) => prev.filter((id) => id !== user.uid));
      Alert.alert("Error", "Failed to send friend request. Please try again.");
    }
  };

  // Accept incoming request
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

  // Decline incoming request
  const declineRequest = async (uid) => {
    try {
      const requesterRef = doc(db, "users", uid);
      const currentRef = doc(db, "users", currentUser.uid);

      await Promise.all([
        updateDoc(currentRef, { incomingRequests: arrayRemove(uid) }),
        updateDoc(requesterRef, {
          outgoingRequests: arrayRemove(currentUser.uid),
        }),
      ]);
    } catch (err) {
      console.error("Error declining request:", err);
    }
  };

  // Cancel outgoing (pending) request
  const cancelOutgoingRequest = async (uid) => {
    if (!currentUser) return;
    try {
      const currentRef = doc(db, "users", currentUser.uid);
      const otherRef = doc(db, "users", uid);

      await Promise.all([
        updateDoc(currentRef, { outgoingRequests: arrayRemove(uid) }),
        updateDoc(otherRef, {
          incomingRequests: arrayRemove(currentUser.uid),
        }),
      ]);
    } catch (err) {
      console.error("Error cancelling request:", err);
      Alert.alert("Error", "Failed to cancel friend request. Please try again.");
    }
  };

  // Remove existing friend
  const removeFriend = async (uid) => {
    try {
      const currentRef = doc(db, "users", currentUser.uid);
      const friendRef = doc(db, "users", uid);

      await Promise.all([
        updateDoc(currentRef, { friends: arrayRemove(uid) }),
        updateDoc(friendRef, { friends: arrayRemove(currentUser.uid) }),
      ]);
      setDeleteConfirmUser(null);
    } catch (err) {
      console.error("Error removing friend:", err);
      Alert.alert("Failed to remove friend", "Please try again.");
    }
  };

  const toggleSection = (section) => {
    setSectionsExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(searchText.toLowerCase()) &&
      !friends.includes(u.uid)
  );

  if (loading || !currentUser) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#020617",
          justifyContent: "center",
          alignItems: "center",
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
        }}
      >
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={{ marginTop: 10, color: "#e5e7eb" }}>
          Loading friends...
        </Text>
      </SafeAreaView>
    );
  }

  const cardStyle = {
    backgroundColor: "rgba(15,23,42,0.96)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.45)",
  };

  const titleStyle = {
    ...styles.cardHeaderText,
    color: "#e5e7eb",
  };

  const mutedText = { color: "#9ca3af", marginTop: 8, fontSize: 13 };

  // Row renderer
  const renderUserRow = (user, actionType = "add") => (
    <View
      key={user.uid}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomColor: "#1f2937",
        borderBottomWidth: 1,
      }}
    >
      {/* Tap avatar + name to open their profile */}
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("UserProfile", {
            userId: user.uid,
          })
        }
      >
        <Image
          source={user.avatar}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            marginRight: 10,
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.7)",
          }}
        />
        <Text
          style={{
            fontSize: 15,
            color: "#e5e7eb",
            fontWeight: "500",
          }}
        >
          {user.username}
        </Text>
      </TouchableOpacity>

      {/* Actions on the right */}
      {actionType === "add" && (
        outgoingRequests.includes(user.uid) ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="hourglass-outline" size={20} color="#9ca3af" />
            <Text style={{ fontSize: 12, color: "#9ca3af", marginLeft: 4 }}>
              Pending
            </Text>
          </View>
        ) : (
          <TouchableOpacity onPress={() => sendFriendRequest(user)}>
            <Ionicons name="person-add-outline" size={22} color="#38bdf8" />
          </TouchableOpacity>
        )
      )}

      {actionType === "pending" && (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="hourglass-outline" size={20} color="#9ca3af" />
          <TouchableOpacity
            onPress={() => cancelOutgoingRequest(user.uid)}
            style={{ marginLeft: 8 }}
          >
            <Text
              style={{
                fontSize: 12,
                color: "#f97316",
                fontWeight: "600",
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {actionType === "accept" && (
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity
            onPress={() => acceptRequest(user.uid)}
            style={{ marginRight: 10 }}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#22c55e"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => declineRequest(user.uid)}>
            <Ionicons name="close-circle-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}

      {actionType === "remove" && (
        <TouchableOpacity onPress={() => setDeleteConfirmUser(user)}>
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView
      edges={["top"]} // only safe area at the top
      style={{
        flex: 1,
        backgroundColor: "#020617", // 🔥 dark background
        paddingTop:
          Platform.OS === "android" ? StatusBar.currentHeight : 0,
      }}
    >

      <StatusBar barStyle="light-content" />

      {/* Subtle background blobs */}
      <View
        style={{
          position: "absolute",
          top: -60,
          left: -40,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: "#0f172a",
          opacity: 0.9,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 120,
          right: -60,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: "#1d4ed8",
          opacity: 0.3,
        }}
      />

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Small header */}
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#e5e7eb",
            marginBottom: 14,
          }}
        >
          Friends & Requests
        </Text>
        <Text style={{ color: "#9ca3af", marginBottom: 18, fontSize: 13 }}>
          Search for players, send requests, and manage your hoop squad.
        </Text>

        {/* Search bar */}
        <TextInput
          placeholder="Search users..."
          placeholderTextColor="#6b7280"
          value={searchText}
          onChangeText={setSearchText}
          style={{
            backgroundColor: "rgba(15,23,42,0.95)",
            color: "#e5e7eb",
            padding: 10,
            borderRadius: 12,
            marginBottom: 16,
            fontSize: 16,
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.6)",
          }}
        />

        {/* Search results */}
        {searchText.length > 0 && (
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={titleStyle}>Search Results</Text>
              {filteredUsers.length > 5 && (
                <Text style={{ fontSize: 12, color: "#60a5fa", fontWeight: "600" }}>
                  {filteredUsers.length} found
                </Text>
              )}
            </View>
            {filteredUsers.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 16 }}>
                <Ionicons name="search-outline" size={32} color="#6b7280" />
                <Text style={{ ...mutedText, textAlign: "center" }}>
                  No users found matching "{searchText}"
                </Text>
              </View>
            ) : (
              <>
                {(showAllSearchResults ? filteredUsers : filteredUsers.slice(0, 5)).map((u) =>
                  renderUserRow(u, "add")
                )}
                {filteredUsers.length > 5 && (
                  <TouchableOpacity
                    onPress={() => setShowAllSearchResults(!showAllSearchResults)}
                    style={{
                      paddingVertical: 12,
                      alignItems: "center",
                      borderTopWidth: 1,
                      borderTopColor: "#1f2937",
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ color: "#60a5fa", fontWeight: "600", fontSize: 13 }}>
                      {showAllSearchResults
                        ? "Show less"
                        : `Show ${filteredUsers.length - 5} more`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* Incoming requests */}
        {incomingRequests.length > 0 && (
          <View style={cardStyle}>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              onPress={() => toggleSection("incoming")}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={titleStyle}>Incoming Requests</Text>
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: "#ef4444",
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    minWidth: 20,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                    {incomingRequests.length}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={sectionsExpanded.incoming ? "chevron-up" : "chevron-down"}
                size={20}
                color="#9ca3af"
              />
            </TouchableOpacity>
            {sectionsExpanded.incoming && (
              <View style={{ marginTop: 8 }}>
                {allUsers
                  .filter((u) => incomingRequests.includes(u.uid))
                  .map((u) => renderUserRow(u, "accept"))}
              </View>
            )}
          </View>
        )}

        {/* Pending (outgoing) requests */}
        {outgoingRequests.length > 0 && (
          <View style={cardStyle}>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              onPress={() => toggleSection("pending")}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={titleStyle}>Pending Requests</Text>
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: "#6b7280",
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    minWidth: 20,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                    {outgoingRequests.length}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={sectionsExpanded.pending ? "chevron-up" : "chevron-down"}
                size={20}
                color="#9ca3af"
              />
            </TouchableOpacity>
            {sectionsExpanded.pending && (
              <View style={{ marginTop: 8 }}>
                {allUsers
                  .filter((u) => outgoingRequests.includes(u.uid))
                  .map((u) => renderUserRow(u, "pending"))}
              </View>
            )}
          </View>
        )}

        {/* Friends list */}
        <View style={cardStyle}>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            onPress={() => toggleSection("friends")}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={titleStyle}>Your Friends</Text>
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: "#2563eb",
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  minWidth: 20,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                  {friends.length}
                </Text>
              </View>
            </View>
            <Ionicons
              name={sectionsExpanded.friends ? "chevron-up" : "chevron-down"}
              size={20}
              color="#9ca3af"
            />
          </TouchableOpacity>
          {sectionsExpanded.friends && (
            <View style={{ marginTop: 8 }}>
              {friends.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 16 }}>
                  <Ionicons name="people-outline" size={32} color="#6b7280" />
                  <Text style={{ ...mutedText, textAlign: "center" }}>
                    No friends yet. Search and add some!
                  </Text>
                </View>
              ) : (
                allUsers
                  .filter((u) => friends.includes(u.uid))
                  .map((u) => renderUserRow(u, "remove"))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        visible={!!deleteConfirmUser}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmUser(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(2,6,23,0.85)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(15,23,42,0.98)",
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.5)",
              width: "100%",
              maxWidth: 340,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "rgba(239,68,68,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons name="person-remove" size={28} color="#ef4444" />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#e5f3ff",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                Remove Friend?
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Are you sure you want to remove{" "}
                <Text style={{ color: "#e5e7eb", fontWeight: "600" }}>
                  {deleteConfirmUser?.username}
                </Text>{" "}
                from your friends? You can always add them back later.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "rgba(148,163,184,0.15)",
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.3)",
                }}
                onPress={() => setDeleteConfirmUser(null)}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#e5e7eb", fontWeight: "600", fontSize: 15 }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#ef4444",
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                  shadowColor: "#ef4444",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
                onPress={() => removeFriend(deleteConfirmUser.uid)}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

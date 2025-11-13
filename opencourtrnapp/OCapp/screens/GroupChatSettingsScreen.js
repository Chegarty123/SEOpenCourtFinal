// screens/GroupChatSettingsScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export default function GroupChatSettingsScreen({ navigation, route }) {
  const { conversationId, groupName } = route.params;
  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(groupName || "");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    loadGroupData();
  }, [conversationId]);

  useEffect(() => {
    if (isAddingMember) {
      loadFriends();
    }
  }, [isAddingMember]);

  const loadGroupData = async () => {
    try {
      setLoading(true);
      const convRef = doc(db, "dmConversations", conversationId);
      const convSnap = await getDoc(convRef);

      if (convSnap.exists()) {
        const data = convSnap.data();
        const participants = data.participants || [];
        const participantInfo = data.participantInfo || {};

        const memberList = participants.map((uid) => ({
          userId: uid,
          username: participantInfo[uid]?.username || "Unknown",
          email: participantInfo[uid]?.email || "",
          profilePic: participantInfo[uid]?.profilePic || null,
        }));

        setMembers(memberList);
        setNewGroupName(data.groupName || "Group Chat");
      }
    } catch (error) {
      console.error("Error loading group data:", error);
      Alert.alert("Error", "Failed to load group data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroupName = async () => {
    if (!newGroupName.trim()) {
      Alert.alert("Error", "Group name cannot be empty");
      return;
    }

    try {
      const convRef = doc(db, "dmConversations", conversationId);
      await updateDoc(convRef, {
        groupName: newGroupName.trim(),
      });
      setIsEditingName(false);
      Alert.alert("Success", "Group name updated");
    } catch (error) {
      console.error("Error updating group name:", error);
      Alert.alert("Error", "Failed to update group name");
    }
  };

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const friendsList = userData.friends || [];

        // Load friend details
        const friendsData = [];
        for (const friendId of friendsList) {
          // Skip if already in group
          if (members.some((m) => m.userId === friendId)) continue;

          const friendRef = doc(db, "users", friendId);
          const friendSnap = await getDoc(friendRef);
          if (friendSnap.exists()) {
            const data = friendSnap.data();
            friendsData.push({
              userId: friendId,
              username: data.username || "Unknown",
              email: data.email || "",
              profilePic: data.profilePic || null,
            });
          }
        }
        setFriends(friendsData);
      }
    } catch (error) {
      console.error("Error loading friends:", error);
      Alert.alert("Error", "Failed to load friends");
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleAddMember = async (userId, username, email, profilePic) => {
    try {
      const convRef = doc(db, "dmConversations", conversationId);
      await updateDoc(convRef, {
        participants: arrayUnion(userId),
        [`participantInfo.${userId}`]: {
          username,
          email,
          profilePic: profilePic || null,
        },
      });

      Alert.alert("Success", `${username} has been added to the group`);
      loadGroupData();
      loadFriends(); // Refresh friends list to remove the added member
    } catch (error) {
      console.error("Error adding member:", error);
      Alert.alert("Error", "Failed to add member");
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      "Leave Group",
      "Are you sure you want to leave this group?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              const convRef = doc(db, "dmConversations", conversationId);
              await updateDoc(convRef, {
                participants: arrayRemove(currentUser.uid),
              });
              navigation.goBack();
            } catch (error) {
              console.error("Error leaving group:", error);
              Alert.alert("Error", "Failed to leave group");
            }
          },
        },
      ]
    );
  };

  const renderMember = ({ item }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberAvatar}>
        {item.profilePic ? (
          <Image
            source={{ uri: item.profilePic }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {item.username?.[0]?.toUpperCase() || "U"}
            </Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.memberUsername}>{item.username}</Text>
        {item.email && <Text style={styles.memberEmail}>{item.email}</Text>}
      </View>
      {item.userId === currentUser.uid && (
        <Text style={styles.youLabel}>You</Text>
      )}
    </View>
  );

  const renderFriend = ({ item }) => (
    <TouchableOpacity
      style={styles.friendItem}
      onPress={() =>
        handleAddMember(item.userId, item.username, item.email, item.profilePic)
      }
    >
      <View style={styles.memberAvatar}>
        {item.profilePic ? (
          <Image
            source={{ uri: item.profilePic }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {item.username?.[0]?.toUpperCase() || "U"}
            </Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.memberUsername}>{item.username}</Text>
        {item.email && <Text style={styles.memberEmail}>{item.email}</Text>}
      </View>
      <Ionicons name="add-circle" size={24} color="#38bdf8" />
    </TouchableOpacity>
  );

  // Filter friends based on search query
  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#e5f3ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Group Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Name</Text>
          {isEditingName ? (
            <View style={styles.editNameContainer}>
              <TextInput
                style={styles.nameInput}
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder="Enter group name"
                placeholderTextColor="#64748b"
              />
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setNewGroupName(groupName || "");
                    setIsEditingName(false);
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleUpdateGroupName}
                >
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.nameDisplay}
              onPress={() => setIsEditingName(true)}
            >
              <Text style={styles.nameText}>{newGroupName}</Text>
              <Ionicons name="pencil" size={20} color="#38bdf8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Members ({members.length})
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setIsAddingMember(!isAddingMember)}
            >
              <Ionicons
                name={isAddingMember ? "close" : "add"}
                size={24}
                color="#38bdf8"
              />
            </TouchableOpacity>
          </View>

          {isAddingMember && (
            <View style={styles.addMemberSection}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search your friends..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              {loadingFriends ? (
                <View style={styles.loadingFriends}>
                  <ActivityIndicator size="small" color="#38bdf8" />
                  <Text style={styles.loadingText}>Loading friends...</Text>
                </View>
              ) : filteredFriends.length > 0 ? (
                <View style={styles.friendsList}>
                  <ScrollView
                    style={{ maxHeight: 300 }}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {filteredFriends.map((item, index) => (
                      <View key={item.userId}>
                        {renderFriend({ item })}
                        {index < filteredFriends.length - 1 && (
                          <View style={styles.separator} />
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#64748b" />
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? "No friends match your search"
                      : friends.length === 0
                      ? "No friends to add"
                      : "All your friends are already in this group"}
                  </Text>
                </View>
              )}
            </View>
          )}

          <FlatList
            data={members}
            keyExtractor={(item) => item.userId}
            renderItem={renderMember}
            scrollEnabled={false}
          />
        </View>

        {/* Leave Group Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.leaveButton}
            onPress={handleLeaveGroup}
          >
            <Ionicons name="exit-outline" size={24} color="#ef4444" />
            <Text style={styles.leaveButtonText}>Leave Group</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.2)",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e5f3ff",
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.2)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "rgba(56,189,248,0.1)",
  },
  editNameContainer: {
    gap: 12,
  },
  nameInput: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#38bdf8",
    borderRadius: 8,
    padding: 12,
    color: "#e5f3ff",
    fontSize: 16,
  },
  editButtons: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#334155",
  },
  saveButton: {
    backgroundColor: "#38bdf8",
  },
  buttonText: {
    color: "#e5f3ff",
    fontSize: 14,
    fontWeight: "600",
  },
  nameDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 12,
  },
  nameText: {
    color: "#e5f3ff",
    fontSize: 16,
    fontWeight: "600",
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#e5f3ff",
    fontSize: 16,
    fontWeight: "700",
  },
  memberUsername: {
    color: "#e5f3ff",
    fontSize: 15,
    fontWeight: "600",
  },
  memberEmail: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 2,
  },
  youLabel: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "600",
  },
  addMemberSection: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 10,
    color: "#e5f3ff",
    fontSize: 14,
    marginBottom: 12,
  },
  loadingFriends: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  friendsList: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 8,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(148,163,184,0.2)",
    marginVertical: 4,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  leaveButtonText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
});

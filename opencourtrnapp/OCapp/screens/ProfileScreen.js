// screens/ProfileScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StatusBar,
  Platform,
  StyleSheet,
  TextInput,
  Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { auth, db, storage } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { NBA_TEAM_LOGOS } from "../utils/profileUtils";

export default function ProfileScreen({ navigation }) {
  const user = auth.currentUser;
  const scrollViewRef = useRef(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState(user?.email?.split("@")[0] || "");
  const [profilePic, setProfilePic] = useState(null);
  const [position, setPosition] = useState("Point Guard");
  const [memberSince, setMemberSince] = useState(
    user ? new Date(user.metadata.creationTime).toDateString() : ""
  );
  const [gradeLevel, setGradeLevel] = useState("Freshman");
  const [favoriteTeam, setFavoriteTeam] = useState("None");
  const [bio, setBio] = useState("");
  const [saveStatus, setSaveStatus] = useState("All changes saved");

  const BIO_MAX_LENGTH = 75; // max characters for bio
  const [bioCharsLeft, setBioCharsLeft] = useState(BIO_MAX_LENGTH);

  const [hasMediaPermission, setHasMediaPermission] = useState(null);

  const [badges, setBadges] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);


  const POSITION_OPTIONS = [
    "Point Guard",
    "Shooting Guard",
    "Small Forward",
    "Power Forward",
    "Center",
  ];

  const GRADE_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior", "Other"];

  const BADGE_IMAGES = {
  "Co-Founder": require("../assets/co-founder.png"),
  "Alpha": require("../assets/alpha.png"),
  "Rookie": require("../assets/rookie.png"),
};
const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const badgeDescriptions = {
  "Rookie": "Awarded for a user's first court check-in.",
  // "MVP": "Awarded for being voted MVP in a run.",
  // "Sniper": "Awarded for being voted the best shooter in a run.",
  "Co-Founder": "Verified Co-Founder of OpenCourt",
  "Alpha": "OG Alpha Tester for OpenCourt"}

  // Team logos now imported from centralized utility

  // Reset scroll position when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Media permission
  useEffect(() => {
    let isMounted = true;

    const preparePermissions = async () => {
      try {
        const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (!isMounted) return;

        if (existing.status === "granted") {
          setHasMediaPermission(true);
          return;
        }

        if (existing.canAskAgain) {
          const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!isMounted) return;
          setHasMediaPermission(req.status === "granted");
        } else {
          setHasMediaPermission(false);
        }
      } catch (err) {
        console.log("Error checking media permission:", err);
        if (isMounted) setHasMediaPermission(false);
      }
    };

    preparePermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load profile
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userDocRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          setFirstName(data.firstName || "");
          setLastName(data.lastName || "");
          setUsername(data.username || username);
          setProfilePic(data.profilePic || null);
          setPosition(data.position || "Point Guard");
          setGradeLevel(data.gradeLevel || "Freshman");
          setFavoriteTeam(data.favoriteTeam || "None");
          setMemberSince(data.memberSince || memberSince);
          setBio(data.bio || "");
          setBioCharsLeft(BIO_MAX_LENGTH - (data.bio?.length || 0));

          // Get friends count
          const friends = data.friends || [];
          setFriendsCount(friends.length);

          const earnedBadges = data.badges || [];
const joinDate = new Date(data.memberSince || memberSince);

if (joinDate <= new Date("2025-10-12") && !earnedBadges.includes("Co-Founder")) {
  earnedBadges.push("Co-Founder");
}
if (joinDate <= new Date("2025-11-13") && !earnedBadges.includes("Alpha")) {
  earnedBadges.push("Alpha");
}

setBadges(earnedBadges);
setSelectedBadge(data.selectedBadge || null);

// Save back if new badges added
await setDoc(userDocRef, { badges: earnedBadges }, { merge: true }); 
        } else {
          const payload = {
            username,
            profilePic: null,
            position: "Point Guard",
            gradeLevel: "Freshman",
            favoriteTeam: "None",
            memberSince,
            bio: "",
            firstName: "",
            lastName: "",
          };
          await setDoc(userDocRef, payload);
        }
        const earnedBadges = data.badges || [];
const joinDate = new Date(data.memberSince || memberSince);

// Co-Founder badge
if (joinDate <= new Date("2025-09-12") && !earnedBadges.includes("Co-Founder")) {
  earnedBadges.push("Co-Founder");
}

// Alpha badge
if (joinDate <= new Date("2025-11-12") && !earnedBadges.includes("Alpha")) {
  earnedBadges.push("Alpha");
}

setBadges(earnedBadges);
setSelectedBadge(data.selectedBadge || null);

// Save back to Firestore if new badges were added
await setDoc(userDocRef, { badges: earnedBadges }, { merge: true });
        setSaveStatus("All changes saved");
      } catch (err) {
        console.log("Error loading profile:", err);
        setSaveStatus("Could not load profile");
      }
    };

    loadProfile();
  }, []);

  // Auto-save
  useEffect(() => {
    if (!user) return;

    setSaveStatus("Saving…");

    const timeout = setTimeout(async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        // Update username from first and last name if both are present
        const updatedUsername = (firstName.trim() && lastName.trim())
          ? `${firstName.trim()} ${lastName.trim()}`
          : username;

        const payload = {
          firstName,
          lastName,
          username: updatedUsername,
          profilePic,
          position,
          gradeLevel,
          favoriteTeam,
          memberSince,
          bio,
          badges,
          selectedBadge
        };
        await setDoc(userDocRef, payload, { merge: true });
        setSaveStatus("All changes saved");
      } catch (err) {
        console.log("Error saving profile:", err);
        setSaveStatus("Could not save");
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [firstName, lastName, username, profilePic, position, gradeLevel, favoriteTeam, memberSince, bio, user]);

  // Pick image
  const pickImage = async () => {
    if (!user) return;

    if (hasMediaPermission === false) {
      Alert.alert(
        "Permission needed",
        "OpenCourt needs access to your photos to set a profile picture."
      );
      return;
    }

    if (hasMediaPermission === null) {
      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") {
          Alert.alert(
            "Permission needed",
            "OpenCourt needs access to your photos to set a profile picture."
          );
          setHasMediaPermission(false);
          return;
        }
        setHasMediaPermission(true);
      } catch (err) {
        console.log("Error requesting media permission:", err);
        Alert.alert(
          "Permission error",
          "Could not access your photos. Please try again."
        );
        return;
      }
    }

    try {
      setSaveStatus("Opening photos…");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled) {
        setSaveStatus("All changes saved");
        return;
      }

      const asset = result.assets && result.assets[0];
      if (!asset?.uri) {
        setSaveStatus("All changes saved");
        return;
      }

      setSaveStatus("Uploading photo…");

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const imageRef = ref(storage, `profilePictures/${user.uid}.jpg`);
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);

      setProfilePic(downloadURL);
      setSaveStatus("Saving…");
    } catch (err) {
      console.log("Error picking image:", err);
      Alert.alert("Upload failed", "Could not update your picture.");
      setSaveStatus("Could not save");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem("rememberMe");
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (err) {
      console.log("Error signing out:", err);
    }
  };

  // Display name - use firstName + lastName if available, otherwise fall back to username
  const displayName = (firstName.trim() && lastName.trim())
    ? `${firstName.trim()} ${lastName.trim()}`
    : username || "Add name";

  const taglinePieces = [];
  if (position) taglinePieces.push(position);
  if (gradeLevel) taglinePieces.push(gradeLevel);
  if (favoriteTeam && favoriteTeam !== "None") taglinePieces.push(favoriteTeam);
  const tagline = taglinePieces.join(" • ");

  const favoriteTeamLogo =
    favoriteTeam && favoriteTeam !== "None" && NBA_TEAM_LOGOS[favoriteTeam];

  return (
    <SafeAreaView
    edges={["top"]} // 👈 only respect safe area at the top
    style={[
      styles.safe,
      { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
    ]}
  >

      <StatusBar barStyle="light-content" />
      <View pointerEvents="none" style={styles.blobTop} />
      <View pointerEvents="none" style={styles.blobBottom} />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 }, // 👈 big buffer so it clears the tab bar
        ]}
      >

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Your profile</Text>
            <Text style={styles.headerSubtitle}>
              Set up your hooper card so friends know who's pulling up.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditMode(!isEditMode)}
          >
            <Text style={styles.editButtonText}>
              {isEditMode ? "Done" : "Edit Profile"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* PLAYER CARD - View Mode */}
        {!isEditMode && (
          <View style={{ alignItems: "center", marginTop: 20 }}>
            <TouchableOpacity activeOpacity={0.9}>
              <View style={styles.avatarWrapLarge}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={styles.profileImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={[styles.avatarInitial, { fontSize: 42 }]}>
                      {firstName?.[0]?.toUpperCase() || username?.[0]?.toUpperCase() || "U"}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16 }}>
              <Text style={styles.usernameTextLarge}>{displayName}</Text>
              {selectedBadge && (
                <TouchableOpacity onPress={() => setBadgeModalVisible(true)}>
                  <Image source={BADGE_IMAGES[selectedBadge]} style={{ width: 26, height: 26, marginLeft: 8}} />
                </TouchableOpacity>
              )}
            </View>

            {bio ? <Text style={styles.bioTextLarge}>{bio}</Text> : <Text style={styles.bioTextLarge}>No bio provided.</Text>}
            {memberSince ? <Text style={styles.memberSinceTextLarge}>Member since {memberSince}</Text> : null}

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{friendsCount}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
              <View style={[styles.statItem, { marginHorizontal: 40 }]}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Runs Logged</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Check-ins</Text>
              </View>
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeaderRow}>
                <Ionicons name="basketball-outline" size={18} color="#f97316" />
                <Text style={styles.infoHeaderText}>Hooper profile</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Position</Text>
                <Text style={styles.infoValue}>{position || "Not set"}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Grade</Text>
                <Text style={styles.infoValue}>{gradeLevel || "Not set"}</Text>
              </View>

              <View style={[styles.infoRow, { alignItems: "flex-start" }]}>
                <Text style={styles.infoLabel}>Favorite team</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {favoriteTeamLogo && (
                    <Image source={favoriteTeamLogo} style={styles.infoTeamLogo} />
                  )}
                  <Text style={styles.infoValue}>
                    {favoriteTeam && favoriteTeam !== "None" ? favoriteTeam : "Not set"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* PLAYER CARD - Edit Mode */}
        {isEditMode && (
        <View style={[styles.card, { marginTop: 8 }]}>
          <View style={styles.playerRow}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.9}>
              <View style={styles.avatarWrap}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={styles.profileImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {firstName?.[0]?.toUpperCase() || username?.[0]?.toUpperCase() || "U"}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.playerTextArea}>

<View style={{ flexDirection: "row", alignItems: "center" }}>
  <Text style={styles.usernameText}>{displayName}</Text>
  {selectedBadge && (
    <TouchableOpacity onPress={() => setBadgeModalVisible(true)}>
          <Image source={BADGE_IMAGES[selectedBadge]} style={{ width: 24, height: 24, marginLeft: 6}} />
        </TouchableOpacity>
  )}
</View>

              {bio ? <Text style={styles.bioPreview}>{bio}</Text> : null}
              <Text style={styles.taglineText}>{tagline || "Tap tags below to update your profile"}</Text>
              {memberSince ? <Text style={styles.memberSinceText}>Member since {memberSince}</Text> : null}
            </View>
          </View>

          <View style={styles.saveStatusRow}>
            <Text style={styles.saveStatusText}>{saveStatus}</Text>
          </View>
        </View>
        )}

        {/* NAME CARD */}
        {isEditMode && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Name</Text>
            <Text style={styles.cardSubtitle}>
              Your display name on OpenCourt.
            </Text>
          </View>

          <Text style={styles.fieldLabel}>First Name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Enter your first name"
            placeholderTextColor="#9ca3af"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoCorrect={false}
            editable={isEditMode}
          />

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Last Name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Enter your last name"
            placeholderTextColor="#9ca3af"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            autoCorrect={false}
            editable={isEditMode}
          />
        </View>
        )}

        {/* BIO CARD */}
        {isEditMode && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Bio</Text>
            <Text style={styles.cardSubtitle}>
              Write something about yourself so friends know you better.
            </Text>
          </View>

          <TextInput
            style={styles.bioInput}
            placeholder="Add a short bio..."
            placeholderTextColor="#9ca3af"
            value={bio}
            maxLength={BIO_MAX_LENGTH}
            blurOnSubmit={true}
            onSubmitEditing={() => {}}
            onChangeText={(text) => {
              const singleLineText = text.replace(/\n/g, ""); // remove newlines
              setBio(singleLineText);
              setBioCharsLeft(BIO_MAX_LENGTH - singleLineText.length);
            }}
            editable={isEditMode}
          />
          <Text style={styles.bioCharCount}>{bioCharsLeft} characters remaining</Text>
        </View>
        )}

        {/* HOOPER PROFILE CARD */}
        {isEditMode && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Hooper profile</Text>
            <Text style={styles.cardSubtitle}>
              Choose your natural spot and grade.
            </Text>
          </View>

          <Text style={styles.fieldLabel}>Natural position</Text>
          <View style={styles.tagRow}>
            {POSITION_OPTIONS.map((pos) => (
              <TouchableOpacity
                key={pos}
                style={[styles.tag, position === pos && styles.tagSelected]}
                onPress={() => setPosition(pos)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tagText, position === pos && styles.tagTextSelected]}>
                  {pos}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Grade level</Text>
          <View style={styles.tagRow}>
            {GRADE_OPTIONS.map((grade) => (
              <TouchableOpacity
                key={grade}
                style={[styles.tag, gradeLevel === grade && styles.tagSelected]}
                onPress={() => setGradeLevel(grade)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tagText, gradeLevel === grade && styles.tagTextSelected]}>
                  {grade}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        )}

        {/* FAVORITE TEAM CARD */}
        {isEditMode && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Favorite team</Text>
            <Text style={styles.cardSubtitle}>
              Rep your squad so people know your bias.
            </Text>
          </View>

          <View style={styles.teamGrid}>
            {Object.keys(NBA_TEAM_LOGOS).map((team) => (
              <TouchableOpacity
                key={team}
                style={[styles.teamTag, favoriteTeam === team && styles.teamTagSelected]}
                onPress={() => setFavoriteTeam(team)}
                activeOpacity={0.85}
              >
                <Image source={NBA_TEAM_LOGOS[team]} style={styles.teamLogo} />
                <Text style={[styles.teamTagText, favoriteTeam === team && styles.teamTagTextSelected]} numberOfLines={1}>
                  {team}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {favoriteTeamLogo && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.fieldLabel}>Selected</Text>
              <View style={styles.selectedTeamPill}>
                <Image source={favoriteTeamLogo} style={styles.selectedTeamLogo} />
                <Text style={styles.selectedTeamText}>{favoriteTeam}</Text>
              </View>
            </View>
          )}
        </View>
        )}

        {/* BADGES CARD */}
{isEditMode && (
<View style={styles.card}>
  <View style={styles.cardHeaderRow}>
    <Text style={styles.cardTitle}>Badges Earned</Text>
    <Text style={styles.cardSubtitle}>Select a badge to display on your profile.</Text>
  </View>
  {badges.length === 0 ? (
    <Text style={styles.emptyText}>No badges earned. Earn badges by hooping and unlocking achievements.</Text>
  ) : (
    <View style={styles.badgeGrid}>
      {badges.map(badge => (
        <TouchableOpacity
          key={badge}
          style={[styles.badgeItem, selectedBadge === badge && styles.badgeSelected]}
          onPress={async () => {
            setSelectedBadge(badge);
            await setDoc(doc(db, "users", user.uid), { selectedBadge: badge }, { merge: true });
          }}
        >
          <Image
  source={BADGE_IMAGES[badge]}
  style={styles.badgeImage}
/>

          <Text style={styles.badgeText}>{badge}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )}
</View>
)}

        {/* ACCOUNT CARD */}
        <View style={[styles.card, { marginBottom: 24 }]}>
          <Text style={styles.fieldLabel}>Account</Text>
          <Text style={styles.accountEmail}>{user?.email}</Text>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

<Modal visible={badgeModalVisible} transparent animationType="fade">
  <View style={styles.modalBackdrop}>
    <View style={[styles.modalContent, styles.badgeModalContent]}>
      <Text style={styles.modalTitle}>{selectedBadge}</Text>
      <Image
  source={BADGE_IMAGES[selectedBadge]}
  style={{ width: 48, height: 48, marginVertical: 12 }}
/>
      <Text style={styles.modalDescription}>
        {badgeDescriptions[selectedBadge] || "No description available."}
      </Text>
      <TouchableOpacity onPress={() => setBadgeModalVisible(false)}>
        <Text style={styles.modalCloseText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" },
  blobTop: { position: "absolute", top: -80, right: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(56,189,248,0.22)" },
  blobBottom: { position: "absolute", top: 180, left: -100, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(251,146,60,0.16)" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { marginTop: 24, marginBottom: 12, flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#e5f3ff", marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: "#9ca3af" },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#38bdf8",
    borderRadius: 20,
    marginLeft: 12,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  avatarWrapLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#38bdf8",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  usernameTextLarge: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f9fafb",
  },
  bioTextLarge: {
    marginTop: 12,
    fontSize: 14,
    color: "#cbd5e1",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  memberSinceTextLarge: {
    marginTop: 8,
    fontSize: 13,
    color: "#9ca3af",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e5f3ff",
  },
  statLabel: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  infoCard: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(15,23,42,0.98)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
    marginTop: 8,
  },
  infoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoHeaderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#e5f3ff",
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.2)",
  },
  infoLabel: {
    fontSize: 14,
    color: "#9ca3af",
  },
  infoValue: {
    fontSize: 14,
    color: "#e5f3ff",
    fontWeight: "600",
  },
  infoTeamLogo: {
    width: 20,
    height: 20,
    marginRight: 6,
  },
  card: { borderRadius: 24, paddingVertical: 18, paddingHorizontal: 16, backgroundColor: "rgba(15,23,42,0.98)", borderWidth: 1, borderColor: "rgba(148,163,184,0.7)", marginTop: 12 },
  playerRow: { flexDirection: "row", alignItems: "center" },
  avatarWrap: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: "#38bdf8", overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "#020617" },
  profileImage: { width: "100%", height: "100%" },
  avatarPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  avatarInitial: { fontSize: 32, fontWeight: "700", color: "#e5f3ff" },
  playerTextArea: { flex: 1, marginLeft: 14 },
  usernameText: { fontSize: 20, fontWeight: "700", color: "#f9fafb" },
  taglineText: { marginTop: 4, fontSize: 13, color: "#cbd5f5" },
  bioPreview: { marginTop: 4, fontSize: 13, color: "#a5b4fc", fontStyle: "italic" },
  memberSinceText: { marginTop: 4, fontSize: 12, color: "#9ca3af" },
  saveStatusRow: { marginTop: 10, alignItems: "flex-end" },
  saveStatusText: { fontSize: 11, color: "#9ca3af", fontStyle: "italic" },
  cardHeaderRow: { marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#e5f3ff", marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: "#9ca3af" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#cbd5f5", marginBottom: 6 },
  tagRow: { flexDirection: "row", flexWrap: "wrap" },
  tag: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "rgba(148,163,184,0.6)", marginRight: 8, marginBottom: 8, backgroundColor: "rgba(15,23,42,0.9)" },
  tagSelected: { borderColor: "#38bdf8", backgroundColor: "rgba(37,99,235,0.22)" },
  tagText: { fontSize: 13, color: "#e5e7eb" },
  tagTextSelected: { color: "#e0f2fe", fontWeight: "600" },
  teamGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  teamTag: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: "rgba(148,163,184,0.5)", backgroundColor: "rgba(15,23,42,0.95)", marginRight: 8, marginBottom: 8 },
  teamTagSelected: { borderColor: "#38bdf8", backgroundColor: "rgba(37,99,235,0.24)" },
  teamLogo: { width: 20, height: 20, borderRadius: 10, marginRight: 6 },
  teamTagText: { fontSize: 12, color: "#e5e7eb", maxWidth: 90 },
  teamTagTextSelected: { color: "#e0f2fe", fontWeight: "600" },
  selectedTeamPill: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginTop: 4, backgroundColor: "rgba(15,23,42,0.9)", borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(148,163,184,0.7)" },
  selectedTeamLogo: { width: 22, height: 22, borderRadius: 11, marginRight: 6 },
  selectedTeamText: { fontSize: 13, color: "#e5f3ff", fontWeight: "600" },
  accountEmail: { marginTop: 4, fontSize: 13, color: "#9ca3af", marginBottom: 14 },
  logoutBtn: { marginTop: 4, backgroundColor: "#ef4444", paddingVertical: 10, borderRadius: 999, alignItems: "center" },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  nameInput: { backgroundColor: "rgba(15,23,42,0.9)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(148,163,184,0.6)", padding: 12, color: "#e5f3ff", fontSize: 14 },
  bioInput: { backgroundColor: "rgba(15,23,42,0.9)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(148,163,184,0.6)", padding: 10, color: "#e5f3ff", fontSize: 13, textAlignVertical: "center" },
  bioCharCount: { fontSize: 11, color: "#9ca3af", marginTop: 4, textAlign: "right" },
  
badgeGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  marginTop: 8,
  justifyContent: "flex-start",
},
badgeItem: {
  width: "22%", // fits 4 per row
  alignItems: "center",
  marginBottom: 12,
},
badgeImage: {
  width: 40, // smaller size
  height: 40,
  marginBottom: 4,
},

badgeSelected: { borderColor: "#38bdf8", backgroundColor: "rgba(37,99,235,0.22)" },

badgeText: {
  fontSize: 12,
  color: "#e5e7eb",
  textAlign: "center",
},
emptyText: { fontSize: 13, color: "#9ca3af", marginTop: 4 },

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

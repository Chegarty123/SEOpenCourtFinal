// screens/ProfileOnboardingScreen.js
import React, { useState, useEffect } from "react";
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
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { auth, db, storage } from "../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { NBA_TEAM_LOGOS } from "../utils/profileUtils";

export default function ProfileOnboardingScreen({ navigation }) {
  const user = auth.currentUser;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [position, setPosition] = useState("Point Guard");
  const [favoriteTeam, setFavoriteTeam] = useState("None");
  const [bio, setBio] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const BIO_MAX_LENGTH = 75;
  const [bioCharsLeft, setBioCharsLeft] = useState(BIO_MAX_LENGTH);

  const [hasMediaPermission, setHasMediaPermission] = useState(null);

  const POSITION_OPTIONS = [
    "Point Guard",
    "Shooting Guard",
    "Small Forward",
    "Power Forward",
    "Center",
  ];

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
      setIsUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled) {
        setIsUploading(false);
        return;
      }

      const asset = result.assets && result.assets[0];
      if (!asset?.uri) {
        setIsUploading(false);
        return;
      }

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const imageRef = ref(storage, `profilePictures/${user.uid}.jpg`);
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);

      setProfilePic(downloadURL);
      setIsUploading(false);
    } catch (err) {
      console.log("Error picking image:", err);
      Alert.alert("Upload failed", "Could not update your picture.");
      setIsUploading(false);
    }
  };

  const handleComplete = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Required fields", "Please enter your first and last name.");
      return;
    }

    if (!user) return;

    setIsSaving(true);

    try {
      const userDocRef = doc(db, "users", user.uid);
      const memberSince = new Date(user.metadata.creationTime).toDateString();

      // Create username from first and last name
      const username = `${firstName.trim()} ${lastName.trim()}`;

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username, // Combined display name
        profilePic: profilePic || null,
        position,
        favoriteTeam,
        bio: bio.trim(),
        memberSince,
        profileComplete: true,
        gradeLevel: "Freshman", // Default value
        friends: [],
        incomingRequests: [],
        outgoingRequests: [],
        checkInCount: 0,
        courtsVisited: [],
        courtsVisitedCount: 0,
        weeklyCheckIns: 0,
        email: user.email,
      };

      await setDoc(userDocRef, payload);

      // Navigate to MainTabs
      navigation.replace("MainTabs");
    } catch (err) {
      console.log("Error saving profile:", err);
      Alert.alert("Save failed", "Could not save your profile. Please try again.");
      setIsSaving(false);
    }
  };

  const canComplete = firstName.trim() && lastName.trim();

  return (
    <SafeAreaView
      edges={["top"]}
      style={[
        styles.safe,
        { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
      ]}
    >
      <StatusBar barStyle="light-content" />
      <View pointerEvents="none" style={styles.blobTop} />
      <View pointerEvents="none" style={styles.blobBottom} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Welcome to OpenCourt</Text>
            <Text style={styles.headerSubtitle}>
              Set up your profile so the community knows who's pulling up.
            </Text>
          </View>

          {/* PROFILE PICTURE CARD */}
          <View style={[styles.card, { marginTop: 8 }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Profile Picture</Text>
              <Text style={styles.cardSubtitle}>
                Add a photo so friends can recognize you.
              </Text>
            </View>

            <View style={styles.centerContent}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.9} disabled={isUploading}>
                <View style={styles.avatarWrap}>
                  {profilePic ? (
                    <Image source={{ uri: profilePic }} style={styles.profileImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitial}>
                        {firstName?.[0]?.toUpperCase() || "?"}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.uploadHint}>
                {isUploading ? "Uploading..." : "Tap to add photo"}
              </Text>
            </View>
          </View>

          {/* NAME CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Your Name</Text>
              <Text style={styles.cardSubtitle}>
                This will be your display name on OpenCourt.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>First Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your first name"
              placeholderTextColor="#9ca3af"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Last Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your last name"
              placeholderTextColor="#9ca3af"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* POSITION CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Position</Text>
              <Text style={styles.cardSubtitle}>
                What's your natural spot on the court?
              </Text>
            </View>

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
          </View>

          {/* FAVORITE TEAM CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Favorite Team</Text>
              <Text style={styles.cardSubtitle}>
                Rep your squad (optional).
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
                  <Text
                    style={[styles.teamTagText, favoriteTeam === team && styles.teamTagTextSelected]}
                    numberOfLines={1}
                  >
                    {team}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* BIO CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Bio</Text>
              <Text style={styles.cardSubtitle}>
                Tell the community about yourself (optional).
              </Text>
            </View>

            <TextInput
              style={styles.bioInput}
              placeholder="Add a short bio..."
              placeholderTextColor="#9ca3af"
              value={bio}
              maxLength={BIO_MAX_LENGTH}
              blurOnSubmit={true}
              onChangeText={(text) => {
                const singleLineText = text.replace(/\n/g, "");
                setBio(singleLineText);
                setBioCharsLeft(BIO_MAX_LENGTH - singleLineText.length);
              }}
            />
            <Text style={styles.bioCharCount}>{bioCharsLeft} characters remaining</Text>
          </View>

          {/* COMPLETE BUTTON */}
          <TouchableOpacity
            style={[styles.completeBtn, !canComplete && styles.completeBtnDisabled]}
            onPress={handleComplete}
            disabled={!canComplete || isSaving}
            activeOpacity={0.8}
          >
            <Text style={styles.completeBtnText}>
              {isSaving ? "Saving..." : "Complete Setup"}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" },
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
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(251,146,60,0.16)",
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 24 },
  header: { marginBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#e5f3ff", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "#9ca3af", lineHeight: 20 },
  card: {
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: "rgba(15,23,42,0.98)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    marginTop: 12,
  },
  cardHeaderRow: { marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#e5f3ff", marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: "#9ca3af", lineHeight: 16 },
  centerContent: { alignItems: "center", paddingVertical: 8 },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#38bdf8",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  profileImage: { width: "100%", height: "100%" },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  avatarInitial: { fontSize: 48, fontWeight: "700", color: "#38bdf8" },
  uploadHint: { marginTop: 12, fontSize: 13, color: "#9ca3af", fontStyle: "italic" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#cbd5f5", marginBottom: 6 },
  input: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
    padding: 12,
    color: "#e5f3ff",
    fontSize: 14,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap" },
  tag: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  tagSelected: { borderColor: "#38bdf8", backgroundColor: "rgba(37,99,235,0.22)" },
  tagText: { fontSize: 13, color: "#e5e7eb" },
  tagTextSelected: { color: "#e0f2fe", fontWeight: "600" },
  teamGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  teamTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
    backgroundColor: "rgba(15,23,42,0.95)",
    marginRight: 8,
    marginBottom: 8,
  },
  teamTagSelected: { borderColor: "#38bdf8", backgroundColor: "rgba(37,99,235,0.24)" },
  teamLogo: { width: 20, height: 20, borderRadius: 10, marginRight: 6 },
  teamTagText: { fontSize: 12, color: "#e5e7eb", maxWidth: 90 },
  teamTagTextSelected: { color: "#e0f2fe", fontWeight: "600" },
  bioInput: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
    padding: 12,
    color: "#e5f3ff",
    fontSize: 13,
    textAlignVertical: "center",
    minHeight: 60,
  },
  bioCharCount: { fontSize: 11, color: "#9ca3af", marginTop: 4, textAlign: "right" },
  completeBtn: {
    marginTop: 20,
    backgroundColor: "#38bdf8",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  completeBtnDisabled: { backgroundColor: "#334155", opacity: 0.6 },
  completeBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

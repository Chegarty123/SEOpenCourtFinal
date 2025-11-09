// screens/ProfileScreen.js
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { auth, db, storage } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ProfileScreen({ navigation }) {
  const user = auth.currentUser;

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

  const POSITION_OPTIONS = [
    "Point Guard",
    "Shooting Guard",
    "Small Forward",
    "Power Forward",
    "Center",
  ];

  const GRADE_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior", "Other"];

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
          setUsername(data.username || username);
          setProfilePic(data.profilePic || null);
          setPosition(data.position || "Point Guard");
          setGradeLevel(data.gradeLevel || "Freshman");
          setFavoriteTeam(data.favoriteTeam || "None");
          setMemberSince(data.memberSince || memberSince);
          setBio(data.bio || "");
          setBioCharsLeft(BIO_MAX_LENGTH - (data.bio?.length || 0));
        } else {
          const payload = {
            username,
            profilePic: null,
            position: "Point Guard",
            gradeLevel: "Freshman",
            favoriteTeam: "None",
            memberSince,
            bio: "",
          };
          await setDoc(userDocRef, payload);
        }
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
        const payload = {
          username,
          profilePic,
          position,
          gradeLevel,
          favoriteTeam,
          memberSince,
          bio,
        };
        await setDoc(userDocRef, payload, { merge: true });
        setSaveStatus("All changes saved");
      } catch (err) {
        console.log("Error saving profile:", err);
        setSaveStatus("Could not save");
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [username, profilePic, position, gradeLevel, favoriteTeam, memberSince, bio, user]);

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

  const taglinePieces = [];
  if (position) taglinePieces.push(position);
  if (gradeLevel) taglinePieces.push(gradeLevel);
  if (favoriteTeam && favoriteTeam !== "None") taglinePieces.push(favoriteTeam);
  const tagline = taglinePieces.join(" • ");

  const favoriteTeamLogo =
    favoriteTeam && favoriteTeam !== "None" && teamLogos[favoriteTeam];

  return (
    <SafeAreaView
      style={[styles.safe, { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }]}
    >
      <StatusBar barStyle="light-content" />
      <View pointerEvents="none" style={styles.blobTop} />
      <View pointerEvents="none" style={styles.blobBottom} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your profile</Text>
          <Text style={styles.headerSubtitle}>
            Set up your hooper card so friends know who's pulling up.
          </Text>
        </View>

        {/* PLAYER CARD */}
        <View style={[styles.card, { marginTop: 8 }]}>
          <View style={styles.playerRow}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.9}>
              <View style={styles.avatarWrap}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={styles.profileImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{username?.[0]?.toUpperCase() || "U"}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.playerTextArea}>
              <Text style={styles.usernameText}>{username || "Add username"}</Text>
              {bio ? <Text style={styles.bioPreview}>{bio}</Text> : null}
              <Text style={styles.taglineText}>{tagline || "Tap tags below to update your profile"}</Text>
              {memberSince ? <Text style={styles.memberSinceText}>Member since {memberSince}</Text> : null}
            </View>
          </View>

          <View style={styles.saveStatusRow}>
            <Text style={styles.saveStatusText}>{saveStatus}</Text>
          </View>
        </View>

        {/* BIO CARD */}
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
          />
          <Text style={styles.bioCharCount}>{bioCharsLeft} characters remaining</Text>
        </View>

        {/* HOOPER PROFILE CARD */}
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

        {/* FAVORITE TEAM CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Favorite team</Text>
            <Text style={styles.cardSubtitle}>
              Rep your squad so people know your bias.
            </Text>
          </View>

          <View style={styles.teamGrid}>
            {Object.keys(teamLogos).map((team) => (
              <TouchableOpacity
                key={team}
                style={[styles.teamTag, favoriteTeam === team && styles.teamTagSelected]}
                onPress={() => setFavoriteTeam(team)}
                activeOpacity={0.85}
              >
                <Image source={teamLogos[team]} style={styles.teamLogo} />
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

        {/* ACCOUNT CARD */}
        <View style={[styles.card, { marginBottom: 24 }]}>
          <Text style={styles.fieldLabel}>Account</Text>
          <Text style={styles.accountEmail}>{user?.email}</Text>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" },
  blobTop: { position: "absolute", top: -80, right: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(56,189,248,0.22)" },
  blobBottom: { position: "absolute", top: 180, left: -100, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(251,146,60,0.16)" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { marginTop: 24, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#e5f3ff", marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: "#9ca3af" },
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
  bioInput: { backgroundColor: "rgba(15,23,42,0.9)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(148,163,184,0.6)", padding: 10, color: "#e5f3ff", fontSize: 13, textAlignVertical: "center" },
  bioCharCount: { fontSize: 11, color: "#9ca3af", marginTop: 4, textAlign: "right" },
});

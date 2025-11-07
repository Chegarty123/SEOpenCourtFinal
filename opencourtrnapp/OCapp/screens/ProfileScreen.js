// screens/ProfileScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

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

  // Load saved profile
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
        } else {
          const payload = {
            username,
            profilePic: null,
            position: "Point Guard",
            gradeLevel: "Freshman",
            favoriteTeam: "None",
            memberSince,
          };
          await setDoc(userDocRef, payload);
        }
      } catch (err) {
        console.log("Error loading profile:", err);
      }
    };

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save when things change
  useEffect(() => {
    if (!user) return;

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
        };
        await setDoc(userDocRef, payload, { merge: true });
      } catch (err) {
        console.log("Error saving profile:", err);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [username, profilePic, position, gradeLevel, favoriteTeam, memberSince, user]);

  const pickImage = async () => {
    if (!user) return;

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(
          "Permission needed",
          "OpenCourt needs access to your photos to set a profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets && result.assets[0];
      if (!asset || !asset.base64) return;

      const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
      setProfilePic(dataUrl);
    } catch (err) {
      console.log("Error picking image:", err);
      Alert.alert("Upload failed", "Could not update your picture.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Logout Failed", error.message);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
      ]}
    >
      <StatusBar barStyle="light-content" />

      {/* subtle background blobs like home/map */}
      <View
        pointerEvents="none"
        style={styles.blobTop}
      />
      <View
        pointerEvents="none"
        style={styles.blobBottom}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header text – your existing top bar/time sits above this */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your profile</Text>
          <Text style={styles.headerSubtitle}>
            Update your hoop details so friends know who&apos;s pulling up.
          </Text>
        </View>

        {/* MAIN CARD (this used to be that big white sheet) */}
        <View style={styles.card}>
          {/* Avatar + name */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.9}>
              <Image
                source={
                  profilePic
                    ? { uri: profilePic }
                    : require("../images/defaultProfile.png")
                }
                style={styles.profileImage}
              />
            </TouchableOpacity>

            <Text style={styles.username}>{username}</Text>
            <Text style={styles.memberSince}>Member since {memberSince}</Text>
          </View>

          {/* Natural position */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Natural Position</Text>
            <Text style={styles.sectionValue}>{position}</Text>

            <View style={styles.tagContainer}>
              {[
                "Point Guard",
                "Shooting Guard",
                "Small Forward",
                "Power Forward",
                "Center",
              ].map((pos) => (
                <TouchableOpacity
                  key={pos}
                  style={[
                    styles.tag,
                    position === pos && styles.tagSelected,
                  ]}
                  onPress={() => setPosition(pos)}
                >
                  <Text
                    style={[
                      styles.tagText,
                      position === pos && styles.tagTextSelected,
                    ]}
                  >
                    {pos}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Grade level */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Grade Level</Text>
            <Text style={styles.sectionValue}>{gradeLevel}</Text>

            <View style={styles.tagContainer}>
              {["Freshman", "Sophomore", "Junior", "Senior"].map((grade) => (
                <TouchableOpacity
                  key={grade}
                  style={[
                    styles.tag,
                    gradeLevel === grade && styles.tagSelected,
                  ]}
                  onPress={() => setGradeLevel(grade)}
                >
                  <Text
                    style={[
                      styles.tagText,
                      gradeLevel === grade && styles.tagTextSelected,
                    ]}
                  >
                    {grade}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Favorite NBA Team */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Favorite NBA Team</Text>
            <Text style={styles.sectionValue}>{favoriteTeam}</Text>

            <View style={styles.tagContainer}>
              {Object.keys(teamLogos).map((team) => (
                <TouchableOpacity
                  key={team}
                  style={[
                    styles.tag,
                    styles.teamTag,
                    favoriteTeam === team && styles.tagSelected,
                  ]}
                  onPress={() => setFavoriteTeam(team)}
                >
                  <Image source={teamLogos[team]} style={styles.teamLogo} />
                  <Text
                    style={[
                      styles.tagText,
                      favoriteTeam === team && styles.tagTextSelected,
                    ]}
                  >
                    {team}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Logout button */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.9}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#020617",
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
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(251,146,60,0.16)",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    marginTop: 24,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#e5f3ff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#9ca3af",
  },
  card: {
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: "rgba(15,23,42,0.98)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
    marginTop: 12,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: "#38bdf8",
  },
  username: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "700",
    color: "#f9fafb",
  },
  memberSince: {
    marginTop: 2,
    fontSize: 13,
    color: "#9ca3af",
  },
  section: {
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#cbd5f5",
    marginBottom: 2,
  },
  sectionValue: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    marginBottom: 8,
  },
  teamTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  teamLogo: {
    width: 18,
    height: 18,
  },
  tagSelected: {
    backgroundColor: "#38bdf8",
    borderColor: "#38bdf8",
  },
  tagText: {
    fontSize: 13,
    color: "#e5e7eb",
    fontWeight: "500",
  },
  tagTextSelected: {
    color: "#020617",
    fontWeight: "700",
  },
  logoutButton: {
    marginTop: 20,
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#ef4444",
    alignItems: "center",
  },
  logoutText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});

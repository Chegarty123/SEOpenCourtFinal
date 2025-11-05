// screens/ProfileScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { styles } from "../styles/globalStyles.js";

export default function ProfileScreen() {
  // Track Firebase user in state instead of reading once
  const [user, setUser] = useState(auth.currentUser || null);

  const [username, setUsername] = useState(
    auth.currentUser?.email?.split("@")[0] || ""
  );
  const [profilePic, setProfilePic] = useState(null);
  const [position, setPosition] = useState("Point Guard");
  const [memberSince, setMemberSince] = useState("");
  const [gradeLevel, setGradeLevel] = useState("Freshman");
  const [favoriteTeam, setFavoriteTeam] = useState("None");
  const [loadingProfile, setLoadingProfile] = useState(true);

  // team logos (local require)
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

  // Keep user in sync with Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
    });
    return unsub;
  }, []);

  // Load profile from Firestore whenever we have a user
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);

      try {
        const userDocRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userDocRef);

        const defaultMemberSince = new Date(
          user.metadata.creationTime
        ).toDateString();

        if (snapshot.exists()) {
          const data = snapshot.data();

          setProfilePic(data.profilePic || null);
          setPosition(data.position || "Point Guard");
          setGradeLevel(data.gradeLevel || "Freshman");
          setFavoriteTeam(data.favoriteTeam || "None");
          setUsername(data.username || user.email.split("@")[0]);
          setMemberSince(data.memberSince || defaultMemberSince);
        } else {
          // First time: create a doc with defaults
          const payload = {
            username: user.email.split("@")[0],
            profilePic: null,
            position: "Point Guard",
            gradeLevel: "Freshman",
            favoriteTeam: "None",
            memberSince: defaultMemberSince,
          };

          await setDoc(userDocRef, payload);

          setUsername(payload.username);
          setProfilePic(payload.profilePic);
          setPosition(payload.position);
          setGradeLevel(payload.gradeLevel);
          setFavoriteTeam(payload.favoriteTeam);
          setMemberSince(payload.memberSince);
        }
      } catch (err) {
        console.log("Error loading profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user]);

  // Auto-save profile when fields change (after loading is done)
  useEffect(() => {
    if (!user) return;
    if (loadingProfile) return; // don't overwrite while loading

    const timeout = setTimeout(async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const payload = {
          username,
          profilePic,
          position,
          gradeLevel,
          favoriteTeam,
          memberSince:
            memberSince ||
            new Date(user.metadata.creationTime).toDateString(),
        };

        await setDoc(userDocRef, payload, { merge: true });
      } catch (err) {
        console.log("Error saving profile:", err);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    user,
    username,
    profilePic,
    position,
    gradeLevel,
    favoriteTeam,
    memberSince,
    loadingProfile,
  ]);

  // Pick image and store as base64 data URL in Firestore (no Storage / no FileSystem)
  const pickImage = async () => {
    if (!user) {
      Alert.alert("Not signed in", "Please sign in first.");
      return;
    }

    try {
      // ask for permission explicitly (helps avoid weird iOS errors)
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
        quality: 0.5, // keep Firestore doc smaller
        base64: true, // 👈 get base64 directly
      });

      if (result.canceled) return;

      const asset = result.assets && result.assets[0];
      if (!asset || !asset.base64) {
        console.log("No base64 returned from picker", result);
        Alert.alert(
          "Upload failed",
          "Sorry, we couldn't read that picture."
        );
        return;
      }

      const dataUrl = `data:image/jpeg;base64,${asset.base64}`;

      // Store data URL in state; auto-save effect will push it to Firestore
      setProfilePic(dataUrl);
    } catch (err) {
      console.log("Error picking image:", err);
      Alert.alert(
        "Upload failed",
        "Sorry, we couldn't update your picture."
      );
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Text style={styles.username}>Please sign in to view profile.</Text>
      </View>
    );
  }

  if (loadingProfile) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator />
        <Text style={styles.memberSince}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Profile Picture */}
        <TouchableOpacity onPress={pickImage}>
          <Image
            source={
              profilePic
                ? { uri: profilePic }
                : require("../images/defaultProfile.png")
            }
            style={styles.profileImage}
          />
        </TouchableOpacity>

        {/* Username + member info */}
        <Text style={styles.username}>{username}</Text>
        <Text style={styles.memberSince}>Member since {memberSince}</Text>

        {/* Position / Grade / Favorite team container */}
        <View style={styles.positionContainer}>
          <Text style={styles.label}>Natural Position:</Text>
          <Text style={styles.positionDisplay}>{position}</Text>

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

          <View style={styles.gradeContainer}>
            <Text style={styles.label}>Grade Level:</Text>
            <Text style={styles.gradeDisplay}>{gradeLevel}</Text>

            <View style={styles.tagContainer}>
              {["Freshman", "Sophomore", "Junior", "Senior"].map(
                (grade) => (
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
                        gradeLevel === grade &&
                          styles.tagTextSelected,
                      ]}
                    >
                      {grade}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <View style={styles.teamContainer}>
              <Text style={styles.label}>Favorite NBA Team:</Text>
              <Text style={styles.teamDisplay}>{favoriteTeam}</Text>

              <View style={styles.tagContainer}>
                {[
                  "Lakers",
                  "Warriors",
                  "Celtics",
                  "Bulls",
                  "Heat",
                  "Nets",
                  "Knicks",
                  "Sixers",
                  "Suns",
                  "Mavericks",
                  "Clippers",
                  "Nuggets",
                  "Timberwolves",
                  "Trailblazers",
                  "Jazz",
                  "Thunder",
                  "Spurs",
                  "Rockets",
                  "Grizzlies",
                  "Pelicans",
                  "Kings",
                  "Magic",
                  "Pacers",
                  "Pistons",
                  "Cavaliers",
                  "Hawks",
                  "Hornets",
                  "Wizards",
                  "Raptors",
                  "Bucks",
                ].map((team) => (
                  <TouchableOpacity
                    key={team}
                    style={[
                      styles.tag,
                      favoriteTeam === team && styles.tagSelected,
                      { alignItems: "center" },
                    ]}
                    onPress={() => setFavoriteTeam(team)}
                  >
                    <Image
                      source={teamLogos[team]}
                      style={{
                        width: 18,
                        height: 18,
                        marginBottom: 4,
                      }}
                    />
                    <Text
                      style={[
                        styles.tagText,
                        favoriteTeam === team &&
                          styles.tagTextSelected,
                      ]}
                    >
                      {team}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

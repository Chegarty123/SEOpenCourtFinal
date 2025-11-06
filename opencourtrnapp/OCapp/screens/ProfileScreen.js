// screens/ProfileScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { styles } from "../styles/globalStyles.js";

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

  // Load profile from Firestore on mount
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
          // Create new doc with defaults
          const payload = {
            username: username,
            profilePic: null,
            position: "Point Guard",
            gradeLevel: "Freshman",
            favoriteTeam: "None",
            memberSince: memberSince,
          };
          await setDoc(userDocRef, payload);
        }
      } catch (err) {
        console.log("Error loading profile:", err);
      }
    };

    loadProfile();
  }, []);

  // Auto-save profile when changes settle
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
  }, [username, profilePic, position, gradeLevel, favoriteTeam]);

  // Pick image from gallery
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

  // Logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login"); // Matches your stack screen name
    } catch (error) {
      Alert.alert("Logout Failed", error.message);
    }
  };

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

        {/* Username & Member Since */}
        <Text style={styles.username}>{username}</Text>
        <Text style={styles.memberSince}>Member since {memberSince}</Text>

        {/* Position Selection */}
        <View style={styles.positionContainer}>
          <Text style={styles.label}>Natural Position:</Text>
          <Text style={styles.positionDisplay}>{position}</Text>
          <View style={styles.tagContainer}>
            {["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"].map(
              (pos) => (
                <TouchableOpacity
                  key={pos}
                  style={[styles.tag, position === pos && styles.tagSelected]}
                  onPress={() => setPosition(pos)}
                >
                  <Text style={[styles.tagText, position === pos && styles.tagTextSelected]}>
                    {pos}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Grade Selection */}
          <Text style={styles.label}>Grade Level:</Text>
          <Text style={styles.gradeDisplay}>{gradeLevel}</Text>
          <View style={styles.tagContainer}>
            {["Freshman", "Sophomore", "Junior", "Senior"].map((grade) => (
              <TouchableOpacity
                key={grade}
                style={[styles.tag, gradeLevel === grade && styles.tagSelected]}
                onPress={() => setGradeLevel(grade)}
              >
                <Text style={[styles.tagText, gradeLevel === grade && styles.tagTextSelected]}>
                  {grade}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Favorite Team */}
          <Text style={styles.label}>Favorite NBA Team:</Text>
          <Text style={styles.teamDisplay}>{favoriteTeam}</Text>
          <View style={styles.tagContainer}>
            {Object.keys(teamLogos).map((team) => (
              <TouchableOpacity
                key={team}
                style={[styles.tag, favoriteTeam === team && styles.tagSelected, { alignItems: "center" }]}
                onPress={() => setFavoriteTeam(team)}
              >
                <Image source={teamLogos[team]} style={{ width: 18, height: 18, marginBottom: 4 }} />
                <Text style={[styles.tagText, favoriteTeam === team && styles.tagTextSelected]}>
                  {team}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            backgroundColor: "#e74c3c",
            paddingVertical: 12,
            paddingHorizontal: 25,
            borderRadius: 25,
            marginTop: 25,
            alignSelf: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" }}>
            Log Out
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}


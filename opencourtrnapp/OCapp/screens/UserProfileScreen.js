import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { styles } from "../styles/globalStyles.js";

export default function UserProfileScreen({ route }) {
  const { userId } = route.params || {};
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // team logos (same mapping as ProfileScreen)
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

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "users", userId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            username: data.username || "Player",
            profilePic: data.profilePic || null,
            position: data.position || "Point Guard",
            gradeLevel: data.gradeLevel || "Freshman",
            favoriteTeam: data.favoriteTeam || "None",
            memberSince: data.memberSince || "",
          });
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.log("Error loading user profile:", err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator />
        <Text style={styles.memberSince}>Loading player…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Text style={styles.username}>Profile not found.</Text>
      </View>
    );
  }

  const {
    username,
    profilePic,
    position,
    gradeLevel,
    favoriteTeam,
    memberSince,
  } = profile;

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Profile picture (read-only) */}
        <Image
          source={
            profilePic
              ? { uri: profilePic }
              : require("../images/defaultProfile.png")
          }
          style={styles.profileImage}
        />

        {/* Username + member info */}
        <Text style={styles.username}>{username}</Text>
        {!!memberSince && (
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        )}

        <View style={styles.positionContainer}>
          {/* Position */}
          <Text style={styles.label}>Natural Position</Text>
          <Text style={styles.positionDisplay}>{position}</Text>

          {/* Grade */}
          <View style={styles.gradeContainer}>
            <Text style={styles.label}>Grade Level</Text>
            <Text style={styles.gradeDisplay}>{gradeLevel}</Text>
          </View>

          {/* Favorite team */}
          <View style={styles.teamContainer}>
            <Text style={styles.label}>Favorite NBA Team</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {favoriteTeam !== "None" && teamLogos[favoriteTeam] && (
                <Image
                  source={teamLogos[favoriteTeam]}
                  style={{ width: 22, height: 22, marginRight: 8 }}
                />
              )}
              <Text style={styles.teamDisplay}>{favoriteTeam}</Text>
            </View>
          </View>

          {/* Little note that this is read-only */}
          <Text
            style={{
              marginTop: 24,
              fontSize: 12,
              color: "#64748b",
              textAlign: "center",
            }}
          >
            This is a public player profile from their OpenCourt account.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

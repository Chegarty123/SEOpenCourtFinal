// screens/UserProfileScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { styles } from "../styles/globalStyles";

export default function UserProfileScreen({ route }) {
  const { userId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const refDoc = doc(db, "users", userId);
        const snap = await getDoc(refDoc);

        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            username:
              data.username || "Player",
            profilePic: data.profilePic || null,
            position: data.position || "Unknown position",
            gradeLevel: data.gradeLevel || "Unknown grade",
            favoriteTeam: data.favoriteTeam || "None",
            memberSince:
              data.memberSince || "Unknown",
          });
        } else {
          setProfile({
            username: "Player",
            profilePic: null,
            position: "Unknown position",
            gradeLevel: "Unknown grade",
            favoriteTeam: "None",
            memberSince: "Unknown",
          });
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
        <Text style={styles.memberSince}>Loading player...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Text style={styles.username}>Player not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Image
          source={
            profile.profilePic
              ? { uri: profile.profilePic }
              : require("../images/defaultProfile.png")
          }
          style={styles.profileImage}
        />

        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.memberSince}>
          Member since {profile.memberSince}
        </Text>

        <View style={styles.positionContainer}>
          <Text style={styles.label}>Natural Position</Text>
          <Text style={styles.positionDisplay}>{profile.position}</Text>

          <View style={styles.gradeContainer}>
            <Text style={styles.label}>Grade Level</Text>
            <Text style={styles.gradeDisplay}>{profile.gradeLevel}</Text>
          </View>

          <View style={styles.teamContainer}>
            <Text style={styles.label}>Favorite NBA Team</Text>
            <Text style={styles.teamDisplay}>{profile.favoriteTeam}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

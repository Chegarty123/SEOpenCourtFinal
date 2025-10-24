import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { styles } from "../styles/globalStyles.js";

export default function ProfileScreen() {
  const user = auth.currentUser;
  const [username, setUsername] = useState(user?.email?.split("@")[0] || "");
  const [profilePic, setProfilePic] = useState(null);
  const [position, setPosition] = useState("Point Guard");
  const [memberSince, setMemberSince] = useState("");
  const [gradeLevel, setGradeLevel] = useState("Freshman");
  const [favoriteTeam, setFavoriteTeam] = useState("None");

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

  // load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const userDoc = doc(db, "users", user.uid);
      const snapshot = await getDoc(userDoc);

      if (snapshot.exists()) {
        const data = snapshot.data();
        setProfilePic(data.profilePic || null);
        setPosition(data.position || "Point Guard");
        setGradeLevel(data.gradeLevel || "Freshman");
        setFavoriteTeam(data.favoriteTeam || "None");
        setUsername(data.username || user.email.split("@")[0]);
        setMemberSince(
          data.memberSince ||
            new Date(user.metadata.creationTime).toDateString()
        );
      } else {
        await setDoc(userDoc, {
          username,
          profilePic,
          position,
          gradeLevel,
          favoriteTeam,
          memberSince: new Date(
            user.metadata.creationTime
          ).toDateString(),
        });
      }
    };
    loadProfile();
  }, [user]);

  // auto-save profile when changes settle
  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(async () => {
      const userDoc = doc(db, "users", user.uid);
      await setDoc(userDoc, {
        username,
        profilePic,
        position,
        gradeLevel,
        favoriteTeam,
        memberSince:
          memberSince ||
          new Date(user.metadata.creationTime).toDateString(),
      });
    }, 800);
    return () => clearTimeout(timeout);
  }, [username, profilePic, position, gradeLevel, favoriteTeam]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
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

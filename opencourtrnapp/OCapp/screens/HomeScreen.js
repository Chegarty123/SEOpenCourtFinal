import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../firebaseConfig";
import markers from "../assets/markers";
import { styles } from "../styles/globalStyles";

export default function HomeScreen({ navigation }) {
  const user = auth.currentUser;
  const firstName = user?.email?.split("@")[0] || "Player";

  // placeholders
  const courtsNearby = Array.isArray(markers) ? markers.length : 0;
  const playersAround = 16;
  const upcomingGames = 3;

  return (
    <View style={styles.homeWrap}>
      {/* Header / greeting */}
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.homeTitle}>Welcome back,</Text>
          <Text style={styles.homeName}>{firstName}</Text>
        </View>
        <Image
          source={require("../images/OCLogo.png")}
          style={styles.homeLogo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.homeLead}>
        Here’s what’s happening on your campus courts.
      </Text>

      {/* Grid cards */}
      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.tile, styles.tileBlue]}
          onPress={() => navigation.navigate("Map")}
        >
          <Ionicons name="location-outline" size={28} color="#fff" />
          <Text style={styles.tileBig}>{courtsNearby} Courts</Text>
          <Text style={styles.tileSmall}>Nearby</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tile, styles.tileOrange]}
          onPress={() => alert("Players Around (placeholder)")}
        >
          <Ionicons name="people-outline" size={28} color="#fff" />
          <Text style={styles.tileBig}>{playersAround} Players</Text>
          <Text style={styles.tileSmall}>Around</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tile, styles.tileGreen]}
          onPress={() => alert("Upcoming Games (placeholder)")}
        >
          <Ionicons name="calendar-outline" size={28} color="#fff" />
          <Text style={styles.tileBig}>{upcomingGames} Games</Text>
          <Text style={styles.tileSmall}>This Week</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tile, styles.tileYellow]}
          onPress={() => navigation.navigate("Profile")}
        >
          <Ionicons name="basketball-outline" size={28} color="#fff" />
          <Text style={styles.tileBig}>Practice</Text>
          <Text style={styles.tileSmall}>Drills</Text>
        </TouchableOpacity>
      </View>

      {/* Banner */}
      <TouchableOpacity
        style={styles.banner}
        onPress={() => navigation.navigate("Map")}
        activeOpacity={0.9}
      >
        <View style={styles.bannerIcon}>
          <Ionicons name="trophy-outline" size={22} color="#0b2239" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Find the best courts in town</Text>
          <Text style={styles.bannerSub}>
            Explore player reviews and ratings (placeholder)
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#0b2239" />
      </TouchableOpacity>
    </View>
  );
}

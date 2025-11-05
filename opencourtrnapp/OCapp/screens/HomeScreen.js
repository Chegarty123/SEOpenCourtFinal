import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../firebaseConfig";
import markers from "../assets/markers";
import { styles } from "../styles/globalStyles";

export default function HomeScreen({ navigation }) {
  const user = auth.currentUser;
  const firstName = user?.email?.split("@")[0] || "Player";

  // placeholders for now – can be wired to Firestore later
  const courtsNearby = Array.isArray(markers) ? markers.length : 0;
  const playersAround = 16;
  const upcomingGames = 3;

  const activeCourts = [
    {
      id: "south-campus",
      name: "South Campus Court",
      players: 4,
      note: "3v3 running now",
    },
    {
      id: "west-1",
      name: "West Campus Court 1",
      players: 3,
      note: "Looking for one more",
    },
    {
      id: "west-2",
      name: "West Campus Court 2",
      players: 0,
      note: "Quiet right now",
    },
  ];

  const userStats = {
    weekCheckins: 3,
    totalCheckins: 12,
    streak: 4,
    favoriteCourt: "South Campus Court",
  };

  const recentChats = [
    {
      id: "chat1",
      court: "South Campus Court",
      preview: '“Game to 11 – need 1 more!”',
      time: "5 min ago",
    },
    {
      id: "chat2",
      court: "West Campus Court 1",
      preview: '“Pulling up in 10 mins”',
      time: "21 min ago",
    },
  ];

  return (
    <ScrollView
      style={styles.homeWrap}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {/* Header */}
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
        See who&apos;s hooping right now and jump into a game.
      </Text>

      {/* Overview card (replaces big tiles) */}
      <View style={styles.courtCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderText}>Overview</Text>
          <View style={styles.cardHeaderRight}>
            <Ionicons name="speedometer-outline" size={16} color="#0b2239" />
            <Text style={styles.cardHeaderPresence}>Right now on campus</Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          {/* Courts */}
          <TouchableOpacity
            style={{ flex: 1, marginRight: 8 }}
            onPress={() => navigation.navigate("Map")}
          >
            <Text style={{ fontSize: 12, color: "#64748b" }}>Courts</Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Ionicons name="map-outline" size={18} color="#1f6fb2" />
              <Text
                style={{
                  marginLeft: 6,
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#0b2239",
                }}
              >
                {courtsNearby}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 11,
                color: "#94a3b8",
                marginTop: 2,
              }}
            >
              Nearby courts
            </Text>
          </TouchableOpacity>

          {/* Players */}
          <View style={{ flex: 1, marginHorizontal: 4 }}>
            <Text style={{ fontSize: 12, color: "#64748b" }}>Players</Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Ionicons name="people-outline" size={18} color="#16a34a" />
              <Text
                style={{
                  marginLeft: 6,
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#0b2239",
                }}
              >
                {playersAround}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 11,
                color: "#94a3b8",
                marginTop: 2,
              }}
            >
              Estimated on campus
            </Text>
          </View>

          {/* Games */}
          <TouchableOpacity
            style={{ flex: 1, marginLeft: 8 }}
            onPress={() => {
              // placeholder until you have a games screen
              alert("Games feature coming soon!");
            }}
          >
            <Text style={{ fontSize: 12, color: "#64748b" }}>Games</Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Ionicons name="calendar-outline" size={18} color="#f97316" />
              <Text
                style={{
                  marginLeft: 6,
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#0b2239",
                }}
              >
                {upcomingGames}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 11,
                color: "#94a3b8",
                marginTop: 2,
              }}
            >
              This week
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick link to profile */}
        <TouchableOpacity
          style={{
            marginTop: 10,
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={() => navigation.navigate("Profile")}
        >
          <Ionicons name="person-circle-outline" size={18} color="#1f6fb2" />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 13,
              color: "#1f6fb2",
              fontWeight: "600",
            }}
          >
            View and edit your profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active courts card */}
      <View style={styles.courtCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderText}>Active courts right now</Text>
          <View style={styles.cardHeaderRight}>
            <Ionicons name="flash-outline" size={16} color="#1f6fb2" />
            <Text style={styles.cardHeaderPresence}>Live check-ins</Text>
          </View>
        </View>

        {activeCourts.map((court) => (
          <TouchableOpacity
            key={court.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
            }}
            onPress={() => navigation.navigate("Map")}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#e5edfb",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons name="basketball-outline" size={18} color="#1f6fb2" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#0b2239",
                }}
                numberOfLines={1}
              >
                {court.name}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {court.note}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#0b2239",
                }}
              >
                {court.players}{" "}
                <Text style={{ fontSize: 12, color: "#64748b" }}>players</Text>
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={{
            marginTop: 10,
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={() => navigation.navigate("Map")}
        >
          <Text style={{ fontSize: 13, color: "#1f6fb2", fontWeight: "600" }}>
            View all courts on map
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color="#1f6fb2"
            style={{ marginLeft: 2 }}
          />
        </TouchableOpacity>
      </View>

      {/* Your activity card */}
      <View style={styles.courtCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderText}>Your activity</Text>
          <View style={styles.cardHeaderRight}>
            <Ionicons name="stats-chart-outline" size={16} color="#16a34a" />
            <Text style={styles.cardHeaderPresence}>Last 7 days</Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <View>
            <Text style={{ fontSize: 12, color: "#64748b" }}>Check-ins</Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: "#0b2239",
                marginTop: 2,
              }}
            >
              {userStats.weekCheckins}
              <Text style={{ fontSize: 12, color: "#64748b" }}> this week</Text>
            </Text>
          </View>

          <View>
            <Text style={{ fontSize: 12, color: "#64748b" }}>Total</Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: "#0b2239",
                marginTop: 2,
              }}
            >
              {userStats.totalCheckins}
              <Text style={{ fontSize: 12, color: "#64748b" }}> check-ins</Text>
            </Text>
          </View>

          <View>
            <Text style={{ fontSize: 12, color: "#64748b" }}>Streak</Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: "#0b2239",
                marginTop: 2,
              }}
            >
              {userStats.streak}{" "}
              <Text style={{ fontSize: 12, color: "#64748b" }}>days</Text>
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 6 }}>
          <Text style={{ fontSize: 12, color: "#64748b" }}>Favorite court</Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#0b2239",
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {userStats.favoriteCourt}
          </Text>
        </View>
      </View>

      {/* Recent chats card */}
      <View style={styles.courtCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderText}>Recent court chats</Text>
          <View style={styles.cardHeaderRight}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={16}
              color="#0b2239"
            />
            <Text style={styles.cardHeaderPresence}>Latest messages</Text>
          </View>
        </View>

        {recentChats.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
            }}
            onPress={() => navigation.navigate("Map")}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#e2e8f0",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#0b2239" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#0b2239",
                }}
                numberOfLines={1}
              >
                {chat.court}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {chat.preview}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 11,
                color: "#94a3b8",
                marginLeft: 8,
              }}
            >
              {chat.time}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={{
            marginTop: 10,
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={() => navigation.navigate("Map")}
        >
          <Text style={{ fontSize: 13, color: "#1f6fb2", fontWeight: "600" }}>
            Open court chats
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color="#1f6fb2"
            style={{ marginLeft: 2 }}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom banner */}
      <TouchableOpacity
        style={styles.banner}
        onPress={() => navigation.navigate("Map")}
      >
        <View style={styles.bannerIcon}>
          <Ionicons name="trophy-outline" size={22} color="#0b2239" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Find the best courts on campus</Text>
          <Text style={styles.bannerSub}>
            Explore activity, chat, and player vibes at each spot.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#0b2239" />
      </TouchableOpacity>
    </ScrollView>
  );
}

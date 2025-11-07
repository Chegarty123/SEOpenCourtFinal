// screens/HomeScreen.js
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import markers from "../assets/markers";
import { styles } from "../styles/globalStyles";

// 🔵 OC logo (adjust path if needed)
const OCLogo = require("../images/OCLogo.png");
const OCLOGOnoText = require("../images/OCLOGOnoText.png");

// Haversine distance helper (km)
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// time-of-day greeting
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
}

// "time ago" helper
function formatTimeAgo(ts) {
  if (!ts || typeof ts.toDate !== "function") return "";
  const date = ts.toDate();
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

// 🔑 OpenWeather API key – you already added yours here
const OPEN_WEATHER_API_KEY = "7c7c1ba29a0c5fb4593205a3b1e1e6a4";

export default function HomeScreen({ navigation }) {
  const user = auth.currentUser;

  const [userDoc, setUserDoc] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);

  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [checkingLocation, setCheckingLocation] = useState(true);

  // courtId -> array of players { id, name, avatar, ts }
  const [courtCheckins, setCourtCheckins] = useState({});

  // mini chat teasers
  const [chatTeasers, setChatTeasers] = useState([]);

  // weather state
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  /* ========== Load current user (name, friends, stats) ========== */
  useEffect(() => {
    if (!user) {
      setLoadingUser(false);
      return;
    }
    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        const data = snap.data() || {};
        setUserDoc(data);
        setFriends(data.friends || []);
        setLoadingUser(false);
      },
      (err) => {
        console.log("Home user snapshot error:", err);
        setLoadingUser(false);
      }
    );
    return () => unsub();
  }, [user]);

  /* ========== Get location (for “near you” + weather) ========== */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) {
            setLocationError("Location permission not granted");
            setCheckingLocation(false);
          }
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          setCheckingLocation(false);
        }
      } catch (err) {
        console.log("Home location error:", err);
        if (!cancelled) {
          setLocationError("Could not fetch location");
          setCheckingLocation(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ========== Weather based on location + API key ========== */
  useEffect(() => {
    if (!location || !OPEN_WEATHER_API_KEY) return;
    let cancelled = false;

    (async () => {
      try {
        setWeatherLoading(true);
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${
          location.latitude
        }&lon=${location.longitude}&units=imperial&appid=${OPEN_WEATHER_API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) {
          console.log("Weather HTTP error:", res.status);
        }
        const json = await res.json();
        if (cancelled) return;

        if (json.cod !== 200) {
          console.log("Weather error:", json);
          setWeatherError("Weather unavailable");
          setWeather(null);
          return;
        }

        setWeather({
          temp: Math.round(json.main?.temp ?? 0),
          condition: json.weather?.[0]?.main || "",
        });
        setWeatherError(null);
      } catch (err) {
        console.log("Weather fetch error:", err);
        if (!cancelled) {
          setWeatherError("Weather unavailable");
          setWeather(null);
        }
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location]);

  /* ========== Listen to check-ins for all courts ========== */
  useEffect(() => {
    if (!user) return;
    const unsubs = [];

    markers.forEach((marker) => {
      const courtId = marker?.id;
      if (!courtId) return;

      const checkinsRef = collection(
        db,
        "courts",
        String(courtId),
        "checkins"
      );

      const unsub = onSnapshot(
        checkinsRef,
        (snap) => {
          const players = [];
          snap.forEach((d) => {
            const data = d.data();
            players.push({
              id: d.id,
              name: data.username || "player",
              avatar: data.avatar || null,
              ts: data.ts || null,
            });
          });
          setCourtCheckins((prev) => ({
            ...prev,
            [courtId]: players,
          }));
        },
        (err) => {
          console.log("Home checkins snapshot error:", err);
        }
      );

      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u && u());
    };
  }, [user]);

  /* ========== Mini chat teasers (last message per court) ========== */
  useEffect(() => {
    if (!user) return;
    const unsubs = [];

    markers.forEach((marker) => {
      const courtId = marker?.id;
      if (!courtId) return;

      const msgsRef = collection(
        db,
        "courts",
        String(courtId),
        "messages"
      );
      const q = query(msgsRef, orderBy("ts", "desc"), limit(1));

      const unsub = onSnapshot(
        q,
        (snap) => {
          if (snap.empty) {
            setChatTeasers((prev) =>
              prev.filter((t) => t.courtId !== courtId)
            );
            return;
          }
          const d = snap.docs[0];
          const data = d.data();
          setChatTeasers((prev) => {
            const others = prev.filter((t) => t.courtId !== courtId);
            return [
              ...others,
              {
                courtId,
                marker,
                lastText: data.text || "",
                lastUser: data.username || "player",
                ts: data.ts || null,
              },
            ];
          });
        },
        (err) => {
          console.log("Home chat teaser snapshot error:", err);
        }
      );

      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u && u());
    };
  }, [user]);

  const displayName =
    userDoc?.username ||
    (user?.email ? user.email.split("@")[0] : "Player");

  /* ========== Build court meta (players, friends, distance) ========== */
  const courtsWithMeta = useMemo(() => {
    return markers.map((marker) => {
      const courtId = marker?.id;
      const players = (courtId && courtCheckins[courtId]) || [];
      const playerCount = players.length;
      const friendsHere = friends.length
        ? players.filter((p) => friends.includes(p.id)).length
        : 0;
      const amICheckedIn =
        !!user && players.some((p) => p.id === user.uid);

      let distanceKm = null;
      if (
        location &&
        marker?.coordinates?.latitude != null &&
        marker?.coordinates?.longitude != null
      ) {
        distanceKm = haversineDistanceKm(
          location.latitude,
          location.longitude,
          marker.coordinates.latitude,
          marker.coordinates.longitude
        );
      }

      return {
        marker,
        courtId,
        players,
        playerCount,
        friendsHere,
        amICheckedIn,
        distanceKm,
      };
    });
  }, [courtCheckins, friends, location, user]);

  const sortedCourts = useMemo(() => {
    const arr = [...courtsWithMeta];
    arr.sort((a, b) => {
      const hasDistA = a.distanceKm != null;
      const hasDistB = b.distanceKm != null;
      if (hasDistA && hasDistB) {
        if (Math.abs(a.distanceKm - b.distanceKm) < 0.01) {
          return b.playerCount - a.playerCount;
        }
        return a.distanceKm - b.distanceKm;
      }
      if (hasDistA && !hasDistB) return -1;
      if (!hasDistA && hasDistB) return 1;
      return b.playerCount - a.playerCount;
    });
    return arr;
  }, [courtsWithMeta]);

  const nearbyCourts = sortedCourts.slice(0, 5);

  // Top courts = most players right now
  const topCourts = useMemo(() => {
    const arr = courtsWithMeta
      .filter((c) => c.playerCount > 0)
      .slice()
      .sort((a, b) => b.playerCount - a.playerCount);
    return arr.slice(0, 5);
  }, [courtsWithMeta]);

  /* ========== Friends hooping / activity feed ========== */
  const friendsHooping = useMemo(() => {
    const map = new Map();
    courtsWithMeta.forEach((c) => {
      c.players.forEach((p) => {
        if (friends.includes(p.id) && !map.has(p.id)) {
          map.set(p.id, {
            friendId: p.id,
            friendName: p.name,
            court: c,
            ts: p.ts || null,
          });
        }
      });
    });
    return Array.from(map.values());
  }, [courtsWithMeta, friends]);

  /* ========== Active chats (sorted teasers) ========== */
  const activeChats = useMemo(() => {
    const arr = [...chatTeasers];
    arr.sort((a, b) => {
      const ta =
        a.ts && typeof a.ts.toDate === "function"
          ? a.ts.toDate().getTime()
          : 0;
      const tb =
        b.ts && typeof b.ts.toDate === "function"
          ? b.ts.toDate().getTime()
          : 0;
      return tb - ta;
    });
    return arr.slice(0, 4);
  }, [chatTeasers]);

  /* ========== Player stats & weekly summary ========== */
  const totalCheckIns = userDoc?.checkInCount || 0;
  const courtsVisitedFromArray = Array.isArray(userDoc?.courtsVisited)
    ? new Set(userDoc.courtsVisited).size
    : 0;
  const courtsVisitedCount =
    userDoc?.courtsVisitedCount || courtsVisitedFromArray || 0;
  const weeklyCheckIns = userDoc?.weeklyCheckIns || 0;

  let weeklySummary = "";
  if (weeklyCheckIns === 0) {
    weeklySummary = "No runs yet this week.";
  } else if (weeklyCheckIns === 1) {
    weeklySummary = "1 run this week. Keep it going.";
  } else {
    weeklySummary = `${weeklyCheckIns} runs this week. Nice work.`;
  }

  /* ========== Render helpers (compact versions) ========== */

  const renderCourtPill = (c) => {
    const {
      marker,
      playerCount,
      friendsHere,
      amICheckedIn,
      distanceKm,
    } = c;
    if (!marker) return null;

    const distanceLabel =
      distanceKm != null ? `${distanceKm.toFixed(1)} km` : null;

    return (
      <TouchableOpacity
        key={marker.id}
        style={{
          width: 180,
          marginRight: 10,
          padding: 10,
          borderRadius: 14,
          backgroundColor: "rgba(15,23,42,0.9)",
          borderWidth: 1,
          borderColor: "rgba(148,163,184,0.6)",
        }}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("CourtDetail", { marker })}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: "#e5f3ff",
          }}
          numberOfLines={1}
        >
          {marker.name || "Court"}
        </Text>

        <Text
          style={{
            marginTop: 4,
            fontSize: 11,
            color: "#9ca3af",
          }}
          numberOfLines={1}
        >
          {playerCount > 0
            ? `${playerCount} hooping`
            : "Empty right now"}
        </Text>

        {friendsHere > 0 && (
          <Text
            style={{
              marginTop: 2,
              fontSize: 11,
              color: "#4ade80",
            }}
            numberOfLines={1}
          >
            {friendsHere} friend
            {friendsHere > 1 ? "s" : ""} here
          </Text>
        )}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 4,
          }}
        >
          {amICheckedIn && (
            <>
              <Ionicons
                name="radio-button-on-outline"
                size={11}
                color="#22c55e"
              />
              <Text
                style={{
                  marginLeft: 4,
                  fontSize: 10,
                  color: "#bbf7d0",
                }}
              >
                You&apos;re here
              </Text>
            </>
          )}
          {distanceLabel && (
            <Text
              style={{
                marginLeft: amICheckedIn ? 8 : 0,
                fontSize: 10,
                color: "#94a3b8",
              }}
            >
              {distanceLabel}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFriendsActivityRow = (item) => {
    const { friendId, friendName, court, ts } = item;
    const marker = court.marker;
    if (!marker) return null;

    return (
      <TouchableOpacity
        key={friendId}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        }}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("CourtDetail", { marker })}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: "rgba(56,189,248,0.2)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          <Ionicons name="person-outline" size={15} color="#e0f2fe" />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#e5f3ff",
            }}
            numberOfLines={1}
          >
            {friendName}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginTop: 1,
            }}
            numberOfLines={1}
          >
            at {marker.name || "a court"} · {formatTimeAgo(ts)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderChatTeaserRow = (item) => {
    const { courtId, marker, lastUser, lastText, ts } = item;
    if (!marker) return null;

    return (
      <TouchableOpacity
        key={courtId}
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("CourtDetail", {
            marker,
            openChat: true,
          })
        }
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: "rgba(148,163,184,0.25)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={15}
            color="#e5f3ff"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#e5f3ff",
            }}
            numberOfLines={1}
          >
            {marker.name || "Court chat"}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: "#cbd5f5",
              marginTop: 1,
            }}
            numberOfLines={1}
          >
            {lastUser}: {lastText || "Media message"}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: "#9ca3af",
              marginTop: 1,
            }}
          >
            {formatTimeAgo(ts)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const greeting = getGreeting();

  return (
    <View style={{ flex: 1, backgroundColor: "#020617" }}>
      {/* subtle background "basketball / court" shapes */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -80,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: "rgba(56,189,248,0.25)",
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 140,
          left: -80,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: "rgba(251,146,60,0.18)",
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: -120,
          right: -40,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: "rgba(15,23,42,0.9)",
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* main content wrapper (re-using your homeWrap for spacing) */}
        <View
          style={[
            styles.homeWrap,
            {
              backgroundColor: "transparent",
            },
          ]}
        >
          {/* HEADER with logo */}
          <View
            style={[
              styles.homeHeader,
              { marginBottom: 6, alignItems: "center" },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(15,23,42,0.9)",
                  marginRight: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.5)",
                  overflow: "hidden",
                }}
              >
                <Image
                  source={OCLogo}
                  style={{ width: 32, height: 32, resizeMode: "contain" }}
                />
              </View>
              <View>
                <Text
                  style={[
                    styles.homeTitle,
                    { color: "#e0f2fe", fontSize: 16 },
                  ]}
                >
                  {greeting}
                </Text>
                <Text
                  style={[
                    styles.homeName,
                    { color: "#f9fafb", fontSize: 22 },
                  ]}
                >
                  {displayName || "Player"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.8}
            >
              <Image
                source={
                  userDoc?.profilePic
                    ? { uri: userDoc.profilePic }
                    : require("../images/defaultProfile.png")
                }
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 2,
                  borderColor: "#38bdf8",
                }}
              />
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.homeLead,
              {
                color: "#9ca3af",
                marginBottom: 10,
              },
            ]}
          >
            Quick view of your runs, who&apos;s hooping, and active courts on
            OpenCourt.
          </Text>

          {/* COMPACT STATS + WEATHER CARD */}
          <View
            style={[
              styles.courtCard,
              {
                paddingVertical: 12,
                paddingHorizontal: 12,
                backgroundColor: "rgba(15,23,42,0.95)",
                borderColor: "rgba(148,163,184,0.7)",
                borderWidth: 1,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              {/* Stats side */}
              <View style={{ flex: 2, marginRight: 10 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#e5f3ff",
                  }}
                >
                  Your week
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    marginTop: 4,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: "#f9fafb",
                      }}
                    >
                      {weeklyCheckIns}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                      }}
                    >
                      Runs
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: "#f9fafb",
                      }}
                    >
                      {courtsVisitedCount}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                      }}
                    >
                      Courts
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: "#f9fafb",
                      }}
                    >
                      {totalCheckIns}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                      }}
                    >
                      All-time
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    fontSize: 11,
                    color: "#cbd5f5",
                    marginTop: 4,
                  }}
                  numberOfLines={1}
                >
                  {weeklySummary}
                </Text>
              </View>

              {/* Weather side */}
              <View
                style={{
                  flex: 1.3,
                  paddingLeft: 10,
                  borderLeftWidth: 1,
                  borderLeftColor: "rgba(148,163,184,0.6)",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#e5f3ff",
                  }}
                >
                  Weather
                </Text>

                {weatherLoading ? (
                  <View style={{ flexDirection: "row", marginTop: 4 }}>
                    <ActivityIndicator size="small" />
                  </View>
                ) : weather ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 4,
                    }}
                  >
                    <Ionicons
                      name="sunny-outline"
                      size={18}
                      color="#fbbf24"
                    />
                    <View style={{ marginLeft: 6 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: "#f9fafb",
                        }}
                      >
                        {weather.temp}°F
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#e5e7eb",
                        }}
                      >
                        {weather.condition}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      marginTop: 4,
                    }}
                    numberOfLines={2}
                  >
                    {locationError
                      ? "Enable location to see local weather."
                      : OPEN_WEATHER_API_KEY
                      ? "Weather not available."
                      : "Add your OpenWeather API key to show local conditions."}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* ACTIVITY CARD: Chats + Friend activity */}
          <View
            style={[
              styles.courtCard,
              {
                marginTop: 12,
                paddingVertical: 10,
                paddingHorizontal: 12,
                backgroundColor: "rgba(15,23,42,0.95)",
                borderColor: "rgba(148,163,184,0.7)",
                borderWidth: 1,
              },
            ]}
          >

            <View style={styles.cardHeaderRow}>
              <Text
                style={[
                  styles.cardHeaderText,
                  { color: "#e5f3ff", fontSize: 14 },
                ]}
              >
                Court activity
              </Text>
              <Text
                style={[
                  styles.cardHeaderPresence,
                  { color: "#93c5fd" },
                ]}
              >
                Chats & friends
              </Text>
            </View>

            {/* Active chats */}
            <View style={{ marginTop: 4 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#e5f3ff",
                  marginBottom: 4,
                }}
              >
                Active chats
              </Text>

              {activeChats.length === 0 ? (
                <Text
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    marginBottom: 4,
                  }}
                >
                  No active court chats yet.
                </Text>
              ) : (
                activeChats.map(renderChatTeaserRow)
              )}
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: "rgba(75,85,99,0.7)",
                marginVertical: 6,
              }}
            />

            {/* Friends */}
            <View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#e5f3ff",
                  marginBottom: 4,
                }}
              >
                Friends hooping
              </Text>

              {friendsHooping.length === 0 ? (
                <Text
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  No friends checked in right now.
                </Text>
              ) : (
                friendsHooping.slice(0, 4).map(renderFriendsActivityRow)
              )}
            </View>
          </View>

          {/* COURT ROWS – horizontal & compact */}
          <View
            style={[
              styles.courtCard,
              {
                marginTop: 12,
                paddingVertical: 10,
                paddingHorizontal: 12,
                backgroundColor: "rgba(15,23,42,0.95)",
                borderColor: "rgba(148,163,184,0.7)",
                borderWidth: 1,
              },
            ]}
          >

            <View style={styles.cardHeaderRow}>
              <Text
                style={[
                  styles.cardHeaderText,
                  { color: "#e5f3ff", fontSize: 14 },
                ]}
              >
                Courts
              </Text>
              <Text
                style={[
                  styles.cardHeaderPresence,
                  { color: "#93c5fd" },
                ]}
              >
                Nearby & top runs
              </Text>
            </View>

            {/* Nearby courts horizontal */}
            <View style={{ marginTop: 4 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#e5f3ff",
                  marginBottom: 4,
                }}
              >
                Near you
              </Text>
              {checkingLocation && nearbyCourts.length === 0 ? (
                <View
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <ActivityIndicator size="small" />
                  <Text
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
                      color: "#9ca3af",
                    }}
                  >
                    Finding nearby courts...
                  </Text>
                </View>
              ) : nearbyCourts.length === 0 ? (
                <Text
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  No courts configured yet. Check the map tab.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 2 }}
                >
                  {nearbyCourts.map(renderCourtPill)}
                </ScrollView>
              )}
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: "rgba(75,85,99,0.7)",
                marginVertical: 6,
              }}
            />

            {/* Top courts horizontal */}
            <View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#e5f3ff",
                  marginBottom: 4,
                }}
              >
                Top courts right now
              </Text>
              {topCourts.length === 0 ? (
                <Text
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  No active runs yet. Start one at your favorite court.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 2 }}
                >
                  {topCourts.map(renderCourtPill)}
                </ScrollView>
              )}
            </View>
          </View>

          {/* BANNER CTA */}
          <TouchableOpacity
            style={[
              styles.banner,
              {
                marginTop: 16,
                backgroundColor: "rgba(15,23,42,0.96)",
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "rgba(56,189,248,0.6)",
              },
            ]}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("Map")}
          >
            <View
              style={[
                styles.bannerIcon,
                {
                  backgroundColor: "rgba(56,189,248,0.18)",
                  borderRadius: 999,
                },
              ]}
            >
              <Ionicons name="map-outline" size={20} color="#e5f3ff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.bannerTitle,
                  { color: "#e5f3ff", fontSize: 14 },
                ]}
              >
                Open full map of courts
              </Text>
              <Text
                style={[
                  styles.bannerSub,
                  { color: "#9ca3af", fontSize: 12 },
                ]}
              >
                See every court, live player counts, and chat.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#93c5fd"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

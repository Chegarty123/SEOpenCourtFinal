import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import markers from "../assets/markers";
import { styles } from "../styles/globalStyles";

export default function MapScreen({ navigation }) {
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasCentered, setHasCentered] = useState(false);

  // get live user location and follow updates
  useEffect(() => {
    (async () => {
      let { status } =
        await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Permission to access location was denied");
        return;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
          const region = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.0075,
            longitudeDelta: 0.0075,
          };
          setUserLocation(region);
        }
      );

      return () => {
        subscription.remove();
      };
    })();
  }, []);

  // helper to jump to a region
  const flyTo = (region) => {
    if (!region) return;
    mapRef.current?.animateToRegion(region, 1000);
  };

  useEffect(() => {
    if (userLocation && !hasCentered) {
      flyTo(userLocation);
      setHasCentered(true);
    }
  }, [userLocation]);

  const { height } = Dimensions.get("window");

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#eef2f7", // same bg vibe as CourtDetail screen
        paddingTop: Platform.OS === "ios" ? 50 : 20,
      }}
    >
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          marginBottom: 12,
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexShrink: 1 }}>
          <Text
            style={{
              color: "#0b2239",
              fontSize: 14,
              fontWeight: "500",
            }}
          >
            Courts Near You
          </Text>
          <Text
            style={{
              color: "#0b2239",
              fontSize: 24,
              fontWeight: "700",
            }}
          >
            Find a run 🏀
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 9999,
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 3,
          }}
        >
          <Image
            source={require("../images/OCLogo.png")}
            resizeMode="contain"
            style={{ width: 36, height: 36 }}
          />
        </View>
      </View>

      {/* MAP WRAPPER */}
      <View
        style={{
          flex: 1,
          marginHorizontal: 16,
          borderRadius: 20,
          overflow: "hidden",
          backgroundColor: "#000",
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          mapType="satellite"
          initialRegion={
            userLocation || {
              // fallback center-ish on campus so it doesn't crash first render
              latitude: markers[0]?.coordinates.latitude || 0,
              longitude: markers[0]?.coordinates.longitude || 0,
              latitudeDelta:
                markers[0]?.coordinates.latitudeDelta || 0.0075,
              longitudeDelta:
                markers[0]?.coordinates.longitudeDelta || 0.0075,
            }
          }
        >
          {/* Court markers */}
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              title={marker.name}
              coordinate={marker.coordinates}
              onPress={() => {
                flyTo(marker.coordinates);
              }}
            />
          ))}

          {/* User location marker */}
          {userLocation && (
            <Marker
              coordinate={userLocation}
              title="You"
              pinColor="dodgerblue"
              onPress={() => {
                flyTo(userLocation);
              }}
            />
          )}
        </MapView>

        {/* Find My Location floating button */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => flyTo(userLocation)}
          style={{
            position: "absolute",
            right: 16,
            bottom: 16,
            backgroundColor: "#ffffff",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 4,
          }}
        >
          <Ionicons
            name="locate-outline"
            size={18}
            color="#0b2239"
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              color: "#0b2239",
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            My Location
          </Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM SHEET STYLE COURT LIST */}
      <View
        style={{
          backgroundColor: "#fff",
          marginTop: 16,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 16,
          paddingBottom: 24,
          paddingHorizontal: 16,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
          elevation: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#0b2239",
              }}
            >
              All Courts
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "400",
                color: "#64748b",
                marginTop: 2,
              }}
            >
              Tap a court to view activity.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "#eef2f7",
              borderRadius: 9999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#0b2239",
              }}
            >
              {markers.length} courts
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 8,
            paddingRight: 4,
          }}
        >
          {markers.map((marker) => (
            <TouchableOpacity
              key={marker.id}
              activeOpacity={0.9}
              style={{
                width: 240,
                backgroundColor: "#f8fafc",
                borderRadius: 16,
                marginRight: 12,
                borderWidth: 1,
                borderColor: "#dbe3ee",
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
                overflow: "hidden",
              }}
              onPress={() => {
                // fly map to court
                flyTo(marker.coordinates);

                // navigate to detail
                navigation.navigate("CourtDetail", { marker });
              }}
            >
              {/* Court image */}
              <Image
                source={{ uri: marker.image }}
                style={{
                  width: "100%",
                  height: 110,
                }}
                resizeMode="cover"
              />

              {/* Info row */}
              <View style={{ padding: 12 }}>
                <Text
                  style={{
                    color: "#0b2239",
                    fontSize: 16,
                    fontWeight: "700",
                    marginBottom: 4,
                  }}
                  numberOfLines={1}
                >
                  {marker.name}
                </Text>

                <Text
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                    fontWeight: "400",
                    lineHeight: 16,
                    marginBottom: 10,
                  }}
                  numberOfLines={2}
                >
                  {marker.description}
                </Text>

                {/* bottom row: fake activity + button chevron */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      backgroundColor: "#fff",
                      borderRadius: 9999,
                      borderWidth: 1,
                      borderColor: "#cbd5e1",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="people-outline"
                      size={14}
                      color="#0b2239"
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={{
                        color: "#0b2239",
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      active now
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#1e5fa9",
                        fontSize: 13,
                        fontWeight: "600",
                        marginRight: 4,
                      }}
                    >
                      View Court
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#1e5fa9"
                    />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

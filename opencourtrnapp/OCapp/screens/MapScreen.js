// screens/MapScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Dimensions,
  Modal,
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, Callout } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import markers from "../assets/markers";
import { styles } from "../styles/globalStyles";

export default function MapScreen({ navigation }) {
  const mapRef = useRef(null);
  const fullscreenMapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasCentered, setHasCentered] = useState(false);
  const [currentRegion, setCurrentRegion] = useState(null);

  // Get user location and update continuously
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
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

  // Helper to fly map camera
  const flyTo = (region, mapToUse = mapRef) => {
    if (!region || !mapToUse?.current) return;
    mapToUse.current.animateToRegion(region, 1000);
    setCurrentRegion(region);
  };

  useEffect(() => {
    if (userLocation && !hasCentered) {
      flyTo(userLocation);
      setHasCentered(true);
    }
  }, [userLocation, hasCentered]);

  const { height } = Dimensions.get("window");

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#020617",
        paddingTop: Platform.OS === "ios" ? 70 : 20,
      }}
    >
      {/* background shapes */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -80,
          right: -60,
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: "rgba(56,189,248,0.22)",
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 160,
          left: -80,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: "rgba(251,146,60,0.18)",
        }}
      />

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
              color: "#e5f3ff",
              fontSize: 14,
              fontWeight: "500",
            }}
          >
            Courts near you
          </Text>
          <Text
            style={{
              color: "#f9fafb",
              fontSize: 24,
              fontWeight: "800",
            }}
          >
            Find a run 🏀
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "rgba(15,23,42,0.95)",
            borderRadius: 9999,
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.35,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.8)",
          }}
        >
          <Image
            source={require("../images/OCLogo.png")}
            resizeMode="contain"
            style={{ width: 32, height: 32 }}
          />
        </View>
      </View>

      {/* MAP WRAPPER */}
      <View
        style={{
          flex: 1,
          marginHorizontal: 16,
          borderRadius: 22,
          overflow: "hidden",
          backgroundColor: "#020617",
          borderWidth: 1,
          borderColor: "rgba(148,163,184,0.6)",
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          mapType="satellite"
          region={
            currentRegion ||
            userLocation || {
              latitude: markers[0]?.coordinates.latitude || 0,
              longitude: markers[0]?.coordinates.longitude || 0,
              latitudeDelta: 0.0075,
              longitudeDelta: 0.0075,
            }
          }
          onRegionChangeComplete={(region) => setCurrentRegion(region)}
        >
          {/* Court markers */}
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              coordinate={marker.coordinates}
              onPress={() => flyTo(marker.coordinates, mapRef)}
            >
            <Callout tooltip>
            <View style={{
              backgroundColor: "#0b1221",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#93c5fd",
              padding: 8,
            }}>
          <Text style={{ color: "#ffffff", fontWeight: "600" }}>
          {marker.name}
      </Text>
    </View>
  </Callout>
</Marker>
          ))}

          {/* User location marker */}
          {userLocation && (
            <Marker
            coordinate={userLocation}
            pinColor="dodgerblue"
            onPress={() => flyTo(userLocation, mapRef)}
            >
            <Callout tooltip>
            <View style={{
              backgroundColor: "#0b1221",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#93c5fd",
              padding: 8,
            }}>
      <Text style={{ color: "#ffffff", fontWeight: "600" }}>
        You
      </Text>
    </View>
  </Callout>
</Marker>
          )}
        </MapView>

        {/* Fullscreen toggle */}
        <TouchableOpacity
          onPress={() => {
            if (currentRegion && fullscreenMapRef.current) {
              fullscreenMapRef.current.animateToRegion(currentRegion, 0);
            }
            setIsFullscreen(true);
          }}
          activeOpacity={0.9}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            backgroundColor: "rgba(15,23,42,0.96)",
            borderRadius: 12,
            padding: 8,
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.8)",
            shadowColor: "#000",
            shadowOpacity: 0.35,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 5,
          }}
        >
          <Ionicons name="expand-outline" size={20} color="#e5f3ff" />
        </TouchableOpacity>

        {/* My Location */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => flyTo(userLocation, mapRef)}
          style={{
            position: "absolute",
            right: 16,
            bottom: 16,
            backgroundColor: "rgba(15,23,42,0.98)",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 14,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.8)",
            shadowColor: "#000",
            shadowOpacity: 0.35,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 5,
          }}
        >
          <Ionicons
            name="locate-outline"
            size={18}
            color="#e5f3ff"
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              color: "#e5f3ff",
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            My Location
          </Text>
        </TouchableOpacity>
      </View>

      {/* FULLSCREEN MAP MODAL */}
      <Modal visible={isFullscreen} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: "#020617" }}>
          <MapView
            ref={fullscreenMapRef}
            style={{ flex: 1 }}
            mapType="satellite"
            region={currentRegion || userLocation}
            onRegionChangeComplete={(region) => setCurrentRegion(region)}
          >
            {markers.map((marker) => (
              <Marker
              key={marker.id}
              coordinate={marker.coordinates}
              onPress={() => flyTo(marker.coordinates, mapRef)}
              >
              <Callout tooltip>
              <View style={{
                backgroundColor: "#0b1221",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#93c5fd",
                padding: 8,
              }}>
      <Text style={{ color: "#ffffff", fontWeight: "600" }}>
        {marker.name}
      </Text>
    </View>
  </Callout>
</Marker>
            ))}

            {userLocation && (
              <Marker
              coordinate={userLocation}
              pinColor="dodgerblue"
              onPress={() => flyTo(userLocation, mapRef)}
              >
              <Callout tooltip>
              <View style={{
                backgroundColor: "#0b1221",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#93c5fd",
                padding: 8,
              }}>
      <Text style={{ color: "#ffffff", fontWeight: "600" }}>
        You
      </Text>
    </View>
  </Callout>
</Marker>
            )}
          </MapView>

          {/* Close Button */}
          <TouchableOpacity
            onPress={() => setIsFullscreen(false)}
            activeOpacity={0.9}
            style={{
              position: "absolute",
              top: 40,
              right: 20,
              backgroundColor: "rgba(15,23,42,0.96)",
              borderRadius: 12,
              padding: 8,
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.8)",
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 5,
            }}
          >
            <Ionicons name="close-outline" size={22} color="#e5f3ff" />
          </TouchableOpacity>

          {/* My Location Button in Fullscreen */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => flyTo(userLocation, fullscreenMapRef)}
            style={{
              position: "absolute",
              right: 20,
              bottom: 30,
              backgroundColor: "rgba(15,23,42,0.98)",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.8)",
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 5,
            }}
          >
            <Ionicons
              name="locate-outline"
              size={18}
              color="#e5f3ff"
              style={{ marginRight: 6 }}
            />
            <Text
              style={{ color: "#e5f3ff", fontSize: 14, fontWeight: "600" }}
            >
              My Location
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* COURT LIST */}
      <View
        style={{
          backgroundColor: "rgba(15,23,42,0.96)",
          marginTop: 16,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingTop: 16,
          paddingBottom: 24,
          paddingHorizontal: 16,
          borderTopWidth: 1,
          borderColor: "rgba(148,163,184,0.7)",
          shadowColor: "#000",
          shadowOpacity: 0.45,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
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
                fontWeight: "800",
                color: "#e5f3ff",
              }}
            >
              All courts
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "400",
                color: "#9ca3af",
                marginTop: 2,
              }}
            >
              Tap a court to view activity.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "rgba(15,23,42,0.9)",
              borderRadius: 9999,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.7)",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#93c5fd",
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
                backgroundColor: "rgba(15,23,42,0.95)",
                borderRadius: 18,
                marginRight: 12,
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.7)",
                shadowColor: "#000",
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 4,
                overflow: "hidden",
              }}
              onPress={() => {
                flyTo(marker.coordinates, mapRef);
                navigation.navigate("CourtDetail", { marker });
              }}
            >
              <Image
                source={{ uri: marker.image }}
                style={{ width: "100%", height: 110 }}
                resizeMode="cover"
              />

              <View style={{ padding: 12 }}>
                <Text
                  style={{
                    color: "#e5f3ff",
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
                    color: "#cbd5f5",
                    fontSize: 13,
                    fontWeight: "400",
                    lineHeight: 16,
                    marginBottom: 10,
                  }}
                  numberOfLines={2}
                >
                  {marker.description}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: "#e5f3ff",
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        color: "#93c5fd",
                        fontSize: 13,
                        fontWeight: "600",
                        marginRight: 4,
                      }}
                    >
                      View court
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#93c5fd"
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

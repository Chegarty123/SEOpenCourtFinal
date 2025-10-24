import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  Pressable,
  Image,
  TouchableOpacity,
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import markers from "../assets/markers";
import { styles } from "../styles/globalStyles.js";

export default function MapScreen({ navigation }) {
  const mapRef = useRef(null);
  const [selectedCard, setSelectedCard] = useState("");
  const [userLocation, setUserLocation] = useState(null);

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
        (location) => {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.0075,
            longitudeDelta: 0.0075,
          });
        }
      );

      return () => subscription.remove();
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Basketball Courts Nearby</Text>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={userLocation}
        mapType="satellite"
      >
        {markers.map((marker, index) => (
          <Marker
            key={index}
            onPress={() => {
              mapRef.current?.animateToRegion(marker.coordinates, 1000);
            }}
            title={marker.name}
            coordinate={marker.coordinates}
          />
        ))}

        {userLocation && (
          <Marker
            onPress={() => {
              mapRef.current?.animateToRegion(userLocation, 1000);
            }}
            coordinate={userLocation}
            title="Your Location"
            pinColor="blue"
          />
        )}
      </MapView>

      <TouchableOpacity
        style={styles.locationButton}
        onPress={() => {
          if (userLocation) {
            mapRef.current?.animateToRegion(userLocation, 1000);
          }
        }}
      >
        <Text style={styles.locationButtonText}>Find My Location</Text>
      </TouchableOpacity>

      {/* horizontal card list */}
      <View style={styles.markerListContainer}>
        <FlatList
          horizontal
          data={markers}
          keyExtractor={(item) => item.name}
          renderItem={({ item: marker }) => (
            <Pressable
              onPress={() => {
                setSelectedCard(marker.name);
                mapRef.current?.animateToRegion(marker.coordinates, 1000);
                Alert.alert(
                  "Navigate to Court?",
                  `Do you want to view the page of ${marker.name}?`,
                  [
                    { text: "No", style: "cancel" },
                    {
                      text: "Yes",
                      onPress: () =>
                        navigation.navigate("CourtDetail", { marker }),
                    },
                  ]
                );
              }}
              style={
                marker.name === selectedCard
                  ? styles.activateMarkerButton
                  : styles.markerButton
              }
            >
              <Image
                source={{ uri: marker.image }}
                style={styles.markerImage}
              />
              <View style={styles.markerInfo}>
                <Text style={styles.markerName}>{marker.name}</Text>
                <Text style={styles.markerDescription}>
                  {marker.description}
                </Text>
              </View>
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}

import React from 'react';
import { useState, useRef } from 'react';
import MapView, {Marker} from 'react-native-maps';
import { View, Text, StyleSheet, FlatList, Pressable, Image, } from 'react-native';
import markers from './assets/markers';

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [selectedCard, setSelectedCard] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Basketball Courts Nearby</Text>
      <MapView style={styles.map} initialRegion={markers[0].coordinates} mapType="satellite">
      {markers.map((marker, index) => (<Marker
        key = {index}
        title = {marker.name}
        coordinate = {marker.coordinates}
      />
      ))}
      </MapView>
      <View style = {styles.markerListContainer}>
        <FlatList
          horizontal
          data={markers}
          keyExtractors={(item) => item.name}
          renderItem={({ item: marker}) => (
            <Pressable
              onPress={() => {
                setSelectedCard(marker.name);
                mapRef.current?.animateToRegion(marker.coordinates, 1000);
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
          )}/>
            </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  map: {width: '100%', height: '100%'},
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
    marginTop: 25,
  },
  markerListContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
  markerButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    minWidth: 220,
  },
  activateMarkerButton: {
    backgroundColor: "#007AFF", // Highlight color (iOS blue-like)
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    minWidth: 220,
  },

  // Image
  markerImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },

  // Text info
  markerInfo: {
  flex: 1,
  flexShrink: 1,
  maxWidth: 140,   // keeps text bounded
},
markerName: {
  fontSize: 16,
  fontWeight: "bold",
  color: "#333",
  marginBottom: 4,
},
markerDescription: {
  fontSize: 13,
  color: "#666",
  flexWrap: "wrap",   // ensures wrapping happens
},
});
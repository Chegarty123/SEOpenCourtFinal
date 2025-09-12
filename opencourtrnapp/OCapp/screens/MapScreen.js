import React from 'react';
import MapView, {Marker} from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';
import markers from './assets/markers';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map Page</Text>
      <MapView style={styles.map} initialRegion={markers[0].coordinates}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  map: {width: '100%', height: '100%'},
  title: { fontSize: 24, fontWeight: '600' },
});
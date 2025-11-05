import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styles } from "../styles/globalStyles.js";

export default function SettingsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
    </View>
  );
}

// screens/SplashScreen.js
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Animated,
  Easing,
  StatusBar,
  Platform,
} from "react-native";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

const SplashScreen = ({ navigation }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate loading bar from 0 → 100%
    Animated.timing(progress, {
      toValue: 1,
      duration: 1500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    // Listen for auth state to decide where to go
    const unsub = onAuthStateChanged(auth, (user) => {
      // small delay so the animation can play
      const timeout = setTimeout(() => {
        if (user) {
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs" }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        }
      }, 1600);

      return () => clearTimeout(timeout);
    });

    return () => unsub();
  }, [navigation, progress]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#020617",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
      }}
    >
      <StatusBar barStyle="light-content" />

      {/* subtle background blobs like other screens */}
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
          bottom: -100,
          left: -70,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: "rgba(251,146,60,0.18)",
        }}
      />

      {/* Logo */}
      <View
        style={{
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: "#020617",
            borderWidth: 2,
            borderColor: "rgba(148,163,184,0.7)",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.5,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          <Image
            source={require("../images/OCLOGOnoText.png")}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        </View>

        <Text
          style={{
            marginTop: 16,
            color: "#e5f3ff",
            fontSize: 24,
            fontWeight: "800",
          }}
        >
          OpenCourt
        </Text>
        <Text
          style={{
            marginTop: 6,
            color: "#9ca3af",
            fontSize: 14,
          }}
        >
          Track the run. Find your squad. Hoop more.
        </Text>
      </View>

      {/* Loading bar */}
      <View
        style={{
          width: "70%",
          height: 6,
          borderRadius: 999,
          backgroundColor: "rgba(30,64,175,0.45)",
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            height: "100%",
            width: barWidth,
            borderRadius: 999,
            backgroundColor: "#38bdf8",
          }}
        />
      </View>

      <Text
        style={{
          marginTop: 10,
          color: "#9ca3af",
          fontSize: 12,
        }}
      >
        Loading your run…
      </Text>
    </View>
  );
};

export default SplashScreen;

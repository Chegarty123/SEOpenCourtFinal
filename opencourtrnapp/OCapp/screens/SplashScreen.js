// screens/SplashScreen.js
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Animated,
  Easing,
  StatusBar,
} from "react-native";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SplashScreen = ({ navigation }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate loading bar
    Animated.timing(progress, {
      toValue: 1,
      duration: 1500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    const unsub = onAuthStateChanged(auth, (user) => {
      const decideWhereToGo = async () => {
        try {
          const stored = await AsyncStorage.getItem("rememberMe");
          const wantsRemember = stored === "true";

          setTimeout(async () => {
            if (user && wantsRemember) {
              // User signed in AND wants to stay signed in
              navigation.reset({
                index: 0,
                routes: [{ name: "MainTabs" }],
              });
            } else {
              // Either no user, or user but "remember me" was off
              if (user && !wantsRemember) {
                try {
                  await signOut(auth);
                } catch (e) {
                  console.log("Error signing out for non-remembered user:", e);
                }
              }
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            }
          }, 1600); // match loading bar animation
        } catch (e) {
          console.log("Error reading rememberMe flag:", e);
          // Fallback: just route based on auth status
          setTimeout(() => {
            navigation.reset({
              index: 0,
              routes: [{ name: user ? "MainTabs" : "Login" }],
            });
          }, 1600);
        }
      };

      decideWhereToGo();
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

      {/* background blobs */}
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

      {/* Logo + title */}
      <View style={{ alignItems: "center", marginBottom: 32 }}>
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

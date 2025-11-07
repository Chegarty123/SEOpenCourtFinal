// screens/LoginScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load previously saved "remember me" preference (if any)
  useEffect(() => {
    const loadRememberMe = async () => {
      try {
        const stored = await AsyncStorage.getItem("rememberMe");
        if (stored === "true") {
          setRememberMe(true);
        }
      } catch (err) {
        console.log("Failed to read rememberMe from storage:", err);
      }
    };
    loadRememberMe();
  }, []);

  const handleLogin = async () => {
    setError("");

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError("Enter your Villanova email and password to continue.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);

      // Persist rememberMe flag so Splash/auth logic can decide what to do on app launch
      try {
        await AsyncStorage.setItem("rememberMe", rememberMe ? "true" : "false");
      } catch (storageErr) {
        console.log("Failed to save rememberMe:", storageErr);
      }

      navigation.replace("MainTabs");
    } catch (err) {
      console.log("Login error:", err);
      let msg = "Unable to sign in. Check your details and try again.";
      if (err.code === "auth/invalid-email") {
        msg = "That email doesn’t look right.";
      } else if (err.code === "auth/user-not-found") {
        msg = "No account found with that email.";
      } else if (err.code === "auth/wrong-password") {
        msg = "Incorrect password. Try again.";
      } else if (err.code === "auth/too-many-requests") {
        msg = "Too many attempts. Please wait a bit and try again.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#020617" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1 }}>
        {/* Background orbs */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: "rgba(37,99,235,0.18)", // blue
            top: -80,
            right: -60,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: "rgba(147,51,234,0.14)", // purple
            top: 120,
            left: -70,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: "rgba(56,189,248,0.12)", // cyan
            bottom: -90,
            right: -80,
          }}
        />

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              flex: 1,
              paddingHorizontal: 20,
              paddingTop: 72, // pulled content down a bit
              paddingBottom: 24,
              justifyContent: "space-between",
            }}
          >
            <View>
              {/* Logo + app name */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 18,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#020617",
                    borderWidth: 1,
                    borderColor: "rgba(148,163,184,0.4)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Image
                    source={require("../images/OCLOGOnoText.png")}
                    style={{ width: 55, height: 55, borderRadius: 16 }}
                    resizeMode="contain"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#e5f3ff",
                      fontSize: 20,
                      fontWeight: "700",
                    }}
                  >
                    OpenCourt
                  </Text>
                  <Text
                    style={{
                      color: "#9ca3af",
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    Track the run, find your squad, hoop more.
                  </Text>
                </View>
              </View>

              {/* Heading block – nudged down */}
              <View style={{ marginTop: 10 }}>
                <Text
                  style={{
                    color: "#f9fafb",
                    fontSize: 26,
                    fontWeight: "800",
                    marginBottom: 4,
                  }}
                >
                  Welcome back
                </Text>
                <Text
                  style={{
                    color: "#9ca3af",
                    fontSize: 14,
                    marginBottom: 22,
                  }}
                >
                  Sign in with your Villanova email to get back on the court.
                </Text>
              </View>

              {/* Error banner */}
              {error ? (
                <View
                  style={{
                    backgroundColor: "rgba(248,113,113,0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(248,113,113,0.4)",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginBottom: 16,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="alert-circle" size={18} color="#fecaca" />
                  <Text
                    style={{
                      color: "#fecaca",
                      marginLeft: 8,
                      fontSize: 13,
                    }}
                  >
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Email */}
              <View style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    color: "#e5e7eb",
                    fontWeight: "600",
                    marginBottom: 6,
                    fontSize: 14,
                  }}
                >
                  Villanova email
                </Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#1f2937",
                    backgroundColor: "#020617",
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color="#6b7280"
                    style={{ marginRight: 6 }}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      color: "#e5e7eb",
                      paddingVertical: 4,
                      fontSize: 15,
                    }}
                    placeholder="you@villanova.edu"
                    placeholderTextColor="#6b7280"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={{ marginBottom: 8 }}>
                <Text
                  style={{
                    color: "#e5e7eb",
                    fontWeight: "600",
                    marginBottom: 6,
                    fontSize: 14,
                  }}
                >
                  Password
                </Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#1f2937",
                    backgroundColor: "#020617",
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#6b7280"
                    style={{ marginRight: 6 }}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      color: "#e5e7eb",
                      paddingVertical: 4,
                      fontSize: 15,
                    }}
                    placeholder="••••••••"
                    placeholderTextColor="#6b7280"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember + Forgot */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 18,
                }}
              >
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center" }}
                  onPress={() => setRememberMe((prev) => !prev)}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: rememberMe
                        ? "#60a5fa"
                        : "rgba(148,163,184,0.7)",
                      backgroundColor: rememberMe ? "#1d4ed8" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 6,
                    }}
                  >
                    {rememberMe && (
                      <Ionicons name="checkmark" size={12} color="#e5f3ff" />
                    )}
                  </View>
                  <Text style={{ color: "#9ca3af", fontSize: 13 }}>
                    Remember me
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => {}}>
                  <Text
                    style={{
                      color: "#93c5fd",
                      fontSize: 13,
                      fontWeight: "500",
                    }}
                  >
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Primary button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                style={{
                  backgroundColor: loading ? "#1d4ed8aa" : "#1d4ed8",
                  paddingVertical: 12,
                  borderRadius: 999,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.4,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 5,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: "#e5f3ff",
                    fontSize: 15,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                  }}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Text>
              </TouchableOpacity>

              {/* Divider + faux social */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginVertical: 12,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: "#111827",
                  }}
                />
                <Text
                  style={{
                    color: "#6b7280",
                    fontSize: 12,
                    marginHorizontal: 10,
                  }}
                >
                  or continue with
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: "#111827",
                  }}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <TouchableOpacity
                  style={{
                    flex: 1,
                    marginRight: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "#1f2937",
                    paddingVertical: 10,
                    alignItems: "center",
                    backgroundColor: "rgba(15,23,42,0.9)",
                  }}
                  onPress={() => {}}
                >
                  <Text
                    style={{
                      color: "#e5e7eb",
                      fontSize: 14,
                      fontWeight: "500",
                    }}
                  >
                    Google
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    marginLeft: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "#1f2937",
                    paddingVertical: 10,
                    alignItems: "center",
                    backgroundColor: "rgba(15,23,42,0.9)",
                  }}
                  onPress={() => {}}
                >
                  <Text
                    style={{
                      color: "#e5e7eb",
                      fontSize: 14,
                      fontWeight: "500",
                    }}
                  >
                    Apple
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View
              style={{
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#6b7280", fontSize: 13 }}>
                New here?{" "}
                <Text
                  style={{
                    color: "#93c5fd",
                    fontWeight: "600",
                  }}
                  onPress={() => navigation.navigate("Signup")}
                >
                  Create an account
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

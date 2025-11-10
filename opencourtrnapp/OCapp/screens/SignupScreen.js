// screens/SignupScreen.js
import React, { useState } from "react";
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
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    setError("");
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password || !confirm) {
      setError("Fill out all fields to create your account.");
      return;
    }

    if (!trimmedEmail.endsWith("@villanova.edu")) {
      setError("You must use a @villanova.edu email to sign up.");
      return;
    }

    if (password.length < 6) {
      setError("Password should be at least 6 characters long.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords don’t match. Double-check and try again.");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      navigation.replace("ProfileOnboarding");
    } catch (err) {
      console.log("Signup error:", err);
      let msg = "Unable to create your account. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        msg = "An account already exists with that email.";
      } else if (err.code === "auth/invalid-email") {
        msg = "That email doesn’t look right.";
      } else if (err.code === "auth/weak-password") {
        msg = "That password is too weak. Try a stronger one.";
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
                    Join the run. See who’s hooping around campus.
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
                  Create your account
                </Text>
                <Text
                  style={{
                    color: "#9ca3af",
                    fontSize: 14,
                    marginBottom: 22,
                  }}
                >
                  Use your Villanova email so your friends can find you.
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
              <View style={{ marginBottom: 14 }}>
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
                    placeholder="At least 6 characters"
                    placeholderTextColor="#6b7280"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    returnKeyType="next"
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

              {/* Confirm password */}
              <View style={{ marginBottom: 18 }}>
                <Text
                  style={{
                    color: "#e5e7eb",
                    fontWeight: "600",
                    marginBottom: 6,
                    fontSize: 14,
                  }}
                >
                  Confirm password
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
                    placeholder="Re-enter password"
                    placeholderTextColor="#6b7280"
                    secureTextEntry={!showConfirm}
                    value={confirm}
                    onChangeText={setConfirm}
                    returnKeyType="done"
                    onSubmitEditing={handleSignup}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm((prev) => !prev)}
                  >
                    <Ionicons
                      name={showConfirm ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Primary button */}
              <TouchableOpacity
                onPress={handleSignup}
                disabled={loading}
                style={{
                  backgroundColor: loading ? "#1d4ed8aa" : "#2563eb",
                  borderRadius: 999,
                  paddingVertical: 13,
                  alignItems: "center",
                  marginBottom: 16,
                  shadowColor: "#1d4ed8",
                  shadowOpacity: 0.5,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 4,
                }}
              >
                <Text
                  style={{
                    color: "#eff6ff",
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  {loading ? "Creating account..." : "Sign up"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View
              style={{
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#6b7280", fontSize: 13 }}>
                Already have an account?{" "}
                <Text
                  style={{
                    color: "#93c5fd",
                    fontWeight: "600",
                  }}
                  onPress={() => navigation.navigate("Login")}
                >
                  Sign in
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

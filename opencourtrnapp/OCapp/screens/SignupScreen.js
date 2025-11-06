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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { styles } from "../styles/globalStyles";

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !pw || !confirmPw) {
      alert("Please fill out all fields.");
      return;
    }

    // Villanova email restriction
    if (!trimmedEmail.endsWith("@villanova.edu")) {
      alert("Only valid Villanova email addresses are allowed.");
      return;
    }

    if (pw.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (pw !== confirmPw) {
      alert("Passwords do not match. Please re-enter them.");
      return;
    }

    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, trimmedEmail, pw);
      alert("Account created successfully!");
      navigation.replace("MainTabs");
    } catch (error) {
      console.log("Signup error:", error);
      alert(error.message || "Something went wrong creating your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f3f6fb" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      // you can bump this up a bit (e.g. 60–80) if needed on your device
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.authScreen}>
          {/* Banner / hero (same as Login) */}
          <View style={styles.hero}>
            <View
              style={[
                styles.mapLine,
                { top: 26, transform: [{ rotate: "8deg" }] },
              ]}
            />
            <View
              style={[
                styles.mapLine,
                { top: 74, transform: [{ rotate: "-6deg" }] },
              ]}
            />
            <View
              style={[
                styles.mapLine,
                { top: 122, transform: [{ rotate: "4deg" }] },
              ]}
            />

            {/* logo circle */}
            <View style={styles.logoBadge}>
              <Image
                source={require("../images/OCLogo.png")}
                style={{ width: 76, height: 76 }}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Sign-up card */}
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>Create your OpenCourt account</Text>
            <Text style={styles.authSubtitle}>
              Use your Villanova email to start finding runs and tracking your hoop
              activity.
            </Text>

            {/* Email */}
            <View style={{ marginTop: 16 }}>
              <Text style={styles.authLabel}>Villanova email</Text>
              <TextInput
                style={styles.authInput}
                placeholder="you@villanova.edu"
                placeholderTextColor="#8aa0b6"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.authLabel}>Password</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  style={[styles.authInput, { paddingRight: 44 }]}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#8aa0b6"
                  value={pw}
                  onChangeText={setPw}
                  secureTextEntry={!showPw}
                  returnKeyType="next"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPw((s) => !s)}
                  accessibilityLabel={showPw ? "Hide password" : "Show password"}
                >
                  <Ionicons
                    name={showPw ? "eye-off" : "eye"}
                    size={20}
                    color="#516b86"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.authLabel}>Confirm password</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  style={[styles.authInput, { paddingRight: 44 }]}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#8aa0b6"
                  value={confirmPw}
                  onChangeText={setConfirmPw}
                  secureTextEntry={!showConfirmPw}
                  returnKeyType="done"
                  onSubmitEditing={handleSignup}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPw((s) => !s)}
                  accessibilityLabel={
                    showConfirmPw
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  <Ionicons
                    name={showConfirmPw ? "eye-off" : "eye"}
                    size={20}
                    color="#516b86"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSignup}
              disabled={loading}
            >
              <Ionicons name="person-add-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {loading ? "Creating account..." : "Sign up"}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            {/* Social (placeholder) */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn}>
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Text style={styles.socialText}>Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Footer link back to Login */}
            <Text style={styles.footerText}>
              Already have an account?{" "}
              <Text
                style={styles.linkBrand}
                onPress={() => navigation.navigate("Login")}
              >
                Sign in
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

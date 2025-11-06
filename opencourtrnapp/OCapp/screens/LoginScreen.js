// screens/LoginScreen.js
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
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { styles } from "../styles/globalStyles";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async () => {
    if (!email || !pw) {
      alert("Please enter email and password");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
      navigation.replace("MainTabs");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f3f6fb" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      // tweak this number if you want the screen to lift more/less
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.authScreen}>
          {/* Banner */}
          <View style={styles.hero}>
            {/* decorative map lines */}
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

          {/* Sign-in card */}
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>Welcome to OpenCourt</Text>
            <Text style={styles.authSubtitle}>
              Sign in to find courts and see live activity
            </Text>

            {/* Email */}
            <View style={{ marginTop: 16 }}>
              <Text style={styles.authLabel}>Email</Text>
              <TextInput
                style={styles.authInput}
                placeholder="you@school.edu"
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
                  placeholder="••••••••"
                  placeholderTextColor="#8aa0b6"
                  value={pw}
                  onChangeText={setPw}
                  secureTextEntry={!showPw}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
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

            {/* remember + forgot */}
            <View style={styles.rowBetween}>
              <TouchableOpacity
                style={styles.remember}
                onPress={() => setRememberMe((v) => !v)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => alert("Forgot password flow goes here")}
              >
                <Text style={styles.linkBrand}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* CTA */}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Sign in</Text>
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

            {/* Footer link */}
            <Text style={styles.footerText}>
              New here?{" "}
              <Text
                style={styles.linkBrand}
                onPress={() => navigation.navigate("Signup")}
              >
                Create an account
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

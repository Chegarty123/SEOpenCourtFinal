import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Pressable,
  Image,
} from 'react-native';
import * as Location from "expo-location";
import { NavigationContainer } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import MapView, {Marker} from 'react-native-maps';
import markers from './assets/markers';


import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import { ScrollView } from 'react-native';
import { Alert } from "react-native";

// Firebase imports
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, getDoc, setDoc } from "firebase/firestore";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* ------------------ LOGIN SCREEN ------------------ */
/* ------------------ LOGIN SCREEN ------------------ */
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async () => {
    if (!email || !pw) {
      alert('Please enter email and password');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
      navigation.replace('MainTabs');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <View style={styles.authScreen}>
      {/* Top banner (no chip) */}
      <View style={styles.hero}>
        {/* decorative map lines */}
        <View style={[styles.mapLine, { top: 26, transform: [{ rotate: '8deg'}]}]} />
        <View style={[styles.mapLine, { top: 74, transform: [{ rotate: '-6deg'}]}]} />
        <View style={[styles.mapLine, { top: 122, transform: [{ rotate: '4deg'}]}]} />

        {/* circular logo badge */}
        <View style={styles.logoBadge}>
          <Image
            source={require('./images/OCLogo.png')}
            style={{ width: 76, height: 76 }}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Sign-in card */}
      <View style={styles.authCard}>
        <Text style={styles.authTitle}>Welcome to OpenCourt</Text>
        <Text style={styles.authSubtitle}>Sign in to find courts and see live activity</Text>

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
          <View style={{ position: 'relative' }}>
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
              onPress={() => setShowPw(s => !s)}
              accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
            >
              <Ionicons name={showPw ? 'eye-off' : 'eye'} size={20} color="#516b86" />
            </TouchableOpacity>
          </View>
        </View>

        {/* remember + forgot */}
        <View style={styles.rowBetween}>
          <TouchableOpacity
            style={styles.remember}
            onPress={() => setRememberMe(v => !v)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.rememberText}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => alert('Forgot password flow goes here')}>
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

        {/* Social (stubs) */}
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
          New here?{' '}
          <Text style={styles.linkBrand} onPress={() => navigation.navigate('Signup')}>
            Create an account
          </Text>
        </Text>
      </View>
    </View>
  );
}



/* ------------------ SIGNUP SCREEN ------------------ */
function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert('Account created successfully!');
      navigation.replace('MainTabs');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 chars)"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>
            Already have an account?{' '}
            <Text style={styles.linkHighlight}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ------------------ TAB SCREENS ------------------ */
/* ------------------ HOME SCREEN — mockup version ------------------ */
function HomeScreen({ navigation }) {
  const user = auth.currentUser;
  const firstName = user?.email?.split('@')[0] || 'Player';

  // placeholders
  const courtsNearby = Array.isArray(markers) ? markers.length : 0;
  const playersAround = 16;
  const upcomingGames = 3;

  return (
    <View style={styles.homeWrap}>
      {/* Header / greeting */}
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.homeTitle}>Welcome back,</Text>
          <Text style={styles.homeName}>{firstName}</Text>
        </View>
        <Image
          source={require('./images/OCLogo.png')}
          style={styles.homeLogo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.homeLead}>
        Here’s what’s happening on your campus courts.
      </Text>

      {/* Grid cards (4) */}
      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.tile, styles.tileBlue]}
          onPress={() => navigation.navigate('Map')}
        >
          <Ionicons name="location-outline" size={28} color="#fff" />
          <Text style={styles.tileBig}>{courtsNearby} Courts</Text>
          <Text style={styles.tileSmall}>Nearby</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tile, styles.tileOrange]}
          onPress={() => alert('Players Around (placeholder)')}
        >
          <Ionicons name="people-outline" size={28} color="#fff" />
          <Text style={styles.tileBig}>{playersAround} Players</Text>
          <Text style={styles.tileSmall}>Around</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tile, styles.tileGreen]}
          onPress={() => alert('Upcoming Games (placeholder)')}
        >
          <Ionicons name="calendar-outline" size={28} color="#fff" />
          <Text style={styles.tileBig}>{upcomingGames} Games</Text>
          <Text style={styles.tileSmall}>This Week</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tile, styles.tileYellow]}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="basketball-outline" size={28} color="#fff" />
          <Text style={styles.tileBig}>Practice</Text>
          <Text style={styles.tileSmall}>Drills</Text>
        </TouchableOpacity>
      </View>

      {/* Wide banner */}
      <TouchableOpacity
        style={styles.banner}
        onPress={() => navigation.navigate('Map')}
        activeOpacity={0.9}
      >
        <View style={styles.bannerIcon}>
          <Ionicons name="trophy-outline" size={22} color="#0b2239" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Find the best courts in town</Text>
          <Text style={styles.bannerSub}>Explore player reviews and ratings (placeholder)</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#0b2239" />
      </TouchableOpacity>
    </View>
  );
}



function MapScreen({ navigation }) {
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

      // Watch position updates live
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000, // every 2 seconds
          distanceInterval: 5, // or every 5 meters
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
      <MapView ref={mapRef} style={styles.map} initialRegion={userLocation} mapType="satellite">
      {markers.map((marker, index) => (<Marker
        onPress={() => {mapRef.current?.animateToRegion(marker.coordinates, 1000);}}
        key = {index}
        title = {marker.name}
        coordinate = {marker.coordinates}
      />
      ))}

       <Marker onPress={() => {mapRef.current?.animateToRegion(userLocation, 1000);}}
       coordinate={userLocation}
       title="Your Location"
       pinColor="blue"
       />
    {/* <View style={{ alignItems: "center" }}>
    {/* Avatar image */}
    {/* <Image
      source={{ uri: "https://d1si3tbndbzwz9.cloudfront.net/basketball/player/31932/headshot.png" }}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: "white",
      }}
    /> */}
    {/* Optional little pin "pointer" below */}
    {/* <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 12,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: "blue",
        marginTop: -2,
      }}
    />
  </View> */}
{/* </Marker> */}
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

      <View style = {styles.markerListContainer}>
        <FlatList
          horizontal
          data={markers}
          keyExtractor={(item) => item.name}
          renderItem={({ item: marker}) => (
            <Pressable
              onPress={() => {
                setSelectedCard(marker.name);
                mapRef.current?.animateToRegion(marker.coordinates, 1000);
                Alert.alert(
                  "Navigate to Court?",
                  `Do you want to view the page of ${marker.name}?`,
                    [
                      { text: "No", style: "cancel" },
                      { text: "Yes", onPress: () => navigation.navigate('CourtDetail', {marker})}
                    ]
                );
              }
              }
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

function SettingsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#e74c3c', marginTop: 15 }]}
        onPress={() => navigation.replace('Login')}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

function ProfileScreen() {
  const user = auth.currentUser;
  const [username, setUsername] = useState(user?.email?.split("@")[0] || "");
  const [profilePic, setProfilePic] = useState(null);
  const [position, setPosition] = useState("Point Guard");
  const [memberSince, setMemberSince] = useState("");
  const [gradeLevel, setGradeLevel] = useState("Freshman");
  const [favoriteTeam, setFavoriteTeam] = useState("None");

  const teamLogos = {
    Hawks: require("./images/hawks.png"),      
    Raptors: require("./images/raptors.png"),   
    Nets: require("./images/nets.png"),    
    Heat: require("./images/heat.png"),         
    Sixers: require("./images/sixers.png"),         
    Knicks: require("./images/knicks.png"),     
    Magic: require("./images/magic.webp"),           
    Celtics: require("./images/celtics.png"),
    Bulls: require("./images/bulls.png"),      
    Cavaliers: require("./images/cavs.png"),  
    Pistons: require("./images/pistons.png"),     
    Bucks: require("./images/bucks.png"),         
    Wizards: require("./images/wizards.webp"),          
    Hornets: require("./images/hornets.png"),       
    Pacers: require("./images/pacers.png"),    
    
    Nuggets: require("./images/nuggets.png"),      
    Suns: require("./images/suns.png"),   
    Clippers: require("./images/clippers.png"),    
    Lakers: require("./images/lakers.png"),         
    Trailblazers: require("./images/trailblazers.png"),         
    Thunder: require("./images/thunder.png"),     
    Timberwolves: require("./images/timberwolves.png"),           
    Rockets: require("./images/rockets.png"),
    Pelicans: require("./images/pelicans.png"),      
    Grizzlies: require("./images/grizzlies.png"),  
    Mavericks: require("./images/mavericks.png"),     
    Spurs: require("./images/spurs.png"),         
    Warriors: require("./images/warriors.png"),          
    Jazz: require("./images/jazz.png"),       
    Kings: require("./images/kings.png"),    
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const userDoc = doc(db, "users", user.uid);
      const snapshot = await getDoc(userDoc);

      if (snapshot.exists()) {
        const data = snapshot.data();
        setProfilePic(data.profilePic || null);
        setPosition(data.position || "Point Guard");
        setGradeLevel(data.gradeLevel || "Freshman");
        setFavoriteTeam(data.favoriteTeam || "None");
        setUsername(data.username || user.email.split("@")[0]);
        setMemberSince(data.memberSince || new Date(user.metadata.creationTime).toDateString());
      } else {
        // create default doc if none exists
        await setDoc(userDoc, {
          username,
          profilePic,
          position,
          gradeLevel,
          favoriteTeam,
          memberSince: new Date(user.metadata.creationTime).toDateString(),
        });
      }
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
  if (!user) return;
  const timeout = setTimeout(async () => {
    const userDoc = doc(db, "users", user.uid);
    await setDoc(userDoc, {
      username,
      profilePic,
      position,
      gradeLevel,
      favoriteTeam,
      memberSince: memberSince || new Date(user.metadata.creationTime).toDateString(),
    });
  }, 800); // wait 0.8s after last change
  return () => clearTimeout(timeout);
}, [username, profilePic, position, gradeLevel, favoriteTeam]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>

    <View style={styles.container}>
      {/* Profile Picture */}
      <TouchableOpacity onPress={pickImage}>
        <Image
          source={
            profilePic
              ? { uri: profilePic }
              : require("./images/defaultProfile.png") // fallback image
          }
          style={styles.profileImage}
        />
      </TouchableOpacity>

      {/* Username + member info */}
      <Text style={styles.username}>{username}</Text>
      <Text style={styles.memberSince}>Member since {memberSince}</Text>

      {/* Position Picker */}
      <View style={styles.positionContainer}>
  <Text style={styles.label}>Natural Position:</Text>
  <Text style={styles.positionDisplay}>{position}</Text>

  <View style={styles.tagContainer}>
    {["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"].map((pos) => (
      <TouchableOpacity
        key={pos}
        style={[
          styles.tag,
          position === pos && styles.tagSelected
        ]}
        onPress={() => setPosition(pos)}
      >
        <Text style={[
          styles.tagText,
          position === pos && styles.tagTextSelected
        ]}>
          {pos}
        </Text>
      </TouchableOpacity>
    ))}
  </View>

  <View style={styles.gradeContainer}>
  <Text style={styles.label}>Grade Level:</Text>
  <Text style={styles.gradeDisplay}>{gradeLevel}</Text>

  <View style={styles.tagContainer}>
    {["Freshman", "Sophomore", "Junior", "Senior"].map((grade) => (
      <TouchableOpacity
        key={grade}
        style={[
          styles.tag,
          gradeLevel === grade && styles.tagSelected
        ]}
        onPress={() => setGradeLevel(grade)}
      >
        <Text style={[
          styles.tagText,
          gradeLevel === grade && styles.tagTextSelected
        ]}>
          {grade}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
  <View style={styles.teamContainer}>
  <Text style={styles.label}>Favorite NBA Team:</Text>
  <Text style={styles.teamDisplay}>{favoriteTeam}</Text>

  <View style={styles.tagContainer}>
    {[
      "Lakers", "Warriors", "Celtics", "Bulls", "Heat",
  "Nets", "Knicks", "Sixers", "Suns", "Mavericks",
  "Clippers", "Nuggets", "Timberwolves", "Trailblazers", "Jazz",
  "Thunder", "Spurs", "Rockets", "Grizzlies", "Pelicans",
  "Kings", "Magic", "Pacers", "Pistons", "Cavaliers",
  "Hawks", "Hornets", "Wizards", "Raptors", "Bucks"

    ].map((team) => (
      <TouchableOpacity
        key={team}
        style={[
          styles.tag,
          favoriteTeam === team && styles.tagSelected,
          { alignItems: "center" }
        ]}
        onPress={() => setFavoriteTeam(team)}
      >
        <Image
        source={teamLogos[team]}               
        style={{ width: 18, height: 18, marginBottom: 4 }}
        />
        <Text style={[
          styles.tagText,
          favoriteTeam === team && styles.tagTextSelected
        ]}>
          {team}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>

</View>

</View>


    </View>
    </ScrollView>

  );
}

function CourtDetailScreen({ route, navigation }) {
  const { marker } = route.params || {};
  const [checkedIn, setCheckedIn] = useState(false);

  // pull the logged in firebase user
  const user = auth.currentUser;

  // this will store YOUR profile info from Firestore
  const [myProfile, setMyProfile] = useState({
    id: 'you',
    name: 'you',
    avatar: null,
    note: 'hooping now',
  });

  // placeholder "who's here" (starts WITHOUT you)
  const [playersHere, setPlayersHere] = useState([
    {
      id: '1',
      name: 'alex.m',
      avatar: 'https://i.pravatar.cc/100?img=12',
      note: 'looking for 3v3',
    },
    {
      id: '2',
      name: 'jay23',
      avatar: 'https://i.pravatar.cc/100?img=32',
      note: 'running full court rn',
    },
    {
      id: '3',
      name: 'mia.b',
      avatar: 'https://i.pravatar.cc/100?img=5',
      note: 'here til 6pm',
    },
  ]);

  // local chat state (stub)
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      user: 'jay23',
      text: 'We need one more for 4v4.',
      time: '4:12 PM',
      mine: false,
    },
    {
      id: 'm2',
      user: 'alex.m',
      text: 'I’m walking over now.',
      time: '4:13 PM',
      mine: true,
    },
    {
      id: 'm3',
      user: 'mia.b',
      text: 'Is it packed?',
      time: '4:14 PM',
      mine: false,
    },
  ]);

  const [draftMessage, setDraftMessage] = useState('');

  // Load YOUR profile info from Firestore so we can show it in check-in
  useEffect(() => {
    const loadMyProfile = async () => {
      if (!user) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userDocRef);

        if (snapshot.exists()) {
          const data = snapshot.data();

          setMyProfile({
            id: 'you',
            name: data.username || (user.email ? user.email.split("@")[0] : "you"),
            avatar: data.profilePic
              ? data.profilePic
              : null, // we'll fall back later if null
            note: 'hooping now', // you can later make this editable
          });
        } else {
          // no doc yet: fallback to auth email and a default image
          setMyProfile({
            id: 'you',
            name: user.email ? user.email.split("@")[0] : "you",
            avatar: null,
            note: 'hooping now',
          });
        }
      } catch (err) {
        console.warn("Failed to load profile", err);
        // still give a fallback so UI doesn't break
        setMyProfile({
          id: 'you',
          name: user?.email ? user.email.split("@")[0] : "you",
          avatar: null,
          note: 'hooping now',
        });
      }
    };

    loadMyProfile();
  }, [user]);

  const handleCheckInToggle = () => {
    setCheckedIn((prev) => !prev);

    setPlayersHere((prevPlayers) => {
      const meIndex = prevPlayers.findIndex((p) => p.id === 'you');

      // If we're checking IN
      if (!checkedIn) {
        if (meIndex === -1) {
          // Build my player card using myProfile
          const myPlayerCard = {
            id: 'you',
            name: myProfile.name || 'you',
            avatar: myProfile.avatar
              ? myProfile.avatar
              : 'https://i.pravatar.cc/100?img=68', // fallback avatar if none picked
            note: myProfile.note || 'hooping now',
          };

          // put "you" at the front
          return [myPlayerCard, ...prevPlayers];
        }
        return prevPlayers;
      }

      // If we're checking OUT
      if (checkedIn) {
        if (meIndex !== -1) {
          const copy = [...prevPlayers];
          copy.splice(meIndex, 1);
          return copy;
        }
        return prevPlayers;
      }

      return prevPlayers;
    });
  };

  const handleSend = () => {
    if (!draftMessage.trim()) return;

    const newMsg = {
      id: `m${Date.now()}`,
      user: myProfile.name || 'you',
      text: draftMessage.trim(),
      time: 'now',
      mine: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setDraftMessage('');
  };

  return (
    <View style={styles.courtScreenWrap}>
      {/* === TOP HERO / HEADER === */}
      <View style={styles.courtHeroContainer}>
        <Image
          source={{ uri: marker?.image }}
          style={styles.courtHeroImage}
          resizeMode="cover"
        />

        {/* dark overlay */}
        <View style={styles.courtHeroOverlay} />

        {/* top row: back button */}
        <View style={styles.courtHeroTopRow}>
          <TouchableOpacity
            style={styles.courtBackBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={20} color="#0b2239" />
            <Text style={styles.courtBackBtnText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* bottom info */}
        <View style={styles.courtHeroBottom}>
          <Text style={styles.courtName}>{marker?.name || 'Court Name'}</Text>
          <Text style={styles.courtSubText}>
            {marker?.description || 'Outdoor court • Lights • Full court'}
          </Text>

          <View style={styles.courtStatsRow}>
            <View style={styles.courtStatChip}>
              <Ionicons name="people-outline" size={16} color="#0b2239" />
              <Text style={styles.courtStatText}>
                {playersHere.length} here now
              </Text>
            </View>

            <View style={styles.courtStatChip}>
              <Ionicons name="star" size={16} color="#0b2239" />
              <Text style={styles.courtStatText}>4.6 rating</Text>
            </View>
          </View>
        </View>
      </View>

      {/* === CONTENT SCROLL === */}
      <ScrollView
        style={styles.courtContentScroll}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Check-in / who’s here card */}
        <View style={styles.courtCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderText}>Who's on this court</Text>
            <View style={styles.cardHeaderRight}>
              <Ionicons
                name="radio-button-on-outline"
                size={14}
                color={checkedIn ? '#10b981' : '#64748b'}
              />
              <Text
                style={[
                  styles.cardHeaderPresence,
                  { color: checkedIn ? '#10b981' : '#64748b' },
                ]}
              >
                {checkedIn ? 'You are checked in' : 'You are not checked in'}
              </Text>
            </View>
          </View>

          {/* avatar row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.playersRow}
          >
            {playersHere.map((p) => (
              <View key={p.id} style={styles.playerBubble}>
                <Image
                  source={{ uri: p.avatar }}
                  style={styles.playerAvatar}
                />
                <Text style={styles.playerName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.playerNote} numberOfLines={1}>
                  {p.note}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Check-in button */}
          <TouchableOpacity
            style={[
              styles.checkInBtn,
              checkedIn ? styles.checkOutBtn : null,
            ]}
            onPress={handleCheckInToggle}
            activeOpacity={0.9}
          >
            <Ionicons
              name={checkedIn ? 'log-out-outline' : 'log-in-outline'}
              size={18}
              color="#fff"
            />
            <Text style={styles.checkInBtnText}>
              {checkedIn ? 'Check Out' : 'Check In'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chat card */}
        <View style={styles.courtCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderText}>Court Chat</Text>
            <Text style={styles.chatHintText}>
              Use this to set up games or ask if it’s active.
            </Text>
          </View>

          {/* messages */}
          <View style={styles.chatMessagesWrap}>
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.chatBubble,
                  m.mine ? styles.chatBubbleMine : styles.chatBubbleOther,
                ]}
              >
                {!m.mine && (
                  <Text style={styles.chatUserOther}>{m.user}</Text>
                )}
                {m.mine && (
                  <Text style={styles.chatUserMine}>You</Text>
                )}

                <Text
                  style={[
                    styles.chatText,
                    m.mine && { color: '#fff' },
                  ]}
                >
                  {m.text}
                </Text>
                <Text
                  style={[
                    styles.chatTime,
                    m.mine && { color: '#cbd5e1' },
                  ]}
                >
                  {m.time}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* fixed bottom input bar */}
      <View style={styles.chatInputBar}>
        <TextInput
          style={styles.chatInput}
          placeholder="Message this court..."
          placeholderTextColor="#8aa0b6"
          value={draftMessage}
          onChangeText={setDraftMessage}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleSend}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}




/* ------------------ BOTTOM TABS ------------------ */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitle: route.name,
        tabBarStyle: { backgroundColor: '#fff', height: 60 },
        tabBarActiveTintColor: '#4e73df',
        tabBarInactiveTintColor: '#888',
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'Map') {
            iconName = 'map-outline';
          }  else if (route.name === 'Profile') {
            iconName = 'person-outline';
          }
          else if (route.name === 'Settings') {
            iconName = 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

/* ------------------ MAIN APP ------------------ */
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="MapScreen"
        component={MapScreen}
        />
        <Stack.Screen
          name="CourtDetail"
          component={CourtDetailScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* ------------------ STYLES ------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
    marginTop: 25,
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#4e73df',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  linkText: {
    textAlign: 'center',
    color: '#555',
    fontSize: 14,
  },
  linkHighlight: {
    color: '#4e73df',
    fontWeight: '600',
  },
  map: {
    width: '100%', height: '100%',
    paddingBottom: 230
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
  maxWidth: 140, 
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
  flexWrap: "wrap", 
},
profileImage: {
  width: 100,
  height: 100,
  borderRadius: 50,
  marginBottom: 20,
  borderWidth: 2,
  borderColor: '#4e73df',
},

username: {
  fontSize: 24,
  fontWeight: '700',
  color: '#333',
  marginBottom: 8,
},

memberSince: {
  fontSize: 16,
  color: '#666',
  marginBottom: 20,
},
positionContainer: {
  width: '100%',
  maxWidth: 400,
  marginTop: 20,
  padding: 15,
  backgroundColor: '#fff',
  borderRadius: 12,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 6,
  elevation: 4,
},

label: {
  fontSize: 18,
  fontWeight: '600',
  color: '#4e73df',
  marginBottom: 10,
},
positionContainer: {
  width: '100%',
  maxWidth: 400,
  marginTop: 20,
  padding: 15,
  backgroundColor: '#fff',
  borderRadius: 12,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 6,
  elevation: 4,
},

label: {
  fontSize: 18,
  fontWeight: '600',
  color: '#4e73df',
  marginBottom: 10,
},
tagContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  marginTop: 10,
},

tag: {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 20,
  backgroundColor: '#e0e0e0',
  margin: 6,
},

tagSelected: {
  backgroundColor: '#4e73df',
},

tagText: {
  fontSize: 14,
  color: '#333',
},

tagTextSelected: {
  color: '#fff',
  fontWeight: '600',
},

  /* ===== Auth / Sign-in ===== */
  authScreen: {
    flex: 1,
    backgroundColor: '#f3f6fb',
    alignItems: 'center',
  },
  hero: {
    width: '100%',
    height: 170,
    backgroundColor: '#38bdf8', // sky
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  mapLine: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 8,
  },
  heroChip: {
    position: 'absolute',
    left: 16,
    top: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroChipText: { color: '#0e3a5f', fontWeight: '600' },
  logoBadge: {
    position: 'absolute',
    bottom: -38,
    left: '50%',
    marginLeft: -48,
    width: 96,
    height: 96,
    backgroundColor: '#fff',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  authCard: {
    width: '88%',
    maxWidth: 420,
    marginTop: 60,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0b2239',
    textAlign: 'center',
  },
  authSubtitle: {
    marginTop: 6,
    color: '#5b718a',
    textAlign: 'center',
  },
  authLabel: { color: '#214562', fontWeight: '600', marginBottom: 6 },
  authInput: {
    borderWidth: 1,
    borderColor: '#d6e2ee',
    backgroundColor: '#f7fbff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0b2239',
  },
  eyeBtn: { position: 'absolute', right: 10, top: 10, padding: 6 },
  rowBetween: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  remember: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 1, borderColor: '#aac1d6',
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: { backgroundColor: '#4e73df' },
  rememberText: { color: '#5b718a' },
  linkBrand: { color: '#1f6fb2', fontWeight: '600' },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#1f6fb2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  divider: { flex: 1, height: 1, backgroundColor: '#e4edf5' },
  dividerText: { color: '#8aa0b6', fontSize: 12 },
  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: {
    flex: 1, borderWidth: 1, borderColor: '#d6e2ee',
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  socialText: { fontWeight: '600', color: '#0b2239' },
  footerText: { marginTop: 14, textAlign: 'center', color: '#5b718a' },


    /* ===== HOME (mockup) ===== */
  homeWrap: {
    flex: 1,
    backgroundColor: '#eef3f9',
    paddingHorizontal: 20,
    paddingTop: 56,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeTitle: { fontSize: 18, color: '#475569' },
  homeName:  { fontSize: 32, fontWeight: '800', color: '#0f172a' },
  homeLogo:  { width: 64, height: 64 },

  homeLead: { color: '#64748b', fontSize: 14, marginTop: 10, marginBottom: 22 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '47%',
    height: 130,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tileBlue:   { backgroundColor: '#4e73df' },
  tileOrange: { backgroundColor: '#f97316' },
  tileGreen:  { backgroundColor: '#10b981' },
  tileYellow: { backgroundColor: '#eab308' },

  tileBig:   { color: '#fff', fontSize: 18, fontWeight: '800' },
  tileSmall: { color: '#f8fafc', fontSize: 12 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#e6f1fb',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  bannerIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { color: '#0b2239', fontWeight: '800' },
  bannerSub:   { color: '#43607a', fontSize: 12, marginTop: 2 },

  header: {
  position: "absolute",
  top: 40, // adjust for status bar
  alignSelf: "center",
  fontSize: 20,
  fontWeight: "bold",
  color: "black",
  backgroundColor: "rgba(255, 255, 255, 0.8)", // slightly see-through
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 10,
  zIndex: 10,
},

locationButton: {
  position: "absolute",
  top: 65, // below header
  alignSelf: "center",
  backgroundColor: "white",
  paddingVertical: 5,
  paddingHorizontal: 10,
  borderRadius: 25,
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 4,
  elevation: 5,
  zIndex: 10,
},

locationButtonText: {
  color: "blue",
  fontWeight: "bold",
},

  /* ===== COURT DETAIL SCREEN ===== */
  courtScreenWrap: {
    flex: 1,
    backgroundColor: '#f3f6fb',
  },

  /* HERO / HEADER */
  courtHeroContainer: {
    width: '100%',
    height: 220,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000', // fallback
  },
  courtHeroImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  courtHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  courtHeroTopRow: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  courtBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  courtBackBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b2239',
    marginLeft: 4,
  },

  courtHeroBottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  courtName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  courtSubText: {
    color: '#dbeafe',
    fontSize: 13,
    marginTop: 4,
  },
  courtStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  courtStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  courtStatText: {
    color: '#0b2239',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },

  /* MAIN CONTENT */
  courtContentScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  courtCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  cardHeaderRow: {
    flexDirection: 'column',
    marginBottom: 12,
  },
  cardHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0b2239',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  cardHeaderPresence: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* PLAYERS / CHECK-IN */
  playersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  playerBubble: {
    width: 90,
    marginRight: 12,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#4e73df',
    marginBottom: 6,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0b2239',
    maxWidth: '100%',
  },
  playerNote: {
    fontSize: 11,
    color: '#64748b',
    maxWidth: '100%',
    textAlign: 'center',
  },

  checkInBtn: {
    marginTop: 14,
    backgroundColor: '#1f6fb2', // same vibe as primaryBtn
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  checkOutBtn: {
    backgroundColor: '#ef4444', // red if checked in
  },
  checkInBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },

  /* CHAT */
  chatHintText: {
    marginTop: 4,
    color: '#5b718a',
    fontSize: 12,
    fontWeight: '400',
  },

  chatMessagesWrap: {
    backgroundColor: '#f7fbff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d6e2ee',
    padding: 12,
    maxHeight: 260, // keeps it from taking entire screen
  },

  chatBubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  chatBubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#1f6fb2',
  },
  chatBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#e2e8f0',
  },
  chatUserMine: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  chatUserOther: {
    color: '#0b2239',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  chatText: {
    color: '#0b2239',
    fontSize: 14,
    lineHeight: 18,
  },
  chatTime: {
    fontSize: 10,
    marginTop: 4,
    color: '#475569',
  },

  /* override text color for your own bubble */
  // We'll tweak chatText + chatTime color when it's "mine"
  // using inline styles instead of extra styles, so no need
  // for separate style keys here.

  /* CHAT INPUT BAR (fixed at bottom) */
  chatInputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#d6e2ee',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d6e2ee',
    backgroundColor: '#f7fbff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0b2239',
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: '#1f6fb2',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },


});
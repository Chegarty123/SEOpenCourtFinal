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
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import MapView, {Marker} from 'react-native-maps';
import markers from './assets/markers';

import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import { ScrollView } from 'react-native';

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
function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      alert('Please enter email and password');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, username, password);
      navigation.replace('MainTabs');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>OpenCourt</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.linkText}>
            Don’t have an account?{' '}
            <Text style={styles.linkHighlight}>Sign up</Text>
          </Text>
        </TouchableOpacity>
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
function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to OpenCourt</Text>
      <Image source={require("./images/OCLogo.png")} style = {{width: 350, height: 350, alignSelf: "center"}} resizeMode="contain"/>
    </View>
  );
}

function MapScreen() {
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
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      );

      return () => subscription.remove();
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Basketball Courts Nearby</Text>
      <MapView ref={mapRef} style={styles.map} initialRegion={markers[0].coordinates} mapType="satellite">
      {markers.map((marker, index) => (<Marker
        key = {index}
        title = {marker.name}
        coordinate = {marker.coordinates}
      />
      ))}

       <Marker coordinate={userLocation} title="You are here">
  <View style={{ alignItems: "center" }}>
    {/* Avatar image */}
    <Image
      source={{ uri: "https://d1si3tbndbzwz9.cloudfront.net/basketball/player/31932/headshot.png" }}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: "white",
      }}
    />
    {/* Optional little pin "pointer" below */}
    <View
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
  </View>
</Marker>
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
          } else if (route.name === 'Settings') {
            iconName = 'settings-outline';
          } else if (route.name === 'Profile') {
            iconName = 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
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
    width: '100%', height: '100%'
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


});
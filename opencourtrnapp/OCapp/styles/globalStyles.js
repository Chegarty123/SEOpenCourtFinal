import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  /* ======================== Generic / shared ======================== */
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

  /* ======================== Map screen ======================== */
  map: {
    width: '100%',
    height: '100%',
    paddingBottom: 230,
  },
  markerListContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
  markerButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    minWidth: 220,
  },
  activateMarkerButton: {
    backgroundColor: '#007AFF', // active card color
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    minWidth: 220,
  },
  markerImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  markerInfo: {
    flex: 1,
    flexShrink: 1,
    maxWidth: 140,
  },
  markerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  markerDescription: {
    fontSize: 13,
    color: '#666',
    flexWrap: 'wrap',
  },

  header: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    zIndex: 10,
  },

  locationButton: {
    position: 'absolute',
    top: 65,
    alignSelf: 'center',
    backgroundColor: 'white',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  locationButtonText: {
    color: 'blue',
    fontWeight: 'bold',
  },

  /* ======================== Profile screen ======================== */
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
  positionDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b2239',
  },

  gradeContainer: {
    marginTop: 20,
  },
  gradeDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b2239',
  },

  teamContainer: {
    marginTop: 20,
  },
  teamDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b2239',
    marginBottom: 10,
    textAlign: 'center',
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
    alignItems: 'center',
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

  scrollContainer: {
    paddingBottom: 40,
  },

  /* ======================== Auth / Sign-in ======================== */
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
  rowBetween: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remember: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#aac1d6',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  divider: { flex: 1, height: 1, backgroundColor: '#e4edf5' },
  dividerText: { color: '#8aa0b6', fontSize: 12 },
  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d6e2ee',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  socialText: { fontWeight: '600', color: '#0b2239' },
  footerText: { marginTop: 14, textAlign: 'center', color: '#5b718a' },

  /* ======================== Home screen ======================== */
  homeWrap: {
    flex: 1,
    backgroundColor: '#eef3f9',
    paddingHorizontal: 20,
    paddingTop: 70,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeTitle: { fontSize: 18, color: '#475569' },
  homeName: { fontSize: 32, fontWeight: '800', color: '#0f172a' },
  homeLogo: { width: 64, height: 64 },
  homeLead: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
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
  tileBlue: { backgroundColor: '#4e73df' },
  tileOrange: { backgroundColor: '#f97316' },
  tileGreen: { backgroundColor: '#10b981' },
  tileYellow: { backgroundColor: '#eab308' },
  tileBig: { color: '#fff', fontSize: 18, fontWeight: '800' },
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { color: '#0b2239', fontWeight: '800' },
  bannerSub: { color: '#43607a', fontSize: 12, marginTop: 2 },

  /* ======================== Court Detail screen ======================== */
  courtScreenWrap: {
    flex: 1,
    backgroundColor: '#f3f6fb',
  },
  courtHeroContainer: {
    width: '100%',
    height: 220,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
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
    backgroundColor: '#1f6fb2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  checkOutBtn: {
    backgroundColor: '#ef4444',
  },
  checkInBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },

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
    maxHeight: 260,
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
  chatMessagesOuter: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 12,
    maxHeight: 260, // controls how tall the chat window is
  },
  
  chatScroll: {
    flexGrow: 0,
  },
  
  chatScrollContent: {
    paddingBottom: 8,
    rowGap: 12, // if RN yells about rowGap, swap to gap or manual marginBottom
  },
  
  chatBubble: {
    maxWidth: "75%",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  
  chatBubbleMine: {
    backgroundColor: "#1e5fa9",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  
  chatBubbleOther: {
    backgroundColor: "#e2e8f0",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  
  chatUserMine: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  
  chatUserOther: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0b2239",
    marginBottom: 4,
  },
  
  chatText: {
    fontSize: 16,
    lineHeight: 20,
    color: "#0b2239",
    fontWeight: "500",
  },
  
  chatTime: {
    fontSize: 13,
    lineHeight: 16,
    color: "#475569",
    marginTop: 6,
  }, 
  
  chatMessagesOuter: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 12,
    maxHeight: 220, // slightly smaller to fit more on screen
  },
  
  chatScroll: {
    flexGrow: 0,
  },
  
  chatScrollContent: {
    paddingBottom: 8,
    rowGap: 8, // tighter gap between messages
  },
  
  chatBubble: {
    maxWidth: "75%",
    borderRadius: 14,
    paddingVertical: 6,   // tighter vertical padding
    paddingHorizontal: 10, // tighter horizontal padding
  },
  
  chatBubbleMine: {
    backgroundColor: "#1e5fa9",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  
  chatBubbleOther: {
    backgroundColor: "#e2e8f0",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  
  chatUserMine: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  
  chatUserOther: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0b2239",
    marginBottom: 2,
  },
  
  chatText: {
    fontSize: 14,
    lineHeight: 18,
    color: "#0b2239",
    fontWeight: "500",
  },
  
  chatTime: {
    fontSize: 11,
    lineHeight: 14,
    color: "#475569",
    marginTop: 4,
  },
  
});

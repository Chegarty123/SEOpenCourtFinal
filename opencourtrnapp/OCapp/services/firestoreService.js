// services/firestoreService.js
// Centralized Firestore operations service

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

// ========================================
// USER PROFILE OPERATIONS
// ========================================

/**
 * Get a user's profile by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User profile data or null
 */
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

/**
 * Update a user's profile
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/**
 * Create or update a user's profile
 * @param {string} userId - User ID
 * @param {Object} profileData - Profile data
 * @returns {Promise<void>}
 */
export const setUserProfile = async (userId, profileData) => {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      {
        ...profileData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error setting user profile:", error);
    throw error;
  }
};

// ========================================
// COURT OPERATIONS
// ========================================

/**
 * Get a court by ID
 * @param {string} courtId - Court ID
 * @returns {Promise<Object|null>} Court data or null
 */
export const getCourt = async (courtId) => {
  try {
    const courtRef = doc(db, "courts", courtId);
    const snap = await getDoc(courtRef);

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching court:", error);
    throw error;
  }
};

/**
 * Update a court
 * @param {string} courtId - Court ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateCourt = async (courtId, updates) => {
  try {
    const courtRef = doc(db, "courts", courtId);
    await updateDoc(courtRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating court:", error);
    throw error;
  }
};

// ========================================
// MESSAGE OPERATIONS
// ========================================

/**
 * Send a message to a conversation
 * @param {string} conversationId - Conversation ID
 * @param {Object} messageData - Message data
 * @param {string} conversationType - 'dm' or 'court'
 * @returns {Promise<string>} New message ID
 */
export const sendMessage = async (
  conversationId,
  messageData,
  conversationType = "dm"
) => {
  try {
    const collectionPath =
      conversationType === "dm"
        ? `dmConversations/${conversationId}/messages`
        : `courts/${conversationId}/messages`;

    const msgsRef = collection(db, ...collectionPath.split("/"));

    const messageObj = {
      ...messageData,
      ts: serverTimestamp(),
      reactions: {},
    };

    const docRef = await addDoc(msgsRef, messageObj);
    return docRef.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

/**
 * Delete a message
 * @param {string} conversationId - Conversation ID
 * @param {string} messageId - Message ID
 * @param {string} conversationType - 'dm' or 'court'
 * @returns {Promise<void>}
 */
export const deleteMessage = async (
  conversationId,
  messageId,
  conversationType = "dm"
) => {
  try {
    const collectionPath =
      conversationType === "dm"
        ? `dmConversations/${conversationId}/messages`
        : `courts/${conversationId}/messages`;

    const msgRef = doc(db, ...collectionPath.split("/"), messageId);
    await deleteDoc(msgRef);
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

/**
 * Toggle a reaction on a message
 * @param {string} conversationId - Conversation ID
 * @param {string} messageId - Message ID
 * @param {string} emoji - Emoji to toggle
 * @param {string} userId - User ID
 * @param {string} conversationType - 'dm' or 'court'
 * @returns {Promise<void>}
 */
export const toggleMessageReaction = async (
  conversationId,
  messageId,
  emoji,
  userId,
  conversationType = "dm"
) => {
  try {
    const collectionPath =
      conversationType === "dm"
        ? `dmConversations/${conversationId}/messages`
        : `courts/${conversationId}/messages`;

    const msgRef = doc(db, ...collectionPath.split("/"), messageId);
    const snap = await getDoc(msgRef);

    if (!snap.exists()) {
      throw new Error("Message not found");
    }

    const data = snap.data();
    const reactions = data.reactions || {};
    const currentUsers = reactions[emoji] || [];

    const updatedUsers = currentUsers.includes(userId)
      ? currentUsers.filter((u) => u !== userId)
      : [...currentUsers, userId];

    const updatedReactions = {
      ...reactions,
      [emoji]: updatedUsers,
    };

    await updateDoc(msgRef, { reactions: updatedReactions });
  } catch (error) {
    console.error("Error toggling reaction:", error);
    throw error;
  }
};

// ========================================
// TYPING INDICATOR OPERATIONS
// ========================================

/**
 * Set typing status for a user in a conversation
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @param {string} username - Username
 * @param {boolean} isTyping - Whether user is typing
 * @param {string} conversationType - 'dm' or 'court'
 * @returns {Promise<void>}
 */
export const setTypingStatus = async (
  conversationId,
  userId,
  username,
  isTyping,
  conversationType = "dm"
) => {
  try {
    const collectionPath =
      conversationType === "dm"
        ? `dmConversations/${conversationId}/typing`
        : `courts/${conversationId}/typing`;

    const typingDoc = doc(db, ...collectionPath.split("/"), userId);

    await setDoc(
      typingDoc,
      {
        userId,
        username,
        isTyping,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating typing status:", error);
    throw error;
  }
};

// ========================================
// DM CONVERSATION OPERATIONS
// ========================================

/**
 * Update DM conversation metadata (last message, read status, etc.)
 * @param {string} conversationId - Conversation ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateConversationMeta = async (conversationId, updates) => {
  try {
    const convRef = doc(db, "dmConversations", conversationId);
    await updateDoc(convRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating conversation meta:", error);
    throw error;
  }
};

/**
 * Mark conversation as read for a user
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const markConversationRead = async (conversationId, userId) => {
  try {
    const convRef = doc(db, "dmConversations", conversationId);
    const field = `readBy.${userId}`;
    await updateDoc(convRef, { [field]: serverTimestamp() });
  } catch (error) {
    console.error("Error marking conversation read:", error);
    throw error;
  }
};

// ========================================
// BATCH OPERATIONS
// ========================================

/**
 * Get multiple user profiles at once
 * @param {string[]} userIds - Array of user IDs
 * @returns {Promise<Object>} Object mapping userId to profile data
 */
export const getBatchUserProfiles = async (userIds) => {
  try {
    const uniqueIds = [...new Set(userIds)]; // Remove duplicates
    const profiles = {};

    await Promise.all(
      uniqueIds.map(async (uid) => {
        try {
          const profile = await getUserProfile(uid);
          if (profile) {
            profiles[uid] = profile;
          }
        } catch (err) {
          console.warn(`Failed to fetch profile for ${uid}:`, err);
          profiles[uid] = null;
        }
      })
    );

    return profiles;
  } catch (error) {
    console.error("Error fetching batch user profiles:", error);
    throw error;
  }
};

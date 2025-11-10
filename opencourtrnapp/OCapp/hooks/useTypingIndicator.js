// hooks/useTypingIndicator.js
// Custom hook for managing typing indicators

import { useState, useEffect, useCallback } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { setTypingStatus as setTypingStatusService } from "../services/firestoreService";

/**
 * Custom hook for managing typing indicators
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - Current user ID
 * @param {string} username - Current username
 * @param {string} conversationType - 'dm' or 'court'
 * @returns {Object} { typingUsers, typingLabel, setTypingStatus }
 */
export const useTypingIndicator = (
  conversationId,
  userId,
  username,
  conversationType = "dm"
) => {
  const [typingUsers, setTypingUsers] = useState([]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!conversationId || !userId) return;

    const collectionPath =
      conversationType === "dm"
        ? `dmConversations/${conversationId}/typing`
        : `courts/${conversationId}/typing`;

    const typingRef = collection(db, ...collectionPath.split("/"));
    const qTyping = query(typingRef);

    const unsubscribe = onSnapshot(qTyping, (snapshot) => {
      const currentTyping = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const typingUserId = data.userId || doc.id;

        // Only include other users who are typing
        if (typingUserId !== userId && data.isTyping) {
          const name = data.username || data.email?.split("@")[0] || "Someone";
          currentTyping.push(name);
        }
      });

      setTypingUsers(currentTyping);
    });

    return () => unsubscribe();
  }, [conversationId, userId, conversationType]);

  // Memoized function to update typing status
  const setTypingStatus = useCallback(
    async (isTyping) => {
      if (!conversationId || !userId || !username) return;

      try {
        await setTypingStatusService(
          conversationId,
          userId,
          username,
          isTyping,
          conversationType
        );
      } catch (error) {
        console.error("Error setting typing status:", error);
      }
    },
    [conversationId, userId, username, conversationType]
  );

  // Generate typing label text
  let typingLabel = "";
  if (typingUsers.length === 1) {
    typingLabel = `${typingUsers[0]} is typing...`;
  } else if (typingUsers.length === 2) {
    typingLabel = `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
  } else if (typingUsers.length > 2) {
    typingLabel = `${typingUsers[0]} and ${
      typingUsers.length - 1
    } others are typing...`;
  }

  return {
    typingUsers,
    typingLabel,
    setTypingStatus,
  };
};

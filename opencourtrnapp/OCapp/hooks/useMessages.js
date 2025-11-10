// hooks/useMessages.js
// Custom hook for listening to messages in a conversation

import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Custom hook for listening to messages in real-time
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - Current user ID
 * @param {string} conversationType - 'dm' or 'court'
 * @returns {Object} { messages, loading, error }
 */
export const useMessages = (conversationId, userId, conversationType = "dm") => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!conversationId || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const collectionPath =
        conversationType === "dm"
          ? `dmConversations/${conversationId}/messages`
          : `courts/${conversationId}/messages`;

      const msgsRef = collection(db, ...collectionPath.split("/"));
      const qMsgs = query(msgsRef, orderBy("ts", "asc"));

      const unsubscribe = onSnapshot(
        qMsgs,
        (snapshot) => {
          const messagesList = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            messagesList.push({
              id: doc.id,
              text: data.text || "",
              ts: data.ts || data.createdAt || null,
              userId: data.userId,
              user: data.username || data.user || "Player",
              type: data.type || "text",
              gifUrl: data.gifUrl || null,
              reactions: data.reactions || {},
              mine: data.userId === userId,
              replyTo: data.replyTo || null,
            });
          });

          setMessages(messagesList);
          setLoading(false);
        },
        (err) => {
          console.error("Error listening to messages:", err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up messages listener:", err);
      setError(err);
      setLoading(false);
    }
  }, [conversationId, userId, conversationType]);

  return { messages, loading, error };
};

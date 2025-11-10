// hooks/useFirestoreListener.js
// Custom hook for managing Firestore real-time listeners

import { useState, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";

/**
 * Custom hook for listening to a Firestore query in real-time
 * Automatically manages subscription and cleanup
 *
 * @param {Query|DocumentReference|null} queryOrRef - Firestore query or document reference
 * @param {Function} transformData - Function to transform the snapshot data
 * @param {Array} dependencies - Additional dependencies to trigger re-subscription
 * @returns {Object} { data, loading, error }
 */
export const useFirestoreListener = (queryOrRef, transformData, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!queryOrRef) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      queryOrRef,
      (snapshot) => {
        try {
          const transformedData = transformData(snapshot);
          setData(transformedData);
          setLoading(false);
        } catch (err) {
          console.error("Error transforming Firestore data:", err);
          setError(err);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Firestore listener error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [queryOrRef, ...dependencies]);

  return { data, loading, error };
};

/**
 * Transform a collection snapshot to an array of documents
 * @param {QuerySnapshot} snapshot - Firestore query snapshot
 * @returns {Array} Array of documents with id and data
 */
export const transformCollection = (snapshot) => {
  const result = [];
  snapshot.forEach((doc) => {
    result.push({
      id: doc.id,
      ...doc.data(),
    });
  });
  return result;
};

/**
 * Transform a document snapshot to an object
 * @param {DocumentSnapshot} snapshot - Firestore document snapshot
 * @returns {Object|null} Document data with id, or null if doesn't exist
 */
export const transformDocument = (snapshot) => {
  if (!snapshot.exists()) {
    return null;
  }
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
};

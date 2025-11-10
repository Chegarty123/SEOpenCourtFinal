// utils/dateUtils.js
// Centralized date and time formatting utilities

/**
 * Format a Firestore timestamp to time string (e.g., "4:33 PM")
 * @param {Object} timestamp - Firestore timestamp object
 * @returns {string} Formatted time string
 */
export const formatTime = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "now";
  }

  const dateObj = timestamp.toDate();
  const hours = dateObj.getHours();
  const mins = dateObj.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const hh = hours % 12 === 0 ? 12 : hours % 12;
  const mm = mins < 10 ? `0${mins}` : mins;

  return `${hh}:${mm} ${ampm}`;
};

/**
 * Check if two dates are on the same day
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if dates are on the same day
 */
export const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Format a Firestore timestamp to a date label (e.g., "Today", "Yesterday", "Jan 15, 2024")
 * @param {Object} timestamp - Firestore timestamp object
 * @returns {string} Formatted date label
 */
export const formatDateLabel = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "";
  }

  const date = timestamp.toDate();
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) {
    return "Today";
  }

  if (isSameDay(date, yesterday)) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Format a timestamp to a relative time string (e.g., "2 minutes ago")
 * @param {Object} timestamp - Firestore timestamp object
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "just now";
  }

  const now = new Date();
  const date = timestamp.toDate();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } else {
    return formatDateLabel(timestamp);
  }
};

/**
 * Get a unique date key for grouping messages by day
 * @param {Object} timestamp - Firestore timestamp object
 * @returns {string} Date key in format "YYYY-M-D"
 */
export const getDateKey = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "";
  }

  const date = timestamp.toDate();
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

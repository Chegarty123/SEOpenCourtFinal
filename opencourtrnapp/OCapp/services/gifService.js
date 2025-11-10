// services/gifService.js
// Centralized GIF service for Tenor API integration

const TENOR_API_KEY = "AIzaSyDYgE5Z7qvK2PDPY8sg1GiqGcC_AVxFdho";
const TENOR_BASE_URL = "https://tenor.googleapis.com/v2";
const CLIENT_KEY = "OpenCourt";

export const REACTION_EMOJIS = ["👍", "🔥", "😂", "💪", "❤️"];

/**
 * Search for GIFs using Tenor API
 * @param {string} searchQuery - The search term
 * @param {number} limit - Maximum number of results (default: 25)
 * @returns {Promise<Array>} Array of GIF objects with id and url
 */
export const searchGifs = async (searchQuery, limit = 25) => {
  if (!searchQuery || !searchQuery.trim()) {
    return [];
  }

  try {
    const queryStr = encodeURIComponent(searchQuery.trim());
    const url = `${TENOR_BASE_URL}/search?q=${queryStr}&key=${TENOR_API_KEY}&client_key=${CLIENT_KEY}&limit=${limit}`;

    const response = await fetch(url);
    const json = await response.json();

    const results = (json.results || []).map((result) => {
      const media = result.media_formats?.tinygif || result.media_formats?.gif;
      return {
        id: result.id,
        url: media?.url,
      };
    });

    return results.filter((gif) => !!gif.url);
  } catch (error) {
    console.log("Error fetching GIFs from Tenor:", error);
    return [];
  }
};

/**
 * Get trending GIFs
 * @param {number} limit - Maximum number of results (default: 25)
 * @returns {Promise<Array>} Array of trending GIF objects
 */
export const getTrendingGifs = async (limit = 25) => {
  try {
    const url = `${TENOR_BASE_URL}/trending?key=${TENOR_API_KEY}&client_key=${CLIENT_KEY}&limit=${limit}`;

    const response = await fetch(url);
    const json = await response.json();

    const results = (json.results || []).map((result) => {
      const media = result.media_formats?.tinygif || result.media_formats?.gif;
      return {
        id: result.id,
        url: media?.url,
      };
    });

    return results.filter((gif) => !!gif.url);
  } catch (error) {
    console.log("Error fetching trending GIFs:", error);
    return [];
  }
};

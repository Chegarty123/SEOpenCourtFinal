// utils/profileUtils.js
// Centralized profile-related utilities including NBA team logos

/**
 * NBA team logos mapping
 * Maps team names to their respective image assets
 */
export const NBA_TEAM_LOGOS = {
  Hawks: require("../images/hawks.png"),
  Raptors: require("../images/raptors.png"),
  Nets: require("../images/nets.png"),
  Heat: require("../images/heat.png"),
  Sixers: require("../images/sixers.png"),
  Knicks: require("../images/knicks.png"),
  Magic: require("../images/magic.webp"),
  Celtics: require("../images/celtics.png"),
  Bulls: require("../images/bulls.png"),
  Cavaliers: require("../images/cavs.png"),
  Pistons: require("../images/pistons.png"),
  Bucks: require("../images/bucks.png"),
  Wizards: require("../images/wizards.webp"),
  Hornets: require("../images/hornets.png"),
  Pacers: require("../images/pacers.png"),
  Nuggets: require("../images/nuggets.png"),
  Suns: require("../images/suns.png"),
  Clippers: require("../images/clippers.png"),
  Lakers: require("../images/lakers.png"),
  Trailblazers: require("../images/trailblazers.png"),
  Thunder: require("../images/thunder.png"),
  Timberwolves: require("../images/timberwolves.png"),
  Rockets: require("../images/rockets.png"),
  Pelicans: require("../images/pelicans.png"),
  Grizzlies: require("../images/grizzlies.png"),
  Mavericks: require("../images/mavericks.png"),
  Spurs: require("../images/spurs.png"),
  Warriors: require("../images/warriors.png"),
  Jazz: require("../images/jazz.png"),
  Kings: require("../images/kings.png"),
};

/**
 * Get the logo for a specific team
 * @param {string} teamName - The team name
 * @returns {any} The team logo image asset or null
 */
export const getTeamLogo = (teamName) => {
  return NBA_TEAM_LOGOS[teamName] || null;
};

/**
 * Get all team names as an array
 * @returns {string[]} Array of team names
 */
export const getAllTeamNames = () => {
  return Object.keys(NBA_TEAM_LOGOS);
};

/**
 * Check if a team name is valid
 * @param {string} teamName - The team name to check
 * @returns {boolean} True if the team exists
 */
export const isValidTeam = (teamName) => {
  return teamName in NBA_TEAM_LOGOS;
};

/**
 * Extract initials from a username or email
 * @param {string} nameOrEmail - Username or email address
 * @returns {string} Initials (1-2 characters)
 */
export const getInitials = (nameOrEmail) => {
  if (!nameOrEmail) return "?";

  // If it's an email, extract the part before @
  const name = nameOrEmail.includes("@")
    ? nameOrEmail.split("@")[0]
    : nameOrEmail;

  // Split by spaces or special characters
  const parts = name.split(/[\s._-]+/);

  if (parts.length >= 2) {
    // Take first letter of first two parts
    return (parts[0][0] + parts[1][0]).toUpperCase();
  } else {
    // Take first two letters of single part
    return name.substring(0, 2).toUpperCase();
  }
};

/**
 * Format a username from email if needed
 * @param {string} email - Email address
 * @returns {string} Formatted username
 */
export const formatUsernameFromEmail = (email) => {
  if (!email) return "Player";
  return email.includes("@") ? email.split("@")[0] : email;
};

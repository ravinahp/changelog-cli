/**
 * Changelog history operations using JSON files
 */

const { readDB, writeDB } = require('./setup');
const { saveRepository } = require('./repositories');

/**
 * Save a changelog generation event
 * @param {string} repoUrl - The repository URL
 * @param {string} repoName - The repository name
 * @param {string} startDate - Start date of the changelog period
 * @param {string} endDate - End date of the changelog period
 * @param {string} lastCommitHash - The hash of the last commit in the changelog
 */
const saveChangelogGeneration = (repoUrl, repoName, startDate, endDate, lastCommitHash) => {
  // Save repository first
  saveRepository(repoUrl, repoName);
  
  const db = readDB();
  
  // Add new history entry
  db.history.push({
    repoUrl,
    generatedAt: new Date().toISOString(),
    startDate,
    endDate,
    lastCommitHash: lastCommitHash || null
  });
  
  // Sort history by date (newest first)
  db.history.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
  
  writeDB(db);
};

/**
 * Get days since last changelog was generated
 * @param {string} repoUrl - The repository URL
 * @returns {Object|null} Information about last changelog or null if none found
 */
const getDaysSinceLastChangelog = (repoUrl) => {
  const db = readDB();
  
  // Ensure db.history exists
  if (!db || !db.history || !Array.isArray(db.history)) {
    return null;
  }
  
  // Find last changelog entry for this repository
  const lastChangelog = db.history
    .filter(entry => entry.repoUrl === repoUrl)
    .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))[0];
  
  if (!lastChangelog) {
    return null;
  }
  
  // Calculate days since last changelog generation
  const lastDate = new Date(lastChangelog.generatedAt);
  const now = new Date();
  const daysSince = Math.ceil((now - lastDate) / (1000 * 60 * 60 * 24));
  
  return {
    days: daysSince,
    lastDate: lastChangelog.endDate,
    lastCommitHash: lastChangelog.lastCommitHash
  };
};

/**
 * Get changelog history for a repository
 * @param {string} repoUrl - The repository URL
 * @param {number} limit - Maximum number of entries to return
 * @returns {Array} Array of changelog history entries
 */
const getChangelogHistory = (repoUrl, limit = 10) => {
  const db = readDB();
  
  // Ensure db.history exists
  if (!db || !db.history || !Array.isArray(db.history)) {
    return [];
  }
  
  return db.history
    .filter(entry => entry.repoUrl === repoUrl)
    .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))
    .slice(0, limit);
};

module.exports = {
  saveChangelogGeneration,
  getDaysSinceLastChangelog,
  getChangelogHistory
}; 
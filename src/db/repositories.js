/**
 * Repository database operations using JSON files
 */

const { readDB, writeDB } = require('./setup');

/**
 * Add or update a repository in the database
 * @param {string} url - The repository URL
 * @param {string} name - The repository name
 */
const saveRepository = (url, name) => {
  const db = readDB();
  
  // Ensure db.repositories exists
  if (!db.repositories) {
    db.repositories = [];
  }
  
  // Check if repository already exists
  const existingRepoIndex = db.repositories.findIndex(repo => repo.url === url);
  
  if (existingRepoIndex !== -1) {
    // Update timestamp of existing repository
    db.repositories[existingRepoIndex].lastUsed = new Date().toISOString();
  } else {
    // Add new repository
    db.repositories.push({
      url,
      name,
      lastUsed: new Date().toISOString()
    });
  }
  
  // Sort repositories by last used (most recent first)
  db.repositories.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
  
  writeDB(db);
};

/**
 * Get a list of recently used repositories
 * @param {number} limit - Number of repositories to return
 * @returns {Array} Array of repository objects
 */
const getRecentRepositories = (limit = 5) => {
  const db = readDB();
  
  // Ensure db.repositories exists and is an array
  if (!db || !db.repositories || !Array.isArray(db.repositories)) {
    return [];
  }
  
  return db.repositories
    .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
    .slice(0, limit);
};

/**
 * Get a repository by URL
 * @param {string} url - The repository URL
 * @returns {Object|null} Repository object or null if not found
 */
const getRepository = (url) => {
  const db = readDB();
  
  // Ensure db.repositories exists
  if (!db || !db.repositories || !Array.isArray(db.repositories)) {
    return null;
  }
  
  return db.repositories.find(repo => repo.url === url) || null;
};

module.exports = {
  saveRepository,
  getRecentRepositories,
  getRepository
}; 
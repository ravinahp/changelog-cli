/**
 * Database module index
 * Exports all database-related functionality
 */

const setup = require('./setup');
const repositories = require('./repositories');
const history = require('./history');
const commits = require('./commits');

// Initialize database on import
setup.setup();

// Export all db functions
module.exports = {
  // Setup functions
  setup: setup.setup,
  
  // Repository functions
  saveRepository: repositories.saveRepository,
  getRecentRepositories: repositories.getRecentRepositories,
  getRepository: repositories.getRepository,
  
  // History functions
  saveChangelogGeneration: history.saveChangelogGeneration,
  getDaysSinceLastChangelog: history.getDaysSinceLastChangelog,
  getChangelogHistory: history.getChangelogHistory,
  
  // Commits functions
  getNewCommitsSinceLastChangelog: commits.getNewCommitsSinceLastChangelog
}; 
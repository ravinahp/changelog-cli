/**
 * Commit utilities for changelog history
 */

const axios = require('axios');
const { getDaysSinceLastChangelog } = require('./history');

/**
 * Get number of new commits since last changelog
 * @param {string} repoUrl - The repository URL
 * @param {string} githubToken - GitHub token for API access
 * @returns {Promise<Object>} Object with new commits count and last commit hash
 */
const getNewCommitsSinceLastChangelog = async (repoUrl, githubToken) => {
  try {
    const lastChangelog = getDaysSinceLastChangelog(repoUrl);
    
    if (!lastChangelog || !lastChangelog.lastCommitHash) {
      return { 
        newCommits: null, 
        lastCommitHash: null,
        message: 'No previous changelog commit hash found'
      };
    }
    
    // Extract owner and repo name from URL
    const urlParts = repoUrl.replace(/\.git$/, '').split('/');
    const repoOwner = urlParts[urlParts.length - 2];
    const repoName = urlParts[urlParts.length - 1];
    
    // Get commits since the last commit hash
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/commits`;
    const response = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': githubToken ? `token ${githubToken}` : undefined
      }
    });
    
    const commits = response.data;
    
    if (commits.length === 0) {
      return { 
        newCommits: 0, 
        lastCommitHash: lastChangelog.lastCommitHash,
        message: 'No commits found'
      };
    }
    
    // Find index of the last changelog commit
    const lastCommitIndex = commits.findIndex(commit => 
      commit.sha.startsWith(lastChangelog.lastCommitHash));
    
    if (lastCommitIndex === -1) {
      // Commit not found in recent history, likely need to fetch more commits
      return { 
        newCommits: commits.length, 
        lastCommitHash: commits[0].sha,
        message: 'Previous commit not found in recent history'
      };
    }
    
    // Count new commits
    const newCommitsCount = lastCommitIndex;
    
    return {
      newCommits: newCommitsCount,
      lastCommitHash: commits[0].sha,
      message: `Found ${newCommitsCount} new commits since last changelog`
    };
  } catch (error) {
    // Keep this error log as it's useful for debugging GitHub API issues
    console.error(`GitHub API error: ${error.message}`);
    return { 
      newCommits: null, 
      lastCommitHash: null,
      message: `Error: ${error.message}`
    };
  }
};

module.exports = {
  getNewCommitsSinceLastChangelog
}; 
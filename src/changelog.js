const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const aiSummarizer = require('./ai-summarizer');

/**
 * Generate a changelog from GitHub commits
 * @param {string} repoUrl - The GitHub repository URL
 * @param {number} days - Number of days to include in the changelog
 * @param {string} format - Format of the changelog ('internal' or 'external')
 * @param {boolean} useAI - Whether to use AI to enhance the changelog
 * @returns {object} - Object containing the formatted changelog and generated title
 */
const generateChangelog = async (repoUrl, days, format = 'internal', useAI = true) => {
  const spinner = ora('Fetching commits from GitHub...').start();
  
  try {
    const commits = await fetchCommits(repoUrl, days);
    
    if (commits.length === 0) {
      spinner.fail('No commits found for the specified period.');
      return { 
        content: 'No commits found for the specified period.',
        title: 'No Changes' 
      };
    }

    // Extract repository name for the changelog title
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    
    // Format the date range for the changelog
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));
    
    const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;
    
    // Important: Stop the spinner before any console logs to avoid glitching
    spinner.succeed(`Found ${commits.length} commits.`);
    
    // Try to use AI if requested
    if (useAI) {
      
      try {
        const aiResult = await aiSummarizer.enhanceChangelog(commits, format, repoName, dateRange);
        
        if (aiResult) {
          console.log(chalk.green('✅ Successfully generated AI-enhanced changelog!'));
          return {
            content: aiResult.content,
            title: aiResult.title || `${repoName} Changelog`
          };
        }
      } catch (error) {
        console.log(chalk.red('⚠️ AI enhancement failed: ' + error.message));
      }
      
      console.log(chalk.yellow('⚠️ Falling back to standard changelog generation...'));
    } else {
      console.log(chalk.blue('ℹ️ No AI key found. Using standard changelog generation...'));
    }
    
    // Start a new spinner for standard generation after all console logs
    const genSpinner = ora('Generating standard changelog...').start();
    
    // Generate the changelog using the traditional method if AI is disabled or fails
    let changelog;
    if (format === 'external') {
      changelog = generateExternalChangelog(repoName, commits, dateRange);
    } else {
      changelog = generateInternalChangelog(repoName, commits, dateRange);
    }
    
    genSpinner.succeed('Standard changelog generated successfully!');
    return {
      content: changelog,
      title: `${repoName} Changelog`
    };
  } catch (error) {
    spinner.fail('Failed to generate changelog');
    console.error(chalk.red('Error:'), error.message);
    return {
      content: `Error generating changelog: ${error.message}`,
      title: 'Error'
    };
  }
};

/**
 * Format a date as YYYY-MM-DD
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Generate an internal changelog (for developers)
 * @param {string} repoName - Repository name
 * @param {Array} commits - Array of commit objects
 * @param {string} dateRange - Formatted date range
 * @returns {string} - The formatted changelog
 */
const generateInternalChangelog = (repoName, commits, dateRange) => {
  let changelog = `# Changelog: ${repoName}\n\n`;
  changelog += `**Date Range:** ${dateRange}\n\n`;
  
  // Group commits by type (feat, fix, docs, etc.)
  const commitsByType = groupCommitsByType(commits);
  
  // Add each commit group to the changelog
  Object.keys(commitsByType).forEach(type => {
    changelog += `## ${formatCommitType(type)}\n\n`;
    
    commitsByType[type].forEach(commit => {
      const sha = commit.sha.substring(0, 7);
      const message = commit.commit.message;
      const author = commit.commit.author.name;
      const date = new Date(commit.commit.author.date).toISOString().split('T')[0];
      
      changelog += `- **${sha}** ${message} (${author}, ${date})\n`;
    });
    
    changelog += '\n';
  });
  
  return changelog;
};

/**
 * Generate an external changelog (for users)
 * @param {string} repoName - Repository name
 * @param {Array} commits - Array of commit objects
 * @param {string} dateRange - Formatted date range
 * @returns {string} - The formatted changelog
 */
const generateExternalChangelog = (repoName, commits, dateRange) => {
  let changelog = `# ${repoName} - Changelog\n\n`;
  changelog += `**${dateRange}**\n\n`;
  
  // Filter out commits that are not relevant for users
  const userRelevantCommits = commits.filter(commit => {
    const message = commit.commit.message.toLowerCase();
    return message.startsWith('feat') || 
           message.startsWith('fix') || 
           message.startsWith('perf') ||
           message.startsWith('breaking');
  });
  
  // Group by features, fixes, and performance improvements
  const features = userRelevantCommits.filter(commit => 
    commit.commit.message.toLowerCase().startsWith('feat'));
  
  const fixes = userRelevantCommits.filter(commit => 
    commit.commit.message.toLowerCase().startsWith('fix'));
  
  const performance = userRelevantCommits.filter(commit => 
    commit.commit.message.toLowerCase().startsWith('perf'));
  
  const breaking = userRelevantCommits.filter(commit => 
    commit.commit.message.toLowerCase().startsWith('breaking'));
  
  // Add features
  if (features.length > 0) {
    changelog += `## ✨ New Features\n\n`;
    features.forEach(commit => {
      const message = commit.commit.message.replace(/^feat(\([^)]+\))?:\s*/i, '');
      changelog += `- ${message}\n`;
    });
    changelog += '\n';
  }
  
  // Add breaking changes
  if (breaking.length > 0) {
    changelog += `## ⚠️ Breaking Changes\n\n`;
    breaking.forEach(commit => {
      const message = commit.commit.message.replace(/^breaking(\([^)]+\))?:\s*/i, '');
      changelog += `- ${message}\n`;
    });
    changelog += '\n';
  }
  
  // Add fixes
  if (fixes.length > 0) {
    changelog += `## 🐛 Bug Fixes\n\n`;
    fixes.forEach(commit => {
      const message = commit.commit.message.replace(/^fix(\([^)]+\))?:\s*/i, '');
      changelog += `- ${message}\n`;
    });
    changelog += '\n';
  }
  
  // Add performance improvements
  if (performance.length > 0) {
    changelog += `## ⚡ Performance Improvements\n\n`;
    performance.forEach(commit => {
      const message = commit.commit.message.replace(/^perf(\([^)]+\))?:\s*/i, '');
      changelog += `- ${message}\n`;
    });
    changelog += '\n';
  }
  
  return changelog;
};

/**
 * Group commits by their type (feat, fix, docs, etc.)
 * @param {Array} commits - Array of commit objects
 * @returns {Object} - Object with commit types as keys and arrays of commits as values
 */
const groupCommitsByType = (commits) => {
  const types = {};
  
  commits.forEach(commit => {
    const message = commit.commit.message;
    let type = 'other';
    
    // Extract commit type using conventional commit format (feat: message, fix: message, etc.)
    const match = message.match(/^(\w+)(\([^)]+\))?:/);
    if (match) {
      type = match[1];
    }
    
    if (!types[type]) {
      types[type] = [];
    }
    
    types[type].push(commit);
  });
  
  return types;
};

/**
 * Format a commit type for display
 * @param {string} type - Commit type
 * @returns {string} - Formatted type
 */
const formatCommitType = (type) => {
  const typeMap = {
    'feat': 'Features',
    'fix': 'Bug Fixes',
    'docs': 'Documentation',
    'style': 'Style Improvements',
    'refactor': 'Code Refactoring',
    'perf': 'Performance Improvements',
    'test': 'Tests',
    'build': 'Build System',
    'ci': 'CI/CD',
    'chore': 'Chores',
    'other': 'Other Changes'
  };
  
  return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

/**
 * Fetch commits from GitHub API
 * @param {string} repoUrl - The GitHub repository URL
 * @param {number} days - Number of days to include
 * @returns {Array} - Array of commit objects
 */
const fetchCommits = async (repoUrl, days) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
  
  // Extract owner and repo name from URL
  const urlParts = repoUrl.replace(/\.git$/, '').split('/');
  const repoOwner = urlParts[urlParts.length - 2];
  const repoName = urlParts[urlParts.length - 1];
  
  // Calculate date for fetching commits
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - parseInt(days));
  
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/commits`;
  
  try {
    const response = await axios.get(apiUrl, {
      params: {
        since: sinceDate.toISOString()
      },
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': GITHUB_TOKEN ? `token ${GITHUB_TOKEN}` : undefined
      }
    });
    
    return response.data;
  } catch (error) {
    let errorMessage = 'Error fetching commits from GitHub';
    
    if (error.response) {
      errorMessage += `: ${error.response.status} - ${error.response.data.message || error.response.statusText}`;
    } else if (error.request) {
      errorMessage += ': No response received from server';
    } else {
      errorMessage += `: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
};

module.exports = { generateChangelog };

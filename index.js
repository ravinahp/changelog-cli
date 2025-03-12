#!/usr/bin/env node --no-deprecation
const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
const { execSync } = require('child_process');
const { generateChangelog } = require('./src/changelog');
const { openEditor } = require('./src/editor');
const { publishChangelog } = require('./src/publish');
const db = require('./src/db');
const dotenv = require('dotenv');
const fs = require('fs');
const ora = require('ora');
const path = require('path');
const os = require('os');

// Initialize database
db.setup();
/**
 * Format a date as YYYY-MM-DD
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// ASCII art banner
console.log(
  chalk.cyan(
    figlet.textSync('InstaLog', { horizontalLayout: 'full' })
  )
);
console.log(chalk.cyan('Changelog Generator CLI\n'));

// Check for GitHub token
let GITHUB_TOKEN = process.env.GITHUB_TOKEN;
let ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
let githubKeySource = null;
let anthropicKeySource = null;

// Try to load token from .github_token file if it exists
if (GITHUB_TOKEN) {
  githubKeySource = 'environment';
} else if (fs.existsSync(path.join(process.cwd(), '.github_token'))) {
  GITHUB_TOKEN = fs.readFileSync(path.join(process.cwd(), '.github_token'), 'utf8').trim();
  process.env.GITHUB_TOKEN = GITHUB_TOKEN;
  githubKeySource = '.github_token file';
}

// Try to load Anthropic API key from .anthropic_key file if it exists
if (ANTHROPIC_API_KEY) {
  anthropicKeySource = 'environment';
} else {
  // Try from current directory first
  const cwdKeyPath = path.join(process.cwd(), '.anthropic_key');
  // Then from home directory
  const homeKeyPath = path.join(os.homedir(), '.anthropic_key');
  
  if (fs.existsSync(cwdKeyPath)) {
    ANTHROPIC_API_KEY = fs.readFileSync(cwdKeyPath, 'utf8').trim();
    process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY;
    anthropicKeySource = '.anthropic_key file (current directory)';
  } else if (fs.existsSync(homeKeyPath)) {
    ANTHROPIC_API_KEY = fs.readFileSync(homeKeyPath, 'utf8').trim();
    process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY;
    anthropicKeySource = '.anthropic_key file (home directory)';
  }
}

// Show API key status
console.log('API Key Status:');
if (githubKeySource) {
  console.log(chalk.green(`✅ GitHub Token Found`));
} else {
  console.log(chalk.yellow('⚠️ GitHub Token: Not found - you will be prompted to enter it'));
}

if (anthropicKeySource) {
  console.log(chalk.green(`✅ Anthropic API Key Found`));
} else {
  console.log(chalk.yellow('⚠️ Anthropic API Key: Not found - please enter one or no AI summary will be made'));
}
console.log(''); // Empty line for spacing

// Get the current repository URL if available
const getCurrentRepoUrl = () => {
  try {
    return execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
};

// Get repository name from URL
const getRepoNameFromUrl = (url) => {
  return url.split('/').pop().replace('.git', '');
};

// Main CLI function
const run = async () => {
  // If no GitHub token, prompt for it
  if (!GITHUB_TOKEN) {
    console.log(chalk.yellow('⚠️  No GitHub token found in environment variables or .github_token file.'));
    console.log('You will be prompted to enter your GitHub token.');

    const { githubToken } = await inquirer.prompt([
      {
        type: 'password',
        name: 'githubToken',
        message: 'Enter your GitHub Personal Access Token:',
        mask: '*',
      },
    ]);

    GITHUB_TOKEN = githubToken;
    process.env.GITHUB_TOKEN = GITHUB_TOKEN;
    
    // Save token to .github_token file
    const saveToken = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'save',
        message: 'Would you like to save this token for future use?',
        default: true,
      },
    ]);

    if (saveToken.save) {
      fs.writeFileSync(path.join(process.cwd(), '.github_token'), GITHUB_TOKEN);
      console.log(chalk.green('✅ GitHub Token saved to .github_token file'));
    }
  }

  // Check for Anthropic API key
  if (!ANTHROPIC_API_KEY) {
    console.log(chalk.yellow('⚠️ Anthropic API key not found - AI summaries require this key'));

    // Always prompt for API key - no confirmation needed
    const { anthropicKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'anthropicKey',
        message: 'Enter your Anthropic API Key:',
        mask: '*',
      },
    ]);

    ANTHROPIC_API_KEY = anthropicKey;
    process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY;
    
    // Save key to .anthropic_key file
    const saveKey = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'save',
        message: 'Would you like to save this API key for future use?',
        default: true,
      },
    ]);

    if (saveKey.save) {
      // Save to home directory for better cross-project usage
      const savePath = path.join(os.homedir(), '.anthropic_key');
      fs.writeFileSync(savePath, ANTHROPIC_API_KEY);
      console.log(chalk.green(`✅ Anthropic API key saved to ${savePath}`));
    }
  }

  // Detect current repository URL and get recent repositories
  const currentRepoUrl = getCurrentRepoUrl();
  const recentRepos = db.getRecentRepositories(5);
  
  // Build choices for repository selection
  let repoChoices = [];
  
  // Add current repo if available
  if (currentRepoUrl) {
    // Check if we have changelog history for current repo
    const lastChangelog = db.getDaysSinceLastChangelog(currentRepoUrl);
    let repoLabel = `${getRepoNameFromUrl(currentRepoUrl)} (current)`;
    
    // Add changelog info if available
    if (lastChangelog) {
      repoLabel += ` - changelog generated ${lastChangelog.days} days ago`;
    }
    
    repoChoices.push({
      name: repoLabel,
      value: currentRepoUrl
    });
  }
  
  // Add recent repos
  if (recentRepos.length > 0) {
    // Only add repos that aren't the current repo
    const otherRecentRepos = recentRepos.filter(repo => 
      repo.url !== currentRepoUrl
    ).map(repo => {
      // Check if we have changelog history for this repo
      const lastChangelog = db.getDaysSinceLastChangelog(repo.url);
      let repoLabel = `${repo.name} (recent)`;
      
      // Add changelog info if available
      if (lastChangelog) {
        repoLabel += ` - changelog generated ${lastChangelog.days} days ago`;
      }
      
      return {
        name: repoLabel,
        value: repo.url
      };
    });
    
    if (otherRecentRepos.length > 0) {
      repoChoices = [...repoChoices, ...otherRecentRepos];
    }
  }
  
  // Always add the option to enter a custom repo
  repoChoices.push({
    name: 'Enter a different repository URL',
    value: 'custom'
  });

  // Prompt for repository
  let repoUrl;
  if (repoChoices.length > 1) {
    const { selectedRepo } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedRepo',
        message: 'Select GitHub repository:',
        choices: repoChoices,
      }
    ]);
    
    if (selectedRepo === 'custom') {
      const { customRepo } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customRepo',
          message: 'Enter the GitHub repo URL:',
          validate: (input) => {
            if (!input) return 'Please enter a GitHub repository URL';
            if (!input.includes('github.com')) return 'Please enter a valid GitHub repository URL';
            return true;
          },
        }
      ]);
      repoUrl = customRepo;
    } else {
      repoUrl = selectedRepo;
    }
  } else if (currentRepoUrl) {
    repoUrl = currentRepoUrl;
  } else {
    const { customRepo } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customRepo',
        message: 'Enter the GitHub repo URL:',
        validate: (input) => {
          if (!input) return 'Please enter a GitHub repository URL';
          if (!input.includes('github.com')) return 'Please enter a valid GitHub repository URL';
          return true;
        },
      }
    ]);
    repoUrl = customRepo;
  }
  
  // Check for new commits since last changelog
  const spinner = ora('Checking for repository history...').start();
  let suggestedTimeframe = 1; // Default: last 24 hours
  let newCommitsInfo = null;
  
  try {
    // Get last changelog info
    const lastChangelogInfo = db.getDaysSinceLastChangelog(repoUrl);
    
    if (lastChangelogInfo) {
      // Suggest the number of days since the last changelog
      suggestedTimeframe = lastChangelogInfo.days;
      
      // Check for new commits since last changelog
      newCommitsInfo = await db.getNewCommitsSinceLastChangelog(repoUrl, GITHUB_TOKEN);
      
      if (newCommitsInfo && newCommitsInfo.newCommits !== null) {
        spinner.succeed(`Found ${newCommitsInfo.newCommits} new commits since last changelog on ${lastChangelogInfo.lastDate}`);
      } else {
        spinner.succeed(`Last changelog was generated ${suggestedTimeframe} days ago on ${lastChangelogInfo.lastDate}`);
      }
    } else {
      spinner.succeed('No previous changelog history found for this repository.');
    }
  } catch (error) {
    spinner.fail('Error checking repository history');
    console.error(chalk.red('Error:'), error.message);
  }

  // Prompt for configuration
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'timeframe',
      message: 'Select the timeframe for the changelog:',
      choices: [
        { name: 'Last 24 hours', value: 1 },
        { name: 'Last 7 days', value: 7 },
        { name: 'Last 14 days', value: 14 },
        { name: 'Last 30 days', value: 30 },
        { 
          name: `Since last changelog (${suggestedTimeframe} days)`, 
          value: suggestedTimeframe,
          disabled: !suggestedTimeframe || suggestedTimeframe <= 0
        },
        { name: 'Custom', value: 'custom' }
      ],
      default: suggestedTimeframe && suggestedTimeframe > 0 && suggestedTimeframe <= 30 ? 
        suggestedTimeframe : 1,
    },
    {
      type: 'input',
      name: 'customDays',
      message: 'Enter number of days:',
      when: (answers) => answers.timeframe === 'custom',
      validate: (input) => {
        const days = parseInt(input);
        if (isNaN(days) || days <= 0) return 'Please enter a valid number of days';
        return true;
      },
      filter: (input) => parseInt(input),
    },
    {
      type: 'list',
      name: 'format',
      message: 'Select the changelog format:',
      choices: [
        { name: 'Internal (technical details for developers)', value: 'internal' },
        { name: 'External (user-facing changes)', value: 'external' }
      ],
      default: 'internal',
    },
    {
      type: 'list',
      name: 'editorType',
      message: 'How would you like to edit the changelog?',
      choices: [
        { name: 'Use system text editor', value: 'text' },
        { name: 'Use web-based editor', value: 'web' },
        { name: 'No editing needed', value: 'none' }
      ],
      default: 'text',
    }
  ]);

  // Determine days from timeframe selection
  const days = answers.timeframe === 'custom' ? answers.customDays : answers.timeframe;

  // Generate the changelog
  console.log(chalk.blue('\n🔍 Generating changelog...'));
  
  const changelogSpinner = ora('Fetching commits and building changelog...').start();
  
  try {
    // Always use AI if the API key is available
    const useAI = !!ANTHROPIC_API_KEY;
    
    const changelogData = await generateChangelog(repoUrl, days, answers.format, useAI);
    const changelog = changelogData.content;
    const suggestedTitle = changelogData.title;
    
    changelogSpinner.succeed('Changelog generated successfully!');
    
    console.log(chalk.blue('\n📝 Changelog Preview:'));
    console.log(chalk.gray('-------------------------------------------'));
    console.log(changelog);
    console.log(chalk.gray('-------------------------------------------\n'));

    let editedChangelog = changelog;
    
    // Open editor if requested
    if (answers.editorType !== 'none') {
      const useWebEditor = answers.editorType === 'web';
      console.log(chalk.blue(`\n✏️ Opening ${useWebEditor ? 'web' : 'text'} editor...`));
      
      // Extract repo name for display
      const repoName = getRepoNameFromUrl(repoUrl);
      
      // Format date range for display
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(days));
      const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;
      
      editedChangelog = await openEditor(changelog, useWebEditor, {
        dateRange,
        repoName,
        title: suggestedTitle
      });
      
      if (editedChangelog !== changelog) {
        console.log(chalk.green('✅ Changelog updated successfully!'));
      }
    }

    // Prompt for publishing
    const publishResponse = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'publish',
        message: 'Do you want to publish the changelog now?',
        default: true,
      },
    ]);

    if (publishResponse.publish) {
      await publishChangelog(editedChangelog);
    } else {
      console.log(chalk.yellow('Changelog not published.'));
    }
    
    // Save changelog history to database
    const repoName = getRepoNameFromUrl(repoUrl);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const endDate = new Date();
    
    // Get last commit hash from new commits info or use null
    const lastCommitHash = newCommitsInfo && newCommitsInfo.lastCommitHash ? 
      newCommitsInfo.lastCommitHash : null;
    
    // Save to database
    db.saveChangelogGeneration(
      repoUrl, 
      repoName, 
      startDate.toISOString().split('T')[0], 
      endDate.toISOString().split('T')[0],
      lastCommitHash
    );
    
  } catch (error) {
    changelogSpinner.fail('Failed to generate changelog');
    console.error(chalk.red('Error:'), error.message);
  }
};

// Add a handler for unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error.message);
  process.exit(1);
});

// Execute the main function
if (require.main === module) {
  run();
}

module.exports = { run };

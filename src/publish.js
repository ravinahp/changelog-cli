const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { execSync } = require('child_process');
const axios = require('axios');

/**
 * Publishes the changelog to various destinations
 * @param {string} changelog - The changelog content to publish
 * @returns {Promise<void>}
 */
const publishChangelog = async (changelog) => {
  try {
    // Automatically publish to local server without asking for destination
    await publishToLocalServer(changelog);
    console.log(chalk.green('\n✅ Changelog published successfully!'));
  } catch (error) {
    console.error(chalk.red('Error publishing changelog:'), error.message);
  }
};

/**
 * Save the changelog to a file
 * @param {string} changelog - The changelog content
 * @returns {Promise<void>}
 */
const saveToFile = async (changelog) => {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'filepath',
      message: 'Enter the file path to save the changelog:',
      default: 'CHANGELOG.md'
    },
    {
      type: 'confirm',
      name: 'append',
      message: 'Append to existing file (if it exists)?',
      default: false
    }
  ]);

  const { filepath, append } = answers;
  const resolvedPath = path.resolve(process.cwd(), filepath);

  try {
    if (append && fs.existsSync(resolvedPath)) {
      const existingContent = fs.readFileSync(resolvedPath, 'utf8');
      fs.writeFileSync(resolvedPath, `${changelog}\n\n${existingContent}`);
    } else {
      fs.writeFileSync(resolvedPath, changelog);
    }

    console.log(chalk.green(`Changelog saved to ${resolvedPath}`));
  } catch (error) {
    throw new Error(`Failed to save changelog to file: ${error.message}`);
  }
};

/**
 * Publish the changelog as a GitHub release
 * @param {string} changelog - The changelog content
 * @returns {Promise<void>}
 */
const publishToGitHub = async (changelog) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  if (!GITHUB_TOKEN) {
    console.error(chalk.yellow('GitHub token not found. Please set the GITHUB_TOKEN environment variable.'));
    console.log(chalk.blue('Falling back to copying to clipboard instead...'));
    return await copyToClipboard(changelog);
  }

  try {
    // Get repository information
    const repoUrl = await getGitRepositoryUrl();
    const [owner, repo] = extractRepoInfo(repoUrl);

    // Get tag and release title
    const { tag, title } = await inquirer.prompt([
      {
        type: 'input',
        name: 'tag',
        message: 'Enter the tag for this release:',
        default: `v${new Date().toISOString().split('T')[0]}`
      },
      {
        type: 'input',
        name: 'title',
        message: 'Enter the title for this release:',
        default: `Release ${new Date().toISOString().split('T')[0]}`
      }
    ]);

    // Create the release
    const response = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/releases`,
      {
        tag_name: tag,
        name: title,
        body: changelog,
        draft: false
      },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    console.log(chalk.green(`GitHub release created: ${response.data.html_url}`));
  } catch (error) {
    console.error(chalk.yellow(`Failed to publish to GitHub: ${error.message}`));
    console.log(chalk.blue('Falling back to copying to clipboard instead...'));
    return await copyToClipboard(changelog);
  }
};

/**
 * Copy the changelog to the clipboard
 * @param {string} changelog - The changelog content
 * @returns {Promise<void>}
 */
const copyToClipboard = async (changelog) => {
  try {
    // Different clipboard commands depending on the OS
    if (process.platform === 'darwin') {
      // macOS
      execSync('pbcopy', { input: changelog });
    } else if (process.platform === 'win32') {
      // Windows
      execSync('clip', { input: changelog });
    } else {
      // Linux (requires xclip)
      try {
        execSync('xclip -selection clipboard', { input: changelog });
      } catch (error) {
        throw new Error('Failed to copy to clipboard. Make sure xclip is installed on Linux.');
      }
    }

    console.log(chalk.green('Changelog copied to clipboard'));
  } catch (error) {
    console.error(chalk.red(`Failed to copy to clipboard: ${error.message}`));
    console.log('You can manually copy the changelog from the console:');
    console.log('\n------- CHANGELOG -------\n');
    console.log(changelog);
    console.log('\n------------------------\n');
  }
};

/**
 * Get the current git repository URL
 * @returns {Promise<string>} - The repository URL
 */
const getGitRepositoryUrl = async () => {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    
    // Convert SSH URL to HTTPS URL if needed
    if (remoteUrl.startsWith('git@github.com:')) {
      return remoteUrl.replace('git@github.com:', 'https://github.com/');
    }
    
    return remoteUrl;
  } catch (error) {
    throw new Error('Failed to get git repository URL. Make sure you are in a git repository.');
  }
};

/**
 * Extract owner and repo from GitHub URL
 * @param {string} url - The GitHub repository URL
 * @returns {Array} - [owner, repo]
 */
const extractRepoInfo = (url) => {
  // Handle both HTTPS and SSH URLs
  const httpsMatch = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  const sshMatch = url.match(/github\.com:([^\/]+)\/([^\/\.]+)/);
  
  const match = httpsMatch || sshMatch;
  
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  
  return [match[1], match[2].replace('.git', '')];
};

/**
 * Publishes the changelog to a local server
 * @param {string} changelog - The changelog content to publish
 * @returns {Promise<void>}
 */
const publishToLocalServer = async (changelog) => {
  console.log(chalk.blue('Publishing to local server...'));
  
  try {
    // Generate a title based on the date
    const title = `Changelog ${new Date().toISOString().split('T')[0]}`;
    
    // Create payload
    const payload = {
      title,
      content: changelog,
      date: new Date().toISOString().split('T')[0]
    };
    
    // Send to local server
    const response = await axios.post('http://localhost:3000/api/changelogs', payload);
    
    if (response.status === 201) {
      console.log(chalk.green('Changelog published successfully!'));
      console.log(chalk.blue('You can view it at: ') + chalk.cyan('http://localhost:3000'));
    }
  } catch (error) {
    throw new Error(`Failed to publish to local server: ${error.message}`);
  }
};

module.exports = { publishChangelog };

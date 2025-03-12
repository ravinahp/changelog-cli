const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
const os = require('os');

/**
 * AI-powered summarizer for changelogs using Anthropic
 */
class AISummarizer {
  constructor() {
    // Don't check for API key here - we'll check it when the method is called
  }

  /**
   * Generate an AI-enhanced changelog summary from commit data
   * @param {Array} commits - Array of commit objects from GitHub
   * @param {string} format - Format of the changelog ('internal' or 'external')
   * @param {string} repoName - Repository name
   * @param {string} dateRange - Date range for the changelog
   * @returns {Promise<object>} - Object containing the enhanced changelog content and title
   */
  async enhanceChangelog(commits, format, repoName, dateRange) {
    // Check for API key at method call time - read from .anthropic_key file
    let apiKey = process.env.ANTHROPIC_API_KEY;
    
    // Try to read from the .anthropic_key file if not in environment
    if (!apiKey) {
      try {
        const keyPath = path.join(os.homedir(), '.anthropic_key');
        if (fs.existsSync(keyPath)) {
          apiKey = fs.readFileSync(keyPath, 'utf8').trim();
          console.log(chalk.green('🔑 Found Anthropic API key from .anthropic_key file'));
        }
      } catch (error) {
        console.warn(chalk.yellow(`⚠️ Error reading .anthropic_key file: ${error.message}`));
      }
    }
    
    if (!apiKey) {
      console.warn(chalk.yellow('⚠️ Anthropic API key not found. AI enhancement disabled.'));
      return null; // Return null to indicate AI enhancement is not available
    }

    // Create Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Extract relevant information from commits - do this before starting the spinner
    const commitMessages = commits.map(commit => {
      const sha = commit.sha.substring(0, 7);
      const message = commit.commit.message;
      const author = commit.commit.author.name;
      const date = new Date(commit.commit.author.date).toISOString().split('T')[0];
      
      return {
        sha,
        message,
        author,
        date
      };
    });

    // Create the prompt based on format
    const isInternal = format === 'internal';
    const prompt = this.createPrompt(commitMessages, repoName, dateRange, isInternal);

    try {
      // Call Anthropic API with the correct structure
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307", // Using a model from the list provided
        max_tokens: 4000,
        temperature: 0.2,
        system: "You are an expert changelog writer. Your task is to create well-structured, informative changelogs that highlight the most important changes in a repository. You categorize changes properly, eliminate noise, and ensure the content is appropriately detailed for the audience. For developer-focused changelogs, include technical details; for user-focused changelogs, emphasize features and benefits.",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
      });

      if (!response || !response.content || response.content.length === 0) {
        console.error(chalk.red('AI enhancement failed: Empty response from API'));
        return null;
      }
      
      const content = response.content[0].text;
      
      // Extract title from the content
      let title = "Changelog";
      const lines = content.split('\n');
      // Look for lines that start with # (heading level 1)
      for (const line of lines) {
        if (line.startsWith('# ')) {
          // Extract just the title without the leading # and any trailing " - Changelog"
          let extractedTitle = line.substring(2).trim();
          // Remove " - Changelog" if present
          extractedTitle = extractedTitle.replace(/ - Changelog$/, '');
          title = extractedTitle;
          break;
        }
      }
      
      return {
        content,
        title
      };
    } catch (error) {
      console.error(chalk.red('Failed to enhance changelog with AI'));
      
      // Provide more user-friendly error message for quota issues
      if (error.status === 429) {
        console.error(chalk.red('Anthropic API Quota Exceeded: Your account has run out of credits or hit a rate limit.'));
        console.error(chalk.yellow('To fix this issue:'));
        console.error(chalk.yellow('1. Check your Anthropic account billing at https://console.anthropic.com/settings/billing'));
        console.error(chalk.yellow('2. Consider upgrading your plan or adding payment information'));
        console.error(chalk.yellow('3. Or try again later if you hit a rate limit'));
      } else {
        console.error(chalk.red('AI Error:'), error.message);
      }
      
      return null;
    }
  }

  /**
   * Create a prompt for the AI based on the commit data
   * @param {Array} commits - Array of commit objects
   * @param {string} repoName - Repository name
   * @param {string} dateRange - Date range for the changelog
   * @param {boolean} isInternal - Whether the changelog is for internal use
   * @returns {string} - The prompt for the AI
   */
  createPrompt(commits, repoName, dateRange, isInternal) {
    const audienceType = isInternal ? 'developers' : 'end-users';
    const detailLevel = isInternal ? 'Include technical details but DO NOT include commit hashes or author names' : 'Focus on user-facing changes, features, and improvements';
    
    let commitsData = '';
    commits.forEach(commit => {
      commitsData += `- SHA: ${commit.sha}, Message: "${commit.message}", Author: ${commit.author}, Date: ${commit.date}\n`;
    });

    return `
Generate a ${isInternal ? 'technical' : 'user-friendly'} changelog for repository "${repoName}" covering the period ${dateRange}.

The changelog is intended for ${audienceType}. ${detailLevel}.

First, create a descriptive version-style title that captures the essence of the changes in this period.
The title should be concise but informative about the main themes of changes.

Here are the commits to include:
${commitsData}

Please format the changelog with the following EXACT structure:

# [DESCRIPTIVE TITLE] - Changelog
**${dateRange}**

Begin with a brief 1-2 sentence summary describing the focus of this release.

## Added
- List any new features or functionalities that were added
- Include enhancements to existing features

## Changed
- List any changes or modifications made to existing features
- Include performance improvements and code refactoring

## Fixed
- List any bugs that were fixed
- Include patches and issue resolutions

## Removed
- List any features or elements that were deprecated or removed (if any)

## Security
- List any security-related changes (if any)

If there are no items for a particular category, you can omit that category completely.

IMPORTANT:
1. Replace [DESCRIPTIVE TITLE] with a meaningful, version-style title (like "Feature Enhancement Sprint" or "Bug Fix Release")
2. DO NOT include commit hashes, author names, or dates in the changelog entries.

Ensure the changelog is clear, concise, and provides valuable information about the changes in this release period.
`;
  }
}

module.exports = new AISummarizer(); 
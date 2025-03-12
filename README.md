# InstaLog: Changelog Generator CLI

A command-line tool that generates intelligent changelogs from your GitHub repository.

![InstaLog CLI Banner](https://i.imgur.com/placeholder-image.png)

## Features

- 🤖 AI-powered changelog generation with smart commit grouping
  - **NEW**: Claude AI integration for enhanced summaries and readability
- 📅 Flexible date range selection (24h, 7d, 14d, 30d, or custom)
- 🎯 Multiple changelog formats:
  - Internal (technical details for developers)
  - External (user-facing changes)
- 🔍 Auto-detection of current repository
- ⚡ Real-time progress indicator
- ✏️ Edit changelogs before publishing
  - System text editor support
  - Web-based editor with Markdown preview
- 📤 Multiple publishing options:
  - Save to file
  - Create GitHub release
  - Copy to clipboard

## Prerequisites

Before using this tool, you'll need:

- Node.js installed (v12 or newer)
- GitHub Personal Access Token ([Create one here](https://github.com/settings/tokens))
- Git installed (for repository auto-detection)
- (Optional) Anthropic API Key for AI-enhanced changelogs ([Get one here](https://console.anthropic.com/))

## Installation

### Install from npm (Coming Soon)

```bash
npm install -g instalog
```

### Install from source

1. Clone the repository
```bash
git clone https://github.com/yourusername/instalog.git
cd instalog
```

2. Install dependencies:
```bash
npm install
```

3. Create a symbolic link to make it executable globally (optional):
```bash
npm link
```

### Configuration

There are two ways to configure InstaLog:

#### Option 1: Environment Variables
Create a `.env` file in the root directory with your Anthropic API key:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
```

#### Option 2: Interactive Setup
Simply run the tool, and you'll be prompted to enter your:
- GitHub Personal Access Token (if not found)
- Anthropic API Key (if not found and you want to use AI enhancement)

You can choose to save these keys for future use.

## Usage

Run the CLI with:

```bash
instalog
# or
il
# or
cl
```

If you didn't install globally, you can run:

```bash
npm run cl
```

Follow the interactive prompts to:

1. Enter or confirm your GitHub repository URL
2. Select the timeframe for your changelog
3. Choose the changelog format (Internal or External)
4. Enable or disable AI enhancement (if Anthropic API key is configured)
5. Edit the changelog (if desired)
6. Publish the changelog

## AI-Enhanced Changelogs

When the Anthropic API key is provided, InstaLog can use Claude AI to:

- Better categorize and group similar changes
- Summarize complex changes in a more readable format
- Prioritize important changes and filter out noise
- Generate more coherent and professional-looking changelogs
- Adapt the language and detail level based on the target audience (developers vs. users)

## Changelog Formats

### Internal Format

Designed for developers, the internal format includes:

- Commit hashes
- Author information
- Timestamps
- Categorized by commit type (feat, fix, docs, etc.)

Example:
```markdown
# Changelog: my-project

**Date Range:** 2023-03-01 - 2023-03-10

## ✨ Features

- **abc1234** Add user authentication (Jane Doe, 2023-03-02)
- **def5678** Implement dark mode (John Smith, 2023-03-05)

## 🐛 Bug Fixes

- **ghi9012** Fix login redirect issue (Jane Doe, 2023-03-07)
```

### External Format

Designed for users, the external format:

- Omits technical details
- Focuses on new features, bug fixes, and breaking changes
- Uses friendly language
- Removes commit hashes and author information

Example:
```markdown
# my-project - Changelog

**2023-03-01 - 2023-03-10**

## ✨ New Features

- Add user authentication
- Implement dark mode

## 🐛 Bug Fixes

- Fix login redirect issue
```

## Publishing Options

After generating your changelog, you can:

1. **Save to File**: Save the changelog to a local file (e.g., CHANGELOG.md)
2. **Create GitHub Release**: Publish the changelog as a GitHub release with a tag
3. **Copy to Clipboard**: Copy the changelog to your clipboard for pasting elsewhere

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

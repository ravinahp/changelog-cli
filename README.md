# Changelog CLI

A powerful command-line tool for generating intelligent, AI-enhanced changelogs from your GitHub repositories.

## Features

- 🤖 **AI-powered summaries** - Uses Claude AI to generate readable, well-organized changelogs
- 📅 **Flexible date ranges** - Generate changelogs for the last 24h, 7d, 14d, 30d, or custom period
- 🎯 **Multiple formats** - Internal (developer-focused) or External (user-facing)
- 🔍 **Smart repository detection** - Automatically detects your current Git repository
- 📊 **Commit classification** - Intelligently categorizes commits (features, fixes, docs, etc.)
- 📝 **Beautiful web editor** - Edit your changelog with Markdown preview
- 📤 **One-click publishing** - Instantly publish to your local server

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/ravinahp/changelog-cli.git
cd changelog-cli

# Install dependencies
npm install
```

### Usage

1. **Run the CLI tool**:

```bash
npm run cli
```

2. **Server for public-facing changelogs**:

To view and share your published changelogs, start the server:

```bash
npm run server
```

Then visit `http://localhost:3000` in your browser to view your published changelogs.

### Required API Keys

- GitHub Personal Access Token ([Create one here](https://github.com/settings/tokens))
- Anthropic API Key for AI-enhanced changelogs ([Get one here](https://console.anthropic.com/))

## License

This project is licensed under the MIT License.

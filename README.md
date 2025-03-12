# Changelog CLI

A powerful command-line tool for generating intelligent, AI-enhanced changelogs from your GitHub repositories.

## Features

- 🤖 **AI-powered summaries** - Uses Claude AI to generate readable, well-organized changelogs
- 📅 **Flexible date ranges** - Generate changelogs for the last 24h, 7d, 14d, 30d, or custom period
- 🎯 **Multiple formats**:
  - **Internal** - Detailed changelogs with commit hashes and author info for developers
  - **External** - User-friendly changelogs focusing on features and fixes
- 🔍 **Smart repository detection** - Automatically detects your current Git repository
- 📊 **Commit classification** - Intelligently categorizes commits (features, fixes, docs, etc.)
- 📝 **Interactive editing** - Edit your changelog before publishing via:
  - System text editor
  - Beautiful web-based editor with Markdown preview
- 📤 **Multiple publishing options**:
  - Create GitHub releases
  - Copy to clipboard for easy sharing

## Installation

### Prerequisites

- Node.js v12 or newer
- Git installed (for repository auto-detection)
- GitHub Personal Access Token ([Create one here](https://github.com/settings/tokens))
- (Optional) Anthropic API Key for AI-enhanced changelogs ([Get one here](https://console.anthropic.com/))

### From npm (Coming Soon)

```bash
npm install -g changelog-cli
```

### From source

1. Clone the repository:
```bash
git clone https://github.com/ravinahp/changelog-cli.git
cd changelog-cli
```

2. Install dependencies:
```bash
npm install
```

3. Create a symbolic link to make it globally available (optional):
```bash
npm link
```

## Configuration

You can configure Changelog CLI in multiple ways (3 options)

### Environment Variables

```
GITHUB_TOKEN=your_github_token
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Configuration Files

- GitHub Token: Store in `.github_token` file in your project directory
- Anthropic API Key: Store in `.anthropic_key` file in your project or home directory

### Interactive Setup (reccomended option)

If tokens are not found, the CLI will prompt you to enter them and offers to save them for future use.

## Usage

Run the tool with:

```bash
npm run il
```


### Interactive Workflow

1. **Select repository** - Choose from detected, recent, or enter a custom GitHub repo
2. **Choose time period** - Select the timeframe for your changelog
3. **Select format** - Internal (developer-focused) or External (user-facing)
4. **Enable AI enhancement** - Use Claude AI to improve your changelog (if configured)
5. **Review and edit** - Edit your changelog in text or web editor
6. **Publish** - Create GitHub release or copy to clipboard

## AI-Enhanced Changelogs

When enabled with an Anthropic API key, the AI enhancement:

- Organizes changes into logical groups
- Improves clarity and readability
- Highlights important changes
- Filters out noise and trivial commits
- Adapts tone based on target audience (technical vs. non-technical)

## Example Outputs

### Internal Format (Developer-Focused)

```markdown
# Changelog: my-project

**Date Range:** 2023-03-01 - 2023-03-10

## ✨ Features

- **abc1234** Add user authentication (Jane Doe, 2023-03-02)
- **def5678** Implement dark mode (John Smith, 2023-03-05)

## 🐛 Bug Fixes

- **ghi9012** Fix login redirect issue (Jane Doe, 2023-03-07)
```

### External Format (User-Facing)

```markdown
# my-project - Changelog

**2023-03-01 - 2023-03-10**

## ✨ New Features

- Add user authentication
- Implement dark mode

## 🐛 Bug Fixes

- Fix login redirect issue
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

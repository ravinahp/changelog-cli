const axios = require('axios');

// GitHub authentication and commit fetching
const authenticateGitHub = async (token) => {
  const response = await axios.get('https://api.github.com/user', {
    headers: {
      Authorization: `token ${token}`,
    },
  });

  if (response.status === 200) {
    console.log(`Authenticated as ${response.data.login}`);
    return true;
  } else {
    console.error('Failed to authenticate GitHub token');
    return false;
  }
};

const fetchCommits = async (repoUrl, days) => {
  const repo = repoUrl.split('github.com/')[1];
  const [owner, repoName] = repo.split('/');

  const since = new Date();
  since.setDate(since.getDate() - days);

  const response = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/commits`, {
    params: { since: since.toISOString() },
  });

  return response.data.map(commit => ({
    message: commit.commit.message,
    author: commit.commit.author.name,
    date: commit.commit.author.date,
  }));
};

module.exports = { authenticateGitHub, fetchCommits };

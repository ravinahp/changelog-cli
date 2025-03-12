const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Create the Express app
const app = express();
const PORT = 3000;

// Setup middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store changelogs in-memory for simplicity
// In a real application, you would use a database
let changelogs = [];

// API route to get all changelogs
app.get('/api/changelogs', (req, res) => {
  res.json(changelogs);
});

// API route to add a new changelog
app.post('/api/changelogs', (req, res) => {
  const { title, content, date } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  
  const newChangelog = {
    id: Date.now().toString(),
    title,
    content,
    date: date || new Date().toISOString().split('T')[0]
  };
  
  changelogs.unshift(newChangelog); // Add to the beginning of the array
  
  res.status(201).json(newChangelog);
});

// Serve the index.html file for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  
  // Create the public directory if it doesn't exist
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }
}); 
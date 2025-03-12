const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const open = require('open');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');

/**
 * Opens the changelog in the user's default text editor or a temporary web interface
 * @param {string} changelog - The changelog content to edit
 * @param {boolean} useWebEditor - Whether to use the web editor interface
 * @param {object} options - Additional options
 * @param {string} options.dateRange - The date range for the changelog
 * @param {string} options.repoName - The repository name
 * @returns {Promise<string>} - The edited changelog
 */
const openEditor = async (changelog, useWebEditor = false, options = {}) => {
  if (useWebEditor) {
    return openWebEditor(changelog, options);
  } else {
    return openTextEditor(changelog);
  }
};

/**
 * Opens the changelog in the user's default text editor
 * @param {string} changelog - The changelog content to edit
 * @returns {Promise<string>} - The edited changelog
 */
const openTextEditor = async (changelog) => {
  const tempFilePath = path.join(os.tmpdir(), `changelog-${Date.now()}.md`);
  
  try {
    // Write the changelog to a temporary file
    fs.writeFileSync(tempFilePath, changelog);
    
    // Determine the editor command based on the operating system
    const editor = process.env.EDITOR || 
                  (process.platform === 'win32' ? 'notepad' : 
                   process.platform === 'darwin' ? 'open -e' : 'nano');
    
    console.log(chalk.blue(`Opening editor: ${editor}`));
    
    // Open the file in the editor
    await new Promise((resolve, reject) => {
      const editorCmd = editor.split(' ')[0];
      const editorArgs = [...editor.split(' ').slice(1), tempFilePath];
      
      const child = spawn(editorCmd, editorArgs, {
        stdio: 'inherit',
        shell: true
      });
      
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });
    });
    
    // Read the edited content
    const editedChangelog = fs.readFileSync(tempFilePath, 'utf8');
    
    // Clean up
    fs.unlinkSync(tempFilePath);
    
    return editedChangelog;
  } catch (error) {
    console.error(chalk.red('Error opening editor:'), error);
    return changelog; // Return original changelog if there was an error
  }
};

/**
 * Opens a web-based editor for the changelog
 * @param {string} changelog - The changelog content to edit
 * @param {object} options - Additional options
 * @param {string} options.dateRange - The date range for the changelog
 * @param {string} options.repoName - The repository name
 * @param {string} options.title - The suggested title for the changelog
 * @returns {Promise<string>} - The edited changelog
 */
const openWebEditor = (changelog, options = {}) => {
  const { 
    dateRange = '2025', 
    repoName = 'changelog-cli',
    title = 'Changelog'
  } = options;
  
  // Log the original content for debugging
  console.log(chalk.blue('\nPreparing to send to web editor:'));
  console.log(chalk.yellow('Content Length: ' + changelog.length + ' characters'));
  console.log(chalk.yellow('First 100 characters: ' + changelog.substring(0, 100)));
  console.log(chalk.yellow('Date Range: ' + dateRange));
  console.log(chalk.yellow('Repository: ' + repoName));
  console.log(chalk.yellow('Title: ' + title));
  
  // Ensure the changelog is properly escaped for HTML
  const escapedChangelog = changelog
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  
  return new Promise((resolve) => {
    const app = express();
    let server;
    let editedChangelog = changelog;
    
    app.use(bodyParser.json({limit: '10mb'}));
    app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
    
    // Serve the editor page with a simple markdown textarea
    app.get('/', (req, res) => {
      // Verify content is not being lost at this step
      console.log(chalk.green('Serving editor page with content length: ' + escapedChangelog.length));
      
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Changelog Editor</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!-- Import IBM Plex Mono font -->
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
        <!-- Add marked.js for markdown parsing -->
        <script src="https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js"></script>
        <style>
          :root {
            --primary-color: #2D2E40;
            --background-color: #FFFFFE;
            --surface-color: #F9F9FF;
            --text-color: #2B2C34;
            --accent-color: #6246EA;
            --border-color: #EAEAEA;
            --card-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          html, body {
            height: 100%;
          }
          
          body {
            font-family: 'IBM Plex Mono', monospace;
            line-height: 1.6;
            color: var(--text-color);
            margin: 0;
            padding: 0;
            background-color: var(--background-color);
            height: 100vh;
            display: flex;
            flex-direction: column;
          }
          
          .header {
            padding: 1.5rem;
            text-align: center;
            background-color: transparent;
            border-bottom: 1px solid var(--border-color);
          }
          
          h1 {
            font-weight: 400;
            font-size: 1.5rem;
            letter-spacing: 2px;
            color: var(--text-color);
            text-transform: uppercase;
          }
          
          .editor-wrapper {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
          }
          
          .split-container {
            display: flex;
            flex: 1;
            overflow: hidden;
          }
          
          .editor-side, .preview-side {
            flex: 1;
            padding: 2rem;
            overflow-y: auto;
          }
          
          .editor-side {
            border-right: 1px solid var(--border-color);
          }
          
          .editor-container {
            max-width: 100%;
            margin: 0 auto;
            width: 100%;
          }
          
          #markdown-editor {
            width: 100%;
            height: calc(100vh - 200px);
            min-height: 500px;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 15px;
            line-height: 1.7;
            padding: 2rem;
            background-color: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            resize: vertical;
          }
          
          .preview-side {
            flex: 1;
            padding: 2rem;
            overflow-y: auto;
            background-color: #fafbfc;
          }
          
          .preview-container {
            max-width: 100%;
            width: 100%;
          }
          
          .preview-header {
            border-bottom: 1px solid #f0f0f0;
            padding-bottom: 0.8rem;
            margin-bottom: 1.2rem;
          }
          
          .preview-title {
            font-size: 1rem;
            font-weight: 500;
            margin-bottom: 0.3rem;
            color: #4a4e69;
          }
          
          .preview-subtitle {
            font-size: 0.8rem;
            color: #8a8aa3;
            margin-top: 0.3rem;
            font-weight: 400;
          }
          
          .preview-content {
            background-color: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 5px 15px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.02);
            border: 1px solid #f5f5f7;
            position: relative;
          }

          .markdown-content {
            padding-top: 0.3rem;
            font-size: 0.9rem;
          }
          
          .preview-content h1 {
            font-size: 1.2rem;
            margin-top: 1rem;
            margin-bottom: 0.7rem;
            color: #4a4e69;
            font-weight: 500;
            border-bottom: 1px solid #f0f0f0;
            padding-bottom: 0.4rem;
          }
          
          .preview-content h2 {
            font-size: 1.1rem;
            margin-top: 1rem;
            margin-bottom: 0.6rem;
            color: #4a4e69;
            font-weight: 500;
          }
          
          .preview-content h3 {
            font-size: 0.95rem;
            margin-top: 0.8rem;
            margin-bottom: 0.5rem;
            color: #4a4e69;
            font-weight: 500;
          }
          
          .preview-content ul, .preview-content ol {
            padding-left: 1.5rem;
            margin: 0.6rem 0;
            font-size: 0.9rem;
          }

          .preview-content li {
            margin-bottom: 0.4rem;
          }
          
          .preview-content p {
            margin: 0.6rem 0;
            line-height: 1.5;
            color: #4a4e69;
            font-size: 0.9rem;
          }

          .preview-content strong {
            font-weight: 600;
            color: #3d3d4d;
          }

          .preview-content em {
            font-style: italic;
            color: #4b4b5d;
          }
          
          .preview-content code {
            background-color: #f9f9fb;
            padding: 0.15rem 0.3rem;
            border-radius: 3px;
            font-family: monospace;
            font-size: 0.8rem;
            color: #bf4a6a;
            border: 1px solid #f0f0f5;
          }

          .preview-content pre {
            background-color: #f9f9fb;
            padding: 0.8rem;
            border-radius: 6px;
            border: 1px solid #f0f0f5;
            overflow-x: auto;
            margin: 0.8rem 0;
            font-size: 0.8rem;
          }

          .preview-content pre code {
            background-color: transparent;
            padding: 0;
            border: none;
          }

          .preview-content blockquote {
            border-left: 3px solid #d8d8e5;
            padding-left: 0.8rem;
            margin: 0.8rem 0;
            font-style: italic;
            color: #6e6e7e;
            background-color: #fafbfc;
            padding: 0.4rem 0.8rem;
            border-radius: 0 6px 6px 0;
            font-size: 0.85rem;
          }

          .preview-content a {
            color: #7c64e8;
            text-decoration: none;
            border-bottom: 1px dotted #d8d8e5;
            transition: border-bottom 0.2s, color 0.2s;
          }

          .preview-content a:hover {
            color: #6246EA;
            border-bottom: 1px solid #6246EA;
          }
          
          .footer {
            padding: 1.25rem;
            text-align: center;
            background-color: transparent;
            border-top: 1px solid var(--border-color);
          }
          
          button {
            background-color: transparent;
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 0.75rem 2rem;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 14px;
            cursor: pointer;
            border-radius: 4px;
            font-weight: 500;
            letter-spacing: 0.5px;
            transition: all 0.2s ease;
          }
          
          button:hover {
            background-color: var(--accent-color);
            color: white;
            border-color: var(--accent-color);
          }
          
          .instructions {
            margin-bottom: 1rem;
            color: #666;
            font-size: 14px;
          }
          
          .input-group {
            margin-bottom: 1.5rem;
          }
          
          .input-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-size: 14px;
            color: #555;
          }
          
          .input-group input {
            width: 100%;
            padding: 0.75rem;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 14px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background-color: var(--surface-color);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Changelog Editor</h1>
        </div>
        
        <div class="editor-wrapper">
          <div class="split-container">
            <div class="editor-side">
              <div class="editor-container">
                <div class="instructions">
                  <p>Edit your markdown-formatted changelog below:</p>
                </div>
                <div class="input-group">
                  <label for="changelog-title">Changelog Title</label>
                  <input type="text" id="changelog-title" placeholder="Enter title (e.g. v1.0.0 Release)" value="${title}">
                </div>
                <div class="input-group">
                  <label for="changelog-date">Date Range</label>
                  <input type="text" id="changelog-date" placeholder="Enter date range (e.g. 2024-01-01 to 2024-01-31)" value="${dateRange}">
                </div>
                <textarea id="markdown-editor" oninput="updatePreview()">${escapedChangelog}</textarea>
              </div>
            </div>
            
            <div class="preview-side">
              <div class="preview-container">
                <div class="instructions">
                  <p>Preview:</p>
                </div>
                <div class="preview-header">
                  <div class="preview-title">
                    <span id="preview-title">${title}</span>
                    <span class="preview-dot"> · </span>
                    <span id="preview-repo" style="font-size: 0.8rem; color: #8a8aa3;">${repoName}</span>
                  </div>
                  <div class="preview-subtitle" id="preview-date">${dateRange}</div>
                </div>
                <div class="preview-content" id="preview-content">
                  <!-- Preview content will be rendered here directly -->
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <button type="button" onclick="saveChangelog()">Publish Changelog</button>
        </div>
        
        <script>
          // Use marked.js to render markdown
          document.addEventListener('DOMContentLoaded', function() {
            // Check if marked is loaded
            if (typeof marked === 'undefined') {
              console.error('Marked.js not loaded!');
              document.getElementById('preview-content').innerHTML = 
                '<div style="color: red; padding: 10px;">Error: Markdown library not loaded.</div>';
              return;
            }
            
            try {
              // Get reference to elements
              const editorElement = document.getElementById('markdown-editor');
              const previewElement = document.getElementById('preview-content');
              const titleElement = document.getElementById('preview-title');
              const dateElement = document.getElementById('preview-date');
              const titleInput = document.getElementById('changelog-title');
              const dateInput = document.getElementById('changelog-date');
              
              // Set up title and date update handlers
              titleInput.addEventListener('input', function() {
                titleElement.textContent = this.value || 'Changelog';
              });
              
              dateInput.addEventListener('input', function() {
                dateElement.textContent = this.value || '2024';
              });
              
              // Create status div for info
              const statusDiv = document.createElement('div');
              statusDiv.style.padding = '8px';
              statusDiv.style.marginBottom = '12px';
              statusDiv.style.backgroundColor = '#fafbfc';
              statusDiv.style.border = '1px solid #f5f5f7';
              statusDiv.style.fontSize = '12px';
              statusDiv.style.borderRadius = '6px';
              statusDiv.style.color = '#8a8aa3';
              statusDiv.textContent = 'Content length: ' + editorElement.value.length + ' characters';
              
              // Create content container
              const contentDiv = document.createElement('div');
              contentDiv.className = 'markdown-content';
              
              // Set initial content
              contentDiv.innerHTML = marked.parse(editorElement.value);
              
              // Clear and append elements
              previewElement.innerHTML = '';
              previewElement.appendChild(statusDiv);
              previewElement.appendChild(contentDiv);
              
              // Update preview on input
              editorElement.addEventListener('input', function() {
                contentDiv.innerHTML = marked.parse(this.value);
                statusDiv.textContent = 'Content length: ' + this.value.length + ' characters';
              });
            } catch(error) {
              console.error('Error setting up preview:', error);
              document.getElementById('preview-content').innerHTML = 
                '<div style="color: red; padding: 10px;">Error: ' + error.message + '</div>';
            }
          });
          
          function updatePreview() {
            // This is handled by the event listener above
          }
          
          function saveChangelog() {
            // Get the markdown content
            const content = document.getElementById('markdown-editor').value;
            
            fetch('/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ content })
            })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                window.close();
              }
            });
          }
        </script>
      </body>
      </html>
      `;
      
      res.send(html);
    });
    
    // Handle saving the edited changelog
    app.post('/save', (req, res) => {
      editedChangelog = req.body.content;
      res.json({ success: true });
      
      // Close the server after a short delay to allow the browser to receive the response
      setTimeout(() => {
        server.close(() => {
          resolve(editedChangelog);
        });
      }, 100);
    });
    
    // Start the server
    server = app.listen(0, () => {
      const port = server.address().port;
      const url = `http://localhost:${port}`;
      
      console.log(chalk.blue(`Opening web editor at ${url}`));
      
      // Open the URL in the default browser
      open(url);
    });
  });
};

module.exports = { openEditor };

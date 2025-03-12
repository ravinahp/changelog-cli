/**
 * Database setup and initialization using JSON files
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

// Directory where we'll store all database files
const DB_DIR = path.join(os.homedir(), '.instalog');
const HISTORY_FILE = path.join(DB_DIR, 'history.json');

/**
 * Initialize the database directory and files
 */
const setup = () => {
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    let needsInitialization = false;
    
    // Check if history file exists
    if (!fs.existsSync(HISTORY_FILE)) {
      needsInitialization = true;
    } else {
      // Check if existing file is valid JSON with correct structure
      try {
        const data = fs.readFileSync(HISTORY_FILE, 'utf8');
        const parsedData = JSON.parse(data);
        
        if (!parsedData.repositories || !Array.isArray(parsedData.repositories) ||
            !parsedData.history || !Array.isArray(parsedData.history)) {
          needsInitialization = true;
        }
      } catch (error) {
        needsInitialization = true;
      }
    }
    
    // Initialize if needed
    if (needsInitialization) {
      const initialData = {
        repositories: [],
        history: []
      };
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(initialData, null, 2));
    }
  } catch (error) {
    console.error(`Error setting up database: ${error.message}`);
  }
};

/**
 * Read data from history file
 * @returns {Object} The database data
 */
const readDB = () => {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      // Initialize with empty repositories and history arrays
      return { repositories: [], history: [] };
    }
    
    const data = fs.readFileSync(HISTORY_FILE, 'utf8');
    
    // Parse the data and ensure the structure is correct
    const parsedData = JSON.parse(data);
    
    // Make sure repositories and history are arrays
    if (!parsedData.repositories || !Array.isArray(parsedData.repositories)) {
      parsedData.repositories = [];
    }
    
    if (!parsedData.history || !Array.isArray(parsedData.history)) {
      parsedData.history = [];
    }
    
    return parsedData;
  } catch (error) {
    console.error(`Error reading database: ${error.message}`);
    // Return a valid structure in case of errors
    return { repositories: [], history: [] };
  }
};

/**
 * Write data to history file
 * @param {Object} data - The data to write
 */
const writeDB = (data) => {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing to database: ${error.message}`);
  }
};

module.exports = {
  setup,
  readDB,
  writeDB,
  DB_DIR,
  HISTORY_FILE
}; 
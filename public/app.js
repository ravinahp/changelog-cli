// DOM Elements
const changelogForm = document.getElementById('changelog-form');
const changelogsList = document.getElementById('changelogs-list');

// Base URL for API - get the current hostname and port
const currentPort = window.location.port || '3000';
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${currentPort}/api`;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load marked.js library dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js';
    script.onload = fetchChangelogs;
    document.head.appendChild(script);
});

/**
 * Fetch all changelogs from the API
 */
function fetchChangelogs() {
    // The loading state is already in the HTML
    fetch(`${API_BASE_URL}/changelogs`)
        .then(response => response.json())
        .then(changelogs => {
            renderChangelogs(changelogs);
        })
        .catch(error => {
            changelogsList.innerHTML = ''; // Clear loading
            showNotification('Error fetching changelogs: ' + error.message, 'error');
        });
}

/**
 * Publish a new changelog
 * @param {Event} event - Form submit event
 */
function publishChangelog(event) {
    event.preventDefault();
    
    // Get form data
    const formData = new FormData(changelogForm);
    const changelogData = {
        title: formData.get('title'),
        content: formData.get('content'),
        date: formData.get('date') || new Date().toISOString().split('T')[0]
    };
    
    // Submit to API
    fetch(`${API_BASE_URL}/changelogs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(changelogData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to publish changelog');
        }
        return response.json();
    })
    .then(newChangelog => {
        // Clear form
        changelogForm.reset();
        
        // Add the new changelog to the list
        prependChangelog(newChangelog);
        
        // Show success message
        showNotification('Changelog published successfully!', 'success');
    })
    .catch(error => {
        showNotification('Error publishing changelog: ' + error.message, 'error');
    });
}

/**
 * Render all changelogs in the list
 * @param {Array} changelogs - List of changelog objects
 */
function renderChangelogs(changelogs) {
    // Clear the list including the loading indicator
    changelogsList.innerHTML = '';
    
    if (changelogs.length === 0) {
        changelogsList.innerHTML = '<p class="no-changelogs">No changelogs published yet. Generate one using the CLI tool!</p>';
        return;
    }
    
    changelogs.forEach(changelog => {
        const changelogElement = createChangelogElement(changelog);
        changelogsList.appendChild(changelogElement);
    });
}

/**
 * Add a new changelog to the beginning of the list
 * @param {Object} changelog - The changelog object
 */
function prependChangelog(changelog) {
    const changelogElement = createChangelogElement(changelog);
    
    if (changelogsList.firstChild) {
        changelogsList.insertBefore(changelogElement, changelogsList.firstChild);
    } else {
        changelogsList.innerHTML = '';
        changelogsList.appendChild(changelogElement);
    }
}

/**
 * Format the content using marked.js if available
 * @param {string} content - The raw changelog content
 * @returns {string} - HTML formatted content
 */
function formatChangelogContent(content) {
    // Use marked.js if available
    if (typeof marked !== 'undefined') {
        const parsed = marked.parse(content);
        // Wrap in a div with text-align: left to ensure content is left-aligned
        return `<div style="text-align: left;">${parsed}</div>`;
    }
    
    // Fallback simple markdown-like formatting
    // Convert ## headers
    content = content.replace(/^## (.*?)$/gm, '<h3 style="text-align: left;">$1</h3>');
    
    // Convert bullet points
    content = content.replace(/^- (.*?)$/gm, '<li style="text-align: left;">$1</li>');
    content = content.replace(/(<li.*?<\/li>)/gs, '<ul style="text-align: left;">$1</ul>');
    
    // Fix duplicate ul tags
    content = content.replace(/<\/ul>\s*<ul[^>]*>/g, '');
    
    // Convert links
    content = content.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="text-align: left;">$1</a>');
    
    // Wrap in a div with text-align: left
    return `<div style="text-align: left;">${content}</div>`;
}

/**
 * Create a DOM element for a changelog
 * @param {Object} changelog - The changelog object
 * @returns {HTMLElement} - The changelog DOM element
 */
function createChangelogElement(changelog) {
    const changelogItem = document.createElement('div');
    changelogItem.classList.add('changelog-item');
    changelogItem.dataset.id = changelog.id;
    
    const changelogHeader = document.createElement('div');
    changelogHeader.classList.add('changelog-header');
    
    const titleContainer = document.createElement('div');
    titleContainer.classList.add('changelog-title');
    titleContainer.textContent = changelog.title;
    
    const dateContainer = document.createElement('div');
    dateContainer.classList.add('changelog-date');
    dateContainer.textContent = formatDate(changelog.date);
    
    const expandIcon = document.createElement('div');
    expandIcon.classList.add('expand-icon');
    expandIcon.textContent = '▼';
    
    const content = document.createElement('div');
    content.classList.add('changelog-content');
    content.innerHTML = formatChangelogContent(changelog.content);
    
    // Append all elements
    changelogHeader.appendChild(titleContainer);
    changelogHeader.appendChild(dateContainer);
    
    const iconContainer = document.createElement('div');
    iconContainer.classList.add('icon-container');
    iconContainer.appendChild(expandIcon);
    changelogHeader.appendChild(iconContainer);
    
    changelogItem.appendChild(changelogHeader);
    changelogItem.appendChild(content);
    
    // Add click event to toggle expansion
    changelogHeader.addEventListener('click', function() {
        changelogItem.classList.toggle('expanded');
    });
    
    return changelogItem;
}

/**
 * Format a date string to a more readable format
 * @param {string} dateStr - Date string in ISO format
 * @returns {string} - Formatted date
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateStr;
    }
}

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error)
 */
function showNotification(message, type) {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;
    
    // Add to the DOM
    document.querySelector('.container').insertBefore(notification, document.querySelector('main'));
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
} 
// Global variables
let currentUser = null;
let authToken = null;
let currentUploadType = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
    loadTheme();
});

// Check authentication status
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        showDashboard();
    } else {
        showLogin();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            showSection(section);
        });
    });
    
    // Close modal on outside click
    document.getElementById('uploadModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeUploadModal();
        }
    });
}

// Theme management
function loadTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.querySelector('.theme-toggle i').classList.replace('fa-moon', 'fa-sun');
    }
}

function toggleTheme() {
    const body = document.body;
    const themeIcon = document.querySelector('.theme-toggle i');
    
    body.classList.toggle('dark-theme');
    
    if (body.classList.contains('dark-theme')) {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

// Screen management
function showLogin() {
    hideAllScreens();
    document.getElementById('loginScreen').style.display = 'block';
}

function showRegister() {
    hideAllScreens();
    document.getElementById('registerScreen').style.display = 'block';
}

function showDashboard() {
    hideAllScreens();
    document.getElementById('dashboardScreen').style.display = 'block';
    document.getElementById('userDisplay').textContent = currentUser.username;
    loadDashboardData();
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
}

// Section management
function showSection(sectionName) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    // Update sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}Section`).classList.add('active');
    
    // Load section data
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'bots':
            loadBots();
            break;
        case 'websites':
            loadWebsites();
            break;
        case 'deployments':
            loadDeployments();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showDashboard();
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showDashboard();
            showNotification('Registration successful!', 'success');
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    showLogin();
    showNotification('Logged out successfully', 'success');
}

// Data loading functions
async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalBots').textContent = stats.totalBots || 0;
            document.getElementById('runningBots').textContent = stats.runningBots || 0;
            document.getElementById('totalWebsites').textContent = stats.totalWebsites || 0;
            document.getElementById('activeWebsites').textContent = stats.activeWebsites || 0;
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadBots() {
    try {
        const response = await fetch('/api/bots', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const bots = await response.json();
            renderBotsTable(bots);
        }
    } catch (error) {
        console.error('Error loading bots:', error);
    }
}

async function loadWebsites() {
    try {
        const response = await fetch('/api/websites', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const websites = await response.json();
            renderWebsitesTable(websites);
        }
    } catch (error) {
        console.error('Error loading websites:', error);
    }
}

async function loadDeployments() {
    try {
        const response = await fetch('/api/deployments', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const deployments = await response.json();
            renderDeploymentsTable(deployments);
        }
    } catch (error) {
        console.error('Error loading deployments:', error);
    }
}

function loadSettings() {
    if (currentUser) {
        document.getElementById('settingsUsername').value = currentUser.username;
        document.getElementById('settingsEmail').value = currentUser.email;
    }
}

// Table rendering functions
function renderBotsTable(bots) {
    const tbody = document.getElementById('botsTableBody');
    
    if (bots.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No bots found</td></tr>';
        return;
    }
    
    tbody.innerHTML = bots.map(bot => `
        <tr>
            <td>${bot.name}</td>
            <td>${bot.type}</td>
            <td><span class="status-badge ${bot.status}">${bot.status}</span></td>
            <td>${new Date(bot.created_at).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm ${bot.status === 'running' ? 'btn-danger' : 'btn-success'}" 
                            onclick="toggleBotStatus(${bot.id}, '${bot.status === 'running' ? 'stopped' : 'running'}')">
                        <i class="fas fa-${bot.status === 'running' ? 'stop' : 'play'}"></i>
                        ${bot.status === 'running' ? 'Stop' : 'Start'}
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="editBot(${bot.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBot(${bot.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderWebsitesTable(websites) {
    const tbody = document.getElementById('websitesTableBody');
    
    if (websites.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No websites found</td></tr>';
        return;
    }
    
    tbody.innerHTML = websites.map(website => `
        <tr>
            <td>${website.name}</td>
            <td>${website.domain || 'N/A'}</td>
            <td><span class="status-badge ${website.status}">${website.status}</span></td>
            <td>${new Date(website.created_at).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm ${website.status === 'active' ? 'btn-danger' : 'btn-success'}" 
                            onclick="toggleWebsiteStatus(${website.id}, '${website.status === 'active' ? 'inactive' : 'active'}')">
                        <i class="fas fa-${website.status === 'active' ? 'pause' : 'play'}"></i>
                        ${website.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="editWebsite(${website.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteWebsite(${website.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderDeploymentsTable(deployments) {
    const tbody = document.getElementById('deploymentsTableBody');
    
    if (deployments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No deployments found</td></tr>';
        return;
    }
    
    tbody.innerHTML = deployments.map(deployment => `
        <tr>
            <td><i class="fas fa-${deployment.type === 'bot' ? 'robot' : 'globe'}"></i> ${deployment.type}</td>
            <td>${deployment.item_name || 'N/A'}</td>
            <td><span class="status-badge ${deployment.status}">${deployment.status}</span></td>
            <td>${deployment.url ? `<a href="${deployment.url}" target="_blank">${deployment.url}</a>` : 'N/A'}</td>
            <td>${new Date(deployment.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

// Modal functions
function showUploadModal(type) {
    currentUploadType = type;
    const modal = document.getElementById('uploadModal');
    const modalTitle = document.getElementById('modalTitle');
    const typeGroup = document.getElementById('typeGroup');
    const domainGroup = document.getElementById('domainGroup');
    
    modalTitle.textContent = type === 'bot' ? 'Upload New Bot' : 'Deploy New Website';
    
    if (type === 'bot') {
        typeGroup.style.display = 'block';
        domainGroup.style.display = 'none';
        document.getElementById('itemFile').accept = '.js,.py,.json,.zip,.tar.gz';
    } else {
        typeGroup.style.display = 'none';
        domainGroup.style.display = 'block';
        document.getElementById('itemFile').accept = '.html,.css,.js,.zip,.tar.gz';
    }
    
    modal.classList.add('active');
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.classList.remove('active');
    document.getElementById('uploadForm').reset();
    currentUploadType = null;
}

async function handleUpload(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('itemName').value);
    formData.append('description', document.getElementById('itemDescription').value);
    formData.append('file', document.getElementById('itemFile').files[0]);
    
    if (currentUploadType === 'bot') {
        formData.append('type', document.getElementById('itemType').value);
    } else {
        formData.append('domain', document.getElementById('itemDomain').value);
    }
    
    try {
        const endpoint = currentUploadType === 'bot' ? '/api/bots' : '/api/websites';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            closeUploadModal();
            
            // Refresh relevant section
            if (currentUploadType === 'bot') {
                loadBots();
                loadDashboardData();
            } else {
                loadWebsites();
                loadDashboardData();
            }
        } else {
            showNotification(data.error || 'Upload failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

// Bot management functions
async function toggleBotStatus(botId, newStatus) {
    try {
        const response = await fetch(`/api/bots/${botId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            loadBots();
            loadDashboardData();
        } else {
            showNotification(data.error || 'Status update failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

function editBot(botId) {
    // TODO: Implement edit functionality
    showNotification('Edit functionality coming soon!', 'warning');
}

async function deleteBot(botId) {
    if (!confirm('Are you sure you want to delete this bot?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/bots/${botId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showNotification('Bot deleted successfully', 'success');
            loadBots();
            loadDashboardData();
        } else {
            const data = await response.json();
            showNotification(data.error || 'Delete failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

// Website management functions
async function toggleWebsiteStatus(websiteId, newStatus) {
    try {
        const response = await fetch(`/api/websites/${websiteId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            loadWebsites();
            loadDashboardData();
        } else {
            showNotification(data.error || 'Status update failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

function editWebsite(websiteId) {
    // TODO: Implement edit functionality
    showNotification('Edit functionality coming soon!', 'warning');
}

async function deleteWebsite(websiteId) {
    if (!confirm('Are you sure you want to delete this website?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/websites/${websiteId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showNotification('Website deleted successfully', 'success');
            loadWebsites();
            loadDashboardData();
        } else {
            const data = await response.json();
            showNotification(data.error || 'Delete failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 3000;

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'ntandostore-secret-key-2024';

// Ensure JWT_SECRET is set in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required in production');
  console.error('Please set JWT_SECRET in your Render.com environment variables');
  // Use a fallback for initial deployment but warn strongly
  console.warn('⚠️  Using fallback JWT_SECRET - PLEASE SET PROPERLY IN RENDER DASHBOARD!');
  process.env.JWT_SECRET = 'ntandostore-emergency-fallback-' + Date.now();
}

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const USERS_DIR = path.join(__dirname, 'users');
const DOMAINS_FILE = path.join(__dirname, 'domains.json');
const USERS_FILE = path.join(__dirname, 'users.json');

// Create directories if they don't exist
async function ensureDirectories() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(USERS_DIR, { recursive: true });
    
    // Initialize files if they don't exist
    try {
      await fs.access(DOMAINS_FILE);
    } catch {
      await fs.writeFile(DOMAINS_FILE, JSON.stringify({}));
    }
    
    try {
      await fs.access(USERS_FILE);
    } catch {
      await fs.writeFile(USERS_FILE, JSON.stringify({}));
    }
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

// Initialize directories on startup
ensureDirectories();

// Middleware
app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/hosted', express.static(UPLOADS_DIR));
app.use('/users', express.static(USERS_DIR));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Generate unique subdomain
function generateSubdomain(username) {
  const adjectives = ['quick', 'bright', 'clever', 'swift', 'smart', 'happy', 'lucky', 'sunny', 'cool', 'warm'];
  const nouns = ['site', 'web', 'page', 'space', 'zone', 'hub', 'spot', 'place', 'world', 'realm'];
  const numbers = Math.floor(Math.random() * 9999) + 1;
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${username}-${adjective}${noun}${numbers}`;
}

// Validate username
function validateUsername(username) {
  // Check if username is alphanumeric and allows hyphens and underscores
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(username)) {
    return false;
  }
  
  // Check length (3-30 characters)
  if (username.length < 3 || username.length > 30) {
    return false;
  }
  
  // Check if it starts or ends with hyphen or underscore
  if (username.startsWith('-') || username.endsWith('-') || username.startsWith('_') || username.endsWith('_')) {
    return false;
  }
  
  // Reserved usernames
  const reserved = ['www', 'api', 'admin', 'dashboard', 'mail', 'ftp', 'cdn', 'static', 'assets', 'hosted', 'users'];
  if (reserved.includes(username.toLowerCase())) {
    return false;
  }
  
  return true;
}

// Validate subdomain
function validateSubdomain(subdomain) {
  const validPattern = /^[a-zA-Z0-9-]+$/;
  if (!validPattern.test(subdomain)) {
    return false;
  }
  
  if (subdomain.length < 3 || subdomain.length > 63) {
    return false;
  }
  
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return false;
  }
  
  return true;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (!validateUsername(username)) {
      return res.status(400).json({ error: 'Invalid username. Use 3-30 characters, letters, numbers, hyphens, and underscores only.' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Read existing users
    let users = {};
    try {
      const usersData = await fs.readFile(USERS_FILE, 'utf8');
      users = JSON.parse(usersData);
    } catch (error) {
      // File doesn't exist or is empty
    }
    
    // Check if username or email already exists
    if (Object.values(users).some(user => user.username === username)) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    if (Object.values(users).some(user => user.email === email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    
    // Create user
    const user = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      subdomain: generateSubdomain(username),
      sites: []
    };
    
    users[userId] = user;
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    
    // Create user directory
    const userDir = path.join(USERS_DIR, user.subdomain);
    await fs.mkdir(userDir, { recursive: true });
    
    // Generate JWT token
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      success: true, 
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        subdomain: user.subdomain
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Read users
    let users = {};
    try {
      const usersData = await fs.readFile(USERS_FILE, 'utf8');
      users = JSON.parse(usersData);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Find user
    const user = Object.values(users).find(u => u.username === username);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        subdomain: user.subdomain
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get available templates
app.get('/api/templates', (req, res) => {
  const templates = [
    {
      id: 'portfolio',
      name: 'Portfolio Website',
      description: 'Clean portfolio template for showcasing your work',
      category: 'portfolio',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Portfolio</title>
</head>
<body>
    <header>
        <nav>
            <h1>John Doe</h1>
            <ul>
                <li><a href="#about">About</a></li>
                <li><a href="#projects">Projects</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    <main>
        <section id="hero">
            <h2>Web Developer & Designer</h2>
            <p>Creating beautiful and functional web experiences</p>
        </section>
        <section id="about">
            <h2>About Me</h2>
            <p>I'm a passionate developer with expertise in modern web technologies.</p>
        </section>
        <section id="projects">
            <h2>Projects</h2>
            <div class="project-grid">
                <div class="project">
                    <h3>Project 1</h3>
                    <p>Amazing web application</p>
                </div>
                <div class="project">
                    <h3>Project 2</h3>
                    <p>Another awesome project</p>
                </div>
            </div>
        </section>
    </main>
</body>
</html>`,
      css: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
header { background: #2c3e50; color: white; padding: 1rem 0; position: fixed; width: 100%; top: 0; }
nav { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; padding: 0 2rem; }
nav ul { display: flex; list-style: none; gap: 2rem; }
nav a { color: white; text-decoration: none; }
main { margin-top: 80px; padding: 2rem; max-width: 1200px; margin-left: auto; margin-right: auto; }
#hero { text-align: center; padding: 4rem 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; margin: -2rem -2rem 2rem -2rem; }
.project-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-top: 2rem; }
.project { padding: 2rem; border: 1px solid #ddd; border-radius: 8px; }`
    },
    {
      id: 'business',
      name: 'Business Website',
      description: 'Professional business template',
      category: 'business',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Business</title>
</head>
<body>
    <header>
        <nav>
            <div class="logo">BusinessName</div>
            <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    <main>
        <section id="home">
            <h1>Welcome to Our Business</h1>
            <p>We provide exceptional services to help you succeed</p>
            <button>Get Started</button>
        </section>
        <section id="services">
            <h2>Our Services</h2>
            <div class="services-grid">
                <div class="service">
                    <h3>Service 1</h3>
                    <p>Professional service description</p>
                </div>
                <div class="service">
                    <h3>Service 2</h3>
                    <p>Another great service we offer</p>
                </div>
            </div>
        </section>
    </main>
</body>
</html>`,
      css: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; }
header { background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.1); position: fixed; width: 100%; top: 0; z-index: 1000; }
nav { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; padding: 1rem 2rem; }
.logo { font-size: 1.5rem; font-weight: bold; color: #2c3e50; }
nav ul { display: flex; list-style: none; gap: 2rem; }
nav a { color: #333; text-decoration: none; font-weight: 500; }
main { margin-top: 80px; }
#home { text-align: center; padding: 6rem 2rem; background: linear-gradient(135deg, #74b9ff, #0984e3); color: white; }
#home h1 { font-size: 3rem; margin-bottom: 1rem; }
#services { padding: 4rem 2rem; max-width: 1200px; margin: 0 auto; }
.services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-top: 2rem; }
.service { text-align: center; padding: 2rem; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
button { background: #0984e3; color: white; border: none; padding: 1rem 2rem; font-size: 1.1rem; border-radius: 5px; cursor: pointer; margin-top: 1rem; }`
    },
    {
      id: 'blog',
      name: 'Blog Template',
      description: 'Clean blog layout template',
      category: 'blog',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Blog</title>
</head>
<body>
    <header>
        <h1>My Awesome Blog</h1>
        <p>Sharing thoughts and ideas with the world</p>
    </header>
    <main>
        <section class="posts">
            <article class="post">
                <h2>First Blog Post</h2>
                <p class="meta">Published on January 1, 2024</p>
                <p>This is my first blog post where I share my thoughts on web development and technology...</p>
                <a href="#" class="read-more">Read More</a>
            </article>
            <article class="post">
                <h2>Another Interesting Post</h2>
                <p class="meta">Published on January 15, 2024</p>
                <p>In this post, I explore the latest trends in web design and user experience...</p>
                <a href="#" class="read-more">Read More</a>
            </article>
        </section>
    </main>
</body>
</html>`,
      css: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Georgia, serif; line-height: 1.8; background: #f8f9fa; }
header { text-align: center; padding: 3rem 2rem; background: white; border-bottom: 1px solid #ddd; }
header h1 { font-size: 2.5rem; color: #2c3e50; margin-bottom: 0.5rem; }
main { max-width: 800px; margin: 2rem auto; padding: 0 2rem; }
.post { background: white; padding: 2rem; margin-bottom: 2rem; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
.post h2 { color: #2c3e50; margin-bottom: 0.5rem; }
.meta { color: #666; font-size: 0.9rem; margin-bottom: 1rem; font-style: italic; }
.read-more { color: #3498db; text-decoration: none; font-weight: bold; }
.read-more:hover { text-decoration: underline; }`
    },
    {
      id: 'landing',
      name: 'Landing Page',
      description: 'Modern landing page template',
      category: 'landing',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amazing Product</title>
</head>
<body>
    <header>
        <nav>
            <div class="logo">ProductLogo</div>
            <button class="cta-button">Get Started</button>
        </nav>
    </header>
    <main>
        <section class="hero">
            <h1>Transform Your Business Today</h1>
            <p>The ultimate solution for modern enterprises looking to scale and succeed</p>
            <div class="hero-buttons">
                <button class="primary-btn">Start Free Trial</button>
                <button class="secondary-btn">Watch Demo</button>
            </div>
        </section>
        <section class="features">
            <h2>Why Choose Us?</h2>
            <div class="feature-grid">
                <div class="feature">
                    <h3>🚀 Fast Performance</h3>
                    <p>Lightning-fast speeds that keep your users engaged</p>
                </div>
                <div class="feature">
                    <h3>🔒 Secure Platform</h3>
                    <p>Enterprise-grade security to protect your data</p>
                </div>
                <div class="feature">
                    <h3>📊 Advanced Analytics</h3>
                    <p>Deep insights into your business performance</p>
                </div>
            </div>
        </section>
    </main>
</body>
</html>`,
      css: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; }
header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); position: fixed; width: 100%; top: 0; z-index: 1000; }
nav { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; }
.logo { font-size: 1.5rem; font-weight: bold; color: #2563eb; }
.cta-button { background: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer; }
main { margin-top: 80px; }
.hero { text-align: center; padding: 6rem 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
.hero h1 { font-size: 3.5rem; margin-bottom: 1rem; }
.hero p { font-size: 1.3rem; margin-bottom: 2rem; opacity: 0.9; }
.hero-buttons { display: flex; gap: 1rem; justify-content: center; }
.primary-btn { background: white; color: #667eea; padding: 1rem 2rem; border: none; border-radius: 8px; font-size: 1.1rem; cursor: pointer; }
.secondary-btn { background: transparent; color: white; border: 2px solid white; padding: 1rem 2rem; border-radius: 8px; font-size: 1.1rem; cursor: pointer; }
.features { padding: 4rem 2rem; max-width: 1200px; margin: 0 auto; }
.features h2 { text-align: center; font-size: 2.5rem; margin-bottom: 3rem; }
.feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
.feature { text-align: center; padding: 2rem; }
.feature h3 { font-size: 1.5rem; margin-bottom: 1rem; }`
    }
  ];
  
  res.json(templates);
});

// Upload and create a new site (protected route)
app.post('/api/upload', authenticateToken, async (req, res) => {
  try {
    const { html, css, js, siteName, siteSlug, favicon } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    // Get user info
    let users = {};
    try {
      const usersData = await fs.readFile(USERS_FILE, 'utf8');
      users = JSON.parse(usersData);
    } catch (error) {
      return res.status(500).json({ error: 'User data not found' });
    }

    const user = users[req.user.userId];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate site slug if not provided
    let slug = siteSlug;
    if (!slug) {
      slug = siteName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site';
    }

    // Validate slug
    if (!validateSubdomain(slug)) {
      return res.status(400).json({ error: 'Invalid site name. Use 3-63 characters, letters, numbers, and hyphens only.' });
    }

    // Ensure unique slug within user's subdomain
    let finalSlug = slug;
    let counter = 1;
    while (user.sites.some(site => site.slug === finalSlug)) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    // Create site directory
    const userSubdomain = user.subdomain;
    const siteDir = path.join(USERS_DIR, userSubdomain, finalSlug);
    await fs.mkdir(siteDir, { recursive: true });

    // Create index.html with favicon if provided
    let fullHtml = html;
    
    // Add favicon if provided
    if (favicon) {
      fullHtml = fullHtml.replace('<head>', `<head>\n    <link rel="icon" href="data:image/x-icon;base64,${favicon}">`);
    }
    
    // Add CSS
    if (css) {
      fullHtml = fullHtml.replace('</head>', `<style>${css}</style></head>`);
    }
    
    // Add JavaScript
    if (js) {
      fullHtml = fullHtml.replace('</body>', `<script>${js}</script></body>`);
    }

    await fs.writeFile(path.join(siteDir, 'index.html'), fullHtml);

    // Add site to user's sites
    const site = {
      id: crypto.randomUUID(),
      name: siteName || 'Untitled Site',
      slug: finalSlug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      visits: 0,
      published: true
    };

    user.sites.push(site);
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));

    res.json({ 
      success: true, 
      slug: finalSlug,
      url: `/${userSubdomain}/${finalSlug}/`,
      fullUrl: `${req.protocol}://${req.get('host')}/${userSubdomain}/${finalSlug}/`,
      message: 'Site published successfully!',
      site
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload site' });
  }
});

// Update existing site (protected route)
app.put('/api/sites/:siteId', authenticateToken, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { html, css, js, siteName, favicon } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    // Get user info
    let users = {};
    try {
      const usersData = await fs.readFile(USERS_FILE, 'utf8');
      users = JSON.parse(usersData);
    } catch (error) {
      return res.status(500).json({ error: 'User data not found' });
    }

    const user = users[req.user.userId];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the site
    const site = user.sites.find(s => s.id === siteId);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Create backup before updating
    const userSubdomain = user.subdomain;
    const siteDir = path.join(USERS_DIR, userSubdomain, site.slug);
    const backupDir = path.join(siteDir, 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.html`);
    
    try {
      const currentHtml = await fs.readFile(path.join(siteDir, 'index.html'), 'utf8');
      await fs.writeFile(backupFile, currentHtml);
    } catch (error) {
      console.log('No existing file to backup');
    }

    // Create updated HTML
    let fullHtml = html;
    
    if (favicon) {
      fullHtml = fullHtml.replace('<head>', `<head>\n    <link rel="icon" href="data:image/x-icon;base64,${favicon}">`);
    }
    
    if (css) {
      fullHtml = fullHtml.replace('</head>', `<style>${css}</style></head>`);
    }
    
    if (js) {
      fullHtml = fullHtml.replace('</body>', `<script>${js}</script></body>`);
    }

    await fs.writeFile(path.join(siteDir, 'index.html'), fullHtml);

    // Update site info
    site.name = siteName || site.name;
    site.updatedAt = new Date().toISOString();
    
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));

    res.json({ 
      success: true, 
      message: 'Site updated successfully!',
      url: `/${userSubdomain}/${site.slug}/`,
      site
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update site' });
  }
});

// Get user's sites (protected route)
app.get('/api/user/sites', authenticateToken, async (req, res) => {
  try {
    // Get user info
    let users = {};
    try {
      const usersData = await fs.readFile(USERS_FILE, 'utf8');
      users = JSON.parse(usersData);
    } catch (error) {
      return res.json([]);
    }

    const user = users[req.user.userId];
    if (!user) {
      return res.json([]);
    }

    const sites = user.sites.map(site => ({
      ...site,
      url: `/${user.subdomain}/${site.slug}/`,
      fullUrl: `${req.protocol}://${req.get('host')}/${user.subdomain}/${site.slug}/`
    }));

    res.json(sites);
  } catch (error) {
    console.error('Error loading sites:', error);
    res.json([]);
  }
});

// Get site details for editing (protected route)
app.get('/api/sites/:siteId', authenticateToken, async (req, res) => {
  try {
    const { siteId } = req.params;

    // Get user info
    let users = {};
    try {
      const usersData = await fs.readFile(USERS_FILE, 'utf8');
      users = JSON.parse(usersData);
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const user = users[req.user.userId];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the site
    const site = user.sites.find(s => s.id === siteId);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Read the HTML file
    const siteDir = path.join(USERS_DIR, user.subdomain, site.slug);
    const htmlPath = path.join(siteDir, 'index.html');
    
    let html = '';
    try {
      html = await fs.readFile(htmlPath, 'utf8');
    } catch (error) {
      return res.status(404).json({ error: 'Site files not found' });
    }

    res.json({
      site,
      html,
      url: `/${user.subdomain}/${site.slug}/`,
      fullUrl: `${req.protocol}://${req.get('host')}/${user.subdomain}/${site.slug}/`
    });

  } catch (error) {
    console.error('Error loading site:', error);
    res.status(500).json({ error: 'Failed to load site' });
  }
});

// Delete site (protected route)
app.delete('/api/sites/:siteId', authenticateToken, async (req, res) => {
  try {
    const { siteId } = req.params;

    // Get user info
    let users = {};
    try {
      const usersData = await fs.readFile(USERS_FILE, 'utf8');
      users = JSON.parse(usersData);
    } catch (error) {
      return res.status(500).json({ error: 'User data not found' });
    }

    const user = users[req.user.userId];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the site
    const siteIndex = user.sites.findIndex(s => s.id === siteId);
    if (siteIndex === -1) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const site = user.sites[siteIndex];

    // Remove site directory
    const siteDir = path.join(USERS_DIR, user.subdomain, site.slug);
    await fs.rm(siteDir, { recursive: true, force: true });
    
    // Remove from user's sites
    user.sites.splice(siteIndex, 1);
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));

    res.json({ success: true, message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete site' });
  }
});

// Serve user subdomain sites
app.get('/:subdomain/:slug/', async (req, res, next) => {
  try {
    const { subdomain, slug } = req.params;
    
    // Check if this is a user subdomain
    const userDir = path.join(USERS_DIR, subdomain, slug);
    const filePath = path.join(userDir, 'index.html');

    try {
      // Update visit count
      let users = {};
      try {
        const usersData = await fs.readFile(USERS_FILE, 'utf8');
        users = JSON.parse(usersData);
        
        // Find user by subdomain
        const user = Object.values(users).find(u => u.subdomain === subdomain);
        if (user) {
          const site = user.sites.find(s => s.slug === slug);
          if (site) {
            site.visits = (site.visits || 0) + 1;
            await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
          }
        }
      } catch (error) {
        console.error('Error updating visit count:', error);
      }

      // Serve the file
      res.sendFile(filePath);
    } catch (error) {
      next();
    }
  } catch (error) {
    next();
  }
});

// Serve user subdomain root (redirect to first site or dashboard)
app.get('/:subdomain/', async (req, res, next) => {
  try {
    const { subdomain } = req.params;
    
    // Find user by subdomain
    let users = {};
    try {
      const usersData = await fs.readFile(USERS_FILE, 'utf8');
      users = JSON.parse(usersData);
    } catch (error) {
      return next();
    }

    const user = Object.values(users).find(u => u.subdomain === subdomain);
    if (!user) {
      return next();
    }

    // Redirect to first site if exists, otherwise to dashboard
    if (user.sites.length > 0) {
      res.redirect(`/${subdomain}/${user.sites[0].slug}/`);
    } else {
      res.redirect('/dashboard');
    }
  } catch (error) {
    next();
  }
});

// Keep backward compatibility for old hosted sites
app.get('/hosted/:domain/*', async (req, res) => {
  try {
    const { domain } = req.params;
    const requestedPath = req.params[0] || 'index.html';
    const filePath = path.join(UPLOADS_DIR, domain, requestedPath);

    // Update visit count
    let domains = {};
    try {
      const domainsData = await fs.readFile(DOMAINS_FILE, 'utf8');
      domains = JSON.parse(domainsData);
      if (domains[domain]) {
        domains[domain].visits = (domains[domain].visits || 0) + 1;
        await fs.writeFile(DOMAINS_FILE, JSON.stringify(domains, null, 2));
      }
    } catch (error) {
      console.error('Error updating visit count:', error);
    }

    // Serve the file
    res.sendFile(filePath);
  } catch (error) {
    res.status(404).send('Site not found');
  }
});

// API to get all hosted sites (backward compatibility)
app.get('/api/sites', async (req, res) => {
  try {
    const domainsData = await fs.readFile(DOMAINS_FILE, 'utf8');
    const domains = JSON.parse(domainsData);
    
    const sites = Object.entries(domains).map(([domain, info]) => ({
      domain,
      name: info.name,
      createdAt: info.createdAt,
      visits: info.visits,
      isCustom: info.isCustom || false,
      url: `/${domain}/`,
      oldUrl: `/hosted/${domain}/`
    }));

    res.json(sites);
  } catch (error) {
    res.json([]);
  }
});

// Health check endpoint for render.com
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Ntandostore Enhanced Free Hosting',
    features: ['Subdomains', 'User System', 'Site Editing', 'Templates', 'Backups'],
    timestamp: new Date().toISOString() 
  });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ntandostore Enhanced Hosting running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${UPLOADS_DIR}`);
  console.log(`👥 Users directory: ${USERS_DIR}`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✨ Features: Subdomains, user system, site editing, templates, backups`);
  
  // Log important directories for Render.com deployment
  if (process.env.NODE_ENV === 'production') {
    console.log(`📂 Production directories:`);
    console.log(`   - Uploads: ${UPLOADS_DIR}`);
    console.log(`   - Users: ${USERS_DIR}`);
    console.log(`   - Domains: ${DOMAINS_FILE}`);
    console.log(`   - User DB: ${USERS_FILE}`);
    console.log(`🌐 Ready for production traffic on Render.com`);
  }
});
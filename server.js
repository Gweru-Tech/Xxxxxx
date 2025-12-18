const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const cron = require('node-cron');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// File upload configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = file.fieldname === 'bot' ? 'uploads/bots' : 'uploads/websites';
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueName}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.js', '.py', '.html', '.css', '.json', '.zip', '.tar.gz'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Database setup
const db = new sqlite3.Database(process.env.DATABASE_PATH || './database.sqlite');

// Initialize database tables
const initializeDatabase = () => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
  )`);

  // Bots table
  db.run(`CREATE TABLE IF NOT EXISTS bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    status TEXT DEFAULT 'stopped',
    config TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Websites table
  db.run(`CREATE TABLE IF NOT EXISTS websites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    domain TEXT,
    file_path TEXT NOT NULL,
    status TEXT DEFAULT 'inactive',
    config TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Deployments table
  db.run(`CREATE TABLE IF NOT EXISTS deployments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    url TEXT,
    logs TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Sessions table
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
};

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// API Routes

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
      [username, email, hashedPassword], 
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }

        const token = jwt.sign(
          { id: this.lastID, username, email, role: 'user' },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.status(201).json({
          message: 'User created successfully',
          token,
          user: { id: this.lastID, username, email, role: 'user' }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user || !user.is_active) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Bot management routes
app.get('/api/bots', authenticateToken, (req, res) => {
  db.all('SELECT * FROM bots WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, bots) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(bots);
  });
});

app.post('/api/bots', authenticateToken, upload.single('bot'), (req, res) => {
  const { name, description, type, config } = req.body;
  
  if (!name || !type || !req.file) {
    return res.status(400).json({ error: 'Name, type, and file are required' });
  }

  db.run('INSERT INTO bots (user_id, name, description, type, file_path, config) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, name, description, type, req.file.path, config],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({
        message: 'Bot uploaded successfully',
        bot: { id: this.lastID, name, description, type, file_path: req.file.path }
      });
    }
  );
});

app.put('/api/bots/:id/status', authenticateToken, (req, res) => {
  const { status } = req.body;
  const botId = req.params.id;

  if (!['running', 'stopped'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run('UPDATE bots SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [status, botId, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Bot not found' });
      }
      res.json({ message: `Bot ${status} successfully` });
    }
  );
});

// Website management routes
app.get('/api/websites', authenticateToken, (req, res) => {
  db.all('SELECT * FROM websites WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, websites) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(websites);
  });
});

app.post('/api/websites', authenticateToken, upload.single('website'), (req, res) => {
  const { name, domain, config } = req.body;
  
  if (!name || !req.file) {
    return res.status(400).json({ error: 'Name and file are required' });
  }

  db.run('INSERT INTO websites (user_id, name, domain, file_path, config) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, name, domain, req.file.path, config],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({
        message: 'Website uploaded successfully',
        website: { id: this.lastID, name, domain, file_path: req.file.path }
      });
    }
  );
});

app.put('/api/websites/:id/status', authenticateToken, (req, res) => {
  const { status } = req.body;
  const websiteId = req.params.id;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run('UPDATE websites SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [status, websiteId, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Website not found' });
      }
      res.json({ message: `Website ${status} successfully` });
    }
  );
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const stats = {};
  
  db.get('SELECT COUNT(*) as count FROM bots WHERE user_id = ?', [req.user.id], (err, botRow) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    stats.totalBots = botRow.count;
    
    db.get('SELECT COUNT(*) as count FROM bots WHERE user_id = ? AND status = "running"', [req.user.id], (err, runningBotRow) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      stats.runningBots = runningBotRow.count;
      
      db.get('SELECT COUNT(*) as count FROM websites WHERE user_id = ?', [req.user.id], (err, websiteRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        stats.totalWebsites = websiteRow.count;
        
        db.get('SELECT COUNT(*) as count FROM websites WHERE user_id = ? AND status = "active"', [req.user.id], (err, activeWebsiteRow) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          stats.activeWebsites = activeWebsiteRow.count;
          
          res.json(stats);
        });
      });
    });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cron job for cleanup (runs daily at 2 AM)
cron.schedule('0 2 * * *', () => {
  console.log('Running daily cleanup...');
  db.run('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP');
});

// Initialize database and start server
initializeDatabase();

app.listen(PORT, () => {
  console.log(`Bot Hosting Platform running on port ${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}`);
});

module.exports = app;
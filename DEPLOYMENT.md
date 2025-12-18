# Deployment Guide

## Quick Deployment on Render.com

### Prerequisites
- GitHub account
- Render.com account (free tier available)

### Step 1: Fork and Prepare Repository

1. **Fork this repository** to your GitHub account
2. **Clone your fork locally** (optional, for testing):
```bash
git clone https://github.com/YOUR_USERNAME/bot-hosting-platform.git
cd bot-hosting-platform
```

### Step 2: Deploy to Render.com

#### Option A: Automatic Deploy (Recommended)

1. **Login to Render.com**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure deployment settings:**
   - **Name**: `bot-hosting-platform`
   - **Environment**: `Node`
   - **Root Directory**: `.` (leave empty)
   - **Runtime**: `Node 18`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Starter` ($7/month) or `Free` (limited)
   - **Add Disk**: 10GB for uploads

5. **Add Environment Variables** (in "Environment" tab):
```
NODE_ENV=production
JWT_SECRET=your-super-secure-random-jwt-secret-here
DATABASE_PATH=/opt/render/project/src/database.sqlite
MAX_FILE_SIZE=104857600
RATE_LIMIT_MAX_REQUESTS=100
```

6. **Deploy**: Click "Create Web Service"
7. **Wait for deployment** (takes 2-5 minutes)

#### Option B: Using render.yaml

1. **Push your code** to GitHub with the `render.yaml` file
2. **In Render.com**, click "New +" → "Web Service"
3. **Connect repository** and select "Existing render.yaml"
4. **Review configuration** and deploy

### Step 3: Configure Your Platform

1. **Access your platform** at `https://your-service-name.onrender.com`
2. **Create an admin account**:
   - Click "Register"
   - Use your email and a secure password
   - The first user will have admin privileges

3. **Test functionality**:
   - Upload a test bot (simple JavaScript file)
   - Deploy a test website (HTML/CSS files)
   - Check dashboard statistics

## Alternative Deployment Options

### Option 1: Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/bot-hosting-platform.git
cd bot-hosting-platform

# Use the startup script
./start.sh setup
./start.sh dev

# Or manually
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev
```

### Option 2: Docker Deployment

```bash
# Build and run with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Option 3: Manual Server Deployment

#### System Requirements
- Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- Node.js 18+
- 2GB RAM minimum
- 10GB storage minimum

#### Installation Steps

1. **Install Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Clone and setup**:
```bash
sudo mkdir -p /var/www/bot-hosting
cd /var/www/bot-hosting
sudo chown $USER:$USER .
git clone https://github.com/YOUR_USERNAME/bot-hosting-platform.git .
./start.sh setup
```

3. **Configure PM2** (for process management):
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

4. **Set up Nginx** (reverse proxy):
```bash
sudo apt install nginx
sudo cp nginx.conf /etc/nginx/sites-available/bot-hosting
sudo ln -s /etc/nginx/sites-available/bot-hosting /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Configuration Details

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Application environment |
| `PORT` | No | `3000` | Server port |
| `JWT_SECRET` | Yes | Random | JWT signing secret |
| `DATABASE_PATH` | No | `./database.sqlite` | SQLite database path |
| `DATABASE_URL` | No | - | PostgreSQL connection string |
| `MAX_FILE_SIZE` | No | `104857600` | Max upload size (100MB) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Rate limit per 15min window |

### Database Setup

#### SQLite (Default)
- No additional setup required
- Database file created automatically
- Suitable for small to medium deployments

#### PostgreSQL (Recommended for production)
1. **Create database**:
```sql
CREATE DATABASE bot_hosting;
CREATE USER bot_hosting_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE bot_hosting TO bot_hosting_user;
```

2. **Set environment variable**:
```bash
DATABASE_URL=postgresql://bot_hosting_user:secure_password@localhost:5432/bot_hosting
```

### File Storage

#### Local Storage (Default)
- Files stored in `uploads/` directory
- Suitable for single-server deployments
- Set up backups for data safety

#### Cloud Storage (Advanced)
- Configure AWS S3, Google Cloud Storage, or similar
- Update file upload handlers in `server.js`
- Suitable for multi-server deployments

## Security Configuration

### SSL/HTTPS

#### Render.com (Automatic)
- SSL certificates automatically provisioned
- HTTPS enforced by default

#### Manual Setup
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com
```

### Firewall Setup
```bash
# Allow necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### Security Headers
The application includes security headers via Helmet.js:
- XSS Protection
- Content Security Policy
- HSTS (in production)
- Frame protection

## Monitoring and Maintenance

### Health Checks

#### Application Health
```bash
curl https://your-domain.com/api/health
```

#### Expected Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Logging

#### Application Logs
- Development: Console output
- Production: Write to `logs/` directory
- Render.com: Available in dashboard

#### Log Rotation (Linux)
```bash
# Create logrotate config
sudo nano /etc/logrotate.d/bot-hosting

# Content:
/var/www/bot-hosting/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload all
    endscript
}
```

### Backups

#### Database Backups
```bash
# SQLite
cp database.sqlite backups/database-$(date +%Y%m%d).sqlite

# PostgreSQL
pg_dump bot_hosting > backups/database-$(date +%Y%m%d).sql
```

#### File Backups
```bash
# Upload files
rsync -av uploads/ backups/uploads-$(date +%Y%m%d)/
```

### Automated Backups
```bash
# Create backup script
nano /usr/local/bin/backup-bot-hosting

# Make executable
chmod +x /usr/local/bin/backup-bot-hosting

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /usr/local/bin/backup-bot-hosting
```

## Performance Optimization

### Node.js Optimization
```bash
# Increase memory limit
node --max-old-space-size=4096 server.js

# Enable clustering (in production)
pm2 start server.js -i max
```

### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_bots_user_status ON bots(user_id, status);
CREATE INDEX idx_websites_user_status ON websites(user_id, status);
```

### Nginx Optimization
```nginx
# Add to nginx.conf
gzip on;
gzip_types text/plain text/css application/json application/javascript;
client_max_body_size 100M;
```

## Troubleshooting

### Common Issues

#### Application Won't Start
1. Check Node.js version (`node -v`)
2. Verify dependencies (`npm install`)
3. Check environment variables
4. Review logs for errors

#### Database Connection Issues
1. Verify database file permissions
2. Check database server status
3. Test connection string
4. Review firewall settings

#### File Upload Issues
1. Check upload directory permissions
2. Verify file size limits
3. Check disk space
4. Review file type restrictions

#### Performance Issues
1. Monitor resource usage
2. Check database query performance
3. Review bot resource consumption
4. Consider scaling horizontally

### Debug Mode

#### Enable Debug Logging
```bash
# Set environment variable
export DEBUG=bot-hosting:*
npm start
```

#### View Process Information
```bash
# PM2 status
pm2 status
pm2 logs

# System resources
htop
df -h
free -h
```

## Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Database replication
- Shared file storage
- Session management

### Vertical Scaling
- Increase CPU/RAM allocation
- Optimize database queries
- Implement caching
- Use CDN for static assets

## Support

### Getting Help
1. **Check logs** for error messages
2. **Review documentation** in README.md
3. **Search issues** on GitHub
4. **Create new issue** with details

### Performance Monitoring
- Use Render.com dashboard metrics
- Implement custom monitoring
- Set up alerting for critical issues
- Monitor user activity and resource usage

---

For additional support, visit our [GitHub repository](https://github.com/YOUR_USERNAME/bot-hosting-platform) or [open an issue](https://github.com/YOUR_USERNAME/bot-hosting-platform/issues).
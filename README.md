# Bot Hosting Platform

A comprehensive platform for hosting bots and websites with an intuitive admin dashboard. Built with Node.js, Express, and modern web technologies, deployable on Render.com.

## Features

### 🤖 Bot Management
- Upload and manage multiple bot types (Discord, Telegram, Slack, Custom)
- Start/stop/restart bot instances
- Real-time status monitoring
- Bot health checks and auto-recovery
- Support for JavaScript, Python, and Docker-based bots

### 🌐 Website Hosting
- Deploy static websites and web applications
- Custom domain support
- SSL certificate management
- Website performance monitoring
- Easy file upload and management

### 📊 Dashboard & Analytics
- Real-time statistics and monitoring
- Resource usage tracking
- Deployment history
- Activity logs
- User management

### 🔒 Security & Performance
- JWT-based authentication
- Role-based access control
- Rate limiting and DDoS protection
- Encrypted file storage
- Regular security updates

### 🎨 Modern UI/UX
- Responsive design for all devices
- Dark/light theme toggle
- Real-time notifications
- Intuitive navigation
- Loading states and animations

## Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/bot-hosting-platform.git
cd bot-hosting-platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start the application**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

5. **Access the dashboard**
Open your browser and navigate to `http://localhost:3000`

## Deployment on Render.com

### Option 1: Auto-Deploy (Recommended)

1. **Fork this repository** to your GitHub account
2. **Connect to Render.com**
   - Sign up/login to [Render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Use the following settings:
     - **Name**: `bot-hosting-platform`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: `Starter` or higher

3. **Configure Environment Variables**
   - Go to your service settings → Environment
   - Add variables from `.env.example`
   - Generate a secure JWT_SECRET

4. **Deploy**
   - Render will automatically build and deploy your application
   - Your platform will be available at `https://bot-hosting-platform.onrender.com`

### Option 2: Manual Deploy with render.yaml

1. **Connect your repository** to Render.com
2. **Create a new Web Service** using the `render.yaml` configuration
3. **Render will automatically**:
   - Set up the main web application
   - Create a background worker for bot management
   - Configure database and storage
   - Set up health checks and monitoring

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `development` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT signing secret | Random |
| `DATABASE_PATH` | SQLite database path | `./database.sqlite` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `104857600` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### Database Setup

#### SQLite (Default)
No additional setup required. The database file will be created automatically.

#### PostgreSQL (Recommended for production)
1. Set `DATABASE_URL` in your environment variables
2. Example: `postgresql://username:password@host:port/database`

## API Documentation

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "securepassword123"
}
```

### Bots

#### Get All Bots
```http
GET /api/bots
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Upload Bot
```http
POST /api/bots
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

name: My Bot
type: discord
file: [bot file]
```

#### Update Bot Status
```http
PUT /api/bots/:id/status
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "status": "running"
}
```

### Websites

#### Get All Websites
```http
GET /api/websites
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Deploy Website
```http
POST /api/websites
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

name: My Website
domain: example.com
file: [website files]
```

## User Guide

### Getting Started

1. **Create an Account**
   - Visit the dashboard
   - Click "Register"
   - Fill in your details
   - Verify your email (if enabled)

2. **Upload Your First Bot**
   - Navigate to "Bots" section
   - Click "Add New Bot"
   - Fill in bot details
   - Upload your bot files
   - Click "Upload"

3. **Deploy a Website**
   - Go to "Websites" section
   - Click "Add New Website"
   - Enter website details
   - Upload your website files
   - Deploy automatically

### Managing Bots

- **Start/Stop**: Use the control buttons in the bots table
- **Monitor**: Check real-time status and logs
- **Configure**: Edit bot settings and environment variables
- **Delete**: Remove bots permanently

### Managing Websites

- **Deploy**: Upload and activate websites
- **Custom Domains**: Configure custom domain names
- **SSL**: Automatic SSL certificate provisioning
- **Analytics**: Monitor website performance

## Development

### Project Structure
```
bot-hosting-platform/
├── public/                 # Frontend assets
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   └── index.html         # Main dashboard
├── uploads/               # User uploads
├── backups/               # Database backups
├── server.js              # Main server application
├── worker.js              # Background worker
├── package.json           # Dependencies
├── render.yaml            # Render.com configuration
├── .env.example           # Environment variables template
└── README.md              # This file
```

### Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Install dependencies
npm install

# Run health check
curl http://localhost:3000/api/health
```

### Adding New Features

1. **Backend**: Add routes to `server.js`
2. **Frontend**: Update `public/js/app.js`
3. **Styles**: Modify `public/css/style.css`
4. **Worker**: Add background tasks to `worker.js`

## Security

### Built-in Security Features
- JWT authentication with secure tokens
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Input validation and sanitization
- HTTPS enforcement in production
- Regular security updates

### Best Practices
- Use strong, unique passwords
- Enable two-factor authentication (when available)
- Regularly update dependencies
- Monitor access logs
- Use environment variables for secrets

## Monitoring & Maintenance

### Health Checks
- Automatic health monitoring
- Bot process monitoring
- Website availability checks
- Database connection verification

### Backups
- Automatic daily database backups
- File backup to external storage
- Retention policy (7 days by default)
- Manual backup triggers

### Logs
- Application logs with levels
- Error tracking and reporting
- Performance metrics
- User activity auditing

## Troubleshooting

### Common Issues

#### Bot Won't Start
- Check file format and permissions
- Verify bot dependencies
- Review error logs
- Check resource limits

#### Website Not Accessible
- Verify domain configuration
- Check DNS settings
- Review SSL certificate status
- Check file permissions

#### Performance Issues
- Monitor resource usage
- Check database queries
- Review bot performance
- Optimize file sizes

### Getting Help

1. **Check the logs**: View application and worker logs
2. **Review documentation**: Consult this README and API docs
3. **Community support**: Visit our GitHub discussions
4. **Issue tracking**: Report bugs on GitHub issues

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

### Code Style
- Use ESLint for JavaScript
- Follow Prettier formatting
- Write meaningful commit messages
- Include tests for new features

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Support

- **Documentation**: [Full documentation](https://docs.bot-hosting-platform.com)
- **Community**: [GitHub Discussions](https://github.com/your-username/bot-hosting-platform/discussions)
- **Issues**: [GitHub Issues](https://github.com/your-username/bot-hosting-platform/issues)
- **Email**: support@bot-hosting-platform.com

## Roadmap

### Upcoming Features
- [ ] Multi-language support
- [ ] Advanced bot templates
- [ ] Integration marketplace
- [ ] Mobile app
- [ ] Advanced analytics
- [ ] Team collaboration
- [ ] API versioning
- [ ] Webhook support

### Future Enhancements
- [ ] Machine learning bot templates
- [ ] Advanced security features
- [ ] Performance optimization
- [ ] Custom themes
- [ ] Plugin system
- [ ] Advanced monitoring
- [ ] Auto-scaling
- [ ] Edge deployment

---

**Built with ❤️ by the Bot Hosting Platform Team**
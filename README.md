# Ntandostore Enhanced - Subdomain Hosting Platform

A powerful free website hosting platform with user accounts, subdomain support, site editing, and advanced features.

## 🚀 Major Enhancements

### New Features Added:
- 👥 **User Authentication System** - Secure registration and login
- 🌐 **Subdomain Hosting** - Each user gets unique subdomain (username-random.ntandostore)
- ✏️ **Site Editing** - Edit deployed sites with automatic backups
- 🎨 **Professional Templates** - Portfolio, Business, Blog, and Landing page templates
- 🔐 **Automatic Backups** - Backups created before each site update
- 📊 **Enhanced Analytics** - Track visits and site performance
- 🌙 **Dark Mode Dashboard** - Modern UI with light/dark theme toggle
- 🔍 **Live Preview** - Preview sites before deployment
- 📱 **QR Code Sharing** - Generate QR codes for easy mobile sharing

## 🌐 URL Structure

### New Subdomain System:
- **User Root**: `username-random123.ntandostore`
- **Site Pages**: `username-random123/sitename.ntandostore`
- **Direct Access**: Clean URLs without `/hosted/` prefix

### Example URLs:
```
https://john-quick5678.ntandostore/
https://john-quick5678/portfolio.ntandostore/
https://john-quick5678/business.ntandostore/
https://john-quick5678/blog.ntandostore/
```

## 🏗️ Architecture

### Backend Enhancements:
- **User System**: JWT authentication, secure password hashing
- **File Storage**: Organized by user subdomains in `/users/` directory
- **API Routes**: RESTful APIs for user management and site CRUD operations
- **Backup System**: Automatic versioning with timestamps

### Frontend Enhancements:
- **Authentication UI**: Login/Register forms with validation
- **Dashboard**: Complete site management interface
- **Code Editor**: HTML/CSS/JS editor with syntax highlighting
- **Template Gallery**: Visual template selection and preview

## 📋 API Endpoints

### Authentication:
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/user/sites` - Get user's sites (protected)

### Site Management:
- `POST /api/upload` - Create new site (protected)
- `PUT /api/sites/:siteId` - Update existing site (protected)
- `GET /api/sites/:siteId` - Get site for editing (protected)
- `DELETE /api/sites/:siteId` - Delete site (protected)
- `GET /api/templates` - Get available templates

### Site Access:
- `GET /:subdomain/:slug/` - Serve user sites
- `GET /:subdomain/` - User subdomain root

## 🎨 Available Templates

1. **Portfolio Template** (`portfolio`)
   - Clean design for showcasing work
   - Project grid layout
   - Contact section

2. **Business Template** (`business`)
   - Professional corporate design
   - Services section
   - Call-to-action buttons

3. **Blog Template** (`blog`)
   - Article-focused layout
   - Meta information display
   - Read more functionality

4. **Landing Page Template** (`landing`)
   - Modern hero section
   - Feature highlights
   - Conversion-focused design

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt encryption
- **Input Validation**: Sanitized user inputs
- **Rate Limiting**: Prevent abuse
- **CORS**: Proper cross-origin handling

## 📁 File Structure

```
/
├── server.js                 # Main Express server
├── package.json              # Dependencies
├── public/
│   ├── index.html           # Landing page
│   └── dashboard.html       # Enhanced dashboard
├── users/                   # User directories
│   └── username-random123/
│       ├── site1/
│       │   ├── index.html
│       │   └── backups/
│       └── site2/
└── uploads/                 # Legacy hosted sites (backward compatible)
```

## 🚀 Getting Started

### Installation:
```bash
npm install
```

### Environment Variables:
```bash
JWT_SECRET=your-secret-key-here
PORT=3000
```

### Start the server:
```bash
npm start
# or for development
npm run dev
```

## 👤 User Account Features

### Registration:
- Username: 3-30 characters (letters, numbers, hyphens, underscores)
- Email: Valid email address required
- Password: Minimum 6 characters
- Auto-generated subdomain: `username-random123.ntandostore`

### Dashboard Features:
- Site management (create, edit, delete)
- Template selection
- Live preview
- QR code generation
- Visit analytics
- Dark mode toggle

## 📝 Site Management

### Create Site:
1. Choose template or start from scratch
2. Enter site name and slug
3. Write HTML/CSS/JS code
4. Deploy instantly

### Edit Site:
1. Click "Edit" on any site
2. Modify code in the editor
3. Automatic backup created
4. Update with one click

### Site Features:
- Real-time visit tracking
- Last updated timestamp
- Backup management
- QR code sharing
- Mobile responsive

## 🔧 Technical Details

### Dependencies:
- **express**: Web framework
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT authentication
- **fs/promises**: File system operations

### Storage:
- User data: `users.json`
- Domain data: `domains.json` (legacy)
- Site files: Organized by subdomain

### Authentication Flow:
1. User registers/logs in
2. JWT token generated and stored
3. Token sent with API requests
4. Server validates and processes requests

## 🌍 Deployment

### Render.com Ready:
- Health check endpoint: `/health`
- Auto-deployment configured
- Environment variable support

### Production Considerations:
- Set strong `JWT_SECRET`
- Configure rate limiting
- Set up monitoring
- Regular backups

## 🔄 Backward Compatibility

The enhanced platform maintains full backward compatibility:
- Old `/hosted/` routes still work
- Existing sites continue to function
- API endpoints preserved
- Database migration not required

## 📊 Monitoring

### Health Check:
```json
GET /health
{
  "status": "OK",
  "service": "Ntandostore Enhanced Free Hosting",
  "features": ["Subdomains", "User System", "Site Editing", "Templates", "Backups"],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🎯 Use Cases

### For Individuals:
- Portfolio websites
- Personal blogs
- Resume sites
- Project showcases

### For Small Businesses:
- Landing pages
- Product showcases
- Service descriptions
- Contact pages

### For Developers:
- Quick prototypes
- Demo sites
- Testing environments
- Client previews

## 🔮 Future Enhancements

Potential upcoming features:
- Custom domain mapping
- SSL certificates
- Team collaboration
- Advanced analytics
- API integrations
- CDN integration

## 📞 Support

The enhanced Ntandostore platform provides a complete solution for free website hosting with modern features and professional tools. Enjoy building your web presence!
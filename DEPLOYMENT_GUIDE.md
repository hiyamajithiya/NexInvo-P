# NexInvo Deployment Guide

## Environment Configuration

### Development Environment
- Uses `.env.development` or `.env` file
- API URL: `http://localhost:8000/api`
- Command: `npm start`

### Production Environment
- Uses `.env.production` file
- API URL: `https://www.nexinvo.chinmaytechnosoft.com/api` (change to your domain)
- Command: `npm run build`

## Pre-Deployment Checklist

### 1. Update Production API URL
Edit `.env.production` and set your production API URL:
```
REACT_APP_API_URL=https://your-domain.com/api
```

### 2. Backend Configuration
Update `backend/nexinvo/settings.py`:
- Set `DEBUG = False`
- Configure `ALLOWED_HOSTS`
- Set up proper `CORS_ALLOWED_ORIGINS`
- Configure database (PostgreSQL recommended for production)
- Set up `SECRET_KEY` from environment variable

### 3. Build Frontend for Production
```bash
cd frontend
npm run build
```

This creates an optimized production build in the `build/` directory.

### 4. Backend Static Files
```bash
cd backend
python manage.py collectstatic
```

## Deployment Options

### Option 1: Traditional Server (Apache/Nginx)

#### Frontend (React)
1. Build the app: `npm run build`
2. Copy `build/` folder contents to your web server (e.g., `/var/www/html/`)
3. Configure Nginx/Apache to serve the static files

#### Backend (Django)
1. Set up virtual environment
2. Install dependencies: `pip install -r requirements.txt`
3. Run migrations: `python manage.py migrate`
4. Collect static files: `python manage.py collectstatic`
5. Use Gunicorn/uWSGI with Nginx

**Example Nginx Configuration:**
```nginx
# Frontend
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 2: Docker Deployment

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - DEBUG=False
      - DATABASE_URL=postgresql://user:pass@db:5432/nexinvo
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - REACT_APP_API_URL=https://your-domain.com/api
```

### Option 3: Cloud Platforms

#### AWS/GCP/Azure
- Frontend: Deploy to S3 + CloudFront / Cloud Storage + CDN
- Backend: Deploy to EC2 / App Engine / App Service

#### Heroku
- Frontend: Static buildpack
- Backend: Python buildpack with Procfile

## Environment Variables Summary

### Frontend (.env.production)
```
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_NAME=NexInvo
REACT_APP_VERSION=1.0.0
```

### Backend (environment variables)
```
DEBUG=False
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:pass@host:5432/dbname
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
```

## Post-Deployment

1. Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```

2. Test all endpoints
3. Set up SSL/TLS certificate (Let's Encrypt recommended)
4. Configure backups
5. Set up monitoring

## Common Issues

### Issue: API requests fail after deployment
**Solution:** Ensure `.env.production` has the correct API URL and rebuild frontend.

### Issue: Static files not loading
**Solution:** Run `python manage.py collectstatic` and configure web server to serve static files.

### Issue: CORS errors
**Solution:** Update `CORS_ALLOWED_ORIGINS` in Django settings.

## Security Checklist
- [ ] Set DEBUG=False in production
- [ ] Use strong SECRET_KEY
- [ ] Enable HTTPS
- [ ] Set proper ALLOWED_HOSTS
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Use environment variables for secrets
- [ ] Enable Django security middleware
- [ ] Keep dependencies updated

## Support
For issues, refer to the documentation or create an issue in the repository.

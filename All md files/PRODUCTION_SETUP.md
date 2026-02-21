# NexInvo Production Setup Guide

Quick reference for deploying and managing NexInvo on a production server.

## Initial Setup on Production Server

### 1. Clone Repository

```bash
cd /var/www
git clone https://github.com/hiyamajithiya/NexInvo-P.git nexinvo
cd nexinvo
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Create default settings for all users
python create_default_settings.py

# Collect static files
python manage.py collectstatic --noinput
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Build production bundle
npm run build
```

## Managing Settings

### Check Existing Settings

```bash
cd /var/www/nexinvo/backend
source venv/bin/activate

python manage.py shell << 'EOF'
from api.models import CompanySettings, InvoiceSettings, EmailSettings, InvoiceFormatSettings

print("Company Settings count:", CompanySettings.objects.count())
print("Invoice Settings count:", InvoiceSettings.objects.count())
print("Email Settings count:", EmailSettings.objects.count())
print("Invoice Format Settings count:", InvoiceFormatSettings.objects.count())
EOF
```

### Create Missing Settings

If any settings are missing (count is 0 or less than number of users):

```bash
cd /var/www/nexinvo/backend
source venv/bin/activate
python create_default_settings.py
```

This will:
- Create InvoiceSettings (if missing)
- Create EmailSettings (if missing)
- Create InvoiceFormatSettings (if missing)
- Keep existing settings untouched

## Common Tasks

### Update from GitHub

```bash
cd /var/www/nexinvo
git pull origin main

# Backend updates
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

# Frontend updates
cd ../frontend
npm install
npm run build

# Restart services
sudo systemctl restart gunicorn
sudo systemctl restart nginx
```

### Create New User

```bash
cd /var/www/nexinvo/backend
source venv/bin/activate
python create_user.py
# Or
python manage.py createsuperuser
```

### View Application Logs

```bash
# Gunicorn logs
sudo journalctl -u gunicorn -n 50 -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Database Backup

```bash
# Backup SQLite database
cd /var/www/nexinvo/backend
cp db.sqlite3 db.sqlite3.backup-$(date +%Y%m%d-%H%M%S)

# List backups
ls -lh db.sqlite3.backup-*
```

## Production Configuration

### Django Settings

Edit `/var/www/nexinvo/backend/nexinvo/settings.py`:

```python
# Security
DEBUG = False
ALLOWED_HOSTS = ['your-domain.com', 'www.your-domain.com']
SECRET_KEY = 'your-secret-key-here'  # Generate new one

# Database (optional - upgrade to PostgreSQL)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'nexinvo_db',
        'USER': 'nexinvo_user',
        'PASSWORD': 'your-password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Email (for production)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
DEFAULT_FROM_EMAIL = 'your-email@gmail.com'

# Static files
STATIC_ROOT = '/var/www/nexinvo/backend/staticfiles'
STATIC_URL = '/static/'
```

### Gunicorn Service

Create `/etc/systemd/system/gunicorn.service`:

```ini
[Unit]
Description=Gunicorn daemon for NexInvo
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/nexinvo/backend
ExecStart=/var/www/nexinvo/backend/venv/bin/gunicorn \
    --workers 3 \
    --bind unix:/var/www/nexinvo/backend/nexinvo.sock \
    nexinvo.wsgi:application

[Install]
WantedBy=multi-user.target
```

Start service:
```bash
sudo systemctl start gunicorn
sudo systemctl enable gunicorn
sudo systemctl status gunicorn
```

### Nginx Configuration

Create `/etc/nginx/sites-available/nexinvo`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend
    location / {
        root /var/www/nexinvo/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://unix:/var/www/nexinvo/backend/nexinvo.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://unix:/var/www/nexinvo/backend/nexinvo.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files
    location /static/ {
        alias /var/www/nexinvo/backend/staticfiles/;
    }

    # Media files (if needed)
    location /media/ {
        alias /var/www/nexinvo/backend/media/;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/nexinvo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Troubleshooting

### Settings Missing Error

If you see errors about missing settings:

```bash
cd /var/www/nexinvo/backend
source venv/bin/activate
python create_default_settings.py
```

### pkg_resources Warning

The warning about `pkg_resources` is harmless and can be ignored. To suppress it, update djangorestframework-simplejwt:

```bash
pip install --upgrade djangorestframework-simplejwt
```

### Permission Denied Errors

```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/nexinvo

# Fix permissions
sudo chmod -R 755 /var/www/nexinvo
sudo chmod 664 /var/www/nexinvo/backend/db.sqlite3
```

### 500 Internal Server Error

1. Check Django logs:
   ```bash
   sudo journalctl -u gunicorn -n 100
   ```

2. Enable debug temporarily:
   ```python
   DEBUG = True  # In settings.py
   ```

3. Check file permissions
4. Verify database connection
5. Check ALLOWED_HOSTS setting

## Security Checklist

- [ ] Set `DEBUG = False` in production
- [ ] Use strong `SECRET_KEY`
- [ ] Configure `ALLOWED_HOSTS` properly
- [ ] Set up HTTPS with SSL certificate (Let's Encrypt)
- [ ] Use PostgreSQL instead of SQLite for production
- [ ] Set up regular database backups
- [ ] Configure firewall (ufw)
- [ ] Keep dependencies updated
- [ ] Use environment variables for secrets
- [ ] Enable CSRF protection (already enabled)
- [ ] Configure CORS properly

## Monitoring

### Health Checks

```bash
# Check backend is running
curl http://localhost/api/

# Check database
cd /var/www/nexinvo/backend
source venv/bin/activate
python manage.py dbshell

# Check services
sudo systemctl status gunicorn
sudo systemctl status nginx
```

### Performance Monitoring

Monitor these metrics:
- Response time
- Database queries
- Memory usage
- Disk space
- Error rates

## Support

- GitHub Repository: https://github.com/hiyamajithiya/NexInvo-P
- Documentation: README.md and SETUP_GUIDE.md
- Issues: Report on GitHub Issues

---

**Version**: 1.0.0
**Last Updated**: November 2024

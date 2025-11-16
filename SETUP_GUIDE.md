# NexInvo Setup Guide

Complete step-by-step guide to set up and run the NexInvo Invoice Management System.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.10 or higher**
  - Check: `python --version`
  - Download: https://www.python.org/downloads/

- **Node.js 18 or higher**
  - Check: `node --version`
  - Download: https://nodejs.org/

- **Git** (for cloning the repository)
  - Check: `git --version`
  - Download: https://git-scm.com/

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt.

### Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- Django 4.2.7
- Django REST Framework
- Django CORS Headers
- ReportLab (PDF generation)
- Pillow (Image processing)
- openpyxl & pandas (Excel import)
- And other dependencies

### Step 4: Run Database Migrations

```bash
python manage.py migrate
```

This creates the SQLite database with all necessary tables.

### Step 5: Create Admin User

```bash
python create_user.py
```

Or manually:
```bash
python manage.py createsuperuser
```

Follow the prompts to create a username, email, and password.

### Step 6: Run the Development Server

```bash
python manage.py runserver
```

The backend should now be running at:
- API: http://localhost:8000/api/
- Admin Panel: http://localhost:8000/admin/

### Step 7: Verify Backend is Running

Open your browser and visit:
- http://localhost:8000/admin/ - You should see the Django admin login page

## Frontend Setup

### Step 1: Open New Terminal

Keep the backend server running and open a new terminal window.

### Step 2: Navigate to Frontend Directory

```bash
cd frontend
```

### Step 3: Install Node Dependencies

```bash
npm install
```

This will install:
- React 18
- React Router DOM
- Axios
- React Scripts
- And other dependencies

### Step 4: Run the Development Server

```bash
npm start
```

The frontend should automatically open in your browser at:
- http://localhost:3000/

If it doesn't open automatically, open your browser and go to http://localhost:3000/

## First Time Login

1. Open http://localhost:3000/ in your browser
2. You'll see the login page
3. Use the admin credentials you created in Backend Step 5
4. After login, you'll see the Dashboard

## Common Issues & Solutions

### Backend Issues

**Issue: `python: command not found`**
- Solution: Use `python3` instead of `python` on Linux/Mac

**Issue: `pip: command not found`**
- Solution: Install pip or use `python -m pip` instead

**Issue: Port 8000 already in use**
- Solution: Run on different port: `python manage.py runserver 8001`
- Update frontend API URL in `frontend/src/services/api.js`

**Issue: Database errors**
- Solution: Delete `db.sqlite3` and run `python manage.py migrate` again

### Frontend Issues

**Issue: `npm: command not found`**
- Solution: Install Node.js from https://nodejs.org/

**Issue: Port 3000 already in use**
- Solution: The terminal will ask if you want to use a different port (press Y)

**Issue: API connection errors**
- Solution: Ensure backend is running at http://localhost:8000/

## Configuration

### Backend Configuration

Edit `backend/nexinvo/settings.py` to configure:

**CORS Settings (already configured for development):**
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
```

**Email Settings (for production):**
```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
```

### Frontend Configuration

Edit `frontend/src/services/api.js` if backend runs on different port:

```javascript
const API_BASE_URL = 'http://localhost:8000/api';
```

## Testing the Application

1. **Login**: Use your admin credentials
2. **Company Settings**:
   - Click on Settings → Company Settings
   - Fill in your company details
   - Upload company logo (optional)
3. **Add Client**:
   - Click on Clients → New Client
   - Fill in client details
4. **Create Invoice**:
   - Click on Invoices → New Invoice
   - Select client and add items
   - Preview and generate PDF
5. **Dashboard**:
   - View statistics and recent invoices

## Development Workflow

### Running Both Servers

You need two terminal windows:

**Terminal 1 (Backend):**
```bash
cd backend
venv\Scripts\activate  # or source venv/bin/activate
python manage.py runserver
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

### Making Changes

**Backend Changes:**
- Edit files in `backend/api/`
- Server auto-reloads on file changes
- If you modify models, run: `python manage.py makemigrations` then `python manage.py migrate`

**Frontend Changes:**
- Edit files in `frontend/src/`
- Browser auto-reloads on file changes

## Production Deployment

### Backend

1. Update `settings.py`:
   ```python
   DEBUG = False
   ALLOWED_HOSTS = ['your-domain.com']
   ```

2. Collect static files:
   ```bash
   python manage.py collectstatic
   ```

3. Use production server:
   ```bash
   pip install gunicorn
   gunicorn nexinvo.wsgi:application
   ```

### Frontend

1. Build production bundle:
   ```bash
   npm run build
   ```

2. Serve `build/` folder with web server (Nginx, Apache, etc.)

## Additional Resources

- **Django Documentation**: https://docs.djangoproject.com/
- **React Documentation**: https://react.dev/
- **Django REST Framework**: https://www.django-rest-framework.org/

## Getting Help

If you encounter issues:

1. Check this guide's "Common Issues & Solutions" section
2. Review error messages in the terminal
3. Check browser console for frontend errors (F12)
4. Review Django admin panel for data issues

## Next Steps

After setup:

1. Configure company settings with your details
2. Add your company logo
3. Create client records
4. Start creating invoices
5. Customize invoice format settings
6. Set up email settings for sending invoices

---

**Version**: 1.0.0
**Last Updated**: November 2024
**Built for**: HIMANSHU MAJITHIYA & CO. (PROP)

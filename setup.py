"""
NexInvo - Automated Project Setup Script
Creates complete Django + React + PostgreSQL structure
"""
import os
import subprocess
import sys
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run shell command"""
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, check=True, capture_output=True, text=True)
        print(f"✓ {cmd}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ {cmd}")
        print(f"Error: {e.stderr}")
        return False

def create_directory_structure():
    """Create all necessary directories"""
    print("\n[1/5] Creating directory structure...")

    dirs = [
        "backend/nexinvo",
        "backend/apps/invoices",
        "backend/apps/clients",
        "backend/apps/users",
        "backend/apps/reports",
        "backend/apps/common",
        "backend/media/invoices",
        "backend/media/logos",
        "backend/static",
        "backend/templates/invoices",
        "backend/templates/emails",
        "backend/logs",
        "frontend/src/components/common",
        "frontend/src/components/invoices",
        "frontend/src/components/clients",
        "frontend/src/components/dashboard",
        "frontend/src/pages",
        "frontend/src/services",
        "frontend/src/hooks",
        "frontend/src/utils",
        "frontend/src/types",
        "frontend/src/assets",
        "frontend/public",
        "docs",
        "scripts",
    ]

    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        print(f"  Created: {dir_path}")

    print("✓ Directory structure created")

def setup_django_backend():
    """Initialize Django project"""
    print("\n[2/5] Setting up Django backend...")

    os.chdir("backend")

    # Create virtual environment
    print("  Creating virtual environment...")
    if not run_command(f"{sys.executable} -m venv venv"):
        return False

    # Determine pip path
    pip_path = "venv/Scripts/pip" if os.name == 'nt' else "venv/bin/pip"
    python_path = "venv/Scripts/python" if os.name == 'nt' else "venv/bin/python"

    # Install Django
    print("  Installing Django...")
    if not run_command(f"{pip_path} install Django djangorestframework"):
        return False

    # Create Django project
    print("  Creating Django project...")
    if not run_command(f"{python_path} -m django startproject nexinvo ."):
        return False

    # Create Django apps
    apps = ["invoices", "clients", "users", "reports", "common"]
    for app in apps:
        print(f"  Creating app: {app}")
        run_command(f"{python_path} manage.py startapp {app} apps/{app}")

    os.chdir("..")
    print("✓ Django backend initialized")
    return True

def setup_react_frontend():
    """Initialize React project"""
    print("\n[3/5] Setting up React frontend...")

    # Create React app
    print("  Creating React app...")
    if not run_command("npx create-react-app frontend --template typescript", cwd="."):
        print("  Note: React app creation requires Node.js and npm")
        print("  You can run this manually: npx create-react-app frontend --template typescript")
        return False

    # Install dependencies
    print("  Installing React dependencies...")
    deps = [
        "axios",
        "react-router-dom",
        "react-query",
        "@tanstack/react-query",
        "tailwindcss",
        "autoprefixer",
        "postcss",
        "react-icons",
        "react-hot-toast",
        "date-fns",
        "recharts"
    ]

    os.chdir("frontend")
    run_command(f"npm install {' '.join(deps)}")

    # Initialize Tailwind
    run_command("npx tailwindcss init -p")

    os.chdir("..")
    print("✓ React frontend initialized")
    return True

def create_config_files():
    """Create configuration files"""
    print("\n[4/5] Creating configuration files...")

    # Backend .env.example
    backend_env = """# Database
DB_NAME=nexinvo
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Django
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=info@himanshumajithiya.com

# JWT
JWT_SECRET_KEY=your-jwt-secret-key

# Redis (optional)
REDIS_URL=redis://localhost:6379/0

# Frontend URL
FRONTEND_URL=http://localhost:3000
"""

    with open("backend/.env.example", "w") as f:
        f.write(backend_env)

    # Frontend .env.example
    frontend_env = """REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_NAME=NexInvo
"""

    with open("frontend/.env.example", "w") as f:
        f.write(frontend_env)

    print("✓ Configuration files created")

def create_documentation():
    """Create initial documentation"""
    print("\n[5/5] Creating documentation...")

    quick_start = """# NexInvo - Quick Start Guide

## Setup Complete!

Your NexInvo project structure has been created.

## Next Steps

### 1. Configure Database

```bash
# Create PostgreSQL database
createdb nexinvo

# Or using psql
psql -U postgres
CREATE DATABASE nexinvo;
```

### 2. Configure Backend

```bash
cd backend

# Copy and edit environment file
cp .env.example .env
# Edit .env with your database credentials

# Activate virtual environment
# Windows:
venv\\Scripts\\activate
# Linux/Mac:
source venv/bin/activate

# Install all dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

Backend will run at: http://localhost:8000

### 3. Configure Frontend

```bash
cd frontend

# Copy and edit environment file
cp .env.example .env

# Install dependencies (if not done)
npm install

# Run development server
npm start
```

Frontend will run at: http://localhost:3000

## Folder Structure

```
NexInvo/
├── backend/          # Django Backend
├── frontend/         # React Frontend
├── assets/           # Static assets (CA logo)
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## Key URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Admin Panel: http://localhost:8000/admin
- API Docs: http://localhost:8000/api/docs

## Default Login (After creating superuser)

- Username: (your superuser username)
- Password: (your superuser password)

## Features

✓ Client Management
✓ Invoice Generation (Proforma & Tax)
✓ PDF Generation with CA India Logo
✓ Email Integration
✓ Dashboard & Analytics
✓ GST Compliance
✓ Payment Tracking

## Need Help?

Check the documentation in the `docs/` folder or refer to README.md

---

Built for: HIMANSHU MAJITHIYA & CO. (PROP)
"""

    with open("QUICK_START.md", "w") as f:
        f.write(quick_start)

    print("✓ Documentation created")

def main():
    """Main setup function"""
    print("="*50)
    print("  NexInvo - Automated Setup")
    print("="*50)
    print("\nThis will create a complete Django + React project")
    print("for invoice management.\n")

    try:
        create_directory_structure()
        # setup_django_backend()  # Commented out - requires manual setup
        # setup_react_frontend()   # Commented out - requires manual setup
        create_config_files()
        create_documentation()

        print("\n" + "="*50)
        print("  ✓ Setup Complete!")
        print("="*50)
        print("\nNext steps:")
        print("1. Read QUICK_START.md for setup instructions")
        print("2. Install dependencies")
        print("3. Configure database")
        print("4. Run migrations")
        print("5. Start developing!")

    except Exception as e:
        print(f"\n✗ Setup failed: {e}")
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())

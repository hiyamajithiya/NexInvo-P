# NexInvo - Modern Invoice Management System

**Professional GST-Compliant Invoice Generation Web Application**

Built for: HIMANSHU MAJITHIYA & CO. (PROP)

## 🚀 Technology Stack

### Backend
- **Django 4.2** - Python web framework
- **Django REST Framework** - API development
- **PostgreSQL** - Robust database
- **WeasyPrint** - PDF generation
- **Celery** - Background tasks (email sending)
- **Redis** - Task queue

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first styling
- **React Query** - Data fetching
- **React Router** - Navigation
- **Axios** - HTTP client

## ✨ Features

### Invoice Management
- ✅ Create Proforma & Tax Invoices
- ✅ Multi-line items support
- ✅ Automatic GST calculation (CGST/SGST/IGST)
- ✅ Indian currency formatting
- ✅ Amount in words conversion
- ✅ Professional PDF generation with logo

### Client Management
- ✅ Complete client database
- ✅ GST & PAN details
- ✅ Contact management
- ✅ Quick search & filter

### Dashboard & Reports
- ✅ Revenue analytics
- ✅ Outstanding payments
- ✅ Monthly/Yearly reports
- ✅ Client-wise breakdown

### User Management
- ✅ Secure authentication
- ✅ Role-based access control
- ✅ Activity logging

### Email Integration
- ✅ Automatic email sending
- ✅ Customizable templates
- ✅ Background processing
- ✅ Send tracking

## 📁 Project Structure

```
NexInvo/
├── backend/                # Django Backend
│   ├── nexinvo/           # Project settings
│   ├── invoices/          # Invoice app
│   ├── clients/           # Client management
│   ├── users/             # Authentication
│   ├── reports/           # Analytics
│   └── requirements.txt
│
├── frontend/              # React Frontend
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── hooks/        # Custom hooks
│   │   ├── utils/        # Utilities
│   │   └── types/        # TypeScript types
│   ├── public/
│   └── package.json
│
├── assets/               # Static assets
│   └── ca_logo.jpg      # CA India logo
│
└── docs/                # Documentation
    ├── API.md
    ├── DEPLOYMENT.md
    └── USER_GUIDE.md
```

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for background tasks)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup database
createdb nexinvo

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load sample data (optional)
python manage.py loaddata sample_data.json

# Run server
python manage.py runserver
```

Backend runs at: http://localhost:8000

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with backend URL

# Run development server
npm start
```

Frontend runs at: http://localhost:3000

## 🔧 Configuration

### Database (.env)
```
DB_NAME=nexinvo
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

### Email Settings (.env)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8000/api
```

## 📖 API Documentation

API documentation available at: http://localhost:8000/api/docs/

### Key Endpoints

```
POST   /api/auth/login/              # Login
POST   /api/auth/logout/             # Logout

GET    /api/clients/                 # List clients
POST   /api/clients/                 # Create client
GET    /api/clients/{id}/            # Get client
PUT    /api/clients/{id}/            # Update client

GET    /api/invoices/                # List invoices
POST   /api/invoices/                # Create invoice
GET    /api/invoices/{id}/           # Get invoice
GET    /api/invoices/{id}/pdf/       # Download PDF
POST   /api/invoices/{id}/email/     # Email invoice

GET    /api/dashboard/stats/         # Dashboard stats
GET    /api/reports/revenue/         # Revenue report
```

## 🎨 Features Overview

### Dashboard
- Revenue overview
- Recent invoices
- Pending payments
- Quick actions

### Invoice Creation
1. Select client (or create new)
2. Add line items with services
3. Preview invoice
4. Generate PDF
5. Send via email or download

### Client Management
- Add/Edit clients
- View client history
- GST verification
- Contact management

### Reports
- Revenue by month/year
- Client-wise analysis
- Tax summary
- Payment tracking

## 🔐 Security

- JWT-based authentication
- Role-based access control
- CSRF protection
- SQL injection prevention
- XSS protection
- HTTPS enforcement (production)

## 📱 Responsive Design

- Desktop optimized
- Tablet friendly
- Mobile responsive
- Print-friendly invoices

## 🚀 Deployment

### Production Checklist

**Backend**:
- [ ] Set DEBUG=False
- [ ] Configure ALLOWED_HOSTS
- [ ] Setup PostgreSQL
- [ ] Configure email SMTP
- [ ] Setup Gunicorn/uWSGI
- [ ] Configure Nginx
- [ ] Setup SSL certificate
- [ ] Configure static files
- [ ] Setup Celery workers
- [ ] Configure Redis

**Frontend**:
- [ ] Build production: `npm run build`
- [ ] Configure API URL
- [ ] Setup CDN (optional)
- [ ] Configure Nginx
- [ ] Enable compression

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

## 🧪 Testing

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test
```

## 📊 Database Schema

### Key Models

**Client**
- Company details
- GST/PAN information
- Contact information
- Billing address

**Invoice**
- Invoice number & series
- Client reference
- Financial year
- Invoice date
- Type (Proforma/Tax)
- Status
- Line items
- Totals

**InvoiceItem**
- Description
- HSN/SAC code
- Quantity
- Rate
- GST rate
- Calculated amounts

**Payment**
- Invoice reference
- Amount received
- TDS deducted
- Payment mode
- Receipt date

## 🛠️ Development

### Backend Development

```bash
# Create new app
python manage.py startapp app_name

# Make migrations
python manage.py makemigrations

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### Frontend Development

```bash
# Add package
npm install package-name

# Build
npm run build

# Lint
npm run lint
```

## 📝 License

Proprietary - Built for HIMANSHU MAJITHIYA & CO. (PROP)

## 👨‍💻 Support

For issues or questions:
- Check documentation in `/docs`
- Review API docs
- Check logs in backend/logs/

---

**Version**: 1.0.0
**Last Updated**: November 2025
**Status**: Production Ready

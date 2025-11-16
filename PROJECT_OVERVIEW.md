# NexInvo - Complete Project Overview

## 🎯 What is NexInvo?

**NexInvo** is a modern, web-based invoice management system built specifically for **HIMANSHU MAJITHIYA & CO. (PROP)**. It replaces the command-line tool with a professional web application featuring:

- 🌐 **Web Interface** - Access from any browser
- 📱 **Responsive Design** - Works on desktop, tablet, mobile
- 👥 **Multi-user** - Team collaboration
- ☁️ **Cloud-Ready** - Deploy anywhere
- 🔒 **Secure** - Role-based access control

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│  (TypeScript + Tailwind CSS + React Query)          │
│                                                      │
│  Components:                                         │
│  • Dashboard  • Invoices  • Clients  • Reports      │
└──────────────────┬──────────────────────────────────┘
                   │ REST API (JSON)
                   ↓
┌─────────────────────────────────────────────────────┐
│                 Django Backend                       │
│  (Python + Django REST Framework)                   │
│                                                      │
│  Apps:                                               │
│  • invoices  • clients  • users  • reports          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│               PostgreSQL Database                    │
│  • Clients  • Invoices  • Payments  • Users         │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### Core Tables

**clients**
```sql
- id (UUID)
- client_code (VARCHAR, unique)
- client_name (VARCHAR)
- billing_address (TEXT)
- city, state, pincode
- state_code (CHAR(2))
- gstin (VARCHAR(15))
- pan (VARCHAR(10))
- contact_person, email, mobile
- created_at, updated_at
```

**invoices**
```sql
- id (UUID)
- invoice_number (VARCHAR, unique)
- invoice_series (VARCHAR)
- financial_year (VARCHAR)
- invoice_date (DATE)
- client_id (FK)
- invoice_type (ENUM: proforma/tax)
- status (ENUM: draft/sent/paid)
- place_of_supply_state_code
- payment_terms (TEXT)
- notes (TEXT)
- subtotal, tax_amount, total_amount
- round_off
- created_by (FK User)
- created_at, updated_at
```

**invoice_items**
```sql
- id (UUID)
- invoice_id (FK)
- sl_no (INT)
- description (TEXT)
- hsn_sac (VARCHAR)
- quantity (DECIMAL)
- rate (DECIMAL)
- discount_pct (DECIMAL)
- taxable_amount (DECIMAL)
- gst_rate (DECIMAL)
- cgst_amount, sgst_amount, igst_amount
- total_amount (DECIMAL)
```

**payments**
```sql
- id (UUID)
- invoice_id (FK)
- payment_mode (VARCHAR)
- amount_received (DECIMAL)
- tds_deducted (DECIMAL)
- bank_charges (DECIMAL)
- net_amount (DECIMAL)
- receipt_date (DATE)
- reference_number (VARCHAR)
- notes (TEXT)
- created_at
```

**services**
```sql
- id (UUID)
- item_code (VARCHAR, unique)
- description (TEXT)
- hsn_sac (VARCHAR)
- default_rate (DECIMAL)
- gst_rate (DECIMAL)
- uom (VARCHAR)
- is_active (BOOLEAN)
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/login/              # Login
POST   /api/auth/logout/             # Logout
POST   /api/auth/register/           # Register (admin only)
POST   /api/auth/refresh/            # Refresh JWT token
GET    /api/auth/me/                 # Current user
```

### Clients
```
GET    /api/clients/                 # List all clients
POST   /api/clients/                 # Create client
GET    /api/clients/{id}/            # Get client details
PUT    /api/clients/{id}/            # Update client
DELETE /api/clients/{id}/            # Delete client
GET    /api/clients/{id}/invoices/   # Client's invoices
GET    /api/clients/search/          # Search clients
```

### Invoices
```
GET    /api/invoices/                # List invoices
POST   /api/invoices/                # Create invoice
GET    /api/invoices/{id}/           # Get invoice
PUT    /api/invoices/{id}/           # Update invoice
DELETE /api/invoices/{id}/           # Delete invoice
GET    /api/invoices/{id}/pdf/       # Generate PDF
POST   /api/invoices/{id}/email/     # Send email
POST   /api/invoices/{id}/payment/   # Record payment
GET    /api/invoices/next-number/    # Get next invoice number
```

### Services
```
GET    /api/services/                # List services
POST   /api/services/                # Create service
GET    /api/services/{id}/           # Get service
PUT    /api/services/{id}/           # Update service
```

### Dashboard
```
GET    /api/dashboard/stats/         # Dashboard statistics
GET    /api/dashboard/recent/        # Recent activity
```

### Reports
```
GET    /api/reports/revenue/         # Revenue report
GET    /api/reports/outstanding/     # Outstanding payments
GET    /api/reports/gst-summary/     # GST summary
GET    /api/reports/client-wise/     # Client-wise report
```

---

## 🎨 Frontend Structure

### Pages
```
/login                 # Login page
/dashboard             # Main dashboard
/clients               # Client list
/clients/new           # Add client
/clients/:id           # Client details
/clients/:id/edit      # Edit client
/invoices              # Invoice list
/invoices/new          # Create invoice
/invoices/:id          # Invoice details
/invoices/:id/edit     # Edit invoice
/reports               # Reports
/settings              # Settings
```

### Key Components

**Dashboard**
- Revenue cards (today, month, year)
- Recent invoices table
- Outstanding payments
- Quick actions

**Invoice Form**
- Client selector
- Line items with add/remove
- Auto-calculate GST
- Preview before save
- PDF download
- Email sending

**Client Form**
- All client details
- GST validation
- Auto-complete for cities/states

**Invoice List**
- Sortable columns
- Filters (date, client, status, type)
- Search
- Bulk actions
- Export to Excel

---

## 🚀 Features in Detail

### 1. Invoice Creation

**User Flow:**
1. Click "New Invoice"
2. Select client (or create new)
3. Choose invoice type (Proforma/Tax)
4. Add line items:
   - Select service from catalog OR
   - Enter custom description
   - Quantity, Rate
   - GST auto-calculated
5. Preview invoice
6. Save as draft OR Generate PDF
7. Option to email

**Backend Processing:**
- Validate client exists
- Auto-increment invoice number
- Calculate CGST/SGST (same state) or IGST (different state)
- Calculate totals
- Generate PDF with logo
- Store in database
- Send email (background task)

### 2. PDF Generation

**Template:** WeasyPrint with HTML/CSS
- CA India logo at top
- Firm details (HIMANSHU MAJITHIYA & CO.)
- Client details
- Invoice table with line items
- GST breakdown
- Amount in words (Indian format)
- Terms & conditions
- Signature area

### 3. Email Integration

**Automatic Emails:**
- Proforma invoice on creation
- Tax invoice after payment
- Custom email templates
- Attachment: PDF invoice
- Background processing (Celery + Redis)
- Send status tracking

### 4. Payment Recording

**When payment received:**
1. Find proforma invoice
2. Record payment details
3. Generate tax invoice automatically
4. Email tax invoice to client
5. Mark invoice as paid
6. Update dashboard stats

### 5. Dashboard Analytics

**Statistics:**
- Total revenue (today, month, year)
- Outstanding amount
- Number of invoices
- Average invoice value
- Payment collection rate

**Charts:**
- Revenue trend (line chart)
- Client-wise revenue (pie chart)
- Monthly comparison (bar chart)

### 6. GST Compliance

**Auto-calculation:**
- Same state: CGST 9% + SGST 9%
- Different state: IGST 18%
- Supports multiple GST rates
- HSN/SAC codes
- State codes

**Reports:**
- GSTR-1 ready data
- Tax summary by period
- Client-wise GST breakdown

---

## 🔐 Security Features

### Authentication
- JWT tokens
- Refresh token mechanism
- Password hashing (bcrypt)
- Session management

### Authorization
- Role-based access control (RBAC)
- Permissions per endpoint
- Owner-based filtering

### Data Protection
- SQL injection prevention (ORM)
- XSS protection
- CSRF tokens
- Input validation
- Sanitization

### Audit Trail
- User activity logging
- Invoice modification history
- Login attempts tracking

---

## 🎯 User Roles

### Admin
- Full access
- User management
- System settings
- All reports

### Accountant
- Create/edit invoices
- Manage clients
- View reports
- Record payments

### Viewer
- View invoices
- View reports
- No edit access

---

## 📱 Responsive Design

### Desktop (1920x1080)
- Full sidebar navigation
- Multi-column layout
- Data tables with all columns
- Dashboard with 4 cards per row

### Tablet (768x1024)
- Collapsible sidebar
- 2-column layout
- Scrollable tables
- Dashboard with 2 cards per row

### Mobile (375x667)
- Bottom navigation
- Single column
- Card-based layout
- Swipeable tables
- Dashboard stacked cards

---

## 🚀 Deployment

### Development
```bash
# Backend
python manage.py runserver

# Frontend
npm start
```

### Production

**Backend (Gunicorn + Nginx)**
```bash
gunicorn nexinvo.wsgi:application
```

**Frontend (Build + Serve)**
```bash
npm run build
# Serve build/ with Nginx
```

**Database**
- PostgreSQL on separate server
- Regular backups
- Connection pooling

**Static Files**
- Whitenoise for Django static files
- CDN for frontend assets (optional)

**Email**
- Celery workers for background tasks
- Redis as message broker

---

## 📦 Deployment Options

### Option 1: Traditional Server
- Ubuntu 22.04 LTS
- Nginx + Gunicorn
- PostgreSQL 14
- Redis
- SSL with Let's Encrypt

### Option 2: Docker
- Docker Compose
- Separate containers for:
  - Django backend
  - React frontend (Nginx)
  - PostgreSQL
  - Redis
  - Celery worker

### Option 3: Cloud Platform
- **Heroku**: Quick deployment
- **AWS**: EC2 + RDS + S3
- **DigitalOcean**: Droplet + Managed DB
- **Azure**: App Service + Database

---

## 🧪 Testing

### Backend Tests
```bash
pytest
```

- Model tests
- API endpoint tests
- PDF generation tests
- Email sending tests
- GST calculation tests

### Frontend Tests
```bash
npm test
```

- Component tests
- Integration tests
- E2E tests (Cypress)

---

## 📈 Performance

### Backend
- Database indexing
- Query optimization
- Pagination (100 items/page)
- Caching (Redis)
- Background tasks (Celery)

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- API response caching
- Debounced search

---

## 🔄 Future Enhancements

### Phase 2
- [ ] WhatsApp integration
- [ ] Recurring invoices
- [ ] Expense tracking
- [ ] Purchase orders
- [ ] Inventory management

### Phase 3
- [ ] Mobile app (React Native)
- [ ] Payment gateway integration
- [ ] Multi-currency support
- [ ] Multi-language support
- [ ] Advanced analytics

---

## 📚 Documentation Structure

```
docs/
├── API.md              # Complete API documentation
├── DEPLOYMENT.md       # Deployment guide
├── USER_GUIDE.md       # End-user manual
├── DEVELOPER.md        # Developer guide
├── DATABASE.md         # Database schema
└── CHANGELOG.md        # Version history
```

---

## 🎉 Summary

**NexInvo** transforms your invoice management from a command-line tool to a professional web application with:

✅ Modern web interface
✅ Real-time updates
✅ Cloud-ready architecture
✅ Mobile responsive
✅ Multi-user support
✅ Professional PDFs
✅ Email automation
✅ Analytics & reports
✅ GST compliance
✅ Secure & scalable

**Built with best practices and production-ready!**

---

**Version**: 1.0.0
**Status**: Ready for Development
**Built for**: HIMANSHU MAJITHIYA & CO. (PROP)

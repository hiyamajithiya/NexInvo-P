# NexInvo - Complete Feature List

**Version:** 1.0.0
**Date:** December 5, 2025
**Platform:** Web Application (Django + React)

---

## 1. AUTHENTICATION & USER MANAGEMENT

| Feature | Description |
|---------|-------------|
| Email/Password Login | JWT-based authentication with access/refresh tokens |
| OTP Registration | 3-step registration with email OTP verification (6-digit, 10-min expiry) |
| Password Change | In-app password change with validation |
| Profile Management | Edit user profile details (name, email) |
| Account Deletion | DPDP Act compliant account deletion (Right to Erasure) |
| Personal Data Export | DPDP Act compliant data export (Data Portability) |
| Failed Login Protection | Progressive lockout (5/15/30/60 minutes) after failed attempts |
| Password Reset | Email-based password reset via SuperAdmin |

---

## 2. MULTI-TENANCY & ORGANIZATIONS

| Feature | Description |
|---------|-------------|
| Multiple Organizations | Users can belong to multiple organizations |
| Organization Switching | Quick switch between organizations via dropdown |
| Create Organizations | Create new organizations (subscription plan limited) |
| Role-Based Access Control | Owner, Admin, User, Viewer roles with distinct permissions |
| Member Management | Invite members via email, update roles, remove members |
| Viewer Role | Read-only access for accountants/CAs - can view, download, email reports |
| Organization Limits | Subscription-based limits on number of organizations |

### Role Permissions Matrix

| Permission | Owner | Admin | User | Viewer |
|------------|-------|-------|------|--------|
| View Dashboard | Yes | Yes | Yes | Yes |
| View Invoices | Yes | Yes | Yes | Yes |
| Create/Edit Invoices | Yes | Yes | Yes | No |
| Delete Invoices | Yes | Yes | Yes | No |
| Download PDF | Yes | Yes | Yes | Yes |
| Send Email | Yes | Yes | Yes | Yes |
| View Clients | Yes | Yes | Yes | Yes |
| Manage Clients | Yes | Yes | Yes | No |
| View Receipts | Yes | Yes | Yes | Yes |
| Record Payments | Yes | Yes | Yes | No |
| Generate Reports | Yes | Yes | Yes | Yes |
| Access Settings | Yes | Yes | No | No |
| Manage Members | Yes | Yes | No | No |
| Manage Subscription | Yes | No | No | No |
| Delete Organization | Yes | No | No | No |

---

## 3. INVOICE MANAGEMENT

| Feature | Description |
|---------|-------------|
| Proforma Invoices | Create quotations/estimates with separate numbering |
| Tax Invoices | GST-compliant invoices with auto-numbering |
| Invoice Creation | Multi-line items with services, quantities, rates |
| Invoice Editing | Edit draft and sent invoices |
| Invoice PDF Generation | Customizable PDF format with logo, colors |
| Email Invoice | Send invoice via email with PDF attachment |
| Bulk Email | Send emails to multiple invoices at once |
| Bulk Download | Download multiple invoice PDFs |
| Bulk Print | Print multiple invoices |
| Bulk Delete | Delete multiple invoices with confirmation |
| Proforma to Tax Conversion | Auto-convert proforma to tax invoice on payment |
| Invoice Import | Import invoices from Excel/CSV/JSON |
| Excel Template | Download import template |
| Search & Filter | By invoice number, client name, status, type |
| Separate Numbering | Different prefixes for proforma (PI-) and tax (INV-) invoices |
| GST Calculation | Auto-calculate CGST/SGST/IGST based on state |
| Payment Terms | Configurable payment terms (Net 15, Net 30, etc.) |
| Notes & Terms | Custom notes and terms per invoice |

---

## 4. CLIENT MANAGEMENT

| Feature | Description |
|---------|-------------|
| Client CRUD | Create, read, update, delete clients |
| Auto Client Code | Auto-generated from client name and dates |
| GST Details | GSTIN, PAN, State Code tracking |
| GSTIN Validation | Validates GSTIN against selected state code |
| All 36 Indian States | Complete state list with GST codes |
| Bulk Upload | Import clients from CSV/Excel |
| Search & Filter | By name, code, status |
| Client Protection | Cannot delete clients with existing invoices |

### Client Fields
- Client Name (required)
- Client Code (auto-generated)
- Email
- Phone/Mobile
- Address, City, State, PIN Code
- GST State Code (auto-filled)
- GSTIN (15 characters)
- PAN (10 characters)
- Date of Birth
- Date of Incorporation

---

## 5. SERVICE MASTER

| Feature | Description |
|---------|-------------|
| Service CRUD | Create, read, update, delete services |
| SAC/HSN Codes | Service Accounting Codes support |
| Default GST Rates | Pre-configured GST rates per service |
| Service Selection | Quick add services to invoices |
| Description | Detailed service descriptions |

---

## 6. PAYMENT & RECEIPT MANAGEMENT

| Feature | Description |
|---------|-------------|
| Record Payment | Record payments against invoices |
| Auto Receipt Generation | Auto-generate receipt on payment |
| Receipt PDF | Download receipt as PDF |
| Email Receipt | Send receipt via email with PDF attachment |
| Income Tax TDS | Track TDS deducted by clients |
| GST TDS | Track GST TDS (government undertakings) |
| Multiple Payment Methods | Bank Transfer, Cash, Cheque, UPI, Card, Other |
| Partial Payments | Multiple payments per invoice |
| Multi-select Operations | Bulk email, download, print receipts |
| Payment Reference | Transaction/cheque reference number tracking |
| Auto Invoice Conversion | Proforma to Tax Invoice on full payment |

### TDS Calculation
- Income Tax TDS (percentage or fixed amount)
- GST TDS (for government clients)
- Net Amount = Invoice Amount - IT TDS - GST TDS

---

## 7. REPORTS & ANALYTICS

| Report Type | Description |
|-------------|-------------|
| Revenue Report | Total revenue analysis by date range |
| Outstanding Report | Pending invoices with days overdue calculation |
| GST Summary | Tax breakdown - CGST/SGST/IGST |
| Client-wise Report | Revenue grouped by client |
| Receipt Report | Payment transactions history |
| TDS Summary | Income Tax TDS deducted by clients |
| GST TDS Summary | GST TDS for government undertakings |

### Report Features
- Date Filters: This Month, Last Month, This Quarter, This Year, Custom
- Export to PDF
- Export to Excel/CSV
- Email Reports to any recipient

---

## 8. SETTINGS & CONFIGURATION

### Company Settings
- Company Name & Trading Name
- Address, City, State, PIN Code
- GST State Code (auto-filled)
- GSTIN & GST Registration Date
- PAN Number
- Phone & Email
- Logo Upload (max 5MB, auto-resized to 300x150px)

### Invoice Settings
- Invoice Prefix (e.g., INV-)
- Starting Invoice Number
- Proforma Prefix (e.g., PI-)
- Proforma Starting Number
- Receipt Prefix (e.g., RCPT-)
- GST Enabled Toggle
- Default GST Rate
- Payment Due Days
- Terms & Conditions
- Default Notes

### Payment Reminder Settings
- Enable Payment Reminders
- Reminder Frequency (days)
- Custom Email Subject Template
- Custom Email Body Template with variables:
  - {invoice_number}
  - {client_name}
  - {invoice_date}
  - {total_amount}

### Email Settings (Per Organization)
- SMTP Host
- SMTP Port
- SMTP Username
- SMTP Password (encrypted storage)
- From Email
- From Name
- Use TLS Toggle
- Email Signature
- Test Email Functionality

### Invoice Format Editor (40+ Options)
- Logo Position & Size
- Header Color
- Company Info Display
- Invoice Details Display
- Client/Bill-To Settings
- Table Columns (HSN/SAC, Serial Numbers)
- GST Display (CGST/SGST vs IGST)
- Total Section Settings
- Footer (Bank Details, Signature, Seal)
- Font Size & Page Numbering

---

## 9. SUBSCRIPTION & BILLING (SaaS)

| Feature | Description |
|---------|-------------|
| Multiple Plans | Free, Basic, Professional, Enterprise tiers |
| Plan Limits | Users, invoices/month, storage, organizations |
| Trial Periods | Free trial support with auto-expiry |
| Coupon System | Percentage, fixed amount, or extended days discounts |
| Coupon Validation | Validate before applying |
| Usage Tracking | Track usage against plan limits |
| Upgrade Requests | Request upgrade with payment reference |
| SuperAdmin Approval | Approve/reject upgrade requests |
| My Subscription Page | View current plan, usage, days remaining |

### Subscription Plan Fields
- Plan Name
- Description
- Price
- Billing Cycle (Monthly/Yearly/Lifetime)
- Trial Days
- Max Users
- Max Organizations
- Max Invoices per Month
- Max Storage (GB)
- Features List
- Active/Visible Status
- Popular/Highlight Badge
- Sort Order

### Coupon Features
- Coupon Code
- Discount Types: Percentage, Fixed Amount, Extended Days
- Valid Date Range
- Max Total Uses
- Max Uses Per User
- Applicable Plans

---

## 10. SUPERADMIN FEATURES

| Feature | Description |
|---------|-------------|
| Dashboard Statistics | System-wide analytics (orgs, users, revenue) |
| Organization Management | View, edit, suspend, delete organizations |
| User Management | Manage all users across organizations |
| Plan Management | Create/edit subscription plans |
| Coupon Management | Create/manage discount coupons |
| System Email Config | Global SMTP settings for system emails |
| Upgrade Approvals | Approve/reject subscription upgrade requests |
| Notifications System | In-app notifications with unread count |
| Bulk Email System | Email templates and campaigns |

### Notification Types
- New Organization Created
- Upgrade Request Submitted
- Payment Received
- System Alerts
- Security Alerts

### Bulk Email Features
- Email Templates (7 types: Announcement, Plan Change, New Feature, Maintenance, Security, Policy, Newsletter)
- Email Campaigns with recipient targeting
- Recipient Types: All Users, Active Users, Plan-specific, Organization-specific
- Delivery Tracking (sent, failed counts)
- Quick Send to selected recipients

---

## 11. COMPLIANCE FEATURES

### GST Compliance (India)
- Full Indian GST support
- GSTIN validation
- State-wise GST codes (all 36 states)
- CGST/SGST for intra-state
- IGST for inter-state
- HSN/SAC code support
- GST Registration Date tracking

### IT Act 2000/2008 Compliance
- Comprehensive audit logging
- IP address tracking
- User agent logging
- Action severity levels
- Resource change tracking (old/new values)
- Encrypted password storage

### DPDP Act 2023 Compliance
- User consent management (8 consent types)
- Consent withdrawal support
- Data deletion requests
- Personal data export
- Privacy policy with data collection disclosures
- Right to Access
- Right to Correction
- Right to Erasure
- Data Portability
- Grievance officer contact

### Security Features
- JWT token authentication
- Token refresh mechanism
- Failed login tracking
- Progressive account lockout
- SMTP password encryption (Fernet)
- Brute force attack prevention

---

## 12. UI/UX FEATURES

| Feature | Description |
|---------|-------------|
| Onboarding Wizard | 7-step guided setup for new users |
| Help Center | Role-based documentation with search |
| Landing Page | Public marketing page with pricing |
| Toast Notifications | Success/error/warning messages |
| Loading States | Spinners for async operations |
| Responsive Design | Mobile-friendly layout |
| DocMold Theme | Indigo/Purple gradient theme |
| Auto-hide Dropdowns | 5-second auto-hide for security |

### Onboarding Steps
1. Welcome Introduction
2. Company Setup
3. Invoice Settings
4. Email Configuration
5. Add First Client
6. Setup Services
7. Ready to Invoice

### Help Center Sections (13)
- Quick Start Guide
- Dashboard
- Invoices
- Clients
- Service Master
- Receipts
- Reports
- Settings
- Organization
- Subscription
- Profile
- FAQ
- Glossary

---

## 13. TECHNICAL SPECIFICATIONS

### Backend
- **Framework:** Django 4.x + Django REST Framework
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **Authentication:** JWT (SimpleJWT)
- **PDF Generation:** ReportLab
- **Email:** SMTP with TLS
- **Encryption:** Fernet symmetric encryption

### Frontend
- **Framework:** React 18
- **UI Library:** Material-UI (MUI)
- **Charts:** Recharts
- **State Management:** React Context
- **HTTP Client:** Axios
- **Routing:** React Router v6

### API Endpoints
- **Total:** 60+ REST endpoints
- **Authentication:** JWT with refresh tokens
- **Multi-tenancy:** X-Organization-ID header
- **Pagination:** Cursor-based pagination
- **Filtering:** Query parameter based

### Database Models
- **Total:** 28 models
- **Core:** Organization, User, Client, Invoice, Payment, Receipt
- **Settings:** CompanySettings, InvoiceSettings, EmailSettings
- **Subscription:** SubscriptionPlan, Subscription, Coupon
- **Compliance:** AuditLog, UserConsent, DataDeletionRequest

---

## 14. DATA EXPORT & INTEGRATION

| Feature | Description |
|---------|-------------|
| Invoice PDF Export | Single and bulk PDF generation |
| Receipt PDF Export | Payment receipt PDFs |
| Report Export | PDF and Excel/CSV formats |
| Personal Data Export | DPDP compliant user data export |
| Invoice Import | Excel/CSV/JSON import with validation |
| Tally Export | Tally Prime compatible XML format |
| Excel Template | Downloadable import template |

---

## 15. EMAIL FEATURES

| Feature | Description |
|---------|-------------|
| Invoice Email | Send invoice with PDF attachment |
| Receipt Email | Send receipt with PDF attachment |
| Bulk Invoice Email | Send to multiple clients |
| Report Email | Email reports to any recipient |
| Payment Reminders | Automated reminder emails |
| Custom Templates | Configurable email templates |
| Email Signature | Organization-specific signatures |
| Test Email | Verify SMTP configuration |

---

## SUMMARY STATISTICS

| Category | Count |
|----------|-------|
| Database Models | 28 |
| API Endpoints | 60+ |
| Frontend Components | 25+ |
| Report Types | 7 |
| User Roles | 4 |
| Indian States Supported | 36 |
| Help Center Sections | 13 |
| Onboarding Steps | 7 |
| Invoice Format Options | 40+ |

---

*Document Generated: December 5, 2025*
*NexInvo - GST Compliant Invoice Management System*

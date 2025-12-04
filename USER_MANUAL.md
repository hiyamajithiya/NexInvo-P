# NexInvo - User Manual
### Complete Guide to Invoice Management System

**Version:** 1.0
**Last Updated:** November 2024

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Initial Setup (First-Time Users)](#2-initial-setup-first-time-users)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Managing Clients](#4-managing-clients)
5. [Service Master](#5-service-master)
6. [Creating Invoices](#6-creating-invoices)
7. [Recording Payments](#7-recording-payments)
8. [Receipts](#8-receipts)
9. [Reports](#9-reports)
10. [Settings Configuration](#10-settings-configuration)
11. [Exporting Data to Tally Prime](#11-exporting-data-to-tally-prime)
12. [Organization Management](#12-organization-management)
13. [Subscription & Plans](#13-subscription--plans)
14. [Frequently Asked Questions](#14-frequently-asked-questions)

---

## 1. Getting Started

### 1.1 Registration (New Users)

1. Open the NexInvo application in your browser
2. On the login page, click **"Don't have an account? Register"**
3. Fill in the registration form:
   - **Email Address** - Your email (will be used for login)
   - **Password** - Create a strong password
   - **First Name** - Your first name
   - **Last Name** - Your last name
   - **Company Name** - Your organization name
4. Check the box to accept **Terms of Service** and **Privacy Policy**
5. Click **"Create Account"**
6. You will be automatically logged in after successful registration

### 1.2 Login (Existing Users)

1. Open the NexInvo application
2. Enter your **Email** and **Password**
3. Click **"Sign In"**

### 1.3 Forgot Password?

1. Click **"Forgot Password?"** on the login page
2. Enter your registered email address
3. Check your email for password reset instructions
4. Follow the link to create a new password

---

## 2. Initial Setup (First-Time Users)

**IMPORTANT:** Complete these settings before creating your first invoice.

### Step 1: Company Information

Navigate to **Settings** > **Company Info**

Fill in all the fields:

| Field | Description | Example |
|-------|-------------|---------|
| Company Name* | Your registered company name | ABC Technologies Pvt Ltd |
| Trading Name | Business name (if different) | ABC Tech |
| Address | Full business address | 123, Business Park, MG Road |
| City | City name | Mumbai |
| State | Select from dropdown | Maharashtra |
| PIN Code | Postal code | 400001 |
| State Code | GST state code (auto-filled) | 27 |
| GSTIN | 15-digit GST number | 27AABCU9603R1ZM |
| GST Registration Date | When you registered for GST | 01-07-2017 |
| PAN | 10-character PAN | AABCU9603R |
| Phone | Contact number | +91 9876543210 |
| Email | Business email | info@abctech.com |

**Upload Company Logo:**
1. Click on the logo upload area
2. Select your logo file (PNG, JPG - Max 2MB)
3. Recommended size: 200x100 pixels

Click **"Save Changes"**

### Step 2: Invoice Settings

Navigate to **Settings** > **Invoice Settings**

**Tax Invoice Settings:**
| Field | Description | Recommended |
|-------|-------------|-------------|
| Invoice Prefix | Prefix for invoice numbers | INV- |
| Starting Number | First invoice number | 1 |

**Proforma Invoice Settings:**
| Field | Description | Recommended |
|-------|-------------|-------------|
| Proforma Prefix | Prefix for proforma invoices | PI- |
| Starting Number | First proforma number | 1 |

**General Settings:**
| Field | Description | Recommended |
|-------|-------------|-------------|
| Enable GST | Toggle ON if GST registered | ON |
| Default GST Rate | Standard GST rate | 18% |
| Payment Due Days | Default payment terms | 30 |
| Terms & Conditions | Standard terms | (Enter your terms) |
| Notes | Default invoice notes | Thank you for your business! |

**Payment Reminder Settings:**
| Field | Description |
|-------|-------------|
| Enable Reminders | Auto-send payment reminders | ON |
| Reminder Frequency | Days between reminders | 3 |
| Email Subject | Subject line template | Payment Reminder for Invoice {invoice_number} |
| Email Body | Message template | (Use provided template) |

Click **"Save Changes"**

### Step 3: Email Settings (For Sending Invoices)

Navigate to **Settings** > **Email Settings**

**For Gmail Users:**
| Field | Value |
|-------|-------|
| SMTP Host | smtp.gmail.com |
| SMTP Port | 587 |
| SMTP Username | your-email@gmail.com |
| SMTP Password | App Password (see note below) |
| From Email | your-email@gmail.com |
| From Name | Your Company Name |
| Use TLS | ON |

**Note for Gmail:** You need to create an "App Password":
1. Go to Google Account > Security
2. Enable 2-Step Verification
3. Go to App Passwords
4. Create a new App Password for "Mail"
5. Use this 16-character password in SMTP Password field

Click **"Save Email Settings"** then **"Send Test Email"** to verify.

### Step 4: Payment Terms

Navigate to **Settings** > **Payment Terms**

Create common payment terms:

| Term Name | Days | Description |
|-----------|------|-------------|
| Due on Receipt | 0 | Payment due immediately |
| Net 15 | 15 | Payment due in 15 days |
| Net 30 | 30 | Payment due in 30 days |
| Net 45 | 45 | Payment due in 45 days |
| Net 60 | 60 | Payment due in 60 days |

For each term:
1. Click **"Add Payment Term"**
2. Enter Term Name, Days, and Description
3. Click **"Save Payment Term"**

---

## 3. Dashboard Overview

The Dashboard is your home screen showing business overview.

### Statistics Cards

| Card | Description |
|------|-------------|
| Total Invoices | Total number of invoices created |
| Revenue | Total amount collected (Paid invoices) |
| Pending | Outstanding amount (Unpaid invoices) |
| Clients | Total number of clients |

### Subscription Status (if applicable)

- Plan Name and days remaining
- Usage meters (Users, Invoices, Storage)
- Next billing date

### Navigation Menu

| Menu Item | Function |
|-----------|----------|
| Dashboard | Home/Overview |
| Invoices | Create and manage invoices |
| Clients | Manage client database |
| Service Master | Create service items |
| Payments | Record payments |
| Reports | Generate various reports |
| Settings | Application configuration |
| Organization | Manage team members |
| Profile | User account settings |

---

## 4. Managing Clients

### 4.1 Adding a New Client

1. Navigate to **Clients** from the menu
2. Click **"Add Client"** button
3. Fill in the client details:

**Basic Information:**
| Field | Required | Description |
|-------|----------|-------------|
| Client Name | Yes | Full legal name |
| Client Code | No | Unique identifier (auto-generated if blank) |
| Email | No | For sending invoices |
| Mobile | No | Contact number |

**Address:**
| Field | Description |
|-------|-------------|
| Address | Street address |
| City | City name |
| State | Select from dropdown (Indian states) |
| PIN Code | Postal code |

**Tax Information:**
| Field | Format | Description |
|-------|--------|-------------|
| GSTIN | 15 characters | Client's GST number |
| PAN | 10 characters | Client's PAN |

4. Click **"Save Client"**

### 4.2 Editing a Client

1. Go to **Clients**
2. Find the client in the list
3. Click the **Edit** icon (pencil)
4. Update the information
5. Click **"Save Client"**

### 4.3 Searching for Clients

Use the search box at the top to search by:
- Client name
- Client code
- Email
- GSTIN

### 4.4 Deleting a Client

1. Find the client in the list
2. Click the **Delete** icon (trash)
3. Confirm deletion

**Note:** You cannot delete a client with existing invoices.

---

## 5. Service Master

Service Master allows you to pre-define services/items for quick invoice creation.

### 5.1 Adding a Service

1. Navigate to **Service Master**
2. Click **"Add Service"**
3. Fill in the details:

| Field | Required | Description |
|-------|----------|-------------|
| Service Name | Yes | Name of the service/product |
| Description | No | Detailed description |
| SAC Code | No | Service Accounting Code for GST |
| GST Rate | Yes | Default GST rate (%) |

4. Click **"Save Service"**

### 5.2 Using Services in Invoices

When creating an invoice:
1. In the line item, click the **Description** field
2. Select from the dropdown of services
3. SAC Code and GST Rate will auto-fill

### Common SAC Codes

| Code | Service Type |
|------|--------------|
| 998311 | Management consulting |
| 998312 | Business consulting |
| 998313 | IT consulting |
| 998314 | Marketing consulting |
| 998399 | Other professional services |
| 9973 | Leasing or rental services |
| 9983 | Other professional services |

---

## 6. Creating Invoices

### 6.1 Creating a New Invoice

1. Navigate to **Invoices**
2. Click **"Create Invoice"**
3. Select invoice type:
   - **Proforma Invoice** - For quotations/estimates
   - **Tax Invoice** - For billing/tax purposes

### 6.2 Invoice Form Fields

**Header Section:**
| Field | Description |
|-------|-------------|
| Invoice Type | Proforma or Tax |
| Invoice Date | Date of invoice |
| Client | Select from dropdown |
| Payment Terms | Select payment term |

**Line Items:**
| Column | Description |
|--------|-------------|
| S.No | Serial number (auto) |
| Description | Service/product description |
| HSN/SAC | HSN or SAC code |
| GST Rate (%) | Tax rate |
| Taxable Amount | Amount before tax |
| Total | Amount with tax (auto-calculated) |

**Adding Line Items:**
1. Click **"+ Add Item"**
2. Enter Description (or select from Service Master)
3. Enter HSN/SAC code
4. Enter GST Rate (default 18%)
5. Enter Taxable Amount
6. Total is calculated automatically

**Footer Section:**
| Field | Description |
|-------|-------------|
| Notes | Additional notes for client |
| Subtotal | Sum of taxable amounts |
| Tax Amount | Total GST |
| Round Off | Adjustment for rounding |
| Grand Total | Final invoice amount |

### 6.3 Saving the Invoice

- **Save as Draft**: Click "Save" - can be edited later
- **Save & Send**: Click "Save & Send" - saves and emails to client

### 6.4 Invoice Actions

| Action | Icon | Description |
|--------|------|-------------|
| Edit | Pencil | Modify invoice details |
| Download PDF | Document | Download invoice as PDF |
| Send Email | Envelope | Email invoice to client |
| Convert | Refresh | Convert Proforma to Tax Invoice |
| Delete | Trash | Delete invoice |

### 6.5 Converting Proforma to Tax Invoice

When a proforma invoice is paid:
1. Go to **Invoices** > **Proforma** tab
2. Find the proforma invoice
3. Click the **Convert** icon
4. A new Tax Invoice is created with next number
5. Both invoices are linked

### 6.6 Importing Invoices (Bulk)

1. Click **"Import"** button
2. Download the template (Excel file)
3. Fill in your data following the template format
4. Upload the completed file
5. Review import summary:
   - Successful imports
   - Failed imports with reasons
   - New clients/services created

---

## 7. Recording Payments

### 7.1 Recording a Payment

1. Navigate to **Payments**
2. Click **"Record Payment"**
3. Fill in the payment details:

| Field | Description |
|-------|-------------|
| Invoice | Select unpaid invoice from dropdown |
| Payment Date | Date payment was received |
| Amount | Total payment amount |
| TDS Amount | Tax Deducted at Source (if any) |
| Amount Received | Auto-calculated (Amount - TDS) |
| Payment Method | Bank Transfer/Cheque/Cash/UPI/Card/Other |
| Reference Number | Cheque number or transaction ID |
| Notes | Additional notes |

4. Click **"Record Payment"**

### 7.2 Understanding TDS

If client deducts TDS:
- **Amount**: Full invoice amount (e.g., ₹10,000)
- **TDS Amount**: TDS deducted (e.g., ₹1,000 for 10% TDS)
- **Amount Received**: Actual receipt (e.g., ₹9,000)

### 7.3 Partial Payments

You can record multiple payments against a single invoice:
1. Record first payment
2. Record subsequent payments
3. Invoice status changes to "Paid" when fully paid

### 7.4 Payment Actions

| Action | Description |
|--------|-------------|
| Edit | Modify payment details |
| Download Receipt | Download receipt PDF |
| Delete | Remove payment record |

---

## 8. Receipts

### 8.1 Automatic Receipt Generation

When you record a payment:
- A receipt is automatically generated
- Receipt number follows the sequence (RCPT-0001, RCPT-0002...)

### 8.2 Receipt Contents

Each receipt includes:
- Receipt Number and Date
- Client Details
- Invoice Reference
- Payment Details:
  - Total Amount
  - TDS Deducted
  - Amount Received
  - Payment Method
  - Reference Number
- Company Details with signature area

### 8.3 Downloading Receipt

1. Go to **Payments**
2. Find the payment
3. Click **Download Receipt** icon
4. PDF receipt is downloaded

### 8.4 Emailing Receipt

1. Find the payment
2. Click **Email Receipt** icon
3. Receipt is sent to client's email

---

## 9. Reports

### 9.1 Available Reports

Navigate to **Reports** and select from:

| Report | Description |
|--------|-------------|
| Revenue Report | All invoices with amounts and status |
| Outstanding Report | Unpaid invoices with days overdue |
| GST Summary | Tax breakdown by CGST, SGST, IGST |
| Client-wise Report | Revenue grouped by client |
| Payment Report | All payment transactions |
| TDS Summary | TDS deducted by clients |

### 9.2 Date Filters

Each report can be filtered by:
- This Month
- Last Month
- This Quarter
- This Year
- Custom Date Range

### 9.3 Revenue Report

Shows:
- Invoice Number
- Invoice Date
- Client Name
- Invoice Amount
- Status (Draft/Sent/Paid)

### 9.4 Outstanding Report

Shows:
- Invoice Number
- Client Name
- Invoice Amount
- Due Date
- Days Overdue
- Total Outstanding

### 9.5 GST Summary Report

Shows:
- Invoice-wise taxable amount
- CGST Amount (for intra-state)
- SGST Amount (for intra-state)
- IGST Amount (for inter-state)
- Total Tax Collected

### 9.6 TDS Summary Report

Shows:
- Client Name
- TDS Amount Deducted
- Payment Date
- Invoice Reference

---

## 10. Settings Configuration

### 10.1 Company Info

Configure your company details (See Section 2.1)

### 10.2 Invoice Settings

Configure invoice numbering and defaults (See Section 2.2)

### 10.3 Email Settings

Configure SMTP for sending emails (See Section 2.3)

### 10.4 Invoice Format

Customize your invoice template:
- Header layout
- Logo position
- Footer content
- Terms display
- Signature area

### 10.5 Payment Terms

Manage payment term options (See Section 2.4)

### 10.6 Users & Roles

Add team members to your organization:

1. Click **"Add User"**
2. Enter user details:
   - Full Name
   - Email
   - Role (Admin/User/Viewer)
   - Password
3. Click **"Save User"**

**Role Permissions:**
| Role | Permissions |
|------|-------------|
| Admin | Full access to all features |
| User | Create/edit invoices, clients, payments |
| Viewer | View only - no editing |

### 10.7 Backup & Data Export

Export your data for backup:

**Available Exports:**
| Export Type | Format | Contents |
|-------------|--------|----------|
| All Data | Excel/CSV | Invoices, Clients, Payments |
| Invoices Only | Excel/CSV | Invoice records |
| Clients Only | Excel/CSV | Client database |
| Payments Only | Excel/CSV | Payment records |

---

## 11. Exporting Data to Tally Prime

### 11.1 Pre-Requirements

Before importing into Tally Prime, create these ledgers:

| Ledger Name | Under Group | Purpose |
|-------------|-------------|---------|
| Sales | Sales Accounts | Revenue |
| CGST @9% | Duties & Taxes | Central GST |
| SGST @9% | Duties & Taxes | State GST |
| IGST @18% | Duties & Taxes | Integrated GST |
| Round Off | Indirect Expenses | Rounding |
| [Client Names] | Sundry Debtors | Each client |

### 11.2 Exporting to Tally

Navigate to **Settings** > **Backup & Data** > **Export to Tally Prime**

1. Select **Date Range** (optional)
2. Select **Invoice Type**:
   - Tax Invoices Only
   - Proforma Invoices Only
   - All Invoices
3. Choose format:
   - **Download XML** - Direct import, no mapping needed
   - **Download Excel** - Multiple sheets with instructions

### 11.3 Importing XML into Tally Prime

1. Open Tally Prime
2. Go to **Gateway of Tally > Import**
3. Select **Transactions (Vouchers)**
4. Browse and select the XML file
5. Press Enter to import
6. Review in Day Book

### 11.4 Importing Excel into Tally Prime

1. Open Tally Prime
2. Go to **Gateway of Tally > Import > Data**
3. Select **Import from Excel**
4. Browse and select the Excel file
5. Select **"Sales Vouchers"** sheet
6. Map columns:
   - Voucher Date → Date column
   - Voucher Number → Voucher Number column
   - Party Ledger → Party Ledger Name column
   - Amount → Net Amount column
7. Click Import
8. Review in Day Book

### 11.5 Excel Sheets Included

| Sheet | Purpose |
|-------|---------|
| Sales Vouchers | Main data for import |
| Item Details | Line-item breakdown |
| Party Ledgers | Client details to create |
| GST Summary | Tax breakdown |
| Import Instructions | Step-by-step guide |
| Ledgers Required | Ledgers to create first |

---

## 12. Organization Management

### 12.1 Inviting Team Members

1. Navigate to **Organization**
2. Click **"Invite Member"**
3. Enter email address
4. Select role (Admin/User/Viewer)
5. Click **"Send Invite"**

### 12.2 Managing Members

View all members with:
- Name
- Email
- Role
- Join Date
- Status

**Actions:**
- Change role
- Remove member

### 12.3 Switching Organizations

If you belong to multiple organizations:
1. Click the organization dropdown in the header
2. Select the organization you want to switch to
3. All data will change to that organization's context

---

## 13. Subscription & Plans

### 13.1 Viewing Current Subscription

Navigate to **My Subscription** to see:
- Current Plan Name
- Status (Active/Trial/Expired)
- Days Remaining
- Start and End Dates
- Plan Limits (Users, Invoices, Storage)
- Applied Coupon (if any)

### 13.2 Upgrading Plan

1. Navigate to **Upgrade Plan**
2. Browse available plans
3. Compare features
4. Apply coupon code (if available):
   - Enter code in "Have a coupon?" field
   - Click "Apply"
   - Discount will be shown
5. Click **"Subscribe"** on desired plan

### 13.3 Plan Limits

Each plan has limits on:
- Number of users
- Invoices per month
- Storage (GB)

When you approach limits, you'll see warnings on the dashboard.

---

## 14. Frequently Asked Questions

### Q1: How do I change my invoice number format?
Go to **Settings > Invoice Settings** and change the Invoice Prefix (e.g., from "INV-" to "ABC/INV/").

### Q2: Can I edit a sent invoice?
No, sent invoices cannot be edited to maintain audit trail. Create a new corrected invoice if needed.

### Q3: How do I handle credit notes?
Create a new invoice with negative amount as a credit note, or contact support for credit note feature.

### Q4: Why can't I delete a client?
Clients with existing invoices cannot be deleted. You can deactivate them instead.

### Q5: How do I change my company logo?
Go to **Settings > Company Info**, click on the current logo, and upload a new image.

### Q6: What if I forget my password?
Click "Forgot Password" on the login page and follow the email instructions.

### Q7: How do I add multiple GST rates?
In the invoice form, each line item can have a different GST rate. Simply change the rate for that item.

### Q8: Can I send invoices to multiple email addresses?
Currently, invoices are sent to the client's primary email. You can CC additional emails by updating client details.

### Q9: How do I track partial payments?
Record each payment separately against the same invoice. The system tracks the balance automatically.

### Q10: What is the difference between Proforma and Tax Invoice?
- **Proforma**: A quotation/estimate before confirming the order
- **Tax Invoice**: The official invoice for GST and payment purposes

---

## Support

For additional help:
- **Email**: chinmaytechsoft@gmail.com
- **Response Time**: Within 24-48 hours

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl + N | New Invoice |
| Ctrl + S | Save |
| Ctrl + P | Print/Download PDF |
| Escape | Cancel/Close |

---

## Glossary

| Term | Definition |
|------|------------|
| GSTIN | 15-digit GST Identification Number |
| PAN | 10-digit Permanent Account Number |
| HSN | Harmonized System of Nomenclature (for goods) |
| SAC | Services Accounting Code (for services) |
| CGST | Central Goods and Services Tax |
| SGST | State Goods and Services Tax |
| IGST | Integrated Goods and Services Tax |
| TDS | Tax Deducted at Source |
| Proforma | Preliminary invoice/quotation |

---

**End of User Manual**

*For the latest updates and features, please check the application's Help section.*

# Email Setup Guide for NexInvo

Complete guide to configure email sending in NexInvo for invoices and notifications.

## Gmail SMTP Setup (Recommended)

### Step 1: Enable 2-Step Verification

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Under "Signing in to Google", click on **2-Step Verification**
4. Follow the steps to enable it

### Step 2: Generate App Password

1. After enabling 2-Step Verification, go back to **Security**
2. Under "Signing in to Google", click on **App passwords**
3. You might need to sign in again
4. Select app: Choose **Mail**
5. Select device: Choose **Other (Custom name)**
6. Enter name: `NexInvo` or any name you prefer
7. Click **Generate**
8. **Copy the 16-character password** (you won't see it again!)

### Step 3: Configure in NexInvo

1. Open NexInvo at http://localhost:3000 (or your domain)
2. Login to your account
3. Go to **Settings** → **Email Settings**
4. Fill in the following details:

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP Username: your-email@gmail.com
SMTP Password: [the 16-character app password from Step 2]
From Email: your-email@gmail.com
From Name: Your Company Name
Use TLS: ✓ (checked)
Email Signature: [Optional - your signature]
```

5. Click **Save Email Settings**
6. Click **Send Test Email** to verify

### Example Configuration

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP Username: himanshumajithiya@gmail.com
SMTP Password: abcd efgh ijkl mnop  (16 characters)
From Email: himanshumajithiya@gmail.com
From Name: HIMANSHU MAJITHIYA & CO.
Use TLS: ✓
```

## Other Email Providers

### Microsoft Outlook / Office 365

```
SMTP Host: smtp-mail.outlook.com
SMTP Port: 587
SMTP Username: your-email@outlook.com
SMTP Password: your-password
Use TLS: ✓
```

### Yahoo Mail

```
SMTP Host: smtp.mail.yahoo.com
SMTP Port: 587
SMTP Username: your-email@yahoo.com
SMTP Password: your-app-password
Use TLS: ✓
```

Note: Yahoo also requires an app-specific password. Generate one at:
https://login.yahoo.com/account/security

### Custom SMTP Server

```
SMTP Host: mail.yourdomain.com
SMTP Port: 587 (or 465 for SSL)
SMTP Username: your-email@yourdomain.com
SMTP Password: your-password
Use TLS: ✓ (or SSL depending on your server)
```

## Testing Email Configuration

After configuring email settings:

1. Click **Send Test Email** button
2. Check your email inbox (the From Email address)
3. You should receive: "NexInvo - Test Email"

### If Test Email Fails:

**Error: "Please configure SMTP username and password"**
- Solution: Fill in all required fields in Email Settings

**Error: "Authentication failed"**
- Solution: Check username and password are correct
- For Gmail: Use App Password, not your regular password
- For other providers: Verify credentials

**Error: "Connection refused"**
- Solution: Check SMTP Host and Port are correct
- Verify your firewall allows outbound SMTP connections

**Error: "TLS/SSL error"**
- Solution: Try toggling the "Use TLS" checkbox
- Some servers use port 465 with SSL instead of 587 with TLS

## Email Features in NexInvo

Once email is configured, you can:

### 1. Send Invoices via Email
- Create or edit an invoice
- Click **Send Email** button
- Invoice PDF will be automatically attached
- Email sent to client's email address

### 2. Email Templates
NexInvo uses professional email templates:

**Proforma Invoice Email:**
```
Subject: Proforma Invoice - PI-0001

Dear Client Name,

Please find attached Proforma Invoice PI-0001 dated DD-MMM-YYYY.

Invoice Details:
- Invoice Number: PI-0001
- Invoice Date: DD-MMM-YYYY
- Total Amount: ₹XX,XXX

[Payment Terms]
[Notes]

Thank you for your business!

Best Regards,
Your Company Name
```

**Tax Invoice Email:**
```
Subject: Tax Invoice - INV-0001

Dear Client Name,

Please find attached Tax Invoice INV-0001 dated DD-MMM-YYYY.

Invoice Details:
- Invoice Number: INV-0001
- Invoice Date: DD-MMM-YYYY
- Total Amount: ₹XX,XXX

[Payment Terms]
[Notes]

Thank you for your business!

Best Regards,
Your Company Name
```

## Security Best Practices

### ✅ Do's:
- ✅ Use App Passwords for Gmail (never use your main password)
- ✅ Use strong, unique passwords
- ✅ Enable 2-Factor Authentication on your email account
- ✅ Regularly review sent emails
- ✅ Use a dedicated email for business invoices

### ❌ Don'ts:
- ❌ Don't share your SMTP password with anyone
- ❌ Don't use personal email passwords
- ❌ Don't send sensitive information via email without encryption
- ❌ Don't disable SSL/TLS in production

## Troubleshooting

### Email Not Received?

1. **Check Spam Folder**
   - Test emails often go to spam
   - Mark as "Not Spam" to whitelist

2. **Verify Email Address**
   - Ensure client email is correct
   - Check for typos

3. **Check Email Logs**
   - In development: Check backend terminal for email content
   - In production: Check server logs

### Gmail Blocks Emails?

If Gmail blocks your app:
1. Check https://myaccount.google.com/lesssecureapps
2. Allow "Less secure app access" (if using password)
3. Better: Use App Password instead (recommended)

### Rate Limiting

Email providers have sending limits:
- **Gmail**: 500 emails/day (free), 2000/day (Google Workspace)
- **Outlook**: 300 emails/day
- **Yahoo**: 500 emails/day

For bulk sending, consider:
- Dedicated SMTP service (SendGrid, Mailgun, AWS SES)
- Spread sending over multiple days
- Batch processing

## Production Deployment

For production servers, configure email in Django settings:

Edit `/var/www/nexinvo/backend/nexinvo/settings.py`:

```python
# Email Configuration (Production)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-business-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
DEFAULT_FROM_EMAIL = 'your-business-email@gmail.com'

# Optional: For better deliverability
EMAIL_USE_SSL = False  # Use TLS instead
EMAIL_TIMEOUT = 30
```

Restart services:
```bash
sudo systemctl restart gunicorn
```

## Advanced Configuration

### Custom Email Signature

Add HTML signature in Email Settings:

```html
---
Best Regards,
HIMANSHU MAJITHIYA & CO. (PROP)
Chartered Accountant

Email: himanshumajithiya@gmail.com
Phone: +91 XXXXX XXXXX
Website: www.yourwebsite.com
```

### Email Delivery Tracking

Future feature - Track when invoices are:
- Sent
- Opened
- Downloaded
- Paid

## Support

If you continue to have email issues:

1. Check the EMAIL_SETUP_GUIDE.md (this file)
2. Review backend logs for errors
3. Test with different email provider
4. Contact your email provider support

---

**Last Updated**: November 2024
**Version**: 1.0.0

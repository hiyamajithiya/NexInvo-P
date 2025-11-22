# Automated Email Notification System

## Overview
The NexInvo system includes automated email notifications that are triggered on specific events. All emails are sent automatically using Django signals.

## Email Events

### 1. User Registration
**Trigger:** When a new user creates an account
**Recipients:** New user
**Email Type:** Welcome email
**Content:**
- Welcome message
- Login credentials (username, email)
- Login URL
- Getting started guide
- Key features overview

### 2. Organization Registration
**Trigger:** When a new organization is created
**Recipients:** All superadmins
**Email Type:** Notification email
**Content:**
- Organization details (name, registration date, plan)
- Owner details (username, email)
- Link to admin panel

### 3. User Added to Organization
**Trigger:** When a user is added to an organization
**Recipients:**
- New user (welcome email with org context)
- Organization owner/admin (notification)

**Email to New User:**
- Welcome message with organization context
- Login credentials
- Temporary password (if applicable)
- Organization name

**Email to Owner:**
- New user details
- Date added
- Link to organization members page

## Configuration

### Email Backend Settings

The system supports two email backends configured via environment variables:

#### Console Backend (Development)
Prints emails to console instead of sending them.

```env
EMAIL_BACKEND=console
```

#### SMTP Backend (Production)
Sends emails via SMTP server.

```env
EMAIL_BACKEND=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@nexinvo.com
SUPPORT_EMAIL=support@nexinvo.com
```

### Gmail Configuration
For Gmail SMTP:
1. Enable 2-Factor Authentication
2. Generate App Password at: https://myaccount.google.com/apppasswords
3. Use the generated password as `EMAIL_HOST_PASSWORD`

### Other SMTP Providers
- **Office 365:** smtp.office365.com:587
- **Outlook:** smtp-mail.outlook.com:587
- **SendGrid:** smtp.sendgrid.net:587
- **Mailgun:** smtp.mailgun.org:587

## Files Structure

```
backend/
├── api/
│   ├── email_utils.py       # Email sending functions
│   ├── signals.py            # Signal handlers
│   └── apps.py              # Signal registration
├── nexinvo/
│   └── settings.py          # Email configuration
└── EMAIL_SYSTEM.md          # This file
```

## Email Templates

### Welcome Email Features
- Professional HTML design
- Responsive layout
- Branded colors (#1e3a8a)
- Clear call-to-action buttons
- Support contact information
- Company branding

### Email Components
All emails include:
- Company header
- Personalized greeting
- Important information in highlighted boxes
- Action buttons
- Footer with copyright
- Support email link

## Testing

### Development Testing
With console backend, emails appear in the Django console:

```bash
python manage.py runserver
```

Look for output like:
```
Content-Type: text/plain; charset="utf-8"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Subject: Welcome to NexInvo - Invoice Management System
From: noreply@nexinvo.com
To: user@example.com
Date: Thu, 23 Nov 2025 10:30:00 -0000
```

### Production Testing
1. Configure SMTP settings in .env
2. Register a test user
3. Check recipient's inbox (and spam folder)

## Security Considerations

### Temporary Passwords
- Generated using Django's `get_random_string()` (cryptographically secure)
- 12 characters by default
- Users must change on first login

### Email Security
- Use TLS encryption (EMAIL_USE_TLS=True)
- Store credentials in environment variables
- Never commit .env file
- Use app-specific passwords for Gmail

## Signal Flow

### User Registration Flow
```
1. User submits registration form
2. User.save() is called
3. post_save signal triggers
4. send_welcome_email_on_user_creation() executes
5. Email sent to user
```

### Organization Creation Flow
```
1. Organization.save() is called
2. OrganizationMembership created for owner
3. post_save signal triggers for Organization
4. send_notification_on_organization_creation() executes
5. Email sent to all superadmins
```

### User Added to Organization Flow
```
1. OrganizationMembership.save() is called
2. post_save signal triggers
3. send_notification_on_user_added_to_organization() executes
4. Welcome email sent to new user
5. Notification email sent to organization owner
```

## Customization

### Modifying Email Templates
Edit the HTML in `api/email_utils.py`:
- `send_welcome_email_to_user()` - User welcome emails
- `send_user_added_notification_to_owner()` - Owner notifications
- `send_organization_registration_email()` - Superadmin notifications

### Adding New Email Events
1. Create email function in `email_utils.py`
2. Create signal handler in `signals.py`
3. Register signal in `apps.py` (if needed)

### URL Configuration
Update URLs in email templates:
```python
'login_url': 'https://yourdomain.com/login',
'support_email': 'support@yourdomain.com',
```

## Troubleshooting

### Emails Not Sending
1. Check EMAIL_BACKEND setting
2. Verify SMTP credentials
3. Check server logs for errors
4. Verify recipient email addresses
5. Check spam folder

### Gmail "Less Secure Apps" Error
- Don't use "Allow Less Secure Apps"
- Use App Passwords instead
- Enable 2FA first

### HTML Not Rendering
Some email clients block HTML. System includes plain text fallback using `strip_tags()`.

## Future Enhancements
- Email templates in separate HTML files
- Celery integration for async sending
- Email delivery tracking
- Bounce handling
- Unsubscribe functionality
- Email queuing for bulk operations

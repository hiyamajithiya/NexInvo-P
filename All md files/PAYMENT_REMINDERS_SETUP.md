# Payment Reminder System Setup Guide

The NexInvo system includes an automatic payment reminder feature that sends email reminders for unpaid proforma invoices at configurable intervals.

## Features

- ✅ Automatic email reminders for unpaid proforma invoices
- ✅ Configurable reminder frequency (days)
- ✅ Customizable email subject and body templates
- ✅ Automatic stop when payment is recorded
- ✅ PDF invoice attachment with reminders
- ✅ Tracks reminder history (count and last sent date)

## Configuration

### 1. Enable Reminders in Settings

1. Go to **Settings** → **Invoice Settings**
2. Scroll to **Payment Reminder Settings**
3. Check **"Enable Automatic Payment Reminders"**
4. Set **Reminder Frequency** (e.g., 3 days)
5. Customize email subject and body templates
6. Click **Save Changes**

### 2. Email Template Placeholders

You can use these placeholders in your email templates:

- `{invoice_number}` - Invoice number (e.g., PI-0001)
- `{client_name}` - Client's name
- `{invoice_date}` - Invoice date
- `{total_amount}` - Total invoice amount
- `{reminder_count}` - Number of reminders sent

**Example Subject:**
```
Payment Reminder #{reminder_count} for Invoice {invoice_number}
```

**Example Body:**
```
Dear {client_name},

This is reminder #{reminder_count} for payment of invoice {invoice_number} dated {invoice_date}.

Amount Due: ₹{total_amount}

Please process the payment at your earliest convenience.

Thank you!
```

## Running the Reminder System

### Option 1: Manual Execution (Testing)

Run the management command manually:

```bash
cd backend
python manage.py send_payment_reminders
```

This will:
- Check all unpaid proforma invoices
- Send reminders based on frequency settings
- Update reminder tracking

### Option 2: Automated Scheduling (Production)

#### On Windows (Task Scheduler)

1. Open **Task Scheduler**
2. Click **Create Basic Task**
3. Name: "NexInvo Payment Reminders"
4. Trigger: **Daily**
5. Set time (e.g., 9:00 AM)
6. Action: **Start a program**
7. Program: `python`
8. Arguments: `manage.py send_payment_reminders`
9. Start in: `D:\ADMIN\Documents\HMC AI\Invoice\NexInvo(P)\backend`

#### On Linux/Mac (Cron Job)

Add to crontab:

```bash
# Run daily at 9:00 AM
0 9 * * * cd /path/to/NexInvo(P)/backend && python manage.py send_payment_reminders
```

Or for multiple times per day:

```bash
# Run every day at 9 AM, 2 PM, and 6 PM
0 9,14,18 * * * cd /path/to/NexInvo(P)/backend && python manage.py send_payment_reminders
```

### Option 3: Using Python Scheduler (Recommended for Development)

Create a scheduler script `backend/run_scheduler.py`:

```python
import schedule
import time
import subprocess
import os

def run_reminders():
    print("Running payment reminders...")
    result = subprocess.run(
        ['python', 'manage.py', 'send_payment_reminders'],
        cwd=os.path.dirname(__file__),
        capture_output=True,
        text=True
    )
    print(result.stdout)
    if result.stderr:
        print("Errors:", result.stderr)

# Run every day at 9:00 AM
schedule.every().day.at("09:00").do(run_reminders)

print("Scheduler started. Reminders will run daily at 9:00 AM")
while True:
    schedule.run_pending()
    time.sleep(60)
```

Install schedule package:
```bash
pip install schedule
```

Run the scheduler:
```bash
python run_scheduler.py
```

## How It Works

### Reminder Logic

1. **First Reminder:**
   - Sent X days after invoice date (where X = frequency setting)
   - Example: Invoice created on Jan 1, frequency = 3 days → First reminder on Jan 4

2. **Subsequent Reminders:**
   - Sent every X days after the last reminder
   - Example: Frequency = 3 days → Reminders on Jan 4, Jan 7, Jan 10, etc.

3. **Automatic Stop:**
   - Reminders stop automatically when:
     - Payment is recorded for the invoice
     - Invoice status changes to "paid"
     - Proforma is converted to tax invoice (payment received)

### Invoice Tracking

Each invoice tracks:
- `last_reminder_sent` - Date/time of last reminder
- `reminder_count` - Total number of reminders sent

You can see this information in the Django admin panel.

## Email Configuration

Make sure your email settings are configured in `.env`:

```env
EMAIL_BACKEND=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=info@yourdomain.com
```

For Gmail, you need to:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in `EMAIL_HOST_PASSWORD`

## Testing

1. Create a test proforma invoice
2. Set reminder frequency to 0 days for immediate testing
3. Run: `python manage.py send_payment_reminders`
4. Check the console for output
5. Check recipient's email

## Monitoring

The command outputs:
- ✓ Successfully sent reminders
- ✗ Failed reminders with error messages
- Summary: Total sent and skipped

Example output:
```
Starting payment reminder process...
✓ Sent reminder for PI-0001 to client@example.com
✓ Sent reminder for PI-0003 to another@example.com

Completed: 2 reminders sent, 1 skipped
```

## Troubleshooting

### Reminders not sending?

1. Check if reminders are enabled in Settings
2. Verify email configuration
3. Check invoice status (must be 'draft' or 'sent', not 'paid')
4. Verify client has email address
5. Check frequency - enough days passed?

### Testing without waiting?

Set `reminderFrequencyDays` to `0` or `1` for immediate testing.

### Check logs?

Run with verbose output:
```bash
python manage.py send_payment_reminders --verbosity 2
```

## Best Practices

1. **Set reasonable frequency**: 3-7 days is typical
2. **Professional tone**: Keep email templates polite and professional
3. **Test first**: Test with your own email before going live
4. **Monitor regularly**: Check sent reminders periodically
5. **Update templates**: Customize for your business needs

## Support

For issues or questions, check the main README or contact support.

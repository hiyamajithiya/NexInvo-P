# Server Deployment Steps - Payment Reminder Fix

## Issue Fixed
- ✅ Payment reminders not working (AttributeError: 'Invoice' object has no attribute 'due_date')
- ✅ Scheduled invoices not working (same due_date error)
- ✅ Added diagnostic scripts to troubleshoot issues

## What Was Changed
1. **backend/api/models.py** - Added `@property due_date()` method to Invoice model
2. **backend/api/email_service.py** - Fixed syntax errors from email log cleanup
3. **backend/api/scheduled_invoice_generator.py** - Fixed syntax errors
4. **backend/requirements.txt** - Updated with all packages, commented Windows-only packages
5. **backend/check_scheduled_jobs.py** - NEW diagnostic script
6. **backend/check_payment_reminders.py** - NEW diagnostic script
7. **backend/verify_server_fix.py** - NEW verification script

## Git Commits to Pull
```
7f1f0d6 - Add scheduled jobs status checker script
acc3c32 - Comment out Windows-only packages
86f01ec - Fix payment reminders and scheduled invoices by adding due_date property
a0ce117 - Add payment reminder diagnostic script
```

---

## Deployment Steps on Linux Server

### Step 1: Navigate to project directory
```bash
cd /var/www/nexinvo
```

### Step 2: Check current status
```bash
git status
git log --oneline -5
```

### Step 3: Pull latest changes (ALREADY DONE - confirmed from your output)
```bash
# If there are local changes, stash them
git stash

# Pull latest code
git pull origin master  # or your branch name

# If you stashed changes
git stash pop
```

### Step 4: **CRITICAL** - Restart Django Application
```bash
# Option A: If using systemd service
sudo systemctl restart nexinvo

# Option B: If using gunicorn directly
sudo systemctl restart gunicorn

# Option C: If using supervisord
sudo supervisorctl restart nexinvo

# Option D: If using manual gunicorn
pkill gunicorn
cd /var/www/nexinvo/backend
gunicorn nexinvo.wsgi:application --bind 0.0.0.0:8000 --daemon
```

**WHY THIS IS CRITICAL:**
The server has the latest code in git (commit 86f01ec) but Django is still running old code in memory. Restart loads the new `due_date` property.

### Step 5: Verify the fix is working
```bash
cd /var/www/nexinvo/backend

# Quick test - this should NOT show any errors
python verify_server_fix.py
```

**Expected output:**
```
✅ SUCCESS: due_date property is working!
✅ 5/5 invoices can calculate due_date
✅ Reminders ENABLED for organizations
✅ Email settings configured
✅ Invoices eligible for reminder NOW: X
```

**If you see errors:**
```
❌ FAILED: due_date property not found!
👉 Server needs restart: sudo systemctl restart nexinvo
```
This means Django app didn't restart - go back to Step 4.

### Step 6: Run diagnostic scripts
```bash
# Check scheduler status
python check_scheduled_jobs.py

# Check payment reminder eligibility
python check_payment_reminders.py
```

### Step 7: Test manual reminder send (optional)
```bash
# Manually trigger payment reminders to test
python manage.py send_payment_reminders
```

**Expected output:**
```
[SUCCESS] Sent reminder for PI-0001
[SUCCESS] Sent reminder for PI-0002
[SKIPPED] PI-0003: Reminder sent recently
Summary: 2 sent, 1 skipped, 0 failed ✅
```

### Step 8: Monitor scheduled runs
```bash
# Check when next automatic run will happen
python check_scheduled_jobs.py

# Monitor Django logs for scheduled runs
tail -f /var/log/nexinvo/django.log  # adjust path as needed
```

---

## Troubleshooting

### Problem: Still getting "due_date" AttributeError
**Cause:** Django application not restarted
**Solution:** Go back to Step 4 and restart using the correct command for your setup

### Problem: Reminders not being sent
**Run diagnostics:**
```bash
python check_payment_reminders.py
```

**Common reasons:**
1. ⚠️ Reminders disabled at organization level
2. ⚠️ No invoices eligible (all too new or recently reminded)
3. ⚠️ Clients missing email addresses
4. ⚠️ All invoices already paid
5. ⚠️ Email settings not configured

### Problem: Scheduler not running
**Check scheduler:**
```bash
python check_scheduled_jobs.py
```

**If no jobs found:**
- Scheduler hasn't initialized
- Restart Django server

**If jobs show "Overdue":**
- Scheduler process may have crashed
- Check Django logs for errors
- Restart Django server

### Problem: Git merge conflicts
```bash
# Stash local changes
git stash

# Pull updates
git pull origin master

# Review stashed changes
git stash show

# Apply if needed, or drop
git stash drop
```

---

## Verification Checklist

After deployment, verify:

- [ ] Django application restarted successfully
- [ ] `python verify_server_fix.py` shows all tests passed
- [ ] `python check_scheduled_jobs.py` shows jobs are active
- [ ] `python check_payment_reminders.py` shows eligible invoices
- [ ] Manual test `python manage.py send_payment_reminders` works
- [ ] No errors in Django logs
- [ ] Next scheduled run time is reasonable (09:00 UTC / 14:30 IST)

---

## Production Monitoring

**Monitor payment reminders:**
```bash
# Check logs daily
tail -100 /var/log/nexinvo/django.log | grep "payment_reminders"

# Check scheduler health weekly
python check_scheduled_jobs.py
```

**Expected behavior:**
- Daily run at 09:00 UTC (14:30 IST)
- Invoices sent reminders based on frequency settings
- No "failed" executions in scheduler
- All eligible invoices receive reminders

---

## Need Help?

**If reminders still not working after following all steps:**

1. Run all diagnostic scripts and save output:
```bash
python verify_server_fix.py > fix_verification.txt
python check_scheduled_jobs.py > scheduler_status.txt
python check_payment_reminders.py > reminder_status.txt
```

2. Check Django logs:
```bash
tail -500 /var/log/nexinvo/django.log > recent_logs.txt
```

3. Share these files for further troubleshooting

---

## Current Status (as of last check)

✅ Code deployed to server (git pull completed)
⏳ **PENDING:** Django application restart (Step 4)
⏳ **PENDING:** Verification tests (Step 5)

**NEXT ACTION:** Restart Django application on server

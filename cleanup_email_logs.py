"""
Script to remove all EmailLog-related code from views.py, urls.py, email_templates.py, email_service.py,
and scheduled_invoice_generator.py
"""
import os
import re

backend_path = r"D:\ADMIN\Documents\HMC AI\Invoice\NexInvo(P)\backend\api"

# Remove EmailLog imports and views from views.py
views_file = os.path.join(backend_path, "views.py")
with open(views_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove EmailLog import
content = re.sub(r',\s*EmailLog\b', '', content)
content = re.sub(r'EmailLog\s*,', '', content)

# Remove EmailLogSerializer import
content = re.sub(r',\s*EmailLogSerializer\b', '', content)
content = re.sub(r'EmailLogSerializer\s*,', '', content)

# Remove EmailLogViewSet class (find and remove entire class)
content = re.sub(
    r'class EmailLogViewSet\(.*?\):.*?(?=\n(?:class |def |$))',
    '',
    content,
    flags=re.DOTALL
)

# Remove email_log_stats function
content = re.sub(
    r'@api_view\(\[\'GET\'\]\)\s*\n\s*@permission_classes\(\[IsAuthenticated\]\)\s*\n\s*def email_log_stats\(.*?\):.*?(?=\n(?:@|class |def |$))',
    '',
    content,
    flags=re.DOTALL
)

with open(views_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Cleaned views.py")

# Remove email-logs URLs from urls.py
urls_file = os.path.join(backend_path, "urls.py")
with open(urls_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if 'email-logs' in line.lower() or 'emaillog' in line.lower():
        skip = True
        continue
    if skip and line.strip() and not line.strip().startswith('#'):
        skip = False
    if not skip:
        new_lines.append(line)

with open(urls_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("[OK] Cleaned urls.py")

# Remove log_email function from email_templates.py
email_templates_file = os.path.join(backend_path, "email_templates.py")
with open(email_templates_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove log_email function
content = re.sub(
    r'def log_email\(.*?\):.*?return email_log',
    '',
    content,
    flags=re.DOTALL
)

with open(email_templates_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Cleaned email_templates.py")

# Remove email logging from email_service.py
email_service_file = os.path.join(backend_path, "email_service.py")
with open(email_service_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove import of log_email
content = re.sub(r'from \.email_templates import.*?log_email.*?\n', '', content)
content = re.sub(r',\s*log_email', '', content)
content = re.sub(r'log_email\s*,', '', content)

# Remove log_email calls
content = re.sub(r'\s*email_log\s*=\s*log_email\(.*?\)', '', content, flags=re.DOTALL)
content = re.sub(r'\s*email_log\.mark_success\(\)', '', content)
content = re.sub(r'\s*email_log\.mark_failed\(.*?\)', '', content, flags=re.DOTALL)

with open(email_service_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Cleaned email_service.py")

# Remove email logging from scheduled_invoice_generator.py
scheduled_file = os.path.join(backend_path, "scheduled_invoice_generator.py")
with open(scheduled_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove import of log_email
content = re.sub(r'from \.email_templates import.*?log_email.*?\n', '', content)
content = re.sub(r',\s*log_email', '', content)
content = re.sub(r'log_email\s*,', '', content)

# Remove log_email calls
content = re.sub(r'\s*email_log\s*=\s*log_email\(.*?\)', '', content, flags=re.DOTALL)
content = re.sub(r'\s*email_log\.mark_success\(\)', '', content)
content = re.sub(r'\s*email_log\.mark_failed\(.*?\)', '', content, flags=re.DOTALL)

with open(scheduled_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Cleaned scheduled_invoice_generator.py")

print("\n[SUCCESS] All EmailLog code removed successfully!")
print("\nNext steps:")
print("1. Delete migration file: backend/api/migrations/0037_add_email_log.py")
print("2. Run: python manage.py migrate api 0036")
print("3. Restart the Django server")

#!/bin/bash
# Setu Backend Setup Script
# This script sets up the NexInvo backend for Setu integration

echo "========================================="
echo "Setu Backend Setup for NexInvo"
echo "========================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "manage.py" ]; then
    echo "Error: manage.py not found. Please run this script from the backend directory."
    exit 1
fi

echo "Step 1: Installing Django Channels and dependencies..."
pip install channels==4.2.0 channels-redis==4.2.1 daphne==4.2.0
if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "✗ Failed to install dependencies"
    exit 1
fi

echo ""
echo "Step 2: Checking Redis installation..."
if command -v redis-server &> /dev/null; then
    echo "✓ Redis is installed"

    # Try to ping Redis
    if redis-cli ping &> /dev/null; then
        echo "✓ Redis is running"
    else
        echo "⚠ Redis is installed but not running"
        echo "  Start Redis with: redis-server"
    fi
else
    echo "⚠ Redis is not installed"
    echo "  Install Redis:"
    echo "    - Ubuntu/Debian: sudo apt-get install redis-server"
    echo "    - macOS: brew install redis"
    echo "    - Windows: Download from https://github.com/microsoftarchive/redis/releases"
fi

echo ""
echo "Step 3: Checking settings.py configuration..."
if grep -q "channels" nexinvo/settings.py; then
    echo "✓ 'channels' found in INSTALLED_APPS"
else
    echo "⚠ 'channels' not found in INSTALLED_APPS"
    echo "  Add the following to nexinvo/settings.py:"
    echo ""
    echo "  INSTALLED_APPS = ["
    echo "      # ... existing apps"
    echo "      'channels',"
    echo "  ]"
fi

if grep -q "ASGI_APPLICATION" nexinvo/settings.py; then
    echo "✓ ASGI_APPLICATION configured"
else
    echo "⚠ ASGI_APPLICATION not configured"
    echo "  Add to nexinvo/settings.py:"
    echo ""
    echo "  ASGI_APPLICATION = 'nexinvo.asgi.application'"
fi

if grep -q "CHANNEL_LAYERS" nexinvo/settings.py; then
    echo "✓ CHANNEL_LAYERS configured"
else
    echo "⚠ CHANNEL_LAYERS not configured"
    echo "  Add to nexinvo/settings.py:"
    echo ""
    echo "  CHANNEL_LAYERS = {"
    echo "      'default': {"
    echo "          'BACKEND': 'channels_redis.core.RedisChannelLayer',"
    echo "          'CONFIG': {"
    echo "              'hosts': [('127.0.0.1', 6379)],"
    echo "          },"
    echo "      },"
    echo "  }"
fi

echo ""
echo "Step 4: Checking Setu files..."
files_to_check=(
    "api/setu_consumer.py"
    "api/setu_views.py"
    "api/routing.py"
)

all_files_exist=true
for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        echo "✗ $file missing"
        all_files_exist=false
    fi
done

echo ""
echo "Step 5: Running Django checks..."
python manage.py check --deploy 2>&1 | head -20

echo ""
echo "========================================="
echo "Setup Summary"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Make sure Redis is running: redis-server"
echo "2. Update settings.py with the configurations shown above (if needed)"
echo "3. Run migrations: python manage.py migrate"
echo "4. Start the server: python manage.py runserver"
echo "   Or with Daphne: daphne -b 0.0.0.0 -p 8000 nexinvo.asgi:application"
echo ""
echo "To test WebSocket connection:"
echo "  ws://localhost:8000/ws/setu/"
echo ""
echo "For more details, see:"
echo "  - ../Setu/BACKEND_INTEGRATION.md"
echo "  - ../SETU_INTEGRATION_SUMMARY.md"
echo ""

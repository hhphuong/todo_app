#!/bin/bash

# ============================================
# Todo Calendar App - Quick Update Script
# ============================================
# Use this script to update the app after code changes

set -e

APP_NAME="todoapp"
APP_DIR="/opt/$APP_NAME"
JAR_NAME="todoapp-1.0.0.jar"

echo "🔄 Updating Todo Calendar App..."

# Navigate to source directory
cd "$(dirname "$0")"

# Build
echo "🔨 Building..."
mvn clean package -DskipTests

# Stop service
echo "⏹️ Stopping service..."
sudo systemctl stop $APP_NAME

# Copy new JAR
echo "📁 Copying files..."
sudo cp target/$JAR_NAME $APP_DIR/

# Start service
echo "▶️ Starting service..."
sudo systemctl start $APP_NAME

sleep 3

if sudo systemctl is-active --quiet $APP_NAME; then
    echo "✅ Update successful!"
    echo "📍 URL: http://localhost:8080"
else
    echo "❌ Update failed! Check logs:"
    echo "   sudo journalctl -u $APP_NAME -n 50"
fi

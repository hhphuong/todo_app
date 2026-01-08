#!/bin/bash

# ============================================
# Todo Calendar App - Ubuntu Deploy Script
# ============================================

set -e

APP_NAME="todoapp"
APP_DIR="/opt/$APP_NAME"
SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"
JAR_NAME="todoapp-1.0.0.jar"

echo "🚀 Starting deployment of Todo Calendar App..."

# ============================================
# 1. Install Dependencies
# ============================================
echo "📦 Installing dependencies..."

# Update package list
sudo apt update

# Install Java 17
if ! command -v java &> /dev/null; then
    echo "Installing Java 17..."
    sudo apt install -y openjdk-17-jdk
fi

# Install Maven
if ! command -v mvn &> /dev/null; then
    echo "Installing Maven..."
    sudo apt install -y maven
fi

# Verify installations
echo "Java version: $(java -version 2>&1 | head -n 1)"
echo "Maven version: $(mvn -version 2>&1 | head -n 1)"

# ============================================
# 2. Build Application
# ============================================
echo "🔨 Building application..."

# Navigate to app directory (current directory)
cd "$(dirname "$0")"

# Clean and build
mvn clean package -DskipTests

# Check if build was successful
if [ ! -f "target/$JAR_NAME" ]; then
    echo "❌ Build failed! JAR file not found."
    exit 1
fi

echo "✅ Build successful!"

# ============================================
# 3. Setup Application Directory
# ============================================
echo "📁 Setting up application directory..."

# Create app directory
sudo mkdir -p $APP_DIR

# Copy JAR file
sudo cp target/$JAR_NAME $APP_DIR/

# Copy application.properties (if exists)
if [ -f "src/main/resources/application.properties" ]; then
    sudo cp src/main/resources/application.properties $APP_DIR/
fi

# Set permissions
sudo chown -R $USER:$USER $APP_DIR

echo "✅ Application files copied to $APP_DIR"

# ============================================
# 4. Create Systemd Service
# ============================================
echo "⚙️ Creating systemd service..."

sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=Todo Calendar App
After=network.target

[Service]
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/java -jar $APP_DIR/$JAR_NAME --spring.config.location=$APP_DIR/application.properties
SuccessExitStatus=143
TimeoutStopSec=10
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable $APP_NAME

echo "✅ Systemd service created"

# ============================================
# 5. Start Application
# ============================================
echo "▶️ Starting application..."

sudo systemctl start $APP_NAME

# Wait a moment for startup
sleep 5

# Check status
if sudo systemctl is-active --quiet $APP_NAME; then
    echo ""
    echo "============================================"
    echo "✅ Deployment successful!"
    echo "============================================"
    echo ""
    echo "📍 Application URL: http://localhost:8080"
    echo "📍 External URL: http://$(hostname -I | awk '{print $1}'):8080"
    echo ""
    echo "📋 Useful commands:"
    echo "   Status:  sudo systemctl status $APP_NAME"
    echo "   Stop:    sudo systemctl stop $APP_NAME"
    echo "   Start:   sudo systemctl start $APP_NAME"
    echo "   Restart: sudo systemctl restart $APP_NAME"
    echo "   Logs:    sudo journalctl -u $APP_NAME -f"
    echo ""
else
    echo "❌ Application failed to start!"
    echo "Check logs with: sudo journalctl -u $APP_NAME -n 50"
    exit 1
fi

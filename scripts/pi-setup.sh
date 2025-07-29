#!/bin/bash
# Expeed Digital Signage - Raspberry Pi Setup Script
# Run with: curl -fsSL https://raw.githubusercontent.com/YOUR-USERNAME/expeed-digital-signage/main/scripts/pi-setup.sh | bash

set -e

# Configuration - Update these with your repository details
REPO_URL="https://github.com/amcquade-24/ExpeedDS.git"
REPO_BRANCH="main"
APP_DIR="/opt/expeed-signage"
SERVICE_USER="pi"

echo "🍓 Expeed Digital Signage - Raspberry Pi Setup"
echo "=============================================="
echo "Repository: $REPO_URL"
echo "Install Directory: $APP_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running on Pi
if ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo -e "${YELLOW}Warning: This doesn't appear to be a Raspberry Pi${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
echo -e "${BLUE}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo -e "${BLUE}📥 Installing Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install Git if not present
echo -e "${BLUE}🔧 Installing Git...${NC}"
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
fi

# Install additional dependencies for Electron on Pi
echo -e "${BLUE}⚡ Installing Electron dependencies...${NC}"
sudo apt-get install -y \
    libnss3-dev \
    libatk-bridge2.0-dev \
    libdrm2 \
    libxkbcommon0 \
    libxss1 \
    libasound2-dev \
    libxrandr2 \
    libgconf-2-4 \
    libxtst6 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0

# Create app directory
echo -e "${BLUE}📁 Creating application directory: $APP_DIR${NC}"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Clone repository
echo -e "${BLUE}📦 Downloading Expeed Digital Signage...${NC}"
if [ -d "$APP_DIR/.git" ]; then
    echo "Repository already exists, updating..."
    cd $APP_DIR
    git pull origin $REPO_BRANCH
else
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

echo -e "${BLUE}📦 Installing npm dependencies...${NC}"
npm install --production

# Create systemd service
echo -e "${BLUE}⚙️ Setting up auto-start service...${NC}"
sudo tee /etc/systemd/system/expeed-signage.service > /dev/null << EOF
[Unit]
Description=Expeed Digital Signage
After=graphical-session.target

[Service]
Type=simple
User=$SERVICE_USER
Environment=DISPLAY=:0
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=graphical-session.target
EOF

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable expeed-signage

# Configure Pi for kiosk mode
echo -e "${BLUE}🖥️ Configuring display settings...${NC}"

# Disable screen blanking
sudo tee -a /boot/config.txt > /dev/null << EOF

# Digital Signage Display Settings
hdmi_force_hotplug=1
hdmi_group=2
hdmi_mode=82
disable_overscan=1
EOF

# Configure autostart for X11
mkdir -p ~/.config/lxsession/LXDE-pi
tee ~/.config/lxsession/LXDE-pi/autostart > /dev/null << EOF
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash
@point-rpi
@xset s off
@xset -dpms
@xset s noblank
EOF

# Hide cursor
echo 'exec startx -- -nocursor' >> ~/.bashrc

# Final setup
echo -e "${GREEN}✅ Installation complete!${NC}"
echo
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Copy your application files to $APP_DIR"
echo "2. Reboot your Pi: sudo reboot"
echo "3. The signage will start automatically"
echo
echo -e "${YELLOW}🔧 Management commands:${NC}"
echo "• Start:   sudo systemctl start expeed-signage"
echo "• Stop:    sudo systemctl stop expeed-signage"
echo "• Status:  sudo systemctl status expeed-signage"
echo "• Logs:    journalctl -u expeed-signage -f"
echo
echo -e "${BLUE}🍓 Expeed Digital Signage setup complete!${NC}"

# Offer to reboot
echo
read -p "Reboot now to start digital signage? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo reboot
fi

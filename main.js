const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron');
const path = require('path');

// Enable live reload for development  
if (process.argv.includes('--dev')) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

let mainWindow;
let isKioskMode = false;

// App configuration
const APP_CONFIG = {
  kiosk: process.argv.includes('--kiosk') || process.platform === 'linux', // Auto-kiosk on Pi
  fullscreen: true,
  frame: false, // Frameless for clean signage look
  autoHideMenuBar: true,
  webSecurity: false, // Disable CORS restrictions for signage
  nodeIntegration: false,
  contextIsolation: true
};

function createWindow() {
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    fullscreen: APP_CONFIG.fullscreen,
    kiosk: APP_CONFIG.kiosk,
    frame: APP_CONFIG.frame,
    autoHideMenuBar: APP_CONFIG.autoHideMenuBar,
    backgroundColor: '#1a1a1a',
    show: false, // Don't show until ready
    webPreferences: {
      webSecurity: APP_CONFIG.webSecurity,
      nodeIntegration: APP_CONFIG.nodeIntegration,
      contextIsolation: APP_CONFIG.contextIsolation,
      preload: path.join(__dirname, 'preload.js'),
      // Allow all origins for digital signage use
      allowRunningInsecureContent: true,
      experimentalFeatures: true
    }
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus the window (important for Pi)
    mainWindow.focus();
    
    // Development tools
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent navigation away from the app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });

  // Handle new windows (open in iframe instead)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' };
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  // macOS: Re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Remove default menu for clean signage look
  if (!process.argv.includes('--dev')) {
    Menu.setApplicationMenu(null);
  }
});

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

// IPC handlers for renderer communication
ipcMain.handle('get-platform', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    isKiosk: APP_CONFIG.kiosk,
    version: app.getVersion()
  };
});

ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow) {
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullScreen);
    return !isFullScreen;
  }
  return false;
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

// Handle app updates and crashes gracefully
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't crash the signage - just log and continue
});

// Prevent the app from quitting accidentally
app.on('before-quit', (event) => {
  if (!process.argv.includes('--dev') && !process.argv.includes('--allow-quit')) {
    event.preventDefault();
    // For digital signage, we typically don't want accidental quits
    console.log('Quit prevented - use --allow-quit flag if needed');
  }
});

// Auto-restart on crash (important for unattended signage)
app.on('child-process-gone', (event, details) => {
  console.log('Child process crashed, details:', details);
  // Could implement auto-restart logic here
});

// Raspberry Pi specific optimizations
if (process.platform === 'linux') {
  // Optimize for Pi hardware
  app.commandLine.appendSwitch('--enable-gpu-rasterization');
  app.commandLine.appendSwitch('--enable-zero-copy');
  app.commandLine.appendSwitch('--ignore-gpu-blacklist');
  app.commandLine.appendSwitch('--disable-dev-shm-usage');
  
  // Disable CORS for signage use
  app.commandLine.appendSwitch('--disable-web-security');
  app.commandLine.appendSwitch('--disable-features=VizDisplayCompositor');
}

console.log('Expeed Digital Signage starting...');
console.log('Platform:', process.platform, process.arch);
console.log('Kiosk mode:', APP_CONFIG.kiosk);
console.log('Development mode:', process.argv.includes('--dev'));
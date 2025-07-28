const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Window controls
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // Utility functions for digital signage
  isElectron: true,
  version: process.versions.electron,
  
  // File system access (for logos, configs, etc.)
  // Note: We'll implement basic file operations here if needed
  readFile: async (filename) => {
    // For now, return null - can be extended later for config files
    return null;
  },
  
  // Console logging from renderer
  log: (message) => {
    console.log('[Renderer]:', message);
  },
  
  // Error reporting
  reportError: (error) => {
    console.error('[Renderer Error]:', error);
  }
});

// Window management utilities
contextBridge.exposeInMainWorld('signageAPI', {
  // Signage-specific functions
  enterKioskMode: () => {
    document.documentElement.requestFullscreen?.();
  },
  
  exitKioskMode: () => {
    document.exitFullscreen?.();
  },
  
  // Screen wake/sleep prevention
  preventSleep: () => {
    // This helps keep the display active for signage
    const wakeLock = navigator.wakeLock?.request?.('screen');
    return wakeLock;
  },
  
  // Network status for signage monitoring
  isOnline: () => navigator.onLine,
  
  onNetworkChange: (callback) => {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }
});

// Enhanced console for debugging
contextBridge.exposeInMainWorld('debug', {
  log: (...args) => console.log('[DEBUG]:', ...args),
  error: (...args) => console.error('[ERROR]:', ...args),
  warn: (...args) => console.warn('[WARN]:', ...args),
  info: (...args) => console.info('[INFO]:', ...args)
});

// Keyboard shortcuts for signage management
window.addEventListener('DOMContentLoaded', () => {
  // F11 - Toggle fullscreen
  document.addEventListener('keydown', (event) => {
    if (event.key === 'F11') {
      event.preventDefault();
      window.electronAPI.toggleFullscreen();
    }
    
    // Ctrl+Shift+Q - Quit app (only in dev mode)
    if (event.ctrlKey && event.shiftKey && event.key === 'Q') {
      event.preventDefault();
      window.electronAPI.quitApp();
    }
    
    // Escape - Exit fullscreen (only in dev mode)
    if (event.key === 'Escape' && event.ctrlKey) {
      event.preventDefault();
      document.exitFullscreen?.();
    }
  });
  
  // Prevent right-click context menu in production
  document.addEventListener('contextmenu', (event) => {
    if (!window.location.href.includes('--dev')) {
      event.preventDefault();
      return false;
    }
  });
  
  // Prevent text selection for clean signage look
  document.addEventListener('selectstart', (event) => {
    event.preventDefault();
    return false;
  });
  
  // Prevent drag and drop
  document.addEventListener('dragover', (event) => {
    event.preventDefault();
    return false;
  });
  
  document.addEventListener('drop', (event) => {
    event.preventDefault();
    return false;
  });
});

console.log('Preload script loaded - Expeed Digital Signage ready');
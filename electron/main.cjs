const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'Resonate',
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Load production build if available, else localhost dev server
  const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
  const isDev = process.env.NODE_ENV === 'development' || !require('fs').existsSync(distIndex);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(distIndex);
  }

  // Register Global System Media Keys
  try {
    globalShortcut.register('MediaPlayPause', () => {
      mainWindow.webContents.executeJavaScript(`
        window.dispatchEvent(new CustomEvent('resonate_media_key', { detail: 'play_pause' }));
      `);
    });
    globalShortcut.register('MediaNextTrack', () => {
      mainWindow.webContents.executeJavaScript(`
        window.dispatchEvent(new CustomEvent('resonate_media_key', { detail: 'next' }));
      `);
    });
    globalShortcut.register('MediaPreviousTrack', () => {
      mainWindow.webContents.executeJavaScript(`
        window.dispatchEvent(new CustomEvent('resonate_media_key', { detail: 'prev' }));
      `);
    });
  } catch (err) {
    console.log('Media shortcuts registration skipped:', err);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});


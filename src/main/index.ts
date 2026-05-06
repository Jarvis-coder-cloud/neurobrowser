import { app, BrowserWindow, session } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import {
  attachActiveTabView,
  createInitialTab,
  resizeActiveTabView,
} from './browserViews';
import { registerIpcHandlers, wireTab } from './ipcHandlers';
import { registerDownloadPipeline } from './downloads';
import { registerAppMenu } from './menu';

function setupSecurity(sess: Electron.Session) {
  // 0. Basic Native AdBlocker
  const adDomains = [
    '*://*.doubleclick.net/*',
    '*://partner.googleadservices.com/*',
    '*://*.googlesyndication.com/*',
    '*://*.google-analytics.com/*',
    '*://creative.ak.fbcdn.net/*',
    '*://*.adbrite.com/*',
    '*://*.exponential.com/*',
    '*://*.quantserve.com/*',
    '*://*.scorecardresearch.com/*',
    '*://*.zedo.com/*',
    '*://*.amazon-adsystem.com/*'
  ];

  sess.webRequest.onBeforeRequest({ urls: adDomains }, (details, callback) => {
    console.log(`[AdBlocker] Blocked ad/tracker: ${details.url}`);
    callback({ cancel: true });
  });

  // 1. Deny sensitive permissions by default (Camera, Mic, Geolocation, Notifications)
  sess.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log(`[Security] Blocked permission request: ${permission}`);
    callback(false); // Deny all by default until a UI prompt is built
  });

  // 2. Set strict security headers
  sess.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'X-XSS-Protection': ['1; mode=block']
      }
    });
  });
}

if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

function getMainWindow() {
  return mainWindow;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0b0f14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  registerIpcHandlers(getMainWindow);
  registerDownloadPipeline(session.defaultSession, getMainWindow);
  registerAppMenu(getMainWindow);
  setupSecurity(session.defaultSession);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('resize', () => {
    if (!mainWindow) return;
    resizeActiveTabView(mainWindow);
  });

  mainWindow.on('enter-full-screen', () => {
    if (!mainWindow) return;
    resizeActiveTabView(mainWindow);
  });

  mainWindow.on('leave-full-screen', () => {
    if (!mainWindow) return;
    resizeActiveTabView(mainWindow);
  });

  const tabId = createInitialTab();
  wireTab(getMainWindow, tabId);
  attachActiveTabView(mainWindow, tabId);
}

app.on('web-contents-created', (event, contents) => {
  // 3. Block UI from navigating to external sites
  contents.on('will-navigate', (navEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    // Only restrict the main window UI, allow BrowserViews (tabs) to navigate
    if (!contents.getType || contents.getType() === 'window') {
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        navEvent.preventDefault();
        console.log(`[Security] Blocked UI navigation to: ${navigationUrl}`);
      }
    }
  });

  // 4. Block new windows and popups
  contents.setWindowOpenHandler(({ url }) => {
    console.log(`[Security] Blocked window.open attempt for url: ${url}`);
    return { action: 'deny' }; // Blocks target="_blank" and window.open
  });
});

app.on('ready', createWindow);

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

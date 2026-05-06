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

import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  session,
  shell,
} from 'electron';
import path from 'node:path';
import {
  attachActiveTabView,
  closeTab,
  createTab,
  getActiveTabId,
  getTab,
  resizeActiveTabView,
  setBrowserViewSuspended,
  setTopChromeHeightPx,
  TabId,
} from './browserViews';
import { applyLoadTarget, parseOmniboxToTarget, type LoadTarget } from './navigation';
import { shouldSkipHistoryForUrl } from './internalPages';
import {
  addBookmark,
  appendHistory,
  clearHistory,
  getBookmarks,
  getHistory,
  getSettings,
  removeBookmark,
  setSettings,
  type BookmarkEntry,
  type NeurobrowserSettings,
} from './store';

type GetMainWindow = () => BrowserWindow | null;

function sendToRenderer(getMainWindow: GetMainWindow, channel: string, payload: unknown) {
  const win = getMainWindow();
  if (!win) return;
  win.webContents.send(channel, payload);
}

function openUrlInNewTab(getMainWindow: GetMainWindow, href: string) {
  const tabId = createTab({ type: 'url', href });
  wireTab(getMainWindow, tabId);
  const win = getMainWindow();
  if (win) attachActiveTabView(win, tabId);
}

function wireContextMenu(getMainWindow: GetMainWindow, tabId: TabId) {
  const tab = getTab(tabId);
  if (!tab) return;

  tab.view.webContents.on('context-menu', (_event, params) => {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Back',
        enabled: tab.view.webContents.canGoBack(),
        click: () => tab.view.webContents.goBack(),
      },
      {
        label: 'Forward',
        enabled: tab.view.webContents.canGoForward(),
        click: () => tab.view.webContents.goForward(),
      },
      {
        label: 'Reload',
        click: () => tab.view.webContents.reload(),
      },
      { type: 'separator' },
      {
        label: 'Save page…',
        click: async () => {
          const win = getMainWindow();
          const { canceled, filePath } = await dialog.showSaveDialog(win ?? undefined, {
            title: 'Save page',
            defaultPath: path.join(app.getPath('documents'), 'page.html'),
            filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
          });
          if (canceled || !filePath) return;
          await tab.view.webContents.savePage(filePath, 'HTMLComplete');
        },
      },
      {
        label: 'View source',
        click: () => {
          const url = tab.view.webContents.getURL();
          openUrlInNewTab(getMainWindow, `view-source:${url}`);
        },
      },
      {
        label: 'Inspect element',
        click: () => {
          if (tab.view.webContents.isDevToolsOpened()) {
            tab.view.webContents.closeDevTools();
          } else {
            tab.view.webContents.openDevTools({ mode: 'detach' });
          }
        },
      },
    ];

    const linkUrl = params.linkURL;
    if (linkUrl) {
      template.push(
        { type: 'separator' },
        {
          label: 'Open link in new tab',
          click: () => openUrlInNewTab(getMainWindow, linkUrl),
        },
        {
          label: 'Copy link',
          click: () => clipboard.writeText(linkUrl),
        },
      );
    }

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: getMainWindow() ?? undefined });
  });
}

function sendNavState(getMainWindow: GetMainWindow, tabId: TabId) {
  const tab = getTab(tabId);
  if (!tab) return;
  sendToRenderer(getMainWindow, 'tab:nav-state', {
    tabId,
    canGoBack: tab.view.webContents.canGoBack(),
    canGoForward: tab.view.webContents.canGoForward(),
  });
}

export function wireTab(getMainWindow: GetMainWindow, tabId: TabId) {
  const tab = getTab(tabId);
  if (!tab) return;

  tab.view.webContents.on('did-start-loading', () => {
    sendToRenderer(getMainWindow, 'tab:loading-changed', { tabId, isLoading: true });
  });

  tab.view.webContents.on('did-stop-loading', () => {
    sendToRenderer(getMainWindow, 'tab:loading-changed', { tabId, isLoading: false });
    sendNavState(getMainWindow, tabId);
  });

  const sendUrl = (url: string) => {
    sendToRenderer(getMainWindow, 'tab:url-changed', { tabId, url });
  };

  tab.view.webContents.on('did-navigate', (_event, url) => {
    sendUrl(url);
    sendNavState(getMainWindow, tabId);
  });
  tab.view.webContents.on('did-navigate-in-page', (_event, url) => {
    sendUrl(url);
    sendNavState(getMainWindow, tabId);
  });

  tab.view.webContents.on('page-title-updated', (_event, title) => {
    sendToRenderer(getMainWindow, 'tab:title-updated', { tabId, title });
  });

  tab.view.webContents.on('page-favicon-updated', (_event, favicons) => {
    const faviconUrl = Array.isArray(favicons) && favicons.length > 0 ? favicons[0] : null;
    sendToRenderer(getMainWindow, 'tab:favicon-updated', { tabId, faviconUrl });
  });

  tab.view.webContents.on('did-finish-load', () => {
    const url = tab.view.webContents.getURL();
    if (!shouldSkipHistoryForUrl(url)) {
      appendHistory(url, tab.view.webContents.getTitle());
    }
    sendNavState(getMainWindow, tabId);
  });

  tab.view.webContents.once('dom-ready', () => {
    sendToRenderer(getMainWindow, 'tab:url-changed', { tabId, url: tab.view.webContents.getURL() });
    sendToRenderer(getMainWindow, 'tab:title-updated', { tabId, title: tab.view.webContents.getTitle() });
    sendToRenderer(getMainWindow, 'tab:loading-changed', { tabId, isLoading: tab.view.webContents.isLoading() });
    sendNavState(getMainWindow, tabId);
  });

  wireContextMenu(getMainWindow, tabId);
}

export function registerIpcHandlers(getMainWindow: GetMainWindow) {
  ipcMain.handle('tab:create', async (_event, args: { url?: string } | undefined) => {
    const raw = args?.url?.trim() ?? '';
    const target: LoadTarget | undefined = raw ? parseOmniboxToTarget(raw) : undefined;
    const tabId = createTab(target);
    wireTab(getMainWindow, tabId);

    const win = getMainWindow();
    if (win) attachActiveTabView(win, tabId);

    return { tabId };
  });

  ipcMain.on('tab:switch', (_event, args: { tabId: TabId }) => {
    const win = getMainWindow();
    if (!win) return;
    attachActiveTabView(win, args.tabId);
  });

  ipcMain.on('tab:close', (_event, args: { tabId: TabId }) => {
    const win = getMainWindow();
    const next = closeTab(win, args.tabId);
    sendToRenderer(getMainWindow, 'tab:closed', { tabId: args.tabId, activeTabId: next });
  });

  ipcMain.on('nav:go-to-url', (_event, args: { tabId?: TabId; input: string }) => {
    const targetTabId = args.tabId ?? getActiveTabId();
    if (!targetTabId) return;
    const tab = getTab(targetTabId);
    if (!tab) return;
    const raw = (args.input ?? '').trim();
    applyLoadTarget(tab.view.webContents, parseOmniboxToTarget(raw));
  });

  ipcMain.on('nav:back', (_event, args: { tabId?: TabId } | undefined) => {
    const targetTabId = args?.tabId ?? getActiveTabId();
    if (!targetTabId) return;
    const tab = getTab(targetTabId);
    if (!tab) return;
    if (tab.view.webContents.canGoBack()) tab.view.webContents.goBack();
  });

  ipcMain.on('nav:forward', (_event, args: { tabId?: TabId } | undefined) => {
    const targetTabId = args?.tabId ?? getActiveTabId();
    if (!targetTabId) return;
    const tab = getTab(targetTabId);
    if (!tab) return;
    if (tab.view.webContents.canGoForward()) tab.view.webContents.goForward();
  });

  ipcMain.on('nav:reload', (_event, args: { tabId?: TabId } | undefined) => {
    const targetTabId = args?.tabId ?? getActiveTabId();
    if (!targetTabId) return;
    const tab = getTab(targetTabId);
    if (!tab) return;
    tab.view.webContents.reload();
  });

  ipcMain.on('nav:stop', (_event, args: { tabId?: TabId } | undefined) => {
    const targetTabId = args?.tabId ?? getActiveTabId();
    if (!targetTabId) return;
    const tab = getTab(targetTabId);
    if (!tab) return;
    tab.view.webContents.stop();
  });

  ipcMain.handle('settings:get', async () => getSettings());

  ipcMain.on('settings:set', (_event, patch: Partial<NeurobrowserSettings>) => {
    setSettings(patch);
  });

  ipcMain.handle('bookmark:get-all', async (): Promise<BookmarkEntry[]> => getBookmarks());

  ipcMain.handle(
    'bookmark:add',
    async (_event, entry: { title: string; url: string }): Promise<BookmarkEntry> =>
      addBookmark(entry),
  );

  ipcMain.handle('bookmark:remove', async (_event, id: string) => {
    removeBookmark(id);
  });

  ipcMain.handle('history:get-all', async () => getHistory());

  ipcMain.handle('history:clear', async () => {
    clearHistory();
  });

  ipcMain.on('chrome:panel', (_event, args: { mode: 'none' | 'settings' | 'history' }) => {
    const win = getMainWindow();
    const suspended = args.mode !== 'none';
    setBrowserViewSuspended(win, suspended);
    if (!suspended && win) {
      const active = getActiveTabId();
      if (active != null) attachActiveTabView(win, active);
    }
  });

  ipcMain.on('chrome:top-height', (_event, args: { px: number }) => {
    setTopChromeHeightPx(args.px);
    const win = getMainWindow();
    if (win) resizeActiveTabView(win);
  });

  ipcMain.on('devtools:toggle-active', () => {
    const id = getActiveTabId();
    if (!id) return;
    const tab = getTab(id);
    if (!tab) return;
    if (tab.view.webContents.isDevToolsOpened()) tab.view.webContents.closeDevTools();
    else tab.view.webContents.openDevTools({ mode: 'detach' });
  });

  ipcMain.handle(
    'browsing-data:clear',
    async (_event, opts: { downloadsToo?: boolean } | undefined) => {
      clearHistory();
      await session.defaultSession.clearStorageData({
        storages: [
          'cookies',
          'filesystem',
          'indexdb',
          'localstorage',
          'shadercache',
          'websql',
          'serviceworkers',
          'cachestorage',
        ],
      });
      if (opts?.downloadsToo) {
        sendToRenderer(getMainWindow, 'downloads:cleared', {});
      }
      return { ok: true };
    },
  );

  ipcMain.handle('shell:open-path', async (_event, p: string) => {
    const err = await shell.openPath(p);
    return { err: err || null };
  });

  ipcMain.handle('shell:show-item-in-folder', async (_event, p: string) => {
    shell.showItemInFolder(p);
    return { ok: true };
  });
}

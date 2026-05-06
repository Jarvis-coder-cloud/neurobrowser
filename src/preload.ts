import { contextBridge, ipcRenderer } from 'electron';

export type TabId = number;

export type MenuAppAction =
  | 'new-tab'
  | 'close-tab'
  | 'toggle-bookmarks-bar'
  | 'open-history'
  | 'open-settings'
  | 'toggle-devtools';

export type NeuroBrowserIpcApi = {
  createTab: (url?: string) => Promise<{ tabId: TabId }>;
  switchTab: (tabId: TabId) => void;
  closeTab: (tabId: TabId) => void;

  goToUrl: (input: string, tabId?: TabId) => void;
  back: (tabId?: TabId) => void;
  forward: (tabId?: TabId) => void;
  reload: (tabId?: TabId) => void;
  stop: (tabId?: TabId) => void;

  toggleDevtoolsActive: () => void;

  getSettings: () => Promise<{
    homepageUrl: string;
    defaultSearchEngine: 'google' | 'duckduckgo' | 'bing';
    theme: 'light' | 'dark';
    bookmarksBarVisible: boolean;
  }>;
  setSettings: (patch: Partial<Awaited<ReturnType<NeuroBrowserIpcApi['getSettings']>>>) => void;

  getBookmarks: () => Promise<Array<{ id: string; title: string; url: string }>>;
  addBookmark: (entry: { title: string; url: string }) => Promise<{ id: string; title: string; url: string }>;
  removeBookmark: (id: string) => Promise<void>;

  getHistory: () => Promise<Array<{ url: string; title: string; timestamp: number }>>;
  clearHistory: () => Promise<void>;

  clearBrowsingData: (opts?: { downloadsToo?: boolean }) => Promise<{ ok: boolean }>;

  setChromePanel: (mode: 'none' | 'settings' | 'history') => void;
  setChromeTopHeight: (px: number) => void;

  openPath: (p: string) => Promise<{ err: string | null }>;
  showItemInFolder: (p: string) => Promise<{ ok: boolean }>;

  cancelDownload: (id: string) => void;

  onTitleUpdated: (cb: (e: { tabId: TabId; title: string }) => void) => () => void;
  onUrlChanged: (cb: (e: { tabId: TabId; url: string }) => void) => () => void;
  onLoadingChanged: (cb: (e: { tabId: TabId; isLoading: boolean }) => void) => () => void;
  onFaviconUpdated: (cb: (e: { tabId: TabId; faviconUrl: string | null }) => void) => () => void;
  onNavState: (
    cb: (e: { tabId: TabId; canGoBack: boolean; canGoForward: boolean }) => void,
  ) => () => void;
  onTabClosed: (cb: (e: { tabId: TabId; activeTabId: TabId | null }) => void) => () => void;

  onDownloadStarted: (
    cb: (e: { id: string; filename: string; url: string; totalBytes: number }) => void,
  ) => () => void;
  onDownloadProgress: (
    cb: (e: { id: string; receivedBytes: number; totalBytes: number }) => void,
  ) => () => void;
  onDownloadComplete: (
    cb: (e: { id: string; state: string; path: string; filename: string }) => void,
  ) => () => void;
  onDownloadsCleared: (cb: () => void) => () => void;

  onMenuAction: (cb: (action: MenuAppAction) => void) => () => void;
};

function onChannel<T>(channel: string, cb: (payload: T) => void) {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: NeuroBrowserIpcApi = {
  createTab: (url) => ipcRenderer.invoke('tab:create', { url }),
  switchTab: (tabId) => ipcRenderer.send('tab:switch', { tabId }),
  closeTab: (tabId) => ipcRenderer.send('tab:close', { tabId }),

  goToUrl: (input, tabId) => ipcRenderer.send('nav:go-to-url', { tabId, input }),
  back: (tabId) => ipcRenderer.send('nav:back', { tabId }),
  forward: (tabId) => ipcRenderer.send('nav:forward', { tabId }),
  reload: (tabId) => ipcRenderer.send('nav:reload', { tabId }),
  stop: (tabId) => ipcRenderer.send('nav:stop', { tabId }),

  toggleDevtoolsActive: () => ipcRenderer.send('devtools:toggle-active'),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.send('settings:set', patch),

  getBookmarks: () => ipcRenderer.invoke('bookmark:get-all'),
  addBookmark: (entry) => ipcRenderer.invoke('bookmark:add', entry),
  removeBookmark: (id) => ipcRenderer.invoke('bookmark:remove', id),

  getHistory: () => ipcRenderer.invoke('history:get-all'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  clearBrowsingData: (opts) => ipcRenderer.invoke('browsing-data:clear', opts ?? {}),

  setChromePanel: (mode) => ipcRenderer.send('chrome:panel', { mode }),
  setChromeTopHeight: (px) => ipcRenderer.send('chrome:top-height', { px }),

  openPath: (p) => ipcRenderer.invoke('shell:open-path', p),
  showItemInFolder: (p) => ipcRenderer.invoke('shell:show-item-in-folder', p),

  cancelDownload: (id) => ipcRenderer.send('download:cancel', { id }),

  onTitleUpdated: (cb) => onChannel('tab:title-updated', cb),
  onUrlChanged: (cb) => onChannel('tab:url-changed', cb),
  onLoadingChanged: (cb) => onChannel('tab:loading-changed', cb),
  onFaviconUpdated: (cb) => onChannel('tab:favicon-updated', cb),
  onNavState: (cb) => onChannel('tab:nav-state', cb),
  onTabClosed: (cb) => onChannel('tab:closed', cb),

  onDownloadStarted: (cb) => onChannel('download:started', cb),
  onDownloadProgress: (cb) => onChannel('download:progress', cb),
  onDownloadComplete: (cb) => onChannel('download:complete', cb),
  onDownloadsCleared: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('downloads:cleared', listener);
    return () => ipcRenderer.removeListener('downloads:cleared', listener);
  },

  onMenuAction: (cb) => {
    const map: Array<[string, MenuAppAction]> = [
      ['menu:new-tab', 'new-tab'],
      ['menu:close-tab', 'close-tab'],
      ['menu:toggle-bookmarks-bar', 'toggle-bookmarks-bar'],
      ['menu:open-history', 'open-history'],
      ['menu:open-settings', 'open-settings'],
      ['menu:toggle-devtools', 'toggle-devtools'],
    ];
    const offs = map.map(([channel, action]) => {
      const fn = () => cb(action);
      ipcRenderer.on(channel, fn);
      return () => ipcRenderer.removeListener(channel, fn);
    });
    return () => offs.forEach((o) => o());
  },
};

contextBridge.exposeInMainWorld('neurobrowser', api);

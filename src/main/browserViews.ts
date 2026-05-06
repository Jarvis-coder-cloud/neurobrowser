import { BrowserView, BrowserWindow } from 'electron';
import { applyLoadTarget, type LoadTarget } from './navigation';

export type TabId = number;

type Tab = {
  id: TabId;
  view: BrowserView;
};

const DEFAULT_TOP_CHROME_PX = 76;

let topChromeHeightPx = DEFAULT_TOP_CHROME_PX;
let nextTabId = 1;
const tabs = new Map<TabId, Tab>();
let activeTabId: TabId | null = null;
let browserViewSuspended = false;

export function setTopChromeHeightPx(px: number): void {
  topChromeHeightPx = Math.max(56, Math.min(Math.round(px), 420));
}

export function getTopChromeHeightPx(): number {
  return topChromeHeightPx;
}

export function setBrowserViewSuspended(win: BrowserWindow | null, suspended: boolean): void {
  browserViewSuspended = suspended;
  if (!win) return;
  if (suspended) {
    const attached = win.getBrowserView();
    if (attached) win.removeBrowserView(attached);
    return;
  }
  if (activeTabId != null) attachActiveTabView(win, activeTabId);
}

export function isBrowserViewSuspended(): boolean {
  return browserViewSuspended;
}

export function getActiveTabId(): TabId | null {
  return activeTabId;
}

export function getTab(tabId: TabId): Tab | undefined {
  return tabs.get(tabId);
}

export function listTabIdsOrdered(): TabId[] {
  return Array.from(tabs.keys());
}

export function createTab(target?: LoadTarget): TabId {
  const tabId = nextTabId++;

  const view = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  tabs.set(tabId, { id: tabId, view });
  activeTabId = tabId;

  applyLoadTarget(view.webContents, target ?? { type: 'home' });
  return tabId;
}

export function createInitialTab(): TabId {
  return createTab();
}

export function attachActiveTabView(win: BrowserWindow, tabId: TabId): void {
  const tab = tabs.get(tabId);
  if (!tab) return;
  activeTabId = tabId;
  if (browserViewSuspended) return;

  const attached = win.getBrowserView();
  if (attached === tab.view) {
    resizeActiveTabView(win);
    return;
  }
  if (attached) {
    win.removeBrowserView(attached);
  }
  win.setBrowserView(tab.view);
  resizeActiveTabView(win);
}

export function resizeActiveTabView(win: BrowserWindow): void {
  if (browserViewSuspended) return;
  const tabId = activeTabId;
  if (!tabId) return;
  const tab = tabs.get(tabId);
  if (!tab) return;

  const bounds = win.getContentBounds();
  tab.view.setBounds({
    x: 0,
    y: topChromeHeightPx,
    width: bounds.width,
    height: Math.max(0, bounds.height - topChromeHeightPx),
  });

  tab.view.setAutoResize({ width: true, height: true });
}

export function closeTab(win: BrowserWindow | null, tabId: TabId): TabId | null {
  const order = Array.from(tabs.keys());
  const idx = order.indexOf(tabId);
  if (idx < 0) return activeTabId;

  const tab = tabs.get(tabId);
  if (!tab) return activeTabId;

  const wasActive = activeTabId === tabId;

  let nextActive: TabId | null = null;
  if (wasActive && order.length > 1) {
    if (idx < order.length - 1) nextActive = order[idx + 1];
    else nextActive = order[idx - 1];
  }

  if (win) {
    const attached = win.getBrowserView();
    if (attached === tab.view) {
      win.removeBrowserView(tab.view);
    }
  }

  tab.view.webContents.close();
  tabs.delete(tabId);

  if (wasActive) {
    activeTabId = nextActive;
  }

  if (tabs.size === 0) {
    const fresh = createTab();
    if (win && !browserViewSuspended) attachActiveTabView(win, fresh);
    return fresh;
  }

  if (wasActive && activeTabId != null && win && !browserViewSuspended) {
    attachActiveTabView(win, activeTabId);
  }

  return activeTabId;
}

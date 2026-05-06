import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TabId } from '../preload';
import { BookmarksBar, type BookmarkRow } from './components/BookmarksBar';
import { DownloadPanel } from './components/DownloadPanel';
import { NavBar } from './components/NavBar';
import { TabBar } from './components/TabBar';
import { useTabsIpcBridge } from './hooks/useTabs';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { useDownloadStore } from './store/downloadStore';
import { useTabStore } from './store/tabStore';

type ChromePanel = 'none' | 'settings' | 'history';

function applyRootTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('nb-theme-light', theme === 'light');
  document.documentElement.classList.toggle('nb-theme-dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
}

export function App() {
  const api = window.neurobrowser;
  useTabsIpcBridge();

  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTabId = useTabStore((s) => s.setActiveTabId);
  const ensureTab = useTabStore((s) => s.ensureTab);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  const [addressValue, setAddressValue] = useState('');
  const omniboxRef = useRef<HTMLInputElement>(null);

  const [panel, setPanel] = useState<ChromePanel>('none');
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [bookmarksBarVisible, setBookmarksBarVisible] = useState(true);

  const downloadItems = useDownloadStore((s) => s.items);

  useEffect(() => {
    if (activeTab) setAddressValue(activeTab.url);
  }, [activeTab?.id, activeTab?.url]);

  useEffect(() => {
    const h = 36 + 40 + (bookmarksBarVisible ? 32 : 0);
    api.setChromeTopHeight(h);
  }, [api, bookmarksBarVisible]);

  useEffect(() => {
    void api.getSettings().then((s) => {
      applyRootTheme(s.theme);
      setBookmarksBarVisible(s.bookmarksBarVisible);
    });
  }, [api]);

  const refreshBookmarks = useCallback(async () => {
    setBookmarks(await api.getBookmarks());
  }, [api]);

  useEffect(() => {
    void refreshBookmarks();
  }, [refreshBookmarks]);

  useEffect(() => {
    const off1 = api.onDownloadStarted((e) => {
      useDownloadStore.getState().upsert({
        id: e.id,
        filename: e.filename,
        url: e.url,
        totalBytes: e.totalBytes,
        receivedBytes: 0,
        state: 'progressing',
      });
    });
    const off2 = api.onDownloadProgress((e) => {
      useDownloadStore.getState().upsert({
        id: e.id,
        receivedBytes: e.receivedBytes,
        totalBytes: e.totalBytes,
      });
    });
    const off3 = api.onDownloadComplete((e) => {
      useDownloadStore.getState().upsert({
        id: e.id,
        state: e.state as 'completed' | 'cancelled' | 'interrupted',
        path: e.path,
        filename: e.filename,
      });
    });
    const off4 = api.onDownloadsCleared(() => useDownloadStore.getState().clear());
    return () => {
      off1();
      off2();
      off3();
      off4();
    };
  }, [api]);

  const openPanel = useCallback(
    (mode: ChromePanel) => {
      setPanel(mode);
      api.setChromePanel(mode === 'none' ? 'none' : mode);
    },
    [api],
  );

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#/history') openPanel('history');
    if (hash === '#/settings') openPanel('settings');
  }, [openPanel]);

  useEffect(() => {
    const off = api.onMenuAction((action) => {
      if (action === 'new-tab') void newTab();
      if (action === 'close-tab' && activeTabId != null) api.closeTab(activeTabId);
      if (action === 'toggle-bookmarks-bar') {
        setBookmarksBarVisible((v) => {
          const next = !v;
          api.setSettings({ bookmarksBarVisible: next });
          return next;
        });
      }
      if (action === 'open-history') openPanel('history');
      if (action === 'open-settings') openPanel('settings');
      if (action === 'toggle-devtools') api.toggleDevtoolsActive();
    });
    return () => off();
  }, [api, activeTabId, openPanel]);

  const newTab = useCallback(async () => {
    const { tabId } = await api.createTab();
    ensureTab(tabId);
    setActiveTabId(tabId);
  }, [api, ensureTab, setActiveTabId]);

  const switchTab = useCallback(
    (tabId: TabId) => {
      setActiveTabId(tabId);
      api.switchTab(tabId);
    },
    [api, setActiveTabId],
  );

  const closeTab = useCallback(
    (tabId: TabId) => {
      api.closeTab(tabId);
    },
    [api],
  );

  const onKeyDownWindow = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField = tag === 'input' || tag === 'textarea' || target?.isContentEditable;

      if (mod && e.key.toLowerCase() === 't') {
        e.preventDefault();
        void newTab();
        return;
      }

      if (mod && e.key.toLowerCase() === 'w') {
        if (activeTabId == null) return;
        e.preventDefault();
        api.closeTab(activeTabId);
        return;
      }

      if (mod && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        omniboxRef.current?.focus();
        omniboxRef.current?.select();
        return;
      }

      if (mod && e.key === 'd') {
        if (!activeTab || !activeTab.url) return;
        e.preventDefault();
        void api
          .addBookmark({ title: activeTab.title || activeTab.url, url: activeTab.url })
          .then(() => refreshBookmarks());
        return;
      }

      if (mod && e.key === ',') {
        e.preventDefault();
        openPanel('settings');
        return;
      }

      if (mod && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        openPanel('history');
        return;
      }

      if (e.key === 'F12') {
        e.preventDefault();
        api.toggleDevtoolsActive();
        return;
      }

      if (mod && /^[1-9]$/.test(e.key)) {
        if (inField) return;
        const idx = Number(e.key) - 1;
        const t = tabs[idx];
        if (!t) return;
        e.preventDefault();
        switchTab(t.id);
      }
    },
    [activeTab, activeTabId, api, newTab, openPanel, refreshBookmarks, switchTab, tabs],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDownWindow);
    return () => window.removeEventListener('keydown', onKeyDownWindow);
  }, [onKeyDownWindow]);

  const closePanel = useCallback(() => openPanel('none'), [openPanel]);

  const onSettingsThemeApplied = useCallback((theme: 'light' | 'dark') => {
    applyRootTheme(theme);
  }, []);

  const onSettingsBookmarksBarChanged = useCallback((visible: boolean) => {
    setBookmarksBarVisible(visible);
  }, []);

  const openUrlFromChrome = useCallback(
    (url: string) => {
      closePanel();
      api.goToUrl(url, activeTabId ?? undefined);
    },
    [api, activeTabId, closePanel],
  );

  return (
    <div className="nb-root">
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSwitchTab={switchTab}
        onCloseTab={closeTab}
        onNewTab={() => void newTab()}
      />

      <NavBar
        ref={omniboxRef}
        urlValue={addressValue}
        onUrlValueChange={setAddressValue}
        onSubmit={() => api.goToUrl(addressValue, activeTabId ?? undefined)}
        onBack={() => api.back(activeTabId ?? undefined)}
        onForward={() => api.forward(activeTabId ?? undefined)}
        onReload={() => api.reload(activeTabId ?? undefined)}
        onStop={() => api.stop(activeTabId ?? undefined)}
        isLoading={activeTab?.loading ?? false}
        canGoBack={activeTab?.canGoBack ?? false}
        canGoForward={activeTab?.canGoForward ?? false}
        activeUrl={activeTab?.url ?? ''}
      />

      {bookmarksBarVisible ? (
        <BookmarksBar
          bookmarks={bookmarks}
          onOpen={(url) => api.goToUrl(url, activeTabId ?? undefined)}
        />
      ) : null}

      {panel === 'none' ? (
        <div className="nb-contentHint" aria-hidden="true">
          <div className="nb-contentHintInner">
            <div className="nb-contentHintTitle">Web content is rendered by BrowserView</div>
            <div className="nb-contentHintMeta">{activeTab?.url ?? ''}</div>
          </div>
        </div>
      ) : null}

      {panel === 'settings' ? (
        <div className="nb-panelHost">
          <SettingsPage
            onClose={closePanel}
            onThemeApplied={onSettingsThemeApplied}
            onBookmarksBarChanged={onSettingsBookmarksBarChanged}
          />
        </div>
      ) : null}

      {panel === 'history' ? (
        <div className="nb-panelHost">
          <HistoryPage onClose={closePanel} onOpenUrl={openUrlFromChrome} />
        </div>
      ) : null}

      <DownloadPanel
        items={downloadItems}
        onCancel={(id) => api.cancelDownload(id)}
        onOpen={(p) => void api.openPath(p)}
        onReveal={(p) => void api.showItemInFolder(p)}
      />
    </div>
  );
}

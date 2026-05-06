import { useEffect } from 'react';
import { useTabStore } from '../store/tabStore';

export function useTabsIpcBridge() {
  const api = window.neurobrowser;

  useEffect(() => {
    const offTitle = api.onTitleUpdated(({ tabId, title }) => {
      useTabStore.getState().upsertTab(tabId, { title: title || 'New Tab' });
    });

    const offUrl = api.onUrlChanged(({ tabId, url }) => {
      useTabStore.getState().upsertTab(tabId, { url });
    });

    const offLoading = api.onLoadingChanged(({ tabId, isLoading }) => {
      useTabStore.getState().upsertTab(tabId, { loading: isLoading });
    });

    const offFavicon = api.onFaviconUpdated(({ tabId, faviconUrl }) => {
      useTabStore.getState().upsertTab(tabId, { faviconUrl });
    });

    const offNav = api.onNavState(({ tabId, canGoBack, canGoForward }) => {
      useTabStore.getState().upsertTab(tabId, { canGoBack, canGoForward });
    });

    const offClosed = api.onTabClosed(({ tabId, activeTabId }) => {
      useTabStore.getState().applyTabClosed(tabId, activeTabId);
    });

    return () => {
      offTitle();
      offUrl();
      offLoading();
      offFavicon();
      offNav();
      offClosed();
    };
  }, [api]);
}

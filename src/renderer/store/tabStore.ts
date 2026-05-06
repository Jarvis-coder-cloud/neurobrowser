import { create } from 'zustand';
import type { TabId } from '../../preload';

export type TabState = {
  id: TabId;
  title: string;
  url: string;
  faviconUrl: string | null;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
};

type TabStore = {
  tabs: TabState[];
  activeTabId: TabId | null;
  upsertTab: (id: TabId, patch: Partial<Omit<TabState, 'id'>>) => void;
  setActiveTabId: (id: TabId | null) => void;
  applyTabClosed: (closedId: TabId, nextActiveId: TabId | null) => void;
  ensureTab: (id: TabId) => void;
};

const defaultTab = (id: TabId): TabState => ({
  id,
  title: 'New Tab',
  url: '',
  faviconUrl: null,
  loading: false,
  canGoBack: false,
  canGoForward: false,
});

export const useTabStore = create<TabStore>((set) => ({
  tabs: [],
  activeTabId: null,

  ensureTab: (id) =>
    set((s) => {
      if (s.tabs.some((t) => t.id === id)) return s;
      return {
        tabs: [...s.tabs, defaultTab(id)],
        activeTabId: s.activeTabId ?? id,
      };
    }),

  upsertTab: (id, patch) =>
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      if (idx === -1) {
        return {
          tabs: [...s.tabs, { ...defaultTab(id), ...patch }],
          activeTabId: s.activeTabId ?? id,
        };
      }
      const next = [...s.tabs];
      next[idx] = { ...next[idx], ...patch };
      return { tabs: next };
    }),

  setActiveTabId: (id) => set({ activeTabId: id }),

  applyTabClosed: (closedId, nextActiveId) =>
    set((s) => ({
      tabs: s.tabs.filter((t) => t.id !== closedId),
      activeTabId: nextActiveId,
    })),
}));

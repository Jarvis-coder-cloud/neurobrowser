import Store from 'electron-store';

export type SearchEngine = 'google' | 'duckduckgo' | 'bing';

export type BookmarkEntry = { id: string; title: string; url: string };

export type HistoryEntry = { url: string; title: string; timestamp: number };

export type NeurobrowserSettings = {
  homepageUrl: string;
  defaultSearchEngine: SearchEngine;
  theme: 'light' | 'dark';
  bookmarksBarVisible: boolean;
};

type PersistedSchema = NeurobrowserSettings & {
  bookmarks: BookmarkEntry[];
  history: HistoryEntry[];
};

const defaults: PersistedSchema = {
  homepageUrl: '',
  defaultSearchEngine: 'duckduckgo',
  theme: 'dark',
  bookmarksBarVisible: true,
  bookmarks: [],
  history: [],
};

export const appStore = new Store<PersistedSchema>({
  name: 'neurobrowser',
  defaults,
});

export function getSettings(): NeurobrowserSettings {
  return {
    homepageUrl: appStore.get('homepageUrl'),
    defaultSearchEngine: appStore.get('defaultSearchEngine'),
    theme: appStore.get('theme'),
    bookmarksBarVisible: appStore.get('bookmarksBarVisible'),
  };
}

export function setSettings(patch: Partial<NeurobrowserSettings>): void {
  if (patch.homepageUrl !== undefined) appStore.set('homepageUrl', patch.homepageUrl);
  if (patch.defaultSearchEngine !== undefined) appStore.set('defaultSearchEngine', patch.defaultSearchEngine);
  if (patch.theme !== undefined) appStore.set('theme', patch.theme);
  if (patch.bookmarksBarVisible !== undefined) appStore.set('bookmarksBarVisible', patch.bookmarksBarVisible);
}

export function getBookmarks(): BookmarkEntry[] {
  return appStore.get('bookmarks');
}

export function addBookmark(entry: Omit<BookmarkEntry, 'id'>): BookmarkEntry {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const row: BookmarkEntry = { id, title: entry.title, url: entry.url };
  const list = appStore.get('bookmarks');
  appStore.set('bookmarks', [...list, row]);
  return row;
}

export function removeBookmark(id: string): void {
  appStore.set(
    'bookmarks',
    appStore.get('bookmarks').filter((b) => b.id !== id),
  );
}

export function appendHistory(url: string, title: string): void {
  const u = url.trim();
  if (!u) return;
  const list = appStore.get('history');
  const next = [{ url: u, title: title || u, timestamp: Date.now() }, ...list].slice(0, 5000);
  appStore.set('history', next);
}

export function getHistory(): HistoryEntry[] {
  return appStore.get('history');
}

export function clearHistory(): void {
  appStore.set('history', []);
}

export function searchEngineToQueryUrl(engine: SearchEngine, query: string): string {
  const q = encodeURIComponent(query);
  switch (engine) {
    case 'google':
      return `https://www.google.com/search?q=${q}`;
    case 'bing':
      return `https://www.bing.com/search?q=${q}`;
    case 'duckduckgo':
    default:
      return `https://duckduckgo.com/?q=${q}`;
  }
}

export function searchEngineToHtmlPreviewUrl(engine: SearchEngine, query: string): string {
  const q = encodeURIComponent(query);
  switch (engine) {
    case 'google':
      return `https://www.google.com/search?q=${q}&igu=1`;
    case 'bing':
      return `https://www.bing.com/search?q=${q}`;
    case 'duckduckgo':
    default:
      return `https://html.duckduckgo.com/html/?q=${q}`;
  }
}

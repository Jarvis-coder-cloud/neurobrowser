import type { WebContents } from 'electron';
import { appStore, searchEngineToHtmlPreviewUrl, searchEngineToQueryUrl } from './store';
import { getNeurobrowserHomeHtmlPath, getNeurobrowserSearchHtmlPath } from './paths';

export type LoadTarget =
  | { type: 'home' }
  | { type: 'url'; href: string }
  | { type: 'search'; query: string };

const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

function looksLikeDomain(input: string): boolean {
  return !/\s/.test(input) && input.includes('.');
}

/** Single source of truth for omnibox → load target (URL vs local search page vs home). */
export function parseOmniboxToTarget(raw: string): LoadTarget {
  const input = raw.trim();
  if (!input) return { type: 'home' };
  if (HAS_SCHEME.test(input)) return { type: 'url', href: input };
  if (looksLikeDomain(input)) return { type: 'url', href: `https://${input}` };
  return { type: 'search', query: input };
}

export function applyLoadTarget(wc: WebContents, target: LoadTarget): void {
  switch (target.type) {
    case 'home': {
      const hp = appStore.get('homepageUrl').trim();
      if (hp) {
        const href = HAS_SCHEME.test(hp) ? hp : `https://${hp}`;
        void wc.loadURL(href);
        break;
      }
      void wc.loadFile(getNeurobrowserHomeHtmlPath());
      break;
    }
    case 'url':
      void wc.loadURL(target.href);
      break;
    case 'search': {
      const engine = appStore.get('defaultSearchEngine');
      const preview = searchEngineToHtmlPreviewUrl(engine, target.query);
      const full = searchEngineToQueryUrl(engine, target.query);
      void wc.loadFile(getNeurobrowserSearchHtmlPath(), {
        query: { q: target.query, e: engine, p: preview, f: full },
      });
      break;
    }
  }
}

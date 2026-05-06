import path from 'node:path';

export function shouldSkipHistoryForUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return true;
  if (u.startsWith('about:')) return true;
  if (u.startsWith('chrome-devtools:')) return true;
  if (u.startsWith('devtools:')) return true;
  if (u.startsWith('data:')) return true;
  if (u.startsWith('blob:')) return true;
  if (u.startsWith('neurobrowser:')) return true;

  try {
    const parsed = new URL(u);
    if (parsed.protocol === 'file:') {
      const base = path.basename(parsed.pathname).toLowerCase();
      if (base === 'home.html' || base === 'search.html') return true;
    }
  } catch {
    /* ignore */
  }

  return false;
}

import path from 'node:path';

/** Resolved next to bundled `main.js` (dev + packaged). */
export function getNeurobrowserHomeHtmlPath(): string {
  return path.join(__dirname, 'home.html');
}

export function getNeurobrowserSearchHtmlPath(): string {
  return path.join(__dirname, 'search.html');
}

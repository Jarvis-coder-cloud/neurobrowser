import React, { forwardRef, useCallback, useMemo } from 'react';

export type SecurityKind = 'secure' | 'insecure' | 'file' | 'local' | 'unknown';

function classifySecurity(url: string): { kind: SecurityKind; label: string } {
  const u = url.trim();
  if (!u) return { kind: 'unknown', label: '' };
  try {
    const parsed = new URL(u);
    if (parsed.protocol === 'https:') return { kind: 'secure', label: 'HTTPS' };
    if (parsed.protocol === 'http:') return { kind: 'insecure', label: 'HTTP' };
    if (parsed.protocol === 'file:') return { kind: 'file', label: 'File' };
  } catch {
    return { kind: 'local', label: 'Local' };
  }
  return { kind: 'unknown', label: '' };
}

export const NavBar = forwardRef<
  HTMLInputElement,
  {
    urlValue: string;
    onUrlValueChange: (v: string) => void;
    onSubmit: () => void;
    onBack: () => void;
    onForward: () => void;
    onReload: () => void;
    onStop: () => void;
    isLoading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
    activeUrl: string;
  }
>(function NavBar(props, ref) {
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') props.onSubmit();
    },
    [props],
  );

  const sec = useMemo(() => classifySecurity(props.activeUrl), [props.activeUrl]);

  return (
    <div className="nb-navbar">
      <div className="nb-navButtons">
        <button
          className="nb-iconBtn"
          onClick={props.onBack}
          aria-label="Back"
          title="Back"
          disabled={!props.canGoBack}
        >
          ←
        </button>
        <button
          className="nb-iconBtn"
          onClick={props.onForward}
          aria-label="Forward"
          title="Forward"
          disabled={!props.canGoForward}
        >
          →
        </button>
        {props.isLoading ? (
          <button className="nb-iconBtn" onClick={props.onStop} aria-label="Stop" title="Stop">
            ✕
          </button>
        ) : (
          <button className="nb-iconBtn" onClick={props.onReload} aria-label="Reload" title="Reload">
            ↻
          </button>
        )}
      </div>

      <div className={`nb-security nb-security--${sec.kind}`} title={sec.label} aria-label={sec.label}>
        {sec.kind === 'secure' ? '🔒' : null}
        {sec.kind === 'insecure' ? '⚠' : null}
        {sec.kind === 'file' ? '📄' : null}
        {sec.kind === 'local' ? '⌂' : null}
      </div>

      <div className="nb-omniboxWrap">
        <input
          ref={ref}
          className="nb-omnibox"
          value={props.urlValue}
          onChange={(e) => props.onUrlValueChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          inputMode="url"
          placeholder="Search or enter address"
          aria-label="Address bar"
        />
        <button className="nb-goBtn" onClick={props.onSubmit} aria-label="Go">
          Go
        </button>
      </div>

      <div className="nb-status">
        <div className={`nb-loadingDot ${props.isLoading ? 'is-on' : ''}`} aria-hidden="true" />
      </div>
    </div>
  );
});

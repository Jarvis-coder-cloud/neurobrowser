import React, { useCallback, useEffect, useState } from 'react';

type Settings = Awaited<ReturnType<typeof window.neurobrowser.getSettings>>;

export function SettingsPage(props: {
  onClose: () => void;
  onThemeApplied: (theme: Settings['theme']) => void;
  onBookmarksBarChanged: (visible: boolean) => void;
}) {
  const api = window.neurobrowser;
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const s = await api.getSettings();
    setSettings(s);
    props.onThemeApplied(s.theme);
    props.onBookmarksBarChanged(s.bookmarksBarVisible);
  }, [api, props.onBookmarksBarChanged, props.onThemeApplied]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!settings) {
    return (
      <div className="nb-panel">
        <div className="nb-panelHeader">
          <div className="nb-panelTitle">Settings</div>
          <button type="button" className="nb-textBtn" onClick={props.onClose}>
            Close
          </button>
        </div>
        <div className="nb-panelBody">Loading…</div>
      </div>
    );
  }

  return (
    <div className="nb-panel">
      <div className="nb-panelHeader">
        <div className="nb-panelTitle">Settings</div>
        <button type="button" className="nb-textBtn" onClick={props.onClose}>
          Close
        </button>
      </div>

      <div className="nb-panelBody">
        <label className="nb-field">
          <div className="nb-fieldLabel">Homepage URL</div>
          <input
            className="nb-fieldInput"
            value={settings.homepageUrl}
            onChange={(e) => setSettings({ ...settings, homepageUrl: e.target.value })}
            placeholder="Leave empty for NeuroBrowser home"
            spellCheck={false}
          />
          <div className="nb-fieldHint">Saved in the main process (electron-store).</div>
        </label>

        <label className="nb-field">
          <div className="nb-fieldLabel">Default search engine</div>
          <select
            className="nb-fieldInput"
            value={settings.defaultSearchEngine}
            onChange={(e) =>
              setSettings({
                ...settings,
                defaultSearchEngine: e.target.value as Settings['defaultSearchEngine'],
              })
            }
          >
            <option value="google">Google</option>
            <option value="duckduckgo">DuckDuckGo</option>
            <option value="bing">Bing</option>
          </select>
        </label>

        <label className="nb-field">
          <div className="nb-fieldLabel">Theme</div>
          <select
            className="nb-fieldInput"
            value={settings.theme}
            onChange={(e) => {
              const theme = e.target.value as Settings['theme'];
              setSettings({ ...settings, theme });
              props.onThemeApplied(theme);
              api.setSettings({ theme });
            }}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>

        <label className="nb-field nb-fieldRow">
          <input
            type="checkbox"
            checked={settings.bookmarksBarVisible}
            onChange={(e) => {
              const bookmarksBarVisible = e.target.checked;
              setSettings({ ...settings, bookmarksBarVisible });
              props.onBookmarksBarChanged(bookmarksBarVisible);
              api.setSettings({ bookmarksBarVisible });
            }}
          />
          <span>Show bookmarks bar</span>
        </label>

        <div className="nb-actionsRow">
          <button
            type="button"
            className="nb-primaryBtn"
            onClick={() => {
              api.setSettings({
                homepageUrl: settings.homepageUrl,
                defaultSearchEngine: settings.defaultSearchEngine,
                theme: settings.theme,
                bookmarksBarVisible: settings.bookmarksBarVisible,
              });
            }}
          >
            Save settings
          </button>
        </div>

        <div className="nb-dangerZone">
          <div className="nb-dangerTitle">Clear browsing data</div>
          <div className="nb-dangerText">
            Clears history, storage, and optionally the in-app downloads list. This does not delete
            arbitrary files from your Downloads folder.
          </div>
          <div className="nb-actionsRow">
            <button
              type="button"
              className="nb-dangerBtn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.clearBrowsingData({ downloadsToo: false });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Clear history + site data
            </button>
            <button
              type="button"
              className="nb-dangerBtn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.clearBrowsingData({ downloadsToo: true });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Also clear download list
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

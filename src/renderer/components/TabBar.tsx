import React, { useCallback } from 'react';

type Tab = {
  id: number;
  title: string;
  faviconUrl: string | null;
  url: string;
  loading: boolean;
};

export function TabBar(props: {
  tabs: Tab[];
  activeTabId: number | null;
  onSwitchTab: (tabId: number) => void;
  onCloseTab: (tabId: number) => void;
  onNewTab: () => void;
}) {
  const onClose = useCallback(
    (e: React.MouseEvent, tabId: number) => {
      e.stopPropagation();
      e.preventDefault();
      props.onCloseTab(tabId);
    },
    [props],
  );

  return (
    <div className="nb-tabbar" role="tablist" aria-label="Tabs">
      {props.tabs.map((tab) => {
        const active = tab.id === props.activeTabId;
        return (
          <div
            key={tab.id}
            className={`nb-tab ${active ? 'is-active' : ''}`}
            role="presentation"
          >
            <button
              type="button"
              className="nb-tabMain"
              role="tab"
              aria-selected={active}
              onClick={() => props.onSwitchTab(tab.id)}
              title={tab.url}
            >
              <span className="nb-tabIcon" aria-hidden="true">
                {tab.loading ? <span className="nb-tabSpinner" /> : null}
                {!tab.loading && tab.faviconUrl ? (
                  <img src={tab.faviconUrl} className="nb-favicon" alt="" />
                ) : null}
                {!tab.loading && !tab.faviconUrl ? <span className="nb-faviconFallback" /> : null}
              </span>
              <span className="nb-tabTitle">{tab.title || 'New Tab'}</span>
            </button>
            <button
              type="button"
              className="nb-tabClose"
              onClick={(e) => onClose(e, tab.id)}
              title="Close tab"
              aria-label="Close tab"
            >
              ×
            </button>
          </div>
        );
      })}
      <button type="button" className="nb-newTab" onClick={props.onNewTab} title="New tab" aria-label="New tab">
        +
      </button>
      <div className="nb-tabbarSpacer" />
    </div>
  );
}

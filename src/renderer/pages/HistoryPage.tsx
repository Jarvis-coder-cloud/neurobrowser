import React, { useCallback, useEffect, useMemo, useState } from 'react';

type HistoryRow = { url: string; title: string; timestamp: number };

export function HistoryPage(props: {
  onClose: () => void;
  onOpenUrl: (url: string) => void;
}) {
  const api = window.neurobrowser;
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [q, setQ] = useState('');

  const reload = useCallback(async () => {
    setRows(await api.getHistory());
  }, [api]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) => r.url.toLowerCase().includes(needle) || r.title.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  return (
    <div className="nb-panel">
      <div className="nb-panelHeader">
        <div className="nb-panelTitle">History</div>
        <div className="nb-panelHeaderActions">
          <button
            type="button"
            className="nb-textBtn"
            onClick={async () => {
              await api.clearHistory();
              await reload();
            }}
          >
            Clear
          </button>
          <button type="button" className="nb-textBtn" onClick={props.onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="nb-panelBody">
        <input
          className="nb-fieldInput"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search history"
          spellCheck={false}
        />

        <div className="nb-historyList" role="list">
          {filtered.map((r) => (
            <button
              key={`${r.timestamp}-${r.url}`}
              type="button"
              className="nb-historyRow"
              role="listitem"
              onClick={() => props.onOpenUrl(r.url)}
            >
              <div className="nb-historyTitle">{r.title || r.url}</div>
              <div className="nb-historyMeta">
                <span className="nb-historyUrl">{r.url}</span>
                <span className="nb-historyTime">{new Date(r.timestamp).toLocaleString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

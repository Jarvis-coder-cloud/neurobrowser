import React from 'react';
import type { DownloadItemState } from '../store/downloadStore';

export function DownloadPanel(props: {
  items: DownloadItemState[];
  onCancel: (id: string) => void;
  onOpen: (path: string) => void;
  onReveal: (path: string) => void;
}) {
  if (props.items.length === 0) return null;

  return (
    <div className="nb-downloadPanel" aria-label="Downloads">
      <div className="nb-downloadPanelTitle">Downloads</div>
      <div className="nb-downloadList">
        {props.items.map((d) => {
          const pct =
            d.totalBytes > 0 ? Math.min(100, Math.round((d.receivedBytes / d.totalBytes) * 100)) : 0;
          return (
            <div key={d.id} className="nb-downloadRow">
              <div className="nb-downloadName" title={d.url}>
                {d.filename}
              </div>
              {d.state === 'progressing' ? (
                <div className="nb-downloadProgress">
                  <div className="nb-downloadProgressBar" style={{ width: `${pct}%` }} />
                  <div className="nb-downloadMeta">
                    {d.receivedBytes} / {d.totalBytes || '?'} bytes
                  </div>
                  <button
                    type="button"
                    className="nb-textBtn"
                    onClick={() => props.onCancel(d.id)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="nb-downloadDone">
                  <span className="nb-downloadState">{d.state}</span>
                  {(() => {
                    const filePath = d.path;
                    if (!filePath) return null;
                    return (
                      <>
                        <button type="button" className="nb-textBtn" onClick={() => props.onOpen(filePath)}>
                          Open
                        </button>
                        <button
                          type="button"
                          className="nb-textBtn"
                          onClick={() => props.onReveal(filePath)}
                        >
                          Folder
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

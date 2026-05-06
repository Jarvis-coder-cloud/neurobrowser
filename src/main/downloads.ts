import { ipcMain, type BrowserWindow, type DownloadItem, type Session } from 'electron';

export type DownloadId = string;

type GetMainWindow = () => BrowserWindow | null;

const active = new Map<DownloadId, DownloadItem>();

function send(getMainWindow: GetMainWindow, channel: string, payload: unknown) {
  const win = getMainWindow();
  if (!win) return;
  win.webContents.send(channel, payload);
}

export function registerDownloadPipeline(session: Session, getMainWindow: GetMainWindow): void {
  session.on('will-download', (_event, item) => {
    const id: DownloadId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    active.set(id, item);

    send(getMainWindow, 'download:started', {
      id,
      filename: item.getFilename(),
      url: item.getURL(),
      totalBytes: item.getTotalBytes(),
    });

    item.on('updated', (_e, state) => {
      if (state === 'progressing') {
        send(getMainWindow, 'download:progress', {
          id,
          receivedBytes: item.getReceivedBytes(),
          totalBytes: item.getTotalBytes(),
        });
      }
    });

    item.once('done', (_e, state) => {
      active.delete(id);
      send(getMainWindow, 'download:complete', {
        id,
        state,
        path: item.getSavePath(),
        filename: item.getFilename(),
      });
    });
  });

  ipcMain.on('download:cancel', (_event, args: { id: DownloadId }) => {
    const it = active.get(args.id);
    if (it) it.cancel();
  });
}

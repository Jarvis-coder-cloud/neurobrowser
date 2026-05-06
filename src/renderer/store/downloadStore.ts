import { create } from 'zustand';

export type DownloadItemState = {
  id: string;
  filename: string;
  url: string;
  totalBytes: number;
  receivedBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  path?: string;
};

type DownloadStore = {
  items: DownloadItemState[];
  upsert: (id: string, patch: Partial<DownloadItemState> & Pick<DownloadItemState, 'id'>) => void;
  clear: () => void;
};

export const useDownloadStore = create<DownloadStore>((set) => ({
  items: [],

  upsert: (partial) =>
    set((s) => {
      const idx = s.items.findIndex((i) => i.id === partial.id);
      if (idx === -1) {
        return {
          items: [
            ...s.items,
            {
              id: partial.id,
              filename: partial.filename ?? 'download',
              url: partial.url ?? '',
              totalBytes: partial.totalBytes ?? 0,
              receivedBytes: partial.receivedBytes ?? 0,
              state: partial.state ?? 'progressing',
              path: partial.path,
            },
          ],
        };
      }
      const next = [...s.items];
      next[idx] = { ...next[idx], ...partial };
      return { items: next };
    }),

  clear: () => set({ items: [] }),
}));

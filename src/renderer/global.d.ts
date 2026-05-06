import type { NeuroBrowserIpcApi } from '../preload';

declare global {
  interface Window {
    neurobrowser: NeuroBrowserIpcApi;
  }
}

export {};


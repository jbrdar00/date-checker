export {};

declare global {
  interface Window {
    electronAPI?: {
      checkForUpdates: () => Promise<{ ok: boolean; message?: string }>;
      installUpdate: () => Promise<{ ok: boolean; message?: string }>;
      onUpdaterStatus: (
        callback: (payload: {
          type:
            | 'checking'
            | 'available'
            | 'not-available'
            | 'downloading'
            | 'downloaded'
            | 'error';
          message: string;
          version?: string;
          percent?: number;
        }) => void,
      ) => () => void;
    };
  }
}


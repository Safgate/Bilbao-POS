export {};

declare global {
  interface Window {
    electronAPI?: {
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
      listPrinters?: () => Promise<Array<{ name: string; displayName?: string; description?: string }>>;
      printReceipt?: (
        html: string,
        options?: { silent?: boolean; deviceName?: string; copies?: number }
      ) => Promise<{ success: boolean; error?: string }>;
    };
  }
}


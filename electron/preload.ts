import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any IPC methods you need here
  send: (channel: string, data: any) => {
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: Function) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  listPrinters: async () => {
    return await ipcRenderer.invoke('pos:list-printers');
  },
  printReceipt: async (
    html: string,
    options?: { silent?: boolean; deviceName?: string; copies?: number }
  ) => {
    return await ipcRenderer.invoke('pos:print-receipt', { html, options });
  },
  getLocalIp: async (): Promise<string> => {
    return await ipcRenderer.invoke('pos:get-local-ip');
  },
});
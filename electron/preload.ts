import { contextBridge, ipcRenderer } from 'electron'

// Expose secure API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  storage: {
    set: (key: string, value: string): Promise<boolean> => {
      return ipcRenderer.invoke('storage:set', key, value)
    },
    get: (key: string): Promise<string | null> => {
      return ipcRenderer.invoke('storage:get', key)
    },
    remove: (key: string): Promise<boolean> => {
      return ipcRenderer.invoke('storage:remove', key)
    },
    clear: (): Promise<boolean> => {
      return ipcRenderer.invoke('storage:clear')
    },
  },
  biometric: {
    isAvailable: (): Promise<boolean> => {
      return ipcRenderer.invoke('biometric:isAvailable')
    },
    authenticate: (reason: string): Promise<boolean> => {
      return ipcRenderer.invoke('biometric:authenticate', reason)
    },
  },
})

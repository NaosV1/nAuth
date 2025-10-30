/**
 * TypeScript declarations for Electron API exposed via preload script
 */

interface ElectronAPI {
  storage: {
    set: (key: string, value: string) => Promise<boolean>
    get: (key: string) => Promise<string | null>
    remove: (key: string) => Promise<boolean>
    clear: () => Promise<boolean>
  }
  biometric: {
    isAvailable: () => Promise<boolean>
    authenticate: (reason: string) => Promise<boolean>
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}

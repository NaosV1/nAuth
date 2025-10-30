import { getPlatformInfo } from '@utils/platform'

/**
 * Storage Service
 * Provides a unified interface for secure storage across platforms
 * - Electron: Uses localStorage (can be enhanced with safeStorage)
 * - Capacitor: Uses SecureStorage plugin
 * - Web: Falls back to localStorage
 */

export class StorageService {
  private static STORAGE_PREFIX = 'nauth_'

  /**
   * Stores data securely
   */
  static async setItem(key: string, value: string): Promise<void> {
    const { isElectron, isCapacitor } = getPlatformInfo()
    const fullKey = this.STORAGE_PREFIX + key

    if (isCapacitor) {
      // Use Capacitor SecureStorage (plugin needs to be installed separately)
      // For now, fall back to localStorage
      // TODO: Install @capacitor-community/secure-storage when available
      localStorage.setItem(fullKey, value)
    } else if (isElectron) {
      // Use Electron's secure storage through IPC
      try {
        if (window.electronAPI?.storage?.set) {
          await window.electronAPI.storage.set(fullKey, value)
        } else {
          // Fallback to localStorage if IPC not available
          localStorage.setItem(fullKey, value)
        }
      } catch (error) {
        console.error('Electron storage failed, falling back to localStorage:', error)
        localStorage.setItem(fullKey, value)
      }
    } else {
      // Web fallback
      localStorage.setItem(fullKey, value)
    }
  }

  /**
   * Retrieves data securely
   */
  static async getItem(key: string): Promise<string | null> {
    const { isElectron, isCapacitor } = getPlatformInfo()
    const fullKey = this.STORAGE_PREFIX + key

    if (isCapacitor) {
      // Use Capacitor SecureStorage (plugin needs to be installed separately)
      // For now, fall back to localStorage
      return localStorage.getItem(fullKey)
    } else if (isElectron) {
      try {
        if (window.electronAPI?.storage?.get) {
          return await window.electronAPI.storage.get(fullKey)
        } else {
          return localStorage.getItem(fullKey)
        }
      } catch (error) {
        return localStorage.getItem(fullKey)
      }
    } else {
      return localStorage.getItem(fullKey)
    }
  }

  /**
   * Removes data securely
   */
  static async removeItem(key: string): Promise<void> {
    const { isElectron, isCapacitor } = getPlatformInfo()
    const fullKey = this.STORAGE_PREFIX + key

    if (isCapacitor) {
      // Use Capacitor SecureStorage (plugin needs to be installed separately)
      // For now, fall back to localStorage
      localStorage.removeItem(fullKey)
    } else if (isElectron) {
      try {
        if (window.electronAPI?.storage?.remove) {
          await window.electronAPI.storage.remove(fullKey)
        } else {
          localStorage.removeItem(fullKey)
        }
      } catch (error) {
        localStorage.removeItem(fullKey)
      }
    } else {
      localStorage.removeItem(fullKey)
    }
  }

  /**
   * Clears all app data
   */
  static async clear(): Promise<void> {
    const { isElectron, isCapacitor } = getPlatformInfo()

    if (isCapacitor) {
      // Use Capacitor SecureStorage (plugin needs to be installed separately)
      // For now, fall back to localStorage
      this.clearLocalStorage()
    } else if (isElectron) {
      try {
        if (window.electronAPI?.storage?.clear) {
          await window.electronAPI.storage.clear()
        } else {
          this.clearLocalStorage()
        }
      } catch (error) {
        this.clearLocalStorage()
      }
    } else {
      this.clearLocalStorage()
    }
  }

  /**
   * Helper to clear only nAuth items from localStorage
   */
  private static clearLocalStorage(): void {
    const keys = Object.keys(localStorage)
    for (const key of keys) {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        localStorage.removeItem(key)
      }
    }
  }

  /**
   * Check if storage is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const testKey = this.STORAGE_PREFIX + '__test__'
      await this.setItem(testKey, 'test')
      const value = await this.getItem(testKey)
      await this.removeItem(testKey)
      return value === 'test'
    } catch {
      return false
    }
  }
}

// Type declarations for Electron IPC
declare global {
  interface Window {
    electronAPI?: {
      storage: {
        set: (key: string, value: string) => Promise<void>
        get: (key: string) => Promise<string | null>
        remove: (key: string) => Promise<void>
        clear: () => Promise<void>
      }
      biometric: {
        isAvailable: () => Promise<boolean>
        authenticate: (reason: string) => Promise<boolean>
      }
    }
  }
}

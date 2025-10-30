import { getPlatformInfo } from '@utils/platform'
import { StorageService } from './storage.service'
import { EncryptionService } from './encryption.service'

/**
 * Biometric Service
 * Handles biometric authentication across all platforms
 * - Desktop: Windows Hello, Touch ID via Electron
 * - Mobile: Face ID, Fingerprint via Capacitor
 * - Web: WebAuthn API fallback
 */

const BIOMETRIC_KEY_STORAGE = 'biometric_enabled'
const SESSION_KEY_STORAGE = 'encrypted_session_key'

export class BiometricService {
  /**
   * Check if biometric authentication is available on this device
   * Only returns true for NATIVE biometric (Windows Hello, Touch ID, Face ID)
   * WebAuthn passkeys are NOT considered as biometric authentication
   */
  static async isAvailable(): Promise<boolean> {
    const { isElectron, isCapacitor, platform } = getPlatformInfo()

    try {
      if (isElectron) {
        // Check via Electron IPC for native Windows Hello / Touch ID
        if (window.electronAPI?.biometric?.isAvailable) {
          return await window.electronAPI.biometric.isAvailable()
        }
        return false
      }

      if (isCapacitor) {
        // Check for Capacitor biometric plugins
        try {
          // For iOS and Android
          if (platform === 'ios' || platform === 'android') {
            // Check if native biometric is available
            // This would require a Capacitor plugin like @capacitor/biometric
            return false // Placeholder until plugin is installed
          }
        } catch {
          return false
        }
      }

      // Web browsers: NO biometric support
      // We don't use WebAuthn passkeys as they are not true biometric authentication
      return false
    } catch (error) {
      console.error('Biometric availability check failed:', error)
      return false
    }
  }

  /**
   * Get the type of biometric authentication available
   */
  static async getBiometricType(): Promise<string> {
    const { platform } = getPlatformInfo()

    if (platform === 'ios') {
      return 'Face ID / Touch ID'
    } else if (platform === 'android') {
      return 'Fingerprint / Face'
    } else if (platform === 'electron') {
      // Check OS
      if (navigator.platform.includes('Mac')) {
        return 'Touch ID'
      } else if (navigator.platform.includes('Win')) {
        return 'Windows Hello'
      }
    }

    return 'Biometric'
  }

  /**
   * Check if biometric is enabled by the user
   */
  static async isEnabled(): Promise<boolean> {
    try {
      const enabled = await StorageService.getItem(BIOMETRIC_KEY_STORAGE)
      return enabled === 'true'
    } catch {
      return false
    }
  }

  /**
   * Enable biometric authentication
   * Stores an encrypted version of the master password that can be decrypted with biometric auth
   */
  static async enable(masterPassword: string): Promise<boolean> {
    try {
      // First, verify biometric works
      const authenticated = await this.authenticate('Enable biometric unlock')
      if (!authenticated) {
        return false
      }

      // Generate a random encryption key for the session
      const sessionKey = EncryptionService.generateTransferKey()

      // Encrypt the master password with the session key
      const encrypted = await EncryptionService.encrypt(masterPassword, sessionKey)

      // Store the encrypted password
      await StorageService.setItem(
        SESSION_KEY_STORAGE,
        JSON.stringify({
          encrypted: encrypted.encrypted,
          salt: encrypted.salt,
          iv: encrypted.iv,
          hmac: encrypted.hmac,
          sessionKey, // In production, this should be stored in secure enclave
        })
      )

      // Mark biometric as enabled
      await StorageService.setItem(BIOMETRIC_KEY_STORAGE, 'true')

      return true
    } catch (error) {
      console.error('Failed to enable biometric:', error)
      return false
    }
  }

  /**
   * Disable biometric authentication
   */
  static async disable(): Promise<void> {
    await StorageService.removeItem(BIOMETRIC_KEY_STORAGE)
    await StorageService.removeItem(SESSION_KEY_STORAGE)
  }

  /**
   * Authenticate using biometric
   * Returns the master password if successful
   */
  static async unlock(): Promise<string | null> {
    try {
      // Check if biometric is enabled
      if (!(await this.isEnabled())) {
        return null
      }

      // Authenticate with biometric
      const authenticated = await this.authenticate('Unlock nAuth')
      if (!authenticated) {
        return null
      }

      // Retrieve the encrypted session data
      const sessionData = await StorageService.getItem(SESSION_KEY_STORAGE)
      if (!sessionData) {
        return null
      }

      const { encrypted, salt, iv, hmac, sessionKey } = JSON.parse(sessionData)

      // Decrypt the master password
      const masterPassword = await EncryptionService.decrypt(encrypted, sessionKey, salt, iv, hmac)

      return masterPassword
    } catch (error) {
      console.error('Biometric unlock failed:', error)
      return null
    }
  }

  /**
   * Trigger biometric authentication (NATIVE only - no WebAuthn passkeys)
   * This will trigger Windows Hello, Touch ID, or Face ID depending on the platform
   */
  static async authenticate(reason: string): Promise<boolean> {
    const { isElectron, isCapacitor } = getPlatformInfo()

    try {
      if (isElectron) {
        // Use Electron's native biometric API (Windows Hello / Touch ID)
        if (window.electronAPI?.biometric?.authenticate) {
          return await window.electronAPI.biometric.authenticate(reason)
        }
        return false
      }

      if (isCapacitor) {
        // Use Capacitor biometric plugin (Face ID / Touch ID / Fingerprint)
        // This would require @capacitor/biometric or similar plugin
        // Placeholder for Capacitor implementation
        return false
      }

      // Web browsers: No biometric support
      // We explicitly do NOT use WebAuthn as it creates passkeys, not biometric auth
      return false
    } catch (error) {
      console.error('Biometric authentication failed:', error)
      return false
    }
  }

  /**
   * Update stored credentials when password changes
   */
  static async updatePassword(newPassword: string): Promise<boolean> {
    if (!(await this.isEnabled())) {
      return true
    }

    // Re-enable with new password
    await this.disable()
    return await this.enable(newPassword)
  }
}

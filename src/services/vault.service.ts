import { EncryptionService } from './encryption.service'
import { StorageService } from './storage.service'
import type { Account, EncryptedVault } from '@types/index'

/**
 * Vault Service
 * Manages encrypted storage of 2FA accounts
 * Handles encryption/decryption of the entire vault
 */

const VAULT_KEY = 'vault'
const VAULT_VERSION = '1.0.0'

export class VaultService {
  private static masterPassword: string | null = null
  private static accounts: Account[] = []
  private static isUnlocked = false

  /**
   * Initializes the vault (checks if vault exists)
   */
  static async initialize(): Promise<boolean> {
    const vaultData = await StorageService.getItem(VAULT_KEY)
    return vaultData !== null
  }

  /**
   * Creates a new vault with a master password
   */
  static async createVault(masterPassword: string): Promise<void> {
    if (await this.initialize()) {
      throw new Error('Vault already exists')
    }

    // Store the master password in memory
    this.masterPassword = masterPassword

    // Create empty vault
    this.accounts = []
    this.isUnlocked = true

    // Save encrypted vault
    await this.saveVault()
  }

  /**
   * Unlocks the vault with master password
   */
  static async unlockVault(masterPassword: string): Promise<boolean> {
    const vaultData = await StorageService.getItem(VAULT_KEY)
    if (!vaultData) {
      throw new Error('Vault does not exist')
    }

    try {
      const vault: EncryptedVault = JSON.parse(vaultData)

      // Decrypt vault data
      const decryptedData = await EncryptionService.decrypt(
        vault.data,
        masterPassword,
        vault.salt,
        vault.iv,
        vault.hmac
      )

      // Parse accounts
      this.accounts = JSON.parse(decryptedData)
      this.masterPassword = masterPassword
      this.isUnlocked = true

      return true
    } catch (error) {
      console.error('Failed to unlock vault:', error)
      return false
    }
  }

  /**
   * Locks the vault and clears sensitive data from memory
   */
  static lockVault(): void {
    this.accounts = []
    this.isUnlocked = false

    // Attempt to clear master password from memory
    if (this.masterPassword) {
      EncryptionService.wipeString(this.masterPassword)
      this.masterPassword = null
    }
  }

  /**
   * Saves the vault (encrypts and stores)
   */
  static async saveVault(): Promise<void> {
    if (!this.isUnlocked || !this.masterPassword) {
      throw new Error('Vault is locked')
    }

    // Serialize accounts
    const data = JSON.stringify(this.accounts)

    // Encrypt vault
    const encrypted = await EncryptionService.encrypt(data, this.masterPassword)

    // Create vault structure
    const vault: EncryptedVault = {
      version: VAULT_VERSION,
      salt: encrypted.salt,
      iv: encrypted.iv,
      data: encrypted.encrypted,
      hmac: encrypted.hmac,
    }

    // Save to storage
    await StorageService.setItem(VAULT_KEY, JSON.stringify(vault))
  }

  /**
   * Gets all accounts from the vault
   */
  static getAccounts(): Account[] {
    if (!this.isUnlocked) {
      throw new Error('Vault is locked')
    }
    return [...this.accounts]
  }

  /**
   * Gets the master password (only when vault is unlocked)
   */
  static getMasterPassword(): string | null {
    if (!this.isUnlocked) {
      return null
    }
    return this.masterPassword
  }

  /**
   * Gets a single account by ID
   */
  static getAccount(id: string): Account | undefined {
    if (!this.isUnlocked) {
      throw new Error('Vault is locked')
    }
    return this.accounts.find(acc => acc.id === id)
  }

  /**
   * Adds a new account to the vault
   */
  static async addAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    if (!this.isUnlocked) {
      throw new Error('Vault is locked')
    }

    const newAccount: Account = {
      ...account,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    this.accounts.push(newAccount)
    await this.saveVault()

    return newAccount
  }

  /**
   * Updates an existing account
   */
  static async updateAccount(id: string, updates: Partial<Account>): Promise<void> {
    if (!this.isUnlocked) {
      throw new Error('Vault is locked')
    }

    const index = this.accounts.findIndex(acc => acc.id === id)
    if (index === -1) {
      throw new Error('Account not found')
    }

    this.accounts[index] = {
      ...this.accounts[index]!,
      ...updates,
      updatedAt: Date.now(),
    }

    await this.saveVault()
  }

  /**
   * Deletes an account from the vault
   */
  static async deleteAccount(id: string): Promise<void> {
    if (!this.isUnlocked) {
      throw new Error('Vault is locked')
    }

    const index = this.accounts.findIndex(acc => acc.id === id)
    if (index === -1) {
      throw new Error('Account not found')
    }

    this.accounts.splice(index, 1)
    await this.saveVault()
  }

  /**
   * Exports the encrypted vault for transfer
   */
  static async exportVault(transferPassword?: string): Promise<string> {
    if (!this.isUnlocked || !this.masterPassword) {
      throw new Error('Vault is locked')
    }

    const password = transferPassword || this.masterPassword
    const data = JSON.stringify(this.accounts)

    // Encrypt with transfer password
    const encrypted = await EncryptionService.encrypt(data, password)

    // Create checksum for verification
    const checksum = EncryptionService.createChecksum(data)

    const exportData = {
      version: VAULT_VERSION,
      encryptedData: encrypted.encrypted,
      salt: encrypted.salt,
      iv: encrypted.iv,
      hmac: encrypted.hmac,
      checksum,
    }

    return JSON.stringify(exportData)
  }

  /**
   * Imports an encrypted vault
   */
  static async importVault(exportedData: string, transferPassword: string): Promise<number> {
    if (!this.isUnlocked) {
      throw new Error('Vault must be unlocked to import')
    }

    try {
      const importData = JSON.parse(exportedData)

      // Decrypt the imported data
      const decryptedData = await EncryptionService.decrypt(
        importData.encryptedData,
        transferPassword,
        importData.salt,
        importData.iv,
        importData.hmac
      )

      // Verify checksum
      const checksum = EncryptionService.createChecksum(decryptedData)
      if (checksum !== importData.checksum) {
        throw new Error('Checksum verification failed')
      }

      // Parse imported accounts
      const importedAccounts: Account[] = JSON.parse(decryptedData)

      // Merge with existing accounts (avoid duplicates)
      let importedCount = 0
      for (const account of importedAccounts) {
        const exists = this.accounts.some(
          acc => acc.issuer === account.issuer && acc.name === account.name
        )

        if (!exists) {
          await this.addAccount({
            name: account.name,
            issuer: account.issuer,
            secret: account.secret,
            type: account.type,
            algorithm: account.algorithm,
            digits: account.digits,
            period: account.period,
            counter: account.counter,
          })
          importedCount++
        }
      }

      return importedCount
    } catch (error) {
      console.error('Failed to import vault:', error)
      throw new Error('Failed to import vault. Check password and data integrity.')
    }
  }

  /**
   * Changes the master password
   */
  static async changeMasterPassword(currentPassword: string, newPassword: string): Promise<boolean> {
    if (!this.isUnlocked) {
      throw new Error('Vault is locked')
    }

    if (currentPassword !== this.masterPassword) {
      return false
    }

    // Update master password
    this.masterPassword = newPassword

    // Re-encrypt vault with new password
    await this.saveVault()

    return true
  }

  /**
   * Checks if vault is unlocked
   */
  static isVaultUnlocked(): boolean {
    return this.isUnlocked
  }

  /**
   * Deletes the entire vault (WARNING: Cannot be undone)
   */
  static async deleteVault(): Promise<void> {
    this.lockVault()
    await StorageService.removeItem(VAULT_KEY)
  }

  /**
   * Generates a unique ID for accounts
   */
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }
}

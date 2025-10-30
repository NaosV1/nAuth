import { VaultService } from './vault.service'
import { OTPService } from './otp.service'
import type { Account } from '@types/index'

/**
 * Account Service
 * High-level service for managing 2FA accounts
 * Combines vault and OTP functionality
 */

export class AccountService {
  /**
   * Gets all accounts from the vault
   */
  static async getAll(): Promise<Account[]> {
    return VaultService.getAccounts()
  }

  /**
   * Gets a single account by ID
   */
  static async getById(id: string): Promise<Account | undefined> {
    return VaultService.getAccount(id)
  }

  /**
   * Adds a new account from OTP URI (QR code)
   */
  static async addFromURI(uri: string): Promise<Account> {
    const accountData = OTPService.parseOTPAuthURI(uri)
    return await VaultService.addAccount(accountData)
  }

  /**
   * Adds a new account manually
   */
  static async addManual(accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    // Validate secret
    if (!OTPService.validateSecret(accountData.secret)) {
      throw new Error('Invalid secret key')
    }

    return await VaultService.addAccount(accountData)
  }

  /**
   * Updates an existing account
   */
  static async update(id: string, updates: Partial<Account>): Promise<void> {
    await VaultService.updateAccount(id, updates)
  }

  /**
   * Deletes an account
   */
  static async delete(id: string): Promise<void> {
    await VaultService.deleteAccount(id)
  }

  /**
   * Generates the current OTP code for an account
   */
  static generateCode(account: Account): string | { code: string; remainingSeconds: number; progress: number } {
    if (account.type === 'totp') {
      return OTPService.generateTOTP(account)
    } else {
      return OTPService.generateHOTP(account)
    }
  }

  /**
   * Increments HOTP counter after code generation
   */
  static async incrementHOTPCounter(id: string): Promise<void> {
    const account = VaultService.getAccount(id)
    if (!account || account.type !== 'hotp') {
      throw new Error('Account is not HOTP')
    }

    await VaultService.updateAccount(id, {
      counter: account.counter + 1,
    })
  }

  /**
   * Searches accounts by name or issuer
   */
  static async search(query: string): Promise<Account[]> {
    const accounts = VaultService.getAccounts()
    const lowerQuery = query.toLowerCase()

    return accounts.filter(
      account =>
        account.name.toLowerCase().includes(lowerQuery) ||
        account.issuer.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Gets accounts grouped by issuer
   */
  static async getGroupedByIssuer(): Promise<Record<string, Account[]>> {
    const accounts = VaultService.getAccounts()
    const grouped: Record<string, Account[]> = {}

    for (const account of accounts) {
      const issuer = account.issuer || 'Other'
      if (!grouped[issuer]) {
        grouped[issuer] = []
      }
      grouped[issuer]!.push(account)
    }

    return grouped
  }

  /**
   * Exports account to OTP URI
   */
  static exportToURI(account: Account): string {
    return OTPService.generateOTPAuthURI(account)
  }

  /**
   * Gets statistics about accounts
   */
  static async getStats(): Promise<{
    total: number
    totpCount: number
    hotpCount: number
    issuers: number
  }> {
    const accounts = VaultService.getAccounts()
    const uniqueIssuers = new Set(accounts.map(acc => acc.issuer))

    return {
      total: accounts.length,
      totpCount: accounts.filter(acc => acc.type === 'totp').length,
      hotpCount: accounts.filter(acc => acc.type === 'hotp').length,
      issuers: uniqueIssuers.size,
    }
  }
}

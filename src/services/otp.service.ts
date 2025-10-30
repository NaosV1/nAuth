import * as OTPAuth from 'otpauth'
import type { Account } from '@types/index'

/**
 * OTP Service
 * Handles generation of TOTP and HOTP codes
 * Parses otpauth:// URIs from QR codes
 */

export interface OTPResult {
  code: string
  remainingSeconds: number
  progress: number // 0-1 for visual progress bar
}

export class OTPService {
  /**
   * Generates a TOTP code for an account
   */
  static generateTOTP(account: Account): OTPResult {
    try {
      const totp = new OTPAuth.TOTP({
        issuer: account.issuer,
        label: account.name,
        algorithm: account.algorithm,
        digits: account.digits,
        period: account.period,
        secret: account.secret,
      })

      const code = totp.generate()
      const now = Math.floor(Date.now() / 1000)
      const elapsed = now % account.period
      const remainingSeconds = account.period - elapsed
      const progress = elapsed / account.period

      return {
        code,
        remainingSeconds,
        progress,
      }
    } catch (error) {
      console.error('Failed to generate TOTP:', error)
      throw new Error('Failed to generate TOTP code')
    }
  }

  /**
   * Generates an HOTP code for an account
   */
  static generateHOTP(account: Account): string {
    try {
      const hotp = new OTPAuth.HOTP({
        issuer: account.issuer,
        label: account.name,
        algorithm: account.algorithm,
        digits: account.digits,
        counter: account.counter,
        secret: account.secret,
      })

      return hotp.generate()
    } catch (error) {
      console.error('Failed to generate HOTP:', error)
      throw new Error('Failed to generate HOTP code')
    }
  }

  /**
   * Parses an otpauth:// URI from a QR code
   */
  static parseOTPAuthURI(uri: string): Omit<Account, 'id' | 'createdAt' | 'updatedAt'> {
    try {
      // Remove any whitespace
      uri = uri.trim()

      if (!uri.startsWith('otpauth://')) {
        throw new Error('Invalid OTP URI format')
      }

      // Parse the URI
      const url = new URL(uri)
      const type = url.hostname.toLowerCase() as 'totp' | 'hotp'

      if (type !== 'totp' && type !== 'hotp') {
        throw new Error('Unsupported OTP type')
      }

      // Extract label (issuer:account or just account)
      const pathParts = decodeURIComponent(url.pathname.substring(1)).split(':')
      let issuer = url.searchParams.get('issuer') || ''
      let name = ''

      if (pathParts.length === 2) {
        issuer = issuer || pathParts[0]!
        name = pathParts[1]!
      } else {
        name = pathParts[0]!
      }

      // Extract parameters
      const secret = url.searchParams.get('secret')
      if (!secret) {
        throw new Error('Secret is required')
      }

      const algorithm = (url.searchParams.get('algorithm') || 'SHA1').toUpperCase() as 'SHA1' | 'SHA256' | 'SHA512'
      const digits = parseInt(url.searchParams.get('digits') || '6') as 6 | 7 | 8
      const period = parseInt(url.searchParams.get('period') || '30')
      const counter = parseInt(url.searchParams.get('counter') || '0')

      // Validate algorithm
      if (!['SHA1', 'SHA256', 'SHA512'].includes(algorithm)) {
        throw new Error('Invalid algorithm')
      }

      // Validate digits
      if (![6, 7, 8].includes(digits)) {
        throw new Error('Invalid digits count')
      }

      return {
        name: name || 'Unknown',
        issuer: issuer || 'Unknown',
        secret,
        type,
        algorithm,
        digits,
        period,
        counter,
      }
    } catch (error) {
      console.error('Failed to parse OTP URI:', error)
      throw new Error('Invalid OTP URI format')
    }
  }

  /**
   * Generates an otpauth:// URI for an account
   */
  static generateOTPAuthURI(account: Account): string {
    try {
      const label = account.issuer ? `${account.issuer}:${account.name}` : account.name
      const params = new URLSearchParams({
        secret: account.secret,
        issuer: account.issuer,
        algorithm: account.algorithm,
        digits: account.digits.toString(),
      })

      if (account.type === 'totp') {
        params.append('period', account.period.toString())
      } else {
        params.append('counter', account.counter.toString())
      }

      return `otpauth://${account.type}/${encodeURIComponent(label)}?${params.toString()}`
    } catch (error) {
      console.error('Failed to generate OTP URI:', error)
      throw new Error('Failed to generate OTP URI')
    }
  }

  /**
   * Validates a secret key (Base32 encoded)
   */
  static validateSecret(secret: string): boolean {
    // Remove spaces and convert to uppercase
    const cleanSecret = secret.replace(/\s/g, '').toUpperCase()

    // Check if it's valid Base32
    const base32Regex = /^[A-Z2-7]+=*$/
    if (!base32Regex.test(cleanSecret)) {
      return false
    }

    // Try to create a TOTP with it
    try {
      new OTPAuth.TOTP({
        secret: cleanSecret,
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Generates a random secret key
   */
  static generateSecret(): string {
    const secret = new OTPAuth.Secret({ size: 20 })
    return secret.base32
  }

  /**
   * Formats a code with spacing for readability
   */
  static formatCode(code: string): string {
    // Add space in the middle for 6-digit codes (123 456)
    if (code.length === 6) {
      return `${code.substring(0, 3)} ${code.substring(3)}`
    }
    // Add space for 7-digit codes (123 4567)
    if (code.length === 7) {
      return `${code.substring(0, 3)} ${code.substring(3)}`
    }
    // Add space for 8-digit codes (1234 5678)
    if (code.length === 8) {
      return `${code.substring(0, 4)} ${code.substring(4)}`
    }
    return code
  }
}

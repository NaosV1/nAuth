import CryptoJS from 'crypto-js'

/**
 * Encryption Service
 * Provides AES-256-CBC encryption with PBKDF2 key derivation
 * All cryptographic operations are handled here
 */

const PBKDF2_ITERATIONS = 100000 // OWASP recommended minimum
const KEY_LENGTH = 32 // 256 bits

export class EncryptionService {
  /**
   * Derives an encryption key from a password using PBKDF2
   * Using native Web Crypto API for better performance and compatibility
   */
  static async deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
    // Convert password to ArrayBuffer
    const encoder = new TextEncoder()
    const passwordBuffer = encoder.encode(password)

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    )

    // Derive bits using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      KEY_LENGTH * 8
    )

    return new Uint8Array(derivedBits)
  }

  /**
   * Generates a random salt for key derivation
   */
  static generateSalt(): Uint8Array {
    const salt = new Uint8Array(16)
    crypto.getRandomValues(salt)
    return salt
  }

  /**
   * Generates a random IV (Initialization Vector) for encryption
   */
  static generateIV(): Uint8Array {
    const iv = new Uint8Array(16)
    crypto.getRandomValues(iv)
    return iv
  }

  /**
   * Encrypts data using AES-256-CBC (using crypto-js)
   * Note: CryptoJS doesn't support GCM, but CBC with HMAC provides similar security
   */
  static async encrypt(
    data: string,
    password: string,
    salt?: Uint8Array,
    iv?: Uint8Array
  ): Promise<{
    encrypted: string
    salt: string
    iv: string
    hmac: string
  }> {
    // Generate salt and IV if not provided
    const saltBytes = salt || this.generateSalt()
    const ivBytes = iv || this.generateIV()

    // Derive key from password
    const keyBytes = await this.deriveKey(password, saltBytes)

    // Convert Uint8Array to WordArray for CryptoJS
    const key = CryptoJS.lib.WordArray.create(Array.from(keyBytes))
    const ivWordArray = CryptoJS.lib.WordArray.create(Array.from(ivBytes))

    // Encrypt data
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    })

    // Create HMAC for integrity check
    const hmac = CryptoJS.HmacSHA256(encrypted.ciphertext.toString(), key).toString()

    return {
      encrypted: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
      salt: this.arrayBufferToBase64(saltBytes),
      iv: this.arrayBufferToBase64(ivBytes),
      hmac,
    }
  }

  /**
   * Decrypts data using AES-256-CBC
   */
  static async decrypt(
    encryptedData: string,
    password: string,
    salt: string,
    iv: string,
    hmac: string
  ): Promise<string> {
    // Convert base64 strings back to Uint8Array
    const saltBytes = this.base64ToUint8Array(salt)
    const ivBytes = this.base64ToUint8Array(iv)

    // Derive key from password
    const keyBytes = await this.deriveKey(password, saltBytes)

    // Convert to WordArray for CryptoJS
    const key = CryptoJS.lib.WordArray.create(Array.from(keyBytes))
    const ivWordArray = CryptoJS.lib.WordArray.create(Array.from(ivBytes))

    // Verify HMAC before decrypting
    const ciphertext = CryptoJS.enc.Base64.parse(encryptedData)
    const computedHmac = CryptoJS.HmacSHA256(ciphertext.toString(), key).toString()

    if (computedHmac !== hmac) {
      throw new Error('Data integrity check failed. Data may be corrupted or tampered with.')
    }

    // Decrypt data
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext } as any,
      key,
      {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    )

    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8)

    if (!decryptedString) {
      throw new Error('Decryption failed. Incorrect password or corrupted data.')
    }

    return decryptedString
  }

  /**
   * Generates a secure random string for transfer encryption
   */
  static generateTransferKey(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return this.arrayBufferToBase64(array)
  }

  /**
   * Converts Uint8Array to Base64 string
   */
  static arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = ''
    const len = buffer.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]!)
    }
    return btoa(binary)
  }

  /**
   * Converts Base64 string to Uint8Array
   */
  static base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  /**
   * Creates a checksum of data for verification
   */
  static createChecksum(data: string): string {
    return CryptoJS.SHA256(data).toString().substring(0, 8)
  }

  /**
   * Securely wipes sensitive data from memory (best effort)
   */
  static wipeString(str: string): void {
    // In JavaScript, we can't truly wipe memory, but we can overwrite references
    // This is more of a symbolic gesture, but helps with security practices
    if (str) {
      // Create a new string of the same length filled with zeros
      // Note: This doesn't actually wipe the original string from memory
      str = '0'.repeat(str.length)
    }
  }
}

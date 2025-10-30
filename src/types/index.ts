// Core types for nAuth

export interface Account {
  id: string
  name: string
  issuer: string
  secret: string
  type: 'totp' | 'hotp'
  algorithm: 'SHA1' | 'SHA256' | 'SHA512'
  digits: 6 | 7 | 8
  period: number // for TOTP (usually 30 seconds)
  counter: number // for HOTP
  createdAt: number
  updatedAt: number
}

export interface EncryptedVault {
  version: string
  salt: string
  iv: string
  data: string // encrypted account data
  hmac: string // integrity check
}

export interface SecuritySettings {
  autoLockEnabled: boolean
  autoLockTimeout: number // in minutes
  biometricEnabled: boolean
  clipboardClearTimeout: number // in seconds
}

export interface TransferPayload {
  version: string
  encryptedData: string
  salt: string
  iv: string
  checksum: string
}

export interface PlatformInfo {
  isElectron: boolean
  isCapacitor: boolean
  platform: 'web' | 'electron' | 'ios' | 'android'
}

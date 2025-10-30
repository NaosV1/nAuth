import { useState, useEffect } from 'react'
import { VaultService } from '@services/vault.service'
import { BiometricService } from '@services/biometric.service'
import { StorageService } from '@services/storage.service'
import BiometricSetupModal from './BiometricSetupModal'
import './AuthScreen.css'

interface AuthScreenProps {
  vaultExists: boolean
  onUnlock: () => void
}

function AuthScreen({ vaultExists, onUnlock }: AuthScreenProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricType, setBiometricType] = useState('Biometric')
  const [showBiometricModal, setShowBiometricModal] = useState(false)
  const [pendingMasterPassword, setPendingMasterPassword] = useState<string | null>(null)

  useEffect(() => {
    checkBiometric()
  }, [])

  const checkBiometric = async () => {
    const available = await BiometricService.isAvailable()
    setBiometricAvailable(available)

    if (available) {
      const enabled = await BiometricService.isEnabled()
      setBiometricEnabled(enabled)

      const type = await BiometricService.getBiometricType()
      setBiometricType(type)
    }
  }

  const handleBiometricUnlock = async () => {
    setError('')
    setIsLoading(true)

    try {
      const masterPassword = await BiometricService.unlock()

      if (masterPassword) {
        const success = await VaultService.unlockVault(masterPassword)
        if (success) {
          onUnlock()
        } else {
          setError('Failed to unlock vault')
        }
      } else {
        setError('Biometric authentication failed')
      }
    } catch (err) {
      console.error('Biometric unlock error:', err)
      setError('Biometric authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnableBiometric = async () => {
    if (!pendingMasterPassword) return

    try {
      const success = await BiometricService.enable(pendingMasterPassword)
      if (success) {
        setBiometricEnabled(true)
        setShowBiometricModal(false)
        setPendingMasterPassword(null)
        onUnlock()
      } else {
        setError('Failed to enable biometric authentication')
      }
    } catch (err) {
      console.error('Enable biometric error:', err)
      setError('Failed to enable biometric authentication')
    }
  }

  const handleSkipBiometric = async (dontAskAgain: boolean) => {
    setShowBiometricModal(false)
    setPendingMasterPassword(null)

    if (dontAskAgain) {
      // Save preference to not ask again
      await StorageService.setItem('biometric_dont_ask', 'true')
    }

    onUnlock()
  }

  const shouldShowBiometricModal = async (): Promise<boolean> => {
    // Check if user said "don't ask again"
    const dontAsk = await StorageService.getItem('biometric_dont_ask')
    return dontAsk !== 'true'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError('Password is required')
      return
    }

    if (!vaultExists && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!vaultExists && password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      if (vaultExists) {
        // Unlock existing vault
        const success = await VaultService.unlockVault(password)
        if (success) {
          // Check if we should offer to enable biometric
          if (biometricAvailable && !biometricEnabled && (await shouldShowBiometricModal())) {
            setPendingMasterPassword(password)
            setShowBiometricModal(true)
          } else {
            onUnlock()
          }
        } else {
          setError('Incorrect password')
        }
      } else {
        // Create new vault
        await VaultService.createVault(password)

        // Offer to enable biometric for new vaults
        if (biometricAvailable && (await shouldShowBiometricModal())) {
          setPendingMasterPassword(password)
          setShowBiometricModal(true)
        } else {
          onUnlock()
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-container fade-in">
        <div className="auth-header">
          <div className="auth-icon">🔐</div>
          <h1>nAuth</h1>
          <p className="text-secondary">
            {vaultExists ? 'Welcome back' : 'Secure 2FA Authenticator'}
          </p>
        </div>

        {vaultExists && biometricEnabled && (
          <div className="biometric-section">
            <button
              type="button"
              className="btn-biometric"
              onClick={handleBiometricUnlock}
              disabled={isLoading}
            >
              <span className="biometric-icon">🔓</span>
              <div className="biometric-text">
                <span className="biometric-label">Unlock with {biometricType}</span>
                <span className="biometric-hint">Quick and secure</span>
              </div>
            </button>

            <div className="divider">
              <span>or enter password</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">
              {vaultExists ? 'Master Password' : 'Create Master Password'}
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
              autoFocus={!biometricEnabled}
            />
          </div>

          {!vaultExists && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className="input"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Please wait...' : vaultExists ? 'Unlock' : 'Create Vault'}
          </button>

          {!vaultExists && (
            <div className="info-box mt-2">
              <p>
                <strong>Important:</strong> Your master password encrypts all your 2FA accounts.
                Make sure to remember it - it cannot be recovered if lost.
              </p>
            </div>
          )}
        </form>

        <div className="auth-footer">
          <p className="text-secondary">No login required • Fully encrypted • Open source</p>
        </div>
      </div>

      {showBiometricModal && (
        <BiometricSetupModal
          biometricType={biometricType}
          onEnable={handleEnableBiometric}
          onSkip={handleSkipBiometric}
        />
      )}
    </div>
  )
}

export default AuthScreen

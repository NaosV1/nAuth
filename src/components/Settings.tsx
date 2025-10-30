import { useState, useEffect } from 'react'
import { BiometricService } from '@services/biometric.service'
import { VaultService } from '@services/vault.service'
import { StorageService } from '@services/storage.service'
import './Settings.css'

interface SettingsProps {
  onClose: () => void
  onLogout: () => void
  onDataCleared: () => void
}

function Settings({ onClose, onLogout, onDataCleared }: SettingsProps) {
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricType, setBiometricType] = useState('Biometric')
  const [isEnabling, setIsEnabling] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const handleEnableBiometric = async () => {
    setError('')
    setSuccess('')
    setIsEnabling(true)

    try {
      // Get master password from vault (it's already unlocked)
      const masterPassword = VaultService.getMasterPassword()
      if (!masterPassword) {
        setError('Vault is not unlocked')
        setIsEnabling(false)
        return
      }

      const result = await BiometricService.enable(masterPassword)
      if (result) {
        setBiometricEnabled(true)
        setSuccess(`${biometricType} activé avec succès`)
      } else {
        setError(`Échec de l'activation de ${biometricType}`)
      }
    } catch (err) {
      console.error('Enable biometric error:', err)
      setError(`Erreur lors de l'activation de ${biometricType}`)
    } finally {
      setIsEnabling(false)
    }
  }

  const handleDisableBiometric = async () => {
    setError('')
    setSuccess('')

    try {
      await BiometricService.disable()
      setBiometricEnabled(false)
      setSuccess(`${biometricType} désactivé avec succès`)
    } catch (err) {
      console.error('Disable biometric error:', err)
      setError(`Erreur lors de la désactivation de ${biometricType}`)
    }
  }

  const handleDeleteAllData = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') {
      setError('Veuillez taper "SUPPRIMER" pour confirmer')
      return
    }

    setError('')
    setSuccess('')

    try {
      // Clear all data
      await StorageService.clear()
      await BiometricService.disable()

      setSuccess('Toutes les données ont été supprimées')

      // Wait a bit for the message to be visible
      setTimeout(() => {
        onDataCleared()
      }, 1500)
    } catch (err) {
      console.error('Delete all data error:', err)
      setError('Erreur lors de la suppression des données')
    }
  }

  return (
    <div className="settings-screen">
      <div className="settings-container">
        <div className="settings-header">
          <h1>Paramètres</h1>
          <button className="btn-icon" onClick={onClose} title="Fermer">
            ✕
          </button>
        </div>

        <div className="settings-content">
          {/* Biometric Section */}
          {biometricAvailable && (
            <section className="settings-section">
              <div className="section-header">
                <h2>🔐 Authentification biométrique</h2>
                <p className="section-description">
                  Déverrouillez rapidement nAuth avec {biometricType}
                </p>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">{biometricType}</span>
                  <span className="setting-status">
                    {biometricEnabled ? (
                      <span className="status-enabled">✓ Activé</span>
                    ) : (
                      <span className="status-disabled">Désactivé</span>
                    )}
                  </span>
                </div>
                <button
                  className={`btn ${biometricEnabled ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={biometricEnabled ? handleDisableBiometric : handleEnableBiometric}
                  disabled={isEnabling}
                >
                  {isEnabling
                    ? 'En cours...'
                    : biometricEnabled
                      ? 'Désactiver'
                      : 'Activer'}
                </button>
              </div>
            </section>
          )}

          {/* Security Section */}
          <section className="settings-section">
            <div className="section-header">
              <h2>🔒 Sécurité</h2>
              <p className="section-description">
                Gérez vos données et votre compte
              </p>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Verrouiller l'application</span>
                <span className="setting-hint">Retour à l'écran de connexion</span>
              </div>
              <button className="btn btn-secondary" onClick={onLogout}>
                Verrouiller
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="settings-section danger-zone">
            <div className="section-header">
              <h2>⚠️ Zone de danger</h2>
              <p className="section-description">
                Actions irréversibles - Soyez prudent
              </p>
            </div>

            {!showDeleteConfirm ? (
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Supprimer toutes les données</span>
                  <span className="setting-hint">
                    Supprime tous les comptes, paramètres et données chiffrées
                  </span>
                </div>
                <button
                  className="btn btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Supprimer tout
                </button>
              </div>
            ) : (
              <div className="delete-confirmation">
                <p className="delete-warning">
                  ⚠️ Cette action est <strong>irréversible</strong>. Tous vos comptes 2FA
                  seront définitivement supprimés.
                </p>
                <p className="delete-instruction">
                  Tapez <strong>SUPPRIMER</strong> pour confirmer :
                </p>
                <input
                  type="text"
                  className="input"
                  placeholder="SUPPRIMER"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  autoFocus
                />
                <div className="delete-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                      setError('')
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleDeleteAllData}
                    disabled={deleteConfirmText !== 'SUPPRIMER'}
                  >
                    Confirmer la suppression
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Messages */}
          {error && <div className="message message-error">{error}</div>}
          {success && <div className="message message-success">{success}</div>}

          {/* App Info */}
          <section className="settings-section app-info">
            <div className="info-row">
              <span className="info-label">Version</span>
              <span className="info-value">0.1.0</span>
            </div>
            <div className="info-row">
              <span className="info-label">Plateforme</span>
              <span className="info-value">
                {window.electronAPI ? 'Desktop (Electron)' : 'Web'}
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Settings

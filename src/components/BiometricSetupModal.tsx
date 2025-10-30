import { useState } from 'react'
import './BiometricSetupModal.css'

interface BiometricSetupModalProps {
  biometricType: string
  onEnable: () => Promise<void>
  onSkip: (dontAskAgain: boolean) => void
}

function BiometricSetupModal({ biometricType, onEnable, onSkip }: BiometricSetupModalProps) {
  const [isEnabling, setIsEnabling] = useState(false)
  const [dontAskAgain, setDontAskAgain] = useState(false)

  const handleEnable = async () => {
    setIsEnabling(true)
    try {
      await onEnable()
    } finally {
      setIsEnabling(false)
    }
  }

  const handleSkip = () => {
    onSkip(dontAskAgain)
  }

  return (
    <div className="modal-overlay" onClick={handleSkip}>
      <div className="biometric-modal-content" onClick={e => e.stopPropagation()}>
        <div className="biometric-modal-icon">🔐</div>

        <h2 className="biometric-modal-title">Activer le déverrouillage biométrique ?</h2>

        <p className="biometric-modal-description">
          Déverrouillez nAuth plus rapidement avec <strong>{biometricType}</strong>.
          Votre mot de passe principal sera chiffré et stocké en toute sécurité sur cet appareil.
        </p>

        <div className="biometric-modal-benefits">
          <div className="benefit-item">
            <span className="benefit-icon">⚡</span>
            <span>Déverrouillage rapide</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">🔒</span>
            <span>Chiffrement sécurisé</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">📱</span>
            <span>Stockage local uniquement</span>
          </div>
        </div>

        <div className="biometric-modal-actions">
          <button
            className="btn btn-primary"
            onClick={handleEnable}
            disabled={isEnabling}
          >
            {isEnabling ? 'Activation en cours...' : `Activer ${biometricType}`}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleSkip}
            disabled={isEnabling}
          >
            Plus tard
          </button>
        </div>

        <div className="biometric-modal-footer">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={e => setDontAskAgain(e.target.checked)}
              disabled={isEnabling}
            />
            <span>Ne plus me demander</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default BiometricSetupModal

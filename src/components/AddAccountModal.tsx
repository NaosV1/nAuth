import { useState } from 'react'
import { AccountService } from '@services/account.service'
import { OTPService } from '@services/otp.service'
import QRScanner from './QRScanner'
import './AddAccountModal.css'

interface AddAccountModalProps {
  onClose: () => void
  onAdd: () => void
}

type Tab = 'qr' | 'manual'

function AddAccountModal({ onClose, onAdd }: AddAccountModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('qr')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Manual entry state
  const [name, setName] = useState('')
  const [issuer, setIssuer] = useState('')
  const [secret, setSecret] = useState('')
  const [type, setType] = useState<'totp' | 'hotp'>('totp')
  const [algorithm, setAlgorithm] = useState<'SHA1' | 'SHA256' | 'SHA512'>('SHA1')
  const [digits, setDigits] = useState<6 | 7 | 8>(6)
  const [period, setPeriod] = useState(30)

  const handleQRScan = async (data: string) => {
    setError('')
    setIsLoading(true)

    try {
      await AccountService.addFromURI(data)
      onAdd()
    } catch (err) {
      console.error('Failed to add account from QR:', err)
      setError('Invalid QR code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name || !secret) {
      setError('Name and secret are required')
      return
    }

    if (!OTPService.validateSecret(secret)) {
      setError('Invalid secret key. Must be Base32 encoded.')
      return
    }

    setIsLoading(true)

    try {
      await AccountService.addManual({
        name,
        issuer: issuer || 'Unknown',
        secret: secret.replace(/\s/g, '').toUpperCase(),
        type,
        algorithm,
        digits,
        period,
        counter: 0,
      })
      onAdd()
    } catch (err) {
      console.error('Failed to add account:', err)
      setError('Failed to add account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Account</h2>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'qr' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('qr')}
          >
            📷 Scan QR Code
          </button>
          <button
            className={`tab ${activeTab === 'manual' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            ✏️ Manual Entry
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          {activeTab === 'qr' ? (
            <div className="qr-tab">
              <QRScanner onScan={handleQRScan} />
              <p className="text-secondary text-center mt-2">
                Scan the QR code from your 2FA provider
              </p>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="manual-form">
              <div className="form-group">
                <label htmlFor="issuer">Issuer (e.g., Google, GitHub)</label>
                <input
                  id="issuer"
                  type="text"
                  className="input"
                  placeholder="Google"
                  value={issuer}
                  onChange={e => setIssuer(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="name">Account Name *</label>
                <input
                  id="name"
                  type="text"
                  className="input"
                  placeholder="user@example.com"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="secret">Secret Key *</label>
                <input
                  id="secret"
                  type="text"
                  className="input"
                  placeholder="JBSWY3DPEHPK3PXP"
                  value={secret}
                  onChange={e => setSecret(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <small className="text-secondary">Base32 encoded secret (spaces will be removed)</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="type">Type</label>
                  <select
                    id="type"
                    className="input"
                    value={type}
                    onChange={e => setType(e.target.value as 'totp' | 'hotp')}
                    disabled={isLoading}
                  >
                    <option value="totp">TOTP (Time-based)</option>
                    <option value="hotp">HOTP (Counter-based)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="algorithm">Algorithm</label>
                  <select
                    id="algorithm"
                    className="input"
                    value={algorithm}
                    onChange={e => setAlgorithm(e.target.value as typeof algorithm)}
                    disabled={isLoading}
                  >
                    <option value="SHA1">SHA1</option>
                    <option value="SHA256">SHA256</option>
                    <option value="SHA512">SHA512</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="digits">Digits</label>
                  <select
                    id="digits"
                    className="input"
                    value={digits}
                    onChange={e => setDigits(Number(e.target.value) as typeof digits)}
                    disabled={isLoading}
                  >
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                  </select>
                </div>

                {type === 'totp' && (
                  <div className="form-group">
                    <label htmlFor="period">Period (seconds)</label>
                    <input
                      id="period"
                      type="number"
                      className="input"
                      value={period}
                      onChange={e => setPeriod(Number(e.target.value))}
                      disabled={isLoading}
                      min="1"
                    />
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default AddAccountModal

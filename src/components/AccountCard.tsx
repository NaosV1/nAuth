import { useState, useEffect } from 'react'
import { AccountService } from '@services/account.service'
import { OTPService } from '@services/otp.service'
import type { Account } from '@types/index'
import './AccountCard.css'

interface AccountCardProps {
  account: Account
  onDelete: () => void
}

function AccountCard({ account, onDelete }: AccountCardProps) {
  const [code, setCode] = useState('')
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    generateCode()
    const interval = setInterval(generateCode, 1000)
    return () => clearInterval(interval)
  }, [account])

  const generateCode = () => {
    try {
      const result = AccountService.generateCode(account)

      if (typeof result === 'string') {
        // HOTP
        setCode(result)
        setRemainingSeconds(0)
        setProgress(0)
      } else {
        // TOTP
        setCode(result.code)
        setRemainingSeconds(result.remainingSeconds)
        setProgress(result.progress)
      }
    } catch (error) {
      console.error('Failed to generate code:', error)
      setCode('ERROR')
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleRefresh = async () => {
    if (account.type === 'hotp') {
      await AccountService.incrementHOTPCounter(account.id)
      generateCode()
    }
  }

  const formattedCode = OTPService.formatCode(code)

  return (
    <div className="account-card fade-in">
      <div className="account-header">
        <div className="account-info">
          <h3>{account.issuer || 'Unknown'}</h3>
          <p className="account-name">{account.name}</p>
        </div>
        <button className="btn-icon" onClick={onDelete} title="Delete account">
          🗑️
        </button>
      </div>

      <div className="account-code" onClick={handleCopy}>
        <div className="code-display">{formattedCode}</div>
        <div className="code-hint">{copied ? 'Copied!' : 'Click to copy'}</div>
      </div>

      <div className="account-footer">
        {account.type === 'totp' ? (
          <>
            <div className="timer">
              <span className={remainingSeconds <= 5 ? 'timer-urgent' : ''}>{remainingSeconds}s</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
          </>
        ) : (
          <div className="hotp-controls">
            <span className="text-secondary">Counter: {account.counter}</span>
            <button className="btn btn-secondary" onClick={handleRefresh}>
              🔄 Refresh
            </button>
          </div>
        )}
      </div>

      <div className="account-badges">
        <span className="badge">{account.type.toUpperCase()}</span>
        {account.algorithm !== 'SHA1' && <span className="badge">{account.algorithm}</span>}
        {account.digits !== 6 && <span className="badge">{account.digits} digits</span>}
      </div>
    </div>
  )
}

export default AccountCard

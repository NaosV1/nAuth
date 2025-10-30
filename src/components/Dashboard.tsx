import { useState, useEffect } from 'react'
import { AccountService } from '@services/account.service'
import type { Account } from '@types/index'
import AccountCard from './AccountCard'
import AddAccountModal from './AddAccountModal'
import Settings from './Settings'
import './Dashboard.css'

interface DashboardProps {
  onLock: () => void
}

function Dashboard({ onLock }: DashboardProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const allAccounts = await AccountService.getAll()
      setAccounts(allAccounts)
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      const results = await AccountService.search(query)
      setAccounts(results)
    } else {
      await loadAccounts()
    }
  }

  const handleAddAccount = async () => {
    await loadAccounts()
    setShowAddModal(false)
  }

  const handleDeleteAccount = async (id: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        await AccountService.delete(id)
        await loadAccounts()
      } catch (error) {
        console.error('Failed to delete account:', error)
      }
    }
  }

  const handleDataCleared = () => {
    // Redirect to login screen after data is cleared
    onLock()
  }

  const filteredAccounts = accounts

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>nAuth</h1>
          <span className="account-count">{accounts.length} accounts</span>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={() => setShowSettings(true)}>
            ⚙️ Paramètres
          </button>
          <button className="btn btn-secondary" onClick={onLock}>
            🔒 Lock
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="toolbar">
          <input
            type="text"
            className="input search-input"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Account
          </button>
        </div>

        <div className="accounts-container">
          {isLoading ? (
            <div className="empty-state">
              <p>Loading...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="empty-state">
              {searchQuery ? (
                <>
                  <p>No accounts found</p>
                  <p className="text-secondary">Try a different search term</p>
                </>
              ) : (
                <>
                  <div className="empty-icon">🔐</div>
                  <h3>No accounts yet</h3>
                  <p className="text-secondary">Add your first 2FA account to get started</p>
                  <button className="btn btn-primary mt-2" onClick={() => setShowAddModal(true)}>
                    + Add Account
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="accounts-grid">
              {filteredAccounts.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onDelete={() => handleDeleteAccount(account.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddAccountModal onClose={() => setShowAddModal(false)} onAdd={handleAddAccount} />
      )}
    </div>
  )
}

export default Dashboard

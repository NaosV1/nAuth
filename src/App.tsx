import { useEffect, useState } from 'react'
import { VaultService } from '@services/vault.service'
import AuthScreen from '@components/AuthScreen'
import Dashboard from '@components/Dashboard'

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [vaultExists, setVaultExists] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkVault()
  }, [])

  const checkVault = async () => {
    try {
      const exists = await VaultService.initialize()
      setVaultExists(exists)
    } catch (error) {
      console.error('Failed to initialize vault:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlock = () => {
    setIsUnlocked(true)
  }

  const handleLock = () => {
    VaultService.lockVault()
    setIsUnlocked(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <h2>nAuth</h2>
          <p className="text-secondary mt-1">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isUnlocked) {
    return <AuthScreen vaultExists={vaultExists} onUnlock={handleUnlock} />
  }

  return <Dashboard onLock={handleLock} />
}

export default App

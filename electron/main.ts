import { app, BrowserWindow, ipcMain, safeStorage, systemPreferences } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    titleBarStyle: 'default',
    show: false,
  })

  // Load app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App ready
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers for secure storage
ipcMain.handle('storage:set', async (_event, key: string, value: string) => {
  try {
    // Use Electron's safeStorage for encryption
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = safeStorage.encryptString(value)
      // In production, you'd want to save this to a file or database
      // For now, we'll just use a simple in-memory map
      global.secureStorage = global.secureStorage || new Map()
      global.secureStorage.set(key, buffer)
      return true
    } else {
      // Fallback: store without encryption (not recommended)
      global.secureStorage = global.secureStorage || new Map()
      global.secureStorage.set(key, value)
      return true
    }
  } catch (error) {
    console.error('Storage set error:', error)
    return false
  }
})

ipcMain.handle('storage:get', async (_event, key: string) => {
  try {
    global.secureStorage = global.secureStorage || new Map()
    const value = global.secureStorage.get(key)

    if (!value) {
      return null
    }

    if (safeStorage.isEncryptionAvailable() && Buffer.isBuffer(value)) {
      return safeStorage.decryptString(value)
    }

    return value
  } catch (error) {
    console.error('Storage get error:', error)
    return null
  }
})

ipcMain.handle('storage:remove', async (_event, key: string) => {
  try {
    global.secureStorage = global.secureStorage || new Map()
    global.secureStorage.delete(key)
    return true
  } catch (error) {
    console.error('Storage remove error:', error)
    return false
  }
})

ipcMain.handle('storage:clear', async () => {
  try {
    global.secureStorage = new Map()
    return true
  } catch (error) {
    console.error('Storage clear error:', error)
    return false
  }
})

// Biometric authentication (platform-specific)
ipcMain.handle('biometric:isAvailable', async () => {
  try {
    if (process.platform === 'darwin') {
      // macOS Touch ID - check if available
      return systemPreferences.canPromptTouchID()
    } else if (process.platform === 'win32') {
      // Windows Hello - check availability via PowerShell
      try {
        const { stdout } = await execAsync(
          'powershell -Command "Get-WindowsHelloStatus | ConvertTo-Json"',
          { timeout: 5000 }
        )
        // If command succeeds, Windows Hello is likely available
        return true
      } catch {
        // If command fails, Windows Hello might not be available
        return false
      }
    }
    return false
  } catch (error) {
    console.error('Biometric availability check error:', error)
    return false
  }
})

ipcMain.handle('biometric:authenticate', async (_event, reason: string) => {
  try {
    if (process.platform === 'darwin') {
      // macOS Touch ID authentication
      try {
        await systemPreferences.promptTouchID(reason)
        return true
      } catch (error) {
        console.error('Touch ID authentication failed:', error)
        return false
      }
    } else if (process.platform === 'win32') {
      // Windows Hello authentication via PowerShell
      try {
        // Use Windows.Security.Credentials.UI to trigger Windows Hello
        const script = `
          [Windows.Security.Credentials.UI.UserConsentVerifier, Windows.Security.Credentials.UI, ContentType = WindowsRuntime] | Out-Null
          $result = [Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync("${reason.replace(/"/g, "'")}").GetAwaiter().GetResult()
          if ($result -eq [Windows.Security.Credentials.UI.UserConsentVerificationResult]::Verified) {
            exit 0
          } else {
            exit 1
          }
        `
        await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`, {
          timeout: 60000,
        })
        return true
      } catch (error) {
        console.error('Windows Hello authentication failed:', error)
        return false
      }
    }
    return false
  } catch (error) {
    console.error('Biometric authentication error:', error)
    return false
  }
})

// Type definitions for global storage
declare global {
  var secureStorage: Map<string, string | Buffer>
}

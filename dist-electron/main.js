import { app, BrowserWindow, ipcMain, safeStorage, systemPreferences } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow = null;
const isDev = process.env.NODE_ENV === "development";
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    titleBarStyle: "default",
    show: false
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
ipcMain.handle("storage:set", async (_event, key, value) => {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = safeStorage.encryptString(value);
      global.secureStorage = global.secureStorage || /* @__PURE__ */ new Map();
      global.secureStorage.set(key, buffer);
      return true;
    } else {
      global.secureStorage = global.secureStorage || /* @__PURE__ */ new Map();
      global.secureStorage.set(key, value);
      return true;
    }
  } catch (error) {
    console.error("Storage set error:", error);
    return false;
  }
});
ipcMain.handle("storage:get", async (_event, key) => {
  try {
    global.secureStorage = global.secureStorage || /* @__PURE__ */ new Map();
    const value = global.secureStorage.get(key);
    if (!value) {
      return null;
    }
    if (safeStorage.isEncryptionAvailable() && Buffer.isBuffer(value)) {
      return safeStorage.decryptString(value);
    }
    return value;
  } catch (error) {
    console.error("Storage get error:", error);
    return null;
  }
});
ipcMain.handle("storage:remove", async (_event, key) => {
  try {
    global.secureStorage = global.secureStorage || /* @__PURE__ */ new Map();
    global.secureStorage.delete(key);
    return true;
  } catch (error) {
    console.error("Storage remove error:", error);
    return false;
  }
});
ipcMain.handle("storage:clear", async () => {
  try {
    global.secureStorage = /* @__PURE__ */ new Map();
    return true;
  } catch (error) {
    console.error("Storage clear error:", error);
    return false;
  }
});
ipcMain.handle("biometric:isAvailable", async () => {
  try {
    if (process.platform === "darwin") {
      return systemPreferences.canPromptTouchID();
    } else if (process.platform === "win32") {
      try {
        const { stdout } = await execAsync(
          'powershell -Command "Get-WindowsHelloStatus | ConvertTo-Json"',
          { timeout: 5e3 }
        );
        return true;
      } catch {
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error("Biometric availability check error:", error);
    return false;
  }
});
ipcMain.handle("biometric:authenticate", async (_event, reason) => {
  try {
    if (process.platform === "darwin") {
      try {
        await systemPreferences.promptTouchID(reason);
        return true;
      } catch (error) {
        console.error("Touch ID authentication failed:", error);
        return false;
      }
    } else if (process.platform === "win32") {
      try {
        const script = `
          [Windows.Security.Credentials.UI.UserConsentVerifier, Windows.Security.Credentials.UI, ContentType = WindowsRuntime] | Out-Null
          $result = [Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync("${reason.replace(/"/g, "'")}").GetAwaiter().GetResult()
          if ($result -eq [Windows.Security.Credentials.UI.UserConsentVerificationResult]::Verified) {
            exit 0
          } else {
            exit 1
          }
        `;
        await execAsync(`powershell -Command "${script.replace(/\n/g, " ")}"`, {
          timeout: 6e4
        });
        return true;
      } catch (error) {
        console.error("Windows Hello authentication failed:", error);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error("Biometric authentication error:", error);
    return false;
  }
});

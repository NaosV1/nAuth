"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  storage: {
    set: (key, value) => {
      return electron.ipcRenderer.invoke("storage:set", key, value);
    },
    get: (key) => {
      return electron.ipcRenderer.invoke("storage:get", key);
    },
    remove: (key) => {
      return electron.ipcRenderer.invoke("storage:remove", key);
    },
    clear: () => {
      return electron.ipcRenderer.invoke("storage:clear");
    }
  },
  biometric: {
    isAvailable: () => {
      return electron.ipcRenderer.invoke("biometric:isAvailable");
    },
    authenticate: (reason) => {
      return electron.ipcRenderer.invoke("biometric:authenticate", reason);
    }
  }
});

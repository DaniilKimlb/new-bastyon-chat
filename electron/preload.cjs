const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
  minimize: () => ipcRenderer.send("win:minimize"),
  maximize: () => ipcRenderer.send("win:maximize"),
  close: () => ipcRenderer.send("win:close"),
  onMaximized: (cb) => ipcRenderer.on("win:maximized", cb),
  onUnmaximized: (cb) => ipcRenderer.on("win:unmaximized", cb),
});

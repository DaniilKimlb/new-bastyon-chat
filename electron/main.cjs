const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  if (require("electron-squirrel-startup") === true) {
    app.quit();
  }
} catch (_) {
  // electron-squirrel-startup only needed for Windows NSIS installs
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 380,
    minHeight: 500,
    title: "Bastyon Chat",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Frameless — custom title bar drawn by the renderer
    frame: false,
    // macOS: keep native traffic lights but overlay them on our custom bar
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
    backgroundColor: "#1a1a2e",
    show: false,
  });

  // Show when ready to avoid white flash
  win.once("ready-to-show", () => win.show());

  // Forward maximize/unmaximize events to renderer
  win.on("maximize", () => win.webContents.send("win:maximized"));
  win.on("unmaximize", () => win.webContents.send("win:unmaximized"));

  // Window control IPC
  ipcMain.on("win:minimize", () => win.minimize());
  ipcMain.on("win:maximize", () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on("win:close", () => win.close());

  // Open external links in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    // Dev: load from Vite dev server (hot reload)
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    // Preview / Prod: load the built dist/index.html
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

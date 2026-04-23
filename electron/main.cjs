const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow = null;

function sendUpdaterStatus(payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('updater:status', payload);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    minWidth: 640,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: 'Provjera raspona datuma',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdaterStatus({
      type: 'checking',
      message: 'Provjera nadogradnji u tijeku...',
    });
  });
  autoUpdater.on('update-available', (info) => {
    sendUpdaterStatus({
      type: 'available',
      version: info.version,
      message: `Dostupna je nova verzija (v${info.version}). Preuzimanje u tijeku...`,
    });
  });
  autoUpdater.on('update-not-available', () => {
    sendUpdaterStatus({
      type: 'not-available',
      message: `Koristite najnoviju verziju (v${app.getVersion()}).`,
    });
  });
  autoUpdater.on('download-progress', (progress) => {
    sendUpdaterStatus({
      type: 'downloading',
      percent: Math.round(progress.percent),
      message: `Preuzimanje nadogradnje: ${Math.round(progress.percent)}%`,
    });
  });
  autoUpdater.on('update-downloaded', (info) => {
    sendUpdaterStatus({
      type: 'downloaded',
      version: info.version,
      message:
        `Nadogradnja (v${info.version}) je preuzeta. ` +
        'Kliknite "Instaliraj nadogradnju" za restart aplikacije.',
    });
  });
  autoUpdater.on('error', (err) => {
    sendUpdaterStatus({
      type: 'error',
      message: `Provjera nadogradnji nije uspjela: ${err?.message ?? 'nepoznata greška'}`,
    });
  });
}

app.whenReady().then(createWindow);
app.whenReady().then(() => {
  configureAutoUpdater();
});

ipcMain.handle('updater:check', async () => {
  if (isDev) {
    return {
      ok: false,
      message: 'Auto-update je dostupan samo u build verziji aplikacije.',
    };
  }
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err?.message ?? 'Provjera nadogradnji nije uspjela.',
    };
  }
});

ipcMain.handle('updater:install', async () => {
  if (isDev) {
    return {
      ok: false,
      message: 'Instalacija nadogradnje nije dostupna u development modu.',
    };
  }
  try {
    autoUpdater.quitAndInstall();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err?.message ?? 'Instalacija nadogradnje nije uspjela.',
    };
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

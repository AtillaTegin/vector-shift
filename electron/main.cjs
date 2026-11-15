// Electron shell: wraps the Vite build into a standalone desktop executable (Steam-ready).
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    backgroundColor: '#07090c',
    autoHideMenuBar: true,
    title: 'VECTOR: Shift',
    webPreferences: { contextIsolation: true, backgroundThrottling: false },
  });
  win.setMenuBarVisibility(false);
  if (process.env.VITE_DEV_URL) win.loadURL(process.env.VITE_DEV_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
}

app.commandLine.appendSwitch('disable-frame-rate-limit');
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

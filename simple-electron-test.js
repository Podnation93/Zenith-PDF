// Simplest possible Electron main process test
const { app, BrowserWindow } = require('electron');

console.log('App loaded! Electron version:', process.versions.electron);

app.whenReady().then(() => {
  console.log('App is ready!');

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadURL('data:text/html,<h1>Electron Works!</h1>');

  console.log('Window created');

  // Auto-close after 2 seconds
  setTimeout(() => {
    app.quit();
  }, 2000);
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  app.quit();
});

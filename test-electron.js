// Test file to check electron import
const electron = require('electron');

console.log('typeof electron:', typeof electron);
console.log('electron:', electron);
console.log('electron.app:', electron.app);

if (electron.app) {
  console.log('SUCCESS: electron.app is available!');
  electron.app.whenReady().then(() => {
    console.log('Electron app is ready');
    electron.app.quit();
  });
} else {
  console.log('ERROR: electron.app is undefined!');
  console.log('This means electron APIs are not available');
}

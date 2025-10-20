// Test accessing Electron APIs directly
console.log('=== Electron Module Test ===');

// Method 1: Direct require
try {
  const electron = require('electron');
  console.log('1. Direct require type:', typeof electron);
  console.log('1. Direct require value:', electron);
  console.log('1. Has app?:', !!electron.app);
} catch (e) {
  console.error('1. Direct require failed:', e.message);
}

// Method 2: Check if we're in electron first
console.log('\n2. Process info:');
console.log('  - process.type:', process.type);
console.log('  - process.versions.electron:', process.versions.electron);
console.log('  - process.versions.chrome:', process.versions.chrome);

// Method 3: Try to access from process
console.log('\n3. Process electron:', process.electron);

// Method 4: Try global
console.log('\n4. Global electron:', typeof global.electron);

// Method 5: Check require.resolve
try {
  const electronPath = require.resolve('electron');
  console.log('\n5. require.resolve("electron"):', electronPath);
} catch (e) {
  console.error('\n5. require.resolve failed:', e.message);
}

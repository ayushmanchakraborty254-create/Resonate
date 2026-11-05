// Preload script running in isolated context
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
});


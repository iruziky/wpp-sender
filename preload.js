const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    startSending: () => ipcRenderer.send('start-sending')
});
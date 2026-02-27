const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  query: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
  run: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
  backupDB: () => ipcRenderer.invoke('backup-db'),
  restoreDB: () => ipcRenderer.invoke('restore-db'),
  getDBInfo: () => ipcRenderer.invoke('db-info'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  uploadReceipt: (destFolder, expName, expDate) => ipcRenderer.invoke('upload-receipt', destFolder, expName, expDate),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  generateInvoice: (html) => ipcRenderer.invoke('generate-invoice-pdf', html),
  exportTaxXlsx: (data) => ipcRenderer.invoke('export-tax-xlsx', data),
  glfPollNow: () => ipcRenderer.invoke('glf-poll-now'),
  glfTestConnection: (key) => ipcRenderer.invoke('glf-test-connection', key),
  glfFetchMenu: (key) => ipcRenderer.invoke('glf-fetch-menu', key),
  glfSyncCatalog: (items) => ipcRenderer.invoke('glf-sync-catalog', items),
  glfRestartAutoPoll: () => ipcRenderer.invoke('glf-restart-autopoll'),
  glfStopAutoPoll: () => ipcRenderer.invoke('glf-stop-autopoll'),
  onGlfAutoPoll: (callback) => ipcRenderer.on('glf-auto-poll-result', (e, result) => callback(result)),
  gmapGeocode: (address) => ipcRenderer.invoke('gmap-geocode', address),
  gmapDirections: (origin, destination, waypoints) => ipcRenderer.invoke('gmap-directions', origin, destination, waypoints)
});

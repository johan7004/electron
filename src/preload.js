// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

const WINDOW_API = {
  getFilePath: async () => ipcRenderer.invoke("getFilePath"),
  storeProjectData: async (data) =>
    ipcRenderer.invoke("storeProjectData", data ? data : []),
  getStoredProjects: async () => ipcRenderer.invoke("getStoredProjects"),

  dateUpdater: async (updateType) =>
    ipcRenderer.invoke("dateUpdater", updateType),
    sendDataToReact: async(callBack) =>ipcRenderer.on('sendDataToReact', (callBack))
};

contextBridge.exposeInMainWorld("nodeFunctions", WINDOW_API);

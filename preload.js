const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {

    getComputadores: () => ipcRenderer.invoke('buscar-computadores'),
    
    salvarComputador: (dados) => ipcRenderer.invoke('salvar-computador', dados),

    excluirComputador: (id) => ipcRenderer.invoke('excluir-computador', id),

    getComputadoresPorSetor: (setor) => ipcRenderer.invoke('buscar-por-setor', setor)
});
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Busca todos os registros para preencher a tabela
    getComputadores: () => ipcRenderer.invoke('buscar-computadores'),
    
    // Serve tanto para INSERT (novo) quanto para UPDATE (editar)
    salvarComputador: (dados) => ipcRenderer.invoke('salvar-computador', dados),
    
    // Remove o registro do banco através do ID
    excluirComputador: (id) => ipcRenderer.invoke('excluir-computador', id)
});
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {

    getComputadores: () => ipcRenderer.invoke('buscar-computadores'),

    salvarComputador: (dados) => ipcRenderer.invoke('salvar-computador', dados),

    // CORRIGIDO: antes passava (id) => ..., agora passa o objeto { id, identificacao } corretamente
    excluirComputador: (dados) => ipcRenderer.invoke('excluir-computador', dados),

    // NOVO: carrega foto de um registro individualmente (lazy load)
    buscarFoto: (dados) => ipcRenderer.invoke('buscar-foto', dados),

    getComputadoresPorSetor: (setor) => ipcRenderer.invoke('buscar-por-setor', setor),

    getComputadoresPorCidade: (prefixo) => ipcRenderer.invoke('buscar-por-cidade', prefixo)

});
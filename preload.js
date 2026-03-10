const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Busca todos os registros da tabela principal
    getComputadores: () => ipcRenderer.invoke('buscar-computadores'),
    
    // Salva novo ou atualiza existente (Upsert)
    salvarComputador: (dados) => ipcRenderer.invoke('salvar-computador', dados),

    // Remove um registro pelo ID
    excluirComputador: (id) => ipcRenderer.invoke('excluir-computador', id),

    // Busca dinâmica nas VIEWS (v_setor_...)
    // O 'setor' aqui virá higienizado do HTML (ex: 'co', 'p1', 'ti_manutencao')
    getComputadoresPorSetor: (setor) => ipcRenderer.invoke('buscar-por-setor', setor)
});
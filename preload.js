const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // ── Computadores ─────────────────────────────────────────
    getComputadores:        ()     => ipcRenderer.invoke('buscar-computadores'),
    getComputadoresPorSetor:(s)    => ipcRenderer.invoke('buscar-por-setor', s),
    getComputadoresPorCidade:(p)   => ipcRenderer.invoke('buscar-por-cidade', p),
    salvarComputador:       (d)    => ipcRenderer.invoke('salvar-computador', d),
    excluirComputador:      (d)    => ipcRenderer.invoke('excluir-computador', d),

    // ── Foto principal (Storage) ──────────────────────────────
    buscarFoto:             (d)    => ipcRenderer.invoke('buscar-foto', d),
    carregarFotoStorage:    (d)    => ipcRenderer.invoke('carregar-foto-storage', d),
    deletarFotoStorage:     (d)    => ipcRenderer.invoke('deletar-foto-storage', d),

    // ── Múltiplas fotos (inventario_fotos) ───────────────────
    buscarFotosRegistro:    (d)    => ipcRenderer.invoke('buscar-fotos-registro', d),
    inserirFotoRegistro:    (d)    => ipcRenderer.invoke('inserir-foto-registro', d),
    deletarFotoRegistro:    (d)    => ipcRenderer.invoke('deletar-foto-registro', d),
    reordenarFotosRegistro: (d)    => ipcRenderer.invoke('reordenar-fotos-registro', d),
});
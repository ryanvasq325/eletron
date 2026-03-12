const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./db.js'); 

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.setMenuBarVisibility(false); 
    win.loadFile('index.html');
};


ipcMain.handle('buscar-computadores', async () => {
    try {
        const { data, error } = await db.supabase
            .from('inventario_ti')
            .select('*')
            .order('identificacao', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error("Erro ao buscar no Supabase:", err.message);
        return [];
    }
});


ipcMain.handle('buscar-por-setor', async (event, setor) => {
    try {
        
        const viewName = `v_setor_${setor}`;
        
        const { data, error } = await db.supabase
            .from(viewName) 
            .select('*')
            .order('identificacao', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error(`Erro ao buscar na view v_setor_${setor}:`, err.message);
        return [];
    }
});


ipcMain.handle('salvar-computador', async (event, dados) => {
    try {
        const { data, error } = await db.supabase
            .from('inventario_ti')
            .upsert({ 
                id: dados.id || undefined, 
                identificacao: dados.identificacao,
                usuario: dados.usuario,
                monitor_info: dados.monitor_info,
                ip_maquina: dados.ip_maquina,
                situacao: dados.situacao,
                observacoes: dados.observacoes
            });

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error("Erro ao salvar:", err.message);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('excluir-computador', async (event, id) => {
    try {
        const { error } = await db.supabase
            .from('inventario_ti')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error("Erro ao excluir no Supabase:", err.message);
        return { success: false, error: err.message };
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') app.quit(); 
});
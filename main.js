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

// ============================================================
// HELPER: resolve qual tabela e prefixo de view usar
// ============================================================
function resolverTabela(setor) {
    if (setor && setor.startsWith('1cia')) {
        return { tabela: 'inventario_ti_1cia', prefixoView: 'v_1cia_' };
    }
    if (setor && setor.startsWith('2cia')) {
        return { tabela: 'inventario_ti_2cia', prefixoView: 'v_2cia_' };
    }
    return { tabela: 'inventario_ti', prefixoView: 'v_setor_' };
}

function resolverTabelaPorIdentificacao(identificacao) {
    if (identificacao && identificacao.toUpperCase().startsWith('1CIA')) {
        return 'inventario_ti_1cia';
    }
    if (identificacao && identificacao.toUpperCase().startsWith('2CIA')) {
        return 'inventario_ti_2cia';
    }
    return 'inventario_ti';
}

// ============================================================
// BUSCAR TODOS — retorna registros das 3 tabelas juntos
// ============================================================
ipcMain.handle('buscar-computadores', async () => {
    try {
        const [r1, r2, r3] = await Promise.all([
            db.supabase.from('inventario_ti').select('*').order('identificacao', { ascending: true }),
            db.supabase.from('inventario_ti_1cia').select('*').order('identificacao', { ascending: true }),
            db.supabase.from('inventario_ti_2cia').select('*').order('identificacao', { ascending: true }),
        ]);

        if (r1.error) throw r1.error;
        if (r2.error) throw r2.error;
        if (r3.error) throw r3.error;

        return [...(r1.data || []), ...(r2.data || []), ...(r3.data || [])];
    } catch (err) {
        console.error("Erro ao buscar computadores:", err.message);
        return [];
    }
});

// ============================================================
// BUSCAR POR SETOR — usa views do banco
// PCS:   'p1', 'p2', 'nti', 'cmd', 'ti_manutencao'
// 1ªCIA: '1cia-p1', '1cia-nti', '1cia_ti_manutencao'
// 2ªCIA: '2cia-p2', '2cia-nti', '2cia_ti_manutencao'
// ============================================================
ipcMain.handle('buscar-por-setor', async (event, setor) => {
    try {
        const setorLower = setor.toLowerCase().replace(/[\s]/g, '');
        const { prefixoView } = resolverTabela(setorLower);

        const sufixo = setorLower
            .replace(/^1cia[-_]?/, '')
            .replace(/^2cia[-_]?/, '');

        let viewName;
        if (sufixo === 'ti_manutencao') {
            viewName = `${prefixoView}ti_manutencao`;
        } else if (prefixoView === 'v_setor_') {
            viewName = `${prefixoView}${sufixo}`;
        } else {
            viewName = `${prefixoView}setor_${sufixo}`;
        }

        const { data, error } = await db.supabase
            .from(viewName)
            .select('*')
            .order('identificacao', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error(`Erro ao buscar na view do setor '${setor}':`, err.message);
        return [];
    }
});

// ============================================================
// BUSCAR POR CIDADE — ILIKE direto nas 3 tabelas (sem views)
// Prefixos: 'PB' = Pimenta Bueno | 'ESP' = Espigão | 'PAR' = Parecis
// ============================================================
ipcMain.handle('buscar-por-cidade', async (event, prefixo) => {
    try {
        const [r1, r2, r3] = await Promise.all([
            db.supabase.from('inventario_ti').select('*').ilike('identificacao', `${prefixo}%`).order('identificacao', { ascending: true }),
            db.supabase.from('inventario_ti_1cia').select('*').ilike('identificacao', `${prefixo}%`).order('identificacao', { ascending: true }),
            db.supabase.from('inventario_ti_2cia').select('*').ilike('identificacao', `${prefixo}%`).order('identificacao', { ascending: true }),
        ]);

        if (r1.error) throw r1.error;
        if (r2.error) throw r2.error;
        if (r3.error) throw r3.error;

        return [...(r1.data || []), ...(r2.data || []), ...(r3.data || [])];
    } catch (err) {
        console.error(`Erro ao buscar cidade '${prefixo}':`, err.message);
        return [];
    }
});

// ============================================================
// SALVAR — detecta a tabela certa pelo prefixo da identificação
// ============================================================
ipcMain.handle('salvar-computador', async (event, dados) => {
    try {
        const tabela = resolverTabelaPorIdentificacao(dados.identificacao);

        const { error } = await db.supabase
            .from(tabela)
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

// ============================================================
// EXCLUIR — tenta nas 3 tabelas até achar o id
// ============================================================
ipcMain.handle('excluir-computador', async (event, id) => {
    try {
        const tabelas = ['inventario_ti', 'inventario_ti_1cia', 'inventario_ti_2cia'];

        for (const tabela of tabelas) {
            const { error } = await db.supabase
                .from(tabela)
                .delete()
                .eq('id', id);

            if (!error) return { success: true };
        }

        throw new Error('Registro não encontrado em nenhuma tabela.');
    } catch (err) {
        console.error("Erro ao excluir:", err.message);
        return { success: false, error: err.message };
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
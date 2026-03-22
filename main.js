const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('./db.js');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// ============================================================
// UPDATER
// ============================================================
function configurarUpdater() {
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'info';
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
        log.info('Verificando atualizações...');
    });

    autoUpdater.on('update-available', (info) => {
        log.info('Atualização disponível:', info.version);
        dialog.showMessageBox({
            type: 'info',
            title: 'Atualização disponível',
            message: 'Uma nova versão do Inventário TI está sendo baixada...',
            buttons: ['OK']
        });
    });

    autoUpdater.on('update-not-available', (info) => {
        log.info('Nenhuma atualização disponível. Versão atual:', info.version);
    });

    autoUpdater.on('update-downloaded', () => {
        log.info('Atualização baixada!');
        dialog.showMessageBox({
            type: 'question',
            title: 'Atualização pronta',
            message: 'Uma nova versão foi baixada. Deseja reiniciar agora para instalar?',
            buttons: ['Reiniciar agora', 'Mais tarde']
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });

    autoUpdater.on('error', (err) => {
        log.error('Erro no updater:', err.message);
    });

    autoUpdater.checkForUpdatesAndNotify();
}

// ============================================================
// JANELA PRINCIPAL
// ============================================================
const createWindow = () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
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
// HELPER: resolve qual tabela pelo prefixo da identificação
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
// BUSCAR POR CIDADE — ILIKE direto nas 3 tabelas
// Prefixos suportados:
//   PB   → Pimenta Bueno
//   ESP  → Espigão
//   AND  → Andreazza
//   SF   → São Felipe
//   PRIM → Primavera
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
// SALVAR — usa identificação para saber a tabela exata
// ============================================================
ipcMain.handle('salvar-computador', async (event, dados) => {
    try {
        const tabela = resolverTabelaPorIdentificacao(dados.identificacao);

        const { error } = await db.supabase
            .from(tabela)
            .upsert({
                id: dados.id ? Number(dados.id) : undefined,
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
// EXCLUIR — usa identificação para ir direto na tabela certa
// ============================================================
ipcMain.handle('excluir-computador', async (event, { id, identificacao }) => {
    try {
        const tabela = resolverTabelaPorIdentificacao(identificacao);

        const { data: existe } = await db.supabase
            .from(tabela)
            .select('id')
            .eq('id', id)
            .maybeSingle();

        if (!existe) throw new Error(`Registro não encontrado na tabela ${tabela}.`);

        const { error } = await db.supabase
            .from(tabela)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error("Erro ao excluir:", err.message);
        return { success: false, error: err.message };
    }
});

// ============================================================
// APP READY
// ============================================================
app.whenReady().then(() => {
    createWindow();

    // Updater só roda quando o app está empacotado (build de produção).
    // Em modo dev (npm start / electron .) app.isPackaged === false,
    // o que causaria o aviso "Skip checkForUpdates because application
    // is not packed and dev update config is not forced".
    if (app.isPackaged) {
        configurarUpdater();
    } else {
        log.info('Modo desenvolvimento — auto-updater desativado.');
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
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
// MELHORIA: adicionado title com versão e icon
// ============================================================
const createWindow = () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: `Inventário TI · 4º BPM v${app.getVersion()}`,
        // Descomente e ajuste o caminho quando tiver o ícone:
        // icon: path.join(__dirname, 'assets', 'icon.png'),
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
// HELPER: normaliza a string do setor antes de qualquer comparação
// MELHORIA: normalização centralizada — evita bug de string não normalizada
// ============================================================
function normalizarSetor(setor) {
    return (setor || '').toLowerCase().replace(/[\s\-]/g, '');
}

function resolverTabela(setor) {
    const s = normalizarSetor(setor);
    if (s.startsWith('1cia')) {
        return { tabela: 'inventario_ti_1cia', prefixoView: 'v_1cia_' };
    }
    if (s.startsWith('2cia')) {
        return { tabela: 'inventario_ti_2cia', prefixoView: 'v_2cia_' };
    }
    return { tabela: 'inventario_ti', prefixoView: 'v_setor_' };
}

function resolverTabelaPorIdentificacao(identificacao) {
    const up = (identificacao || '').toUpperCase();
    if (up.startsWith('1CIA')) return 'inventario_ti_1cia';
    if (up.startsWith('2CIA')) return 'inventario_ti_2cia';
    return 'inventario_ti';
}

// ============================================================
// BUSCAR TODOS
// MELHORIA: não busca foto_base64 na listagem geral (lazy load)
// Isso reduz drasticamente o tamanho da resposta
// ============================================================
ipcMain.handle('buscar-computadores', async () => {
    const campos = 'id, identificacao, usuario, monitor_info, ip_maquina, situacao, observacoes';
    try {
        const [r1, r2, r3] = await Promise.all([
            db.supabase.from('inventario_ti').select(campos).order('identificacao', { ascending: true }),
            db.supabase.from('inventario_ti_1cia').select(campos).order('identificacao', { ascending: true }),
            db.supabase.from('inventario_ti_2cia').select(campos).order('identificacao', { ascending: true }),
        ]);

        if (r1.error) throw r1.error;
        if (r2.error) throw r2.error;
        if (r3.error) throw r3.error;

        return [...(r1.data || []), ...(r2.data || []), ...(r3.data || [])];
    } catch (err) {
        log.error('Erro ao buscar computadores:', err.message);
        return [];
    }
});

// ============================================================
// BUSCAR FOTO DE UM REGISTRO (lazy load)
// MELHORIA: endpoint dedicado para buscar só a foto quando necessário
// ============================================================
ipcMain.handle('buscar-foto', async (event, { id, identificacao }) => {
    try {
        const tabela = resolverTabelaPorIdentificacao(identificacao);
        const { data, error } = await db.supabase
            .from(tabela)
            .select('foto_base64')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        return { success: true, foto_base64: data?.foto_base64 || null };
    } catch (err) {
        log.error('Erro ao buscar foto:', err.message);
        return { success: false, foto_base64: null };
    }
});

// ============================================================
// BUSCAR POR SETOR — usa views do banco
// ============================================================
ipcMain.handle('buscar-por-setor', async (event, setor) => {
    try {
        const setorNorm = normalizarSetor(setor);
        const { prefixoView } = resolverTabela(setorNorm);

        const sufixo = setorNorm
            .replace(/^1cia/, '')
            .replace(/^2cia/, '');

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
            .select('id, identificacao, usuario, monitor_info, ip_maquina, situacao, observacoes')
            .order('identificacao', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        log.error(`Erro ao buscar na view do setor '${setor}':`, err.message);
        return [];
    }
});

// ============================================================
// BUSCAR POR CIDADE
// ============================================================
ipcMain.handle('buscar-por-cidade', async (event, prefixo) => {
    const campos = 'id, identificacao, usuario, monitor_info, ip_maquina, situacao, observacoes';
    try {
        const [r1, r2, r3] = await Promise.all([
            db.supabase.from('inventario_ti').select(campos).ilike('identificacao', `${prefixo}%`).order('identificacao', { ascending: true }),
            db.supabase.from('inventario_ti_1cia').select(campos).ilike('identificacao', `${prefixo}%`).order('identificacao', { ascending: true }),
            db.supabase.from('inventario_ti_2cia').select(campos).ilike('identificacao', `${prefixo}%`).order('identificacao', { ascending: true }),
        ]);

        if (r1.error) throw r1.error;
        if (r2.error) throw r2.error;
        if (r3.error) throw r3.error;

        return [...(r1.data || []), ...(r2.data || []), ...(r3.data || [])];
    } catch (err) {
        log.error(`Erro ao buscar cidade '${prefixo}':`, err.message);
        return [];
    }
});

// ============================================================
// SALVAR
// MELHORIA: onConflict explícito no upsert para evitar duplicatas
// ============================================================
ipcMain.handle('salvar-computador', async (event, dados) => {
    try {
        const tabela = resolverTabelaPorIdentificacao(dados.identificacao);

        const payload = {
            identificacao: dados.identificacao,
            usuario: dados.usuario,
            monitor_info: dados.monitor_info,
            ip_maquina: dados.ip_maquina,
            situacao: dados.situacao,
            observacoes: dados.observacoes,
            foto_base64: dados.foto_base64 || null
        };

        // Só inclui id se for edição (evita conflito em inserções)
        if (dados.id) {
            payload.id = Number(dados.id);
        }

        const { error } = await db.supabase
            .from(tabela)
            .upsert(payload, { onConflict: 'id' });

        if (error) throw error;
        return { success: true };
    } catch (err) {
        log.error('Erro ao salvar:', err.message);
        return { success: false, error: err.message };
    }
});

// ============================================================
// EXCLUIR
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
        log.error('Erro ao excluir:', err.message);
        return { success: false, error: err.message };
    }
});

// ============================================================
// APP READY
// ============================================================
app.whenReady().then(() => {
    createWindow();

    if (app.isPackaged) {
        configurarUpdater();
    } else {
        log.info('Modo desenvolvimento — auto-updater desativado.');
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
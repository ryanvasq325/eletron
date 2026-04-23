const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('./db.js');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const crypto = require('crypto');

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
        title: `Inventário TI · 4º BPM v${app.getVersion()}`,
        icon: path.join(__dirname, 'build', 'icon.ico'),
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
// HELPERS
// ============================================================
function normalizarSetor(setor) {
    return (setor || '').toLowerCase().replace(/[\s\-]/g, '');
}

function resolverTabela(setor) {
    const s = normalizarSetor(setor);
    if (s.startsWith('1cia')) return { tabela: 'inventario_ti_1cia', prefixoView: 'v_1cia_' };
    if (s.startsWith('2cia')) return { tabela: 'inventario_ti_2cia', prefixoView: 'v_2cia_' };
    return { tabela: 'inventario_ti', prefixoView: 'v_setor_' };
}

function resolverTabelaPorIdentificacao(identificacao) {
    const up = (identificacao || '').toUpperCase();
    if (up.startsWith('1CIA')) return 'inventario_ti_1cia';
    if (up.startsWith('2CIA')) return 'inventario_ti_2cia';
    return 'inventario_ti';
}

// Retorna a chave curta usada na tabela inventario_fotos
function resolverChaveTabela(identificacao) {
    const up = (identificacao || '').toUpperCase();
    if (up.startsWith('1CIA')) return '1cia';
    if (up.startsWith('2CIA')) return '2cia';
    return 'pcs';
}

// ============================================================
// BUSCAR TODOS — sem foto (lazy load)
// ============================================================
ipcMain.handle('buscar-computadores', async () => {
    const campos = 'id, identificacao, usuario, monitor_info, ip_maquina, situacao, observacoes, foto_url';
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
// BUSCAR FOTO — retorna foto_url principal
// ============================================================
ipcMain.handle('buscar-foto', async (event, { id, identificacao }) => {
    try {
        const tabela = resolverTabelaPorIdentificacao(identificacao);
        const { data, error } = await db.supabase
            .from(tabela)
            .select('foto_url')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        return { success: true, foto_url: data?.foto_url || null };
    } catch (err) {
        log.error('Erro ao buscar foto:', err.message);
        return { success: false, foto_url: null };
    }
});

// ============================================================
// BUSCAR POR SETOR
// ============================================================
ipcMain.handle('buscar-por-setor', async (event, setor) => {
    try {
        const setorNorm = normalizarSetor(setor);
        const { tabela } = resolverTabela(setorNorm);
        const campos = 'id, identificacao, usuario, monitor_info, ip_maquina, situacao, observacoes, foto_url';

        // Monta o padrão ILIKE com base no setor normalizado
        let padrao = null;

        const prefixos = [
            { test: '1ciap1',      like: '1CIA-P1%' },
            { test: '1ciap2',      like: '1CIA-P2%' },
            { test: '1ciap3',      like: '1CIA-P3%' },
            { test: '1ciap4',      like: '1CIA-P4%' },
            { test: '1ciap5',      like: '1CIA-P5%' },
            { test: '1ciap6',      like: '1CIA-P6%' },
            { test: '1cianti',     like: '1CIA-NTI%' },
            { test: '1ciasubcmd',  like: '1CIA-SUB%' },
            { test: '1ciacmd',     like: '1CIA-CMD%' },
            { test: '2ciap1',      like: '2CIA-P1%' },
            { test: '2ciap2',      like: '2CIA-P2%' },
            { test: '2ciap3',      like: '2CIA-P3%' },
            { test: '2ciap4',      like: '2CIA-P4%' },
            { test: '2ciap5',      like: '2CIA-P5%' },
            { test: '2ciap6',      like: '2CIA-P6%' },
            { test: '2cianti',     like: '2CIA-NTI%' },
            { test: '2ciasubcmd',  like: '2CIA-SUB%' },
            { test: '2ciacmd',     like: '2CIA-CMD%' },
            { test: 'p1',          like: 'P1%' },
            { test: 'p2',          like: 'P2%' },
            { test: 'p3',          like: 'P3%' },
            { test: 'p4',          like: 'P4%' },
            { test: 'p5',          like: 'P5%' },
            { test: 'p6',          like: 'P6%' },
            { test: 'subcmd',      like: 'SUB%' },
            { test: 'cmd',         like: 'CMD%' },
            { test: 'nti',         like: 'NTI%' },
        ];

        // Verifica da mais específica para a mais genérica
        for (const { test, like } of prefixos) {
            if (setorNorm === test || setorNorm.endsWith(test)) {
                padrao = like;
                break;
            }
        }

        let query = db.supabase
            .from(tabela)
            .select(campos)
            .order('identificacao', { ascending: true });

        if (padrao) {
            query = query.ilike('identificacao', padrao);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        log.error(`Erro ao buscar setor '${setor}':`, err.message);
        return [];
    }
});
// ============================================================
// BUSCAR POR CIDADE
// ============================================================
ipcMain.handle('buscar-por-cidade', async (event, prefixo) => {
    const campos = 'id, identificacao, usuario, monitor_info, ip_maquina, situacao, observacoes, foto_url';
    try {
        const padraoIdentificacao = `${prefixo.toUpperCase()}%`;

        const [r1, r2, r3] = await Promise.all([
            db.supabase.from('inventario_ti').select(campos).ilike('identificacao', padraoIdentificacao).order('identificacao', { ascending: true }),
            db.supabase.from('inventario_ti_1cia').select(campos).ilike('identificacao', padraoIdentificacao).order('identificacao', { ascending: true }),
            db.supabase.from('inventario_ti_2cia').select(campos).ilike('identificacao', padraoIdentificacao).order('identificacao', { ascending: true }),
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
// SALVAR — upsert com foto_url (capa)
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
            foto_url: dados.foto_url || null
        };

        // Deletar foto antiga do Storage se foi trocada
        if (dados.id && dados.foto_url_antiga && dados.foto_url_antiga !== dados.foto_url) {
            try {
                const nomeArquivoAntigo = dados.foto_url_antiga.split('/').pop();
                await db.supabase.storage
                    .from('ti-inventario-fotos')
                    .remove([nomeArquivoAntigo]);
            } catch (err) {
                log.warn('Erro ao deletar foto antiga:', err.message);
            }
        }

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
// EXCLUIR — deleta fotos extras + foto capa do Storage
// ============================================================
ipcMain.handle('excluir-computador', async (event, { id, identificacao }) => {
    try {
        const tabela = resolverTabelaPorIdentificacao(identificacao);
        const chaveTabela = resolverChaveTabela(identificacao);

        const { data: existe } = await db.supabase
            .from(tabela)
            .select('id, foto_url')
            .eq('id', id)
            .maybeSingle();

        if (!existe) throw new Error(`Registro não encontrado na tabela ${tabela}.`);

        // Deletar fotos extras da tabela inventario_fotos
        try {
            const { data: fotosExtras } = await db.supabase
                .from('inventario_fotos')
                .select('id, foto_url')
                .eq('tabela', chaveTabela)
                .eq('registro_id', id);

            if (fotosExtras && fotosExtras.length > 0) {
                const nomes = fotosExtras.map(f => f.foto_url.split('/').pop()).filter(Boolean);
                if (nomes.length > 0) {
                    await db.supabase.storage.from('ti-inventario-fotos').remove(nomes);
                }
                await db.supabase
                    .from('inventario_fotos')
                    .delete()
                    .eq('tabela', chaveTabela)
                    .eq('registro_id', id);
            }
        } catch (err) {
            log.warn('Erro ao deletar fotos extras:', err.message);
        }

        // Deletar foto capa do Storage
        if (existe.foto_url) {
            try {
                const caminhoArquivo = existe.foto_url.split('/').pop();
                await db.supabase.storage.from('ti-inventario-fotos').remove([caminhoArquivo]);
            } catch (err) {
                log.warn('Erro ao deletar foto capa do Storage:', err.message);
            }
        }

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
// UPLOAD FOTO PARA STORAGE
// ============================================================
ipcMain.handle('carregar-foto-storage', async (event, { base64, nomeOriginal, identificacao }) => {
    try {
        if (!base64 || base64.length < 100) {
            return { success: false, error: 'Arquivo inválido' };
        }

        let tipoImagem = 'image/jpeg';
        if (base64.includes('image/png'))  tipoImagem = 'image/png';
        else if (base64.includes('image/gif'))  tipoImagem = 'image/gif';
        else if (base64.includes('image/webp')) tipoImagem = 'image/webp';

        const base64Data = base64.split(',')[1] || base64;
        const buffer = Buffer.from(base64Data, 'base64');

        const timestamp = Date.now();
        const uuid = crypto.randomBytes(6).toString('hex');
        const extensao = tipoImagem.split('/')[1];

        const idSanitizado = (identificacao || 'equip')
            .replace(/[^a-zA-Z0-9\-_]/g, '_')
            .substring(0, 30);

        const nomeArquivo = `${timestamp}-${idSanitizado}-${uuid}.${extensao}`;

        const { data, error } = await db.supabase.storage
            .from('ti-inventario-fotos')
            .upload(nomeArquivo, buffer, {
                contentType: tipoImagem,
                upsert: false
            });

        if (error) throw error;

        const { data: urlData } = db.supabase.storage
            .from('ti-inventario-fotos')
            .getPublicUrl(nomeArquivo);

        return {
            success: true,
            url: urlData.publicUrl,
            caminho: nomeArquivo
        };
    } catch (err) {
        log.error('Erro ao carregar foto para Storage:', err.message);
        return { success: false, error: err.message };
    }
});

// ============================================================
// DELETAR FOTO DO STORAGE
// ============================================================
ipcMain.handle('deletar-foto-storage', async (event, { caminho }) => {
    try {
        if (!caminho) return { success: true };

        const nomeArquivo = caminho.split('/').pop();
        const { error } = await db.supabase.storage
            .from('ti-inventario-fotos')
            .remove([nomeArquivo]);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        log.warn('Erro ao deletar foto do Storage:', err.message);
        return { success: true };
    }
});

// ============================================================
// MÚLTIPLAS FOTOS — buscar fotos extras de um registro
// ============================================================
ipcMain.handle('buscar-fotos-registro', async (event, { tabela, registro_id }) => {
    try {
        const { data, error } = await db.supabase
            .from('inventario_fotos')
            .select('id, foto_url, ordem')
            .eq('tabela', tabela)
            .eq('registro_id', registro_id)
            .order('ordem', { ascending: true });

        if (error) throw error;
        return { fotos: data || [] };
    } catch (err) {
        log.error('Erro ao buscar fotos extras:', err.message);
        return { fotos: [] };
    }
});

// ============================================================
// MÚLTIPLAS FOTOS — inserir foto extra
// ============================================================
ipcMain.handle('inserir-foto-registro', async (event, { tabela, registro_id, foto_url, ordem }) => {
    try {
        const { error } = await db.supabase
            .from('inventario_fotos')
            .insert({ tabela, registro_id, foto_url, ordem: ordem || 0 });

        if (error) throw error;
        return { success: true };
    } catch (err) {
        log.error('Erro ao inserir foto extra:', err.message);
        return { success: false, error: err.message };
    }
});

// ============================================================
// MÚLTIPLAS FOTOS — deletar foto extra (Storage + tabela)
// ============================================================
ipcMain.handle('deletar-foto-registro', async (event, { foto_id, foto_url }) => {
    try {
        // Remove do Storage
        if (foto_url) {
            const nomeArquivo = foto_url.split('/').pop();
            if (nomeArquivo) {
                await db.supabase.storage
                    .from('ti-inventario-fotos')
                    .remove([nomeArquivo]);
            }
        }

        // Remove da tabela inventario_fotos
        const { error } = await db.supabase
            .from('inventario_fotos')
            .delete()
            .eq('id', foto_id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        log.error('Erro ao deletar foto extra:', err.message);
        return { success: false, error: err.message };
    }
});

// ============================================================
// MÚLTIPLAS FOTOS — reordenar fotos de um registro
// ============================================================
ipcMain.handle('reordenar-fotos-registro', async (event, { fotos }) => {
    // fotos: [{ id, ordem }]
    try {
        const updates = fotos.map(({ id, ordem }) =>
            db.supabase
                .from('inventario_fotos')
                .update({ ordem })
                .eq('id', id)
        );
        await Promise.all(updates);
        return { success: true };
    } catch (err) {
        log.error('Erro ao reordenar fotos:', err.message);
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
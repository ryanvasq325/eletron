const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Pool } = require('pg');

// Configuração do Banco de Dados
const pool = new Pool({
    user: 'senac',
    host: 'localhost', 
    database: 'calango',
    password: 'senac',
    port: 5432,
});

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
    win.loadFile('index.html');
};

// 1. BUSCAR DADOS (Utilizado pelo 'renderizarTabela')
ipcMain.handle('buscar-computadores', async () => {
    try {
        const res = await pool.query('SELECT * FROM inventario_ti ORDER BY identificacao ASC');
        return res.rows;
    } catch (err) {
        console.error("Erro ao buscar no Postgres:", err);
        return [];
    }
});

// 2. SALVAR OU ATUALIZAR (Lógica de Upsert baseada no ID)
ipcMain.handle('salvar-computador', async (event, dados) => {
    try {
        if (dados.id) {
            // Se tem ID, estamos EDITANDO (UPDATE)
            const query = `
                UPDATE inventario_ti 
                SET identificacao=$1, usuario=$2, monitor_info=$3, ip_maquina=$4, situacao=$5, observacoes=$6
                WHERE id=$7`;
            const values = [dados.identificacao, dados.usuario, dados.monitor_info, dados.ip_maquina, dados.situacao, dados.observacoes, dados.id];
            await pool.query(query, values);
        } else {
            // Se não tem ID, estamos CADASTRANDO NOVO (INSERT)
            const query = `
                INSERT INTO inventario_ti (identificacao, usuario, monitor_info, ip_maquina, situacao, observacoes)
                VALUES ($1, $2, $3, $4, $5, $6)`;
            const values = [dados.identificacao, dados.usuario, dados.monitor_info, dados.ip_maquina, dados.situacao, dados.observacoes];
            await pool.query(query, values);
        }
        return { success: true };
    } catch (err) {
        console.error("Erro ao salvar/atualizar:", err);
        return { success: false, error: err.message };
    }
});

// 3. EXCLUIR REGISTRO
ipcMain.handle('excluir-computador', async (event, id) => {
    try {
        await pool.query('DELETE FROM inventario_ti WHERE id = $1', [id]);
        return { success: true };
    } catch (err) {
        console.error("Erro ao excluir:", err);
        return { success: false, error: err.message };
    }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

let listaAtualComputadores = [];
let setorAtivoParaDica = 'NTI';

const configuracaoSetores = {
    'P-1': { id: 'P1-' }, 'P-2': { id: 'P2-' },
    'P-3': { id: 'P3-' }, 'P-4': { id: 'P4-' },
    'P-5': { id: 'P5-' }, 'P-6': { id: 'P6-' },
    'NTI': { id: 'NTI-' }, 'CIA': { id: 'CIA-' },
    'CMD': { id: 'CMD-' }, 'SUB CMD': { id: 'SUB-' },
    '1CIA-P1': { id: '1CIA-P1-' }, '1CIA-P2': { id: '1CIA-P2-' },
    '1CIA-P3': { id: '1CIA-P3-' }, '1CIA-P4': { id: '1CIA-P4-' },
    '1CIA-P5': { id: '1CIA-P5-' }, '1CIA-P6': { id: '1CIA-P6-' },
    '1CIA-NTI': { id: '1CIA-NTI-' },
    '2CIA-P1': { id: '2CIA-P1-' }, '2CIA-P2': { id: '2CIA-P2-' },
    '2CIA-P3': { id: '2CIA-P3-' }, '2CIA-P4': { id: '2CIA-P4-' },
    '2CIA-P5': { id: '2CIA-P5-' }, '2CIA-P6': { id: '2CIA-P6-' },
    '2CIA-NTI': { id: '2CIA-NTI-' },
    'PIMENTA BUENO': { id: 'PB-' }, 'PB':   { id: 'PB-' },
    'ESPIGÃO':       { id: 'ESP-' }, 'ESP':  { id: 'ESP-' },
    'ANDREAZZA':     { id: 'AND-' }, 'AND':  { id: 'AND-' },
    'SÃO FELIPE':    { id: 'SF-'  }, 'SF':   { id: 'SF-'  },
    'PRIMAVERA':     { id: 'PRIM-'}, 'PRIM': { id: 'PRIM-'}
};

const CORES_CIA  = { 'PCS':'#1e3a8a','1ª CIA':'#4c1d95','2ª CIA':'#0e7490','3ª CIA':'#065f46','4ª CIA':'#9a3412','5ª CIA':'#831843' };
const ORDEM_CIAS = ['PCS','1ª CIA','2ª CIA','3ª CIA','4ª CIA','5ª CIA'];

// ── SANITIZAÇÃO XSS ──────────────────────────────
function esc(str) {
    if (str === null || str === undefined || str === '' || str === 'null') return '—';
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── RELÓGIO ──────────────────────────────────────
function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    const dateEl  = document.getElementById('date-display');
    if (clockEl) clockEl.innerText = now.toLocaleTimeString('pt-BR');
    if (dateEl)  dateEl.innerText  = now.toLocaleDateString('pt-BR',{ weekday:'short',day:'2-digit',month:'short',year:'numeric' });
}
const clockInterval = setInterval(updateClock, 1000);
window.addEventListener('beforeunload', () => clearInterval(clockInterval));
updateClock();

window.onload = async () => {
    await renderizarTabela();
    configurarMonitorDePrefixo();
    configurarBusca();
};

// ── FOTO: UPLOAD E PREVIEW ───────────────────────
function carregarFoto(input) {
    const file = input.files[0];
    if (!file) return;
    processarArquivoFoto(file);
}

function handleFotoDrop(event) {
    event.preventDefault();
    document.getElementById('foto-upload-area').style.borderColor = '#93c5fd';
    const file = event.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) { toast('Arquivo inválido. Selecione uma imagem.', 'erro'); return; }
    processarArquivoFoto(file);
}

function processarArquivoFoto(file) {
    if (file.size > 5 * 1024 * 1024) { toast('Imagem muito grande. Máximo permitido: 5 MB.', 'erro'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        document.getElementById('foto_base64').value  = base64;
        document.getElementById('foto-preview-img').src = base64;
        document.getElementById('foto-preview-container').style.display = 'block';
        document.getElementById('foto-upload-area').style.display = 'none';
        document.getElementById('foto-info-nome').innerText = '📎 ' + file.name + ' · ' + (file.size/1024).toFixed(0) + ' KB';
        document.getElementById('foto-filename').value = file.name;
    };
    reader.readAsDataURL(file);
}

function removerFoto() {
    document.getElementById('foto_base64').value = '';
    document.getElementById('foto_url_atual').value = '';
    document.getElementById('foto-preview-img').src = '';
    document.getElementById('foto-preview-container').style.display = 'none';
    document.getElementById('foto-upload-area').style.display = 'flex';
    document.getElementById('foto-input').value = '';
    document.getElementById('foto-info-nome').innerText = '';
}

// CORRIGIDO: carrega foto_url (Storage) OU base64 legado
function carregarFotoExistente(url, base64) {
    const src = url || base64;
    if (!src || src === 'null' || src === '') { removerFoto(); return; }
    if (url) document.getElementById('foto_url_atual').value = url;
    document.getElementById('foto-preview-img').src = src;
    document.getElementById('foto-preview-container').style.display = 'block';
    document.getElementById('foto-upload-area').style.display = 'none';
    document.getElementById('foto-info-nome').innerText = url ? '📎 Foto salva no Storage' : '📎 Imagem salva no registro';
}

// ── LIGHTBOX ─────────────────────────────────────
function abrirLightbox(src) {
    if (!src) return;
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox-overlay').classList.add('ativo');
}
function abrirLightboxDe(el) {
    const src = el.dataset.src;
    if (src) abrirLightbox(src);
}
function fecharLightbox() {
    document.getElementById('lightbox-overlay').classList.remove('ativo');
    document.getElementById('lightbox-img').src = '';
}
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { fecharLightbox(); fecharPreview(); }
});

// ── SETOR / FILTROS ──────────────────────────────
function marcarAtivo(elemento) {
    document.querySelectorAll('.btn-sector, .btn-action').forEach(b => b.classList.remove('active'));
    if (elemento) {
        elemento.classList.add('active');
        const btnNovo = document.getElementById('btnNovoRegistro');
        const texto = elemento.innerText.toUpperCase();
        if (btnNovo) btnNovo.style.display = (texto.includes("VER TODOS") || texto.includes("MANUTENÇÃO")) ? 'none' : 'inline-block';
    }
}

async function atualizarVisualizacao() {
    const btnAtivo = document.querySelector('.btn-sector.active, .btn-action.active');
    if (btnAtivo) {
        const texto = btnAtivo.innerText.toUpperCase();
        if (texto.includes("VER TODOS") || texto.includes("⊞")) await renderizarTabela(btnAtivo);
        else if (texto.includes("MANUTENÇÃO") || texto.includes("🛠")) await filtrarManutencao(btnAtivo);
        else await filtrarPorSetor(setorAtivoParaDica, btnAtivo);
    } else await renderizarTabela();
}

async function renderizarTabela(btn) {
    const btnTodos = btn || document.querySelector('.btn-action.todos');
    if (btnTodos) marcarAtivo(btnTodos);
    document.getElementById('titulo-sessao').innerText = "Visão Geral";
    try {
        const response = await window.api.getComputadores();
        listaAtualComputadores = response || [];
        desenharLinhas(listaAtualComputadores);
    } catch (error) { console.error("Erro:", error); }
}

async function filtrarPorSetor(prefixo, btn) {
    marcarAtivo(btn);
    setorAtivoParaDica = prefixo;
    document.getElementById('titulo-sessao').innerText = `Setor: ${prefixo}`;
    const setorParaView = prefixo.replace(/[\.\s-]/g,'').toLowerCase();
    try {
        const filtrados = await window.api.getComputadoresPorSetor(setorParaView);
        listaAtualComputadores = filtrados || [];
        desenharLinhas(listaAtualComputadores);
    } catch (error) { console.error("Erro no filtro:", error); }
}

async function filtrarManutencao(btn) {
    marcarAtivo(btn);
    document.getElementById('titulo-sessao').innerText = "Equipamentos em Manutenção";
    try {
        // CORRIGIDO: passa string que o main.js reconhece como filtro de manutenção
        const [r1, r2, r3] = await Promise.all([
            window.api.getComputadoresPorSetor('manutencao'),
            window.api.getComputadoresPorSetor('1ciamanutencao'),
            window.api.getComputadoresPorSetor('2ciamanutencao'),
        ]);
        listaAtualComputadores = [...(r1||[]),...(r2||[]),...(r3||[])];
        desenharLinhas(listaAtualComputadores);
    } catch (e) { console.error(e); }
}

async function filtrarPorCidade(prefixo, nome, btn) {
    marcarAtivo(btn);
    setorAtivoParaDica = prefixo;
    document.getElementById('titulo-sessao').innerText = `Cidade: ${nome}`;
    try {
        const filtrados = await window.api.getComputadoresPorCidade(prefixo);
        listaAtualComputadores = filtrados || [];
        desenharLinhas(listaAtualComputadores);
    } catch (e) { console.error(e); }
}

function getRowClass(id) {
    const up = (id||'').toUpperCase();
    if (up.startsWith('1CIA')) return 'row-cmd';
    if (up.startsWith('2CIA')) return 'row-sub';
    if (up.startsWith('NTI') || up.startsWith('P3')) return 'row-nti';
    if (up.startsWith('P'))   return 'row-pcs';
    if (up.startsWith('CMD')) return 'row-cmd';
    if (up.startsWith('SUB')) return 'row-sub';
    return 'row-other';
}

// ── NORMALIZAR BASE64 (compatibilidade legado) ────
function normalizarBase64(raw) {
    if (!raw) return null;
    let b = String(raw).trim();
    if (!b || b === 'null' || b.length < 100) return null;
    if (!b.startsWith('data:')) {
        if (b.startsWith('/9j/'))    b = 'data:image/jpeg;base64,' + b;
        else if (b.startsWith('iVBORw')) b = 'data:image/png;base64,'  + b;
        else if (b.startsWith('R0lG'))   b = 'data:image/gif;base64,'  + b;
        else if (b.startsWith('UklGR')) b = 'data:image/webp;base64,' + b;
        else b = 'data:image/jpeg;base64,' + b;
    }
    return b;
}

// CORRIGIDO: prioriza foto_url (Storage), cai para base64 legado
function obterFotoSrc(item) {
    if (item.foto_url)   return item.foto_url;
    return normalizarBase64(item.foto_base64);
}

// ── DESENHAR TABELA ──────────────────────────────
function desenharLinhas(dados) {
    const corpo = document.getElementById('corpo-tabela');
    document.getElementById('contador-registros').innerText = `${dados.length} registro(s)`;

    if (!dados || dados.length === 0) {
        corpo.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="icon">🗂️</div><p>Nenhum registro encontrado.</p></div></td></tr>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    dados.forEach((item, index) => {
        const badgeClass = item.situacao === 'OTIMO' ? 'badge-otimo' : item.situacao === 'BOM' ? 'badge-bom' : 'badge-manut';
        const rowClass   = getRowClass(item.identificacao);
        const fotoSrc    = obterFotoSrc(item);

        let thumbHTML = `<span class="thumb-none" title="Sem foto" aria-label="Sem foto">📷</span>`;
        if (fotoSrc) {
            thumbHTML = `<img
                class="thumb-img"
                src="${fotoSrc}"
                alt="Foto ${esc(item.identificacao)}"
                data-src="${fotoSrc}"
                onclick="abrirLightboxDe(this)"
                title="Clique para ampliar"
                onerror="this.outerHTML='<span class=\\'thumb-none\\' title=\\'Erro\\'>⚠️</span>';">`;
        }

        const tr = document.createElement('tr');
        tr.className     = rowClass;
        tr.dataset.id    = item.id;
        tr.dataset.foto  = fotoSrc || '';
        tr.innerHTML = `
            <td class="num">${index + 1}</td>
            <td class="thumb-cell no-print">${thumbHTML}</td>
            <td class="id-cell">${esc(item.identificacao)}</td>
            <td>${esc(item.usuario)}</td>
            <td class="monitor-cell">${esc(item.monitor_info)}</td>
            <td class="ip-cell">${esc(item.ip_maquina)}</td>
            <td style="text-align:center;"><span class="badge-status ${badgeClass} badge-input">${esc(item.situacao)}</span></td>
            <td class="obs-cell">${esc(item.observacoes)}</td>
            <td class="no-print" style="text-align:center;white-space:nowrap;">
                <button class="btn-tbl edit" onclick="prepararEdicao(${item.id})" title="Editar" aria-label="Editar ${esc(item.usuario)}">✏️</button>
                <button class="btn-tbl del"  onclick="excluir(${item.id})"        title="Excluir" aria-label="Excluir ${esc(item.usuario)}">🗑️</button>
            </td>`;
        fragment.appendChild(tr);
    });

    corpo.replaceChildren(fragment);
}

// ── TOAST ────────────────────────────────────────
function toast(msg, tipo = 'sucesso') {
    const icons = { sucesso:'✅', erro:'❌', info:'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast-msg ${tipo}`;
    el.innerHTML = `<span class="toast-icon">${icons[tipo]}</span><span>${esc(msg)}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => {
        el.classList.add('saindo');
        el.addEventListener('animationend', () => el.remove());
    }, 3200);
}

// ── CONFIRM ──────────────────────────────────────
function confirmar(msg) {
    return new Promise(resolve => {
        const overlay = document.getElementById('confirm-overlay');
        document.querySelector('#confirm-box .confirm-msg').innerText = msg;
        overlay.classList.add('ativo');
        const ok     = document.getElementById('confirm-ok');
        const cancel = document.getElementById('confirm-cancel');
        function fechar(res) {
            overlay.classList.remove('ativo');
            ok.removeEventListener('click', handleOk);
            cancel.removeEventListener('click', handleCancel);
            resolve(res);
        }
        function handleOk()     { fechar(true);  }
        function handleCancel() { fechar(false); }
        ok.addEventListener('click', handleOk);
        cancel.addEventListener('click', handleCancel);
    });
}

// ── MODAL ────────────────────────────────────────
function fecharModalLimpo() {
    const modalEl = document.getElementById('modalCadastro');
    const inst = bootstrap.Modal.getInstance(modalEl);
    if (inst) inst.hide();
}
function abrirModal() {
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCadastro')).show();
}

// CORRIGIDO: usa foto_url do Storage em vez de buscar base64
async function prepararEdicao(id) {
    const item = listaAtualComputadores.find(c => c.id == id);
    if (!item) { toast('Registro não encontrado.', 'erro'); return; }

    document.getElementById('edit-id').value         = item.id;
    document.getElementById('identificacao').value   = item.identificacao;
    document.getElementById('usuario').value         = item.usuario;
    document.getElementById('monitor_info').value    = item.monitor_info || '';
    document.getElementById('ip_maquina').value      = item.ip_maquina  || '';
    document.getElementById('situacao').value        = item.situacao;
    document.getElementById('observacoes').value     = item.observacoes || '';
    document.getElementById('foto_url_antiga').value = item.foto_url    || '';

    removerFoto();
    document.getElementById('modalTitle').innerText    = 'Editar Registro';
    document.getElementById('btnSalvar').className     = 'btn-modal-save edit-mode';
    document.getElementById('btnSalvar').innerText     = 'Atualizar Registro';
    abrirModal();

    // Se já tem foto_url em memória, exibe direto sem nova requisição
    if (item.foto_url) {
        carregarFotoExistente(item.foto_url, null);
        return;
    }

    // Fallback: tenta buscar foto (compatibilidade com registros antigos em base64)
    try {
        const res = await window.api.buscarFoto({ id: item.id, identificacao: item.identificacao });
        if (res?.foto_url) {
            item.foto_url = res.foto_url;
            carregarFotoExistente(res.foto_url, null);
        }
    } catch (e) {
        console.warn('Não foi possível carregar a foto:', e);
    }
}

function abrirModalCadastro() {
    document.getElementById('formCadastro').reset();
    document.getElementById('edit-id').value = '';
    removerFoto();
    document.getElementById('modalTitle').innerText  = 'Novo Registro';
    document.getElementById('btnSalvar').className   = 'btn-modal-save';
    document.getElementById('btnSalvar').innerText   = 'Salvar no Banco';
    const config = configuracaoSetores[setorAtivoParaDica] || { id: '' };
    document.getElementById('identificacao').value   = config.id;
    abrirModal();
}

document.getElementById('formCadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const isEdicao       = !!document.getElementById('edit-id').value;
    const fotoBase64     = document.getElementById('foto_base64').value    || null;
    const fotoUrlAtual   = document.getElementById('foto_url_atual').value || null;  // URL já no Storage
    const fotoUrlAntiga  = document.getElementById('foto_url_antiga').value|| null;
    const nomeArquivo    = document.getElementById('foto-filename').value  || 'foto.jpg';
    const identificacao  = document.getElementById('identificacao').value;

    let fotoUrl = fotoUrlAtual; // mantém a URL existente por padrão

    // Se há uma NOVA foto (base64) selecionada, faz upload para o Storage
    if (fotoBase64 && fotoBase64.length > 100) {
        try {
            const uploadRes = await window.api.carregarFotoStorage({
                base64: fotoBase64,
                nomeOriginal: nomeArquivo,
                identificacao: identificacao
            });
            if (uploadRes.success) {
                fotoUrl = uploadRes.url;
            } else {
                toast('Erro ao fazer upload da foto: ' + uploadRes.error, 'erro');
                return;
            }
        } catch (err) {
            toast('Erro ao fazer upload: ' + err.message, 'erro');
            return;
        }
    }

    const dados = {
        id:            document.getElementById('edit-id').value  || null,
        identificacao,
        usuario:       document.getElementById('usuario').value,
        monitor_info:  document.getElementById('monitor_info').value,
        ip_maquina:    document.getElementById('ip_maquina').value,
        situacao:      document.getElementById('situacao').value,
        observacoes:   document.getElementById('observacoes').value,
        foto_url:      fotoUrl,
        foto_url_antiga: fotoUrlAntiga // main.js usa para deletar a antiga do Storage
    };

    const res = await window.api.salvarComputador(dados);
    if (res.success) {
        fecharModalLimpo();
        toast(isEdicao ? 'Registro atualizado!' : 'Registro salvo!', 'sucesso');
        // Atualiza item em memória para refletir a nova foto imediatamente
        if (fotoUrl && dados.id) {
            const item = listaAtualComputadores.find(c => c.id == dados.id);
            if (item) item.foto_url = fotoUrl;
        }
        await atualizarVisualizacao();
    } else {
        toast('Erro ao salvar: ' + res.error, 'erro');
    }
});

async function excluir(id) {
    const item = listaAtualComputadores.find(c => c.id == id);
    if (!item) return;
    const ok = await confirmar(`Excluir o registro de ${item.usuario}?`);
    if (!ok) return;
    const res = await window.api.excluirComputador({ id, identificacao: item.identificacao });
    if (res.success) {
        toast('Registro excluído.', 'info');
        await atualizarVisualizacao();
    } else {
        toast('Erro ao excluir: ' + (res.error || 'erro desconhecido'), 'erro');
    }
}

function configurarMonitorDePrefixo() {
    document.getElementById('identificacao').addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });
}

function configurarBusca() {
    let debounceTimer;
    document.getElementById('inputBusca').addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(filtrarTabela, 250);
    });
}

function filtrarTabela() {
    const termo = document.getElementById('inputBusca').value.toLowerCase().trim();
    if (!termo) { desenharLinhas(listaAtualComputadores); return; }
    const filtrados = listaAtualComputadores.filter(i =>
        (i.usuario      || '').toLowerCase().includes(termo) ||
        (i.identificacao|| '').toLowerCase().includes(termo) ||
        (i.ip_maquina   || '').toLowerCase().includes(termo) ||
        (i.observacoes  || '').toLowerCase().includes(termo) ||
        (i.monitor_info || '').toLowerCase().includes(termo)
    );
    desenharLinhas(filtrados);
}

// ── AGRUPAMENTO ──────────────────────────────────
function getCidade(idTexto) {
    const up = (idTexto || '').toUpperCase();
    if (up.startsWith('PB-'))   return 'Pimenta Bueno';
    if (up.startsWith('ESP-'))  return 'Espigão';
    if (up.startsWith('AND-'))  return 'Andreazza';
    if (up.startsWith('SF-'))   return 'São Felipe';
    if (up.startsWith('PRIM-')) return 'Primavera';
    return 'Cacoal';
}

function getCia(idTexto) {
    const up = (idTexto || '').toUpperCase();
    if (up.startsWith('5CIA')) return '5ª CIA';
    if (up.startsWith('4CIA')) return '4ª CIA';
    if (up.startsWith('3CIA')) return '3ª CIA';
    if (up.startsWith('2CIA')) return '2ª CIA';
    if (up.startsWith('1CIA')) return '1ª CIA';
    return 'PCS';
}

function getSetorLabel(idTexto) {
    const up = (idTexto || '').toUpperCase();
    const m  = up.match(/^\dCIA-([^-]+)/);
    if (m) return m[1];
    return up.split('-')[0] || 'OUTROS';
}

function agruparPorCidadeCiaSetor() {
    const linhas = Array.from(document.getElementById('corpo-tabela').querySelectorAll('tr'));
    const mapa   = {};
    const totais = { OTIMO: 0, BOM: 0, 'MANUTENÇÃO': 0 };

    linhas.forEach(linha => {
        if (!linha.cells || linha.cells.length < 8) return;
        const id     = linha.cells[2]?.innerText.trim() || '';
        const sit    = linha.cells[6]?.innerText.trim().toUpperCase() || '';
        const cidade = getCidade(id);
        const cia    = getCia(id);
        const setor  = getSetorLabel(id);
        if (!mapa[cidade])           mapa[cidade] = {};
        if (!mapa[cidade][cia])      mapa[cidade][cia] = {};
        if (!mapa[cidade][cia][setor]) mapa[cidade][cia][setor] = [];
        mapa[cidade][cia][setor].push(linha);
        if (totais.hasOwnProperty(sit)) totais[sit]++;
    });
    return { mapa, totais };
}

// ── MAPA de fotos: id → src ───────────────────────
function construirFotoMap(linhas) {
    const fotoMap = {};
    linhas.forEach(linha => {
        const id = linha.dataset?.id;
        if (!id) return;
        const item = listaAtualComputadores.find(c => String(c.id) === String(id));
        fotoMap[id] = item?.foto_url || normalizarBase64(item?.foto_base64) || linha.dataset?.foto || null;
    });
    return fotoMap;
}

// ── PRÉ-VISUALIZAÇÃO ─────────────────────────────
function abrirPreview() {
    const linhas = document.getElementById('corpo-tabela').querySelectorAll('tr');
    if (!linhas.length || linhas[0]?.innerText.includes('Nenhum') || linhas[0]?.innerText.includes('Carregando')) {
        toast('Nenhum dado para visualizar.', 'info'); return;
    }

    const titulo  = document.getElementById('titulo-sessao').innerText;
    const agora   = new Date().toLocaleString('pt-BR');
    const { mapa, totais } = agruparPorCidadeCiaSetor();
    const total   = totais.OTIMO + totais.BOM + totais['MANUTENÇÃO'];
    const fotoMap = construirFotoMap(Array.from(linhas));

    document.getElementById('pvw-sub').innerText     = titulo;
    document.getElementById('pvw-n-otimo').innerText = totais.OTIMO;
    document.getElementById('pvw-n-bom').innerText   = totais.BOM;
    document.getElementById('pvw-n-manut').innerText = totais['MANUTENÇÃO'];
    document.getElementById('pvw-n-total').innerText = total;

    const ORDEM_CIDADES = ['Cacoal','Pimenta Bueno','Espigão','Andreazza','São Felipe','Primavera'];
    let zebraIdx = 0, corpoHTML = '';

    ORDEM_CIDADES.forEach(cidade => {
        if (!mapa[cidade]) return;
        const totalCidade = Object.values(mapa[cidade]).reduce((t1, cias) =>
            t1 + Object.values(cias).reduce((t2, arr) => t2 + arr.length, 0), 0);

        if (cidade !== 'Cacoal') {
            corpoHTML += `<tr class="pvw-cia-row" style="background:#475569;border-left:5px solid rgba(255,255,255,0.3);">
                <td colspan="7">📍 ${esc(cidade)} · ${totalCidade} equipamento(s)</td></tr>`;
        }

        ORDEM_CIAS.forEach(cia => {
            if (!mapa[cidade][cia]) return;
            const cor    = CORES_CIA[cia] || '#1e3a8a';
            const qtdCia = Object.values(mapa[cidade][cia]).reduce((s, a) => s + a.length, 0);
            corpoHTML += `<tr class="pvw-cia-row" style="background:${cor};border-left:5px solid rgba(255,255,255,0.3);">
                <td colspan="7">◆ ${esc(cia)} · ${qtdCia} equipamento(s)</td></tr>`;

            for (const setor in mapa[cidade][cia]) {
                corpoHTML += `<tr class="pvw-setor-row"><td colspan="7">▪ Setor: ${esc(setor)} · ${mapa[cidade][cia][setor].length} equipamento(s)</td></tr>`;
                mapa[cidade][cia][setor].forEach(l => {
                    const rowId   = l.dataset.id;
                    const fotoSrc = fotoMap[rowId] || null;
                    const id  = esc(l.cells[2]?.innerText.trim());
                    const usr = esc(l.cells[3]?.innerText.trim());
                    const mon = esc(l.cells[4]?.innerText.trim());
                    const ip  = esc(l.cells[5]?.innerText.trim());
                    const sit = (l.cells[6]?.innerText.trim() || '').toUpperCase();
                    const obs = esc(l.cells[7]?.innerText.trim());
                    const z   = zebraIdx++ % 2 !== 0 ? 'pvw-z' : '';
                    const bdg = sit === 'OTIMO' ? 'pvw-badge-otimo' : sit === 'BOM' ? 'pvw-badge-bom' : 'pvw-badge-manut';
                    const sl  = sit === 'OTIMO' ? 'Ótimo' : sit === 'BOM' ? 'Bom' : 'Manutenção';
                    const fotoCell = fotoSrc
                        ? `<td style="text-align:center;padding:2px;"><img src="${fotoSrc}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1;" alt="Foto ${id}"></td>`
                        : `<td style="text-align:center;color:#94a3b8;font-size:16px;">📷</td>`;

                    corpoHTML += `<tr class="${z}">${fotoCell}
                        <td class="pvw-id">${id}</td><td>${usr}</td>
                        <td class="pvw-mon">${mon}</td><td class="pvw-ip">${ip}</td>
                        <td style="text-align:center;"><span class="pvw-badge ${bdg}">${sl}</span></td>
                        <td class="pvw-obs">${obs}</td></tr>`;
                });
            }
        });
    });

    document.getElementById('pvw-page').innerHTML = `
        <div class="pvw-rh">
            <div class="pvw-rh-brasao">NTI</div>
            <div class="pvw-rh-texto">
                <p class="pvw-rh-gov">Governo do Estado de Rondônia</p>
                <p class="pvw-rh-org">Polícia Militar do Estado de Rondônia</p>
                <p class="pvw-rh-uni">4º Batalhão de Polícia Militar — Cacoal / RO</p>
                <span class="pvw-rh-doc">Inventário e Controle de Equipamentos de TI</span>
            </div>
            <div class="pvw-rh-meta">
                <strong>${esc(titulo)}</strong><span>Gerado em:</span><em>${agora}</em>
            </div>
        </div>
        <table class="pvw-table">
            <thead><tr>
                <th style="width:56px">Foto</th>
                <th style="width:10%">Identificação</th>
                <th style="width:20%">Usuário</th>
                <th style="width:16%">Monitor / Tombamento</th>
                <th style="width:11%">Endereço IP</th>
                <th style="width:10%">Situação</th>
                <th>Observações</th>
            </tr></thead>
            <tbody>${corpoHTML}</tbody>
        </table>
        <div class="pvw-resumo-wrap">
            <div class="pvw-resumo">
                <div class="pvw-resumo-title">Resumo do Relatório</div>
                <div class="pvw-resumo-row"><span>🟢 Ótimo</span><strong>${totais.OTIMO}</strong></div>
                <div class="pvw-resumo-row"><span>🟡 Bom</span><strong>${totais.BOM}</strong></div>
                <div class="pvw-resumo-row"><span>🔴 Manutenção</span><strong>${totais['MANUTENÇÃO']}</strong></div>
                <div class="pvw-resumo-row total"><span>Total Geral</span><strong>${total}</strong></div>
            </div>
        </div>
        <div class="pvw-footer">
            <div class="pvw-footer-left"><strong>4º Batalhão de Polícia Militar</strong> Seção de Informática — NTI<br>Cacoal / RO</div>
            <div class="pvw-assinaturas">
                <div class="pvw-assinatura"><div class="linha"></div><p>Responsável Técnico</p><small>Seção de Informática — 4º BPM</small></div>
                <div class="pvw-assinatura"><div class="linha"></div><p>Comandante / Chefe</p><small>Visto e Ciência</small></div>
            </div>
        </div>`;

    const ov = document.getElementById('preview-overlay');
    ov.classList.add('ativo');
    ov.scrollTop = 0;
}

function fecharPreview() { document.getElementById('preview-overlay').classList.remove('ativo'); }
document.getElementById('preview-overlay').addEventListener('click', function(e) { if (e.target === this) fecharPreview(); });
function executarImprimir() { fecharPreview(); setTimeout(imprimirRelatorio, 220); }
function executarPDF()     { fecharPreview(); setTimeout(salvarPDF, 220); }

// ── RELATÓRIO IMPRESSÃO / PDF ─────────────────────
function prepararConteudoRelatorio() {
    const agora = new Date();
    document.getElementById('data-relatorio-texto').innerText = agora.toLocaleString('pt-BR');
    const tituloAtivo = document.getElementById('titulo-sessao').innerText;
    const rhFiltro    = document.getElementById('rh-filtro-texto');
    if (rhFiltro) rhFiltro.innerText = tituloAtivo;

    const tb     = document.getElementById('corpo-tabela');
    const linhas = Array.from(tb.querySelectorAll('tr'));
    if (linhas.length === 0 || linhas[0]?.innerText.includes("Nenhum")) return null;
    const htmlOriginal = tb.innerHTML;

    const fotoMap = construirFotoMap(linhas);
    const { mapa, totais } = agruparPorCidadeCiaSetor();

    const ORDEM_CIDADES = ['Cacoal','Pimenta Bueno','Espigão','Andreazza','São Felipe','Primavera'];
    const coresCia = { 'PCS':'#1e3a8a','1ª CIA':'#4c1d95','2ª CIA':'#0e7490','3ª CIA':'#065f46','4ª CIA':'#9a3412','5ª CIA':'#831843' };
    let novoConteudo = '';
    let zebraIdx = 0;

    ORDEM_CIDADES.forEach(cidade => {
        if (!mapa[cidade]) return;
        const totalCidade = Object.values(mapa[cidade]).reduce((t1, cias) =>
            t1 + Object.values(cias).reduce((t2, arr) => t2 + arr.length, 0), 0);

        if (cidade !== 'Cacoal') {
            novoConteudo += `<tr><td colspan="7" style="background:#334155!important;color:#fff!important;font-weight:700;font-size:0.8rem;letter-spacing:2px;text-transform:uppercase;padding:6px 10px;border-left:5px solid rgba(255,255,255,0.3);-webkit-print-color-adjust:exact;print-color-adjust:exact;">📍 ${esc(cidade)} · ${totalCidade} equipamento(s)</td></tr>`;
        }

        ORDEM_CIAS.forEach(cia => {
            if (!mapa[cidade][cia]) return;
            const cor      = coresCia[cia] || '#1e3a8a';
            const totalCia = Object.values(mapa[cidade][cia]).reduce((s,arr) => s + arr.length, 0);
            novoConteudo += `<tr><td colspan="7" class="rpt-cia-header" style="background:${cor}!important;border-left:5px solid rgba(255,255,255,0.4);">◆ ${esc(cia)} · ${totalCia} equipamento(s)</td></tr>`;

            for (const setor in mapa[cidade][cia]) {
                novoConteudo += `<tr><td colspan="7" class="rpt-setor-header" style="padding-left:24px!important;">▪ Setor: ${esc(setor)} · ${mapa[cidade][cia][setor].length} equipamento(s)</td></tr>`;

                mapa[cidade][cia][setor].forEach(l => {
                    const rowId  = l.dataset.id;
                    const fotoSrc = fotoMap[rowId] || null;
                    const zebraClass = zebraIdx++ % 2 !== 0 ? 'rpt-zebra' : '';
                    const id  = esc(l.cells[2]?.innerText.trim());
                    const usr = esc(l.cells[3]?.innerText.trim());
                    const mon = esc(l.cells[4]?.innerText.trim());
                    const ip  = esc(l.cells[5]?.innerText.trim());
                    const sit = (l.cells[6]?.innerText.trim() || '').toUpperCase();
                    const obs = esc(l.cells[7]?.innerText.trim());
                    const bdg = sit === 'OTIMO' ? 'rpt-badge-otimo' : sit === 'BOM' ? 'rpt-badge-bom' : 'rpt-badge-manut';
                    const sl  = sit === 'OTIMO' ? 'Ótimo' : sit === 'BOM' ? 'Bom' : 'Manutenção';
                    const fotoTd = fotoSrc
                        ? `<td style="text-align:center;padding:2px;width:50px;"><img src="${fotoSrc}" style="width:42px;height:42px;object-fit:cover;border-radius:3px;border:1px solid #cbd5e1;" alt="Foto"></td>`
                        : `<td style="text-align:center;width:50px;color:#cbd5e1;font-size:14px;">📷</td>`;

                    novoConteudo += `<tr class="${zebraClass}">
                        ${fotoTd}
                        <td class="id-cell">${id}</td>
                        <td>${usr}</td>
                        <td class="monitor-cell rpt-monitor-cell">${mon}</td>
                        <td class="ip-cell">${ip}</td>
                        <td style="text-align:center;"><span class="badge-status ${bdg}">${sl}</span></td>
                        <td class="obs-cell">${obs}</td>
                    </tr>`;
                });
            }
        });
    });

    const totalGeral = totais['OTIMO'] + totais['BOM'] + totais['MANUTENÇÃO'];
    const resumoContainer = document.getElementById('rpt-resumo-container');
    if (resumoContainer) {
        resumoContainer.innerHTML = `
            <div class="rpt-resumo">
                <div class="rpt-resumo-title">Resumo do Relatório</div>
                <div class="rpt-resumo-row"><span>🟢 Ótimo</span><strong>${totais['OTIMO']}</strong></div>
                <div class="rpt-resumo-row"><span>🟡 Bom</span><strong>${totais['BOM']}</strong></div>
                <div class="rpt-resumo-row"><span>🔴 Manutenção</span><strong>${totais['MANUTENÇÃO']}</strong></div>
                <div class="rpt-resumo-row total"><span>Total Geral</span><strong>${totalGeral}</strong></div>
            </div>`;
    }
    return { novoConteudo, htmlOriginal };
}

// Troca o <thead> durante impressão para incluir coluna Foto
function trocarCabecalhoParaImpressao() {
    const thead = document.querySelector('#tabela-principal thead tr');
    if (!thead) return null;
    const orig = thead.innerHTML;
    thead.innerHTML = `
        <th style="width:44px">#</th>
        <th style="width:50px">Foto</th>
        <th style="width:10%">Identificação</th>
        <th style="width:20%">Usuário</th>
        <th style="width:16%">Monitor / Tombamento</th>
        <th style="width:11%">Endereço IP</th>
        <th style="width:10%">Situação</th>
        <th>Observações</th>`;
    return orig;
}
function restaurarCabecalho(orig) {
    const thead = document.querySelector('#tabela-principal thead tr');
    if (thead && orig) thead.innerHTML = orig;
}

function imprimirRelatorio() {
    const resultado = prepararConteudoRelatorio();
    const tb = document.getElementById('corpo-tabela');
    if (!resultado) { window.print(); return; }
    tb.innerHTML = resultado.novoConteudo;
    const cabOrig = trocarCabecalhoParaImpressao();
    window.print();
    tb.innerHTML = resultado.htmlOriginal;
    restaurarCabecalho(cabOrig);
}

async function carregarHtml2Pdf() {
    if (window.html2pdf) return;
    await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        s.onload  = resolve;
        s.onerror = () => reject(new Error('Falha ao carregar html2pdf.js'));
        document.head.appendChild(s);
    });
}

async function salvarPDF() {
    const resultado = prepararConteudoRelatorio();
    if (!resultado) { toast('Nenhum dado para gerar PDF.', 'info'); return; }

    const loading = document.getElementById('pdf-loading');
    const header  = document.getElementById('relatorio-header');
    const footer  = document.getElementById('relatorio-footer');
    const tb      = document.getElementById('corpo-tabela');

    tb.innerHTML = resultado.novoConteudo;
    const cabOrig = trocarCabecalhoParaImpressao();
    header.style.display = 'flex';
    footer.style.display = 'block';

    const esconder = document.querySelectorAll('.control-panel, .table-card-header, .table-footer, .no-print');
    esconder.forEach(el => el.setAttribute('data-pdf-hidden', el.style.display || ''));
    esconder.forEach(el => el.style.display = 'none');

    const appBody    = document.querySelector('.app-body');
    const paddingOrig = appBody.style.padding;
    appBody.style.padding = '0';
    loading.classList.add('ativo');

    const titulo      = document.getElementById('titulo-sessao').innerText;
    const nomeArquivo = `Inventario_TI_4BPM_${titulo.replace(/[^a-zA-Z0-9]/g,'_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.pdf`;

    try {
        await carregarHtml2Pdf();
        await html2pdf().set({
            margin: [10, 8, 12, 8],
            filename: nomeArquivo,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true, allowTaint: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        }).from(appBody).save();
    } catch (e) {
        toast('Erro ao gerar PDF: ' + e.message, 'erro');
    } finally {
        loading.classList.remove('ativo');
        header.style.display = 'none';
        footer.style.display = 'none';
        appBody.style.padding = paddingOrig;
        esconder.forEach(el => {
            el.style.display = el.getAttribute('data-pdf-hidden') || '';
            el.removeAttribute('data-pdf-hidden');
        });
        tb.innerHTML = resultado.htmlOriginal;
        restaurarCabecalho(cabOrig);
    }
}
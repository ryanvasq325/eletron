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
    // Cidades
    'PIMENTA BUENO': { id: 'PB-' },
    'PB': { id: 'PB-' },
    'ESPIGÃO': { id: 'ESP-' },
    'ESP': { id: 'ESP-' },
    'ANDREAZZA': { id: 'AND-' },
    'AND': { id: 'AND-' },
    'SÃO FELIPE': { id: 'SF-' },
    'SF': { id: 'SF-' },
    'PRIMAVERA': { id: 'PRIM-' },
    'PRIM': { id: 'PRIM-' }
};

const CORES_CIA = {
    'PCS': '#1e3a8a', '1ª CIA': '#4c1d95', '2ª CIA': '#0e7490',
    '3ª CIA': '#065f46', '4ª CIA': '#9a3412', '5ª CIA': '#831843'
};
const ORDEM_CIAS = ['PCS', '1ª CIA', '2ª CIA', '3ª CIA', '4ª CIA', '5ª CIA'];

// ── SANITIZAÇÃO XSS ──────────────────────────────
function esc(str) {
    if (str === null || str === undefined || str === '' || str === 'null') return '—';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── RELÓGIO ─────────────────────────────────────
function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date-display');
    if (clockEl) clockEl.innerText = now.toLocaleTimeString('pt-BR');
    if (dateEl) dateEl.innerText = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
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
    if (!file || !file.type.startsWith('image/')) {
        toast('Arquivo inválido. Selecione uma imagem.', 'erro');
        return;
    }
    processarArquivoFoto(file);
}

function processarArquivoFoto(file) {
    if (file.size > 5 * 1024 * 1024) {
        toast('Imagem muito grande. Máximo permitido: 5 MB.', 'erro');
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        const base64 = e.target.result;
        document.getElementById('foto_base64').value = base64;
        document.getElementById('foto-preview-img').src = base64;
        document.getElementById('foto-preview-container').style.display = 'block';
        document.getElementById('foto-upload-area').style.display = 'none';
        document.getElementById('foto-info-nome').innerText =
            '📎 ' + file.name + ' · ' + (file.size / 1024).toFixed(0) + ' KB';
        // Armazenar nome do arquivo original para referência
        document.getElementById('foto-filename').value = file.name;
    };
    reader.readAsDataURL(file);
}

function removerFoto() {
    document.getElementById('foto_base64').value = '';
    document.getElementById('foto-preview-img').src = '';
    document.getElementById('foto-preview-container').style.display = 'none';
    document.getElementById('foto-upload-area').style.display = 'flex';
    document.getElementById('foto-input').value = '';
    document.getElementById('foto-info-nome').innerText = '';
}

function carregarFotoExistente(base64) {
    if (!base64 || base64 === 'null' || base64 === '') { removerFoto(); return; }
    document.getElementById('foto_base64').value = base64;
    document.getElementById('foto-preview-img').src = base64;
    document.getElementById('foto-preview-container').style.display = 'block';
    document.getElementById('foto-upload-area').style.display = 'none';
    document.getElementById('foto-info-nome').innerText = '📎 Imagem salva no registro';
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
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        fecharLightbox();
        fecharPreview();
    }
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
    const setorParaView = prefixo.replace(/[\.\s-]/g, '').toLowerCase();
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
        const [r1, r2, r3] = await Promise.all([
            window.api.getComputadoresPorSetor('ti_manutencao'),
            window.api.getComputadoresPorSetor('1cia_ti_manutencao'),
            window.api.getComputadoresPorSetor('2cia_ti_manutencao'),
        ]);
        listaAtualComputadores = [...(r1 || []), ...(r2 || []), ...(r3 || [])];
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
    const up = (id || '').toUpperCase();
    if (up.startsWith('1CIA')) return 'row-cmd';
    if (up.startsWith('2CIA')) return 'row-sub';
    if (up.startsWith('NTI') || up.startsWith('P3')) return 'row-nti';
    if (up.startsWith('P')) return 'row-pcs';
    if (up.startsWith('CMD')) return 'row-cmd';
    if (up.startsWith('SUB')) return 'row-sub';
    return 'row-other';
}

// ── NORMALIZAR BASE64 DA FOTO ────────────────────
function normalizarBase64(raw) {
    if (!raw) return null;
    let b = String(raw).trim();
    if (!b || b === 'null' || b.length < 100) return null;
    if (!b.startsWith('data:')) {
        if (b.startsWith('/9j/'))      b = 'data:image/jpeg;base64,' + b;
        else if (b.startsWith('iVBORw')) b = 'data:image/png;base64,' + b;
        else if (b.startsWith('R0lG'))   b = 'data:image/gif;base64,' + b;
        else if (b.startsWith('UklGR')) b = 'data:image/webp;base64,' + b;
        else b = 'data:image/jpeg;base64,' + b;
    }
    return b;
}

// ── OBTER SRC DA FOTO (URL ou Base64) ────────────
function obterFotoSrc(item) {
    // Prioridade 1: URL do Storage
    if (item.foto_url) return item.foto_url;
    // Fallback: Base64 antigo
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
    const idsComFoto = [];

    dados.forEach((item, index) => {
        const badgeClass = item.situacao === 'OTIMO' ? 'badge-otimo' : item.situacao === 'BOM' ? 'badge-bom' : 'badge-manut';
        const rowClass = getRowClass(item.identificacao);

        let thumbHTML = `<span class="thumb-none" title="Sem foto" aria-label="Sem foto">📷</span>`;
        const fotoSrc = obterFotoSrc(item);
        if (fotoSrc) {
            thumbHTML = `<img
                class="thumb-img"
                src="${fotoSrc}"
                alt="Foto do equipamento ${esc(item.identificacao)}"
                data-src="${fotoSrc}"
                onclick="abrirLightboxDe(this)"
                title="Clique para ampliar"
                onerror="this.outerHTML='<span class=\\'thumb-none\\' title=\\'Erro ao carregar\\'>⚠️</span>';"
            >`;
        } else if (!item.foto_base64 && !item.foto_url) {
            // Marca para carregar foto depois (apenas se não tiver nenhuma)
            idsComFoto.push(item.id);
        }

        const tr = document.createElement('tr');
        tr.className = rowClass;
        // Armazenando dados para uso no PDF/preview
        tr.dataset.id = item.id;
        tr.dataset.foto = fotoSrc || '';
        tr.innerHTML = `
            <td class="num">${index + 1}</td>
            <td class="thumb-cell no-print">${thumbHTML}</td>
            <td class="id-cell">${esc(item.identificacao)}</td>
            <td>${esc(item.usuario)}</td>
            <td class="monitor-cell">${esc(item.monitor_info)}</td>
            <td class="ip-cell">${esc(item.ip_maquina)}</td>
            <td style="text-align:center;">
                <span class="badge-status ${badgeClass} badge-input">${esc(item.situacao)}</span>
            </td>
            <td class="obs-cell">${esc(item.observacoes)}</td>
            <td class="no-print" style="text-align:center; white-space:nowrap;">
                <button class="btn-tbl edit" onclick="prepararEdicao(${item.id})" title="Editar registro" aria-label="Editar registro de ${esc(item.usuario)}">✏️</button>
                <button class="btn-tbl del"  onclick="excluir(${item.id})"        title="Excluir registro" aria-label="Excluir registro de ${esc(item.usuario)}">🗑️</button>
            </td>`;
        fragment.appendChild(tr);
    });

    corpo.replaceChildren(fragment);

    // Carrega fotos em background para registros que não têm
    if (idsComFoto.length > 0) {
        setTimeout(() => carregarFotosDoRegistro(idsComFoto), 500);
    }
}

// ── TOAST ────────────────────────────────────────
function toast(msg, tipo = 'sucesso') {
    const icons = { sucesso: '✅', erro: '❌', info: 'ℹ️' };
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
        const ok = document.getElementById('confirm-ok');
        const cancel = document.getElementById('confirm-cancel');
        function fechar(res) {
            overlay.classList.remove('ativo');
            ok.removeEventListener('click', handleOk);
            cancel.removeEventListener('click', handleCancel);
            resolve(res);
        }
        function handleOk() { fechar(true); }
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
    const modalEl = document.getElementById('modalCadastro');
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function prepararEdicao(id) {
    const item = listaAtualComputadores.find(c => c.id == id);
    if (!item) { toast('Registro não encontrado.', 'erro'); return; }

    document.getElementById('edit-id').value = item.id;
    document.getElementById('identificacao').value = item.identificacao;
    document.getElementById('usuario').value = item.usuario;
    document.getElementById('monitor_info').value = item.monitor_info || '';
    document.getElementById('ip_maquina').value = item.ip_maquina || '';
    document.getElementById('situacao').value = item.situacao;
    document.getElementById('observacoes').value = item.observacoes || '';
    document.getElementById('foto_url_antiga').value = item.foto_url || ''; // Guardar URL antiga para deletar depois

    removerFoto();
    document.getElementById('modalTitle').innerText = 'Editar Registro';
    document.getElementById('btnSalvar').className = 'btn-modal-save edit-mode';
    document.getElementById('btnSalvar').innerText = 'Atualizar Registro';
    abrirModal();

    try {
        // Se tiver foto_url, carregar direto (é da Storage, já é URL)
        if (item.foto_url) {
            document.getElementById('foto_base64').value = ''; // Não é mais base64
            document.getElementById('foto-preview-img').src = item.foto_url;
            document.getElementById('foto-preview-container').style.display = 'block';
            document.getElementById('foto-upload-area').style.display = 'none';
            document.getElementById('foto-info-nome').innerText = '📎 Foto do Storage';
            return; // Não precisa buscar
        }

        // Se tiver foto_base64 (compatibilidade com dados antigos)
        const res = await window.api.buscarFoto({ id: item.id, identificacao: item.identificacao });
        if (res && res.foto_base64) {
            carregarFotoExistente(res.foto_base64);
            item.foto_base64 = res.foto_base64;
        }
    } catch (e) {
        console.warn('Não foi possível carregar a foto:', e);
    }
}

function abrirModalCadastro() {
    document.getElementById('formCadastro').reset();
    document.getElementById('edit-id').value = '';
    removerFoto();

    document.getElementById('modalTitle').innerText = 'Novo Registro';
    document.getElementById('btnSalvar').className = 'btn-modal-save';
    document.getElementById('btnSalvar').innerText = 'Salvar no Banco';

    const config = configuracaoSetores[setorAtivoParaDica] || { id: '' };
    document.getElementById('identificacao').value = config.id;
    abrirModal();
}

document.getElementById('formCadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const isEdicao = !!document.getElementById('edit-id').value;
    const fotoBase64 = document.getElementById('foto_base64').value || null;
    const nomeArquivo = document.getElementById('foto_filename').value || 'foto.jpg';
    const identificacao = document.getElementById('identificacao').value;

    let fotoUrl = null;
    let fotoUrlAntiga = document.getElementById('foto_url_antiga').value || null;

    // Se há foto nova (base64), fazer upload para Storage
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
            toast('Erro ao fazer upload da foto: ' + err.message, 'erro');
            return;
        }
    }

    const dados = {
        id: document.getElementById('edit-id').value || null,
        identificacao: identificacao,
        usuario: document.getElementById('usuario').value,
        monitor_info: document.getElementById('monitor_info').value,
        ip_maquina: document.getElementById('ip_maquina').value,
        situacao: document.getElementById('situacao').value,
        observacoes: document.getElementById('observacoes').value,
        foto_url: fotoUrl, // URL do Storage (prioridade)
        foto_base64: null, // Não enviar mais base64 para novas fotos
        foto_url_antiga: fotoUrlAntiga // Para deletar foto antiga
    };

    const res = await window.api.salvarComputador(dados);
    if (res.success) {
        fecharModalLimpo();
        toast(isEdicao ? 'Registro atualizado!' : 'Registro salvo!', 'sucesso');

        // Atualiza em memória
        if (fotoUrl) {
            const item = listaAtualComputadores.find(c => c.id == dados.id);
            if (item) {
                item.foto_url = fotoUrl;
                item.foto_base64 = null;
            }
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
    const inputId = document.getElementById('identificacao');
    inputId.addEventListener('input', function () {
        this.value = this.value.toUpperCase();
    });
}

function configurarBusca() {
    const inputBusca = document.getElementById('inputBusca');
    let debounceTimer;
    inputBusca.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(filtrarTabela, 250);
    });
}

function filtrarTabela() {
    const termo = document.getElementById('inputBusca').value.toLowerCase().trim();
    if (!termo) {
        desenharLinhas(listaAtualComputadores);
        return;
    }
    const filtrados = listaAtualComputadores.filter(i =>
        (i.usuario || '').toLowerCase().includes(termo) ||
        (i.identificacao || '').toLowerCase().includes(termo) ||
        (i.ip_maquina || '').toLowerCase().includes(termo) ||
        (i.observacoes || '').toLowerCase().includes(termo) ||
        (i.monitor_info || '').toLowerCase().includes(termo)
    );
    desenharLinhas(filtrados);
}

// ── AGRUPAMENTO CIA/SETOR ────────────────────────
function getCidade(idTexto) {
    const up = (idTexto || '').toUpperCase();
    if (up.includes('PIMENTA BUENO')) return 'Pimenta Bueno';
    if (up.includes('ESPIGÃO')) return 'Espigão';
    if (up.includes('ANDREAZZA')) return 'Andreazza';
    if (up.includes('SÃO FELIPE')) return 'São Felipe';
    if (up.includes('PRIMAVERA')) return 'Primavera';
    return 'Cacoal';
}

function getCia(idTexto) {
    const up = idTexto.toUpperCase();
    if (up.startsWith('5CIA')) return '5ª CIA';
    if (up.startsWith('4CIA')) return '4ª CIA';
    if (up.startsWith('3CIA')) return '3ª CIA';
    if (up.startsWith('2CIA')) return '2ª CIA';
    if (up.startsWith('1CIA')) return '1ª CIA';
    return 'PCS';
}

function getSetorLabel(idTexto) {
    const up = idTexto.toUpperCase();
    const ciaMatch = up.match(/^\dCIA-([^-]+)/);
    if (ciaMatch) return ciaMatch[1];
    return up.split('-')[0] || 'OUTROS';
}

// ── CARREGAR FOTOS EM BACKGROUND ────────────────
async function carregarFotosDoRegistro(ids) {
    if (!ids || ids.length === 0) return;

    ids.forEach(id => {
        const item = listaAtualComputadores.find(c => c.id == id);
        if (item && !item.foto_url && !item.foto_base64) {
            // Carrega foto em background sem bloquear a UI
            window.api.buscarFoto({ id: item.id, identificacao: item.identificacao })
                .then(res => {
                    if (res && res.foto_base64) {
                        item.foto_base64 = res.foto_base64;
                        // Atualiza o thumbnail na tabela
                        const linha = document.querySelector(`tr[data-id="${id}"]`);
                        if (linha) {
                            const fotoSrc = normalizarBase64(res.foto_base64);
                            if (fotoSrc) {
                                const thumbCell = linha.querySelector('.thumb-cell');
                                if (thumbCell) {
                                    thumbCell.innerHTML = `<img class="thumb-img" src="${fotoSrc}" alt="Foto do equipamento" onclick="abrirLightboxDe(this)" title="Clique para ampliar" data-src="${fotoSrc}">`;
                                }
                            }
                        }
                    }
                })
                .catch(e => console.warn('Erro ao carregar foto:', e));
        }
    });
}
// Lê diretamente de listaAtualComputadores (tem foto_base64 carregado no lazy load de edição)
// e das linhas da DOM (data-foto) para os que ainda não foram editados
function coletarLinhasComFoto() {
    const linhas = Array.from(document.getElementById('corpo-tabela').querySelectorAll('tr'));
    return linhas.map(linha => {
        if (!linha.cells || linha.cells.length < 8) return null;
        const id = linha.dataset.id;
        // Tenta pegar foto do item em memória (pode ter sido carregada no lazy load)
        const itemMemoria = listaAtualComputadores.find(c => String(c.id) === String(id));
        const fotoSrc = normalizarBase64(itemMemoria?.foto_base64) || linha.dataset.foto || null;
        return {
            id,
            identificacao: linha.cells[2]?.innerText.trim() || '',
            usuario:       linha.cells[3]?.innerText.trim() || '',
            monitor_info:  linha.cells[4]?.innerText.trim() || '',
            ip_maquina:    linha.cells[5]?.innerText.trim() || '',
            situacao:      linha.cells[6]?.innerText.trim().toUpperCase() || '',
            observacoes:   linha.cells[7]?.innerText.trim() || '',
            foto_base64:   fotoSrc
        };
    }).filter(Boolean);
}

function agruparLinhas() {
    const linhas = Array.from(document.getElementById('corpo-tabela').querySelectorAll('tr'));
    const cias = {};
    const totais = { OTIMO: 0, BOM: 0, 'MANUTENÇÃO': 0 };

    linhas.forEach(linha => {
        if (!linha.cells || linha.cells.length < 8) return;
        const id  = linha.cells[2]?.innerText.trim() || '';
        const sit = linha.cells[6]?.innerText.trim().toUpperCase() || '';
        const cia   = getCia(id);
        const setor = getSetorLabel(id);
        if (!cias[cia]) cias[cia] = {};
        if (!cias[cia][setor]) cias[cia][setor] = [];
        cias[cia][setor].push(linha);
        if (totais.hasOwnProperty(sit)) totais[sit]++;
    });
    return { cias, totais };
}

function agruparLinhasComCidade() {
    const linhas = Array.from(document.getElementById('corpo-tabela').querySelectorAll('tr'));
    const cidadesCias = {};
    const totais = { OTIMO: 0, BOM: 0, 'MANUTENÇÃO': 0 };

    linhas.forEach(linha => {
        if (!linha.cells || linha.cells.length < 8) return;
        const id  = linha.cells[2]?.innerText.trim() || '';
        const sit = linha.cells[6]?.innerText.trim().toUpperCase() || '';
        const cidade = getCidade(id);
        const cia   = getCia(id);
        const setor = getSetorLabel(id);
        if (!cidadesCias[cidade]) cidadesCias[cidade] = {};
        if (!cidadesCias[cidade][cia]) cidadesCias[cidade][cia] = {};
        if (!cidadesCias[cidade][cia][setor]) cidadesCias[cidade][cia][setor] = [];
        cidadesCias[cidade][cia][setor].push(linha);
        if (totais.hasOwnProperty(sit)) totais[sit]++;
    });
    return { cidadesCias, totais };
}

// ── PRÉ-VISUALIZAÇÃO (com foto) ──────────────────
function abrirPreview() {
    const linhas = document.getElementById('corpo-tabela').querySelectorAll('tr');
    if (!linhas.length || linhas[0]?.innerText.includes('Nenhum') || linhas[0]?.innerText.includes('Carregando')) {
        toast('Nenhum dado para visualizar.', 'info'); return;
    }

    const titulo = document.getElementById('titulo-sessao').innerText;
    const agora  = new Date().toLocaleString('pt-BR');
    const { cidadesCias, totais } = agruparLinhasComCidade();
    const total  = totais.OTIMO + totais.BOM + totais['MANUTENÇÃO'];

    document.getElementById('pvw-sub').innerText        = titulo;
    document.getElementById('pvw-n-otimo').innerText    = totais.OTIMO;
    document.getElementById('pvw-n-bom').innerText      = totais.BOM;
    document.getElementById('pvw-n-manut').innerText    = totais['MANUTENÇÃO'];
    document.getElementById('pvw-n-total').innerText    = total;

    // Mapa id → foto (memória tem prioridade, depois data-foto da linha)
    const fotoMap = {};
    Array.from(linhas).forEach(linha => {
        const id = linha.dataset.id;
        if (!id) return;
        const itemMem = listaAtualComputadores.find(c => String(c.id) === String(id));
        fotoMap[id] = itemMem?.foto_url
            ? itemMem.foto_url
            : (normalizarBase64(itemMem?.foto_base64) || linha.dataset.foto || null);
    });

    const ordemCidades = ['Cacoal', 'Pimenta Bueno', 'Espigão', 'Andreazza', 'São Felipe', 'Primavera'];
    let zebraIdx = 0, corpoHTML = '';

    ordemCidades.forEach(cidade => {
        if (!cidadesCias[cidade]) return;

        // Cabeçalho da cidade (se não for Cacoal)
        const totalCidade = Object.values(cidadesCias[cidade]).reduce((total1, cias) =>
            total1 + Object.values(cias).reduce((total2, setores) => total2 + setores.length, 0), 0);

        if (cidade !== 'Cacoal') {
            corpoHTML += `<tr class="pvw-cia-row" style="background:#64748b;border-left:5px solid rgba(255,255,255,0.3);">
                <td colspan="7">📍 ${esc(cidade)} &nbsp;·&nbsp; ${totalCidade} equipamento(s)</td></tr>`;
        }

        // CIAs dentro desta cidade
        ORDEM_CIAS.forEach(cia => {
            if (!cidadesCias[cidade][cia]) return;
            const cor    = CORES_CIA[cia] || '#1e3a8a';
            const qtdCia = Object.values(cidadesCias[cidade][cia]).reduce((s, a) => s + a.length, 0);
            corpoHTML += `<tr class="pvw-cia-row" style="background:${cor};border-left:5px solid rgba(255,255,255,0.3);">
                <td colspan="7">◆ ${esc(cia)} &nbsp;·&nbsp; ${qtdCia} equipamento(s)</td></tr>`;

            for (const setor in cidadesCias[cidade][cia]) {
                corpoHTML += `<tr class="pvw-setor-row"><td colspan="7">▪ Setor: ${esc(setor)} &nbsp;·&nbsp; ${cidadesCias[cidade][cia][setor].length} equipamento(s)</td></tr>`;
                cidadesCias[cidade][cia][setor].forEach(l => {
                    const rowId = l.dataset.id;
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

                    // Célula de foto: miniatura 48px ou ícone cinza
                    const fotoCell = fotoSrc
                        ? `<td style="text-align:center;padding:2px;"><img src="${fotoSrc}" alt="Foto ${id}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1;"></td>`
                        : `<td style="text-align:center;color:#94a3b8;font-size:18px;">📷</td>`;

                    corpoHTML += `<tr class="${z}">
                        ${fotoCell}
                        <td class="pvw-id">${id}</td>
                        <td>${usr}</td>
                        <td class="pvw-mon">${mon}</td>
                        <td class="pvw-ip">${ip}</td>
                        <td style="text-align:center;"><span class="pvw-badge ${bdg}">${sl}</span></td>
                        <td class="pvw-obs">${obs}</td>
                    </tr>`;
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
                <strong>${esc(titulo)}</strong>
                <span>Gerado em:</span>
                <em>${agora}</em>
            </div>
        </div>
        <table class="pvw-table">
            <thead><tr>
                <th style="width:60px">Foto</th>
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
            <div class="pvw-footer-left">
                <strong>4º Batalhão de Polícia Militar</strong>
                Seção de Informática — NTI<br>Cacoal / RO
            </div>
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
document.getElementById('preview-overlay').addEventListener('click', function (e) { if (e.target === this) fecharPreview(); });
function executarImprimir() { fecharPreview(); setTimeout(imprimirRelatorio, 220); }
function executarPDF()     { fecharPreview(); setTimeout(salvarPDF, 220); }

// ── RELATÓRIO IMPRESSÃO / PDF (com foto) ─────────
function prepararConteudoRelatorio() {
    const agora = new Date();
    document.getElementById('data-relatorio-texto').innerText = agora.toLocaleString('pt-BR');
    const tituloAtivo = document.getElementById('titulo-sessao').innerText;
    const rhFiltro    = document.getElementById('rh-filtro-texto');
    if (rhFiltro) rhFiltro.innerText = tituloAtivo;

    const tabelaOriginal = document.getElementById('corpo-tabela');
    const linhas = Array.from(tabelaOriginal.querySelectorAll('tr'));
    if (linhas.length === 0 || linhas[0]?.innerText.includes("Nenhum")) return null;
    const htmlOriginal = tabelaOriginal.innerHTML;

    // Mapa id → foto (memória tem prioridade)
    const fotoMap = {};
    linhas.forEach(linha => {
        const id = linha.dataset.id;
        if (!id) return;
        const itemMem = listaAtualComputadores.find(c => String(c.id) === String(id));
        fotoMap[id] = itemMem?.foto_url
            ? itemMem.foto_url
            : (normalizarBase64(itemMem?.foto_base64) || linha.dataset.foto || null);
    });

    // Agrupamento por Cidade → CIA → Setor
    const cidadesCias = {};
    const totais     = { 'OTIMO': 0, 'BOM': 0, 'MANUTENÇÃO': 0 };
    let zebraIdx = 0;

    linhas.forEach((linha) => {
        if (!linha.cells || linha.cells.length < 8) return;
        const rowId    = linha.dataset.id;
        const idTexto  = linha.cells[2]?.innerText || '';
        const situacao = linha.cells[6]?.innerText.trim().toUpperCase() || '';
        const cidade   = getCidade(idTexto);
        const cia      = getCia(idTexto);
        const setor    = getSetorLabel(idTexto);

        if (!cidadesCias[cidade]) cidadesCias[cidade] = {};
        if (!cidadesCias[cidade][cia]) cidadesCias[cidade][cia] = {};
        if (!cidadesCias[cidade][cia][setor]) cidadesCias[cidade][cia][setor] = [];

        const zebraClass = zebraIdx % 2 === 0 ? '' : 'rpt-zebra';
        zebraIdx++;
        const badgeClass = situacao === 'OTIMO' ? 'rpt-badge-otimo' : situacao === 'BOM' ? 'rpt-badge-bom' : 'rpt-badge-manut';

        const fotoSrc  = fotoMap[rowId] || null;
        // Célula de foto para o PDF (tamanho compacto)
        const fotoTd   = fotoSrc
            ? `<td style="text-align:center;padding:2px;width:52px;"><img src="${fotoSrc}" style="width:44px;height:44px;object-fit:cover;border-radius:3px;border:1px solid #cbd5e1;" alt="Foto"></td>`
            : `<td style="text-align:center;width:52px;color:#94a3b8;font-size:16px;">📷</td>`;

        // Monta linha para impressão/PDF (sem colunas no-print, com coluna de foto)
        const id  = esc(linha.cells[2]?.innerText.trim());
        const usr = esc(linha.cells[3]?.innerText.trim());
        const mon = esc(linha.cells[4]?.innerText.trim());
        const ip  = esc(linha.cells[5]?.innerText.trim());
        const sit = situacao;
        const obs = esc(linha.cells[7]?.innerText.trim());
        const sl  = sit === 'OTIMO' ? 'Ótimo' : sit === 'BOM' ? 'Bom' : 'Manutenção';

        const linhaMod = `<tr class="${zebraClass}">
            ${fotoTd}
            <td class="id-cell">${id}</td>
            <td>${usr}</td>
            <td class="monitor-cell rpt-monitor-cell">${mon}</td>
            <td class="ip-cell">${ip}</td>
            <td style="text-align:center;"><span class="badge-status ${badgeClass} badge-input">${sl}</span></td>
            <td class="obs-cell">${obs}</td>
        </tr>`;

        cidadesCias[cidade][cia][setor].push(linhaMod);
        if (totais.hasOwnProperty(situacao)) totais[situacao]++;
    });

    const coresCia = { 'PCS': '#1e3a8a', '1ª CIA': '#4c1d95', '2ª CIA': '#0e7490', '3ª CIA': '#065f46', '4ª CIA': '#9a3412', '5ª CIA': '#831843' };
    const ordemCias  = ['PCS', '1ª CIA', '2ª CIA', '3ª CIA', '4ª CIA', '5ª CIA'];
    const ordemCidades = ['Cacoal', 'Pimenta Bueno', 'Espigão', 'Andreazza', 'São Felipe', 'Primavera'];

    let novoConteudo = '';

    // Exibir em ordem: Cacoal primeiro, depois outras cidades
    ordemCidades.forEach(cidade => {
        if (!cidadesCias[cidade]) return;

        // Cabeçalho da cidade
        const totalCidade = Object.values(cidadesCias[cidade]).reduce((total1, cias) =>
            total1 + Object.values(cias).reduce((total2, setores) => total2 + setores.length, 0), 0);

        if (cidade !== 'Cacoal') {
            novoConteudo += `<tr><td colspan="7" style="background: #334155 !important; color: #fff !important; font-weight: 700; font-size: 0.85rem; letter-spacing: 2px; text-transform: uppercase; padding: 7px 10px; border-left: 5px solid rgba(255,255,255,0.3);">📍 ${esc(cidade)} &nbsp;·&nbsp; ${totalCidade} equipamento(s)</td></tr>`;
        }

        // CIAs dentro desta cidade
        ordemCias.forEach(cia => {
            if (!cidadesCias[cidade][cia]) return;

            const cor      = coresCia[cia] || '#1e3a8a';
            const totalCia = Object.values(cidadesCias[cidade][cia]).reduce((s, arr) => s + arr.length, 0);
            novoConteudo += `<tr><td colspan="7" class="rpt-cia-header" style="background:${cor} !important; border-left: 5px solid rgba(255,255,255,0.4);">◆ ${esc(cia)} &nbsp;·&nbsp; ${totalCia} equipamento(s)</td></tr>`;

            // Setores dentro desta CIA
            for (const setor in cidadesCias[cidade][cia]) {
                novoConteudo += `<tr><td colspan="7" class="rpt-setor-header" style="padding-left:24px !important;">▪ Setor: ${esc(setor)} &nbsp;·&nbsp; ${cidadesCias[cidade][cia][setor].length} equipamento(s)</td></tr>`;
                novoConteudo += cidadesCias[cidade][cia][setor].join('');
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

    // Atualiza o cabeçalho da tabela principal para incluir a coluna Foto na impressão
    // (injeta um <thead> temporário que o CSS de impressão vai exibir)
    return { novoConteudo, htmlOriginal };
}

// ── CABEÇALHO DA TABELA NO PDF ────────────────────
// Troca o <thead> para incluir coluna Foto durante impressão/PDF
function trocarCabecalhoParaImpressao() {
    const thead = document.querySelector('#tabela-principal thead tr');
    if (!thead) return null;
    const htmlOrig = thead.innerHTML;
    thead.innerHTML = `
        <th scope="col" style="width:44px">#</th>
        <th scope="col" style="width:52px">Foto</th>
        <th scope="col" style="width:10%">Identificação</th>
        <th scope="col" style="width:20%">Usuário</th>
        <th scope="col" style="width:16%">Monitor / Tombamento</th>
        <th scope="col" style="width:11%">Endereço IP</th>
        <th scope="col" style="width:10%">Situação</th>
        <th scope="col">Observações</th>`;
    return htmlOrig;
}

function restaurarCabecalho(htmlOrig) {
    const thead = document.querySelector('#tabela-principal thead tr');
    if (thead && htmlOrig) thead.innerHTML = htmlOrig;
}

function imprimirRelatorio() {
    const resultado = prepararConteudoRelatorio();
    const tb = document.getElementById('corpo-tabela');
    if (!resultado) { window.print(); return; }
    tb.innerHTML = resultado.novoConteudo;
    const cabecalhoOrig = trocarCabecalhoParaImpressao();
    window.print();
    tb.innerHTML = resultado.htmlOriginal;
    restaurarCabecalho(cabecalhoOrig);
}

async function carregarHtml2Pdf() {
    if (window.html2pdf) return;
    await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        s.onload = resolve;
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
    const cabecalhoOrig = trocarCabecalhoParaImpressao();
    header.style.display = 'flex';
    footer.style.display = 'block';

    const esconder = document.querySelectorAll('.control-panel, .table-card-header, .table-footer, .no-print');
    esconder.forEach(el => el.setAttribute('data-pdf-hidden', el.style.display || ''));
    esconder.forEach(el => el.style.display = 'none');

    const appBody = document.querySelector('.app-body');
    const paddingOrig = appBody.style.padding;
    appBody.style.padding = '0';
    loading.classList.add('ativo');

    const titulo = document.getElementById('titulo-sessao').innerText;
    const nomeArquivo = `Inventario_TI_4BPM_${titulo.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;

    try {
        await carregarHtml2Pdf();
        await html2pdf().set({
            margin: [10, 8, 12, 8],
            filename: nomeArquivo,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
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
        restaurarCabecalho(cabecalhoOrig);
    }
}
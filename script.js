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
    'PIMENTA BUENO': { id: 'PB-' },
    'ESPIGÃO': { id: 'ESP-' },
    'PARECIS': { id: 'PAR-' }
};

const CORES_CIA = {
    'PCS': '#1e3a8a', '1ª CIA': '#4c1d95', '2ª CIA': '#0e7490',
    '3ª CIA': '#065f46', '4ª CIA': '#9a3412', '5ª CIA': '#831843'
};
const ORDEM_CIAS = ['PCS', '1ª CIA', '2ª CIA', '3ª CIA', '4ª CIA', '5ª CIA'];

// ── RELÓGIO ─────────────────────────────────────
function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date-display');
    if (clockEl) clockEl.innerText = now.toLocaleTimeString('pt-BR');
    if (dateEl) dateEl.innerText = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
setInterval(updateClock, 1000);
updateClock();

window.onload = async () => {
    await renderizarTabela();
    configurarMonitorDePrefixo();
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
function fecharLightbox() {
    document.getElementById('lightbox-overlay').classList.remove('ativo');
    document.getElementById('lightbox-img').src = '';
}
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fecharLightbox();
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

// ══════════════════════════════════════════════════════════
// CORREÇÃO URGENTE - IMAGEM QUEBRADA NA TABELA
// O problema: base64 está sendo salvo SEM o prefixo correto
// ══════════════════════════════════════════════════════════

// SUBSTITUA a função desenharLinhas INTEIRA por esta versão:

function desenharLinhas(dados) {
    const corpo = document.getElementById('corpo-tabela');
    document.getElementById('contador-registros').innerText = `${dados.length} registro(s)`;

    if (!dados || dados.length === 0) {
        corpo.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="icon">🗂️</div><p>Nenhum registro encontrado.</p></div></td></tr>`;
        return;
    }

    corpo.innerHTML = dados.map((item, index) => {
        const badgeClass = item.situacao === 'OTIMO' ? 'badge-otimo' : item.situacao === 'BOM' ? 'badge-bom' : 'badge-manut';
        const rowClass = getRowClass(item.identificacao);

        // ═══ CORREÇÃO DO BASE64 - ADICIONA PREFIXO SE FALTAR ═══
        let thumbHTML = `<span class="thumb-none" title="Sem foto">📷</span>`;
        
        if (item.foto_base64) {
            try {
                let fotoBase64 = String(item.foto_base64).trim();
                
                if (fotoBase64 && fotoBase64 !== 'null' && fotoBase64.length > 100) {
                    
                    // Se NÃO começa com data:, adiciona o prefixo correto
                    if (!fotoBase64.startsWith('data:')) {
                        if (fotoBase64.startsWith('/9j/')) {
                            fotoBase64 = 'data:image/jpeg;base64,' + fotoBase64;
                        } else if (fotoBase64.startsWith('iVBORw')) {
                            fotoBase64 = 'data:image/png;base64,' + fotoBase64;
                        } else if (fotoBase64.startsWith('R0lG')) {
                            fotoBase64 = 'data:image/gif;base64,' + fotoBase64;
                        } else if (fotoBase64.startsWith('UklGR')) {
                            fotoBase64 = 'data:image/webp;base64,' + fotoBase64;
                        } else {
                            fotoBase64 = 'data:image/jpeg;base64,' + fotoBase64;
                        }
                    }
                    
                    const fotoSrcSafe = fotoBase64.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
                    
                    thumbHTML = `<img 
                        class="thumb-img" 
                        src="${fotoSrcSafe}" 
                        alt="Foto ${item.identificacao}" 
                        onclick="abrirLightbox('${fotoSrcSafe}')" 
                        title="Clique para ampliar"
                        onerror="this.outerHTML='<span class=\\'thumb-none\\' title=\\'Erro\\'>⚠️</span>';"
                    >`;
                }
            } catch (e) {
                thumbHTML = `<span class="thumb-none" title="Erro">⚠️</span>`;
            }
        }

        return `<tr class="${rowClass}">
                <td class="num">${index + 1}</td>
                <td class="thumb-cell no-print">${thumbHTML}</td>
                <td class="id-cell">${item.identificacao}</td>
                <td>${item.usuario}</td>
                <td class="monitor-cell">${item.monitor_info || '—'}</td>
                <td class="ip-cell">${item.ip_maquina || '—'}</td>
                <td style="text-align:center;">
                    <span class="badge-status ${badgeClass} badge-input">${item.situacao}</span>
                </td>
                <td class="obs-cell">${item.observacoes || '—'}</td>
                <td class="no-print" style="text-align:center; white-space:nowrap;">
                    <button class="btn-tbl edit" onclick="prepararEdicao(${item.id})" title="Editar">✏️</button>
                    <button class="btn-tbl del"  onclick="excluir(${item.id})"        title="Excluir">🗑️</button>
                </td>
            </tr>`;
    }).join('');
}

// ── TOAST ────────────────────────────────────────
function toast(msg, tipo = 'sucesso') {
    const icons = { sucesso: '✅', erro: '❌', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast-msg ${tipo}`;
    el.innerHTML = `<span class="toast-icon">${icons[tipo]}</span><span>${msg}</span>`;
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

    // Carregar foto existente
    carregarFotoExistente(item.foto_base64);

    document.getElementById('modalTitle').innerText = 'Editar Registro';
    document.getElementById('btnSalvar').className = 'btn-modal-save edit-mode';
    document.getElementById('btnSalvar').innerText = 'Atualizar Registro';
    abrirModal();
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
    const dados = {
        id: document.getElementById('edit-id').value || null,
        identificacao: document.getElementById('identificacao').value,
        usuario: document.getElementById('usuario').value,
        monitor_info: document.getElementById('monitor_info').value,
        ip_maquina: document.getElementById('ip_maquina').value,
        situacao: document.getElementById('situacao').value,
        observacoes: document.getElementById('observacoes').value,
        foto_base64: document.getElementById('foto_base64').value || null,
    };
    const res = await window.api.salvarComputador(dados);
    if (res.success) {
        fecharModalLimpo();
        toast(isEdicao ? 'Registro atualizado!' : 'Registro salvo!', 'sucesso');
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
    }
}

function configurarMonitorDePrefixo() {
    const inputId = document.getElementById('identificacao');
    inputId.addEventListener('input', function () {
        this.value = this.value.toUpperCase();
    });
}

function filtrarTabela() {
    const termo = document.getElementById('inputBusca').value.toLowerCase();
    const filtrados = listaAtualComputadores.filter(i =>
        i.usuario.toLowerCase().includes(termo) ||
        i.identificacao.toLowerCase().includes(termo)
    );
    desenharLinhas(filtrados);
}

// ── AGRUPAMENTO CIA/SETOR ────────────────────────
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

function agruparLinhas() {
    const linhas = Array.from(document.getElementById('corpo-tabela').querySelectorAll('tr'));
    const cias = {};
    const totais = { OTIMO: 0, BOM: 0, 'MANUTENÇÃO': 0 };

    linhas.forEach(linha => {
        if (!linha.cells || linha.cells.length < 8) return;
        // col 0=#, col 1=foto(no-print), col 2=id, col 3=usuário ...
        const id = linha.cells[2]?.innerText.trim() || '';
        const sit = linha.cells[6]?.innerText.trim().toUpperCase() || '';
        const cia = getCia(id);
        const setor = getSetorLabel(id);
        if (!cias[cia]) cias[cia] = {};
        if (!cias[cia][setor]) cias[cia][setor] = [];
        cias[cia][setor].push(linha);
        if (totais.hasOwnProperty(sit)) totais[sit]++;
    });
    return { cias, totais };
}

// ── PRÉ-VISUALIZAÇÃO ─────────────────────────────
function abrirPreview() {
    const linhas = document.getElementById('corpo-tabela').querySelectorAll('tr');
    if (!linhas.length || linhas[0]?.innerText.includes('Nenhum') || linhas[0]?.innerText.includes('Carregando')) {
        toast('Nenhum dado para visualizar.', 'info'); return;
    }

    const titulo = document.getElementById('titulo-sessao').innerText;
    const agora = new Date().toLocaleString('pt-BR');
    const { cias, totais } = agruparLinhas();
    const total = totais.OTIMO + totais.BOM + totais['MANUTENÇÃO'];

    document.getElementById('pvw-sub').innerText = titulo;
    document.getElementById('pvw-n-otimo').innerText = totais.OTIMO;
    document.getElementById('pvw-n-bom').innerText = totais.BOM;
    document.getElementById('pvw-n-manut').innerText = totais['MANUTENÇÃO'];
    document.getElementById('pvw-n-total').innerText = total;

    let zebraIdx = 0, corpoHTML = '';
    ORDEM_CIAS.filter(c => cias[c]).forEach(cia => {
        const cor = CORES_CIA[cia] || '#1e3a8a';
        const qtdCia = Object.values(cias[cia]).reduce((s, a) => s + a.length, 0);
        corpoHTML += `<tr class="pvw-cia-row" style="background:${cor};border-left:5px solid rgba(255,255,255,0.3);">
                <td colspan="6">◆ ${cia} &nbsp;·&nbsp; ${qtdCia} equipamento(s)</td></tr>`;

        for (const setor in cias[cia]) {
            corpoHTML += `<tr class="pvw-setor-row"><td colspan="6">▪ Setor: ${setor} &nbsp;·&nbsp; ${cias[cia][setor].length} equipamento(s)</td></tr>`;
            cias[cia][setor].forEach(l => {
                const id = l.cells[2]?.innerText.trim() || '';
                const usr = l.cells[3]?.innerText.trim() || '';
                const mon = l.cells[4]?.innerText.trim() || '—';
                const ip = l.cells[5]?.innerText.trim() || '—';
                const sit = l.cells[6]?.innerText.trim().toUpperCase() || '';
                const obs = l.cells[7]?.innerText.trim() || '—';
                const z = zebraIdx++ % 2 !== 0 ? 'pvw-z' : '';
                const bdg = sit === 'OTIMO' ? 'pvw-badge-otimo' : sit === 'BOM' ? 'pvw-badge-bom' : 'pvw-badge-manut';
                const sl = sit === 'OTIMO' ? 'Ótimo' : sit === 'BOM' ? 'Bom' : 'Manutenção';
                corpoHTML += `<tr class="${z}">
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
                    <strong>${titulo}</strong>
                    <span>Gerado em:</span>
                    <em>${agora}</em>
                </div>
            </div>
            <table class="pvw-table">
                <thead><tr>
                    <th style="width:10%">Identificação</th>
                    <th style="width:22%">Usuário</th>
                    <th style="width:18%">Monitor / Tombamento</th>
                    <th style="width:12%">Endereço IP</th>
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
function executarPDF() { fecharPreview(); setTimeout(salvarPDF, 220); }

// ── RELATÓRIO IMPRESSÃO / PDF ────────────────────
function prepararConteudoRelatorio() {
    const agora = new Date();
    document.getElementById('data-relatorio-texto').innerText = agora.toLocaleString('pt-BR');
    const tituloAtivo = document.getElementById('titulo-sessao').innerText;
    const rhFiltro = document.getElementById('rh-filtro-texto');
    if (rhFiltro) rhFiltro.innerText = tituloAtivo;

    const tabelaOriginal = document.getElementById('corpo-tabela');
    const linhas = Array.from(tabelaOriginal.querySelectorAll('tr'));
    if (linhas.length === 0 || linhas[0]?.innerText.includes("Nenhum")) return null;
    const htmlOriginal = tabelaOriginal.innerHTML;

    const companhias = {};
    const ordemCias = ['PCS', '1ª CIA', '2ª CIA', '3ª CIA', '4ª CIA', '5ª CIA'];
    const totais = { 'OTIMO': 0, 'BOM': 0, 'MANUTENÇÃO': 0 };
    let zebraIdx = 0;

    linhas.forEach((linha) => {
        if (!linha.cells || linha.cells.length < 8) return;
        const idTexto = linha.cells[2]?.innerText || '';
        const situacao = linha.cells[6]?.innerText.trim().toUpperCase() || '';
        const cia = getCia(idTexto);
        const setor = getSetorLabel(idTexto);
        if (!companhias[cia]) companhias[cia] = {};
        if (!companhias[cia][setor]) companhias[cia][setor] = [];

        const zebraClass = zebraIdx % 2 === 0 ? '' : 'rpt-zebra';
        zebraIdx++;
        const badgeClass = situacao === 'OTIMO' ? 'rpt-badge-otimo' : situacao === 'BOM' ? 'rpt-badge-bom' : 'rpt-badge-manut';

        let linhaMod = linha.outerHTML
            .replace(/class="([^"]*badge-status[^"]*)"/, `class="badge-status ${badgeClass}"`)
            .replace(/<tr class="[^"]*"/, `<tr class="${zebraClass}"`)
            .replace(/class="monitor-cell"/, `class="monitor-cell rpt-monitor-cell"`);

        companhias[cia][setor].push(linhaMod);
        if (totais.hasOwnProperty(situacao)) totais[situacao]++;
    });

    const coresCia = { 'PCS': '#1e3a8a', '1ª CIA': '#4c1d95', '2ª CIA': '#0e7490', '3ª CIA': '#065f46', '4ª CIA': '#9a3412', '5ª CIA': '#831843' };
    let novoConteudo = '';
    const ciasPresentes = ordemCias.filter(c => companhias[c]);

    ciasPresentes.forEach(cia => {
        const cor = coresCia[cia] || '#1e3a8a';
        const totalCia = Object.values(companhias[cia]).reduce((s, arr) => s + arr.length, 0);
        novoConteudo += `<tr><td colspan="9" class="rpt-cia-header" style="background:${cor} !important; border-left: 5px solid rgba(255,255,255,0.4);">◆ ${cia} &nbsp;·&nbsp; ${totalCia} equipamento(s)</td></tr>`;
        for (const setor in companhias[cia]) {
            novoConteudo += `<tr><td colspan="9" class="rpt-setor-header" style="padding-left:24px !important;">▪ Setor: ${setor} &nbsp;·&nbsp; ${companhias[cia][setor].length} equipamento(s)</td></tr>`;
            novoConteudo += companhias[cia][setor].join('');
        }
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

function imprimirRelatorio() {
    const resultado = prepararConteudoRelatorio();
    const tb = document.getElementById('corpo-tabela');
    if (!resultado) { window.print(); return; }
    tb.innerHTML = resultado.novoConteudo;
    window.print();
    tb.innerHTML = resultado.htmlOriginal;
}

async function salvarPDF() {
    const resultado = prepararConteudoRelatorio();
    if (!resultado) { toast('Nenhum dado para gerar PDF.', 'info'); return; }

    const loading = document.getElementById('pdf-loading');
    const header = document.getElementById('relatorio-header');
    const footer = document.getElementById('relatorio-footer');
    const tb = document.getElementById('corpo-tabela');

    tb.innerHTML = resultado.novoConteudo;
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
        await html2pdf().set({
            margin: [10, 8, 12, 8],
            filename: nomeArquivo,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        }).from(appBody).save();
    } catch (e) { toast('Erro ao gerar PDF: ' + e.message, 'erro'); }
    finally {
        loading.classList.remove('ativo');
        header.style.display = 'none';
        footer.style.display = 'none';
        appBody.style.padding = paddingOrig;
        esconder.forEach(el => {
            el.style.display = el.getAttribute('data-pdf-hidden') || '';
            el.removeAttribute('data-pdf-hidden');
        });
        tb.innerHTML = resultado.htmlOriginal;
    }
}
// ===== MEUS SIMULADOS =====
// let simulados = DB.load('simulados', []); // Já declarado no app-core.js
let editingSimuladoId = null;
let resultSimuladoId = null;

function showSimuladosView(viewId) {
    ['simulados-list-view','simulados-edit-view','simulados-result-view'].forEach(id => document.getElementById(id).classList.add('d-none'));
    document.getElementById(viewId).classList.remove('d-none');
}

// Render list
function renderSimuladosList() {
    const container = document.getElementById('simuladosListCards');
    const createCard = document.getElementById('simuladoCreateCard');
    const btnNovo = document.getElementById('btnNovoSimulado');
    const statsOverview = document.getElementById('simuladosStatsOverview');

    if (simulados.length > 0) { createCard.style.display = 'none'; btnNovo.style.display = 'block'; }
    else { createCard.style.display = 'block'; btnNovo.style.display = 'none'; }

    container.innerHTML = '';
    // Sort by date descending
    const sorted = [...simulados].sort((a, b) => new Date(b.data) - new Date(a.data));
    sorted.forEach(s => {
        const hasResult = s.resultado && s.resultado.totalQ > 0;
        let media = 0;
        let scoreText = '';
        if (hasResult) {
            if (s.tipo === 'certo_errado') {
                const erros = s.resultado.erros || 0;
                const branco = s.resultado.branco || 0;
                const anuladas = s.resultado.anuladas || 0;
                const notaLiquida = s.resultado.acertos - erros + anuladas;
                media = Math.round((notaLiquida / s.resultado.totalQ) * 100);
                scoreText = `${s.resultado.acertos} C | ${erros} E | ${branco} B | ${anuladas} Anul. | Líquido: ${notaLiquida}`;
            } else {
                media = Math.round((s.resultado.acertos / s.resultado.totalQ) * 100);
                scoreText = `${s.resultado.acertos}/${s.resultado.totalQ} acertos`;
            }
        }
        const mediaClass = media >= 70 ? 'good' : media >= 50 ? 'average' : 'bad';
        const statusClass = hasResult ? 'concluido' : 'pendente';
        const statusText = hasResult ? 'Concluído' : 'Pendente';
        const dataFmt = s.data ? new Date(s.data + 'T12:00').toLocaleDateString('pt-BR') : '-';

        const card = document.createElement('div'); card.className = 'simulado-card';
        card.innerHTML = `
            <div class="simulado-badge"><i class="bi bi-clipboard-data"></i></div>
            <div class="simulado-info">
                <div class="simulado-name">${s.nome}</div>
                <div class="simulado-meta">
                    <span><i class="bi bi-calendar3"></i> ${dataFmt}</span>
                    <span><i class="bi bi-clock"></i> ${s.hora || '-'}</span>
                    <span><i class="bi bi-trophy"></i> ${s.concursoNome || '-'}</span>
                    <span>${s.totalQuestoes || 0} questões (${s.tipo === 'certo_errado' ? 'Certo/Errado' : 'Múltipla'})</span>
                </div>
                ${hasResult ? `<div style="margin-top:8px;display:flex;align-items:center;gap:12px;">
                    <span class="media-badge ${mediaClass}">${media}%</span>
                    <span style="color:var(--text-secondary);font-size:0.85rem;">${scoreText}</span>
                    <div class="progress-bar-wrapper" style="flex:1;"><div class="progress-bar-fill" style="width:${Math.max(0, media)}%;"></div></div>
                </div>` : ''}
            </div>
            <span class="simulado-status ${statusClass}">${statusText}</span>
            <div class="simulado-actions">
                <button class="btn-exec-ciclo btn-result-sim" data-id="${s.id}" title="Registrar resultado"><i class="bi bi-pencil-square"></i></button>
                <button class="btn-actions btn-del-sim" data-id="${s.id}" title="Excluir"><i class="bi bi-trash3"></i></button>
            </div>`;
        container.appendChild(card);
    });

    container.querySelectorAll('.btn-result-sim').forEach(btn => btn.addEventListener('click', () => openResultView(parseInt(btn.dataset.id))));
    container.querySelectorAll('.btn-del-sim').forEach(btn => btn.addEventListener('click', () => {
        simulados = simulados.filter(s => s.id !== parseInt(btn.dataset.id));
        DB.save('simulados', simulados); renderSimuladosList(); showToast('Simulado excluído!');
    }));

    // Stats
    if (simulados.some(s => s.resultado && s.resultado.totalQ > 0)) {
        statsOverview.style.display = 'block';
        renderStats();
    } else {
        statsOverview.style.display = 'none';
    }
}

// Open new simulado form
function openNewSimulado() {
    editingSimuladoId = null;
    document.getElementById('simuladoEditTitle').textContent = 'Novo simulado';
    document.getElementById('simuladoNomeInput').value = '';
    document.getElementById('simuladoDataInput').value = new Date().toISOString().split('T')[0];
    document.getElementById('simuladoHoraInput').value = '14:00';
    document.getElementById('simuladoDuracaoInput').value = '5';
    document.getElementById('simuladoQuestoesInput').value = '120';
    document.getElementById('simuladoTipoSelect').value = 'tradicional';
    // Populate concursos dropdown
    const sel = document.getElementById('simuladoConcursoSelect');
    sel.innerHTML = '<option value="">Selecione o concurso</option>';
    concursos.forEach(c => { sel.innerHTML += `<option value="${c.id}">${c.nome}</option>`; });
    showSimuladosView('simulados-edit-view');
}

// Save simulado
document.getElementById('btnSalvarSimulado').addEventListener('click', () => {
    const concId = parseInt(document.getElementById('simuladoConcursoSelect').value);
    const conc = concursos.find(c => c.id === concId);
    const nome = document.getElementById('simuladoNomeInput').value.trim();
    if (!nome) { showToast('Informe o nome do simulado!'); return; }
    if (!conc) { showToast('Selecione um concurso!'); return; }

    const sim = {
        id: editingSimuladoId || Date.now(),
        nome,
        concursoId: concId,
        concursoNome: conc.nome,
        tipo: document.getElementById('simuladoTipoSelect').value || 'tradicional',
        data: document.getElementById('simuladoDataInput').value,
        hora: document.getElementById('simuladoHoraInput').value,
        duracao: parseInt(document.getElementById('simuladoDuracaoInput').value) || 5,
        totalQuestoes: parseInt(document.getElementById('simuladoQuestoesInput').value) || 120,
        resultado: null,
        disciplinas: conc.disciplinas.map(d => ({ nome: d.nome, questoes: 0, acertos: 0, erros: 0, branco: 0, anuladas: 0 }))
    };

    if (editingSimuladoId) {
        const idx = simulados.findIndex(s => s.id === editingSimuladoId);
        if (idx >= 0) { sim.resultado = simulados[idx].resultado; simulados[idx] = sim; }
    } else {
        simulados.push(sim);
    }

    DB.save('simulados', simulados);
    renderSimuladosList(); showSimuladosView('simulados-list-view');
    showToast('Simulado salvo!');
});

// Open result view
function openResultView(simId) {
    const sim = simulados.find(s => s.id === simId);
    if (!sim) return;
    resultSimuladoId = simId;

    document.getElementById('resultSimuladoNome').textContent = sim.nome;
    document.getElementById('resultSimuladoData').textContent = sim.data ? new Date(sim.data + 'T12:00').toLocaleDateString('pt-BR') : '-';
    document.getElementById('resultSimuladoConcurso').textContent = sim.concursoNome || '-';

    const isCebraspe = sim.tipo === 'certo_errado';
    document.getElementById('resultErrosContainer').style.display = isCebraspe ? 'block' : 'none';
    document.getElementById('resultBrancoContainer').style.display = isCebraspe ? 'block' : 'none';
    document.getElementById('resultAnuladasContainer').style.display = isCebraspe ? 'block' : 'none';
    document.getElementById('resultNotaLiquidaContainer').style.display = isCebraspe ? 'block' : 'none';
    document.getElementById('resultMediaLabel').textContent = isCebraspe ? 'Aproveitamento' : 'Nota / Média';

    // Fill general result
    const res = sim.resultado || { totalQ: sim.totalQuestoes || 120, acertos: 0, erros: 0, branco: 0, anuladas: 0 };
    document.getElementById('resultTotalQ').value = res.totalQ;
    document.getElementById('resultAcertos').value = res.acertos;
    document.getElementById('resultErros').value = res.erros || 0;
    document.getElementById('resultBranco').value = res.branco || 0;
    document.getElementById('resultAnuladas').value = res.anuladas || 0;
    updateResultMedia();

    // Fill per-subject
    document.getElementById('resultPorMateriaToggle').checked = false;
    document.getElementById('resultPorMateriaContent').style.display = 'none';
    renderResultMaterias(sim);

    showSimuladosView('simulados-result-view');
}

function renderResultMaterias(sim) {
    const tbody = document.getElementById('resultMateriasBody');
    const thead = document.querySelector('#resultMateriasTable thead tr');
    if (!tbody || !thead) return;

    const isCebraspe = sim.tipo === 'certo_errado';
    if (isCebraspe) {
        thead.innerHTML = `<th>Matéria</th><th>Questões</th><th>Acertos</th><th>Erros</th><th>Em Branco</th><th>Anuladas</th><th>N. Líquida</th><th>Média</th>`;
    } else {
        thead.innerHTML = `<th>Matéria</th><th>Questões</th><th>Acertos</th><th>Média</th>`;
    }

    tbody.innerHTML = '';
    if (!sim.disciplinas || !sim.disciplinas.length) return;
    sim.disciplinas.forEach((d, i) => {
        const q = d.questoes || 0;
        const a = d.acertos || 0;
        const e = d.erros || 0;
        const b = d.branco || 0;
        const an = d.anuladas || 0;
        let media = 0;
        let trHtml = '';

        if (isCebraspe) {
            const nl = a - e + an;
            media = q > 0 ? Math.round((nl / q) * 100) : 0;
            trHtml = `<td>${d.nome}</td>
                <td><input type="number" class="input-mentor result-mat-q" data-idx="${i}" value="${q}" min="0" style="width:60px;"></td>
                <td><input type="number" class="input-mentor result-mat-a" data-idx="${i}" value="${a}" min="0" style="width:60px;"></td>
                <td><input type="number" class="input-mentor result-mat-e" data-idx="${i}" value="${e}" min="0" style="width:60px;"></td>
                <td><input type="number" class="input-mentor result-mat-b" data-idx="${i}" value="${b}" min="0" style="width:60px;"></td>
                <td><input type="number" class="input-mentor result-mat-an" data-idx="${i}" value="${an}" min="0" style="width:60px;"></td>
                <td><span class="nota-liquida-badge" style="font-weight:700;color:var(--accent-yellow);">${nl}</span></td>
                <td><span class="media-badge ${media >= 70 ? 'good' : media >= 50 ? 'average' : 'bad'}">${media}%</span></td>`;
        } else {
            media = q > 0 ? Math.round((a / q) * 100) : 0;
            trHtml = `<td>${d.nome}</td>
                <td><input type="number" class="input-mentor result-mat-q" data-idx="${i}" value="${q}" min="0" style="width:70px;"></td>
                <td><input type="number" class="input-mentor result-mat-a" data-idx="${i}" value="${a}" min="0" style="width:70px;"></td>
                <td><span class="media-badge ${media >= 70 ? 'good' : media >= 50 ? 'average' : 'bad'}">${media}%</span></td>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = trHtml;
        tbody.appendChild(tr);
    });

    // Live update per-materia
    tbody.querySelectorAll('.result-mat-q, .result-mat-a, .result-mat-e, .result-mat-b, .result-mat-an').forEach(inp => {
        inp.addEventListener('input', () => {
            const idx = parseInt(inp.dataset.idx);
            const sim = simulados.find(s => s.id === resultSimuladoId);
            if (!sim) return;

            if (inp.classList.contains('result-mat-q')) sim.disciplinas[idx].questoes = parseInt(inp.value) || 0;
            else if (inp.classList.contains('result-mat-a')) sim.disciplinas[idx].acertos = parseInt(inp.value) || 0;
            else if (inp.classList.contains('result-mat-e')) sim.disciplinas[idx].erros = parseInt(inp.value) || 0;
            else if (inp.classList.contains('result-mat-b')) sim.disciplinas[idx].branco = parseInt(inp.value) || 0;
            else if (inp.classList.contains('result-mat-an')) sim.disciplinas[idx].anuladas = parseInt(inp.value) || 0;

            // Update media badge
            const q = sim.disciplinas[idx].questoes || 0, a = sim.disciplinas[idx].acertos || 0, e = sim.disciplinas[idx].erros || 0, b = sim.disciplinas[idx].branco || 0, an = sim.disciplinas[idx].anuladas || 0;
            let m = 0;
            if (isCebraspe) {
                const nl = a - e + an;
                m = q > 0 ? Math.round((nl / q) * 100) : 0;
                inp.closest('tr').querySelector('.nota-liquida-badge').textContent = nl;
            } else {
                m = q > 0 ? Math.round((a / q) * 100) : 0;
            }
            const badge = inp.closest('tr').querySelector('.media-badge');
            badge.textContent = m + '%';
            badge.className = `media-badge ${m >= 70 ? 'good' : m >= 50 ? 'average' : 'bad'}`;
        });
    });
}

function updateResultMedia() {
    const sim = simulados.find(s => s.id === resultSimuladoId);
    const isCebraspe = sim && sim.tipo === 'certo_errado';

    const total = parseInt(document.getElementById('resultTotalQ').value) || 0;
    const acertos = parseInt(document.getElementById('resultAcertos').value) || 0;
    const erros = isCebraspe ? (parseInt(document.getElementById('resultErros').value) || 0) : 0;
    const branco = isCebraspe ? (parseInt(document.getElementById('resultBranco').value) || 0) : 0;
    const anuladas = isCebraspe ? (parseInt(document.getElementById('resultAnuladas').value) || 0) : 0;

    let pct = 0;
    if (isCebraspe) {
        const nl = acertos - erros + anuladas;
        document.getElementById('resultNotaLiquida').textContent = nl;
        pct = total > 0 ? Math.round((nl / total) * 100) : 0;
    } else {
        pct = total > 0 ? Math.round((acertos / total) * 100) : 0;
    }
    document.getElementById('resultMedia').textContent = pct + '%';
    document.getElementById('resultMedia').style.color = pct >= 70 ? 'var(--accent-green-light)' : pct >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)';
}

document.getElementById('resultTotalQ').addEventListener('input', updateResultMedia);
document.getElementById('resultAcertos').addEventListener('input', updateResultMedia);
document.getElementById('resultErros').addEventListener('input', updateResultMedia);
document.getElementById('resultBranco').addEventListener('input', updateResultMedia);
document.getElementById('resultAnuladas').addEventListener('input', updateResultMedia);
document.getElementById('resultPorMateriaToggle').addEventListener('change', function() {
    document.getElementById('resultPorMateriaContent').style.display = this.checked ? 'block' : 'none';
});

// Save result
document.getElementById('btnSalvarResultado').addEventListener('click', () => {
    const sim = simulados.find(s => s.id === resultSimuladoId);
    if (!sim) return;
    const isCebraspe = sim.tipo === 'certo_errado';

    sim.resultado = {
        totalQ: parseInt(document.getElementById('resultTotalQ').value) || 0,
        acertos: parseInt(document.getElementById('resultAcertos').value) || 0,
        erros: isCebraspe ? (parseInt(document.getElementById('resultErros').value) || 0) : 0,
        branco: isCebraspe ? (parseInt(document.getElementById('resultBranco').value) || 0) : 0,
        anuladas: isCebraspe ? (parseInt(document.getElementById('resultAnuladas').value) || 0) : 0,
        dataRegistro: new Date().toISOString()
    };
    // Save per-materia
    if (document.getElementById('resultPorMateriaToggle').checked && sim.disciplinas) {
        document.querySelectorAll('.result-mat-q').forEach(inp => { sim.disciplinas[parseInt(inp.dataset.idx)].questoes = parseInt(inp.value) || 0; });
        document.querySelectorAll('.result-mat-a').forEach(inp => { sim.disciplinas[parseInt(inp.dataset.idx)].acertos = parseInt(inp.value) || 0; });
        if (isCebraspe) {
            document.querySelectorAll('.result-mat-e').forEach(inp => { sim.disciplinas[parseInt(inp.dataset.idx)].erros = parseInt(inp.value) || 0; });
            document.querySelectorAll('.result-mat-b').forEach(inp => { sim.disciplinas[parseInt(inp.dataset.idx)].branco = parseInt(inp.value) || 0; });
            document.querySelectorAll('.result-mat-an').forEach(inp => { sim.disciplinas[parseInt(inp.dataset.idx)].anuladas = parseInt(inp.value) || 0; });
        }
    }
    DB.save('simulados', simulados);
    if (typeof updateMetasDashboard === 'function') updateMetasDashboard();
    renderSimuladosList(); showSimuladosView('simulados-list-view');
    showToast('Resultado salvo com sucesso!');
});

// Stats
function renderStats() {
    const withResult = simulados.filter(s => s.resultado && s.resultado.totalQ > 0);
    const totalSim = withResult.length;
    const totalQ = withResult.reduce((s, sim) => s + sim.resultado.totalQ, 0);
    const totalA = withResult.reduce((s, sim) => s + sim.resultado.acertos, 0);
    
    // Weighted liquid score for media geral
    let totalPontosLiquidos = 0;
    withResult.forEach(sim => {
        if (sim.tipo === 'certo_errado') {
            totalPontosLiquidos += (sim.resultado.acertos - (sim.resultado.erros || 0) + (sim.resultado.anuladas || 0));
        } else {
            totalPontosLiquidos += sim.resultado.acertos;
        }
    });
    
    const mediaGeral = totalQ > 0 ? Math.round((totalPontosLiquidos / totalQ) * 100) : 0;

    document.getElementById('statTotalSimulados').textContent = totalSim;
    document.getElementById('statMediaGeral').textContent = mediaGeral + '%';
    document.getElementById('statTotalQuestoes').textContent = totalQ;
    document.getElementById('statTotalAcertos').textContent = totalA;

    // Per-materia stats
    const materiaMap = {};
    withResult.forEach(sim => {
        if (!sim.disciplinas) return;
        const isCebraspe = sim.tipo === 'certo_errado';
        sim.disciplinas.forEach(d => {
            if (d.questoes <= 0) return;
            if (!materiaMap[d.nome]) materiaMap[d.nome] = { questoes: 0, acertos: 0, erros: 0, pontos: 0, simulados: [] };
            
            materiaMap[d.nome].questoes += d.questoes;
            materiaMap[d.nome].acertos += d.acertos;
            
            const e = d.erros || 0;
            const b = d.branco || 0;
            const an = d.anuladas || 0;
            materiaMap[d.nome].erros += e;
            if (!materiaMap[d.nome].hasOwnProperty('branco')) materiaMap[d.nome].branco = 0;
            if (!materiaMap[d.nome].hasOwnProperty('anuladas')) materiaMap[d.nome].anuladas = 0;
            materiaMap[d.nome].branco += b;
            materiaMap[d.nome].anuladas += an;
            const pts = isCebraspe ? (d.acertos - e + an) : d.acertos;
            materiaMap[d.nome].pontos += pts;
            
            materiaMap[d.nome].simulados.push({ q: d.questoes, a: d.acertos, e: e, b: b, an: an, tipo: sim.tipo });
        });
    });

    const tbody = document.getElementById('statsMateriasBody'); tbody.innerHTML = '';
    Object.keys(materiaMap).sort().forEach(nome => {
        const m = materiaMap[nome];
        const media = Math.round((m.pontos / m.questoes) * 100);
        const mediaClass = media >= 70 ? 'good' : media >= 50 ? 'average' : 'bad';
        // Evolution: compare last 2 simulados
        let evolHtml = '<span style="color:var(--text-muted);">-</span>';
        if (m.simulados.length >= 2) {
            const last = m.simulados[m.simulados.length - 1];
            const prev = m.simulados[m.simulados.length - 2];
            
            const lastPts = last.tipo === 'certo_errado' ? (last.a - last.e + (last.an || 0)) : last.a;
            const prevPts = prev.tipo === 'certo_errado' ? (prev.a - prev.e + (prev.an || 0)) : prev.a;
            
            const lastPct = Math.round((lastPts / last.q) * 100);
            const prevPct = Math.round((prevPts / prev.q) * 100);
            const diff = lastPct - prevPct;
            if (diff > 0) evolHtml = `<span style="color:var(--accent-green-light);">▲ +${diff}%</span>`;
            else if (diff < 0) evolHtml = `<span style="color:var(--accent-red);">▼ ${diff}%</span>`;
            else evolHtml = `<span style="color:var(--accent-yellow);">= 0%</span>`;
        }
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${nome}</td><td>${m.questoes}</td><td>${m.acertos}</td>
            <td><span class="media-badge ${mediaClass}">${media}%</span>
            <div class="progress-bar-wrapper"><div class="progress-bar-fill" style="width:${Math.max(0, media)}%;"></div></div></td>
            <td>${evolHtml}</td>`;
        tbody.appendChild(tr);
    });
}

// Nav events
document.getElementById('btnStartSimulado').addEventListener('click', openNewSimulado);
document.getElementById('btnNovoSimulado').addEventListener('click', openNewSimulado);
document.getElementById('backToSimuladosList').addEventListener('click', (e) => { e.preventDefault(); showSimuladosView('simulados-list-view'); });
document.getElementById('backToSimuladosFromResult').addEventListener('click', (e) => { e.preventDefault(); showSimuladosView('simulados-list-view'); });

// Init
renderSimuladosList();

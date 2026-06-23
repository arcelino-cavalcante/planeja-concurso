// ===== METAS DE NOTAS MODULE =====
let editingMetaId = null;

function showMetasView(viewId) {
    ['metas-empty-view', 'metas-create-view', 'metas-dashboard-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('d-none');
    });
    const activeEl = document.getElementById(viewId);
    if (activeEl) activeEl.classList.remove('d-none');
}

// Main entry point called when user clicks navigation menu
function renderMetas() {
    populateMetaConcursosSelect();
    
    if (metas && metas.length > 0) {
        showMetasView('metas-dashboard-view');
        updateMetasDashboard();
    } else {
        showMetasView('metas-empty-view');
    }
}

function populateMetaConcursosSelect() {
    const sel = document.getElementById('metaConcursoSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione o concurso</option>';
    concursos.forEach(c => {
        sel.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
    });
}

// Function to update input labels and placeholders based on periodicity
function updatePeriodicityLabels() {
    const periodicity = document.getElementById('metaPeriodicidade').value || 'semanal';
    const label = document.getElementById('lblMetaSemanasInput');
    const input = document.getElementById('metaSemanasInput');
    
    if (!label || !input) return;
    
    if (periodicity === 'mensal') {
        label.textContent = 'Ou informe o número de meses';
        input.placeholder = 'Quantidade de meses';
        input.min = 2;
        input.max = 12;
    } else if (periodicity === 'trimestral') {
        label.textContent = 'Ou informe o número de trimestres';
        input.placeholder = 'Quantidade de trimestres';
        input.min = 2;
        input.max = 4;
    } else {
        label.textContent = 'Ou informe o número de semanas';
        input.placeholder = 'Quantidade de semanas';
        input.min = 2;
        input.max = 52;
    }
}

// Listen for periodicity selector change
document.getElementById('metaPeriodicidade')?.addEventListener('change', function() {
    updatePeriodicityLabels();
    recalculatePeriodCountFromDate();
});

// Prefill form values based on selected concurso
document.getElementById('metaConcursoSelect')?.addEventListener('change', function() {
    const concId = parseInt(this.value);
    const conc = concursos.find(c => c.id === concId);
    if (conc) {
        const totalQ = conc.disciplinas.reduce((acc, d) => acc + (d.peso || 0), 0);
        document.getElementById('metaTotalQuestoes').value = totalQ || 120;
    }
});

function recalculatePeriodCountFromDate() {
    const dateVal = document.getElementById('metaDataProva').value;
    if (!dateVal) return;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const examDate = new Date(dateVal + 'T12:00:00');
    
    const diffTime = examDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const periodicity = document.getElementById('metaPeriodicidade').value || 'semanal';
    let periods = 0;
    
    if (periodicity === 'mensal') {
        periods = Math.max(2, Math.ceil(diffDays / 30));
    } else if (periodicity === 'trimestral') {
        periods = Math.max(2, Math.ceil(diffDays / 90));
    } else {
        periods = Math.max(2, Math.ceil(diffDays / 7));
    }
    
    document.getElementById('metaSemanasInput').value = periods;
}

// Calculate periods automatically based on date selected
document.getElementById('metaDataProva')?.addEventListener('change', recalculatePeriodCountFromDate);

// Open creation view
document.getElementById('btnCriarPrimeiraMeta')?.addEventListener('click', () => {
    populateMetaConcursosSelect();
    editingMetaId = null;
    document.getElementById('metaFormTitle').textContent = 'Novo planejamento de metas';
    document.getElementById('metaConcursoSelect').value = '';
    document.getElementById('metaTotalQuestoes').value = '';
    document.getElementById('metaTipoCorrecao').value = 'tradicional';
    document.getElementById('metaPeriodicidade').value = 'semanal';
    updatePeriodicityLabels();
    document.getElementById('metaNotaUltima').value = '';
    document.getElementById('metaAcertosFinal').value = '';
    document.getElementById('metaDataProva').value = '';
    document.getElementById('metaSemanasInput').value = '';
    showMetasView('metas-create-view');
});

// Label adjustments based on correction type (Traditional vs Cebraspe)
document.getElementById('metaTipoCorrecao')?.addEventListener('change', function() {
    const isCebraspe = this.value === 'certo_errado';
    document.getElementById('lblNotaUltimaProva').textContent = isCebraspe ? 'Nota líquida última prova' : 'Nota/Acertos da última prova';
    document.getElementById('lblMetaAcertosFinal').textContent = isCebraspe ? 'Meta final (Nota líquida desejada)' : 'Meta final (Acertos desejados)';
});

// Cancel button
document.getElementById('btnCancelarMeta')?.addEventListener('click', () => {
    renderMetas();
});

document.getElementById('backToMetasDashboardFromCreate')?.addEventListener('click', (e) => {
    e.preventDefault();
    renderMetas();
});

// Save Meta
document.getElementById('btnSalvarMeta')?.addEventListener('click', () => {
    const concId = parseInt(document.getElementById('metaConcursoSelect').value);
    const conc = concursos.find(c => c.id === concId);
    if (!conc) { showToast('Selecione um concurso!'); return; }
    
    const totalQ = parseInt(document.getElementById('metaTotalQuestoes').value) || 120;
    const tipoCorrecao = document.getElementById('metaTipoCorrecao').value;
    const periodicidade = document.getElementById('metaPeriodicidade').value || 'semanal';
    const notaUltima = parseInt(document.getElementById('metaNotaUltima').value);
    const metaAcertosFinal = parseInt(document.getElementById('metaAcertosFinal').value);
    const dataProva = document.getElementById('metaDataProva').value;
    const semanas = parseInt(document.getElementById('metaSemanasInput').value); // weeks / months / quarters count
    
    if (isNaN(notaUltima) || notaUltima < 0) { showToast('Informe a nota da última prova!'); return; }
    if (isNaN(metaAcertosFinal) || metaAcertosFinal <= notaUltima) { showToast('A meta final deve ser maior que a nota da última prova!'); return; }
    if (metaAcertosFinal > totalQ) { showToast('A meta final não pode ser maior que o total de questões!'); return; }
    if (isNaN(semanas) || semanas < 2) { showToast('Informe um prazo de pelo menos 2 períodos!'); return; }
    
    const startDate = new Date().toISOString().split('T')[0];
    
    // Generate linear weekly/monthly/quarterly goals
    const progressSemanas = [];
    const step = (metaAcertosFinal - notaUltima) / semanas;
    
    for (let w = 1; w <= semanas; w++) {
        const target = Math.round(notaUltima + step * w);
        const finalTarget = w === semanas ? metaAcertosFinal : target;
        progressSemanas.push({
            semana: w, // period index
            targetScore: finalTarget,
            targetPercent: Math.round((finalTarget / totalQ) * 100),
            notaRegistrada: null,
            simuladoId: null,
            overrideManual: false,
            status: 'Pendente'
        });
    }
    
    const metaObj = {
        id: editingMetaId || Date.now(),
        concursoId: concId,
        concursoNome: conc.nome,
        totalQuestoes: totalQ,
        tipoCorrecao,
        periodicidade,
        notaUltima,
        metaAcertosFinal,
        dataProva,
        semanas, // quantity of periods
        startDate,
        semanasProgresso: progressSemanas
    };
    
    if (editingMetaId) {
        const idx = metas.findIndex(m => m.id === editingMetaId);
        if (idx !== -1) {
            const oldMeta = metas[idx];
            metaObj.semanasProgresso.forEach(newW => {
                const oldW = oldMeta.semanasProgresso.find(ow => ow.semana === newW.semana);
                if (oldW) {
                    newW.notaRegistrada = oldW.notaRegistrada;
                    newW.simuladoId = oldW.simuladoId;
                    newW.overrideManual = oldW.overrideManual;
                    newW.status = oldW.status;
                }
            });
            metas[idx] = metaObj;
        }
    } else {
        metas = [metaObj];
    }
    
    saveAll();
    renderMetas();
    showToast('Planejamento de metas gerado!');
});

// Edit active meta
document.getElementById('btnEditarMetaAtiva')?.addEventListener('click', () => {
    if (!metas || metas.length === 0) return;
    const activeMeta = metas[0];
    populateMetaConcursosSelect();
    editingMetaId = activeMeta.id;
    
    document.getElementById('metaFormTitle').textContent = 'Editar planejamento de metas';
    document.getElementById('metaConcursoSelect').value = activeMeta.concursoId;
    document.getElementById('metaTotalQuestoes').value = activeMeta.totalQuestoes;
    document.getElementById('metaTipoCorrecao').value = activeMeta.tipoCorrecao || 'tradicional';
    document.getElementById('metaPeriodicidade').value = activeMeta.periodicidade || 'semanal';
    updatePeriodicityLabels();
    document.getElementById('metaNotaUltima').value = activeMeta.notaUltima;
    document.getElementById('metaAcertosFinal').value = activeMeta.metaAcertosFinal;
    document.getElementById('metaDataProva').value = activeMeta.dataProva || '';
    document.getElementById('metaSemanasInput').value = activeMeta.semanas;
    
    // Trigger label change
    const isCebraspe = activeMeta.tipoCorrecao === 'certo_errado';
    document.getElementById('lblNotaUltimaProva').textContent = isCebraspe ? 'Nota líquida última prova' : 'Nota/Acertos da última prova';
    document.getElementById('lblMetaAcertosFinal').textContent = isCebraspe ? 'Meta final (Nota líquida desejada)' : 'Meta final (Acertos desejados)';
    
    showMetasView('metas-create-view');
});

// Delete active meta
document.getElementById('btnExcluirMetaAtiva')?.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja apagar todo o planejamento de metas atual?')) {
        metas = [];
        saveAll();
        renderMetas();
        showToast('Planejamento de metas excluído!');
    }
});

// Update dashboard page details
function updateMetasDashboard() {
    if (!metas || metas.length === 0) return;
    const activeMeta = metas[0];
    
    // Fill text indicators
    document.getElementById('metaDashboardTitle').textContent = activeMeta.concursoNome;
    
    // Period text formatter
    const pLabelSingular = activeMeta.periodicidade === 'mensal' ? 'mês' : activeMeta.periodicidade === 'trimestral' ? 'trimestre' : 'semana';
    const pLabelPlural = activeMeta.periodicidade === 'mensal' ? 'meses' : activeMeta.periodicidade === 'trimestral' ? 'trimestres' : 'semanas';
    const pLabelHeader = activeMeta.periodicidade === 'mensal' ? 'Mês' : activeMeta.periodicidade === 'trimestral' ? 'Trimestre' : 'Semana';
    
    // Exam date format
    let dataFmt = '-';
    let periodosRestantes = '-';
    if (activeMeta.dataProva) {
        dataFmt = new Date(activeMeta.dataProva + 'T12:00:00').toLocaleDateString('pt-BR');
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const examDate = new Date(activeMeta.dataProva + 'T12:00:00');
        const diff = examDate - today;
        const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
        
        if (activeMeta.periodicidade === 'mensal') {
            periodosRestantes = Math.max(0, Math.ceil(diffDays / 30));
        } else if (activeMeta.periodicidade === 'trimestral') {
            periodosRestantes = Math.max(0, Math.ceil(diffDays / 90));
        } else {
            periodosRestantes = Math.max(0, Math.ceil(diffDays / 7));
        }
    } else {
        periodosRestantes = activeMeta.semanas;
    }
    
    document.getElementById('metaDashboardDataProva').textContent = dataFmt;
    document.getElementById('metaDashboardSemanasRestantes').textContent = periodosRestantes + ' ' + (periodosRestantes === 1 ? pLabelSingular : pLabelPlural);
    
    // Calculate weeks progress automatically by dates
    autoAssociateSimulados(activeMeta);
    
    // Render Stats
    document.getElementById('metaStatUltima').textContent = activeMeta.notaUltima;
    document.getElementById('metaStatFinal').textContent = activeMeta.metaAcertosFinal;
    
    // Best score recorded
    let bestScore = activeMeta.notaUltima;
    activeMeta.semanasProgresso.forEach(w => {
        if (w.notaRegistrada !== null && w.notaRegistrada > bestScore) {
            bestScore = w.notaRegistrada;
        }
    });
    
    document.getElementById('metaStatAtual').textContent = bestScore;
    
    // Overall progress percentage
    const targetDiff = activeMeta.metaAcertosFinal - activeMeta.notaUltima;
    const currentDiff = bestScore - activeMeta.notaUltima;
    const pct = targetDiff > 0 ? Math.max(0, Math.min(100, Math.round((currentDiff / targetDiff) * 100))) : 0;
    document.getElementById('metaStatProgresso').textContent = pct + '%';
    
    // Render Milestone Cards
    renderMilestoneCards(activeMeta, pLabelHeader, pLabelSingular);
    
    // Draw SVG Line Chart
    drawEvolutionChart(activeMeta, pLabelHeader);
}

// Auto link mock exams to periods based on dates
function autoAssociateSimulados(meta) {
    const isCebraspe = meta.tipoCorrecao === 'certo_errado';
    const start = new Date(meta.startDate + 'T00:00:00');
    
    const periodDays = meta.periodicidade === 'mensal' ? 30 : meta.periodicidade === 'trimestral' ? 90 : 7;
    
    meta.semanasProgresso.forEach(w => {
        if (w.overrideManual) return;
        
        // Date range of this period
        const periodStart = new Date(start.getTime() + (w.semana - 1) * periodDays * 24 * 60 * 60 * 1000);
        const periodEnd = new Date(start.getTime() + w.semana * periodDays * 24 * 60 * 60 * 1000);
        
        let bestMock = null;
        let bestMockScore = -Infinity;
        
        simulados.forEach(s => {
            if (s.concursoId === meta.concursoId && s.resultado && s.resultado.totalQ > 0) {
                const sDate = new Date(s.data + 'T12:00:00');
                if (sDate >= periodStart && sDate < periodEnd) {
                    const score = isCebraspe ? (s.resultado.acertos - (s.resultado.erros || 0) + (s.resultado.anuladas || 0)) : s.resultado.acertos;
                    if (score > bestMockScore) {
                        bestMockScore = score;
                        bestMock = s;
                    }
                }
            }
        });
        
        if (bestMock) {
            w.simuladoId = bestMock.id;
            w.notaRegistrada = bestMockScore;
        } else {
            w.simuladoId = null;
            w.notaRegistrada = null;
        }
        
        updateWeekStatus(w, meta);
    });
}

function updateWeekStatus(w, meta) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(meta.startDate + 'T00:00:00');
    const periodDays = meta.periodicidade === 'mensal' ? 30 : meta.periodicidade === 'trimestral' ? 90 : 7;
    const periodEnd = new Date(start.getTime() + w.semana * periodDays * 24 * 60 * 60 * 1000);
    
    if (w.notaRegistrada !== null) {
        if (w.notaRegistrada >= w.targetScore) {
            w.status = 'Batida';
        } else {
            w.status = 'Não Batida';
        }
    } else {
        if (periodEnd < today) {
            w.status = 'Não Batida';
        } else {
            w.status = 'Pendente';
        }
    }
}

// Render weekly/monthly/quarterly goal cards
function renderMilestoneCards(meta, pLabelHeader, pLabelSingular) {
    const grid = document.getElementById('metaSemanasGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const isCebraspe = meta.tipoCorrecao === 'certo_errado';
    const start = new Date(meta.startDate + 'T00:00:00');
    const periodDays = meta.periodicidade === 'mensal' ? 30 : meta.periodicidade === 'trimestral' ? 90 : 7;
    
    meta.semanasProgresso.forEach((w, idx) => {
        const periodStart = new Date(start.getTime() + (w.semana - 1) * periodDays * 24 * 60 * 60 * 1000);
        const periodEnd = new Date(start.getTime() + w.semana * periodDays * 24 * 60 * 60 * 1000);
        const dateFmt = `${periodStart.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} a ${periodEnd.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}`;
        
        let badgeClass = 'pendente';
        if (w.status === 'Batida') badgeClass = 'ativa';
        else if (w.status === 'Não Batida') badgeClass = 'desativada';
        
        const card = document.createElement('div');
        card.className = 'card-mentor';
        card.style.borderLeftColor = w.status === 'Batida' ? 'var(--accent-green-light)' : w.status === 'Não Batida' ? 'var(--accent-red)' : 'var(--border-accent)';
        
        let mockOptions = '<option value="">— Sem simulado —</option>';
        const relevantMocks = simulados.filter(s => s.concursoId === meta.concursoId && s.resultado && s.resultado.totalQ > 0);
        relevantMocks.forEach(s => {
            const score = isCebraspe ? (s.resultado.acertos - (s.resultado.erros || 0) + (s.resultado.anuladas || 0)) : s.resultado.acertos;
            mockOptions += `<option value="${s.id}" ${w.simuladoId === s.id ? 'selected' : ''}>${s.nome} (${score} pts)</option>`;
        });
        
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-family:var(--font-heading); font-size:1.1rem; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--text-primary);">${pLabelHeader} ${w.semana}</span>
                <span class="status-badge ${badgeClass}">${w.status}</span>
            </div>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:12px;"><i class="bi bi-calendar3"></i> Período: ${dateFmt}</div>
            
            <div style="margin-bottom:14px; background:rgba(255,255,255,0.02); padding:8px 12px; border:1px solid var(--border-color); border-radius:2px;">
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
                    <span style="color:var(--text-secondary);">Meta a bater:</span>
                    <strong style="color:var(--accent-green-light);">${w.targetScore} acertos (${w.targetPercent}%)</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                    <span style="color:var(--text-secondary);">Resultado real:</span>
                    <strong style="color:${w.notaRegistrada >= w.targetScore ? 'var(--accent-green-light)' : w.notaRegistrada !== null ? 'var(--accent-red)' : 'var(--text-muted)'};">
                        ${w.notaRegistrada !== null ? `${w.notaRegistrada} acertos` : '—'}
                    </strong>
                </div>
            </div>
            
            <div class="form-group" style="margin-bottom:8px;">
                <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">Vincular simulado:</label>
                <select class="input-mentor select-meta-mock" data-idx="${idx}" style="font-size:0.8rem; padding:6px 10px;">
                    ${mockOptions}
                </select>
            </div>
            
            <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-top:8px;">
                <span>Ou digite nota manual:</span>
                <input type="number" class="input-mentor input-meta-nota-manual" data-idx="${idx}" value="${w.simuladoId === null && w.notaRegistrada !== null ? w.notaRegistrada : ''}" placeholder="pts" style="width:55px; padding:2px 6px; text-align:center; font-size:0.8rem;">
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    // Attach listener for manual mock exam select
    grid.querySelectorAll('.select-meta-mock').forEach(sel => {
        sel.addEventListener('change', function() {
            const idx = parseInt(this.dataset.idx);
            const w = meta.semanasProgresso[idx];
            const val = this.value;
            
            if (val === "") {
                w.simuladoId = null;
                w.notaRegistrada = null;
                w.overrideManual = false;
            } else {
                const sId = parseInt(val);
                const s = simulados.find(x => x.id === sId);
                if (s) {
                    w.simuladoId = sId;
                    w.notaRegistrada = isCebraspe ? (s.resultado.acertos - (s.resultado.erros || 0) + (s.resultado.anuladas || 0)) : s.resultado.acertos;
                    w.overrideManual = true;
                }
            }
            
            updateWeekStatus(w, meta);
            saveAll();
            updateMetasDashboard();
        });
    });
    
    // Attach listener for manual typed score
    grid.querySelectorAll('.input-meta-nota-manual').forEach(inp => {
        inp.addEventListener('change', function() {
            const idx = parseInt(this.dataset.idx);
            const w = meta.semanasProgresso[idx];
            const val = this.value.trim();
            
            if (val === "") {
                w.overrideManual = false;
                w.notaRegistrada = null;
            } else {
                w.notaRegistrada = parseInt(val) || 0;
                w.simuladoId = null;
                w.overrideManual = true;
            }
            
            updateWeekStatus(w, meta);
            saveAll();
            updateMetasDashboard();
        });
    });
}

// Draw SVG Progress Chart
function drawEvolutionChart(meta, pLabelHeader) {
    const svg = document.getElementById('metaEvolutionChart');
    if (!svg) return;
    svg.innerHTML = '';
    
    const width = 800;
    const height = 220;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 30;
    
    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;
    
    const maxScore = meta.totalQuestoes || 120;
    
    // Helpers to project coordinates
    const getX = (semanaIndex) => {
        return paddingLeft + (semanaIndex / meta.semanas) * graphWidth;
    };
    
    const getY = (score) => {
        const clamped = Math.max(0, Math.min(maxScore, score));
        return paddingTop + graphHeight - (clamped / maxScore) * graphHeight;
    };
    
    // 1. Draw grid lines (horizontal ticks)
    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
        const scoreVal = Math.round((maxScore / yTicks) * i);
        const y = getY(scoreVal);
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', paddingLeft);
        line.setAttribute('y1', y);
        line.setAttribute('x2', width - paddingRight);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', '#222');
        line.setAttribute('stroke-width', '1');
        if (i > 0 && i < yTicks) line.setAttribute('stroke-dasharray', '4 4');
        svg.appendChild(line);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', paddingLeft - 8);
        text.setAttribute('y', y + 4);
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('fill', 'var(--text-muted)');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-family', 'var(--font-body)');
        text.textContent = scoreVal;
        svg.appendChild(text);
    }
    
    // 2. Draw labels on X axis
    const shortLabel = pLabelHeader === 'Trimestre' ? 'TRI' : pLabelHeader === 'Mês' ? 'MÊS' : 'SEM';
    for (let i = 0; i <= meta.semanas; i++) {
        const x = getX(i);
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', paddingTop + graphHeight);
        line.setAttribute('x2', x);
        line.setAttribute('y2', paddingTop + graphHeight + 5);
        line.setAttribute('stroke', '#333');
        line.setAttribute('stroke-width', '1');
        svg.appendChild(line);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', paddingTop + graphHeight + 18);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'var(--text-muted)');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-family', 'var(--font-heading)');
        text.setAttribute('font-weight', '700');
        text.textContent = i === 0 ? 'INÍCIO' : `${shortLabel} ${i}`;
        svg.appendChild(text);
    }
    
    // 3. Draw Target Line (Linear Goal)
    let targetPoints = `M${getX(0)},${getY(meta.notaUltima)}`;
    for (let i = 1; i <= meta.semanas; i++) {
        const target = meta.semanasProgresso[i - 1].targetScore;
        targetPoints += ` L${getX(i)},${getY(target)}`;
    }
    
    const targetPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    targetPath.setAttribute('d', targetPoints);
    targetPath.setAttribute('fill', 'none');
    targetPath.setAttribute('stroke', '#444');
    targetPath.setAttribute('stroke-width', '2.5');
    targetPath.setAttribute('stroke-dasharray', '5 3');
    svg.appendChild(targetPath);
    
    // 4. Draw Real Line
    const realCoords = [{ x: getX(0), y: getY(meta.notaUltima), score: meta.notaUltima, label: 'Nota Inicial' }];
    meta.semanasProgresso.forEach(w => {
        if (w.notaRegistrada !== null) {
            realCoords.push({
                x: getX(w.semana),
                y: getY(w.notaRegistrada),
                score: w.notaRegistrada,
                label: `${pLabelHeader} ${w.semana}`,
                targetScore: w.targetScore,
                status: w.status
            });
        }
    });
    
    if (realCoords.length > 1) {
        let realPoints = `M${realCoords[0].x},${realCoords[0].y}`;
        for (let i = 1; i < realCoords.length; i++) {
            realPoints += ` L${realCoords[i].x},${realCoords[i].y}`;
        }
        
        const realPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        realPath.setAttribute('d', realPoints);
        realPath.setAttribute('fill', 'none');
        realPath.setAttribute('stroke', 'var(--accent-yellow)');
        realPath.setAttribute('stroke-width', '3');
        svg.appendChild(realPath);
    }
    
    // DOM reference to tooltip
    const tooltipEl = document.getElementById('chartTooltip');
    
    // 5. Draw target dots and tooltips
    for (let i = 0; i <= meta.semanas; i++) {
        const score = i === 0 ? meta.notaUltima : meta.semanasProgresso[i - 1].targetScore;
        const percent = Math.round((score / maxScore) * 100);
        const x = getX(i);
        const y = getY(score);
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '5');
        circle.setAttribute('fill', '#262626');
        circle.setAttribute('stroke', '#666');
        circle.setAttribute('stroke-width', '2');
        circle.style.cursor = 'pointer';
        circle.style.transition = 'all 0.15s ease';
        
        circle.addEventListener('mouseenter', function() {
            circle.setAttribute('r', '7');
            circle.setAttribute('fill', 'var(--accent-green-light)');
            
            if (tooltipEl) {
                tooltipEl.style.display = 'block';
                tooltipEl.style.borderLeftColor = 'var(--accent-green-light)';
                tooltipEl.innerHTML = `
                    <div style="font-weight:800; font-family:var(--font-heading); text-transform:uppercase; font-size:0.9rem; color:var(--accent-green-light); margin-bottom:4px;">
                        ${i === 0 ? 'Nota Inicial' : `Meta - ${pLabelHeader} ${i}`}
                    </div>
                    <div>Meta: <strong>${score} acertos</strong></div>
                    <div>Aproveitamento: <strong>${percent}%</strong></div>
                    <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:4px;">Rampa projetada</div>
                `;
            }
        });
        
        circle.addEventListener('mousemove', function(e) {
            if (tooltipEl) {
                tooltipEl.style.left = (e.pageX + 15) + 'px';
                tooltipEl.style.top = (e.pageY - 15) + 'px';
            }
        });
        
        circle.addEventListener('mouseleave', function() {
            circle.setAttribute('r', '5');
            circle.setAttribute('fill', '#262626');
            if (tooltipEl) tooltipEl.style.display = 'none';
        });
        
        svg.appendChild(circle);
    }
    
    // 6. Draw real dots with tooltips
    realCoords.forEach((c, idx) => {
        const x = c.x;
        const y = c.y;
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '6.5');
        circle.setAttribute('fill', 'var(--accent-yellow)');
        circle.setAttribute('stroke', 'var(--bg-primary)');
        circle.setAttribute('stroke-width', '2');
        circle.style.cursor = 'pointer';
        circle.style.transition = 'all 0.15s ease';
        
        circle.addEventListener('mouseenter', function() {
            circle.setAttribute('r', '8.5');
            
            if (tooltipEl) {
                tooltipEl.style.display = 'block';
                const isTargetMet = idx === 0 || c.score >= c.targetScore;
                tooltipEl.style.borderLeftColor = isTargetMet ? 'var(--accent-green-light)' : 'var(--accent-red)';
                
                const percent = Math.round((c.score / maxScore) * 100);
                const statusText = idx === 0 ? 'Ponto de Partida' : c.status === 'Batida' ? 'META BATIDA' : 'NÃO BATIDA';
                const statusColor = idx === 0 ? 'var(--text-secondary)' : c.status === 'Batida' ? 'var(--accent-green-light)' : 'var(--accent-red)';
                
                let targetInfo = '';
                if (idx > 0) {
                    targetInfo = `<div style="font-size:0.75rem; color:var(--text-secondary);">Meta esperada: ${c.targetScore} acertos</div>`;
                }
                
                tooltipEl.innerHTML = `
                    <div style="font-weight:800; font-family:var(--font-heading); text-transform:uppercase; font-size:0.9rem; color:var(--accent-yellow); margin-bottom:4px;">
                        ${c.label} (Real)
                    </div>
                    <div>Resultado: <strong>${c.score} acertos</strong></div>
                    <div>Aproveitamento: <strong>${percent}%</strong></div>
                    ${targetInfo}
                    <div style="font-weight:700; color:${statusColor}; font-size:0.75rem; margin-top:6px; font-family:var(--font-heading); letter-spacing:0.5px;">
                        ${statusText}
                    </div>
                `;
            }
        });
        
        circle.addEventListener('mousemove', function(e) {
            if (tooltipEl) {
                tooltipEl.style.left = (e.pageX + 15) + 'px';
                tooltipEl.style.top = (e.pageY - 15) + 'px';
            }
        });
        
        circle.addEventListener('mouseleave', function() {
            circle.setAttribute('r', '6.5');
            if (tooltipEl) tooltipEl.style.display = 'none';
        });
        
        svg.appendChild(circle);
    });
}

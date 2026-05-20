// ===== MEUS CONCURSOS =====
let editingConcursoId = null;
let tempDisciplinas = [];

function showConcursosView(viewId) {
    ['concursos-list-view','concursos-edit-view'].forEach(id => document.getElementById(id).classList.add('d-none'));
    document.getElementById(viewId).classList.remove('d-none');
}

function renderConcursosList() {
    const container = document.getElementById('concursosListCards');
    const createCard = document.getElementById('concursoCreateCard');
    const btnNovo = document.getElementById('btnNovoConcurso');
    if (concursos.length > 0) { createCard.style.display = 'none'; btnNovo.style.display = 'block'; }
    else { createCard.style.display = 'block'; btnNovo.style.display = 'none'; }
    container.innerHTML = '';
    concursos.forEach(c => {
        const totalQ = c.disciplinas.reduce((s, d) => s + d.peso, 0);
        const card = document.createElement('div'); card.className = 'ciclo-list-card';
        card.innerHTML = `<div class="ciclo-list-badge"><i class="bi bi-trophy"></i></div>
            <div class="ciclo-list-info"><div class="ciclo-list-name">${c.nome}</div>
            <div class="ciclo-list-meta"><span>${c.disciplinas.length} disciplinas</span><span>Total: ${totalQ} questões</span></div></div>
            <button class="btn-exec-ciclo btn-edit-concurso" data-id="${c.id}"><i class="bi bi-pencil"></i> Editar</button>
            <button class="btn-actions btn-del-concurso" data-id="${c.id}"><i class="bi bi-trash3"></i></button>`;
        container.appendChild(card);
    });
    container.querySelectorAll('.btn-edit-concurso').forEach(btn => btn.addEventListener('click', () => openEditConcurso(parseInt(btn.dataset.id))));
    container.querySelectorAll('.btn-del-concurso').forEach(btn => btn.addEventListener('click', () => {
        concursos = concursos.filter(c => c.id !== parseInt(btn.dataset.id)); saveAll(); renderConcursosList(); showToast('Concurso excluído!');
    }));
    
    // Load concursos oficiais for import
    loadConcursosOficiais();
}

function openNewConcurso() {
    editingConcursoId = null; tempDisciplinas = [{ nome: '', peso: 0 }];
    document.getElementById('concursoNomeInput').value = '';
    document.getElementById('concursoEditTitle').textContent = 'Novo concurso';
    renderDisciplinasTable(); showConcursosView('concursos-edit-view');
}

function openEditConcurso(id) {
    const c = concursos.find(x => x.id === id); if (!c) return;
    editingConcursoId = id;
    tempDisciplinas = JSON.parse(JSON.stringify(c.disciplinas));
    document.getElementById('concursoNomeInput').value = c.nome;
    document.getElementById('concursoEditTitle').textContent = 'Editar concurso';
    renderDisciplinasTable(); showConcursosView('concursos-edit-view');
}

function renderDisciplinasTable() {
    const tbody = document.getElementById('concursoDisciplinasBody'); tbody.innerHTML = '';
    tempDisciplinas.forEach((d, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="text" class="input-mentor disc-nome" data-idx="${i}" value="${d.nome}" placeholder="Nome da disciplina"></td>
            <td><input type="number" class="input-mentor disc-peso" data-idx="${i}" value="${d.peso}" min="0" style="width:80px;"></td>
            <td><button class="btn-actions disc-del" data-idx="${i}"><i class="bi bi-x-lg"></i></button></td>`;
        tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.disc-nome').forEach(inp => inp.addEventListener('input', () => { tempDisciplinas[inp.dataset.idx].nome = inp.value; }));
    tbody.querySelectorAll('.disc-peso').forEach(inp => inp.addEventListener('input', () => { tempDisciplinas[inp.dataset.idx].peso = parseInt(inp.value) || 0; updateTotalQuestoes(); }));
    tbody.querySelectorAll('.disc-del').forEach(btn => btn.addEventListener('click', () => { tempDisciplinas.splice(btn.dataset.idx, 1); renderDisciplinasTable(); }));
    updateTotalQuestoes();
}

function updateTotalQuestoes() {
    document.getElementById('concursoTotalQuestoes').textContent = tempDisciplinas.reduce((s, d) => s + (d.peso || 0), 0);
}

document.getElementById('btnStartConcurso').addEventListener('click', openNewConcurso);
document.getElementById('btnNovoConcurso').addEventListener('click', openNewConcurso);
document.getElementById('backToConcursosList').addEventListener('click', (e) => { e.preventDefault(); showConcursosView('concursos-list-view'); });
document.getElementById('btnAddDisciplina').addEventListener('click', () => { tempDisciplinas.push({ nome: '', peso: 0 }); renderDisciplinasTable(); });

document.getElementById('btnSalvarConcurso').addEventListener('click', () => {
    const nome = document.getElementById('concursoNomeInput').value.trim();
    if (!nome) { showToast('Informe o nome do concurso!'); return; }
    const validDisc = tempDisciplinas.filter(d => d.nome.trim());
    if (!validDisc.length) { showToast('Adicione pelo menos uma disciplina!'); return; }
    if (editingConcursoId) {
        const c = concursos.find(x => x.id === editingConcursoId);
        if (c) { c.nome = nome; c.disciplinas = validDisc; }
    } else {
        concursos.push({ id: Date.now(), nome, disciplinas: validDisc });
    }
    saveAll(); renderConcursosList(); showConcursosView('concursos-list-view'); showToast('Concurso salvo!');
});

// ===== MEUS CICLOS =====
let currentCicloMaterias = [];
let currentExecCiclo = null;
let currentSubjectIndex = 0;
let timerInterval = null;
let timerRunning = false;
let timerSeconds = 0;
let selectedConcursoForCiclo = null;
let editingCicloId = null;

function showCiclosView(viewId) {
    ['ciclos-list-view','ciclos-wizard-view','ciclos-config-view','ciclos-exec-view'].forEach(id => document.getElementById(id).classList.add('d-none'));
    document.getElementById(viewId).classList.remove('d-none');
}

function round30(minutes) { return Math.max(60, Math.round(minutes / 30) * 30); }
function formatMin(min) { const h = Math.floor(min/60); const m = min % 60; return m > 0 ? `${h}:${String(m).padStart(2,'0')}h` : `${h}:00h`; }

// ===== ALGORITMO DE PRIORIDADE INTELIGENTE =====
// Fórmula: Prioridade = (Peso × Dificuldade × (6 - Retenção)) + DiasSemEstudar
function calculatePriority(m, maxPeso, now) {
    if (m.ativo === false) return 0;
    const pesoNorm = maxPeso > 0 ? m.peso / maxPeso : 0;
    const difNorm = (m.dificuldade || 3) / 5;
    const retInv = (6 - (m.retencao || 3)) / 5; // retenção baixa = prioridade alta
    const diasSemEstudar = m.ultimoEstudo
        ? Math.max(0, (now - m.ultimoEstudo) / (1000 * 60 * 60 * 24))
        : 7;
    const atrasoNorm = Math.min(diasSemEstudar / 7, 1);
    return Math.round((pesoNorm * 0.35 + difNorm * 0.30 + retInv * 0.20 + atrasoNorm * 0.15) * 100);
}

// Distribui horas proporcionais à prioridade
function calcHorasInteligente(materias, totalHoras) {
    const now = Date.now();
    const active = materias.filter(m => m.ativo !== false);
    if (active.length === 0) return materias.map(() => 0);
    const maxPeso = Math.max(...active.map(m => m.peso), 1);
    const prioridades = materias.map(m => calculatePriority(m, maxPeso, now));
    const totalPrioridade = prioridades.reduce((s, p) => s + p, 0);
    if (totalPrioridade === 0) return materias.map(() => 0);
    const totalMin = totalHoras * 60;
    return prioridades.map((p, i) => {
        if (materias[i].ativo === false) return 0;
        return round30((p / totalPrioridade) * totalMin);
    });
}

// Gera ciclo inteligente com intercalação anti-fadiga
function generateIntelligentCycle(materias) {
    const active = materias.filter(m => m.ativo !== false && (m.totalMin || 0) > 0);
    if (active.length === 0) return [];

    const now = Date.now();
    const maxPeso = Math.max(...active.map(m => m.peso), 1);

    let allBlocks = [];
    active.forEach((m, originalIdx) => {
        const totalMin = m.totalMin;
        if (totalMin <= 0) return;
        const prioridade = calculatePriority(m, maxPeso, now);
        const numBlocos = Math.max(1, Math.round(prioridade / 20));

        let remaining = totalMin;
        for (let b = 0; b < numBlocos && remaining >= 30; b++) {
            const sessionsLeft = numBlocos - b;
            let dur = round30(remaining / sessionsLeft);
            dur = Math.min(dur, remaining);
            allBlocks.push({
                nome: m.nome,
                duracao: Math.max(60, dur),
                idx: originalIdx,
                prioridade,
                categoria: m.categoria || 'geral',
                dificuldade: m.dificuldade || 3
            });
            remaining -= dur;
        }
        // Se sobrou algum tempo (>= 30 min), adiciona como bloco extra
        if (remaining >= 30) {
            allBlocks.push({
                nome: m.nome,
                duracao: round30(remaining),
                idx: originalIdx,
                prioridade,
                categoria: m.categoria || 'geral',
                dificuldade: m.dificuldade || 3
            });
        }
    });

    // Ordena por prioridade decrescente
    allBlocks.sort((a, b) => b.prioridade - a.prioridade);

    // Intercala categorias para evitar fadiga
    const result = [];
    const used = new Set();

    while (result.length < allBlocks.length) {
        let added = false;
        const lastCat = result.length > 0 ? result[result.length - 1].categoria : null;
        const lastDiff = result.length > 0 ? result[result.length - 1].dificuldade : 0;

        // Prioridade: categoria diferente E (dificuldade alternada ou mesma)
        for (let i = 0; i < allBlocks.length; i++) {
            if (used.has(i)) continue;
            const b = allBlocks[i];
            const catOk = b.categoria !== lastCat;
            const diffOk = Math.abs(b.dificuldade - lastDiff) >= 2 || lastDiff === 0;
            if (catOk && diffOk) {
                result.push(b);
                used.add(i);
                added = true;
                break;
            }
        }
        // Fallback: só categoria diferente
        if (!added) {
            for (let i = 0; i < allBlocks.length; i++) {
                if (used.has(i)) continue;
                if (allBlocks[i].categoria !== lastCat || lastCat === null) {
                    result.push(allBlocks[i]);
                    used.add(i);
                    added = true;
                    break;
                }
            }
        }
        // Último recurso: qualquer bloco
        if (!added) {
            for (let i = 0; i < allBlocks.length; i++) {
                if (!used.has(i)) {
                    result.push(allBlocks[i]);
                    used.add(i);
                    break;
                }
            }
        }
    }

    return result;
}

// ===== CONFIG VIEW =====
// Open ciclo wizard (select concurso)
function openCicloWizard() {
    const grid = document.getElementById('ciclosConcursoGrid');
    const noConc = document.getElementById('noConcursoMsg');
    const noRot = document.getElementById('noRotinaMsg');
    grid.innerHTML = ''; noConc.style.display = 'none'; noRot.style.display = 'none';
    selectedConcursoForCiclo = null;
    if (!getActiveRotina()) { noRot.style.display = 'flex'; showCiclosView('ciclos-wizard-view'); return; }
    if (!concursos.length) { noConc.style.display = 'flex'; showCiclosView('ciclos-wizard-view'); return; }
    concursos.forEach(c => {
        const card = document.createElement('div'); card.className = 'concurso-card'; card.dataset.id = c.id;
        card.innerHTML = `<div class="concurso-check"><i class="bi bi-check-lg"></i></div><div class="concurso-icon"><i class="bi bi-trophy"></i></div><span>${c.nome}</span>`;
        card.addEventListener('click', () => {
            grid.querySelectorAll('.concurso-card').forEach(x => x.classList.remove('selected'));
            card.classList.add('selected');
            selectedConcursoForCiclo = c;
            setTimeout(() => openCicloConfigFromConcurso(c), 300);
        });
        grid.appendChild(card);
    });
    showCiclosView('ciclos-wizard-view');
}

function openCicloConfigFromConcurso(conc) {
    editingCicloId = null;
    const horas = getStudyHours() || 20;
    document.getElementById('configCicloNome').value = 'Ciclo - ' + conc.nome;
    document.getElementById('configConcursoNome').textContent = conc.nome;
    document.getElementById('configHorasInput').value = horas;
    currentCicloMaterias = conc.disciplinas.map(d => ({
        nome: d.nome, peso: d.peso, ativo: true,
        dificuldade: 3, retencao: 3, categoria: 'geral',
        ultimoEstudo: null, sessoesConcluidas: 0
    }));
    renderMateriasConfig(horas);
    showCiclosView('ciclos-config-view');
}

function openCicloConfigForEdit(ciclo) {
    editingCicloId = ciclo.id;
    const horas = getStudyHours() || 20;
    document.getElementById('configCicloNome').value = ciclo.nome;
    document.getElementById('configConcursoNome').textContent = ciclo.concurso || '';
    document.getElementById('configHorasInput').value = parseInt(ciclo.duracaoHoras) || horas;
    currentCicloMaterias = (ciclo.subjects || []).map(s => ({
        nome: s.nome,
        peso: s.peso || 1,
        ativo: s.ativo !== false,
        dificuldade: s.dificuldade || 3,
        retencao: s.retencao || 3,
        categoria: s.categoria || 'geral',
        ultimoEstudo: s.ultimoEstudo || null,
        sessoesConcluidas: s.sessoesConcluidas || 0
    }));
    const totalH = parseInt(document.getElementById('configHorasInput').value) || horas;
    renderMateriasConfig(totalH);
    showCiclosView('ciclos-config-view');
}

document.getElementById('configHorasInput').addEventListener('input', function() {
    renderMateriasConfig(parseInt(this.value) || 1);
});

function renderMateriasConfig(totalHoras) {
    if (!totalHoras) totalHoras = getStudyHours();
    const now = Date.now();
    const maxPeso = Math.max(...currentCicloMaterias.filter(m => m.ativo !== false).map(m => m.peso), 1);
    const horasArr = calcHorasInteligente(currentCicloMaterias, totalHoras);
    const prioridades = currentCicloMaterias.map(m => calculatePriority(m, maxPeso, now));

    const tbody = document.getElementById('materiasBody'); tbody.innerHTML = '';
    const activeCount = currentCicloMaterias.filter(m => m.ativo !== false).length;

    currentCicloMaterias.forEach((m, idx) => {
        const tr = document.createElement('tr');
        if (m.ativo === false) tr.classList.add('materia-inativa');
        m.totalMin = horasArr[idx];
        m._prioridade = prioridades[idx];
        const horasDisplay = m.ativo === false ? '—' : formatMin(horasArr[idx]);
        const dif = m.dificuldade || 3;
        const ret = m.retencao || 3;
        const cat = m.categoria || 'geral';
        const catLabel = { exatas: 'Exatas', humanas: 'Humanas', legislacao: 'Legislação', geral: 'Geral' }[cat] || 'Geral';
        const prioridadeBar = m.ativo !== false && prioridades[idx] > 0
            ? `<div style="margin-top:4px;height:3px;background:var(--bg-primary);border-radius:2px;overflow:hidden;"><div style="width:${prioridades[idx]}%;height:3px;background:var(--accent-yellow);border-radius:2px;transition:width 0.3s;"></div></div><span style="font-size:0.7rem;color:var(--text-muted);">Prioridade ${prioridades[idx]}</span>`
            : '';

        tr.innerHTML = `
            <td><span>${m.nome}</span>${prioridadeBar}</td>
            <td><strong>${m.peso}</strong></td>
            <td>
                <div class="materia-slider-group" data-idx="${idx}" data-field="dificuldade">
                    <input type="range" min="1" max="5" value="${dif}" class="materia-range" data-idx="${idx}" data-field="dificuldade">
                    <span class="materia-range-val">${dif}</span>
                </div>
            </td>
            <td>
                <div class="materia-slider-group" data-idx="${idx}" data-field="retencao">
                    <input type="range" min="1" max="5" value="${ret}" class="materia-range" data-idx="${idx}" data-field="retencao">
                    <span class="materia-range-val">${ret}</span>
                </div>
            </td>
            <td>
                <select class="input-mentor materia-cat-select" data-idx="${idx}" style="padding:4px 8px;font-size:0.8rem;width:auto;">
                    <option value="exatas" ${cat === 'exatas' ? 'selected' : ''}>Exatas</option>
                    <option value="humanas" ${cat === 'humanas' ? 'selected' : ''}>Humanas</option>
                    <option value="legislacao" ${cat === 'legislacao' ? 'selected' : ''}>Legislação</option>
                    <option value="geral" ${cat === 'geral' ? 'selected' : ''}>Geral</option>
                </select>
            </td>
            <td><span class="materia-hours">${horasDisplay}</span></td>
            <td>
                <label class="materia-toggle" title="${m.ativo !== false ? 'Desativar matéria' : 'Ativar matéria'}">
                    <input type="checkbox" ${m.ativo !== false ? 'checked' : ''} data-idx="${idx}" class="materia-toggle-input">
                    <span class="materia-toggle-slider"></span>
                </label>
            </td>`;
        tbody.appendChild(tr);
    });

    // Range sliders
    tbody.querySelectorAll('.materia-range').forEach(range => {
        range.addEventListener('input', function() {
            const idx = parseInt(this.dataset.idx);
            const field = this.dataset.field;
            currentCicloMaterias[idx][field] = parseInt(this.value);
            this.nextElementSibling.textContent = this.value;
            renderMateriasConfig(totalHoras);
        });
    });

    // Category selects
    tbody.querySelectorAll('.materia-cat-select').forEach(sel => {
        sel.addEventListener('change', function() {
            const idx = parseInt(this.dataset.idx);
            currentCicloMaterias[idx].categoria = this.value;
            renderMateriasConfig(totalHoras);
        });
    });

    // Toggle ativo/inativo
    tbody.querySelectorAll('.materia-toggle-input').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const idx = parseInt(this.dataset.idx);
            currentCicloMaterias[idx].ativo = this.checked;
            renderMateriasConfig(totalHoras);
        });
    });

    if (activeCount === 0) {
        document.getElementById('btnGerarCiclo').disabled = true;
        showToast('Ative pelo menos uma matéria para gerar o ciclo.');
    } else {
        document.getElementById('btnGerarCiclo').disabled = false;
    }
}

document.getElementById('btnStartWizard').addEventListener('click', openCicloWizard);
document.getElementById('btnNovoCiclo').addEventListener('click', openCicloWizard);
document.getElementById('backToCiclosList').addEventListener('click', (e) => { e.preventDefault(); showCiclosView('ciclos-list-view'); });
document.getElementById('backToCiclosFromConfig').addEventListener('click', (e) => { e.preventDefault(); showCiclosView('ciclos-list-view'); });
document.getElementById('backToCiclosFromExec').addEventListener('click', (e) => { e.preventDefault(); if (timerInterval) { clearInterval(timerInterval); timerInterval = null; timerRunning = false; } showCiclosView('ciclos-list-view'); });

// ===== GERAR CICLO INTELIGENTE =====
document.getElementById('btnGerarCiclo').addEventListener('click', () => {
    const activeMaterias = currentCicloMaterias.filter(m => m.ativo !== false);
    if (activeMaterias.length === 0) return showToast('Ative pelo menos uma matéria!');

    const nome = document.getElementById('configCicloNome').value || 'Novo Ciclo';
    const totalH = parseInt(document.getElementById('configHorasInput').value) || 20;
    const sequence = generateIntelligentCycle(currentCicloMaterias);
    const totalSeqMin = sequence.reduce((s, x) => s + x.duracao, 0);

    const subjects = currentCicloMaterias.map(m => ({
        nome: m.nome, peso: m.peso, ativo: m.ativo !== false,
        totalMin: m.totalMin || 0,
        dificuldade: m.dificuldade || 3,
        retencao: m.retencao || 3,
        categoria: m.categoria || 'geral',
        ultimoEstudo: m.ultimoEstudo || null,
        sessoesConcluidas: m.sessoesConcluidas || 0,
        sessao: formatMin(m.totalMin || 0),
        tempoRestante: formatMin(m.totalMin || 0)
    }));

    if (editingCicloId) {
        const idx = ciclos.findIndex(c => c.id === editingCicloId);
        if (idx !== -1) {
            ciclos[idx] = {
                ...ciclos[idx],
                nome, subjects, sequence,
                duracao: formatMin(totalSeqMin),
                duracaoHoras: totalH,
                currentPosition: 0
            };
        }
        editingCicloId = null;
        showToast('Ciclo atualizado!');
    } else {
        const newCiclo = {
            id: Date.now(), nome,
            concurso: selectedConcursoForCiclo?.nome || '',
            duracao: formatMin(totalSeqMin),
            duracaoHoras: totalH,
            avanco: '0:00h',
            ciclosRealizados: 0,
            currentPosition: 0,
            subjects, sequence
        };
        ciclos.push(newCiclo);
        showToast('Ciclo inteligente gerado!');
    }
    saveAll(); renderCiclosList();
    showCiclosView('ciclos-list-view');
});

function renderCiclosList() {
    const container = document.getElementById('ciclosListCards');
    const createCard = document.getElementById('cicloCreateCard');
    const btnNovo = document.getElementById('btnNovoCiclo');
    if (ciclos.length > 0) { createCard.style.display = 'none'; btnNovo.style.display = 'block'; }
    else { createCard.style.display = 'block'; btnNovo.style.display = 'none'; }
    container.innerHTML = '';
    ciclos.forEach(c => {
        const totalBlocos = (c.sequence || []).length;
        const materiasCount = (c.subjects || []).filter(s => s.ativo !== false).length;
        const pos = (c.currentPosition || 0);
        const card = document.createElement('div'); card.className = 'ciclo-list-card';
        card.innerHTML = `<div class="ciclo-list-badge"><i class="bi bi-cpu"></i></div>
            <div class="ciclo-list-info"><div class="ciclo-list-name">${c.nome}</div>
            <div class="ciclo-list-meta"><span>${materiasCount} matérias</span><span>${totalBlocos} blocos</span><span>Posição: ${pos + 1}/${totalBlocos}</span></div></div>
            <button class="btn-exec-ciclo" data-id="${c.id}"><i class="bi bi-play-fill"></i> Executar</button>
            <button class="btn-actions btn-del-ciclo" data-id="${c.id}" style="margin-left:8px;"><i class="bi bi-trash3"></i></button>`;
        container.appendChild(card);
    });
    container.querySelectorAll('.btn-exec-ciclo').forEach(btn => btn.addEventListener('click', () => { const c = ciclos.find(x => x.id === parseInt(btn.dataset.id)); if (c) openExecView(c); }));
    container.querySelectorAll('.btn-del-ciclo').forEach(btn => btn.addEventListener('click', () => { ciclos = ciclos.filter(c => c.id !== parseInt(btn.dataset.id)); saveAll(); renderCiclosList(); showToast('Ciclo excluído!'); }));
}

// Execution View
let divisionEnabled = false;
let currentPhase = 'study'; // 'revision' or 'study'
let revisionMinutes = 0;
let studyMinutes = 0;

function openExecView(ciclo) {
    currentExecCiclo = ciclo;
    currentSubjectIndex = ciclo.currentPosition || 0;
    if (currentSubjectIndex >= (ciclo.sequence || ciclo.subjects).length) {
        currentSubjectIndex = 0;
    }
    divisionEnabled = false; currentPhase = 'study';
    document.getElementById('divisionToggle').checked = false;
    document.getElementById('divisionContent').style.display = 'none';
    document.getElementById('wheelBadge').style.display = 'none';
    document.getElementById('execCicloLabel').textContent = ciclo.nome;
    const seq = ciclo.sequence || ciclo.subjects;
    renderWheel(seq);
    selectSubject(currentSubjectIndex);
    renderExecSubjects(seq);
    showCiclosView('ciclos-exec-view');
}

function renderWheel(items) {
    const svg = document.getElementById('wheelSvg'); svg.innerHTML = '';
    const cx = 200, cy = 200, oR = 190, iR = 130;
    const gap = 1.5;
    const totalGap = items.length * gap;
    const totalAngle = 360 - totalGap;

    // Calculate total time for proportions
    const totalTime = items.reduce((s, it) => {
        const min = it.duracao || it.totalMin || 30;
        return s + min;
    }, 0);

    let angle = -90;
    const darkColors = ['#3a3d38','#2e322c','#42453f','#363a33','#40433d','#2c302a','#444740','#383c35'];
    const greenActive = '#4b5320';

    items.forEach((s, i) => {
        const itemMin = s.duracao || s.totalMin || 30;
        const seg = (itemMin / totalTime) * totalAngle;
        const sA = angle * Math.PI / 180;
        const eA = (angle + seg) * Math.PI / 180;
        const largeArc = seg > 180 ? 1 : 0;

        // Outer arc
        const x1o = cx + oR * Math.cos(sA), y1o = cy + oR * Math.sin(sA);
        const x2o = cx + oR * Math.cos(eA), y2o = cy + oR * Math.sin(eA);
        // Inner arc
        const x1i = cx + iR * Math.cos(eA), y1i = cy + iR * Math.sin(eA);
        const x2i = cx + iR * Math.cos(sA), y2i = cy + iR * Math.sin(sA);

        const d = `M${x1o},${y1o} A${oR},${oR} 0 ${largeArc} 1 ${x2o},${y2o} L${x1i},${y1i} A${iR},${iR} 0 ${largeArc} 0 ${x2i},${y2i} Z`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', i === currentSubjectIndex ? greenActive : darkColors[i % darkColors.length]);
        path.setAttribute('stroke', '#1a1a1a');
        path.setAttribute('stroke-width', '2');
        path.style.cursor = 'pointer';
        path.style.transition = 'fill 0.3s';
        path.addEventListener('click', () => selectSubject(i));
        path.addEventListener('mouseenter', () => { if (i !== currentSubjectIndex) path.setAttribute('fill', '#666'); });
        path.addEventListener('mouseleave', () => { if (i !== currentSubjectIndex) path.setAttribute('fill', darkColors[i % darkColors.length]); });
        svg.appendChild(path);

        // Add indicator dot on active segment midpoint
        if (i === currentSubjectIndex) {
            const midA = (angle + seg / 2) * Math.PI / 180;
            const dotR = oR + 8;
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', cx + dotR * Math.cos(midA));
            dot.setAttribute('cy', cy + dotR * Math.sin(midA));
            dot.setAttribute('r', 5);
            dot.setAttribute('fill', '#fff');
            svg.appendChild(dot);
        }

        angle += seg + gap;
    });

    // If division enabled, draw inner ring showing revision/study split
    if (divisionEnabled && currentExecCiclo) {
        const currentItem = items[currentSubjectIndex];
        const totalMin = currentItem?.duracao || currentItem?.totalMin || 120;
        const revPct = revisionMinutes / totalMin;
        drawInnerRing(svg, cx, cy, iR - 4, iR - 14, revPct);
    }
}

function drawInnerRing(svg, cx, cy, oR, iR, revPct) {
    // Revision arc (blue)
    const revAngle = revPct * 360;
    const studyAngle = 360 - revAngle;
    let angle = -90;

    // Revision segment
    if (revAngle > 0.5) {
        const sA = angle * Math.PI / 180;
        const eA = (angle + revAngle) * Math.PI / 180;
        const la = revAngle > 180 ? 1 : 0;
        const d = `M${cx+oR*Math.cos(sA)},${cy+oR*Math.sin(sA)} A${oR},${oR} 0 ${la} 1 ${cx+oR*Math.cos(eA)},${cy+oR*Math.sin(eA)} L${cx+iR*Math.cos(eA)},${cy+iR*Math.sin(eA)} A${iR},${iR} 0 ${la} 0 ${cx+iR*Math.cos(sA)},${cy+iR*Math.sin(sA)} Z`;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', '#4a7ccc');
        path.setAttribute('stroke', 'none');
        svg.appendChild(path);
    }

    // Study segment
    angle += revAngle;
    if (studyAngle > 0.5) {
        const sA = angle * Math.PI / 180;
        const eA = (angle + studyAngle) * Math.PI / 180;
        const la = studyAngle > 180 ? 1 : 0;
        const d = `M${cx+oR*Math.cos(sA)},${cy+oR*Math.sin(sA)} A${oR},${oR} 0 ${la} 1 ${cx+oR*Math.cos(eA)},${cy+oR*Math.sin(eA)} L${cx+iR*Math.cos(eA)},${cy+iR*Math.sin(eA)} A${iR},${iR} 0 ${la} 0 ${cx+iR*Math.cos(sA)},${cy+iR*Math.sin(sA)} Z`;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', '#3a3a5a');
        path.setAttribute('stroke', 'none');
        svg.appendChild(path);
    }
}

function selectSubject(idx) {
    if (timerRunning) { clearInterval(timerInterval); timerRunning = false; document.getElementById('btnIniciarTimer').innerHTML = '<i class="bi bi-play-fill"></i> Iniciar'; }
    currentSubjectIndex = idx;
    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
    const s = items[idx];
    const totalMin = s.duracao || s.totalMin || 120;

    // Salva posição atual no ciclo
    currentExecCiclo.currentPosition = idx;
    const cicloIdx = ciclos.findIndex(c => c.id === currentExecCiclo.id);
    if (cicloIdx !== -1) ciclos[cicloIdx] = currentExecCiclo;
    saveAll();

    document.getElementById('wheelSubject').textContent = s.nome.length > 16 ? s.nome.substring(0, 16) + '...' : s.nome;
    document.getElementById('execSubjectName').textContent = s.nome;

    // Reset division for new subject
    currentPhase = divisionEnabled ? 'revision' : 'study';
    revisionMinutes = Math.round(totalMin * 0.33);
    studyMinutes = totalMin - revisionMinutes;
    updateDivisionDisplay(totalMin);

    if (divisionEnabled) {
        timerSeconds = revisionMinutes * 60;
        document.getElementById('wheelBadge').style.display = 'inline-block';
        document.getElementById('wheelBadge').textContent = 'Revisão';
    } else {
        timerSeconds = totalMin * 60;
        document.getElementById('wheelBadge').style.display = 'none';
    }

    updateTimerDisplay();
    renderWheel(items);
    document.querySelectorAll('.exec-subject-row').forEach((row, i) => row.classList.toggle('active-subject', i === idx));
}

function updateDivisionDisplay(totalMin) {
    if (!totalMin) {
        const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
        const s = items[currentSubjectIndex];
        totalMin = s?.duracao || s?.totalMin || 120;
    }
    const revH = Math.floor(revisionMinutes / 60), revM = revisionMinutes % 60;
    const stuH = Math.floor(studyMinutes / 60), stuM = studyMinutes % 60;
    document.getElementById('divRevisaoTime').textContent = `${String(revH).padStart(2,'0')}:${String(revM).padStart(2,'0')}:00`;
    document.getElementById('divConteudoTime').textContent = `${String(stuH).padStart(2,'0')}:${String(stuM).padStart(2,'0')}:00`;
    document.getElementById('divisionSlider').value = Math.round((revisionMinutes / totalMin) * 100);
}

function updateTimerDisplay() {
    const h = Math.floor(timerSeconds / 3600), m = Math.floor((timerSeconds % 3600) / 60), s = timerSeconds % 60;
    document.getElementById('wheelTimer').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// Timer button
document.getElementById('btnIniciarTimer').addEventListener('click', function() {
    if (timerRunning) {
        clearInterval(timerInterval); timerRunning = false;
        this.innerHTML = '<i class="bi bi-play-fill"></i> Iniciar';
    } else {
        timerRunning = true;
        this.innerHTML = '<i class="bi bi-pause-fill"></i> Pausar';
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval); timerRunning = false;
                document.getElementById('btnIniciarTimer').innerHTML = '<i class="bi bi-play-fill"></i> Iniciar';

                // If division enabled and was in revision, switch to study phase
                if (divisionEnabled && currentPhase === 'revision') {
                    currentPhase = 'study';
                    timerSeconds = studyMinutes * 60;
                    document.getElementById('wheelBadge').textContent = 'Conteúdo novo';
                    document.getElementById('wheelBadge').style.background = '#3a3a5a';
                    updateTimerDisplay();
                    showToast('Revisão concluída! Agora, conteúdo novo.');
                } else {
                    showToast('Sessão concluída! ✅');
                    document.getElementById('wheelBadge').style.display = 'none';

                    // Salva posição no ciclo contínuo
                    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
                    const nextIdx = currentSubjectIndex + 1;
                    if (nextIdx >= items.length) {
                        currentExecCiclo.currentPosition = 0; // reinicia ciclo
                        currentExecCiclo.ciclosRealizados = (currentExecCiclo.ciclosRealizados || 0) + 1;
                    } else {
                        currentExecCiclo.currentPosition = nextIdx;
                    }

                    // Atualiza últimoEstudo da matéria atual
                    const currentItem = items[currentSubjectIndex];
                    if (currentItem) {
                        const subjectIdx = currentItem.idx;
                        if (subjectIdx !== undefined && currentExecCiclo.subjects[subjectIdx]) {
                            currentExecCiclo.subjects[subjectIdx].ultimoEstudo = Date.now();
                            currentExecCiclo.subjects[subjectIdx].sessoesConcluidas = (currentExecCiclo.subjects[subjectIdx].sessoesConcluidas || 0) + 1;
                        }
                    }

                    // Salva progresso
                    const cicloIdx = ciclos.findIndex(c => c.id === currentExecCiclo.id);
                    if (cicloIdx !== -1) ciclos[cicloIdx] = currentExecCiclo;
                    saveAll();

                    // Mostra prompt de avaliação de desempenho
                    showPerformancePrompt(() => {
                        const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
                        const nextIdx = currentSubjectIndex + 1;
                        if (nextIdx < items.length) {
                            setTimeout(() => selectSubject(nextIdx), 800);
                        } else {
                            // Ciclo completo, reinicia do início
                            setTimeout(() => selectSubject(0), 800);
                        }
                    });
                }
            }
        }, 1000);
    }
});

// Division toggle
document.getElementById('divisionToggle').addEventListener('change', function() {
    divisionEnabled = this.checked;
    document.getElementById('divisionContent').style.display = this.checked ? 'block' : 'none';

    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
    const s = items[currentSubjectIndex];
    const totalMin = s?.duracao || s?.totalMin || 120;

    if (this.checked) {
        currentPhase = 'revision';
        revisionMinutes = Math.round(totalMin * 0.33);
        studyMinutes = totalMin - revisionMinutes;
        updateDivisionDisplay(totalMin);
        document.getElementById('wheelBadge').style.display = 'inline-block';
        document.getElementById('wheelBadge').textContent = 'Revisão';
        document.getElementById('wheelBadge').style.background = '#4a7ccc';
        timerSeconds = revisionMinutes * 60;
        updateTimerDisplay();
    } else {
        document.getElementById('wheelBadge').style.display = 'none';
        currentPhase = 'study';
        timerSeconds = totalMin * 60;
        updateTimerDisplay();
    }
    renderWheel(items);
});

// Division slider
document.getElementById('divisionSlider').addEventListener('input', function() {
    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
    const s = items[currentSubjectIndex];
    const totalMin = s?.duracao || s?.totalMin || 120;
    const pct = parseInt(this.value) / 100;
    revisionMinutes = Math.max(10, Math.round(totalMin * pct));
    studyMinutes = totalMin - revisionMinutes;
    updateDivisionDisplay(totalMin);
    renderWheel(items);
});

// Confirm division button
document.getElementById('btnConfirmDivision').addEventListener('click', () => {
    currentPhase = 'revision';
    timerSeconds = revisionMinutes * 60;
    document.getElementById('wheelBadge').textContent = 'Revisão';
    document.getElementById('wheelBadge').style.background = '#4a7ccc';
    updateTimerDisplay();
    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
    renderWheel(items);
    showToast('Divisão confirmada! Inicie a revisão.');
});

// ===== PROMPT DE DESEMPENHO PÓS-SESSÃO =====
function showPerformancePrompt(onComplete) {
    const currentItem = (currentExecCiclo.sequence || currentExecCiclo.subjects)[currentSubjectIndex];
    const nome = currentItem?.nome || 'Matéria';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '3000';
    overlay.innerHTML = `
        <div class="modal-mentor" style="max-width:400px;text-align:center;">
            <h3 style="margin:0 0 4px;font-family:'Bebas Neue',sans-serif;letter-spacing:2px;">AVALIAR SESSÃO</h3>
            <p style="color:var(--text-secondary);margin-bottom:20px;">Como foi seu rendimento em <strong>${nome}</strong>?</p>
            <div class="perf-stars" style="display:flex;justify-content:center;gap:8px;margin-bottom:20px;">
                ${[1,2,3,4,5].map(n => `
                    <button class="perf-star-btn" data-rating="${n}" style="font-size:1.8rem;background:none;border:none;color:var(--text-muted);cursor:pointer;transition:all 0.2s;padding:4px;">
                        <i class="bi bi-star-fill"></i>
                    </button>
                `).join('')}
            </div>
            <div class="perf-labels" style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-muted);margin-bottom:16px;padding:0 8px;">
                <span>Difícil</span><span>Regular</span><span>Fácil</span>
            </div>
            <button class="btn-cancel perf-skip" style="margin-right:12px;">Pular</button>
            <button class="btn-save perf-done" style="display:none;">Confirmar</button>
        </div>
    `;
    document.body.appendChild(overlay);

    let selectedRating = 0;
    const stars = overlay.querySelectorAll('.perf-star-btn');
    const doneBtn = overlay.querySelector('.perf-done');
    const skipBtn = overlay.querySelector('.perf-skip');

    stars.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedRating = parseInt(btn.dataset.rating);
            stars.forEach((s, i) => {
                s.style.color = i < selectedRating ? 'var(--accent-yellow)' : 'var(--text-muted)';
            });
            doneBtn.style.display = 'inline-block';
        });
        btn.addEventListener('mouseenter', () => {
            const hoverVal = parseInt(btn.dataset.rating);
            stars.forEach((s, i) => {
                if (i < hoverVal) s.style.color = 'var(--accent-yellow)';
            });
        });
        btn.addEventListener('mouseleave', () => {
            stars.forEach((s, i) => {
                s.style.color = i < selectedRating ? 'var(--accent-yellow)' : 'var(--text-muted)';
            });
        });
    });

    const close = () => {
        document.body.removeChild(overlay);
        if (onComplete) onComplete();
    };

    doneBtn.addEventListener('click', () => {
        if (selectedRating > 0 && currentExecCiclo) {
            const item = (currentExecCiclo.sequence || currentExecCiclo.subjects)[currentSubjectIndex];
            if (item && item.idx !== undefined && currentExecCiclo.subjects[item.idx]) {
                // Ajusta dificuldade com base no rating (rating baixo = mais difícil → aumenta dificuldade)
                const subj = currentExecCiclo.subjects[item.idx];
                const newDiff = Math.round(subj.dificuldade * 0.7 + (6 - selectedRating) * 1.2 * 0.3);
                subj.dificuldade = Math.max(1, Math.min(5, newDiff));
            }
            const cicloIdx = ciclos.findIndex(c => c.id === currentExecCiclo.id);
            if (cicloIdx !== -1) ciclos[cicloIdx] = currentExecCiclo;
            saveAll();
        }
        close();
    });

    skipBtn.addEventListener('click', close);
}

function renderExecSubjects(sequence) {
    const container = document.getElementById('execSubjectsList'); container.innerHTML = '';
    const items = sequence.length ? sequence : currentExecCiclo.subjects;
    const catColors = { exatas: 'var(--accent-blue)', humanas: 'var(--accent-yellow)', legislacao: 'var(--accent-green)', geral: 'var(--text-muted)' };
    items.forEach((s, i) => {
        const row = document.createElement('div');
        row.className = `exec-subject-row${i === currentSubjectIndex ? ' active-subject' : ''}`;
        const dur = s.duracao ? formatMin(s.duracao) : s.sessao;
        const cat = (currentExecCiclo.subjects[s.idx]?.categoria) || 'geral';
        const catLabel = { exatas: 'Exatas', humanas: 'Humanas', legislacao: 'Legislação', geral: 'Geral' }[cat];
        row.innerHTML = `
            <span class="materia-name">${s.nome} <span class="exec-cat-badge" style="background:${catColors[cat] || catColors.geral};color:#fff;font-size:0.65rem;padding:1px 6px;border-radius:var(--radius-sm);margin-left:6px;opacity:0.8;">${catLabel}</span></span>
            <span class="sessao-time">${dur}</span>
            <span class="tempo-rest"><i class="bi bi-clock"></i> ${dur}</span>
            <div class="exec-subject-actions"><button data-idx="${i}"><i class="bi bi-play-fill"></i></button></div>`;
        row.querySelector('button').addEventListener('click', () => selectSubject(i));
        container.appendChild(row);
    });
}

document.getElementById('btnEditarCiclo').addEventListener('click', () => {
    if (currentExecCiclo) { 
        // Pause timer if running
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; timerRunning = false; }
        openCicloConfigForEdit(currentExecCiclo); 
    }
});

// ===== IMPORTAR CONCURSOS OFICIAIS (Aluno) =====
async function loadConcursosOficiais() {
    try {
        const snap = await firestore.collection('concursos_oficiais').orderBy('nome', 'asc').get({ source: 'server' });
        const grid = document.getElementById('concursosOficiaisGrid');
        if (!grid) return;
        if (snap.empty) {
            grid.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);grid-column:1/-1;">Nenhum concurso oficial disponível no momento.</div>';
            return;
        }
        grid.innerHTML = snap.docs.map(doc => {
            const c = doc.data();
            const totalQ = c.disciplinas ? c.disciplinas.reduce((s, d) => s + (d.peso || 0), 0) : 0;
            const discList = c.disciplinas ? c.disciplinas.map(d => d.nome).slice(0, 3).join(', ') + (c.disciplinas.length > 3 ? '...' : '') : '';
            return `
                <div class="card-mentor concurso-oficial-card" style="padding:16px;cursor:default;">
                    <h4 style="margin:0 0 6px;font-size:1rem;">${c.nome}</h4>
                    <p style="color:var(--text-secondary);font-size:0.8rem;margin:0 0 8px;">${c.disciplinas.length} disciplinas · ${totalQ} questões</p>
                    <p style="color:var(--text-muted);font-size:0.75rem;margin:0 0 12px;">${discList}</p>
                    <button class="btn-executar btn-importar-concurso" data-id="${doc.id}" style="width:100%;padding:8px;font-size:0.85rem;">
                        <i class="bi bi-download"></i> Importar Concurso
                    </button>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.btn-importar-concurso').forEach(btn => {
            btn.addEventListener('click', async () => {
                const docId = btn.dataset.id;
                const docSnap = await firestore.collection('concursos_oficiais').doc(docId).get({ source: 'server' });
                if (!docSnap.exists) return showToast('Concurso não encontrado.');

                const data = docSnap.data();
                // Check if already imported
                const exists = concursos.some(c => c.nome === data.nome && c._oficialId === docId);
                if (exists) return showToast('Você já importou este concurso!');

                concursos.push({
                    id: Date.now(),
                    nome: data.nome,
                    disciplinas: (data.disciplinas || []).map(d => ({ nome: d.nome, peso: d.peso })),
                    _oficialId: docId
                });
                saveAll();
                renderConcursosList();
                showToast('Concurso importado com sucesso!');
            });
        });
    } catch (e) {
        console.warn('Erro ao carregar concursos oficiais:', e.message);
    }
}

// ===== INIT =====
renderConcursosList();
renderCiclosList();


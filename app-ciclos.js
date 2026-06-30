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
let elapsedSessionSeconds = 0;
let selectedConcursoForCiclo = null;
let editingCicloId = null;

function saveStudyProgress(instant = false) {
    if (currentPhase === 'break') {
        elapsedSessionSeconds = 0;
        return;
    }
    if (!currentExecCiclo || currentSubjectIndex < 0) return;
    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
    if (!items || items.length === 0) return;
    const s = items[currentSubjectIndex];
    if (!s) return;

    if (s.tempoRestanteSegundos === undefined) {
        s.tempoRestanteSegundos = (s.tempoRestanteMin !== undefined ? s.tempoRestanteMin : (s.duracao || s.totalMin || 120)) * 60;
    }

    if (elapsedSessionSeconds > 0) {
        s.tempoRestanteSegundos = Math.max(0, s.tempoRestanteSegundos - elapsedSessionSeconds);
        s.tempoRestanteMin = Math.ceil(s.tempoRestanteSegundos / 60);
        
        const elapsedMinutesFloat = elapsedSessionSeconds / 60;
        
        if (currentExecCiclo.horasEstudadasMin === undefined) {
            currentExecCiclo.horasEstudadasMin = 0;
        }
        currentExecCiclo.horasEstudadasMin += elapsedMinutesFloat;
        
        const elapsedMinutes = Math.floor(elapsedSessionSeconds / 60);
        if (elapsedMinutes > 0 && typeof historicoEstudos !== 'undefined') {
            const logEntry = {
                id: Date.now(),
                cicloNome: currentExecCiclo.nome,
                materiaNome: s.nome,
                duracaoMin: elapsedMinutes,
                data: new Date().toISOString(),
                fase: divisionEnabled ? (currentPhase === 'revision' ? 'Revisão' : 'Conteúdo Novo') : 'Geral'
            };
            historicoEstudos.push(logEntry);
        }

        const proposedMin = currentExecCiclo.duracaoMin || 
            (currentExecCiclo.sequence ? currentExecCiclo.sequence.reduce((acc, curr) => acc + (curr.duracao || 0), 0) : 0);
        
        if (currentExecCiclo.horasEstudadasMin >= proposedMin) {
            currentExecCiclo.ciclosRealizados++;
            currentExecCiclo.horasEstudadasMin = 0;
            items.forEach(item => {
                item.tempoRestanteMin = item.duracao || item.totalMin || 120;
                item.tempoRestanteSegundos = item.tempoRestanteMin * 60;
                item.tempoFaseSegundos = undefined;
                item.faseAtual = undefined;
            });
            showToast('🎖️ PARABÉNS! Você concluiu uma rodada inteira do ciclo!');
        }
    }

    s.tempoFaseSegundos = timerSeconds;
    s.faseAtual = currentPhase;
    if (divisionEnabled) {
        s.revisionMinutes = revisionMinutes;
        s.studyMinutes = studyMinutes;
    }

    currentExecCiclo.savedSubjectIndex = currentSubjectIndex;
    currentExecCiclo.savedPhase = currentPhase;
    currentExecCiclo.savedDivisionEnabled = divisionEnabled;

    saveAll(instant);
    renderExecSubjects(currentExecCiclo.sequence || []);
    
    elapsedSessionSeconds = 0;
}

function showCiclosView(viewId) {
    ['ciclos-list-view','ciclos-wizard-view','ciclos-config-view','ciclos-exec-view','ciclos-foco-view'].forEach(id => document.getElementById(id).classList.add('d-none'));
    document.getElementById(viewId).classList.remove('d-none');
}

// Round to nearest 30 min, minimum 30min (allows lighter subjects to get less time)
function round30(minutes) { return Math.max(30, Math.round(minutes / 30) * 30); }

// Calculate hours per subject based on weight proportion
// Only active subjects get time allocated; inactive get 0
function calcHorasPorMateria(disciplinas, totalHoras, niveis) {
    const activeDisciplinas = disciplinas.filter(d => d.ativo !== false);
    const totalPeso = activeDisciplinas.reduce((s, d) => s + d.peso, 0);
    if (totalPeso === 0) return disciplinas.map(() => 0);
    
    let result = disciplinas.map((d, i) => {
        if (d.ativo === false) return 0;
        let minutos = (d.peso / totalPeso) * totalHoras * 60;
        const nivel = (niveis && niveis[i]) || 0;
        minutos *= (1 - nivel * 0.1); // 10% per star
        return minutos;
    });
    // redistribute saved time proportionally among ALL active subjects (by weight)
    const totalOriginal = totalHoras * 60;
    const totalAfter = result.reduce((s, m) => s + m, 0);
    const saved = totalOriginal - totalAfter;
    if (saved > 0) {
        const activeWeights = result.map((m, i) => disciplinas[i].ativo === false ? 0 : disciplinas[i].peso);
        const sumWeights = activeWeights.reduce((s, v) => s + v, 0);
        if (sumWeights > 0) result = result.map((m, i) => m + (activeWeights[i] / sumWeights) * saved);
    }
    return result.map((m, i) => disciplinas[i].ativo === false ? 0 : round30(m));
}

// Generate cycle sequence with optimal spacing
// Heavy subjects are spread apart, light subjects fill the gaps
function generateCycleSequence(materias, sessaoTipo) {
    const activeMaterias = materias.filter(m => m.ativo !== false && m.totalMin > 0);
    if (activeMaterias.length === 0) return [];

    const minPeso = Math.min(...activeMaterias.map(m => m.peso));
    
    // Determine the session block size
    let blockMinutes = 120; // default/intelligent
    const isFixo = sessaoTipo && sessaoTipo !== 'inteligente';
    if (isFixo) {
        blockMinutes = parseInt(sessaoTipo);
    }
    
    // Step 1: Create sessions for each subject
    const sessionsBySubject = {};
    
    activeMaterias.forEach((m, i) => {
        sessionsBySubject[i] = [];
        let remaining = m.totalMin;
        
        while (remaining > 0) {
            let dur = Math.min(remaining, blockMinutes);
            
            // Special rule for intelligent mode only
            if (!isFixo && remaining === 150) {
                dur = 90;
            }
            
            sessionsBySubject[i].push({ nome: m.nome, duracao: dur, idx: i, peso: m.peso });
            remaining -= dur;
        }
    });

    // Step 2: Interleave using "most remaining + max distance" greedy
    // Always pick the subject with the most sessions left,
    // but never the same as the last one.
    // This naturally spaces heavy subjects and fills gaps with lighter ones.
    const result = [];
    const remaining = {};
    Object.keys(sessionsBySubject).forEach(k => { remaining[k] = sessionsBySubject[k].length; });
    const totalSessions = Object.values(remaining).reduce((s, v) => s + v, 0);
    // Track last position each subject was placed at
    const lastPos = {};
    
    for (let pos = 0; pos < totalSessions; pos++) {
        let bestKey = null;
        let bestScore = -Infinity;
        
        for (const k of Object.keys(remaining)) {
            if (remaining[k] <= 0) continue;
            // Never repeat the same subject consecutively
            if (result.length > 0 && result[result.length - 1].idx === parseInt(k)) continue;
            
            // Score: prioritize subjects with more remaining sessions
            // and those that haven't appeared recently (larger distance = better)
            const distance = lastPos[k] !== undefined ? (pos - lastPos[k]) : totalSessions;
            const sessionsLeft = remaining[k];
            // Ideal spacing for this subject = totalSessions / original count
            const idealSpacing = totalSessions / sessionsBySubject[k].length;
            // Score combines: how overdue this subject is + how many sessions remain
            const score = (distance / idealSpacing) * 100 + sessionsLeft * 10;
            
            if (score > bestScore) {
                bestScore = score;
                bestKey = k;
            }
        }
        
        // Fallback: if no different subject available, pick the one with most remaining
        if (bestKey === null) {
            for (const k of Object.keys(remaining)) {
                if (remaining[k] > 0) { bestKey = k; break; }
            }
        }
        
        if (bestKey === null) break;
        
        const session = sessionsBySubject[bestKey][sessionsBySubject[bestKey].length - remaining[bestKey]];
        result.push(session);
        remaining[bestKey]--;
        lastPos[bestKey] = pos;
    }
    
    return result;
}

function formatMin(min) { const h = Math.floor(min/60); const m = Math.floor(min % 60); return m > 0 ? `${h}:${String(m).padStart(2,'0')}h` : `${h}:00h`; }

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
            // Auto-proceed to config
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
    
    const horasInput = document.getElementById('configHorasInput');
    if (horasInput) horasInput.value = horas;
    
    const horasDisplay = document.getElementById('configHorasDisplay');
    if (horasDisplay) horasDisplay.textContent = horas + 'h';
    
    const sessaoSelect = document.getElementById('configSessaoTipo');
    if (sessaoSelect) sessaoSelect.value = 'inteligente';
    
    currentCicloMaterias = conc.disciplinas.map(d => ({ nome: d.nome, peso: d.peso, nivel: 0, ativo: true }));
    // Auto-adjust star levels based on simulado results
    autoAdjustNiveis(currentCicloMaterias);
    renderMateriasConfig(horas);
    showCiclosView('ciclos-config-view');
}

// Open config for editing an existing ciclo
function openCicloConfigForEdit(ciclo) {
    editingCicloId = ciclo.id;
    const horas = getStudyHours() || 20;
    
    document.getElementById('configCicloNome').value = ciclo.nome;
    document.getElementById('configConcursoNome').textContent = ciclo.concurso || '';
    
    const horasInput = document.getElementById('configHorasInput');
    if (horasInput) horasInput.value = horas;
    
    const horasDisplay = document.getElementById('configHorasDisplay');
    if (horasDisplay) horasDisplay.textContent = horas + 'h';
    
    const sessaoSelect = document.getElementById('configSessaoTipo');
    if (sessaoSelect) sessaoSelect.value = ciclo.sessaoTipo || 'inteligente';
    
    // Load subjects with their saved ativo state
    currentCicloMaterias = (ciclo.subjects || []).map(s => ({
        nome: s.nome,
        peso: s.peso || 1,
        nivel: s.nivel || 0,
        ativo: s.ativo !== false,
        totalMin: s.totalMin || 0
    }));
    // Recalculate hours
    renderMateriasConfig(horas);
    showCiclosView('ciclos-config-view');
}

// Recalculate when hours input changes
const horasInput = document.getElementById('configHorasInput');
if (horasInput) {
    horasInput.addEventListener('input', function() {
        const h = parseInt(this.value) || 1;
        renderMateriasConfig(h);
    });
}

function renderMateriasConfig(totalHoras) {
    if (!totalHoras) totalHoras = getStudyHours();
    const niveis = currentCicloMaterias.map(m => m.nivel);
    const horasArr = calcHorasPorMateria(currentCicloMaterias, totalHoras, niveis);
    const tbody = document.getElementById('materiasBody'); tbody.innerHTML = '';
    const activeCount = currentCicloMaterias.filter(m => m.ativo !== false).length;
    currentCicloMaterias.forEach((m, idx) => {
        const tr = document.createElement('tr');
        if (m.ativo === false) tr.classList.add('materia-inativa');
        const starsHtml = [1,2,3,4,5].map(s =>
            `<i class="bi bi-star${s <= m.nivel ? '-fill' : ''} ${s <= m.nivel ? 'active' : ''}" data-idx="${idx}" data-star="${s}"></i>`
        ).join('');
        m.totalMin = horasArr[idx];
        const horasDisplay = m.ativo === false ? '—' : formatMin(horasArr[idx]);
        tr.innerHTML = `<td><span>${m.nome}</span></td>
            <td><strong>${m.peso}</strong></td>
            <td><div class="materia-stars">${starsHtml}</div></td>
            <td><span class="materia-hours">${horasDisplay}</span></td>
            <td>
                <label class="materia-toggle" title="${m.ativo !== false ? 'Desativar matéria' : 'Ativar matéria'}">
                    <input type="checkbox" ${m.ativo !== false ? 'checked' : ''} data-idx="${idx}" class="materia-toggle-input">
                    <span class="materia-toggle-slider"></span>
                </label>
            </td>`;
        tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.materia-stars i').forEach(star => {
        star.addEventListener('click', () => {
            const idx = parseInt(star.dataset.idx);
            const starVal = parseInt(star.dataset.star);
            // Toggle: if clicking the same star, unset (nivel = 0)
            if (currentCicloMaterias[idx].nivel === starVal) {
                currentCicloMaterias[idx].nivel = 0;
            } else {
                currentCicloMaterias[idx].nivel = starVal;
            }
            renderMateriasConfig(totalHoras);
        });
    });
    tbody.querySelectorAll('.materia-toggle-input').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const idx = parseInt(this.dataset.idx);
            currentCicloMaterias[idx].ativo = this.checked;
            renderMateriasConfig(totalHoras);
        });
    });
    // Update active count warning
    if (activeCount === 0) {
        document.getElementById('btnGerarCiclo').disabled = true;
        showToast('Ative pelo menos uma matéria para gerar o ciclo.');
    } else {
        document.getElementById('btnGerarCiclo').disabled = false;
    }
}

document.getElementById('btnStartWizard').addEventListener('click', openCicloWizard);
document.getElementById('btnNovoCiclo').addEventListener('click', openCicloWizard);
const back1 = document.getElementById('backToCiclosList');
if (back1) back1.addEventListener('click', (e) => { e.preventDefault(); showCiclosView('ciclos-list-view'); });
const back2 = document.getElementById('backToCiclosFromConfig');
if (back2) back2.addEventListener('click', (e) => { 
    e.preventDefault(); 
    if (ciclos && ciclos.length > 0) openExecView(ciclos[0]);
    else showCiclosView('ciclos-wizard-view'); 
});
const back3 = document.getElementById('backToCiclosFromExec');
if (back3) back3.addEventListener('click', (e) => { 
    e.preventDefault(); 
    saveStudyProgress(); 
    showCiclosView('ciclos-list-view'); 
});

// Generate ciclo (or update existing)
document.getElementById('btnGerarCiclo').addEventListener('click', () => {
    const activeMaterias = currentCicloMaterias.filter(m => m.ativo !== false);
    if (activeMaterias.length === 0) return showToast('Ative pelo menos uma matéria!');
    
    const nome = document.getElementById('configCicloNome').value || 'Novo Ciclo';
    const totalH = parseInt(document.getElementById('configHorasInput').value) || 20;
    const sessaoTipo = document.getElementById('configSessaoTipo').value || 'inteligente';
    
    const sequence = generateCycleSequence(currentCicloMaterias, sessaoTipo);
    sequence.forEach(item => {
        item.tempoRestanteMin = item.duracao;
    });
    const totalSeqMin = sequence.reduce((s, x) => s + x.duracao, 0);
    const subjects = currentCicloMaterias.map(m => ({ 
        nome: m.nome, sessao: formatMin(m.totalMin), 
        tempoRestante: formatMin(m.totalMin), peso: m.peso, 
        totalMin: m.totalMin, ativo: m.ativo !== false, nivel: m.nivel || 0
    }));
    
    if (editingCicloId) {
        // Update existing ciclo
        const idx = ciclos.findIndex(c => c.id === editingCicloId);
        if (idx !== -1) {
            ciclos[idx] = { 
                ...ciclos[idx],
                nome, subjects, sequence, 
                duracao: formatMin(totalSeqMin),
                duracaoMin: totalSeqMin,
                sessaoTipo
            };
        }
        editingCicloId = null;
        showToast('Ciclo atualizado!');
    } else {
        // Create new ciclo
        const newCiclo = { 
            id: Date.now(), nome, 
            concurso: selectedConcursoForCiclo?.nome || '', 
            duracao: formatMin(totalSeqMin), avanco: '0:00h', 
            duracaoMin: totalSeqMin,
            horasEstudadasMin: 0,
            ciclosRealizados: 0, subjects, sequence,
            sessaoTipo
        };
        ciclos.push(newCiclo);
        showToast('Ciclo gerado com sucesso!');
    }
    saveAll();
    openExecView(ciclos[0]);
});

// Delete Single Cycle Handler
const btnDeleteCiclo = document.getElementById('btnDeleteCiclo');
if (btnDeleteCiclo) {
    btnDeleteCiclo.addEventListener('click', async () => {
        if (await showConfirm('Tem certeza que deseja apagar o seu ciclo atual? Isso limpará seu progresso de estudo desse concurso!')) {
            ciclos = [];
            saveAll();
            showToast('Ciclo excluído. Você pode criar um novo.');
            openCicloWizard();
        }
    });
}

function renderCiclosList() {
    const container = document.getElementById('ciclosListCards');
    const createCard = document.getElementById('cicloCreateCard');
    const btnNovo = document.getElementById('btnNovoCiclo');
    if (ciclos.length > 0) { createCard.style.display = 'none'; btnNovo.style.display = 'block'; }
    else { createCard.style.display = 'block'; btnNovo.style.display = 'none'; }
    container.innerHTML = '';
    ciclos.forEach(c => {
        const card = document.createElement('div'); card.className = 'ciclo-list-card';
        card.innerHTML = `<div class="ciclo-list-badge"><i class="bi bi-trophy"></i></div>
            <div class="ciclo-list-info"><div class="ciclo-list-name">${c.nome}</div>
            <div class="ciclo-list-meta"><span>Duração: <strong>${c.duracao}</strong></span><span>Ciclos: <strong>${c.ciclosRealizados}</strong></span></div></div>
            <button class="btn-exec-ciclo" data-id="${c.id}"><i class="bi bi-play-fill"></i> Executar</button>
            <button class="btn-actions btn-del-ciclo" data-id="${c.id}" style="margin-left:8px;"><i class="bi bi-trash3"></i></button>`;
        container.appendChild(card);
    });
    container.querySelectorAll('.btn-exec-ciclo').forEach(btn => btn.addEventListener('click', () => { 
        const c = ciclos.find(x => x.id === parseInt(btn.dataset.id)); 
        if (c) {
            localStorage.setItem('activeCicloId', c.id);
            if (typeof updateDashboard === 'function') updateDashboard();
            openExecView(c); 
        }
    }));
    container.querySelectorAll('.btn-del-ciclo').forEach(btn => btn.addEventListener('click', () => { 
        const idToDelete = parseInt(btn.dataset.id);
        ciclos = ciclos.filter(c => c.id !== idToDelete);
        const activeCicloId = localStorage.getItem('activeCicloId');
        if (activeCicloId && parseInt(activeCicloId) === idToDelete) {
            localStorage.removeItem('activeCicloId');
        }
        saveAll(); 
        renderCiclosList(); 
        showToast('Ciclo excluído!'); 
    }));
}

// Execution View
let divisionEnabled = false;
let currentPhase = 'study'; // 'revision', 'study' or 'break'
let revisionMinutes = 0;
let studyMinutes = 0;
let pomodoroEnabled = false;
let pomodoroBreakMin = 5;
let lastCompletedSubject = "";
let lastCompletedContest = "";

function openExecView(ciclo) {
    const isAlreadyRunning = (currentExecCiclo && currentExecCiclo.id === ciclo.id);
    
    currentExecCiclo = ciclo;
    document.getElementById('execCicloLabel').textContent = ciclo.nome;
    
    // Initialize Pomodoro UI
    pomodoroEnabled = DB.load('pomodoroEnabled', false);
    pomodoroBreakMin = DB.load('pomodoroBreakMin', 5);
    
    document.getElementById('pomodoroToggle').checked = pomodoroEnabled;
    document.getElementById('pomodoroContent').style.display = pomodoroEnabled ? 'block' : 'none';
    document.getElementById('pomodoroBreakMinutesText').textContent = pomodoroBreakMin + ' minutos';
    document.getElementById('pomodoroSlider').value = pomodoroBreakMin;
    
    if (isAlreadyRunning) {
        // Keep active states!
        document.getElementById('divisionToggle').checked = divisionEnabled;
        document.getElementById('divisionContent').style.display = divisionEnabled ? 'block' : 'none';
        
        if (divisionEnabled) {
            document.getElementById('wheelBadge').style.display = 'inline-block';
            document.getElementById('wheelBadge').textContent = currentPhase === 'revision' ? 'Revisão' : 'Conteúdo novo';
            document.getElementById('wheelBadge').style.background = currentPhase === 'revision' ? 'var(--accent-blue)' : 'var(--accent-green)';
        } else {
            document.getElementById('wheelBadge').style.display = 'none';
        }
        
        // Re-render components with active states
        renderWheel(ciclo.sequence || ciclo.subjects);
        renderExecSubjects(ciclo.sequence || []);
        
        // Update visual active row highlight
        document.querySelectorAll('.exec-subject-row').forEach((row, i) => {
            row.classList.toggle('active-subject', i === currentSubjectIndex);
        });
        
        const s = (ciclo.sequence || ciclo.subjects)[currentSubjectIndex];
        if (s) {
            document.getElementById('wheelSubject').textContent = s.nome.length > 16 ? s.nome.substring(0, 16) + '...' : s.nome;
            document.getElementById('execSubjectName').textContent = s.nome;
        }
        
        updateTimerDisplay();
        
        // Set button label correctly based on running state
        document.getElementById('btnIniciarTimer').innerHTML = timerRunning ? '<i class="bi bi-pause-fill"></i> Pausar' : '<i class="bi bi-play-fill"></i> Iniciar';
    } else {
        // If a new cycle starts, save old one first if any
        saveStudyProgress();
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            timerRunning = false;
        }
        
        currentSubjectIndex = ciclo.savedSubjectIndex !== undefined ? ciclo.savedSubjectIndex : 0;
        divisionEnabled = ciclo.savedDivisionEnabled || false;
        currentPhase = ciclo.savedPhase || 'study';
        elapsedSessionSeconds = 0;
        
        document.getElementById('divisionToggle').checked = divisionEnabled;
        document.getElementById('divisionContent').style.display = divisionEnabled ? 'block' : 'none';
        document.getElementById('wheelBadge').style.display = divisionEnabled ? 'inline-block' : 'none';
        if (divisionEnabled) {
            document.getElementById('wheelBadge').textContent = currentPhase === 'revision' ? 'Revisão' : 'Conteúdo novo';
            document.getElementById('wheelBadge').style.background = currentPhase === 'revision' ? 'var(--accent-blue)' : 'var(--accent-green)';
        }
        
        renderWheel(ciclo.sequence || ciclo.subjects);
        selectSubject(currentSubjectIndex);
        renderExecSubjects(ciclo.sequence || []);
        
        document.getElementById('btnIniciarTimer').innerHTML = '<i class="bi bi-play-fill"></i> Iniciar';
    }
    
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
    const darkColors = ['#484848','#3e3e3e','#545454','#424242','#4e4e4e','#383838','#505050','#464646'];
    const greenActive = '#5a8a2a';

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
        
        let fillColor = darkColors[i % darkColors.length];
        if (s.concluida) {
            fillColor = 'var(--accent-green)'; // Green for completed
        } else if (i === currentSubjectIndex) {
            fillColor = 'var(--accent-yellow)'; // Yellow for currently studying
        }
        
        path.style.fill = fillColor;
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
    if (timerRunning) {
        if (typeof showToast === 'function') {
            showToast('Pause o cronômetro antes de trocar de matéria.');
        }
        return;
    }
    
    // Save progress of the previous subject before switching!
    if (currentSubjectIndex >= 0) {
        saveStudyProgress();
    } else {
        elapsedSessionSeconds = 0;
    }
    
    currentSubjectIndex = idx;
    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
    const s = items[idx];
    const totalMin = s.duracao || s.totalMin || 120;

    document.getElementById('wheelSubject').textContent = s.nome.length > 16 ? s.nome.substring(0, 16) + '...' : s.nome;
    document.getElementById('execSubjectName').textContent = s.nome;

    // Reset division for new subject if no previous state exists
    revisionMinutes = s.revisionMinutes !== undefined ? s.revisionMinutes : Math.round(totalMin * 0.33);
    studyMinutes = s.studyMinutes !== undefined ? s.studyMinutes : (totalMin - revisionMinutes);
    updateDivisionDisplay(totalMin);

    if (s.faseAtual) {
        currentPhase = s.faseAtual;
    } else {
        currentPhase = divisionEnabled ? 'revision' : 'study';
    }

    if (s.tempoFaseSegundos !== undefined) {
        timerSeconds = s.tempoFaseSegundos;
    } else {
        if (divisionEnabled && currentPhase === 'revision') {
            timerSeconds = revisionMinutes * 60;
        } else {
            timerSeconds = totalMin * 60;
        }
    }

    if (divisionEnabled) {
        document.getElementById('wheelBadge').style.display = 'inline-block';
        if (currentPhase === 'revision') {
            document.getElementById('wheelBadge').textContent = 'Revisão';
            document.getElementById('wheelBadge').style.background = 'var(--accent-blue)';
        } else {
            document.getElementById('wheelBadge').textContent = 'Conteúdo novo';
            document.getElementById('wheelBadge').style.background = 'var(--accent-green)';
        }
    } else {
        document.getElementById('wheelBadge').style.display = 'none';
    }

    updateTimerDisplay();
    renderWheel(items);
    document.querySelectorAll('.exec-subject-row').forEach((row, i) => row.classList.toggle('active-subject', i === idx));

    // Update suggestion with matching Bisu or curated general tip
    const suggestionEl = document.querySelector('.mentor-suggestion p');
    if (suggestionEl) {
        let matchingBisu = null;
        if (typeof bisusList !== 'undefined' && bisusList && bisusList.length > 0) {
            matchingBisu = bisusList.find(b => 
                (b.categoria && b.categoria.toLowerCase().includes(s.nome.toLowerCase())) ||
                (b.titulo && b.titulo.toLowerCase().includes(s.nome.toLowerCase()))
            );
        }
        
        if (matchingBisu) {
            suggestionEl.innerHTML = `<strong>Bisu de Ouro (${matchingBisu.titulo}):</strong> ${matchingBisu.resumo || matchingBisu.conteudo.replace(/<[^>]*>/g, '').substring(0, 150) + '...'}`;
        } else {
            const fallbackSuggestions = [
                "Para esta disciplina, use o Método da Recapitulação Ativa: após estudar um tópico, feche o material e tente explicar o conteúdo em voz alta com suas próprias palavras.",
                "Não avance sem antes realizar pelo menos 5 a 10 questões rápidas sobre o conteúdo estudado para fixar as pegadinhas da banca examinadora.",
                "Selecione os artigos da lei seca correspondentes e faça uma leitura tática com marcações rápidas nos termos 'sempre', 'nunca', 'salvo' e 'exclusivamente'.",
                "Pratique a Técnica Feynman: simule que está ensinando esta matéria para um iniciante. Onde você hesitar ou travar na explicação é onde precisa revisar.",
                "Mantenha um caderno de erros rápido para esta disciplina. Registre apenas as questões que você errou e o motivo real do erro para revisar no final da semana."
            ];
            const randomTip = fallbackSuggestions[idx % fallbackSuggestions.length];
            suggestionEl.textContent = randomTip;
        }
    }
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

function syncFocoTimerControls() {
    const btnMain = document.getElementById('btnIniciarTimer');
    const btnFoco = document.getElementById('btnIniciarTimerFoco');
    if (btnMain && btnFoco) {
        btnFoco.innerHTML = btnMain.innerHTML;
        if (timerRunning) {
            btnFoco.style.background = 'var(--bg-secondary)';
            btnFoco.style.color = 'var(--text-primary)';
            btnFoco.style.border = '1px solid var(--border-color)';
            btnFoco.style.boxShadow = 'none';
        } else {
            btnFoco.style.background = 'var(--accent-green)';
            btnFoco.style.color = '#fff';
            btnFoco.style.border = 'none';
            btnFoco.style.boxShadow = 'var(--shadow)';
        }
    }

    const badge = document.getElementById('wheelBadge');
    const focoBadge = document.getElementById('focoWheelBadge');
    if (badge && focoBadge) {
        focoBadge.style.display = badge.style.display;
        focoBadge.textContent = badge.textContent;
        if (badge.textContent === 'Revisão') {
            focoBadge.style.color = '#fff';
            focoBadge.style.background = 'var(--accent-blue)';
        } else if (badge.textContent === 'Descanso' || badge.textContent === 'Descanso Tático') {
            focoBadge.style.color = '#000';
            focoBadge.style.background = 'var(--accent-yellow)';
        } else if (badge.style.display !== 'none') {
            focoBadge.style.color = '#fff';
            focoBadge.style.background = 'var(--accent-green)';
        } else {
            focoBadge.style.display = 'none';
        }
    }
}

function updateTimerDisplay() {
    const h = Math.floor(timerSeconds / 3600), m = Math.floor((timerSeconds % 3600) / 60), s = timerSeconds % 60;
    const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    document.getElementById('wheelTimer').textContent = timeStr;
    const focoTimer = document.getElementById('focoWheelTimer');
    if (focoTimer) focoTimer.textContent = timeStr;
    syncFocoTimerControls();
    if (typeof persistActiveTimerState === 'function') persistActiveTimerState();
}

function toggleStudyTimer() {
    const btnMain = document.getElementById('btnIniciarTimer');
    if (timerRunning) {
        clearInterval(timerInterval); timerRunning = false;
        if (btnMain) btnMain.innerHTML = '<i class="bi bi-play-fill"></i> Iniciar';
        saveStudyProgress();
        if (typeof syncFocoTimerControls === 'function') syncFocoTimerControls();
        if (typeof persistActiveTimerState === 'function') persistActiveTimerState(true);
    } else {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
        timerRunning = true;
        if (btnMain) btnMain.innerHTML = '<i class="bi bi-pause-fill"></i> Pausar';
        if (typeof syncFocoTimerControls === 'function') syncFocoTimerControls();
        if (typeof persistActiveTimerState === 'function') persistActiveTimerState(true);
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                if (currentPhase !== 'break') {
                    elapsedSessionSeconds++;
                    if (elapsedSessionSeconds >= 60) {
                        saveStudyProgress();
                    }
                }
                updateTimerDisplay();
            } else {
                if (currentPhase !== 'break') {
                    saveStudyProgress();
                    elapsedSessionSeconds = 0;
                }
                clearInterval(timerInterval); timerRunning = false;
                if (btnMain) btnMain.innerHTML = '<i class="bi bi-play-fill"></i> Iniciar';
                if (typeof syncFocoTimerControls === 'function') syncFocoTimerControls();
                if (typeof persistActiveTimerState === 'function') persistActiveTimerState(true);
                if (currentPhase === 'break') {
                    endTacticalBreak();
                } else if (divisionEnabled && currentPhase === 'revision') {
                    currentPhase = 'study';
                    timerSeconds = studyMinutes * 60;
                    document.getElementById('wheelBadge').textContent = 'Conteúdo novo';
                    document.getElementById('wheelBadge').style.background = 'var(--accent-green)';
                    updateTimerDisplay();
                    playTacticalChime();
                    sendTacticalNotification("Revisão Concluída! 🎖️", "Iniciando fase de Conteúdo Novo.");
                    showToast('Revisão concluída! Agora, conteúdo novo.');
                } else {
                    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
                    const s = items[currentSubjectIndex];
                    handleSubjectCycleCompletion(s, items);
                }
            }
        }, 1000);
    }
}

document.getElementById('btnIniciarTimer').addEventListener('click', toggleStudyTimer);

document.getElementById('divisionToggle').addEventListener('change', function() {
    divisionEnabled = this.checked;
    document.getElementById('divisionContent').style.display = this.checked ? 'block' : 'none';

    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
    const s = items[currentSubjectIndex];
    const totalMin = s?.duracao || s?.totalMin || 120;

    if (this.checked) {
        timerSeconds = revisionMinutes * 60;
        document.getElementById('wheelBadge').style.display = 'inline-block';
        document.getElementById('wheelBadge').textContent = 'Revisão';
        document.getElementById('wheelBadge').style.background = 'var(--accent-blue)';
        currentPhase = 'revision';
        revisionMinutes = Math.round(totalMin * 0.33);
        studyMinutes = totalMin - revisionMinutes;
        updateDivisionDisplay(totalMin);
        document.getElementById('wheelBadge').style.display = 'inline-block';
        document.getElementById('wheelBadge').textContent = 'Revisão';
        document.getElementById('wheelBadge').style.background = 'var(--accent-blue)';
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
function confirmStudyDivision() {
    currentPhase = 'revision';
    timerSeconds = revisionMinutes * 60;
    document.getElementById('wheelBadge').textContent = 'Revisão';
    document.getElementById('wheelBadge').style.background = 'var(--accent-blue)';
    updateTimerDisplay();
    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
    renderWheel(items);
    showToast('Divisão confirmada! Inicie a revisão.');
}

document.getElementById('btnConfirmDivision').addEventListener('click', confirmStudyDivision);

function renderExecSubjects(sequence) {
    const container = document.getElementById('execSubjectsList'); container.innerHTML = '';
    const items = sequence.length ? sequence : currentExecCiclo.subjects;
    items.forEach((s, i) => {
        const row = document.createElement('div');
        const isChecked = s.concluida ? 'checked' : '';
        const isCompletedClass = s.concluida ? ' subject-completed' : '';
        row.className = `exec-subject-row${i === currentSubjectIndex ? ' active-subject' : ''}${isCompletedClass}`;
        const dur = s.duracao ? formatMin(s.duracao) : s.sessao;
        
        // Dynamic remaining time calculation
        const remMin = s.tempoRestanteMin !== undefined ? s.tempoRestanteMin : (s.duracao || s.totalMin || 120);
        const remFmt = formatMin(remMin);
        
        row.innerHTML = `<span class="materia-name">${s.nome}</span><span class="sessao-time">${dur}</span><span class="tempo-rest"><i class="bi bi-clock"></i> ${remFmt}</span><div class="exec-subject-actions"><label class="division-check" title="Marcar como concluído" style="margin:0; cursor:pointer;"><input type="checkbox" onchange="if(this.checked){ forceCompleteSubject(${i}); }else{ uncompleteSubject(${i}); }" style="accent-color: var(--accent-green); cursor:pointer;" ${isChecked}> Concluir</label></div>`;
        row.style.cursor = 'pointer';
        row.addEventListener('click', (e) => {
            if(e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
                selectSubject(i);
            }
        });
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

// ===== POMODORO EVENT BINDINGS =====
document.getElementById('pomodoroToggle').addEventListener('change', function() {
    pomodoroEnabled = this.checked;
    DB.save('pomodoroEnabled', pomodoroEnabled);
    document.getElementById('pomodoroContent').style.display = this.checked ? 'block' : 'none';
    showToast(this.checked ? 'Pomodoro Ativado! Descanso tático configurado.' : 'Pomodoro Desativado.');
});

document.getElementById('pomodoroSlider').addEventListener('input', function() {
    pomodoroBreakMin = parseInt(this.value);
    DB.save('pomodoroBreakMin', pomodoroBreakMin);
    document.getElementById('pomodoroBreakMinutesText').textContent = pomodoroBreakMin + ' minutos';
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

// ===== AUTO-ADJUST STAR LEVELS FROM SIMULADOS =====
function autoAdjustNiveis(materias) {
    if (!simulados || !simulados.length) return;
    const withResult = simulados.filter(s => s.resultado && s.resultado.totalQ > 0 && s.disciplinas);
    if (!withResult.length) return;

    // Build per-subject accuracy map from all simulados
    const materiaMap = {};
    withResult.forEach(sim => {
        sim.disciplinas.forEach(d => {
            if (d.questoes <= 0) return;
            if (!materiaMap[d.nome]) materiaMap[d.nome] = { totalQ: 0, totalA: 0 };
            materiaMap[d.nome].totalQ += d.questoes;
            materiaMap[d.nome].totalA += d.acertos;
        });
    });

    // Map accuracy to star level (0-5)
    // 0-19% = 0 stars, 20-39% = 1, 40-59% = 2, 60-74% = 3, 75-89% = 4, 90%+ = 5
    materias.forEach(m => {
        const stats = materiaMap[m.nome];
        if (!stats || stats.totalQ === 0) return; // keep default (0) if no data
        const pct = (stats.totalA / stats.totalQ) * 100;
        if (pct >= 90) m.nivel = 5;
        else if (pct >= 75) m.nivel = 4;
        else if (pct >= 60) m.nivel = 3;
        else if (pct >= 40) m.nivel = 2;
        else if (pct >= 20) m.nivel = 1;
        else m.nivel = 0;
    });
}

// ===== INIT =====
renderConcursosList();
renderCiclosList();


// ===== AUDIO ALERTS (Web Audio API Synthesized) =====
function playTacticalChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        // Sound 1 (Chime base note A5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        gain1.gain.setValueAtTime(0.12, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.4);
        
        // Sound 2 (Harmonic echo note E6, slightly offset)
        setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1320, ctx.currentTime);
            gain2.gain.setValueAtTime(0.12, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start();
            osc2.stop(ctx.currentTime + 0.5);
        }, 150);
    } catch (e) {
        console.warn('Audio feedback blocked by browser settings:', e.message);
    }
}

// ===== SYSTEM BROWSER NOTIFICATIONS =====
function sendTacticalNotification(title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(title, { body });
            }
        });
    }
}

// ===== PERSIST ACTIVE TIMER STATE TO DATABASE =====
function persistActiveTimerState(instant = false) {
    if (currentExecCiclo) {
        const state = {
            cycleId: currentExecCiclo.id,
            subjectIndex: currentSubjectIndex,
            divisionEnabled: divisionEnabled,
            currentPhase: currentPhase,
            timerSeconds: timerSeconds,
            timerRunning: timerRunning,
            elapsedSessionSeconds: elapsedSessionSeconds,
            closeTimestamp: Date.now()
        };
        // During study (ticks), save only every 60 seconds to save Firebase Quota.
        // On Pause/Stop (instant = true), flush immediately.
        DB.save('activeTimerState', state, instant ? 0 : 60000);
    } else {
        DB.remove('activeTimerState');
    }
}

window.addEventListener('beforeunload', () => {
    saveStudyProgress(true);
    persistActiveTimerState(true);
});

// ===== RESTORE ACTIVE TIMER STATE ON STARTUP =====
function restoreActiveTimerState() {
    const state = DB.load('activeTimerState', null);
    if (!state || !state.cycleId) return;
    try {
        
        const ciclo = ciclos.find(c => c.id === state.cycleId);
        if (!ciclo) return;
        
        currentExecCiclo = ciclo;
        currentSubjectIndex = state.subjectIndex || 0;
        divisionEnabled = state.divisionEnabled || false;
        currentPhase = state.currentPhase || 'study';
        timerSeconds = state.timerSeconds || 0;
        elapsedSessionSeconds = state.elapsedSessionSeconds || 0;
        
        // Set visual elements if currently in break phase
        if (currentPhase === 'break') {
            const badge = document.getElementById('wheelBadge');
            if (badge) {
                badge.style.display = 'inline-block';
                badge.textContent = 'Descanso Tático';
                badge.style.background = '#4a8b57';
            }
            document.getElementById('wheelSubject').textContent = 'Descansa!';
            document.getElementById('execSubjectName').textContent = 'Descanso Tático - Recuperação de Foco';
            const suggestionEl = document.querySelector('.mentor-suggestion p');
            if (suggestionEl) {
                suggestionEl.textContent = '🎖️ Descanso Tático Iniciado! Relaxe, beba água e faça alguns alongamentos para recuperar sua energia. Seu foco será recarregado em instantes para o próximo combate.';
            }
        }
        
        // If it was running, compute how many seconds passed while away!
        if (state.timerRunning && state.closeTimestamp) {
            const secondsPassed = Math.floor((Date.now() - state.closeTimestamp) / 1000);
            if (secondsPassed > 0) {
                const s = (ciclo.sequence || ciclo.subjects)[currentSubjectIndex];
                if (s) {
                    const remaining = timerSeconds - secondsPassed;
                    if (remaining > 0) {
                        timerSeconds = remaining;
                        if (currentPhase !== 'break') {
                            elapsedSessionSeconds += secondsPassed;
                            saveStudyProgress();
                        }
                        // Resume ticking!
                        resumeTimerTick();
                    } else {
                        // Timer completed while away!
                        timerSeconds = 0;
                        
                        if (currentPhase === 'break') {
                            currentPhase = 'study';
                            showToast('Descanso tático concluído enquanto você estava fora! 🎯');
                            playTacticalChime();
                            sendTacticalNotification(
                                "Fim do Descanso! 🎯", 
                                "Hora de voltar ao combate de estudos!"
                            );
                            
                            // Trigger syllabus modal
                            setTimeout(() => {
                                showSyllabusSyncModal(s.nome, ciclo.concurso);
                            }, 500);
                        } else {
                            if (currentPhase !== 'break') {
                                elapsedSessionSeconds += state.timerSeconds;
                                saveStudyProgress();
                            }
                            
                            showToast('Sessão de estudos concluída enquanto você estava fora! ✅');
                            playTacticalChime();
                            sendTacticalNotification(
                                "Sessão Concluída! 🎖️", 
                                `Você completou a disciplina de ${s.nome}!`
                            );
                            
                            // Trigger syllabus modal
                            setTimeout(() => {
                                showSyllabusSyncModal(s.nome, ciclo.concurso);
                            }, 500);
                        }
                    }
                }
            }
        }
        
        // Clean localStorage state since we successfully restored it!
        localStorage.removeItem('activeTimerState');
    } catch (e) {
        console.warn('Erro ao restaurar cronômetro em segundo plano:', e.message);
    }
}

function resumeTimerTick() {
    if (timerInterval) clearInterval(timerInterval);
    timerRunning = true;
    
    // We get the button if we are inside the cycles exec view to show active state
    const btn = document.getElementById('btnIniciarTimer');
    if (btn) btn.innerHTML = '<i class="bi bi-pause-fill"></i> Pausar';
    if (typeof persistActiveTimerState === 'function') persistActiveTimerState(true);
    
    timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
            timerSeconds--;
            if (currentPhase !== 'break') {
                elapsedSessionSeconds++;
                if (elapsedSessionSeconds >= 60) {
                    saveStudyProgress();
                }
            }
            updateTimerDisplay();
        } else {
            if (currentPhase !== 'break') {
                saveStudyProgress();
                elapsedSessionSeconds = 0;
            }
            clearInterval(timerInterval); timerRunning = false;
            
            const btnStart = document.getElementById('btnIniciarTimer');
            if (btnStart) btnStart.innerHTML = '<i class="bi bi-play-fill"></i> Iniciar';
            if (typeof persistActiveTimerState === 'function') persistActiveTimerState(true);

            if (currentPhase === 'break') {
                endTacticalBreak();
            } else if (divisionEnabled && currentPhase === 'revision') {
                currentPhase = 'study';
                const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
                const s = items[currentSubjectIndex];
                const totalMin = s?.duracao || s?.totalMin || 120;
                revisionMinutes = Math.round(totalMin * 0.33);
                studyMinutes = totalMin - revisionMinutes;
                
                timerSeconds = studyMinutes * 60;
                
                const badge = document.getElementById('wheelBadge');
                if (badge) {
                    badge.textContent = 'Conteúdo novo';
                    badge.style.background = 'var(--accent-green)';
                }
                updateTimerDisplay();
                
                playTacticalChime();
                sendTacticalNotification(
                    "Revisão Concluída! 🎖️", 
                    "Iniciando fase de Conteúdo Novo."
                );
                showToast('Revisão concluída! Agora, conteúdo novo.');
            } else {
                const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
                const s = items[currentSubjectIndex];
                handleSubjectCycleCompletion(s, items);
            }
        }
    }, 1000);
}

// ===== CYCLE COMPLETION & SYLLABUS SYNC =====
function handleSubjectCycleCompletion(s, items) {
    showToast('Sessão concluída! ✅');
    const badge = document.getElementById('wheelBadge');
    if (badge) badge.style.display = 'none';

    if (currentExecCiclo) {
        // We do NOT double count horasEstudadasMin here since saveStudyProgress handles it incrementally.
        const totalMin = s.duracao || s.totalMin || 120;
        
        // Add study log entry to history
        if (typeof historicoEstudos !== 'undefined') {
            const logEntry = {
                id: Date.now(),
                cicloNome: currentExecCiclo.nome,
                materiaNome: s.nome,
                duracaoMin: totalMin,
                data: new Date().toISOString(),
                fase: divisionEnabled ? 'Revisão + Estudo' : 'Geral'
            };
            historicoEstudos.push(logEntry);
        }
        
        const proposedMin = currentExecCiclo.duracaoMin || 
            (currentExecCiclo.sequence ? currentExecCiclo.sequence.reduce((acc, curr) => acc + (curr.duracao || 0), 0) : 0);
        
        // Reset subject time for next cycle rotation
        s.tempoRestanteMin = totalMin;
        s.tempoRestanteSegundos = totalMin * 60;
        s.tempoFaseSegundos = undefined;
        s.faseAtual = undefined;
        s.concluida = true;
        
        if (currentExecCiclo.horasEstudadasMin >= proposedMin) {
            currentExecCiclo.ciclosRealizados++;
            currentExecCiclo.horasEstudadasMin = 0;
            items.forEach(item => {
                item.tempoRestanteMin = item.duracao || item.totalMin || 120;
                item.tempoRestanteSegundos = item.tempoRestanteMin * 60;
                item.tempoFaseSegundos = undefined;
                item.faseAtual = undefined;
                item.concluida = false;
            });
            showToast('🎖️ PARABÉNS! Você concluiu uma rodada inteira do ciclo!');
        }
        saveAll();
    }
    
    playTacticalChime();
    sendTacticalNotification(
        "Sessão Concluída! 🎖️", 
        `Você completou a disciplina de ${s.nome} no ciclo!`
    );

    // Route through Pomodoro if enabled!
    if (pomodoroEnabled) {
        startTacticalBreak(s.nome, currentExecCiclo ? currentExecCiclo.concurso : null);
    } else {
        const sequenceItems = currentExecCiclo.sequence || currentExecCiclo.subjects;
        if (currentSubjectIndex < sequenceItems.length - 1) {
            selectSubject(currentSubjectIndex + 1);
        } else {
            selectSubject(0);
        }
    }
}

window.uncompleteSubject = function(idx) {
    if (timerRunning && idx !== currentSubjectIndex) {
        if (typeof showToast === 'function') showToast('Pause o cronômetro atual antes de alterar outra matéria.');
        return;
    }
    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
    const s = items[idx];
    if (!s) return;
    s.concluida = false;
    
    // Subtract from cycle progress
    const totalMin = s.duracao || s.totalMin || 120;
    if (currentExecCiclo && currentExecCiclo.horasEstudadasMin !== undefined) {
        currentExecCiclo.horasEstudadasMin -= totalMin;
        if (currentExecCiclo.horasEstudadasMin < 0) currentExecCiclo.horasEstudadasMin = 0;
    }
    
    // Remove the most recent history entry for this subject/cycle
    if (typeof historicoEstudos !== 'undefined' && currentExecCiclo) {
        for (let i = historicoEstudos.length - 1; i >= 0; i--) {
            const entry = historicoEstudos[i];
            if (entry.cicloNome === currentExecCiclo.nome && entry.materiaNome === s.nome) {
                historicoEstudos.splice(i, 1);
                break;
            }
        }
    }
    
    saveAll();
    renderExecSubjects(items);
};

window.forceCompleteSubject = function(idx) {
    if (timerRunning && idx !== currentSubjectIndex) {
        if (typeof showToast === 'function') showToast('Pause o cronômetro atual antes de concluir outra matéria.');
        return;
    }

    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
    const s = items[idx];
    if (!s) return;

    if (idx === currentSubjectIndex) {
        if (timerRunning) {
            clearInterval(timerInterval);
            timerRunning = false;
            const btnStart = document.getElementById('btnIniciarTimer');
            if (btnStart) btnStart.innerHTML = '<i class="bi bi-play-fill"></i> Iniciar';
        }
        if (currentPhase !== 'break') {
            saveStudyProgress();
            elapsedSessionSeconds = 0;
        }
    }

    // Add remaining time to cycle progress to simulate full study
    const remMin = s.tempoRestanteMin !== undefined ? s.tempoRestanteMin : (s.duracao || s.totalMin || 120);
    if (currentExecCiclo && remMin > 0) {
        if (currentExecCiclo.horasEstudadasMin === undefined) currentExecCiclo.horasEstudadasMin = 0;
        currentExecCiclo.horasEstudadasMin += remMin;
    }

    // Set as current so auto-advance works from here
    currentSubjectIndex = idx;
    
    handleSubjectCycleCompletion(s, items);
    renderExecSubjects(items);
};

function showSyllabusSyncModal(subjectName, contestName) {
    const modal = document.getElementById('syllabusSyncModal');
    if (!modal) return;
    
    const materiaSpan = document.getElementById('syncMateriaName');
    if (materiaSpan) {
        materiaSpan.textContent = subjectName;
    }
    
    modal.classList.add('active');
    
    const btnConfirm = document.getElementById('btnConfirmSyllabusSync');
    const btnCancel = document.getElementById('btnCancelSyllabusSync');
    const btnClose = document.getElementById('syllabusSyncClose');
    
    // Clear and bind confirm action
    const onConfirm = () => {
        modal.classList.remove('active');
        if (typeof navigateToSyllabusSubject === 'function') {
            navigateToSyllabusSubject(subjectName, contestName);
        }
    };
    
    // Clear and bind dismiss action
    const onDismiss = () => {
        modal.classList.remove('active');
        const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
        if (currentSubjectIndex < items.length - 1) {
            selectSubject(currentSubjectIndex + 1);
        }
    };
    
    // Clean clone nodes to replace event listeners perfectly
    const newBtnConfirm = btnConfirm.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    const newBtnClose = btnClose.cloneNode(true);
    
    btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    btnClose.parentNode.replaceChild(newBtnClose, btnClose);
    
    newBtnConfirm.addEventListener('click', onConfirm);
    newBtnCancel.addEventListener('click', onDismiss);
    newBtnClose.addEventListener('click', onDismiss);
}

// ===== POMODORO BREAK ENGINE =====
function startTacticalBreak(subjectName, contestName) {
    lastCompletedSubject = subjectName;
    lastCompletedContest = contestName;
    
    currentPhase = 'break';
    timerSeconds = pomodoroBreakMin * 60;
    
    const badge = document.getElementById('wheelBadge');
    if (badge) {
        badge.style.display = 'inline-block';
        badge.textContent = 'Descanso Tático';
        badge.style.background = '#4a8b57'; // tactical green background
    }
    
    document.getElementById('wheelSubject').textContent = 'Descansa!';
    document.getElementById('execSubjectName').textContent = 'Descanso Tático - Recuperação de Foco';
    
    const suggestionEl = document.querySelector('.mentor-suggestion p');
    if (suggestionEl) {
        suggestionEl.textContent = '🎖️ Descanso Tático Iniciado! Relaxe, beba água e faça alguns alongamentos para recuperar sua energia. Seu foco será recarregado em instantes para o próximo combate.';
    }
    
    updateTimerDisplay();
    
    // Play chime sound and display notification
    playTacticalChime();
    sendTacticalNotification(
        "Descanso Tático Ativado! 🔋", 
        `Tempo para recarregar as energias por ${pomodoroBreakMin} minutos.`
    );
    showToast(`Descanso tático iniciado: ${pomodoroBreakMin} minutos.`);
    
    // Auto-start the timer for the break countdown!
    if (!timerRunning) {
        timerRunning = true;
        document.getElementById('btnIniciarTimer').innerHTML = '<i class="bi bi-pause-fill"></i> Pausar';
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                timerRunning = false;
                document.getElementById('btnIniciarTimer').innerHTML = '<i class="bi bi-play-fill"></i> Iniciar';
                
                // End break and show the Syllabus Sync Modal
                endTacticalBreak();
            }
        }, 1000);
    }
}

function endTacticalBreak() {
    currentPhase = 'study';
    
    playTacticalChime();
    sendTacticalNotification(
        "Fim do Descanso! 🎯", 
        "Hora de voltar ao combate de estudos!"
    );
    showToast("Descanso concluído! Voltando ao foco.");
    
    // Reset Suggestion back to general Bisu suggestion for next subject
    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
    const s = items[currentSubjectIndex];
    if (s) {
        document.getElementById('wheelSubject').textContent = s.nome.length > 16 ? s.nome.substring(0, 16) + '...' : s.nome;
        document.getElementById('execSubjectName').textContent = s.nome;
    }
    
    // Resume flow: advance to next subject
    const sequenceItems = currentExecCiclo.sequence || currentExecCiclo.subjects;
    if (currentSubjectIndex < sequenceItems.length - 1) {
        selectSubject(currentSubjectIndex + 1);
    } else {
        selectSubject(0);
    }
}

// ===== MODO FOCO INITIALIZATION & SYNC =====
function initFocusMode() {
    const btnEntrar = document.getElementById('btnEntrarModoFoco');
    const btnSair = document.getElementById('btnSairModoFoco');
    const btnPlayFoco = document.getElementById('btnIniciarTimerFoco');
    
    // Toggles and Sliders inside Focus Mode
    const divisionToggleFoco = document.getElementById('focoDivisionToggle');
    const divisionSliderFoco = document.getElementById('focoDivisionSlider');
    const btnConfirmDivisionFoco = document.getElementById('btnConfirmDivisionFoco');
    
    const pomodoroToggleFoco = document.getElementById('focoPomodoroToggle');
    const pomodoroSliderFoco = document.getElementById('focoPomodoroSlider');
    
    // Elements to Sync
    const mainDivisionToggle = document.getElementById('divisionToggle');
    const mainDivisionSlider = document.getElementById('divisionSlider');
    const mainConfirmDivision = document.getElementById('btnConfirmDivision');
    
    const mainPomodoroToggle = document.getElementById('pomodoroToggle');
    const mainPomodoroSlider = document.getElementById('pomodoroSlider');
    
    // Entrar no Modo Foco
    if (btnEntrar) {
        btnEntrar.addEventListener('click', () => {
            // 1. Activate Focus body class for distraction-free view
            document.body.classList.add('focus-mode-active');
            
            // 2. Set Active page view
            showCiclosView('ciclos-foco-view');
            
            // 3. Sincronizar Informações de Nome e Horas
            const subNameMain = document.getElementById('execSubjectName');
            const subNameFoco = document.getElementById('focoSubjectName');
            if (subNameMain && subNameFoco) {
                subNameFoco.textContent = subNameMain.textContent;
            }
            
            // Sync Daily Hours Meta
            const hoursMain = document.getElementById('execTodayHoursText');
            const hoursFoco = document.getElementById('focoTodayHoursText');
            if (hoursMain && hoursFoco) {
                hoursFoco.textContent = hoursMain.textContent;
            }
            
            // Sync division values
            if (mainDivisionToggle && divisionToggleFoco) {
                divisionToggleFoco.checked = mainDivisionToggle.checked;
                document.getElementById('focoDivisionContent').style.display = mainDivisionToggle.checked ? 'block' : 'none';
                document.getElementById('focoDivisionDisabledMsg').style.display = mainDivisionToggle.checked ? 'none' : 'block';
            }
            
            if (mainDivisionSlider && divisionSliderFoco) {
                divisionSliderFoco.value = mainDivisionSlider.value;
                document.getElementById('focoDivRevisaoTime').textContent = document.getElementById('divRevisaoTime').textContent;
                document.getElementById('focoDivConteudoTime').textContent = document.getElementById('divConteudoTime').textContent;
            }
            
            // Sync Pomodoro values
            if (mainPomodoroToggle && pomodoroToggleFoco) {
                pomodoroToggleFoco.checked = mainPomodoroToggle.checked;
                document.getElementById('focoPomodoroContent').style.display = mainPomodoroToggle.checked ? 'block' : 'none';
                document.getElementById('focoPomodoroDisabledMsg').style.display = mainPomodoroToggle.checked ? 'none' : 'block';
            }
            
            if (mainPomodoroSlider && pomodoroSliderFoco) {
                pomodoroSliderFoco.value = mainPomodoroSlider.value;
                document.getElementById('focoPomodoroBreakMinutesText').textContent = document.getElementById('pomodoroBreakMinutesText').textContent;
            }
            
            // Sync clock count and buttons
            updateTimerDisplay();
        });
    }
    
    // Sair do Modo Foco
    if (btnSair) {
        btnSair.addEventListener('click', () => {
            document.body.classList.remove('focus-mode-active');
            showCiclosView('ciclos-exec-view');
        });
    }
    
    // Iniciar/Pausar do Modo Foco
    if (btnPlayFoco) {
        btnPlayFoco.addEventListener('click', () => {
            toggleStudyTimer();
        });
    }
    
    // Sync Division Toggle
    if (divisionToggleFoco) {
        divisionToggleFoco.addEventListener('change', function() {
            if (mainDivisionToggle) {
                mainDivisionToggle.checked = this.checked;
                mainDivisionToggle.dispatchEvent(new Event('change'));
            }
            document.getElementById('focoDivisionContent').style.display = this.checked ? 'block' : 'none';
            document.getElementById('focoDivisionDisabledMsg').style.display = this.checked ? 'none' : 'block';
            
            // Sync text display values
            document.getElementById('focoDivRevisaoTime').textContent = document.getElementById('divRevisaoTime').textContent;
            document.getElementById('focoDivConteudoTime').textContent = document.getElementById('divConteudoTime').textContent;
            if (divisionSliderFoco && mainDivisionSlider) {
                divisionSliderFoco.value = mainDivisionSlider.value;
            }
        });
    }
    
    // Sync Division Slider
    if (divisionSliderFoco) {
        divisionSliderFoco.addEventListener('input', function() {
            if (mainDivisionSlider) {
                mainDivisionSlider.value = this.value;
                mainDivisionSlider.dispatchEvent(new Event('input'));
            }
            document.getElementById('focoDivRevisaoTime').textContent = document.getElementById('divRevisaoTime').textContent;
            document.getElementById('focoDivConteudoTime').textContent = document.getElementById('divConteudoTime').textContent;
        });
    }
    
    // Sync Division Confirmation Button
    if (btnConfirmDivisionFoco) {
        btnConfirmDivisionFoco.addEventListener('click', () => {
            confirmStudyDivision();
            showToast('🎖️ Divisão de tempo confirmada e programada!');
        });
    }
    
    // Sync Pomodoro Toggle
    if (pomodoroToggleFoco) {
        pomodoroToggleFoco.addEventListener('change', function() {
            if (mainPomodoroToggle) {
                mainPomodoroToggle.checked = this.checked;
                mainPomodoroToggle.dispatchEvent(new Event('change'));
            }
            document.getElementById('focoPomodoroContent').style.display = this.checked ? 'block' : 'none';
            document.getElementById('focoPomodoroDisabledMsg').style.display = this.checked ? 'none' : 'block';
            if (pomodoroSliderFoco && mainPomodoroSlider) {
                pomodoroSliderFoco.value = mainPomodoroSlider.value;
            }
            document.getElementById('focoPomodoroBreakMinutesText').textContent = document.getElementById('pomodoroBreakMinutesText').textContent;
        });
    }
    
    // Sync Pomodoro Slider
    if (pomodoroSliderFoco) {
        pomodoroSliderFoco.addEventListener('input', function() {
            if (mainPomodoroSlider) {
                mainPomodoroSlider.value = this.value;
                mainPomodoroSlider.dispatchEvent(new Event('input'));
            }
            document.getElementById('focoPomodoroBreakMinutesText').textContent = document.getElementById('pomodoroBreakMinutesText').textContent;
        });
    }
}

// Call initFocusMode on load
setTimeout(initFocusMode, 600);

// ===== AUTO-RECALCULATE CYCLE =====
function recalcActiveCycleHoras() {
    if (!ciclos || ciclos.length === 0) return;

    let updatedAny = false;
    const globalHoras = getStudyHours();

    ciclos.forEach((ciclo, idx) => {
        const subjectsList = ciclo.subjects || [];
        if (subjectsList.length === 0) return;

        // Fetch global hours directly
        if (globalHoras <= 0) return;

        // Use current cycle subjects to recalculate
        const materiasParaCalc = subjectsList.map(s => ({
            nome: s.nome,
            peso: s.peso || 1,
            nivel: s.nivel || 0,
            ativo: s.ativo !== false
        }));

        // Recalculate hours
        const niveis = materiasParaCalc.map(m => m.nivel);
        const horasArr = calcHorasPorMateria(materiasParaCalc, globalHoras, niveis);
        materiasParaCalc.forEach((m, i) => {
            m.totalMin = horasArr[i];
        });

        // Re-generate sequence
        const sequence = generateCycleSequence(materiasParaCalc);
        sequence.forEach(item => {
            item.tempoRestanteMin = item.duracao;
        });
        const totalSeqMin = sequence.reduce((s, x) => s + x.duracao, 0);

        const newSubjects = materiasParaCalc.map(m => ({
            nome: m.nome, sessao: formatMin(m.totalMin),
            tempoRestante: formatMin(m.totalMin), peso: m.peso,
            totalMin: m.totalMin, ativo: m.ativo !== false, nivel: m.nivel || 0
        }));

        // Update cycle
        ciclos[idx].subjects = newSubjects;
        ciclos[idx].sequence = sequence;
        ciclos[idx].duracaoMin = totalSeqMin;
        ciclos[idx].duracao = formatMin(totalSeqMin);
        
        // Update currentExecCiclo reference if it's the active one
        if (currentExecCiclo && currentExecCiclo.id === ciclo.id) {
            currentExecCiclo = ciclos[idx];
            // Re-render UI if exec view is active
            if (!document.getElementById('ciclos-exec-view').classList.contains('d-none')) {
                renderExecSubjects(currentExecCiclo.sequence || []);
            }
        }
        updatedAny = true;
    });

    if (updatedAny) {
        saveAll();
        if (typeof renderCiclosList === 'function') renderCiclosList();
        showToast(`⏳ Ciclos reajustados para ${globalHoras}h semanais!`);
    }
}


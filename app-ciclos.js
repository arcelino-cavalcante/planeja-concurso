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

// Round to nearest 30 min, minimum 60 (1h)
function round30(minutes) { return Math.max(60, Math.round(minutes / 30) * 30); }

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
    // redistribute saved time among active subjects
    const totalOriginal = totalHoras * 60;
    const totalAfter = result.reduce((s, m) => s + m, 0);
    const saved = totalOriginal - totalAfter;
    if (saved > 0) {
        const zeroNivel = result.map((m, i) => ((niveis && niveis[i]) || disciplinas[i].ativo === false) ? 0 : 1);
        const sumZero = zeroNivel.reduce((s, v) => s + v, 0);
        if (sumZero > 0) result = result.map((m, i) => m + (zeroNivel[i] ? saved / sumZero : 0));
    }
    return result.map((m, i) => disciplinas[i].ativo === false ? 0 : round30(m));
}

// Generate cycle sequence (round-robin weighted, max 2h sessions)
function generateCycleSequence(materias) {
    const activeMaterias = materias.filter(m => m.ativo !== false && m.totalMin > 0);
    if (activeMaterias.length === 0) return [];

    const totalPeso = activeMaterias.reduce((s, m) => s + m.peso, 0);
    
    // Each subject gets a number of sessions proportional to its weight.
    // Target: fewer, longer sessions. Base = ~2 sessions for the lightest, scale up.
    const minPeso = Math.min(...activeMaterias.map(m => m.peso));
    
    let allSessions = [];
    activeMaterias.forEach((m, i) => {
        // Number of sessions: proportional to how much heavier this subject is vs the lightest
        // Lightest subject = 1 session, others scale proportionally
        const ratio = m.peso / minPeso;
        let count = Math.max(1, Math.round(ratio));
        // Cap at a reasonable max: don't split into more than ~5 sessions
        count = Math.min(count, Math.ceil(m.totalMin / 60)); // at least 1h per session
        
        let remaining = m.totalMin;
        for (let s = 0; s < count; s++) {
            if (remaining <= 0) break;
            const sessionsLeft = count - s;
            let dur = round30(remaining / sessionsLeft);
            dur = Math.max(60, Math.min(remaining, dur));
            allSessions.push({ nome: m.nome, duracao: dur, idx: i, peso: m.peso });
            remaining -= dur;
        }
    });
    
    // Sort by peso descending, then duration descending
    allSessions.sort((a, b) => b.peso - a.peso || b.duracao - a.duracao);
    
    // Group by subject
    const bySubject = {};
    allSessions.forEach(s => { 
        if (!bySubject[s.idx]) bySubject[s.idx] = []; 
        bySubject[s.idx].push(s); 
    });
    
    // Sort keys by weight descending
    const keys = Object.keys(bySubject).sort((a, b) => 
        (bySubject[b][0]?.peso || 0) - (bySubject[a][0]?.peso || 0)
    );
    
    // Interleave round-robin, ensuring no same subject twice in a row
    const result = [];
    let hasMore = true;
    let lastIdx = -1;
    
    while (hasMore) {
        hasMore = false;
        // First pass: prefer subjects different from last
        for (const k of keys) {
            if (bySubject[k].length > 0 && k !== lastIdx) {
                result.push(bySubject[k].shift());
                lastIdx = k;
                hasMore = true;
                break;
            }
        }
        // If no different subject available, pick any remaining
        if (!hasMore) {
            for (const k of keys) {
                if (bySubject[k].length > 0) {
                    result.push(bySubject[k].shift());
                    lastIdx = k;
                    hasMore = true;
                    break;
                }
            }
        }
    }
    
    return result;
}

function formatMin(min) { const h = Math.floor(min/60); const m = min % 60; return m > 0 ? `${h}:${String(m).padStart(2,'0')}h` : `${h}:00h`; }

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
    document.getElementById('configHorasInput').value = horas;
    currentCicloMaterias = conc.disciplinas.map(d => ({ nome: d.nome, peso: d.peso, nivel: 0, ativo: true }));
    renderMateriasConfig(horas);
    showCiclosView('ciclos-config-view');
}

// Open config for editing an existing ciclo
function openCicloConfigForEdit(ciclo) {
    editingCicloId = ciclo.id;
    const horas = getStudyHours() || 20;
    document.getElementById('configCicloNome').value = ciclo.nome;
    document.getElementById('configConcursoNome').textContent = ciclo.concurso || '';
    document.getElementById('configHorasInput').value = parseInt(ciclo.duracao) || horas;
    // Load subjects with their saved ativo state
    currentCicloMaterias = (ciclo.subjects || []).map(s => ({
        nome: s.nome,
        peso: s.peso || 1,
        nivel: s.nivel || 0,
        ativo: s.ativo !== false,
        totalMin: s.totalMin || 0
    }));
    // Recalculate hours
    const totalH = parseInt(document.getElementById('configHorasInput').value) || horas;
    renderMateriasConfig(totalH);
    showCiclosView('ciclos-config-view');
}

// Recalculate when hours input changes
document.getElementById('configHorasInput').addEventListener('input', function() {
    const h = parseInt(this.value) || 1;
    renderMateriasConfig(h);
});

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
document.getElementById('backToCiclosList').addEventListener('click', (e) => { e.preventDefault(); showCiclosView('ciclos-list-view'); });
document.getElementById('backToCiclosFromConfig').addEventListener('click', (e) => { e.preventDefault(); showCiclosView('ciclos-list-view'); });
document.getElementById('backToCiclosFromExec').addEventListener('click', (e) => { e.preventDefault(); if (timerInterval) { clearInterval(timerInterval); timerInterval = null; timerRunning = false; } showCiclosView('ciclos-list-view'); });

// Generate ciclo (or update existing)
document.getElementById('btnGerarCiclo').addEventListener('click', () => {
    const activeMaterias = currentCicloMaterias.filter(m => m.ativo !== false);
    if (activeMaterias.length === 0) return showToast('Ative pelo menos uma matéria!');
    
    const nome = document.getElementById('configCicloNome').value || 'Novo Ciclo';
    const totalH = parseInt(document.getElementById('configHorasInput').value) || 20;
    const sequence = generateCycleSequence(currentCicloMaterias);
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
                duracao: formatMin(totalSeqMin)
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
            ciclosRealizados: 0, subjects, sequence 
        };
        ciclos.push(newCiclo);
        showToast('Ciclo gerado com sucesso!');
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
        const card = document.createElement('div'); card.className = 'ciclo-list-card';
        card.innerHTML = `<div class="ciclo-list-badge"><i class="bi bi-trophy"></i></div>
            <div class="ciclo-list-info"><div class="ciclo-list-name">${c.nome}</div>
            <div class="ciclo-list-meta"><span>Duração: <strong>${c.duracao}</strong></span><span>Ciclos: <strong>${c.ciclosRealizados}</strong></span></div></div>
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
    currentExecCiclo = ciclo; currentSubjectIndex = 0;
    divisionEnabled = false; currentPhase = 'study';
    document.getElementById('divisionToggle').checked = false;
    document.getElementById('divisionContent').style.display = 'none';
    document.getElementById('wheelBadge').style.display = 'none';
    document.getElementById('execCicloLabel').textContent = ciclo.nome;
    renderWheel(ciclo.sequence || ciclo.subjects);
    selectSubject(0);
    renderExecSubjects(ciclo.sequence || []);
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
                    // Move to next subject
                    const items = currentExecCiclo.sequence || currentExecCiclo.subjects;
                    if (currentSubjectIndex < items.length - 1) {
                        setTimeout(() => selectSubject(currentSubjectIndex + 1), 1500);
                    }
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

function renderExecSubjects(sequence) {
    const container = document.getElementById('execSubjectsList'); container.innerHTML = '';
    const items = sequence.length ? sequence : currentExecCiclo.subjects;
    items.forEach((s, i) => {
        const row = document.createElement('div');
        row.className = `exec-subject-row${i === 0 ? ' active-subject' : ''}`;
        const dur = s.duracao ? formatMin(s.duracao) : s.sessao;
        row.innerHTML = `<span class="materia-name">${s.nome}</span><span class="sessao-time">${dur}</span><span class="tempo-rest"><i class="bi bi-clock"></i> ${dur}</span><div class="exec-subject-actions"><button data-idx="${i}"><i class="bi bi-play-fill"></i></button></div>`;
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


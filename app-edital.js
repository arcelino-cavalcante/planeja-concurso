// ===== PLANEJA CONCURSO - EDITAL VERTICALIZADO =====
let editais = [];
let currentEditalId = null;
let currentEditalMaterias = []; // [{ nome, topicos: [{ nome, checked }] }]

function showEditalView(viewId) {
    ['edital-list-view','edital-edit-view','edital-view-view'].forEach(id => {
        document.getElementById(id).classList.add('d-none');
    });
    document.getElementById(viewId).classList.remove('d-none');
}

// ===== LOAD & RENDER LIST =====
function loadEditais() {
    editais = DB.load('editais', []);
    renderEditaisList();
}

function renderEditaisList() {
    const container = document.getElementById('editaisListCards');
    if (!container) return;
    if (editais.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">
            <i class="bi bi-file-earmark-text" style="font-size:2.5rem;display:block;margin-bottom:12px;color:var(--accent-green-light);"></i>
            <p>Nenhum edital cadastrado. Clique em "Novo Edital" para começar.</p>
        </div>`;
        return;
    }
    container.innerHTML = editais.map(e => {
        const totalTopicos = e.materias.reduce((s, m) => s + m.topicos.length, 0);
        const checked = e.materias.reduce((s, m) => s + m.topicos.filter(t => t.checked).length, 0);
        const pct = totalTopicos > 0 ? Math.round((checked / totalTopicos) * 100) : 0;
        return `
            <div class="ciclo-list-card" style="cursor:pointer;" data-id="${e.id}">
                <div class="ciclo-list-badge"><i class="bi bi-file-earmark-text"></i></div>
                <div class="ciclo-list-info">
                    <div class="ciclo-list-name">${e.nome}</div>
                    <div class="ciclo-list-meta">
                        <span>${e.materias.length} matérias</span>
                        <span>${totalTopicos} tópicos</span>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:16px;">
                    <div style="width:80px;background:var(--bg-primary);border-radius:3px;height:6px;overflow:hidden;">
                        <div style="width:${pct}%;background:${pct === 100 ? 'var(--accent-green)' : 'var(--accent-yellow)'};height:6px;border-radius:3px;"></div>
                    </div>
                    <span style="font-size:0.8rem;font-weight:700;color:${pct === 100 ? 'var(--accent-green-light)' : 'var(--text-secondary)'};">${pct}%</span>
                </div>
                <button class="btn-actions btn-del-edital" data-id="${e.id}" style="margin-left:8px;"><i class="bi bi-trash3"></i></button>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.ciclo-list-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-del-edital')) return;
            const id = parseInt(card.dataset.id);
            const edital = editais.find(e => e.id === id);
            if (edital) openEditalView(edital);
        });
    });

    container.querySelectorAll('.btn-del-edital').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Excluir este edital?')) {
                editais = editais.filter(e => e.id !== parseInt(btn.dataset.id));
                DB.save('editais', editais);
                renderEditaisList();
                showToast('Edital excluído!');
            }
        });
    });
}

// ===== EDIT VIEW (manual) =====
document.getElementById('btnNovoEdital')?.addEventListener('click', () => {
    currentEditalId = null;
    document.getElementById('editalNome').value = '';
    currentEditalMaterias = [];
    renderEditalTree();
    showEditalView('edital-edit-view');
});

document.getElementById('backToEditaisList')?.addEventListener('click', (e) => {
    e.preventDefault();
    showEditalView('edital-list-view');
});

document.getElementById('backToEditaisFromView')?.addEventListener('click', (e) => {
    e.preventDefault();
    showEditalView('edital-list-view');
});

function renderEditalTree() {
    const container = document.getElementById('editalTree');
    if (!container) return;
    
    if (currentEditalMaterias.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);">
            <i class="bi bi-file-earmark-plus" style="font-size:2rem;display:block;margin-bottom:8px;"></i>
            Clique em <strong>"Matéria"</strong> para adicionar a primeira matéria.
        </div>`;
        return;
    }

    container.innerHTML = currentEditalMaterias.map((m, mi) => `
        <div class="edital-materia" data-idx="${mi}">
            <div class="edital-materia-header">
                <input type="text" class="input-mentor edital-materia-nome" value="${m.nome}" placeholder="Nome da matéria" style="flex:1;font-weight:600;">
                <button class="btn-actions btn-rm-materia-edital" data-idx="${mi}" style="padding:4px 8px;color:var(--accent-red);"><i class="bi bi-trash3"></i></button>
            </div>
            <div class="edital-topicos" data-materia="${mi}">
                ${m.topicos.map((t, ti) => `
                    <div class="edital-topico" data-materia="${mi}" data-topico="${ti}">
                        <span class="edital-topico-drag">⠿</span>
                        <input type="text" class="input-mentor edital-topico-nome" value="${t.nome}" placeholder="Tópico" style="flex:1;font-size:0.9rem;">
                        <button class="btn-actions btn-rm-topico-edital" data-materia="${mi}" data-topico="${ti}" style="padding:2px 6px;color:var(--accent-red);font-size:0.8rem;"><i class="bi bi-x-lg"></i></button>
                    </div>
                `).join('')}
                <button class="btn-actions btn-add-topico-edital" data-materia="${mi}" style="margin-top:6px;font-size:0.8rem;padding:4px 10px;"><i class="bi bi-plus-lg"></i> Tópico</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-rm-materia-edital').forEach(btn => {
        btn.addEventListener('click', () => {
            currentEditalMaterias.splice(parseInt(btn.dataset.idx), 1);
            renderEditalTree();
        });
    });
    container.querySelectorAll('.btn-add-topico-edital').forEach(btn => {
        btn.addEventListener('click', () => {
            currentEditalMaterias[parseInt(btn.dataset.materia)].topicos.push({ nome: 'Novo tópico', checked: false });
            renderEditalTree();
        });
    });
    container.querySelectorAll('.btn-rm-topico-edital').forEach(btn => {
        btn.addEventListener('click', () => {
            const mi = parseInt(btn.dataset.materia);
            const ti = parseInt(btn.dataset.topico);
            currentEditalMaterias[mi].topicos.splice(ti, 1);
            renderEditalTree();
        });
    });
    container.querySelectorAll('.edital-materia-nome').forEach(input => {
        input.addEventListener('input', function() {
            currentEditalMaterias[parseInt(this.closest('.edital-materia').dataset.idx)].nome = this.value;
        });
    });
    container.querySelectorAll('.edital-topico-nome').forEach(input => {
        input.addEventListener('input', function() {
            const el = this.closest('.edital-topico');
            const mi = parseInt(el.dataset.materia);
            const ti = parseInt(el.dataset.topico);
            currentEditalMaterias[mi].topicos[ti].nome = this.value;
        });
    });
}

document.getElementById('btnAddMateriaEdital')?.addEventListener('click', () => {
    currentEditalMaterias.push({ nome: 'Nova Matéria', topicos: [] });
    renderEditalTree();
});

// ===== SAVE =====
document.getElementById('btnSalvarEdital')?.addEventListener('click', () => {
    const nome = document.getElementById('editalNome').value.trim() || 'Edital sem nome';
    document.querySelectorAll('.edital-materia').forEach(el => {
        const mi = parseInt(el.dataset.idx);
        currentEditalMaterias[mi].nome = el.querySelector('.edital-materia-nome').value;
        el.querySelectorAll('.edital-topico').forEach((tEl, ti) => {
            if (currentEditalMaterias[mi].topicos[ti]) {
                currentEditalMaterias[mi].topicos[ti].nome = tEl.querySelector('.edital-topico-nome').value;
            }
        });
    });

    const materias = currentEditalMaterias.filter(m => m.nome.trim());
    if (materias.length === 0) return showToast('Adicione pelo menos uma matéria.');

    const edital = { id: currentEditalId || Date.now(), nome, materias, createdAt: new Date().toISOString() };

    if (currentEditalId) {
        const idx = editais.findIndex(e => e.id === currentEditalId);
        if (idx !== -1) editais[idx] = edital;
    } else {
        editais.push(edital);
    }

    DB.save('editais', editais);
    renderEditaisList();
    showEditalView('edital-list-view');
    showToast('Edital salvo!');
});

// ===== VIEW (progress checkboxes) =====
function openEditalView(edital) {
    currentEditalId = edital.id;
    document.getElementById('editalViewNome').textContent = edital.nome;

    const totalTopicos = edital.materias.reduce((s, m) => s + m.topicos.length, 0);
    const checked = edital.materias.reduce((s, m) => s + m.topicos.filter(t => t.checked).length, 0);
    const pct = totalTopicos > 0 ? Math.round((checked / totalTopicos) * 100) : 0;
    document.getElementById('editalViewProgresso').textContent = `${pct}% concluído (${checked}/${totalTopicos} tópicos)`;

    const tree = document.getElementById('editalViewTree');
    tree.innerHTML = edital.materias.map((m, mi) => {
        const matChecked = m.topicos.filter(t => t.checked).length;
        return `
            <div class="edital-view-materia">
                <div class="edital-view-materia-header">
                    <h3>${m.nome}</h3>
                    <span style="font-size:0.8rem;color:var(--text-muted);">${matChecked}/${m.topicos.length}</span>
                </div>
                <div class="edital-view-topicos">
                    ${m.topicos.map((t, ti) => `
                        <label class="edital-view-topico ${t.checked ? 'checked' : ''}">
                            <input type="checkbox" ${t.checked ? 'checked' : ''} data-materia="${mi}" data-topico="${ti}">
                            <span>${t.nome}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');

    tree.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const mi = parseInt(cb.dataset.materia);
            const ti = parseInt(cb.dataset.topico);
            edital.materias[mi].topicos[ti].checked = cb.checked;
            const idx = editais.findIndex(e => e.id === edital.id);
            if (idx !== -1) editais[idx] = edital;
            DB.save('editais', editais);
            openEditalView(edital);
        });
    });

    showEditalView('edital-view-view');
}

// ===== IMPORT FROM CONCURSO =====
document.getElementById('btnImportarEditalConcurso')?.addEventListener('click', () => {
    const selector = document.getElementById('editalConcursoSelector');
    const grid = document.getElementById('editalConcursoGrid');
    const noConc = document.getElementById('editalNoConcursoMsg');
    
    // Toggle visibility
    if (selector.style.display !== 'none') {
        selector.style.display = 'none';
        return;
    }
    
    selector.style.display = 'block';
    grid.innerHTML = '';
    noConc.style.display = 'none';
    
    if (!concursos || !concursos.length) {
        noConc.style.display = 'block';
        return;
    }
    
    concursos.forEach(c => {
        const card = document.createElement('div');
        card.className = 'concurso-card';
        card.dataset.id = c.id;
        card.innerHTML = `<div class="concurso-check"><i class="bi bi-check-lg"></i></div>
            <div class="concurso-icon"><i class="bi bi-trophy"></i></div>
            <span>${c.nome}</span>
            <span style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">${c.disciplinas.length} matérias</span>`;
        card.addEventListener('click', () => {
            // Select animation
            grid.querySelectorAll('.concurso-card').forEach(x => x.classList.remove('selected'));
            card.classList.add('selected');
            
            // Import after brief delay for visual feedback
            setTimeout(() => {
                importEditalFromConcurso(c);
                selector.style.display = 'none';
            }, 300);
        });
        grid.appendChild(card);
    });
});

function importEditalFromConcurso(conc) {
    currentEditalId = null;
    document.getElementById('editalNome').value = conc.nome;
    
    // Create matérias from concurso disciplinas, each with an empty tópico placeholder
    currentEditalMaterias = conc.disciplinas.map(d => ({
        nome: d.nome,
        topicos: [{ nome: 'Adicionar tópico...', checked: false }]
    }));
    
    renderEditalTree();
    showEditalView('edital-edit-view');
    showToast(`Matérias de "${conc.nome}" importadas! Adicione os tópicos de cada matéria.`);
}

// ===== NAVIGATION & SYNC HELPER =====
function navigateToSyllabusSubject(subjectName, contestName) {
    loadEditais(); // refresh editais from DB
    if (!editais || editais.length === 0) {
        showToast('Nenhum edital cadastrado no sistema! Cadastre um primeiro.');
        return;
    }
    
    // Find matching edital
    let matchedEdital = null;
    if (contestName) {
        const query = contestName.toLowerCase().trim();
        // Look for matching name
        matchedEdital = editais.find(e => e.nome.toLowerCase().includes(query) || query.includes(e.nome.toLowerCase()));
    }
    
    // Fallback: first edital
    if (!matchedEdital) {
        matchedEdital = editais[0];
    }
    
    if (!matchedEdital) {
        showToast('Edital não localizado.');
        return;
    }
    
    // 1. First trigger navigation to the "edital" page
    if (typeof navigateToPage === 'function') {
        navigateToPage('edital');
    }
    
    // 2. Open the specific edital (this overrides the default list-view and renders the tree)
    openEditalView(matchedEdital);
    
    // 3. Scroll to and highlight the subject element
    setTimeout(() => {
        const blocks = document.querySelectorAll('.edital-view-materia');
        let targetEl = null;
        
        blocks.forEach(el => {
            const h3 = el.querySelector('.edital-view-materia-header h3');
            if (h3) {
                const text = h3.textContent.trim().toLowerCase();
                const target = subjectName.toLowerCase().trim();
                if (text.includes(target) || target.includes(text)) {
                    targetEl = el;
                }
            }
        });
        
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Apply straight-edge tactical border highlight and pulse shadow
            targetEl.style.transition = 'all 0.3s ease';
            targetEl.style.outline = '3px solid var(--accent-yellow)';
            targetEl.style.boxShadow = '0 0 20px rgba(255, 193, 7, 0.5)';
            targetEl.style.borderRadius = '0'; // keep military straight-line
            
            // Retain highlight for 3 seconds
            setTimeout(() => {
                targetEl.style.outline = 'none';
                targetEl.style.boxShadow = 'none';
            }, 3000);
        } else {
            showToast(`Matéria "${subjectName}" não localizada no edital.`);
        }
    }, 250);
}

// ===== INIT =====
loadEditais();

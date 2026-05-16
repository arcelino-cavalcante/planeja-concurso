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
                    <div class="edital-progress-mini" style="width:80px;">
                        <div class="edital-progress-bar-mini" style="width:${pct}%;background:${pct === 100 ? 'var(--accent-green)' : 'var(--accent-yellow)'};height:6px;border-radius:3px;"></div>
                    </div>
                    <span style="font-size:0.8rem;font-weight:700;color:${pct === 100 ? 'var(--accent-green-light)' : 'var(--text-secondary)'};">${pct}%</span>
                </div>
                <button class="btn-actions btn-del-edital" data-id="${e.id}" style="margin-left:8px;"><i class="bi bi-trash3"></i></button>
            </div>
        `;
    }).join('');

    // Click to open view
    container.querySelectorAll('.ciclo-list-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-del-edital')) return;
            const id = parseInt(card.dataset.id);
            const edital = editais.find(e => e.id === id);
            if (edital) openEditalView(edital);
        });
    });

    // Delete
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

// ===== PARSER: texto bruto → matérias e tópicos =====
function parseEditalText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const materias = [];
    let currentMateria = null;

    // Patterns for detecting subject headers
    const materiaPatterns = [
        /^([A-ZÀ-Ú\s]{4,})$/,                    // ALL CAPS line (LÍNGUA PORTUGUESA)
        /^(\d+\.?\s*[A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]{3,})$/,  // "1. NOME DA MATÉRIA"
        /^([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]{3,}):?\s*$/,       // "Nome da matéria:"
    ];

    // Patterns for topic lines
    const topicoPatterns = [
        /^(\d+\.?\d*\.?\s+.+)$/,     // "1. Tópico" or "1.1 Tópico"
        /^([•\-\*]\s+.+)$/,          // "• Tópico" or "- Tópico"
        /^([a-z]\)\s+.+)$/,          // "a) Tópico"
    ];

    for (const line of lines) {
        let isMateria = false;
        for (const pattern of materiaPatterns) {
            const match = line.match(pattern);
            if (match) {
                // Skip if it looks more like a topic than a subject
                if (line.length < 80 && !line.match(/^\d+\.\d/)) {
                    currentMateria = { nome: match[1].replace(/:$/, '').trim(), topicos: [] };
                    materias.push(currentMateria);
                    isMateria = true;
                    break;
                }
            }
        }
        if (isMateria) continue;

        // Try to match as topic
        if (currentMateria) {
            for (const pattern of topicoPatterns) {
                const match = line.match(pattern);
                if (match) {
                    const topicoNome = match[1].replace(/^[•\-\*\d\.\)\s]+/, '').trim();
                    if (topicoNome.length > 5) {
                        currentMateria.topicos.push({ nome: topicoNome, checked: false });
                    }
                    break;
                }
            }
        }
    }

    // If nothing was parsed, create a single subject with all lines as topics
    if (materias.length === 0) {
        const fallback = { nome: 'Conteúdo Programático', topicos: [] };
        lines.forEach(line => {
            if (line.length > 5) fallback.topicos.push({ nome: line, checked: false });
        });
        materias.push(fallback);
    }

    return materias;
}

// ===== EDIT VIEW =====
document.getElementById('btnNovoEdital')?.addEventListener('click', () => {
    currentEditalId = null;
    document.getElementById('editalNome').value = '';
    document.getElementById('editalRawText').value = '';
    currentEditalMaterias = [];
    document.getElementById('editalTreeContainer').style.display = 'none';
    document.getElementById('editalTree').innerHTML = '';
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

// Parse button
document.getElementById('btnParseEdital')?.addEventListener('click', () => {
    const text = document.getElementById('editalRawText').value.trim();
    if (!text) return showToast('Cole o texto do edital primeiro.');
    
    currentEditalMaterias = parseEditalText(text);
    if (currentEditalMaterias.length === 0) return showToast('Não foi possível identificar matérias. Tente ajustar o texto.');
    
    document.getElementById('editalTreeContainer').style.display = 'block';
    renderEditalTree();
    showToast(`${currentEditalMaterias.length} matérias e ${currentEditalMaterias.reduce((s,m) => s + m.topicos.length, 0)} tópicos identificados!`);
});

function renderEditalTree() {
    const container = document.getElementById('editalTree');
    if (!container) return;
    
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

    // Bind events
    container.querySelectorAll('.btn-rm-materia-edital').forEach(btn => {
        btn.addEventListener('click', () => {
            currentEditalMaterias.splice(parseInt(btn.dataset.idx), 1);
            renderEditalTree();
        });
    });
    container.querySelectorAll('.btn-add-topico-edital').forEach(btn => {
        btn.addEventListener('click', () => {
            const mi = parseInt(btn.dataset.materia);
            currentEditalMaterias[mi].topicos.push({ nome: 'Novo tópico', checked: false });
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
            const mi = parseInt(this.closest('.edital-materia').dataset.idx);
            currentEditalMaterias[mi].nome = this.value;
        });
    });
    container.querySelectorAll('.edital-topico-nome').forEach(input => {
        input.addEventListener('input', function() {
            const mi = parseInt(this.closest('.edital-topico').dataset.materia);
            const ti = parseInt(this.closest('.edital-topico').dataset.topico);
            currentEditalMaterias[mi].topicos[ti].nome = this.value;
        });
    });
}

// Add materia button
document.getElementById('btnAddMateriaEdital')?.addEventListener('click', () => {
    currentEditalMaterias.push({ nome: 'Nova Matéria', topicos: [] });
    document.getElementById('editalTreeContainer').style.display = 'block';
    renderEditalTree();
});

// ===== SAVE EDITAL =====
document.getElementById('btnSalvarEdital')?.addEventListener('click', () => {
    const nome = document.getElementById('editalNome').value.trim() || 'Edital sem nome';
    // Gather current state from DOM
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

    const edital = {
        id: currentEditalId || Date.now(),
        nome,
        materias,
        createdAt: new Date().toISOString()
    };

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

// ===== VIEW EDITAL (with progress checkboxes) =====
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
        const matTotal = m.topicos.length;
        return `
            <div class="edital-view-materia">
                <div class="edital-view-materia-header">
                    <h3>${m.nome}</h3>
                    <span style="font-size:0.8rem;color:var(--text-muted);">${matChecked}/${matTotal}</span>
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

    // Checkbox events
    tree.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const mi = parseInt(cb.dataset.materia);
            const ti = parseInt(cb.dataset.topico);
            edital.materias[mi].topicos[ti].checked = cb.checked;
            // Update local state
            const idx = editais.findIndex(e => e.id === edital.id);
            if (idx !== -1) editais[idx] = edital;
            DB.save('editais', editais);
            // Re-render progress
            openEditalView(edital);
        });
    });

    showEditalView('edital-view-view');
}

// ===== INIT =====
loadEditais();

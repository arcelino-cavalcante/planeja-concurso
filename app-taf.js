// ===== METAS DO TAF (TESTE DE APTIDÃO FÍSICA - PRF) =====
let editingTafSimId = null;

const PRF_TAF_RULES = {
    masculino: {
        barra: { min: 3, label: "mínimo 3 repetições", unit: "reps", name: "Flexão em Barra Fixa", desc: "Teste dinâmico de barra (pronada) sem limite de tempo.", direction: "min", ativo: true },
        shuttle: { max: 14.00, label: "máximo 14.00 segundos", unit: "s", name: "Shuttle Run (Ir e Vir)", desc: "Teste de agilidade transportando blocos de madeira.", direction: "max", ativo: true },
        salto: { min: 2.01, label: "mínimo 2.01 metros", unit: "m", name: "Impulsão Horizontal", desc: "Salto em distância a partir da posição estática.", direction: "min", ativo: true },
        abdominal: { min: 35, label: "mínimo 35 repetições", unit: "reps", name: "Flexão Abdominal", desc: "Abdominais tipo remador executados em 1 minuto.", direction: "min", ativo: true },
        corrida: { min: 2301, label: "mínimo 2301 metros", unit: "m", name: "Corrida de 12 Minutos", desc: "Corrida em pista para medir resistência aeróbica.", direction: "min", ativo: true }
    },
    feminino: {
        barra: { min: 10.0, label: "mínimo 10.0s de sustentação", unit: "s", name: "Isometria na Barra Fixa", desc: "Sustentação isométrica com o queixo acima da barra.", direction: "min", ativo: true },
        shuttle: { max: 16.00, label: "máximo 16.00 segundos", unit: "s", name: "Shuttle Run (Ir e Vir)", desc: "Teste de agilidade transportando blocos de madeira.", direction: "max", ativo: true },
        salto: { min: 1.61, label: "mínimo 1.61 metros", unit: "m", name: "Impulsão Horizontal", desc: "Salto em distância a partir da posição estática.", direction: "min", ativo: true },
        abdominal: { min: 28, label: "mínimo 28 repetições", unit: "reps", name: "Flexão Abdominal", desc: "Abdominais tipo remador executados em 1 minuto.", direction: "min", ativo: true },
        corrida: { min: 2001, label: "mínimo 2001 metros", unit: "m", name: "Corrida de 12 Minutos", desc: "Corrida em pista para medir resistência aeróbica.", direction: "min", ativo: true }
    }
};

const PF_TAF_RULES = {
    masculino: {
        barra: { min: 2, label: "mínimo 2 repetições", unit: "reps", name: "Flexão em Barra Fixa", desc: "Teste dinâmico de barra sem limite de tempo.", direction: "min", ativo: true },
        shuttle: { max: 44.00, label: "máximo 44.00 segundos", unit: "s", name: "Natação (50 metros)", desc: "Natação estilo livre em piscina de 25m ou 50m.", direction: "max", ativo: true },
        salto: { min: 2.00, label: "mínimo 2.00 metros", unit: "m", name: "Impulsão Horizontal", desc: "Salto em distância a partir da posição estática.", direction: "min", ativo: true },
        abdominal: { min: 0, label: "não aplicável", unit: "reps", name: "Flexão Abdominal", desc: "Não exigido no TAF da PF.", direction: "min", ativo: false },
        corrida: { min: 2000, label: "mínimo 2000 metros", unit: "m", name: "Corrida de 12 Minutos", desc: "Corrida em pista para medir resistência aeróbica.", direction: "min", ativo: true }
    },
    feminino: {
        barra: { min: 15.0, label: "mínimo 15.0s de sustentação", unit: "s", name: "Isometria na Barra Fixa", desc: "Sustentação isométrica com o queixo acima da barra.", direction: "min", ativo: true },
        shuttle: { max: 54.00, label: "máximo 54.00 segundos", unit: "s", name: "Natação (50 metros)", desc: "Natação estilo livre em piscina de 25m ou 50m.", direction: "max", ativo: true },
        salto: { min: 1.70, label: "mínimo 1.70 metros", unit: "m", name: "Impulsão Horizontal", desc: "Salto em distância a partir da posição estática.", direction: "min", ativo: true },
        abdominal: { min: 0, label: "não aplicável", unit: "reps", name: "Flexão Abdominal", desc: "Não exigido no TAF da PF.", direction: "min", ativo: false },
        corrida: { min: 1600, label: "mínimo 1600 metros", unit: "m", name: "Corrida de 12 Minutos", desc: "Corrida em pista para medir resistência aeróbica.", direction: "min", ativo: true }
    }
};

const TAF_ICONS = {
    barra: "bi-activity",
    shuttle: "bi-arrow-left-right",
    salto: "bi-arrow-up-right",
    abdominal: "bi-person",
    corrida: "bi-lightning-charge"
};

function getActiveTafRules() {
    if (!tafConfig.rules) {
        tafConfig.rules = JSON.parse(JSON.stringify(PRF_TAF_RULES));
        tafConfig.modelo = 'prf';
        saveAll();
    }
    return tafConfig.rules[tafConfig.genero || 'masculino'];
}

// Main render function triggered when opening the TAF page
function renderTaf() {
    // Sync model dropdown
    const sel = document.getElementById('tafModeloSelect');
    if (sel) sel.value = tafConfig.modelo || 'prf';

    updateTafGenderButtons();
    renderTafExercises();
    renderTafHistory();
    updateOverallTafStatus();
    renderTafRulesEditor();
    
    // Update chart select and draw evolution chart
    updateTafChartSelect();
    drawTafEvolutionChart();
}

function updateTafGenderButtons() {
    const btnM = document.getElementById('btnTafGeneroM');
    const btnF = document.getElementById('btnTafGeneroF');
    if (!btnM || !btnF) return;

    const activeGender = tafConfig.genero || 'masculino';

    if (activeGender === 'masculino') {
        btnM.style.background = 'var(--accent-yellow)';
        btnM.style.color = '#000';
        btnM.style.borderColor = 'var(--accent-yellow)';
        
        btnF.style.background = 'var(--bg-primary)';
        btnF.style.color = 'var(--text-primary)';
        btnF.style.borderColor = 'var(--border-color)';
    } else {
        btnF.style.background = 'var(--accent-yellow)';
        btnF.style.color = '#000';
        btnF.style.borderColor = 'var(--accent-yellow)';
        
        btnM.style.background = 'var(--bg-primary)';
        btnM.style.color = 'var(--text-primary)';
        btnM.style.borderColor = 'var(--border-color)';
    }
}

function renderTafRegModalInputs(sim) {
    const container = document.getElementById('tafRegDynamicInputs');
    if (!container) return;
    container.innerHTML = '';
    
    const rules = getActiveTafRules();
    Object.keys(rules).forEach(key => {
        const rule = rules[key];
        const isAtivo = tafMetas[key].ativo !== false;
        if (!isAtivo) return;
        
        const val = sim ? (sim[key] !== null && sim[key] !== undefined ? sim[key] : '') : '';
        
        const div = document.createElement('div');
        div.className = 'form-group';
        div.style.marginBottom = '12px';
        div.innerHTML = `
            <label class="meta-label">${rule.name} (${rule.unit})</label>
            <input type="number" step="0.01" class="input-mentor taf-reg-input" data-key="${key}" value="${val}" placeholder="Ex: ${rule.min || rule.max || ''}" style="width: 100%;">
        `;
        container.appendChild(div);
    });
}

// Render the 5 exercise cards with inputs and progress bars
function renderTafExercises() {
    const grid = document.getElementById('tafExercisesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const rules = getActiveTafRules();

    Object.keys(rules).forEach(key => {
        const rule = rules[key];
        const currentVal = parseFloat(tafMetas[key].atual) || 0;
        const ruleLimit = rule.direction === 'max' ? (rule.max || rule.min) : (rule.min || rule.max);
        const targetVal = parseFloat(tafMetas[key].meta) || ruleLimit;
        const icon = TAF_ICONS[key] || 'bi-activity';
        const isAtivo = tafMetas[key].ativo !== false;

        // Validate approval against minimum/maximum limit
        let isApproved = false;
        if (rule.direction === 'max') {
            isApproved = currentVal > 0 && currentVal <= ruleLimit;
        } else {
            isApproved = currentVal >= ruleLimit;
        }

        // Calculate progress percentage
        let prfPct = 0;
        let goalPct = 0;
        if (rule.direction === 'max') {
            // For max limits, lower is better
            prfPct = currentVal > 0 ? Math.min(100, Math.round((ruleLimit / currentVal) * 100)) : 0;
            goalPct = currentVal > 0 && targetVal > 0 ? Math.min(100, Math.round((targetVal / currentVal) * 100)) : 0;
        } else {
            prfPct = ruleLimit > 0 ? Math.min(100, Math.round((currentVal / ruleLimit) * 100)) : 0;
            goalPct = targetVal > 0 ? Math.min(100, Math.round((currentVal / targetVal) * 100)) : 0;
        }

        let badgeClass = '';
        let badgeText = '';
        if (!isAtivo) {
            badgeClass = 'pendente';
            badgeText = 'Inativo';
        } else {
            badgeClass = isApproved ? 'ativa' : 'desativada';
            badgeText = isApproved ? 'Aprovado' : 'Abaixo do Mínimo';
        }

        let prfText = '';
        let goalText = '';
        if (rule.direction === 'max') {
            prfText = `${currentVal > 0 ? currentVal + rule.unit : '—'} (Máximo: ${ruleLimit}${rule.unit})`;
            goalText = `${currentVal > 0 ? currentVal + rule.unit : '—'} (Meta: ${targetVal}${rule.unit})`;
        } else {
            prfText = `${currentVal} / ${ruleLimit} ${rule.unit}`;
            goalText = `${currentVal} / ${targetVal} ${rule.unit}`;
        }

        const card = document.createElement('div');
        card.className = 'card-mentor';
        card.style.borderLeftColor = !isAtivo ? 'var(--border-color)' : isApproved ? 'var(--accent-green-light)' : 'var(--accent-red)';
        
        let cardBodyHtml = '';
        if (isAtivo) {
            cardBodyHtml = `
                <!-- Inputs -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
                    <div class="form-group">
                        <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">Atual (${rule.unit})</label>
                        <input type="number" step="0.01" class="input-mentor input-taf-atual" data-exercise="${key}" value="${tafMetas[key].atual}" style="width:100%; padding:6px 10px; font-size:0.85rem; text-align:center;">
                    </div>
                    <div class="form-group">
                        <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">Meta Pessoal</label>
                        <input type="number" step="0.01" class="input-mentor input-taf-meta" data-exercise="${key}" value="${tafMetas[key].meta}" style="width:100%; padding:6px 10px; font-size:0.85rem; text-align:center;">
                    </div>
                </div>

                <!-- Progress bars -->
                <div style="margin-bottom:8px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.72rem; margin-bottom:3px; color:var(--text-secondary);">
                        <span>Mínimo Edital: <strong style="color: var(--text-primary);">${prfText}</strong></span>
                        <strong style="color:${isApproved ? 'var(--accent-green-light)' : 'var(--accent-red)'};">${prfPct}%</strong>
                    </div>
                    <div class="progress-bar-wrapper" style="height:6px; background:rgba(255,255,255,0.05);"><div class="progress-bar-fill" style="width:${prfPct}%; background:${isApproved ? 'var(--accent-green-light)' : 'var(--accent-red)'};"></div></div>
                </div>
                <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.72rem; margin-bottom:3px; color:var(--text-secondary);">
                        <span>Sua Meta: <strong style="color: var(--text-primary);">${goalText}</strong></span>
                        <strong style="color: var(--accent-blue);">${goalPct}%</strong>
                    </div>
                    <div class="progress-bar-wrapper" style="height:6px; background:rgba(255,255,255,0.05);"><div class="progress-bar-fill" style="width:${goalPct}%; background:var(--accent-blue);"></div></div>
                </div>
            `;
        } else {
            cardBodyHtml = `
                <div style="padding: 16px; text-align: center; background: rgba(255,255,255,0.01); border: 1px dashed var(--border-color); border-radius: 4px; color: var(--text-muted); font-size: 0.8rem; margin-top: 10px;">
                    <i class="bi bi-eye-slash" style="font-size: 1.2rem; display: block; margin-bottom: 6px;"></i>
                    Exercício inativo. Marque "Monitorar" acima para definir metas e registrar resultados.
                </div>
            `;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <div class="ciclo-badge" style="width:32px; height:32px; font-size:1rem;"><i class="bi ${icon}"></i></div>
                    <div>
                        <h4 style="font-family:var(--font-heading); font-size:1.05rem; font-weight:800; margin:0; color:var(--text-primary);">${rule.name}</h4>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${rule.label}</span>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                    <span class="status-badge ${badgeClass}" style="font-size:0.7rem; padding:3px 6px;">${badgeText}</span>
                    <label style="font-size: 0.65rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; cursor: pointer; user-select: none; margin: 0;">
                        <input type="checkbox" class="taf-exercise-toggle" data-exercise="${key}" ${isAtivo ? 'checked' : ''} style="margin: 0; cursor: pointer;"> Monitorar
                    </label>
                </div>
            </div>
            <p style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4; margin-bottom:14px; min-height:36px;">${rule.desc || ''}</p>
            
            ${cardBodyHtml}
        `;
        grid.appendChild(card);
    });

    // Attach listeners for live saving
    grid.querySelectorAll('.input-taf-atual').forEach(input => {
        input.addEventListener('change', function() {
            const ex = this.dataset.exercise;
            const val = parseFloat(this.value) || 0;
            tafMetas[ex].atual = val;
            saveAll();
            renderTaf();
        });
    });

    grid.querySelectorAll('.input-taf-meta').forEach(input => {
        input.addEventListener('change', function() {
            const ex = this.dataset.exercise;
            const val = parseFloat(this.value) || 0;
            tafMetas[ex].meta = val;
            saveAll();
            renderTaf();
        });
    });

    // Toggle active state
    grid.querySelectorAll('.taf-exercise-toggle').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const ex = this.dataset.exercise;
            tafMetas[ex].ativo = this.checked;
            saveAll();
            renderTaf();
        });
    });
}

// Calculate and update the general TAF approval status banner
function updateOverallTafStatus() {
    const banner = document.getElementById('tafStatusBanner');
    const badge = document.getElementById('tafStatusBadge');
    const title = document.getElementById('tafStatusTitle');
    const desc = document.getElementById('tafStatusDesc');
    const dot = document.getElementById('tafStatusDot');
    const text = document.getElementById('tafStatusText');

    if (!banner) return;

    const rules = getActiveTafRules();

    let allApproved = true;
    const failingList = [];
    let activeCount = 0;

    Object.keys(rules).forEach(key => {
        const isAtivo = tafMetas[key].ativo !== false;
        if (!isAtivo) return; // Skip inactive exercises

        activeCount++;
        const rule = rules[key];
        const val = parseFloat(tafMetas[key].atual) || 0;
        const ruleLimit = rule.direction === 'max' ? (rule.max || rule.min) : (rule.min || rule.max);
        
        let ok = false;
        if (rule.direction === 'max') {
            ok = val > 0 && val <= ruleLimit;
        } else {
            ok = val >= ruleLimit;
        }

        if (!ok) {
            allApproved = false;
            failingList.push(rule.name);
        }
    });

    if (activeCount === 0) {
        banner.style.borderLeftColor = 'var(--border-color)';
        badge.style.background = 'rgba(255, 255, 255, 0.05)';
        badge.style.borderColor = 'var(--border-color)';
        badge.style.color = 'var(--text-muted)';
        title.textContent = 'NENHUM EXERCÍCIO ATIVO';
        title.style.color = 'var(--text-muted)';
        desc.textContent = 'Marque pelo menos um exercício como "Monitorar" para avaliar sua situação no TAF.';
        dot.className = 'status-dot';
        text.textContent = 'SEM DADOS';
        text.style.color = 'var(--text-muted)';
    } else if (allApproved) {
        banner.style.borderLeftColor = 'var(--accent-green-light)';
        badge.style.background = 'rgba(46, 204, 113, 0.15)';
        badge.style.borderColor = 'var(--accent-green-light)';
        badge.style.color = 'var(--accent-green-light)';
        title.textContent = 'APROVADO NO TAF ATUAL';
        title.style.color = 'var(--accent-green-light)';
        desc.textContent = 'Parabéns! Suas marcas nos exercícios monitorados atingem todos os índices mínimos do edital.';
        dot.className = 'status-dot green';
        text.textContent = 'APTO';
        text.style.color = 'var(--accent-green-light)';
    } else {
        banner.style.borderLeftColor = 'var(--accent-red)';
        badge.style.background = 'rgba(231, 76, 60, 0.15)';
        badge.style.borderColor = 'var(--accent-red)';
        badge.style.color = 'var(--accent-red)';
        title.textContent = 'REPROVADO NO TAF ATUAL';
        title.style.color = 'var(--accent-red)';
        desc.textContent = `Abaixo do mínimo exigido em: ${failingList.join(', ')}.`;
        dot.className = 'status-dot red';
        text.textContent = 'INAPTO';
        text.style.color = 'var(--accent-red)';
    }
}

// Render simulation history list
function renderTafHistory() {
    const tbody = document.getElementById('tafHistoryBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!tafHistorico || tafHistorico.length === 0) {
        // Find header to calculate colspan
        const activeRules = getActiveTafRules();
        const activeKeysCount = Object.keys(activeRules).filter(k => tafMetas[k].ativo !== false).length;
        tbody.innerHTML = `<tr><td colspan="${activeKeysCount + 3}" style="text-align:center; color:var(--text-muted); padding:20px;">Nenhum simulado do TAF registrado ainda.</td></tr>`;
        return;
    }

    const rules = getActiveTafRules();
    const activeKeys = Object.keys(rules).filter(k => tafMetas[k].ativo !== false);
    
    // Render header dynamically
    const header = document.getElementById('tafHistoryHeader');
    if (header) {
        header.innerHTML = `
            <tr>
                <th>Data/Gênero</th>
                ${activeKeys.map(k => `<th>${rules[k].name}</th>`).join('')}
                <th>Situação</th>
                <th>Ações</th>
            </tr>
        `;
    }

    // Sort by date descending
    const sorted = [...tafHistorico].sort((a, b) => new Date(b.data) - new Date(a.data));

    sorted.forEach(sim => {
        const dateFmt = sim.data ? new Date(sim.data + 'T12:00').toLocaleDateString('pt-BR') : '-';
        const genero = sim.genero || 'masculino';
        const simRules = tafConfig.rules ? tafConfig.rules[genero] : PRF_TAF_RULES[genero];

        let allOk = true;
        let anyPerformed = false;

        const colsHtml = activeKeys.map(key => {
            const val = sim[key];
            const hasVal = val !== null && val !== undefined && !isNaN(val);
            if (hasVal) anyPerformed = true;

            const rule = simRules[key] || rules[key];
            if (!rule) return `<td style="color:var(--text-muted);">—</td>`;
            
            const limit = rule.direction === 'max' ? (rule.max || rule.min) : (rule.min || rule.max);
            const ok = !hasVal || (rule.direction === 'max' ? (val > 0 && val <= limit) : val >= limit);

            if (!ok) allOk = false;

            const text = hasVal ? `${val}${rule.unit}` : '—';
            return `<td style="color:${hasVal ? (ok ? 'var(--accent-green-light)' : 'var(--accent-red)') : 'var(--text-muted)'}; font-weight:bold;">${text}</td>`;
        }).join('');

        const statusClass = (anyPerformed && allOk) ? 'concluido' : 'pendente';
        const statusText = (anyPerformed && allOk) ? 'Apto' : 'Inapto';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${dateFmt}</strong><br><small style="color:var(--text-muted); text-transform:capitalize;">${genero}</small></td>
            ${colsHtml}
            <td><span class="simulado-status ${statusClass}" style="padding:4px 8px; font-size:0.75rem;">${statusText}</span></td>
            <td>
                <button class="btn-actions btn-edit-taf-sim" data-id="${sim.id}" title="Editar" style="padding:4px 8px; background:none; border:none; color:var(--text-primary); cursor:pointer;"><i class="bi bi-pencil"></i></button>
                <button class="btn-actions btn-del-taf-sim" data-id="${sim.id}" title="Excluir" style="padding:4px 8px; background:none; border:none; color:var(--accent-red); cursor:pointer;"><i class="bi bi-trash3"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach delete listeners
    tbody.querySelectorAll('.btn-del-taf-sim').forEach(btn => {
        btn.addEventListener('click', async function() {
            if (await showConfirm('Deseja realmente excluir este registro do TAF?')) {
                const id = parseInt(this.dataset.id);
                tafHistorico = tafHistorico.filter(x => x.id !== id);
                saveAll();
                renderTaf();
                showToast('Simulado do TAF excluído!');
            }
        });
    });

    // Attach edit listeners
    tbody.querySelectorAll('.btn-edit-taf-sim').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            openEditTafSimView(id);
        });
    });
}

// Gender Buttons Listeners
document.getElementById('btnTafGeneroM')?.addEventListener('click', () => {
    tafConfig.genero = 'masculino';
    saveAll();
    renderTaf();
});

document.getElementById('btnTafGeneroF')?.addEventListener('click', () => {
    tafConfig.genero = 'feminino';
    saveAll();
    renderTaf();
});

// Modal Toggles
const tafModal = document.getElementById('taf-modal-view');
document.getElementById('btnNovoSimuladoTaf')?.addEventListener('click', () => {
    if (tafModal) {
        editingTafSimId = null;
        if (document.getElementById('tafModalTitle')) {
            document.getElementById('tafModalTitle').innerHTML = '<i class="bi bi-clipboard-pulse"></i> Registrar Simulado TAF';
        }
        tafModal.classList.remove('d-none');
        document.getElementById('tafRegData').value = new Date().toISOString().split('T')[0];
        renderTafRegModalInputs(null);
    }
});

function openEditTafSimView(simId) {
    const sim = tafHistorico.find(x => x.id === simId);
    if (!sim) return;
    
    editingTafSimId = simId;
    if (document.getElementById('tafModalTitle')) {
        document.getElementById('tafModalTitle').innerHTML = '<i class="bi bi-clipboard-pulse"></i> Editar Simulado TAF';
    }
    
    if (tafModal) {
        tafModal.classList.remove('d-none');
        document.getElementById('tafRegData').value = sim.data || '';
        renderTafRegModalInputs(sim);
    }
}

const closeTafModal = () => {
    if (tafModal) tafModal.classList.add('d-none');
};

document.getElementById('btnFecharModalTaf')?.addEventListener('click', closeTafModal);
document.getElementById('btnCancelarModalTaf')?.addEventListener('click', closeTafModal);

// Save Simulado TAF
document.getElementById('btnSalvarModalTaf')?.addEventListener('click', () => {
    const data = document.getElementById('tafRegData').value;
    if (!data) { showToast('Selecione a data!'); return; }

    const simTaf = {
        id: editingTafSimId || Date.now(),
        data,
        genero: tafConfig.genero || 'masculino'
    };

    const inputs = document.querySelectorAll('.taf-reg-input');
    let hasAnyValue = false;
    let validationFailed = false;
    const rules = getActiveTafRules();

    inputs.forEach(inp => {
        const key = inp.dataset.key;
        const valRaw = inp.value.trim();
        if (valRaw !== "") {
            const val = parseFloat(valRaw);
            if (isNaN(val) || val < 0) {
                showToast(`Insira uma marca válida!`);
                validationFailed = true;
            }
            simTaf[key] = val;
            hasAnyValue = true;

            // --- AUTO-UPDATE "ATUAL" IF RECORD IS BETTER ---
            const rule = rules[key];
            if (rule) {
                const currentVal = parseFloat(tafMetas[key].atual) || 0;
                let isBetter = false;
                if (rule.direction === 'max') {
                    // For max limits (like shuttle), lower is better
                    isBetter = currentVal === 0 || val < currentVal;
                } else {
                    // For min limits (like barra), higher is better
                    isBetter = val > currentVal;
                }
                if (isBetter) {
                    tafMetas[key].atual = val;
                }
            }
            // -----------------------------------------------
        } else {
            simTaf[key] = null;
        }
    });

    if (validationFailed) return;

    if (!hasAnyValue) {
        showToast('Preencha a marca de pelo menos um exercício!');
        return;
    }

    if (editingTafSimId) {
        const idx = tafHistorico.findIndex(x => x.id === editingTafSimId);
        if (idx !== -1) {
            tafHistorico[idx] = simTaf;
        }
    } else {
        tafHistorico.push(simTaf);
    }
    
    saveAll();
    closeTafModal();
    renderTaf();
    showToast(editingTafSimId ? 'Simulado do TAF atualizado!' : 'Simulado do TAF registrado!');
});

// ===== TAF SETTINGS & CUSTOMIZATION =====

document.getElementById('btnToggleTafSettings')?.addEventListener('click', function() {
    const content = document.getElementById('tafSettingsContent');
    if (content) {
        const isHidden = content.classList.contains('d-none');
        if (isHidden) {
            content.classList.remove('d-none');
            this.innerHTML = '<i class="bi bi-chevron-up"></i> Fechar Configurações';
            renderTafRulesEditor();
        } else {
            content.classList.add('d-none');
            this.innerHTML = '<i class="bi bi-gear"></i> Configurar TAF';
        }
    }
});

document.getElementById('btnAdicionarExercicioTaf')?.addEventListener('click', () => {
    const newKey = 'ex_' + Date.now();
    
    if (!tafConfig.rules) {
        tafConfig.rules = JSON.parse(JSON.stringify(PRF_TAF_RULES));
    }
    
    tafConfig.rules.masculino[newKey] = { min: 0, label: "mínimo 0", unit: "reps", name: "Novo Exercício", desc: "", direction: "min", ativo: true };
    tafConfig.rules.feminino[newKey] = { min: 0, label: "mínimo 0", unit: "reps", name: "Novo Exercício", desc: "", direction: "min", ativo: true };
    tafMetas[newKey] = { atual: 0, meta: 0, ativo: true };
    
    saveAll();
    renderTaf();
    renderTafRulesEditor();
    showToast('Novo exercício adicionado! Configure-o abaixo.');
});

document.getElementById('tafModeloSelect')?.addEventListener('change', function() {
    const val = this.value;
    if (val === 'prf') {
        tafConfig.rules = JSON.parse(JSON.stringify(PRF_TAF_RULES));
        tafConfig.modelo = 'prf';
    } else if (val === 'pf') {
        tafConfig.rules = JSON.parse(JSON.stringify(PF_TAF_RULES));
        tafConfig.modelo = 'pf';
        // Auto-disable abdominal for PF
        tafMetas.abdominal.ativo = false;
    } else {
        tafConfig.modelo = 'custom';
    }

    // Sync active state from rules
    const rules = tafConfig.rules[tafConfig.genero || 'masculino'];
    Object.keys(rules).forEach(k => {
        if (rules[k].ativo !== undefined) {
            tafMetas[k].ativo = rules[k].ativo;
        }
    });

    saveAll();
    renderTaf();
});

document.getElementById('btnSalvarTafSettings')?.addEventListener('click', () => {
    const activeGender = tafConfig.genero || 'masculino';
    
    if (!tafConfig.rules) {
        tafConfig.rules = JSON.parse(JSON.stringify(PRF_TAF_RULES));
    }
    
    const genderRules = tafConfig.rules[activeGender];
    
    Object.keys(genderRules).forEach(key => {
        const nameInput = document.querySelector(`.edit-rule-name[data-key="${key}"]`);
        const valInput = document.querySelector(`.edit-rule-val[data-key="${key}"]`);
        const unitInput = document.querySelector(`.edit-rule-unit[data-key="${key}"]`);
        const dirInput = document.querySelector(`.edit-rule-dir[data-key="${key}"]`);
        
        if (nameInput && valInput && unitInput && dirInput) {
            const name = nameInput.value.trim();
            const val = parseFloat(valInput.value) || 0;
            const unit = unitInput.value.trim();
            const direction = dirInput.value;
            
            genderRules[key].name = name;
            genderRules[key].unit = unit;
            genderRules[key].direction = direction;
            
            if (direction === 'max') {
                genderRules[key].max = val;
                delete genderRules[key].min;
                genderRules[key].label = `máximo ${val}${unit}`;
            } else {
                genderRules[key].min = val;
                delete genderRules[key].max;
                genderRules[key].label = `mínimo ${val} ${unit}`;
            }
        }
    });
    
    tafConfig.modelo = document.getElementById('tafModeloSelect').value;
    saveAll();
    renderTaf();
    showToast('Configurações do TAF salvas com sucesso!');
    
    // Collapse settings
    const content = document.getElementById('tafSettingsContent');
    if (content) content.classList.add('d-none');
    const toggleBtn = document.getElementById('btnToggleTafSettings');
    if (toggleBtn) toggleBtn.innerHTML = '<i class="bi bi-gear"></i> Configurar TAF';
});

function renderTafRulesEditor() {
    const grid = document.getElementById('tafRulesEditorGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const activeRules = getActiveTafRules();
    
    Object.keys(activeRules).forEach((key, index) => {
        const rule = activeRules[key];
        const div = document.createElement('div');
        div.className = 'form-group';
        div.style.padding = '12px';
        div.style.background = 'rgba(255, 255, 255, 0.02)';
        div.style.border = '1px solid var(--border-color)';
        div.style.borderRadius = '4px';
        
        const limitVal = rule.direction === 'max' ? (rule.max || rule.min) : (rule.min || rule.max);
        
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-weight: 700; font-size: 0.8rem; color: var(--accent-yellow); margin: 0; text-transform: uppercase;">Exercício ${index + 1}</label>
                <button type="button" class="btn-delete-rule" data-key="${key}" style="background: none; border: none; color: var(--accent-red); cursor: pointer; padding: 0 4px;" title="Excluir Exercício"><i class="bi bi-trash3"></i></button>
            </div>
            <div style="margin-bottom: 8px;">
                <label style="font-size: 0.7rem; color: var(--text-muted);">Nome do Exercício</label>
                <input type="text" class="input-mentor edit-rule-name" data-key="${key}" value="${rule.name}" style="width: 100%; padding: 4px 8px; font-size: 0.8rem; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                <div>
                    <label style="font-size: 0.7rem; color: var(--text-muted);">Índice Exigido</label>
                    <input type="number" step="0.01" class="input-mentor edit-rule-val" data-key="${key}" value="${limitVal || 0}" style="width: 100%; padding: 4px 8px; font-size: 0.8rem; text-align: center; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
                </div>
                <div>
                    <label style="font-size: 0.7rem; color: var(--text-muted);">Unidade</label>
                    <input type="text" class="input-mentor edit-rule-unit" data-key="${key}" value="${rule.unit}" style="width: 100%; padding: 4px 8px; font-size: 0.8rem; text-align: center; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                <div>
                    <label style="font-size: 0.7rem; color: var(--text-muted);">Tipo de Avaliação</label>
                    <select class="input-mentor edit-rule-dir" data-key="${key}" style="width: 100%; padding: 4px; font-size: 0.8rem; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">
                        <option value="min" ${rule.direction === 'min' ? 'selected' : ''}>Mínimo Exigido (>=)</option>
                        <option value="max" ${rule.direction === 'max' ? 'selected' : ''}>Tempo Máximo (<=)</option>
                    </select>
                </div>
            </div>
        `;
        grid.appendChild(div);
    });

    // Attach delete rule listeners
    grid.querySelectorAll('.btn-delete-rule').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const key = this.dataset.key;
            const ruleName = activeRules[key].name;
            if (await showConfirm(`Deseja realmente excluir o exercício "${ruleName}" de ambos os gêneros?`)) {
                delete tafConfig.rules.masculino[key];
                delete tafConfig.rules.feminino[key];
                delete tafMetas[key];
                saveAll();
                renderTaf();
                renderTafRulesEditor();
                showToast('Exercício excluído!');
            }
        });
    });
}

// ===== TAF EVOLUTION CHART =====

function updateTafChartSelect() {
    const select = document.getElementById('tafChartExerciseSelect');
    if (!select) return;
    
    const previousValue = select.value;
    select.innerHTML = '';
    
    const rules = getActiveTafRules();
    const activeKeys = Object.keys(rules).filter(k => tafMetas[k].ativo !== false);
    
    activeKeys.forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = rules[key].name;
        select.appendChild(opt);
    });
    
    // Restore previous value if it is still active, otherwise default to first
    if (previousValue && activeKeys.includes(previousValue)) {
        select.value = previousValue;
    } else if (activeKeys.length > 0) {
        select.value = activeKeys[0];
    }
}

function drawTafEvolutionChart() {
    const svg = document.getElementById('tafEvolutionChart');
    const select = document.getElementById('tafChartExerciseSelect');
    if (!svg || !select) return;
    
    svg.innerHTML = '';
    
    const key = select.value;
    if (!key) return;
    
    const rules = getActiveTafRules();
    const rule = rules[key];
    if (!rule) return;
    
    // Filter history for simulations where this exercise was performed (not null)
    // Sort by date ascending (chronological order)
    const dataPoints = [...tafHistorico]
        .filter(sim => sim[key] !== null && sim[key] !== undefined && !isNaN(sim[key]))
        .sort((a, b) => new Date(a.data) - new Date(b.data));
        
    const ruleLimit = rule.direction === 'max' ? (rule.max || rule.min) : (rule.min || rule.max);
    const targetVal = parseFloat(tafMetas[key].meta) || ruleLimit;
    
    // If no data points, display placeholder message inside SVG
    if (dataPoints.length === 0) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '400');
        text.setAttribute('y', '110');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'var(--text-muted)');
        text.setAttribute('font-size', '14px');
        text.setAttribute('font-family', 'var(--font-body)');
        text.textContent = 'Registre simulados do TAF com este exercício para ver o gráfico de evolução.';
        svg.appendChild(text);
        return;
    }
    
    const width = 800;
    const height = 220;
    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 35;
    
    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;
    
    // Find min and max values to scale the Y axis
    const values = dataPoints.map(d => d[key]);
    values.push(ruleLimit);
    values.push(targetVal);
    
    let maxVal = Math.max(...values);
    let minVal = Math.min(...values);
    
    // Add a bit of padding to min and max
    const range = maxVal - minVal;
    if (range === 0) {
        maxVal += ruleLimit * 0.2 || 1;
        minVal = Math.max(0, minVal - (ruleLimit * 0.2 || 1));
    } else {
        maxVal += range * 0.15;
        minVal = Math.max(0, minVal - range * 0.15);
    }
    
    // Helpers to project coordinates
    const getX = (index) => {
        if (dataPoints.length <= 1) return paddingLeft + graphWidth / 2;
        return paddingLeft + (index / (dataPoints.length - 1)) * graphWidth;
    };
    
    const getY = (val) => {
        const clamped = Math.max(minVal, Math.min(maxVal, val));
        const pct = (clamped - minVal) / (maxVal - minVal);
        return paddingTop + graphHeight - pct * graphHeight;
    };
    
    // 1. Draw horizontal grid lines (Y axis ticks)
    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
        const val = minVal + ((maxVal - minVal) / yTicks) * i;
        const y = getY(val);
        
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
        text.textContent = val.toFixed(1) + rule.unit;
        svg.appendChild(text);
    }
    
    // 2. Draw vertical grid lines and X axis labels (Dates)
    dataPoints.forEach((d, idx) => {
        const x = getX(idx);
        
        // Vertical tick line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', paddingTop);
        line.setAttribute('x2', x);
        line.setAttribute('y2', paddingTop + graphHeight);
        line.setAttribute('stroke', '#222');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '2 4');
        svg.appendChild(line);
        
        // Date label
        const dateStr = d.data ? new Date(d.data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-';
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', paddingTop + graphHeight + 15);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'var(--text-muted)');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-family', 'var(--font-body)');
        text.textContent = dateStr;
        svg.appendChild(text);
    });
    
    // 3. Draw limit line (Edital Minimum) - Red
    const limitY = getY(ruleLimit);
    const limitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    limitLine.setAttribute('x1', paddingLeft);
    limitLine.setAttribute('y1', limitY);
    limitLine.setAttribute('x2', width - paddingRight);
    limitLine.setAttribute('y2', limitY);
    limitLine.setAttribute('stroke', 'var(--accent-red)');
    limitLine.setAttribute('stroke-width', '1.5');
    limitLine.setAttribute('stroke-dasharray', '5 5');
    svg.appendChild(limitLine);
    
    const limitText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    limitText.setAttribute('x', width - paddingRight - 5);
    limitText.setAttribute('y', limitY - 5);
    limitText.setAttribute('text-anchor', 'end');
    limitText.setAttribute('fill', 'var(--accent-red)');
    limitText.setAttribute('font-size', '9px');
    limitText.setAttribute('font-family', 'var(--font-body)');
    limitText.textContent = `Mínimo Edital: ${ruleLimit}${rule.unit}`;
    svg.appendChild(limitText);

    // 4. Draw target line (Personal Goal) - Blue
    const targetY = getY(targetVal);
    const targetLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    targetLine.setAttribute('x1', paddingLeft);
    targetLine.setAttribute('y1', targetY);
    targetLine.setAttribute('x2', width - paddingRight);
    targetLine.setAttribute('y2', targetY);
    targetLine.setAttribute('stroke', 'var(--accent-blue)');
    targetLine.setAttribute('stroke-width', '1.5');
    targetLine.setAttribute('stroke-dasharray', '5 5');
    svg.appendChild(targetLine);
    
    const targetText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    targetText.setAttribute('x', paddingLeft + 5);
    targetText.setAttribute('y', targetY - 5);
    targetText.setAttribute('text-anchor', 'start');
    targetText.setAttribute('fill', 'var(--accent-blue)');
    targetText.setAttribute('font-size', '9px');
    targetText.setAttribute('font-family', 'var(--font-body)');
    targetText.textContent = `Sua Meta: ${targetVal}${rule.unit}`;
    svg.appendChild(targetText);
    
    // 5. Plot performance line
    let pathD = '';
    dataPoints.forEach((d, idx) => {
        const x = getX(idx);
        const y = getY(d[key]);
        if (idx === 0) pathD = `M ${x} ${y}`;
        else pathD += ` L ${x} ${y}`;
    });
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'var(--accent-yellow)');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    
    // 6. Plot performance dots with tooltips
    const tooltipEl = document.getElementById('chartTooltip');

    dataPoints.forEach((d, idx) => {
        const x = getX(idx);
        const y = getY(d[key]);
        const val = d[key];
        
        // Calculate approval for this specific point
        let isApproved = false;
        if (rule.direction === 'max') {
            isApproved = val > 0 && val <= ruleLimit;
        } else {
            isApproved = val >= ruleLimit;
        }

        // Percentage calculations
        let pct = 0;
        if (rule.direction === 'max') {
            pct = val > 0 ? Math.round((ruleLimit / val) * 100) : 0;
        } else {
            pct = ruleLimit > 0 ? Math.round((val / ruleLimit) * 100) : 0;
        }
        
        const dateStr = d.data ? new Date(d.data + 'T12:00').toLocaleDateString('pt-BR') : '-';

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '5');
        circle.setAttribute('fill', '#000');
        circle.setAttribute('stroke', 'var(--accent-yellow)');
        circle.setAttribute('stroke-width', '2.5');
        circle.style.cursor = 'pointer';
        circle.style.transition = 'all 0.15s ease';
        
        circle.addEventListener('mouseenter', function() {
            circle.setAttribute('r', '7.5');
            circle.setAttribute('fill', 'var(--accent-yellow)');
            
            if (tooltipEl) {
                tooltipEl.style.display = 'block';
                tooltipEl.style.borderLeftColor = 'var(--accent-yellow)';
                tooltipEl.innerHTML = `
                    <div style="font-weight:800; font-family:var(--font-heading); text-transform:uppercase; font-size:0.9rem; color:var(--accent-yellow); margin-bottom:4px;">
                        Simulado do TAF
                    </div>
                    <div>Data: <strong>${dateStr}</strong></div>
                    <div>Resultado: <strong style="color: ${isApproved ? 'var(--accent-green-light)' : 'var(--accent-red)'}">${val}${rule.unit} (${isApproved ? 'Apto' : 'Inapto'})</strong></div>
                    <div>Índice/Mínimo: <strong>${pct}%</strong></div>
                    <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:4px;">
                        Edital: ${ruleLimit}${rule.unit} | Sua Meta: ${targetVal}${rule.unit}
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
            circle.setAttribute('r', '5');
            circle.setAttribute('fill', '#000');
            if (tooltipEl) tooltipEl.style.display = 'none';
        });
        
        svg.appendChild(circle);
    });
}

document.getElementById('tafChartExerciseSelect')?.addEventListener('change', drawTafEvolutionChart);

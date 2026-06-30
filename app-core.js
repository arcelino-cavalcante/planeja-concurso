// ===== PLANEJA CONCURSO APP - CORE (Navigation, Rotinas, Toast) =====
// DB object is now defined in firebase-config.js (Firebase + localStorage hybrid)

let rotinas = [];
let concursos = [];
let ciclos = [];
let simulados = [];
let historicoEstudos = [];
let metas = [];
let userProfile = { nome: 'Aluno' };

// TAF Global Variables
let tafConfig = DB.load('tafConfig', { genero: 'masculino' });
let tafMetas = DB.load('tafMetas', {
    barra: { atual: 0, meta: 3 },
    shuttle: { atual: 15.0, meta: 14.0 },
    salto: { atual: 1.80, meta: 2.01 },
    abdominal: { atual: 25, meta: 35 },
    corrida: { atual: 2000, meta: 2301 }
});
let tafHistorico = DB.load('tafHistorico', []);
let currentActivities = [];
let editingActivityIndex = -1;
let editingCellDay = -1;
let contextMenuRotina = null;
let editingRoutineId = null;

function saveAll(instant = false) { 
    const debounce = instant ? 0 : undefined;
    DB.save('rotinas', rotinas, debounce); 
    DB.save('concursos', concursos, debounce); 
    DB.save('ciclos', ciclos, debounce); 
    DB.save('simulados', simulados, debounce);
    DB.save('historicoEstudos', historicoEstudos, debounce);
    DB.save('metas', metas, debounce);
    DB.save('tafConfig', tafConfig, debounce);
    DB.save('tafMetas', tafMetas, debounce);
    DB.save('tafHistorico', tafHistorico, debounce);
    if (typeof updateDashboard === 'function') updateDashboard(); 
}
function getActiveRotina() { return rotinas && rotinas.length > 0 ? rotinas[0] : null; }

function formatHours(minutes) {
    const totalSeconds = Math.floor(minutes * 60);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (s > 0 || (h === 0 && m === 0)) {
        return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    }
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

function updateDashboard() {
    const now = new Date();
    const today = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const daysOfWeek = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
    const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
    
    // Update Date
    const dateEl = document.getElementById('dashboardCurrentDate');
    if (dateEl) {
        dateEl.textContent = `${daysOfWeek[today]}, ${now.getDate()} DE ${months[now.getMonth()]}`;
    }
    
    const activeRotina = getActiveRotina();
    let todayStudyMin = 0;
    
    if (activeRotina && activeRotina.atividades) {
        const uiDay = today === 0 ? 6 : today - 1; // Convert JS day to UI day
        activeRotina.atividades.forEach(act => {
            if (act.isStudy && act.days.includes(uiDay)) {
                const sh = parseInt(act.startTime.split(':')[0]), sm = parseInt(act.startTime.split(':')[1]);
                const eh = parseInt(act.endTime.split(':')[0]), em = parseInt(act.endTime.split(':')[1]);
                todayStudyMin += (eh*60+em) - (sh*60+sm);
            }
        });
    }
    
    // Update Banner Carga Horária and Status
    const hoursEl = document.getElementById('todayStudyHoursText');
    const statusEl = document.getElementById('dashboardTacticalStatus');
    const cicloRotinaHojeEl = document.getElementById('dashboardCicloRotinaHoje');
    
    // Update Execution View goal details
    const execHoursEl = document.getElementById('execTodayHoursText');
    const execDotEl = document.getElementById('execDayMetaDot');
    
    const formattedTodayHours = todayStudyMin > 0 ? formatHours(todayStudyMin) : '00h 00m 00s';
        
    if (hoursEl) {
        hoursEl.textContent = formattedTodayHours;
    }
    
    if (execHoursEl) {
        execHoursEl.textContent = formattedTodayHours;
    }
    
    if (execDotEl) {
        if (todayStudyMin > 0) {
            execDotEl.style.background = 'var(--accent-green-light)';
            execDotEl.style.boxShadow = '0 0 6px var(--accent-green-light)';
        } else {
            execDotEl.style.background = 'var(--accent-yellow)';
            execDotEl.style.boxShadow = '0 0 6px var(--accent-yellow)';
        }
    }
    
    if (cicloRotinaHojeEl) {
        if (activeRotina) {
            cicloRotinaHojeEl.textContent = `Hoje: ${formattedTodayHours} planejados na rotina "${activeRotina.nome}"`;
        } else {
            cicloRotinaHojeEl.textContent = 'Sem rotina ativa selecionada';
        }
    }
    
    if (statusEl) {
        if (todayStudyMin > 0) {
            statusEl.innerHTML = `<span class="status-dot green"></span> <span class="status-text">EM COMBATE</span>`;
            statusEl.className = 'tactical-status';
        } else {
            statusEl.innerHTML = `<span class="status-dot yellow"></span> <span class="status-text">DESCANSO TÁTICO</span>`;
            statusEl.className = 'tactical-status';
        }
    }
    
    // Update Active Cycle Card
    let activeCiclo = null;
    const activeCicloId = localStorage.getItem('activeCicloId');
    if (activeCicloId) {
        activeCiclo = ciclos.find(c => c.id === parseInt(activeCicloId));
    }
    if (!activeCiclo && ciclos.length > 0) {
        activeCiclo = ciclos[0]; // fallback to first cycle
        localStorage.setItem('activeCicloId', activeCiclo.id);
    }
    
    const cicloNomeEl = document.getElementById('dashboardCicloNome');
    const propostasEl = document.getElementById('dashboardHorasPropostas');
    const estudadasEl = document.getElementById('dashboardHorasEstudadas');
    const percentageEl = document.getElementById('dashboardRingPercentage');
    const ringProgressEl = document.querySelector('.progress-ring .ring-progress');
    const ringDotEl = document.querySelector('.progress-ring .ring-dot');
    const playBtn = document.getElementById('btnExecutarCicloDashboard');
    
    if (activeCiclo) {
        if (cicloNomeEl) cicloNomeEl.textContent = activeCiclo.nome;
        
        // Calculate cycle total duration and studied duration
        const proposedMin = activeCiclo.duracaoMin || 
            (activeCiclo.sequence ? activeCiclo.sequence.reduce((acc, curr) => acc + (curr.duracao || 0), 0) : 0);
            
        // Store on object if not present to ensure coherence
        if (!activeCiclo.duracaoMin) {
            activeCiclo.duracaoMin = proposedMin;
        }
        if (activeCiclo.horasEstudadasMin === undefined) {
            activeCiclo.horasEstudadasMin = 0;
        }
        
        const studiedMin = activeCiclo.horasEstudadasMin;
        
        if (propostasEl) propostasEl.textContent = formatHours(proposedMin);
        if (estudadasEl) estudadasEl.textContent = formatHours(studiedMin);
        
        const pct = proposedMin > 0 ? Math.min(1, studiedMin / proposedMin) : 0;
        const pctText = `${Math.round(pct * 100)}%`;
        
        if (percentageEl) percentageEl.textContent = pctText;
        
        // SVG Ring attributes
        if (ringProgressEl) {
            // Circumference of r=85 is 534
            const offset = 534 - (pct * 534);
            ringProgressEl.setAttribute('stroke-dashoffset', offset);
        }
        if (ringDotEl) {
            ringDotEl.style.transform = `rotate(${pct * 360}deg)`;
            ringDotEl.style.transformOrigin = '100px 100px';
        }
        
        if (playBtn) {
            playBtn.innerHTML = `<i class="bi bi-play-fill"></i> Executar ciclo atual`;
            playBtn.style.opacity = '1';
        }
    } else {
        if (cicloNomeEl) cicloNomeEl.textContent = 'NENHUM CICLO ATIVO';
        if (propostasEl) propostasEl.textContent = '00h 00m';
        if (estudadasEl) estudadasEl.textContent = '00h 00m';
        if (percentageEl) percentageEl.textContent = '0%';
        if (ringProgressEl) ringProgressEl.setAttribute('stroke-dashoffset', '534');
        if (ringDotEl) {
            ringDotEl.style.transform = 'none';
        }
        if (playBtn) {
            playBtn.innerHTML = `<i class="bi bi-plus-lg"></i> Criar primeiro ciclo`;
        }
    }
    
    // Render Consistency Heatmap
    if (typeof historicoEstudos !== 'undefined') {
        renderHeatmap();
    }
    // 4. Update Weekly Performance CSS Bar Chart
    const currentDayIndex = today === 0 ? 6 : today - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - currentDayIndex);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekDaysShort = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
    const dayMinutes = [0, 0, 0, 0, 0, 0, 0];

    if (typeof historicoEstudos !== 'undefined' && historicoEstudos) {
        historicoEstudos.forEach(log => {
            const logDate = new Date(log.data);
            if (logDate >= startOfWeek) {
                const logDayIndex = logDate.getDay();
                const mappedIndex = logDayIndex === 0 ? 6 : logDayIndex - 1;
                dayMinutes[mappedIndex] += log.duracaoMin || 0;
            }
        });
    }

    const maxMin = Math.max(...dayMinutes, 60);
    const barChartContainer = document.getElementById('weeklyBarChartContainer');
    if (barChartContainer) {
        barChartContainer.innerHTML = dayMinutes.map((min, idx) => {
            const h = Math.floor(min / 60);
            const m = min % 60;
            const valText = min > 0 ? (h > 0 ? `${h}h${m > 0 ? m : ''}` : `${m}m`) : '';
            const pct = (min / maxMin) * 100;
            const isActive = idx === currentDayIndex ? ' active' : '';
            return `
                <div class="chart-bar-wrapper${isActive}">
                    <span class="chart-bar-val">${valText}</span>
                    <div class="chart-bar" style="height: ${pct}%;"></div>
                    <span class="chart-bar-label">${weekDaysShort[idx]}</span>
                </div>
            `;
        }).join('');
    }

    // 5. Update Histórico de Combate (Recent Studies)
    const historyContainer = document.getElementById('historicoListContainer');
    if (historyContainer) {
        if (!historicoEstudos || historicoEstudos.length === 0) {
            historyContainer.innerHTML = `
                <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.9rem;">
                    <i class="bi bi-shield-slash" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--text-muted);"></i>
                    Sem registros de combate recentes.<br>Complete uma sessão no timer para começar.
                </div>
            `;
        } else {
            const sortedHistory = [...historicoEstudos].reverse().slice(0, 5);
            historyContainer.innerHTML = sortedHistory.map(log => {
                const date = new Date(log.data);
                const timeFmt = `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
                const dateFmt = `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}`;
                const h = Math.floor(log.duracaoMin / 60);
                const m = log.duracaoMin % 60;
                const durFmt = h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`;
                const badgeType = log.fase === 'Revisão' ? 'revisao' : 'estudo';
                const badgeText = log.fase || 'Geral';
                return `
                    <div class="history-log-item">
                        <div class="history-log-left">
                            <span class="history-log-subject">${log.materiaNome}</span>
                            <div class="history-log-meta">
                                <span class="history-log-badge ${badgeType}">${badgeText}</span>
                                <span>${log.cicloNome}</span>
                            </div>
                        </div>
                        <div class="history-log-right">
                            <span class="history-log-dur">+${durFmt}</span>
                            <span class="history-log-date">${dateFmt} às ${timeFmt}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // 6. Update Total Hours per Concurso
    const totalHoursListEl = document.getElementById('totalHoursConcursoList');
    if (totalHoursListEl) {
        if (!historicoEstudos || historicoEstudos.length === 0) {
            totalHoursListEl.innerHTML = '<span style="color:var(--text-muted);font-size:0.9rem;">Nenhum combate registrado ainda.</span>';
        } else {
            const hoursByCiclo = {};
            historicoEstudos.forEach(log => {
                const name = log.cicloNome || 'Sem Concurso Vinculado';
                if (!hoursByCiclo[name]) hoursByCiclo[name] = 0;
                hoursByCiclo[name] += log.duracaoMin;
            });
            
            let html = '';
            for (const [name, min] of Object.entries(hoursByCiclo)) {
                const displayName = name.replace('Ciclo - ', ''); // Limpa o "Ciclo - " pra deixar mais focado
                const h = Math.floor(min / 60);
                const m = min % 60;
                const durFmt = h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`;
                
                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:rgba(255,255,255,0.03); border-radius:6px; border-left:3px solid var(--primary-color);">
                        <span style="font-weight:700; font-family:var(--font-heading); font-size:1.0rem; letter-spacing:0.5px; text-transform:uppercase;">${displayName}</span>
                        <span style="color:var(--accent-yellow); font-weight:700; font-size:1.0rem;">${durFmt}</span>
                    </div>
                `;
            }
            totalHoursListEl.innerHTML = html;
        }
    }
}

function getStudyHours() {
    const r = getActiveRotina();
    if (!r || !r.atividades) return 0;
    let totalMin = 0;
    r.atividades.forEach(act => {
        if (!act.isStudy) return;
        const sh = parseInt(act.startTime.split(':')[0]), sm = parseInt(act.startTime.split(':')[1]);
        const eh = parseInt(act.endTime.split(':')[0]), em = parseInt(act.endTime.split(':')[1]);
        totalMin += ((eh*60+em)-(sh*60+sm)) * act.days.length;
    });
    return Math.round(totalMin / 6) / 10; // 1 decimal precision (e.g. 10.5h)
}

// ===== DOM =====
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page-content');
const toastEl = document.getElementById('toastNotification');
const toastMsg = document.getElementById('toastMessage');

function showToast(msg) { toastMsg.textContent = msg; toastEl.classList.add('active'); setTimeout(() => toastEl.classList.remove('active'), 3000); }
function closeSidebar() { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active'); }

// ===== NAVIGATION =====
function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal-view');
        const msgEl = document.getElementById('confirm-modal-message');
        const btnCancel = document.getElementById('btnConfirmCancel');
        const btnYes = document.getElementById('btnConfirmYes');
        
        if (!modal || !msgEl || !btnCancel || !btnYes) {
            resolve(confirm(message));
            return;
        }
        
        msgEl.textContent = message;
        modal.classList.remove('d-none');
        
        const cleanUp = () => {
            modal.classList.add('d-none');
            btnCancel.removeEventListener('click', onCancel);
            btnYes.removeEventListener('click', onConfirm);
        };
        
        const onCancel = () => {
            cleanUp();
            resolve(false);
        };
        
        const onConfirm = () => {
            cleanUp();
            resolve(true);
        };
        
        btnCancel.addEventListener('click', onCancel);
        btnYes.addEventListener('click', onConfirm);
    });
}

function navigateToPage(page) {
    const item = Array.from(navItems).find(n => n.dataset.page === page);
    if (item) {
        // Save study progress of the current minute before switching screen
        const execView = document.getElementById('ciclos-exec-view');
        if (execView && !execView.classList.contains('d-none') && typeof saveStudyProgress === 'function') {
            saveStudyProgress();
        }

        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        pages.forEach(p => p.classList.remove('active'));
        const pageContainer = document.getElementById('page-' + page);
        if (pageContainer) {
            pageContainer.classList.add('active');
        }
        if (page === 'rotinas') { 
            if (!rotinas || rotinas.length === 0) {
                rotinas = [{ id: Date.now(), nome: 'Minha Rotina', status: 'ativa', atividades: [] }];
                saveAll();
            }
            // Ensure first is always active
            rotinas.forEach((r, i) => r.status = (i === 0) ? 'ativa' : 'desativada');
            editingRoutineId = rotinas[0].id;
            openCalendarView(rotinas[0].nome, rotinas[0].atividades);
            document.getElementById('rotinas-list-view').classList.add('d-none');
            document.getElementById('rotinas-calendar-view').classList.remove('d-none');
        }
        if (page === 'concursos') { showConcursosView('concursos-list-view'); renderConcursosList(); }
        if (page === 'ciclos') { 
            if (ciclos && ciclos.length > 0) {
                let cicloToOpen = ciclos[0];
                if (typeof currentExecCiclo !== 'undefined' && currentExecCiclo) {
                    cicloToOpen = currentExecCiclo;
                } else {
                    const activeId = localStorage.getItem('activeCicloId');
                    if (activeId) {
                        const found = ciclos.find(c => c.id === parseInt(activeId));
                        if (found) cicloToOpen = found;
                    }
                }
                if (typeof openExecView === 'function') openExecView(cicloToOpen);
            } else {
                if (typeof openCicloWizard === 'function') openCicloWizard(); 
            }
        }
        if (page === 'simulados') { showSimuladosView('simulados-list-view'); renderSimuladosList(); }
        if (page === 'metas') { if (typeof renderMetas === 'function') renderMetas(); }
        if (page === 'taf') { if (typeof renderTaf === 'function') renderTaf(); }
        if (page === 'edital') { showEditalView('edital-list-view'); if (typeof loadEditais === 'function') loadEditais(); }
        if (page === 'qg') { if (typeof updateQgView === 'function') updateQgView(); }
        if (page === 'configuracoes') { refreshConfigPage(); }
        closeSidebar();
        
        // Refresh dashboard statistics whenever home page is accessed
        if (page === 'inicio' && typeof updateDashboard === 'function') {
            updateDashboard();
        }
    }
}

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToPage(item.dataset.page);
    });
});

// ===== EXECUTE CURRENT CYCLE FROM DASHBOARD =====
document.getElementById('btnExecutarCicloDashboard')?.addEventListener('click', () => {
    let activeCiclo = null;
    const activeCicloId = localStorage.getItem('activeCicloId');
    if (activeCicloId) {
        activeCiclo = ciclos.find(c => c.id === parseInt(activeCicloId));
    }
    if (!activeCiclo && ciclos.length > 0) {
        activeCiclo = ciclos[0];
    }
    
    if (activeCiclo) {
        navigateToPage('ciclos');
        if (typeof openExecView === 'function') {
            openExecView(activeCiclo);
        }
    } else {
        navigateToPage('ciclos');
        if (typeof openCicloWizard === 'function') {
            openCicloWizard();
        }
    }
});

function updateUserProfileDisplay() {
    document.getElementById('sidebarUserName').textContent = userProfile.nome;
    const dashName = document.getElementById('dashboardUserName');
    if (dashName) dashName.textContent = userProfile.nome;
}
updateUserProfileDisplay();

// ===== CONFIGURAÇÕES =====
function refreshConfigPage() {
    // Nome
    document.getElementById('configNomeInput').value = userProfile.nome || '';
    // Gênero e Lema
    if (document.getElementById('configGenderSelect')) {
        document.getElementById('configGenderSelect').value = userProfile.genero || 'M';
    }
    if (document.getElementById('configMottoInput')) {
        document.getElementById('configMottoInput').value = userProfile.lema || '';
    }
    // Email
    const emailEl = document.getElementById('configEmailDisplay');
    if (emailEl) emailEl.textContent = auth.currentUser?.email || '—';
    // Tipo de conta
    const tipoEl = document.getElementById('configTipoConta');
    if (tipoEl) tipoEl.textContent = 'Aluno (Google)';
    // Stats
    document.getElementById('configCountRotinas').textContent = rotinas.length;
    document.getElementById('configCountConcursos').textContent = concursos.length;
    document.getElementById('configCountCiclos').textContent = ciclos.length;
    document.getElementById('configCountSimulados').textContent = simulados.length;
}

document.getElementById('btnSalvarNome').addEventListener('click', () => {
    const novoNome = document.getElementById('configNomeInput').value.trim();
    const novoGenero = document.getElementById('configGenderSelect').value;
    const novoLema = document.getElementById('configMottoInput').value.trim();
    
    if (novoNome) {
        userProfile.nome = novoNome;
        userProfile.genero = novoGenero;
        userProfile.lema = novoLema;
        
        DB.save('userProfile', userProfile);
        updateUserProfileDisplay();
        showToast('Perfil atualizado com sucesso!');
        
        // Push local changes to Firebase if online
        if (typeof pushLocalToFirestore === 'function') {
            pushLocalToFirestore();
        }
    } else {
        showToast('Por favor, informe seu nome!');
    }
});

document.getElementById('btnResetarSistema').addEventListener('click', async () => {
    if (await showConfirm('⚠️ TEM CERTEZA ABSOLUTA?\n\nIsso apagará TODOS os seus concursos, simulados, ciclos e rotinas. Essa ação não tem volta.')) {
        if (await showConfirm('Último aviso: Deseja realmente APAGAR TUDO?')) {
            DB.clearAll();
            alert('Sistema resetado. A página será recarregada.');
            window.location.reload();
        }
    }
});

document.querySelectorAll('[id^="backToHome"]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(n => n.classList.remove('active'));
        document.querySelector('[data-page="inicio"]').classList.add('active');
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById('page-inicio').classList.add('active');
    });
});

if (menuToggle) menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
});
sidebarOverlay.addEventListener('click', closeSidebar);

// ===== ROTINAS =====
const rotinasList = document.getElementById('rotinasList');
const rotinasListView = document.getElementById('rotinas-list-view');
const rotinasCalendarView = document.getElementById('rotinas-calendar-view');
const scheduleBody = document.getElementById('scheduleBody');
const activityModal = document.getElementById('activityModal');
const contextMenu = document.getElementById('contextMenu');

function renderRotinas() {
    rotinasList.innerHTML = '';
    rotinas.forEach(r => {
        const row = document.createElement('div'); row.className = 'rotina-row';
        row.innerHTML = `<span class="rotina-name">${r.nome}</span><span><span class="status-badge ${r.status}">${r.status === 'ativa' ? 'Rotina ativa' : 'Rotina desativada'}</span></span><button class="btn-actions" data-id="${r.id}"><i class="bi bi-three-dots-vertical"></i></button>`;
        rotinasList.appendChild(row);
    });
    document.querySelectorAll('.rotinas-body .btn-actions').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            contextMenuRotina = rotinas.find(r => r.id === parseInt(btn.dataset.id));
            const rect = btn.getBoundingClientRect();
            contextMenu.style.top = rect.bottom + 4 + 'px'; contextMenu.style.left = (rect.left - 140) + 'px';
            contextMenu.classList.add('active');
        });
    });
}

document.querySelectorAll('.context-item').forEach(item => {
    item.addEventListener('click', () => {
        if (!contextMenuRotina) return;
        const action = item.dataset.action;
        if (action === 'ativar') { rotinas.forEach(r => r.status = 'desativada'); contextMenuRotina.status = 'ativa'; showToast('Rotina ativada!'); }
        else if (action === 'editar') { editingRoutineId = contextMenuRotina.id; openCalendarView(contextMenuRotina.nome, contextMenuRotina.atividades); }
        else if (action === 'duplicar') { rotinas.push({ ...contextMenuRotina, id: Date.now(), nome: contextMenuRotina.nome + ' (cópia)', status: 'desativada', atividades: [...contextMenuRotina.atividades] }); showToast('Rotina duplicada!'); }
        else if (action === 'excluir') { rotinas = rotinas.filter(r => r.id !== contextMenuRotina.id); showToast('Rotina excluída!'); }
        saveAll(); renderRotinas(); contextMenu.classList.remove('active'); contextMenuRotina = null;
    });
});
document.addEventListener('click', () => contextMenu.classList.remove('active'));

document.getElementById('btnNovaRotina').addEventListener('click', () => { editingRoutineId = null; currentActivities = []; openCalendarView('', []); });
const backToRotinasBtn = document.getElementById('backToRotinas');
if (backToRotinasBtn) {
    backToRotinasBtn.addEventListener('click', (e) => { e.preventDefault(); editingRoutineId = null; rotinasListView.classList.remove('d-none'); rotinasCalendarView.classList.add('d-none'); });
}

function openCalendarView(name, activities) {
    document.getElementById('routineNameInput').value = name || '';
    currentActivities = activities ? [...activities] : [];
    rotinasListView.classList.add('d-none'); rotinasCalendarView.classList.remove('d-none');
    buildScheduleGrid(); renderActivities();
}

function buildScheduleGrid() {
    scheduleBody.innerHTML = '';
    for (let h = 0; h < 24; h++) {
        const row = document.createElement('div'); row.className = 'time-row';
        row.innerHTML = `<div class="time-label">${String(h).padStart(2,'0')}:00</div>`;
        for (let d = 0; d < 7; d++) {
            const cell = document.createElement('div'); cell.className = 'time-cell'; cell.dataset.day = d; cell.dataset.hour = h;
            cell.addEventListener('click', () => openActivityModal(d, h));
            row.appendChild(cell);
        }
        scheduleBody.appendChild(row);
    }
}

function renderActivities() {
    document.querySelectorAll('.activity-block').forEach(b => b.remove());
    currentActivities.forEach((act, idx) => {
        act.days.forEach(day => {
            const sH = parseInt(act.startTime.split(':')[0]), sM = parseInt(act.startTime.split(':')[1]);
            const eH = parseInt(act.endTime.split(':')[0]), eM = parseInt(act.endTime.split(':')[1]);
            const dur = (eH*60+eM) - (sH*60+sM); if (dur <= 0) return;
            const cell = scheduleBody.querySelector(`.time-cell[data-day="${day}"][data-hour="${sH}"]`); if (!cell) return;
            const block = document.createElement('div'); block.className = `activity-block ${act.isStudy ? 'study' : 'work'}`;
            block.style.top = (sM/60)*60 + 'px'; block.style.height = (dur/60)*60 + 'px';
            block.innerHTML = `<span class="block-time">${act.startTime} - ${act.endTime}</span><span class="block-name">${act.name}</span>`;
            block.addEventListener('click', (e) => { e.stopPropagation(); editingActivityIndex = idx; openEditModal(act); });
            cell.appendChild(block);
        });
    });
    updateTotalHours();
}

function updateTotalHours() {
    let totalMin = 0;
    currentActivities.forEach(act => {
        if (!act.isStudy) return;
        const dur = (parseInt(act.endTime.split(':')[0])*60+parseInt(act.endTime.split(':')[1])) - (parseInt(act.startTime.split(':')[0])*60+parseInt(act.startTime.split(':')[1]));
        totalMin += dur * act.days.length;
    });
    document.getElementById('totalHours').textContent = `${Math.floor(totalMin/60)}:${String(totalMin%60).padStart(2,'0')}h`;
}

function openActivityModal(day, hour) {
    editingActivityIndex = -1; editingCellDay = day;
    document.getElementById('activityToggle').checked = false;
    document.getElementById('activityName').value = '';
    document.getElementById('startTime').value = String(hour).padStart(2,'0') + ':00';
    document.getElementById('endTime').value = String(hour+1).padStart(2,'0') + ':00';
    document.querySelectorAll('.day-btn').forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.day) === day));
    document.getElementById('btnRemoveActivity').style.display = 'none';
    activityModal.classList.add('active');
}

function openEditModal(act) {
    document.getElementById('activityToggle').checked = act.isStudy;
    document.getElementById('activityName').value = act.name;
    document.getElementById('startTime').value = act.startTime;
    document.getElementById('endTime').value = act.endTime;
    document.querySelectorAll('.day-btn').forEach(btn => btn.classList.toggle('active', act.days.includes(parseInt(btn.dataset.day))));
    document.getElementById('btnRemoveActivity').style.display = 'flex';
    activityModal.classList.add('active');
}

function closeModal() { activityModal.classList.remove('active'); editingActivityIndex = -1; }
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('btnCancelModal').addEventListener('click', closeModal);
activityModal.addEventListener('click', (e) => { if (e.target === activityModal) closeModal(); });
document.getElementById('activityToggle').addEventListener('change', function() { document.getElementById('activityName').placeholder = this.checked ? 'Estudar' : 'Nome da atividade'; });
document.querySelectorAll('.day-btn').forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('active')));

document.getElementById('btnSaveActivity').addEventListener('click', () => {
    const isStudy = document.getElementById('activityToggle').checked;
    const name = document.getElementById('activityName').value || (isStudy ? 'Estudar' : 'TRABALHO');
    const startTime = document.getElementById('startTime').value, endTime = document.getElementById('endTime').value;
    const days = []; document.querySelectorAll('.day-btn.active').forEach(btn => days.push(parseInt(btn.dataset.day)));
    if (!days.length) { showToast('Selecione pelo menos um dia!'); return; }
    if (editingActivityIndex >= 0) currentActivities[editingActivityIndex] = { name, startTime, endTime, days, isStudy };
    else currentActivities.push({ name, startTime, endTime, days, isStudy });
    closeModal(); renderActivities(); showToast('Atividade salva!');
});

document.getElementById('btnRemoveActivity').addEventListener('click', () => {
    if (editingActivityIndex >= 0) { currentActivities.splice(editingActivityIndex, 1); closeModal(); renderActivities(); showToast('Atividade removida!'); }
});

document.getElementById('btnSalvarRotina').addEventListener('click', () => {
    if (rotinasCalendarView.classList.contains('d-none')) return;
    const name = document.getElementById('routineNameInput').value || 'Nova Rotina';
     if (editingRoutineId) {
        const idx = rotinas.findIndex(r => r.id === editingRoutineId);
        if (idx >= 0) {
            rotinas[idx].nome = name;
            rotinas[idx].atividades = [...currentActivities];
            rotinas[idx].status = 'ativa'; // force active
        }
    } else {
        rotinas.push({ id: Date.now(), nome: name, status: 'ativa', atividades: [...currentActivities] });
        editingRoutineId = rotinas[rotinas.length - 1].id;
    }
    saveAll(); 
    
    // Auto recalculate cycle
    if (typeof recalcActiveCycleHoras === 'function') {
        recalcActiveCycleHoras();
    }
    
    showToast('Sua rotina foi salva e aplicada ao ciclo!');
});

// ===== INIT ROTINAS =====
renderRotinas();
buildScheduleGrid();

// ===== ZERAR ROTINA =====
document.getElementById('btnZerarRotina').addEventListener('click', async () => {
    if (!await showConfirm('⚠️ Tem certeza que deseja ZERAR toda a rotina?\n\nTodas as atividades serão apagadas e você começará do zero.')) return;
    currentActivities = [];
    if (editingRoutineId) {
        const idx = rotinas.findIndex(r => r.id === editingRoutineId);
        if (idx >= 0) {
            rotinas[idx].atividades = [];
        }
    }
    renderActivities();
    saveAll();
    if (typeof recalcActiveCycleHoras === 'function') {
        recalcActiveCycleHoras();
    }
    showToast('Rotina zerada! Comece do zero.');
});



// ===== INIT STUDY HISTORY CONTROLS =====
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnLimparHistorico')?.addEventListener('click', async () => {
        if (await showConfirm('⚠️ Deseja realmente apagar todo o seu histórico de combate?')) {
            historicoEstudos = [];
            saveAll();
            showToast('Histórico limpo!');
        }
    });
});

function renderHeatmap() {
    const container = document.getElementById('heatmapContainer');
    const badgeCurrent = document.getElementById('currentStreakBadge');
    const badgeLongest = document.getElementById('longestStreakBadge');
    if (!container) return;

    const TOTAL_DAYS = 84; // 12 weeks
    const now = new Date();
    now.setHours(0,0,0,0);
    
    const daysData = [];
    for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        daysData.push({
            date: d.getTime(),
            min: 0,
            dateObj: d
        });
    }

    if (typeof historicoEstudos !== 'undefined' && historicoEstudos) {
        historicoEstudos.forEach(log => {
            const logDate = new Date(log.data);
            logDate.setHours(0,0,0,0);
            const time = logDate.getTime();
            const day = daysData.find(d => d.date === time);
            if (day) {
                day.min += log.duracaoMin || 0;
            }
        });
    }

    let html = '';
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    daysData.forEach(d => {
        let level = 0;
        if (d.min > 0) {
            if (d.min < 30) level = 1;
            else if (d.min < 60) level = 2;
            else if (d.min < 120) level = 3;
            else level = 4;
            
            tempStreak++;
            if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else {
            tempStreak = 0;
        }
        
        const title = `${String(d.dateObj.getDate()).padStart(2,'0')}/${String(d.dateObj.getMonth()+1).padStart(2,'0')} - ${d.min} min`;
        html += `<div class="heatmap-cell level-${level}" title="${title}"></div>`;
    });

    let streakCount = 0;
    for (let i = daysData.length - 1; i >= 0; i--) {
        if (daysData[i].min > 0) {
            streakCount++;
        } else {
            if (i === daysData.length - 1) continue;
            else break;
        }
    }
    currentStreak = streakCount;

    container.innerHTML = html;
    if (badgeCurrent) badgeCurrent.textContent = `🔥 ${currentStreak} dia${currentStreak !== 1 ? 's' : ''}`;
    if (badgeLongest) badgeLongest.textContent = `🏆 Recorde: ${longestStreak}`;
    
    const scrollCont = document.querySelector('.heatmap-scroll-container');
    if (scrollCont) {
        scrollCont.scrollLeft = scrollCont.scrollWidth;
    }
}

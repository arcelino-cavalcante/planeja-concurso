// ===== PLANEJA CONCURSO APP - CORE (Navigation, Rotinas, Toast) =====
// DB object is now defined in firebase-config.js (Firebase + localStorage hybrid)

let rotinas = [];
let concursos = [];
let ciclos = [];
let simulados = [];
let historicoEstudos = [];
let userProfile = { nome: 'Aluno' };
let currentActivities = [];
let editingActivityIndex = -1;
let editingCellDay = -1;
let contextMenuRotina = null;

function saveAll() { 
    DB.save('rotinas', rotinas); 
    DB.save('concursos', concursos); 
    DB.save('ciclos', ciclos); 
    DB.save('historicoEstudos', historicoEstudos);
    if (typeof updateDashboard === 'function') updateDashboard(); 
}
function getActiveRotina() { return rotinas.find(r => r.status === 'ativa'); }

function formatHours(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
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
        activeRotina.atividades.forEach(act => {
            if (act.isStudy && act.days.includes(today)) {
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
    
    const formattedTodayHours = todayStudyMin > 0 ? 
        `${Math.floor(todayStudyMin/60)}h ${todayStudyMin%60 > 0 ? (todayStudyMin%60) + 'm' : ''}` : 
        '0h';
        
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
    
    // Update dashboard weekly hours stats (media)
    const mediaHoursEl = document.getElementById('dashboardMediaHoras');
    const mediaPercentEl = document.getElementById('dashboardMediaPercent');
    if (mediaHoursEl) {
        // Calculate average weekly hours based on active routine
        let totalWeekMin = 0;
        if (activeRotina && activeRotina.atividades) {
            activeRotina.atividades.forEach(act => {
                if (act.isStudy) {
                    const sh = parseInt(act.startTime.split(':')[0]), sm = parseInt(act.startTime.split(':')[1]);
                    const eh = parseInt(act.endTime.split(':')[0]), em = parseInt(act.endTime.split(':')[1]);
                    totalWeekMin += ((eh*60+em) - (sh*60+sm)) * act.days.length;
                }
            });
        }
        const dailyAvgMin = Math.round(totalWeekMin / 7);
        const avgH = Math.floor(dailyAvgMin / 60);
        const avgM = dailyAvgMin % 60;
        mediaHoursEl.textContent = `${String(avgH).padStart(2,'0')}h ${String(avgM).padStart(2,'0')}m`;
        
        if (mediaPercentEl) {
            const targetMin = 240; // 4 hours standard
            const percent = Math.min(100, Math.round((dailyAvgMin / targetMin) * 100));
            mediaPercentEl.textContent = `${percent}% meta`;
            if (percent >= 100) {
                mediaPercentEl.style.background = 'rgba(139,154,58,0.2)';
                mediaPercentEl.style.color = 'var(--accent-green-light)';
            } else {
                mediaPercentEl.style.background = 'rgba(201,184,78,0.2)';
                mediaPercentEl.style.color = 'var(--accent-yellow)';
            }
        }
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
        document.getElementById('page-' + page).classList.add('active');
        if (page === 'rotinas') { document.getElementById('rotinas-list-view').classList.remove('d-none'); document.getElementById('rotinas-calendar-view').classList.add('d-none'); }
        if (page === 'concursos') { showConcursosView('concursos-list-view'); renderConcursosList(); }
        if (page === 'ciclos') { showCiclosView('ciclos-list-view'); renderCiclosList(); }
        if (page === 'simulados') { showSimuladosView('simulados-list-view'); renderSimuladosList(); }
        if (page === 'edital') { showEditalView('edital-list-view'); }
        if (page === 'qg') { if (typeof updateQgView === 'function') updateQgView(); }
        if (page === 'bisus') { showBisusView('bisus-list-view'); }
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
        if (isAdmin) return;
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
    if (tipoEl) tipoEl.textContent = isAdmin ? 'Administrador' : 'Aluno (Google)';
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

document.getElementById('btnResetarSistema').addEventListener('click', () => {
    if (confirm('⚠️ TEM CERTEZA ABSOLUTA?\n\nIsso apagará TODOS os seus concursos, simulados, ciclos e rotinas. Essa ação não tem volta.')) {
        if (confirm('Último aviso: Deseja realmente APAGAR TUDO?')) {
            DB.clearAll();
            alert('Sistema resetado. A página será recarregada.');
            window.location.reload();
        }
    }
});

document.querySelectorAll('[id^="backToHome"]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        if (isAdmin) return;
        navItems.forEach(n => n.classList.remove('active'));
        document.querySelector('[data-page="inicio"]').classList.add('active');
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById('page-inicio').classList.add('active');
    });
});

if (menuToggle) menuToggle.addEventListener('click', () => {
    const activeSidebar = document.getElementById('sidebarAdmin').style.display !== 'none'
        ? document.getElementById('sidebarAdmin') : sidebar;
    activeSidebar.classList.toggle('open');
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
        else if (action === 'editar') { openCalendarView(contextMenuRotina.nome, contextMenuRotina.atividades); }
        else if (action === 'duplicar') { rotinas.push({ ...contextMenuRotina, id: Date.now(), nome: contextMenuRotina.nome + ' (cópia)', status: 'desativada', atividades: [...contextMenuRotina.atividades] }); showToast('Rotina duplicada!'); }
        else if (action === 'excluir') { rotinas = rotinas.filter(r => r.id !== contextMenuRotina.id); showToast('Rotina excluída!'); }
        saveAll(); renderRotinas(); contextMenu.classList.remove('active'); contextMenuRotina = null;
    });
});
document.addEventListener('click', () => contextMenu.classList.remove('active'));

document.getElementById('btnNovaRotina').addEventListener('click', () => { currentActivities = []; openCalendarView('', []); });
document.getElementById('backToRotinas').addEventListener('click', (e) => { e.preventDefault(); rotinasListView.classList.remove('d-none'); rotinasCalendarView.classList.add('d-none'); });

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
    const name = document.getElementById('routineNameInput').value || 'Nova Rotina';
    rotinas.push({ id: Date.now(), nome: name, status: 'desativada', atividades: [...currentActivities] });
    saveAll(); renderRotinas();
    rotinasListView.classList.remove('d-none'); rotinasCalendarView.classList.add('d-none');
    showToast('Rotina salva com sucesso!');
});

// ===== INIT ROTINAS =====
renderRotinas();
buildScheduleGrid();

// ===== DASHBOARD: MENSAGEM DO MENTOR & AVISOS =====
async function loadMentorMessage() {
    try {
        const snap = await firestore.collection('mensagens').orderBy('createdAt', 'desc').limit(1).get();
        const el = document.getElementById('mentorMessage');
        if (!el) return;
        if (!snap.empty) {
            const msg = snap.docs[0].data().mensagem;
            el.innerHTML = `<p style="font-style:italic;color:var(--text-secondary);margin:0;">"${msg}"</p>`;
        } else {
            el.innerHTML = '<p>Nenhuma mensagem do mentor para hoje.</p>';
        }
    } catch (e) {
        console.warn('Erro ao carregar mensagem do mentor:', e.message);
    }
}

async function loadAvisos() {
    try {
        const snap = await firestore.collection('avisos').orderBy('createdAt', 'desc').limit(3).get();
        const container = document.getElementById('avisosList');
        const card = document.getElementById('avisosCard');
        if (!container || !card) return;
        if (snap.empty) {
            card.style.display = 'none';
            return;
        }
        card.style.display = 'block';
        container.innerHTML = snap.docs.map(doc => {
            const a = doc.data();
            const date = a.createdAt ? new Date(a.createdAt).toLocaleDateString('pt-BR') : '';
            return `<div class="aviso-item" style="padding:10px 14px;background:var(--bg-secondary);border-radius:var(--radius);margin-bottom:8px;border-left:3px solid var(--accent-green-light);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <strong style="color:var(--text-primary);font-size:0.9rem;font-family:var(--font-heading);text-transform:uppercase;letter-spacing:0.5px;">${a.titulo}</strong>
                    <span style="font-size:0.7rem;color:var(--text-muted);">${date}</span>
                </div>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin:0;line-height:1.4;">${a.mensagem}</p>
            </div>`;
        }).join('');
    } catch (e) {
        console.warn('Erro ao carregar avisos:', e.message);
    }
}

// Load dashboard extras when home page becomes active
const inicioObserver = new MutationObserver(() => {
    if (document.getElementById('page-inicio')?.classList.contains('active')) {
        loadMentorMessage();
        loadAvisos();
        if (typeof updateDashboard === 'function') updateDashboard();
    }
});
const paginaInicio = document.getElementById('page-inicio');
if (paginaInicio) {
    inicioObserver.observe(paginaInicio, { attributes: true, attributeFilter: ['class'] });
}
// Initial load if already active
if (paginaInicio?.classList.contains('active')) {
    loadMentorMessage();
    loadAvisos();
    if (typeof updateDashboard === 'function') updateDashboard();
}

// ===== FEEDBACK =====
const feedbackBugCard = document.getElementById('feedbackBugCard');
const feedbackSugestaoCard = document.getElementById('feedbackSugestaoCard');
const feedbackForm = document.getElementById('feedbackForm');

feedbackBugCard?.addEventListener('click', () => openFeedbackForm('bug'));
feedbackSugestaoCard?.addEventListener('click', () => openFeedbackForm('sugestao'));

function openFeedbackForm(tipo) {
    feedbackForm.style.display = 'block';
    document.getElementById('feedbackTipo').value = tipo;
    if (tipo === 'bug') {
        document.getElementById('feedbackFormTitle').textContent = 'Reportar Erro / Bug';
        document.getElementById('feedbackFormSubtitle').textContent = 'Descreva o problema encontrado para que possamos corrigir.';
        feedbackBugCard.classList.add('active');
        feedbackSugestaoCard.classList.remove('active');
    } else {
        document.getElementById('feedbackFormTitle').textContent = 'Sugerir Melhoria';
        document.getElementById('feedbackFormSubtitle').textContent = 'Compartilhe sua ideia para tornar a plataforma melhor.';
        feedbackSugestaoCard.classList.add('active');
        feedbackBugCard.classList.remove('active');
    }
    document.getElementById('feedbackTitulo').value = '';
    document.getElementById('feedbackDescricao').value = '';
}

document.getElementById('btnCancelarFeedback')?.addEventListener('click', () => {
    feedbackForm.style.display = 'none';
    feedbackBugCard.classList.remove('active');
    feedbackSugestaoCard.classList.remove('active');
});

document.getElementById('btnEnviarFeedback')?.addEventListener('click', async () => {
    const tipo = document.getElementById('feedbackTipo').value;
    const titulo = document.getElementById('feedbackTitulo').value.trim();
    const descricao = document.getElementById('feedbackDescricao').value.trim();
    if (!titulo || !descricao) return showToast('Preencha título e descrição.');
    try {
        await firestore.collection('feedbacks').add({
            tipo,
            titulo,
            descricao,
            status: 'pendente',
            userEmail: auth.currentUser?.email || '',
            userNome: userProfile.nome || auth.currentUser?.displayName || 'Aluno',
            userUid: auth.currentUser?.uid || '',
            createdAt: new Date().toISOString()
        });
        showToast('Feedback enviado! Obrigado por contribuir.');
        feedbackForm.style.display = 'none';
        feedbackBugCard.classList.remove('active');
        feedbackSugestaoCard.classList.remove('active');
        loadMeusFeedbacks();
    } catch (e) {
        showToast('Erro ao enviar feedback.');
    }
});

async function loadMeusFeedbacks() {
    if (!auth.currentUser) return;
    try {
        const snap = await firestore.collection('feedbacks')
            .where('userUid', '==', auth.currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get({ source: 'server' });
        const container = document.getElementById('meusFeedbacksList');
        if (!container) return;
        if (snap.empty) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Nenhum feedback enviado ainda.</div>';
            return;
        }
        container.innerHTML = snap.docs.map(doc => {
            const f = doc.data();
            const tipoClass = f.tipo === 'bug' ? 'bug' : 'sugestao';
            const statusClass = f.status === 'resolvido' ? 'resolvido' : 'pendente';
            const statusText = f.status === 'resolvido' ? 'Resolvido' : 'Pendente';
            return `
                <div class="feedback-item">
                    <div class="feedback-item-header">
                        <div class="feedback-item-title">
                            <span class="feedback-tipo-icon ${tipoClass}">
                                <i class="bi ${f.tipo === 'bug' ? 'bi-bug-fill' : 'bi-lightbulb-fill'}"></i>
                            </span>
                            <strong>${f.titulo}</strong>
                        </div>
                        <span class="feedback-status ${statusClass}">${statusText}</span>
                    </div>
                    <p class="feedback-item-desc">${f.descricao}</p>
                    <span class="feedback-item-date">${new Date(f.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.warn('Erro ao carregar feedbacks:', e.message);
    }
}

// Carrega feedbacks quando abre a página
const feedbackObserver = new MutationObserver(() => {
    if (document.getElementById('page-feedback')?.classList.contains('active')) {
        loadMeusFeedbacks();
    }
});
const paginaFeedback = document.getElementById('page-feedback');
if (paginaFeedback) {
    feedbackObserver.observe(paginaFeedback, { attributes: true, attributeFilter: ['class'] });
}
if (paginaFeedback?.classList.contains('active')) {
    loadMeusFeedbacks();
}

// ===== INIT STUDY HISTORY CONTROLS =====
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnLimparHistorico')?.addEventListener('click', () => {
        if (confirm('⚠️ Deseja realmente apagar todo o seu histórico de combate?')) {
            historicoEstudos = [];
            saveAll();
            showToast('Histórico limpo!');
        }
    });
});

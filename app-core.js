// ===== PLANEJA CONCURSO APP - CORE (Navigation, Rotinas, Toast) =====
// DB object is now defined in firebase-config.js (Firebase + localStorage hybrid)

let rotinas = [];
let concursos = [];
let ciclos = [];
let simulados = [];
let userProfile = { nome: 'Aluno' };
let currentActivities = [];
let editingActivityIndex = -1;
let editingCellDay = -1;
let contextMenuRotina = null;

function saveAll() { DB.save('rotinas', rotinas); DB.save('concursos', concursos); DB.save('ciclos', ciclos); }
function getActiveRotina() { return rotinas.find(r => r.status === 'ativa'); }
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
    return Math.round(totalMin / 60);
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
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        // Skip student navigation if admin is logged in
        if (isAdmin) return;
        const page = item.dataset.page;
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + page).classList.add('active');
        if (page === 'rotinas') { document.getElementById('rotinas-list-view').classList.remove('d-none'); document.getElementById('rotinas-calendar-view').classList.add('d-none'); }
        if (page === 'concursos') { showConcursosView('concursos-list-view'); renderConcursosList(); }
        if (page === 'ciclos') { showCiclosView('ciclos-list-view'); renderCiclosList(); }
        if (page === 'simulados') { showSimuladosView('simulados-list-view'); renderSimuladosList(); }
        if (page === 'edital') { showEditalView('edital-list-view'); }
        if (page === 'bisus') { showBisusView('bisus-list-view'); }
        if (page === 'configuracoes') { refreshConfigPage(); }
        closeSidebar();
    });
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
    document.getElementById('configNomeInput').value = userProfile.nome;
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
    if (novoNome) {
        userProfile.nome = novoNome;
        DB.save('userProfile', userProfile);
        updateUserProfileDisplay();
        showToast('Nome atualizado!');
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

if (menuToggle) menuToggle.addEventListener('click', () => { sidebar.classList.toggle('open'); sidebarOverlay.classList.toggle('active'); });
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
        const snap = await firestore.collection('mensagens').orderBy('createdAt', 'desc').limit(1).get({ source: 'server' });
        const el = document.getElementById('mentorMessage');
        if (!el) return;
        if (!snap.empty) {
            const msg = snap.docs[0].data().mensagem;
            el.innerHTML = `<p>"${msg}"</p>`;
        } else {
            el.innerHTML = '<p>Nenhuma mensagem do mentor para hoje.</p>';
        }
    } catch (e) {
        console.warn('Erro ao carregar mensagem do mentor:', e.message);
    }
}

async function loadAvisos() {
    try {
        const snap = await firestore.collection('avisos').orderBy('createdAt', 'desc').limit(3).get({ source: 'server' });
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
            return `<div class="aviso-item" style="padding:8px 0;border-bottom:1px solid var(--border-color);">
                <strong style="color:var(--text-primary);font-size:0.9rem;">${a.titulo}</strong>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin:2px 0 0;">${a.mensagem}</p>
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

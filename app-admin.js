// ===== PLANEJA CONCURSO APP - ADMIN MODULE =====
// Handles: Dashboard stats, User management, Bisus publishing (admin side)

let allUsers = [];
let adminBisusList = [];

// ===== ADMIN NAVIGATION =====
function initAdminNav() {
    const adminNavItems = document.querySelectorAll('.nav-item-admin');

    adminNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.adminPage;

            // Update active state
            adminNavItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Also remove active from student pages
            document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));

            // Show admin page
            const targetPage = document.getElementById('page-' + page);
            if (targetPage) targetPage.classList.add('active');

            // Refresh data on page switch
            if (page === 'admin-dashboard') loadAdminDashboard();
            if (page === 'admin-usuarios') loadAllUsers();
            if (page === 'admin-bisus') loadAdminBisus();
            if (page === 'admin-mensagens') loadAdminMensagens();
            if (page === 'admin-concursos') loadAdminConcursosOficiais();
            if (page === 'admin-feedback') loadAdminFeedbacks();
        });
    });

    // Admin logout
    document.querySelector('.admin-logout')?.addEventListener('click', () => {
        auth.signOut().then(() => window.location.reload());
    });
}

// ===== SETUP ADMIN UI =====
function setupAdminUI() {
    console.log('🛡️ Admin panel activated');
    
    // Hide student sidebar, show admin sidebar
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('sidebarAdmin').style.display = 'flex';

    // Hide all student pages
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));

    // Show admin dashboard
    document.getElementById('page-admin-dashboard').classList.add('active');

    // Init navigation
    initAdminNav();

    // Load dashboard data
    loadAdminDashboard();
}

// ===== DASHBOARD =====
async function loadAdminDashboard() {
    try {
        // Fetch users count - force server to bypass offline cache
        const usersSnap = await firestore.collection('users').get({ source: 'server' });
        let totalUsers = 0;
        let activeUsers = 0;
        let inactiveUsers = 0;
        const recentUsers = [];

        usersSnap.forEach(doc => {
            const profile = doc.data().profile || doc.data();
            // Skip the admin user from counts (case-insensitive)
            const profileEmail = (profile.email || '').toLowerCase().trim();
            if (profileEmail === ADMIN_EMAIL_LOWER) return;

            totalUsers++;
            if (profile.active === false) {
                inactiveUsers++;
            } else {
                activeUsers++;
            }

            recentUsers.push({
                uid: doc.id,
                nome: profile.nome || profile.displayName || 'Sem nome',
                email: profile.email || '—',
                photoURL: profile.photoURL || null,
                lastLogin: profile.lastLogin || profile.createdAt || null
            });
        });

        // Sort recent users by last login (most recent first)
        recentUsers.sort((a, b) => {
            if (!a.lastLogin) return 1;
            if (!b.lastLogin) return -1;
            return new Date(b.lastLogin) - new Date(a.lastLogin);
        });

        // Fetch bisus count
        const bisusSnap = await firestore.collection('bisus').get();
        const totalBisus = bisusSnap.size;

        // Update stat cards with animation
        animateStatValue('statTotalUsers', totalUsers);
        animateStatValue('statActiveUsers', activeUsers);
        animateStatValue('statInactiveUsers', inactiveUsers);
        animateStatValue('statTotalBisus', totalBisus);

        // Render recent users
        renderRecentUsers(recentUsers.slice(0, 5));
    } catch (e) {
        console.warn('Erro ao carregar dashboard admin:', e);
    }
}

function animateStatValue(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (!el) return;
    let current = 0;
    const step = Math.max(1, Math.ceil(targetValue / 20));
    const interval = setInterval(() => {
        current += step;
        if (current >= targetValue) {
            current = targetValue;
            clearInterval(interval);
        }
        el.textContent = current;
    }, 40);
}

function renderRecentUsers(users) {
    const container = document.getElementById('recentUsersContainer');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">Nenhum usuário cadastrado ainda.</div>';
        return;
    }

    container.innerHTML = users.map(u => {
        const avatarContent = u.photoURL
            ? `<img src="${u.photoURL}" alt="${u.nome}">`
            : `<i class="bi bi-person-fill"></i>`;
        const dateStr = u.lastLogin
            ? new Date(u.lastLogin).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';
        return `
            <div class="recent-user-item">
                <div class="recent-user-avatar">${avatarContent}</div>
                <div class="recent-user-info">
                    <strong>${u.nome}</strong>
                    <span>${u.email}</span>
                </div>
                <span class="recent-user-date">${dateStr}</span>
            </div>
        `;
    }).join('');
}

// ===== USER MANAGEMENT =====
async function loadAllUsers() {
    try {
        const snapshot = await firestore.collection('users').get({ source: 'server' });
        allUsers = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const profile = data.profile || data;
            const profileEmail = (profile.email || '').toLowerCase().trim();
            if (profileEmail === ADMIN_EMAIL_LOWER) return;

            allUsers.push({
                uid: doc.id,
                nome: profile.nome || profile.displayName || 'Sem nome',
                email: profile.email || '—',
                photoURL: profile.photoURL || null,
                lastLogin: profile.lastLogin || profile.createdAt || null,
                active: profile.active !== false
            });
        });

        // Sort alphabetically
        allUsers.sort((a, b) => a.nome.localeCompare(b.nome));
        
        renderUsersTable(allUsers);
    } catch (e) {
        console.warn('Erro ao carregar usuários:', e);
        document.getElementById('adminUsersBody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--accent-red);">Erro ao carregar dados.</td></tr>';
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('adminUsersBody');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);"><i class="bi bi-people" style="font-size:2rem;display:block;margin-bottom:12px;"></i>Nenhum usuário encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => {
        const avatarContent = u.photoURL
            ? `<img src="${u.photoURL}" alt="${u.nome}">`
            : `<i class="bi bi-person-fill"></i>`;
        const dateStr = u.lastLogin
            ? new Date(u.lastLogin).toLocaleDateString('pt-BR')
            : '—';
        const statusClass = u.active ? 'ativo' : 'desativado';
        const statusText = u.active ? 'Ativo' : 'Desativado';

        return `
            <tr>
                <td>
                    <div class="admin-user-cell">
                        <div class="admin-user-avatar">${avatarContent}</div>
                        <span class="admin-user-name">${u.nome}</span>
                    </div>
                </td>
                <td style="color:var(--text-secondary);font-size:0.9rem;">${u.email}</td>
                <td style="color:var(--text-muted);font-size:0.85rem;">${dateStr}</td>
                <td><span class="admin-status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <label class="admin-toggle" title="${u.active ? 'Desativar acesso' : 'Ativar acesso'}">
                        <input type="checkbox" ${u.active ? 'checked' : ''} data-uid="${u.uid}" class="user-toggle-input">
                        <span class="admin-toggle-slider"></span>
                    </label>
                </td>
            </tr>
        `;
    }).join('');

    // Bind toggle events
    tbody.querySelectorAll('.user-toggle-input').forEach(toggle => {
        toggle.addEventListener('change', async function () {
            const uid = this.dataset.uid;
            const newActive = this.checked;
            await toggleUserAccess(uid, newActive);
        });
    });
}

async function toggleUserAccess(uid, active) {
    try {
        // Update the user's profile in Firestore
        const userRef = firestore.collection('users').doc(uid);
        const doc = await userRef.get();

        if (doc.exists) {
            const data = doc.data();
            const profile = data.profile || {};
            profile.active = active;
            await userRef.set({ ...data, profile }, { merge: true });
        } else {
            await userRef.set({ profile: { active } }, { merge: true });
        }

        // Update local data
        const user = allUsers.find(u => u.uid === uid);
        if (user) user.active = active;

        showToast(active ? 'Acesso ativado com sucesso!' : 'Acesso desativado!');

        // Re-render table to update badge
        renderUsersTable(allUsers);
    } catch (e) {
        console.error('Erro ao alterar acesso:', e);
        showToast('Erro ao alterar acesso do usuário.');
        loadAllUsers(); // reload to reset state
    }
}

// Search filter
document.getElementById('adminSearchUsers')?.addEventListener('input', function () {
    const query = this.value.toLowerCase().trim();
    if (!query) {
        renderUsersTable(allUsers);
        return;
    }
    const filtered = allUsers.filter(u =>
        u.nome.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );
    renderUsersTable(filtered);
});

// Refresh button
document.getElementById('btnRefreshUsers')?.addEventListener('click', () => {
    loadAllUsers();
    showToast('Lista de usuários atualizada!');
});

// ===== ADMIN BISUS MANAGEMENT =====
async function loadAdminBisus() {
    try {
        const snapshot = await firestore.collection('bisus').orderBy('createdAt', 'desc').get();
        adminBisusList = [];
        snapshot.forEach(doc => {
            adminBisusList.push({ id: doc.id, ...doc.data() });
        });
        renderAdminBisusGrid();
    } catch (e) {
        console.warn('Erro ao carregar bisus admin:', e);
    }
}

function renderAdminBisusGrid() {
    const container = document.getElementById('adminBisusGrid');
    if (!container) return;

    if (adminBisusList.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;"><i class="bi bi-journal-x" style="font-size:2.5rem;display:block;margin-bottom:12px;"></i>Nenhuma publicação ainda. Clique em "Nova Publicação" para começar.</div>';
        return;
    }

    container.innerHTML = adminBisusList.map(b => {
        const imgUrl = b.imagem || 'https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?auto=format&fit=crop&w=500&q=80';
        const dataFmt = new Date(b.createdAt).toLocaleDateString('pt-BR');
        const snippet = (b.resumo || (b.conteudo || '').replace(/<[^>]*>?/gm, '').substring(0, 80)) + '...';

        return `
            <div class="admin-bisu-card">
                <img src="${imgUrl}" alt="${b.titulo}">
                <div class="admin-bisu-card-body">
                    <span class="meta-label" style="color:var(--accent-green-light);font-size:0.75rem;">${b.categoria || 'Geral'}</span>
                    <h4>${b.titulo}</h4>
                    <p>${snippet}</p>
                </div>
                <div class="admin-bisu-card-footer">
                    <span><i class="bi bi-calendar3"></i> ${dataFmt}</span>
                    <button class="admin-bisu-delete" data-id="${b.id}"><i class="bi bi-trash3"></i> Excluir</button>
                </div>
            </div>
        `;
    }).join('');

    // Bind delete buttons
    container.querySelectorAll('.admin-bisu-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const bisuId = btn.dataset.id;
            if (confirm('Tem certeza que deseja excluir esta publicação?')) {
                try {
                    await firestore.collection('bisus').doc(bisuId).delete();
                    showToast('Publicação excluída!');
                    loadAdminBisus();
                } catch (e) {
                    showToast('Erro ao excluir: ' + e.message);
                }
            }
        });
    });
}

// Admin Bisus Form Navigation (clear form for new article)
document.getElementById('btnAdminNovoBisu')?.addEventListener('click', () => {
    document.getElementById('adminBisuTitulo').value = '';
    document.getElementById('adminBisuCategoria').value = '';
    document.getElementById('adminBisuImagem').value = '';
    document.getElementById('adminBisuResumo').value = '';
    if (typeof setEditorContent === 'function') setEditorContent('adminBisuEditor', '');
    document.getElementById('admin-bisus-list-view').classList.add('d-none');
    document.getElementById('admin-bisus-form-view').classList.remove('d-none');
});

document.getElementById('backToAdminBisusList')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('admin-bisus-form-view').classList.add('d-none');
    document.getElementById('admin-bisus-list-view').classList.remove('d-none');
});

document.getElementById('btnAdminCancelarBisu')?.addEventListener('click', () => {
    document.getElementById('admin-bisus-form-view').classList.add('d-none');
    document.getElementById('admin-bisus-list-view').classList.remove('d-none');
});

// ===== CHECK USER ACCESS (called from firebase-config.js) =====
async function checkUserAccess(uid) {
    try {
        const doc = await firestore.collection('users').doc(uid).get({ source: 'server' });
        if (doc.exists) {
            const data = doc.data();
            const profile = data.profile || data;
            if (profile.active === false) {
                return false; // blocked
            }
        }
        return true; // active or not found (new user = active by default)
    } catch (e) {
        console.warn('Erro ao verificar acesso:', e);
        return true; // on error, allow access
    }
}

// ===== SAVE USER PROFILE ON LOGIN =====
async function saveUserProfile(user) {
    if (!user) return;
    const userEmail = (user.email || '').toLowerCase().trim();
    if (userEmail === ADMIN_EMAIL_LOWER) return;
    try {
        const userRef = firestore.collection('users').doc(user.uid);
        const doc = await userRef.get();
        const existing = doc.exists ? (doc.data().profile || {}) : {};

        const profile = {
            ...existing,
            nome: existing.nome || user.displayName || 'Aluno',
            email: user.email || '',
            photoURL: user.photoURL || '',
            lastLogin: new Date().toISOString(),
            createdAt: existing.createdAt || new Date().toISOString()
        };

        // Preserve active status if it exists
        if (existing.active !== undefined) {
            profile.active = existing.active;
        }

        await userRef.set({ profile }, { merge: true });
    } catch (e) {
        console.error('Erro ao salvar perfil do usuário:', e.message);
    }
}

// ===== MENSAGENS & AVISOS (Admin) =====
let adminAvisosList = [];

function loadAdminMensagens() {
    loadMensagemDiaAdmin();
    loadAvisosAdmin();
}

async function loadMensagemDiaAdmin() {
    try {
        const snap = await firestore.collection('mensagens').orderBy('createdAt', 'desc').limit(1).get({ source: 'server' });
        if (!snap.empty) {
            const doc = snap.docs[0];
            document.getElementById('adminMensagemDia').value = doc.data().mensagem || '';
            document.getElementById('mensagemDiaStatus').textContent = 'Publicada em ' + new Date(doc.data().createdAt).toLocaleDateString('pt-BR');
        } else {
            document.getElementById('adminMensagemDia').value = '';
            document.getElementById('mensagemDiaStatus').textContent = 'Nenhuma mensagem ativa';
        }
    } catch (e) {
        console.warn('Erro ao carregar mensagem:', e);
    }
    loadMensagensHistorico();
}

async function loadMensagensHistorico() {
    try {
        const snap = await firestore.collection('mensagens').orderBy('createdAt', 'desc').limit(10).get({ source: 'server' });
        const container = document.getElementById('adminMensagensHistorico');
        if (!container) return;
        if (snap.empty) {
            container.innerHTML = '<div style="text-align:center;padding:15px;color:var(--text-muted);font-size:0.85rem;">Nenhuma mensagem enviada.</div>';
            return;
        }
        container.innerHTML = snap.docs.map(doc => {
            const m = doc.data();
            const texto = m.mensagem.length > 80 ? m.mensagem.substring(0, 80) + '...' : m.mensagem;
            return `
                <div style="padding:8px 0;border-bottom:1px solid var(--border-color);font-size:0.82rem;">
                    <p style="color:var(--text-primary);margin:0 0 2px;">${texto}</p>
                    <span style="color:var(--text-muted);font-size:0.72rem;">${new Date(m.createdAt).toLocaleString('pt-BR')}</span>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.warn('Erro ao carregar histórico:', e);
    }
}

document.getElementById('btnSalvarMensagemDia')?.addEventListener('click', async () => {
    const mensagem = document.getElementById('adminMensagemDia').value.trim();
    if (!mensagem) return showToast('Escreva uma mensagem!');
    try {
        await firestore.collection('mensagens').add({ mensagem, createdAt: new Date().toISOString() });
        showToast('Mensagem publicada!');
        document.getElementById('mensagemDiaStatus').textContent = 'Publicada agora';
        loadMensagensHistorico();
    } catch (e) {
        showToast('Erro ao publicar.');
    }
});

async function loadAvisosAdmin() {
    try {
        const snap = await firestore.collection('avisos').orderBy('createdAt', 'desc').get({ source: 'server' });
        adminAvisosList = [];
        snap.forEach(doc => adminAvisosList.push({ id: doc.id, ...doc.data() }));
        renderAdminAvisos();
    } catch (e) {
        console.warn('Erro ao carregar avisos:', e);
    }
}

function renderAdminAvisos() {
    const container = document.getElementById('adminAvisosList');
    if (!container) return;
    if (adminAvisosList.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Nenhum aviso cadastrado.</div>';
        return;
    }
    container.innerHTML = adminAvisosList.map(a => `
        <div class="aviso-admin-item" style="padding:12px;border:1px solid var(--border-color);border-radius:var(--radius);margin-bottom:8px;background:var(--bg-secondary);">
            <div style="display:flex;justify-content:space-between;align-items:start;">
                <div style="flex:1;">
                    <strong style="display:block;color:var(--text-primary);margin-bottom:4px;">${a.titulo}</strong>
                    <p style="color:var(--text-secondary);font-size:0.85rem;margin:0;">${a.mensagem}</p>
                    <span style="font-size:0.75rem;color:var(--text-muted);">${new Date(a.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <button class="btn-actions btn-del-aviso-admin" data-id="${a.id}" style="padding:4px 8px;border:none;background:rgba(201,64,64,0.1);color:var(--accent-red);border-radius:6px;cursor:pointer;font-size:0.8rem;"><i class="bi bi-trash3"></i></button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-del-aviso-admin').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Excluir este aviso?')) return;
            try {
                await firestore.collection('avisos').doc(btn.dataset.id).delete();
                showToast('Aviso removido!');
                loadAvisosAdmin();
            } catch (e) { showToast('Erro ao remover.'); }
        });
    });
}

// Toggle form novo aviso
document.getElementById('btnNovoAvisoAdmin')?.addEventListener('click', () => {
    const form = document.getElementById('formNovoAviso');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    document.getElementById('adminAvisoTitulo').value = '';
    document.getElementById('adminAvisoMensagem').value = '';
});

document.getElementById('btnCancelarAviso')?.addEventListener('click', () => {
    document.getElementById('formNovoAviso').style.display = 'none';
});

document.getElementById('btnSalvarAviso')?.addEventListener('click', async () => {
    const titulo = document.getElementById('adminAvisoTitulo').value.trim();
    const mensagem = document.getElementById('adminAvisoMensagem').value.trim();
    if (!titulo || !mensagem) return showToast('Preencha título e mensagem.');
    try {
        await firestore.collection('avisos').add({ titulo, mensagem, createdAt: new Date().toISOString() });
        showToast('Aviso publicado!');
        document.getElementById('formNovoAviso').style.display = 'none';
        loadAvisosAdmin();
    } catch (e) { showToast('Erro ao publicar.'); }
});

// ===== CONCURSOS OFICIAIS (Admin) =====
let adminConcursosOficiais = [];
let adminConcursoOficialEditId = null;

async function loadAdminConcursosOficiais() {
    try {
        const snap = await firestore.collection('concursos_oficiais').orderBy('createdAt', 'desc').get({ source: 'server' });
        adminConcursosOficiais = [];
        snap.forEach(doc => adminConcursosOficiais.push({ id: doc.id, ...doc.data() }));
        renderAdminConcursosOficiais();
    } catch (e) {
        console.warn('Erro ao carregar concursos oficiais:', e);
    }
}

function renderAdminConcursosOficiais() {
    const container = document.getElementById('adminConcursosOficiaisList');
    if (!container) return;
    if (adminConcursosOficiais.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;">Nenhum concurso oficial cadastrado.</div>';
        return;
    }
    container.innerHTML = adminConcursosOficiais.map(c => {
        const discCount = c.disciplinas ? c.disciplinas.length : 0;
        const totalQuestoes = c.disciplinas ? c.disciplinas.reduce((s, d) => s + (d.peso || 0), 0) : 0;
        return `
            <div class="card-mentor" style="padding:20px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                    <div style="width:48px;height:48px;border-radius:12px;background:rgba(201,184,78,0.15);display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:var(--accent-yellow);"><i class="bi bi-trophy-fill"></i></div>
                    <div style="flex:1;">
                        <h4 style="margin:0;font-size:1.1rem;">${c.nome}</h4>
                        <span style="font-size:0.8rem;color:var(--text-muted);">${discCount} disciplinas · ${totalQuestoes} questões</span>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-actions btn-edit-concurso-oficial" data-id="${c.id}" style="flex:1;padding:6px 12px;font-size:0.85rem;"><i class="bi bi-pencil"></i> Editar</button>
                    <button class="btn-actions btn-del-concurso-oficial" data-id="${c.id}" style="padding:6px 12px;font-size:0.85rem;background:rgba(201,64,64,0.1);color:var(--accent-red);border:1px solid rgba(201,64,64,0.3);"><i class="bi bi-trash3"></i></button>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.btn-edit-concurso-oficial').forEach(btn => {
        btn.addEventListener('click', () => openAdminConcursoEditor(btn.dataset.id));
    });
    container.querySelectorAll('.btn-del-concurso-oficial').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Excluir este concurso oficial?')) return;
            await firestore.collection('concursos_oficiais').doc(btn.dataset.id).delete();
            showToast('Concurso removido!');
            loadAdminConcursosOficiais();
        });
    });
}

// Open full-page editor (same style as student's concurso editor)
document.getElementById('btnNovoConcursoOficial')?.addEventListener('click', () => openAdminConcursoEditor());

function openAdminConcursoEditor(editId = null) {
    adminConcursoOficialEditId = editId;
    document.getElementById('admin-concursos-list-view').classList.add('d-none');
    document.getElementById('admin-concursos-edit-view').classList.remove('d-none');

    if (editId) {
        const c = adminConcursosOficiais.find(x => x.id === editId);
        if (!c) return;
        document.getElementById('adminConcursoEditTitle').textContent = 'Editar Concurso Oficial';
        document.getElementById('adminConcursoNome').value = c.nome || '';
        renderAdminDisciplinasEditor(c.disciplinas || []);
    } else {
        document.getElementById('adminConcursoEditTitle').textContent = 'Novo Concurso Oficial';
        document.getElementById('adminConcursoNome').value = '';
        renderAdminDisciplinasEditor([]);
    }
    updateAdminTotalQuestoes();
}

// Back to list
document.getElementById('backToAdminConcursosList')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('admin-concursos-edit-view').classList.add('d-none');
    document.getElementById('admin-concursos-list-view').classList.remove('d-none');
    loadAdminConcursosOficiais();
});

function renderAdminDisciplinasEditor(disciplinas) {
    const tbody = document.getElementById('adminConcursoDisciplinasBody');
    tbody.innerHTML = disciplinas.map(d => `
        <tr>
            <td><input type="text" class="input-mentor disc-nome-oficial" value="${d.nome || ''}" placeholder="Nome da disciplina" style="width:100%;padding:6px 10px;font-size:0.9rem;"></td>
            <td><input type="number" class="input-mentor disc-peso-oficial" value="${d.peso || 1}" min="1" style="width:80px;padding:6px 10px;font-size:0.9rem;text-align:center;"></td>
            <td><button class="btn-actions btn-rm-disc-oficial" style="padding:4px 8px;color:var(--accent-red);border:none;background:rgba(201,64,64,0.1);"><i class="bi bi-trash3"></i></button></td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.btn-rm-disc-oficial').forEach(btn => {
        btn.addEventListener('click', () => { btn.closest('tr').remove(); updateAdminTotalQuestoes(); });
    });
    tbody.querySelectorAll('.disc-nome-oficial, .disc-peso-oficial').forEach(input => {
        input.addEventListener('input', updateAdminTotalQuestoes);
    });
}

function updateAdminTotalQuestoes() {
    let total = 0;
    document.querySelectorAll('#adminConcursoDisciplinasBody tr').forEach(row => {
        total += parseInt(row.querySelector('.disc-peso-oficial')?.value) || 0;
    });
    const el = document.getElementById('adminConcursoTotalQuestoes');
    if (el) el.textContent = total;
}

document.getElementById('btnAddDisciplinaOficial')?.addEventListener('click', () => {
    const tbody = document.getElementById('adminConcursoDisciplinasBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="input-mentor disc-nome-oficial" placeholder="Nome da disciplina" style="width:100%;padding:6px 10px;font-size:0.9rem;"></td>
        <td><input type="number" class="input-mentor disc-peso-oficial" value="1" min="1" style="width:80px;padding:6px 10px;font-size:0.9rem;text-align:center;"></td>
        <td><button class="btn-actions btn-rm-disc-oficial" style="padding:4px 8px;color:var(--accent-red);border:none;background:rgba(201,64,64,0.1);"><i class="bi bi-trash3"></i></button></td>
    `;
    row.querySelector('.btn-rm-disc-oficial').addEventListener('click', () => { row.remove(); updateAdminTotalQuestoes(); });
    row.querySelectorAll('.disc-nome-oficial, .disc-peso-oficial').forEach(input => {
        input.addEventListener('input', updateAdminTotalQuestoes);
    });
    tbody.appendChild(row);
    updateAdminTotalQuestoes();
});

document.getElementById('btnSalvarConcursoOficial')?.addEventListener('click', async () => {
    const nome = document.getElementById('adminConcursoNome').value.trim();
    if (!nome) return showToast('Informe o nome do concurso.');

    const disciplinas = [];
    document.querySelectorAll('#adminConcursoDisciplinasBody tr').forEach(row => {
        const nomeD = row.querySelector('.disc-nome-oficial')?.value.trim();
        const peso = parseInt(row.querySelector('.disc-peso-oficial')?.value) || 1;
        if (nomeD) disciplinas.push({ nome: nomeD, peso });
    });
    if (disciplinas.length === 0) return showToast('Adicione pelo menos uma disciplina.');

    try {
        const data = { nome, disciplinas, updatedAt: new Date().toISOString() };
        if (adminConcursoOficialEditId) {
            await firestore.collection('concursos_oficiais').doc(adminConcursoOficialEditId).update(data);
        } else {
            data.createdAt = new Date().toISOString();
            await firestore.collection('concursos_oficiais').add(data);
        }
        showToast('Concurso salvo!');
        document.getElementById('admin-concursos-edit-view').classList.add('d-none');
        document.getElementById('admin-concursos-list-view').classList.remove('d-none');
        loadAdminConcursosOficiais();
    } catch (e) {
        showToast('Erro ao salvar.');
    }
});

// ===== ADMIN FEEDBACK =====
let adminFeedbacks = [];
let adminFeedbackFilter = 'todos';

async function loadAdminFeedbacks() {
    try {
        const snap = await firestore.collection('feedbacks').orderBy('createdAt', 'desc').get({ source: 'server' });
        adminFeedbacks = [];
        snap.forEach(doc => adminFeedbacks.push({ id: doc.id, ...doc.data() }));
        renderAdminFeedbacks();
    } catch (e) {
        console.warn('Erro ao carregar feedbacks:', e);
    }
}

function renderAdminFeedbacks() {
    const container = document.getElementById('adminFeedbacksList');
    if (!container) return;

    let filtered = adminFeedbacks;
    if (adminFeedbackFilter === 'bug') filtered = adminFeedbacks.filter(f => f.tipo === 'bug');
    if (adminFeedbackFilter === 'sugestao') filtered = adminFeedbacks.filter(f => f.tipo === 'sugestao');
    if (adminFeedbackFilter === 'pendente') filtered = adminFeedbacks.filter(f => f.status === 'pendente');
    if (adminFeedbackFilter === 'resolvido') filtered = adminFeedbacks.filter(f => f.status === 'resolvido');

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="bi bi-inbox" style="font-size:2.5rem;display:block;margin-bottom:12px;"></i>Nenhum feedback encontrado.</div>';
        return;
    }

    container.innerHTML = filtered.map(f => {
        const tipoBadge = f.tipo === 'bug'
            ? '<span class="feedback-tipo-badge bug"><i class="bi bi-bug-fill"></i> Bug</span>'
            : '<span class="feedback-tipo-badge sugestao"><i class="bi bi-lightbulb-fill"></i> Sugestão</span>';
        const statusBadge = f.status === 'resolvido'
            ? '<span class="feedback-status-badge resolvido"><i class="bi bi-check-circle"></i> Resolvido</span>'
            : '<span class="feedback-status-badge pendente"><i class="bi bi-hourglass-split"></i> Pendente</span>';
        const actionBtn = f.status === 'pendente'
            ? `<button class="btn-executar btn-resolver-feedback" data-id="${f.id}" style="padding:6px 14px;font-size:0.8rem;"><i class="bi bi-check-lg"></i> Marcar Resolvido</button>`
            : `<button class="btn-actions btn-reabrir-feedback" data-id="${f.id}" style="padding:6px 14px;font-size:0.8rem;"><i class="bi bi-arrow-repeat"></i> Reabrir</button>`;

        return `
            <div class="card-mentor feedback-admin-card" style="padding:20px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        ${tipoBadge}
                        <h4 style="margin:0;font-size:1.05rem;">${f.titulo}</h4>
                        ${statusBadge}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:0.75rem;color:var(--text-muted);">${new Date(f.createdAt).toLocaleDateString('pt-BR')}</span>
                        ${actionBtn}
                    </div>
                </div>
                <p style="color:var(--text-secondary);font-size:0.9rem;margin:0 0 10px;line-height:1.5;">${f.descricao}</p>
                <div style="display:flex;align-items:center;gap:8px;padding-top:10px;border-top:1px solid var(--border-color);">
                    <div class="feedback-user-avatar" style="width:28px;height:28px;border-radius:50%;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;font-size:0.75rem;"><i class="bi bi-person-fill"></i></div>
                    <span style="font-size:0.8rem;color:var(--text-muted);">${f.userNome || 'Aluno'}</span>
                    <span style="font-size:0.75rem;color:var(--text-muted);">· ${f.userEmail}</span>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.btn-resolver-feedback').forEach(btn => {
        btn.addEventListener('click', async () => {
            await firestore.collection('feedbacks').doc(btn.dataset.id).update({ status: 'resolvido' });
            showToast('Feedback marcado como resolvido!');
            loadAdminFeedbacks();
        });
    });
    container.querySelectorAll('.btn-reabrir-feedback').forEach(btn => {
        btn.addEventListener('click', async () => {
            await firestore.collection('feedbacks').doc(btn.dataset.id).update({ status: 'pendente' });
            showToast('Feedback reaberto!');
            loadAdminFeedbacks();
        });
    });
}

document.querySelectorAll('.btn-filter-feedback').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-filter-feedback').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        adminFeedbackFilter = btn.dataset.filter;
        renderAdminFeedbacks();
    });
});

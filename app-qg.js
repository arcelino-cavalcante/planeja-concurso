// ===== PLANEJA CONCURSO - QG DO COMBATENTE & PATENTES =====

const PATENTES = [
    { nome: "Recruta",          horas: 0,    estrelas: 1,  desc: "Apenas começando a jornada de combate nos concursos." },
    { nome: "Cabo",             horas: 10,   estrelas: 2,  desc: "Primeira promoção. Liderança básica de foco nos estudos." },
    { nome: "Sargento",         horas: 30,   estrelas: 3,  desc: "Especialista em táticas de estudo focado e persistente." },
    { nome: "Subtenente",       horas: 60,   estrelas: 4,  desc: "Coordenador de disciplina, planejamento e foco diário." },
    { nome: "Tenente",          horas: 100,  estrelas: 5,  desc: "Oficial subalterno com alta dedicação e horas acumuladas." },
    { nome: "Capitão",          horas: 180,  estrelas: 6,  desc: "Comandante estrategista de rotinas pesadas de estudo." },
    { nome: "Major",            horas: 300,  estrelas: 7,  desc: "Oficial superior reconhecido por sua inabalável resiliência." },
    { nome: "Tenente-Coronel",  horas: 500,  estrelas: 8,  desc: "Mestre em planejamento avançado de edital e foco extremo." },
    { nome: "Coronel",          horas: 800,  estrelas: 9,  desc: "Elite absoluta dos estudantes da divisão de concursos." },
    { nome: "General de Divisão",horas: 1200, estrelas: 10, desc: "Lenda definitiva dos concursos públicos com foco inabalável." }
];

function getPatentByHours(hours) {
    let patent = PATENTES[0];
    for (let i = PATENTES.length - 1; i >= 0; i--) {
        if (hours >= PATENTES[i].horas) { patent = PATENTES[i]; break; }
    }
    return patent;
}

/**
 * Renders a styled rank-name badge (no icon, just the name).
 * @param {object}  p         – patent object (.nome)
 * @param {number}  size      – approximate badge height in px (controls font scale)
 * @param {boolean} greyed    – locked rank → muted colours
 * @param {boolean} showLabel – ignored (name IS the badge)
 */
function renderPatentBadge(p, size = 56, greyed = false) {
    const color   = greyed ? 'var(--text-muted)' : 'var(--text-primary)';
    const border  = greyed ? 'var(--border-color)' : 'var(--accent-green-light)';
    const bg      = greyed ? 'transparent' : 'rgba(107,122,42,0.12)';

    const fs   = Math.max(9, Math.round(size * 0.22));
    const pad  = Math.max(4, Math.round(size * 0.1));

    return `<div style="
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: ${bg};
        border: 1.5px solid ${border};
        border-radius: 4px;
        padding: ${pad}px ${pad * 2}px;
        color: ${color};
        font-family: 'Inter', 'Segoe UI', sans-serif;
        font-size: ${fs}px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        white-space: nowrap;
        line-height: 1;
        opacity: ${greyed ? 0.4 : 1};
    ">${p.nome}</div>`;
}

function initAvatarUpload() {
    const wrapper = document.getElementById('qgAvatarWrapper');
    const input = document.getElementById('qgAvatarInput');
    const img = document.getElementById('qgAvatarImg');
    const placeholder = document.getElementById('qgAvatarPlaceholder');
    if (!wrapper || !input || !img || !placeholder) return;

    wrapper.addEventListener('click', () => input.click());

    input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;
        // Show local preview instantly
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            img.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
        // Upload to Firebase Storage (cloud)
        if (typeof uploadAvatarToStorage === 'function') {
            const url = await uploadAvatarToStorage(file);
            if (url) {
                userProfile.avatarUrl = url;
                DB.save('userProfile', userProfile);
            }
        }
    });
}

function loadAvatarFromProfile() {
    const img = document.getElementById('qgAvatarImg');
    const placeholder = document.getElementById('qgAvatarPlaceholder');
    if (!img || !placeholder) return;
    const avatarUrl = userProfile.avatarUrl || userProfile.avatar; // fallback legacy base64
    if (avatarUrl) {
        img.src = avatarUrl;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
    }
}

// NPC combatants
let npcs = [
    { nome: "Tenente Carvalho", horas: 75.5,  status: "Estudando RLM",       lema: "A persistência supera o talento natural em combate.",        genero: "M" },
    { nome: "Cabo Rocha",       horas: 18.2,  status: "Estudando Português",   lema: "Cada questão resolvida é uma trincheira conquistada.",       genero: "M" },
    { nome: "Soldada Silva",    horas: 6.5,   status: "Em descanso tático",    lema: "Minha disciplina é meu escudo tático mais forte.",           genero: "F" },
    { nome: "Major Fontes",     horas: 312.0, status: "Resolvendo Simulados",  lema: "No QG dos aprovados só entra quem supera a exaustão.",      genero: "M" },
    { nome: "Sargento Nunes",   horas: 45.8,  status: "Estudando Direito",     lema: "Firme no propósito. A vitória pertence ao perseverante.",    genero: "M" }
];

// Initialize and update NPC hours dynamically to simulate live competition
function simulateNpcs() {
    const lastTick = DB.load('lastNpcTick', Date.now());
    const hoursPassed = (Date.now() - lastTick) / 3600000; // time in hours
    
    // Seed randomized study ticks (capped at realistic speed)
    npcs.forEach(npc => {
        // Study speed: average of 0.3 - 0.7 hours per real hour
        if (Math.random() > 0.4) {
            const addedHours = Math.min(hoursPassed * (0.3 + Math.random() * 0.4), 3.0);
            npc.horas = parseFloat((npc.horas + addedHours).toFixed(1));
        }
        
        // Randomize status
        const statuses = ["Estudando Legislação", "Resolvendo Questões", "Em descanso tático", "Revisando Edital", "Focado na meta"];
        if (Math.random() > 0.8) {
            npc.status = statuses[Math.floor(Math.random() * statuses.length)];
        }
    });
    
    DB.save('lastNpcTick', Date.now());
    DB.save('npcsLeaderboard', npcs);
}

function updateQgView() {
    // 1. Simulate NPCs studies first
    npcs = DB.load('npcsLeaderboard', npcs);
    simulateNpcs();

    loadAvatarFromProfile();

    // 2. Compute user stats
    const totalMinutes = (typeof historicoEstudos !== 'undefined' && historicoEstudos) ?
        historicoEstudos.reduce((sum, log) => sum + (log.duracaoMin || 0), 0) : 0;
    const totalHours = parseFloat((totalMinutes / 60).toFixed(1));

    // 3. Determine gender-based patents
    const gender = userProfile.genero || 'M';
    const activePatentsList = PATENTES.map(p => {
        let nome = p.nome;
        let desc = p.desc;
        if (gender === 'F') {
            if (nome === "Capitão") nome = "Capitã";
            desc = desc.replace("recém-alistado", "recém-alistada");
            desc = desc.replace("subalterno", "subalterna");
        }
        return { ...p, nome, desc };
    });

    let activePatentIdx = 0;
    for (let i = activePatentsList.length - 1; i >= 0; i--) {
        if (totalHours >= activePatentsList[i].horas) {
            activePatentIdx = i;
            break;
        }
    }

    const activePatent = activePatentsList[activePatentIdx];
    const nextPatent = activePatentIdx < activePatentsList.length - 1 ? activePatentsList[activePatentIdx + 1] : null;

    // 4. Update Profile Header
    const patentTitle = document.getElementById('qgUserPatentName');
    if (patentTitle) {
        patentTitle.textContent = activePatent.nome;
        patentTitle.style.color = 'var(--accent-green-light)';
    }

    // Profile stats
    const totalHoursEl = document.getElementById('qgTotalHours');
    if (totalHoursEl) totalHoursEl.textContent = totalHours;
    const patentsUnlockedEl = document.getElementById('qgPatentsUnlocked');
    if (patentsUnlockedEl) patentsUnlockedEl.textContent = (activePatentIdx + 1);

    // Next patent progress
    const nextPatentName = document.getElementById('qgNextPatentName');
    const targetHoursText = document.getElementById('qgTargetHoursText');
    const patentProgressFill = document.getElementById('qgPatentProgressFill');
    const currentHoursText = document.getElementById('qgCurrentHoursText');
    const missingHoursText = document.getElementById('qgMissingHoursText');
    const nextProgressSection = document.getElementById('qgNextProgress');

    if (nextPatent) {
        if (nextProgressSection) nextProgressSection.style.display = '';
        if (nextPatentName) {
            nextPatentName.textContent = nextPatent.nome;
            nextPatentName.style.color = 'var(--accent-green-light)';
        }
        const currentProgress = totalHours - activePatent.horas;
        const targetDifference = nextPatent.horas - activePatent.horas;
        const pct = Math.min(100, Math.max(0, Math.round((currentProgress / targetDifference) * 100)));
        if (patentProgressFill) patentProgressFill.style.width = `${pct}%`;
        if (currentHoursText) currentHoursText.textContent = `${totalHours}h`;
        if (targetHoursText) targetHoursText.textContent = `${nextPatent.horas}h`;
        const missing = parseFloat((nextPatent.horas - totalHours).toFixed(1));
        if (missingHoursText) missingHoursText.textContent = `Faltam ${missing}h`;
    } else {
        if (nextProgressSection) nextProgressSection.style.display = 'none';
    }

    // 5. Render Patent Timeline
    const patentsContainer = document.getElementById('qgPatentsList');
    if (patentsContainer) {
        patentsContainer.innerHTML = activePatentsList.map((p, idx) => {
            const isActive = idx === activePatentIdx;
            const isUnlocked = totalHours >= p.horas;
            let timelineClass = 'timeline-locked';
            if (isActive) timelineClass = 'timeline-active';
            else if (isUnlocked) timelineClass = 'timeline-unlocked';

            let statusBadge = '';
            if (isActive) {
                statusBadge = '<span class="qg-timeline-status-badge active"><i class="bi bi-shield-fill"></i> ATUAL</span>';
            } else if (isUnlocked) {
                statusBadge = '<span class="qg-timeline-status-badge unlocked"><i class="bi bi-check-circle-fill"></i> LIBERADA</span>';
            } else {
                statusBadge = '<span class="qg-timeline-status-badge locked"><i class="bi bi-lock-fill"></i> BLOQUEADA</span>';
            }

            // Mini progress bar for unlocked/active patents
            let miniBar = '';
            if (isUnlocked && !isActive && idx > 0) {
                const prevH = activePatentsList[idx - 1].horas;
                const thisH = p.horas;
                const range = thisH - prevH;
                const progress = totalHours - prevH;
                const miniPct = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
                miniBar = `<div class="qg-timeline-mini-bar"><div class="qg-timeline-mini-fill" style="width:${miniPct}%"></div></div>`;
            }
            if (isActive && idx < activePatentsList.length - 1) {
                const nextH = activePatentsList[idx + 1].horas;
                const thisH = p.horas;
                const range = nextH - thisH;
                const progress = totalHours - thisH;
                const miniPct = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
                miniBar = `<div class="qg-timeline-mini-bar"><div class="qg-timeline-mini-fill" style="width:${miniPct}%"></div></div>`;
            }

            return `
                <div class="qg-timeline-item ${timelineClass}">
                    <div class="qg-timeline-dot"></div>
                    <div class="qg-timeline-icon">
                        ${renderPatentBadge(p, 44, !isUnlocked)}
                    </div>
                    <div class="qg-timeline-info">
                        <span class="qg-timeline-name">${p.nome}</span>
                        <span class="qg-timeline-desc" title="${p.desc}">${p.desc}</span>
                        <div class="qg-timeline-meta">
                            <span class="qg-timeline-hours">${p.horas}h</span>
                            ${miniBar}
                        </div>
                    </div>
                    <div class="qg-timeline-status">${statusBadge}</div>
                </div>
            `;
        }).join('');
    }

    // 6. Render Leaderboard (flat list, no separate podium)
    const activeUserName = userProfile.nome || 'Soldado (Você)';
    let leaderboard = [
        ...npcs,
        {
            nome: `${activeUserName} (Você)`,
            horas: totalHours,
            status: (typeof timerRunning !== 'undefined' && timerRunning) ? "Em Combate" : "No QG",
            lema: userProfile.lema || "Minha disciplina é inabalável!",
            genero: gender,
            isUser: true
        }
    ];
    leaderboard.sort((a, b) => b.horas - a.horas);

    // Podium merged into flat list — hide podium section
    const podiumContainer = document.getElementById('qgPodium');
    if (podiumContainer) { podiumContainer.innerHTML = ''; podiumContainer.style.display = 'none'; }

    // Leaderboard list: all entries (flat, no separate podium)
    const lbContainer = document.getElementById('qgLeaderboardList');
    if (lbContainer) {
        lbContainer.innerHTML = leaderboard.map((player, i) => {
            const rank = i + 1;
            const rankMedal = `<span>${rank}º</span>`;
            const pObj = getPatentByHours(player.horas);
            return `
                <div class="qg-leaderboard-row ${player.isUser ? 'is-user' : ''}" data-idx="${i}">
                    <span class="qg-leaderboard-rank">${rankMedal}</span>
                    <div class="qg-leaderboard-icon">
                        ${renderPatentBadge(pObj, 38, false)}
                    </div>
                    <div class="qg-leaderboard-info">
                        <div class="qg-leaderboard-name">${player.nome}</div>
                        <div class="qg-leaderboard-status">${player.status}</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="qg-leaderboard-hours">${player.horas}h</div>
                        <span class="qg-leaderboard-unit">estudadas</span>
                    </div>
                </div>
            `;
        }).join('');

        // Bind clicks to all leaderboard rows
        lbContainer.querySelectorAll('.qg-leaderboard-row').forEach(row => {
            row.addEventListener('click', () => {
                const idx = parseInt(row.dataset.idx);
                const player = leaderboard[idx];
                if (player) showCombatantDetailModal(player);
            });
        });
    }
}

// ===== INTERACTIVE PROFILE DETAILS MODAL =====
function showCombatantDetailModal(player) {
    const modal = document.getElementById('combatantDetailModal');
    if (!modal) return;

    const matchedPatent = getPatentByHours(player.horas);
    let patentNameText = matchedPatent.nome;
    if (player.genero === 'F' && patentNameText === "Capitão") patentNameText = "Capitã";

    const badge = document.getElementById('detailPatentBadge');
    if (badge) {
        badge.innerHTML = renderPatentBadge(matchedPatent, 72, false);
        badge.style.color = 'var(--accent-green-light)';
        badge.style.filter = 'drop-shadow(0 0 20px rgba(107,122,42,0.5))';
    }

    document.getElementById('detailCombatantName').textContent = player.nome;
    document.getElementById('detailCombatantName').style.color = player.isUser ? 'var(--accent-green-light)' : 'var(--text-primary)';
    
    document.getElementById('detailPatentName').textContent = patentNameText;
    document.getElementById('detailPatentName').style.color = 'var(--accent-green-light)';
    
    document.getElementById('detailStudyHours').textContent = `${player.horas} horas`;
    document.getElementById('detailHonorMessage').textContent = `"${player.lema}"`;

    modal.classList.add('active');

    // Close buttons
    const onClose = () => modal.classList.remove('active');
    const closeBtn = document.getElementById('combatantDetailClose');
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newWorkerWaiting = newCloseBtn, closeBtn);
    newWorkerWaiting.addEventListener('click', onClose);
}

// ===== SOLDIER ALISTAMENTO ONBOARDING MODAL =====
function showSoldierOnboardingModal(firebaseUser) {
    const modal = document.getElementById('soldierOnboardingModal');
    if (!modal) return;

    // Prefill name using Google account profile
    const nameInput = document.getElementById('onboardSoldierName');
    if (nameInput && !nameInput.value) {
        nameInput.value = firebaseUser ? (firebaseUser.displayName || '') : (userProfile.nome || '');
    }

    let selectedGender = 'M';
    const labelM = document.getElementById('onboardGenderM');
    const labelF = document.getElementById('onboardGenderF');

    // Interactive gender toggles
    labelM.addEventListener('click', () => {
        selectedGender = 'M';
        labelM.style.border = '2px solid var(--accent-green-light)';
        labelM.style.background = 'rgba(107,122,42,0.08)';
        labelF.style.border = '1px solid var(--border-color)';
        labelF.style.background = 'none';
    });

    labelF.addEventListener('click', () => {
        selectedGender = 'F';
        labelF.style.border = '2px solid var(--accent-green-light)';
        labelF.style.background = 'rgba(107,122,42,0.08)';
        labelM.style.border = '1px solid var(--border-color)';
        labelM.style.background = 'none';
    });

    modal.classList.add('active');

    const btnSave = document.getElementById('btnOnboardSave');
    btnSave.addEventListener('click', () => {
        const nameVal = nameInput.value.trim();
        const mottoVal = document.getElementById('onboardSoldierMotto').value.trim() || 'Minha disciplina é inabalável!';
        
        if (!nameVal) {
            showToast('Recruta! Digite o seu nome para o Alistamento.');
            return;
        }

        // Set properties into userProfile state!
        userProfile.nome = nameVal;
        userProfile.genero = selectedGender;
        userProfile.lema = mottoVal;
        userProfile.soldierConfigured = true;

        DB.save('userProfile', userProfile);
        updateUserProfileDisplay();
        
        modal.classList.remove('active');
        showToast('🎖️ Alistamento concluído com sucesso! Bem-vindo ao combate.');

        // Route to QG page to showcase their profile card
        if (typeof navigateToPage === 'function') {
            navigateToPage('qg');
        }

        // Push onboarding profile sync to remote Firebase if online
        if (typeof pushLocalToFirestore === 'function') {
            pushLocalToFirestore();
        }
    });
}

// ===== AUTO-TRIGGER ONBOARDING PRECONFIGURATION ON LOAD =====
window.addEventListener('load', () => {
    initAvatarUpload();
    loadAvatarFromProfile();
    // A brief delay to let auth and local profiles load from localStorage
    setTimeout(() => {
        const loginOver = document.getElementById('loginOverlay');
        const loginOverVisible = loginOver && loginOver.style.display !== 'none';
        
        if (!loginOverVisible && !isAdmin && !userProfile.soldierConfigured) {
            // Verify if user is loaded
            const authUser = auth.currentUser;
            showSoldierOnboardingModal(authUser);
        }
    }, 1500);
});

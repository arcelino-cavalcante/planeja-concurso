// ===== PLANEJA CONCURSO APP - BISUS (BLOG) =====
let bisusList = [];

function showBisusView(viewId) {
    ['bisus-list-view', 'bisus-read-view', 'bisus-admin-view'].forEach(id => {
        document.getElementById(id).classList.add('d-none');
    });
    document.getElementById(viewId).classList.remove('d-none');
}

// ===== RICH TEXT EDITOR SETUP =====
function setupRichTextEditor(toolbarId, editorId) {
    const toolbar = document.getElementById(toolbarId);
    if (!toolbar) return;

    toolbar.querySelectorAll('button[data-cmd]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const cmd = btn.dataset.cmd;
            const arg = btn.dataset.arg || null;

            if (cmd === 'createLink') {
                const url = prompt('URL do link:');
                if (url) document.execCommand(cmd, false, url);
            } else if (cmd === 'formatBlock') {
                document.execCommand(cmd, false, arg);
            } else {
                document.execCommand(cmd, false, null);
            }

            document.getElementById(editorId)?.focus();
        });
    });

    // Prevent losing focus when clicking toolbar
    toolbar.addEventListener('mousedown', (e) => e.preventDefault());

    // Auto-link on paste
    document.getElementById(editorId)?.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
    });
}

function getEditorContent(editorId) {
    const el = document.getElementById(editorId);
    return el ? el.innerHTML : '';
}

function setEditorContent(editorId, html) {
    const el = document.getElementById(editorId);
    if (el) el.innerHTML = html || '';
}

function getReadingTime(html) {
    const text = (html || '').replace(/<[^>]*>/g, '');
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    return Math.max(1, Math.ceil(words / 200)); // 200 words per minute
}

// ===== FETCH & RENDER CARDS =====
async function fetchBisus() {
    try {
        const snapshot = await firestore.collection('bisus').orderBy('createdAt', 'desc').get();
        bisusList = [];
        snapshot.forEach(doc => bisusList.push({ id: doc.id, ...doc.data() }));
        renderBisusGrid();
    } catch (e) {
        console.warn('Erro ao carregar bisus:', e);
    }
}

function renderBisusGrid() {
    const container = document.getElementById('bisusCardsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (bisusList.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-secondary);">
            <i class="bi bi-journal-text" style="font-size:3rem;display:block;margin-bottom:16px;color:var(--accent-green-light);"></i>
            <h3 style="margin-bottom:8px;">Nenhum artigo ainda</h3>
            <p>Os bisus e dicas aparecerão aqui.</p>
        </div>`;
        return;
    }

    bisusList.forEach(bisu => {
        const dataFmt = new Date(bisu.createdAt).toLocaleDateString('pt-BR');
        const imgUrl = bisu.imagem || 'https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?auto=format&fit=crop&w=600&q=80';
        const snippet = (bisu.resumo || bisu.conteudo || '').replace(/<[^>]*>/g, '').substring(0, 120) + '...';
        const tempoLeitura = getReadingTime(bisu.conteudo);

        const card = document.createElement('div');
        card.className = 'bisu-card';
        card.innerHTML = `
            <div class="bisu-card-img-wrap">
                <img src="${imgUrl}" alt="${bisu.titulo}">
                <span class="bisu-card-categoria">${bisu.categoria || 'Geral'}</span>
            </div>
            <div class="bisu-card-body">
                <h3>${bisu.titulo}</h3>
                <p>${snippet}</p>
            </div>
            <div class="bisu-card-footer">
                <span><i class="bi bi-calendar3"></i> ${dataFmt}</span>
                <span><i class="bi bi-clock"></i> ${tempoLeitura} min</span>
            </div>
            ${isAdmin ? `<button class="bisu-card-del btn-del-bisu" data-id="${bisu.id}" title="Excluir"><i class="bi bi-trash3"></i></button>` : ''}
        `;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-del-bisu')) return;
            openBisuReader(bisu);
        });

        if (isAdmin) {
            const delBtn = card.querySelector('.btn-del-bisu');
            delBtn?.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('Excluir este artigo?')) return;
                await firestore.collection('bisus').doc(bisu.id).delete();
                fetchBisus();
                showToast('Artigo excluído!');
            });
        }

        container.appendChild(card);
    });
}

// ===== READER VIEW =====
function openBisuReader(bisu) {
    const temImg = !!bisu.imagem;

    // Hero with image
    const imgEl = document.getElementById('readBisuImg');
    const imgOverlay = document.getElementById('readBisuImgOverlay');
    const imgLabel = document.getElementById('readBisuImgLabel');
    if (temImg) {
        imgEl.src = bisu.imagem;
        imgEl.style.display = 'block';
        imgOverlay.style.display = 'block';
        imgLabel.style.display = 'block';
        document.getElementById('readBisuCategoriaHero').textContent = bisu.categoria || 'Geral';
        document.getElementById('readBisuTituloHero').textContent = bisu.titulo;
    } else {
        imgEl.style.display = 'none';
        imgOverlay.style.display = 'none';
        imgLabel.style.display = 'none';
    }

    // Info below hero
    document.getElementById('readBisuCategoria').textContent = bisu.categoria || 'Geral';
    document.getElementById('readBisuTitulo').textContent = temImg ? '' : bisu.titulo; // hide if hero shows it
    document.getElementById('readBisuTitulo').style.display = temImg ? 'none' : 'block';

    // Resumo
    const resumoEl = document.getElementById('readBisuResumo');
    if (bisu.resumo) {
        resumoEl.textContent = bisu.resumo;
        resumoEl.style.display = 'block';
    } else {
        resumoEl.style.display = 'none';
    }

    // Meta
    document.getElementById('readBisuData').textContent = new Date(bisu.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    document.getElementById('readBisuTempoLeitura').textContent = getReadingTime(bisu.conteudo);

    // Rich content
    document.getElementById('readBisuConteudo').innerHTML = bisu.conteudo || '';

    showBisusView('bisus-read-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== NAVIGATION =====
document.getElementById('backToBisusList')?.addEventListener('click', (e) => {
    e.preventDefault();
    showBisusView('bisus-list-view');
});

document.getElementById('backToBisusAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    showBisusView('bisus-list-view');
});

// ===== ADMIN SAVE (from admin bisus form) =====
// Setup admin editor toolbar
setupRichTextEditor('adminBisuToolbar', 'adminBisuEditor');

document.getElementById('btnAdminSalvarBisu')?.addEventListener('click', async () => {
    if (!isAdmin) return;

    const titulo = document.getElementById('adminBisuTitulo').value.trim();
    const categoria = document.getElementById('adminBisuCategoria').value.trim();
    const imagem = document.getElementById('adminBisuImagem').value.trim();
    const resumo = document.getElementById('adminBisuResumo').value.trim();
    const conteudo = getEditorContent('adminBisuEditor');

    if (!titulo || !conteudo || conteudo === '<br>') {
        return showToast('Título e conteúdo são obrigatórios.');
    }

    const btn = document.getElementById('btnAdminSalvarBisu');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Salvando...';
    btn.disabled = true;

    try {
        await firestore.collection('bisus').add({
            titulo,
            categoria,
            imagem,
            resumo,
            conteudo,
            createdAt: new Date().toISOString()
        });
        showToast('Artigo publicado!');
        document.getElementById('admin-bisus-form-view').classList.add('d-none');
        document.getElementById('admin-bisus-list-view').classList.remove('d-none');
        await fetchBisus();
        await loadAdminBisus();
    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Clear admin form when opening
document.getElementById('btnAdminNovoBisu')?.addEventListener('click', () => {
    document.getElementById('adminBisuTitulo').value = '';
    document.getElementById('adminBisuCategoria').value = '';
    document.getElementById('adminBisuImagem').value = '';
    document.getElementById('adminBisuResumo').value = '';
    setEditorContent('adminBisuEditor', '');
});

// ===== LOAD ON AUTH =====
if (auth.currentUser) fetchBisus();

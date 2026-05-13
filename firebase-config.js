// ===== FIREBASE CONFIG, AUTH & DB WRAPPER =====
const firebaseConfig = {
    apiKey: "AIzaSyA993auackT0PhGctsHo-BnPcfvBDcEtL4",
    authDomain: "banco-app-estudos-concurso.firebaseapp.com",
    projectId: "banco-app-estudos-concurso",
    storageBucket: "banco-app-estudos-concurso.firebasestorage.app",
    messagingSenderId: "951899980335",
    appId: "1:951899980335:web:e3d1383f37fb0b68473cda"
};

firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

let currentUserUID = null;
let isAdmin = false;

// Admin ROUTING is provider-based (not email-based):
// - Google login        → Student (aluno)
// - Email/Password login → Admin
// ADMIN_EMAIL is kept only for filtering admin from dashboard stats
const ADMIN_EMAIL = 'admin@omentor.com';
const ADMIN_EMAIL_LOWER = ADMIN_EMAIL.toLowerCase().trim();

// Enable offline persistence
firestore.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if (err.code === 'failed-precondition') console.warn('Firestore: multiple tabs open');
    else if (err.code === 'unimplemented') console.warn('Firestore: browser not supported for offline');
});

// ===== HYBRID DB: localStorage (instant) + Firestore (cloud) scoped per user =====
const DB = {
    save(key, data) {
        if (!currentUserUID) return;
        // Instant local save (scoped to uid)
        localStorage.setItem(`mentor_${currentUserUID}_${key}`, JSON.stringify(data));
        // Async cloud save (fire-and-forget)
        firestore.collection('users').doc(currentUserUID).collection('dados').doc(key).set({
            items: data,
            updatedAt: new Date().toISOString()
        }).then(() => {
            console.log(`☁️ Firestore: ${key} salvo`);
        }).catch(err => {
            console.warn('⚠️ Firestore save error:', err);
        });
    },

    load(key, fallback = []) {
        if (!currentUserUID) return fallback;
        try {
            return JSON.parse(localStorage.getItem(`mentor_${currentUserUID}_${key}`)) || fallback;
        } catch (e) {
            return fallback;
        }
    },

    remove(key) {
        if (!currentUserUID) return;
        localStorage.removeItem(`mentor_${currentUserUID}_${key}`);
        firestore.collection('users').doc(currentUserUID).collection('dados').doc(key).delete()
            .catch(err => console.warn('Firestore delete error:', err));
    },

    clearAll() {
        if (!currentUserUID) return;
        const keys = ['rotinas', 'concursos', 'ciclos', 'simulados', 'userProfile'];
        keys.forEach(key => {
            localStorage.removeItem(`mentor_${currentUserUID}_${key}`);
            firestore.collection('users').doc(currentUserUID).collection('dados').doc(key).delete()
                .catch(err => console.warn('Firestore delete error for ' + key + ':', err));
        });
        console.log('🗑️ All data cleared from localStorage and Firestore');
    }
};

// ===== SYNC FROM FIRESTORE → localStorage =====
async function syncFromFirestore() {
    if (!currentUserUID) return false;
    try {
        const snapshot = await firestore.collection('users').doc(currentUserUID).collection('dados').get();
        let synced = false;
        snapshot.forEach(doc => {
            const data = doc.data().items;
            if (data) {
                localStorage.setItem(`mentor_${currentUserUID}_${doc.id}`, JSON.stringify(data));
                synced = true;
            }
        });
        return synced;
    } catch (err) {
        console.warn('📴 Offline mode — usando localStorage:', err.message);
        return false;
    }
}

// ===== PUSH localStorage → Firestore (migration/first time setup) =====
async function pushLocalToFirestore() {
    if (!currentUserUID) return;
    const keys = ['rotinas', 'concursos', 'ciclos', 'simulados', 'userProfile'];
    for (const key of keys) {
        const local = DB.load(key, []);
        if (local.length > 0 || (key === 'userProfile' && Object.keys(local).length > 0)) {
            try {
                const docRef = firestore.collection('users').doc(currentUserUID).collection('dados').doc(key);
                const doc = await docRef.get();
                if (!doc.exists) {
                    await docRef.set({
                        items: local,
                        updatedAt: new Date().toISOString()
                    });
                    console.log(`⬆️ Pushed ${key} to Firestore`);
                }
            } catch (e) {
                console.warn(`Push ${key} failed:`, e.message);
            }
        }
    }
}

// ===== GLOBAL REFRESH: re-read from localStorage + re-render =====
function refreshAllData() {
    // These variables are defined globally in app-core.js
    if (typeof rotinas !== 'undefined') rotinas = DB.load('rotinas', []);
    if (typeof concursos !== 'undefined') concursos = DB.load('concursos', []);
    if (typeof ciclos !== 'undefined') ciclos = DB.load('ciclos', []);
    if (typeof simulados !== 'undefined') simulados = DB.load('simulados', []);
    if (typeof userProfile !== 'undefined') {
        userProfile = DB.load('userProfile', { nome: auth.currentUser?.displayName || 'Aluno' });
    }
    
    // Re-render all modules if their functions exist
    if (typeof renderRotinas === 'function') renderRotinas();
    if (typeof renderConcursosList === 'function') renderConcursosList();
    if (typeof renderCiclosList === 'function') renderCiclosList();
    if (typeof renderSimuladosList === 'function') renderSimuladosList();
    if (typeof updateUserProfileDisplay === 'function') updateUserProfileDisplay();
    
    // Load dashboard extras
    if (typeof loadMentorMessage === 'function') loadMentorMessage();
    if (typeof loadAvisos === 'function') loadAvisos();
}

// ===== AUTH & LOGIN UI LOGIC =====
document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('loginOverlay');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const blockedOverlay = document.getElementById('blockedOverlay');
    const loginAlunoView = document.getElementById('loginAlunoView');
    const loginAdminView = document.getElementById('loginAdminView');
    
    // Check if URL has #admin initially or changes
    function checkAdminHash() {
        if (window.location.hash === '#admin') {
            loginAlunoView.style.display = 'none';
            loginAdminView.style.display = 'block';
        } else {
            loginAlunoView.style.display = 'block';
            loginAdminView.style.display = 'none';
        }
    }
    
    checkAdminHash();
    window.addEventListener('hashchange', checkAdminHash);

    // Google Login (Student)
    document.getElementById('btnGoogleLogin')?.addEventListener('click', () => {
        auth.signInWithPopup(googleProvider).catch(err => {
            alert('Erro no login: ' + err.message);
        });
    });

    // Email/Password Login (Admin)
    document.getElementById('btnAdminLogin')?.addEventListener('click', () => {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminSenha').value;
        if (!email || !password) return alert('Preencha os dados');
        auth.signInWithEmailAndPassword(email, password).catch(err => {
            alert('Erro no login admin: ' + err.message);
        });
    });

    // Logout via student sidebar
    document.querySelector('#sidebar .user-logout')?.addEventListener('click', () => {
        auth.signOut().then(() => window.location.reload());
    });

    // Logout from blocked screen
    document.getElementById('btnLogoutBlocked')?.addEventListener('click', () => {
        auth.signOut().then(() => window.location.reload());
    });

    // Auth State Observer
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUserUID = user.uid;

            // Detect admin by auth provider:
            // Email/Password (providerId = 'password') → Admin
            // Google (providerId = 'google.com') → Student
            const providerId = user.providerData && user.providerData[0] ? user.providerData[0].providerId : '';
            isAdmin = (providerId === 'password');
            console.log('✅ User logged in:', user.email, '| Provider:', providerId, '| isAdmin:', isAdmin);
            
            if (loadingOverlay) loadingOverlay.style.display = 'flex';

            if (isAdmin) {
                // ===== ADMIN FLOW =====
                console.log('🛡️ Admin detected, setting up admin UI...');
                if (typeof setupAdminUI === 'function') {
                    setupAdminUI();
                    console.log('✅ setupAdminUI() called successfully');
                } else {
                    console.error('❌ setupAdminUI function not found! Check if app-admin.js loaded correctly.');
                }
                // Hide login overlay AFTER admin UI is set up
                loginOverlay.style.display = 'none';
                if (loadingOverlay) {
                    loadingOverlay.classList.add('fade-out');
                    setTimeout(() => loadingOverlay.remove(), 600);
                }

            } else {
                // ===== STUDENT FLOW =====
                console.log('👤 Student detected, setting up student UI...');
                // Hide login overlay for student too
                loginOverlay.style.display = 'none';
                
                // Save user profile for admin visibility
                if (typeof saveUserProfile === 'function') {
                    await saveUserProfile(user);
                }

                // Check if user access is blocked
                if (typeof checkUserAccess === 'function') {
                    const hasAccess = await checkUserAccess(user.uid);
                    if (!hasAccess) {
                        // Show blocked overlay
                        if (loadingOverlay) {
                            loadingOverlay.classList.add('fade-out');
                            setTimeout(() => loadingOverlay.remove(), 600);
                        }
                        if (blockedOverlay) blockedOverlay.style.display = 'flex';
                        return; // Stop here, don't load app
                    }
                }

                // Normal student flow
                await pushLocalToFirestore();
                await syncFromFirestore();
                refreshAllData();

                // Setup student UI permissions for Bisus
                if (document.getElementById('btnNovoBisu')) {
                    document.getElementById('btnNovoBisu').style.display = 'none';
                }

                if (loadingOverlay) {
                    loadingOverlay.classList.add('fade-out');
                    setTimeout(() => loadingOverlay.remove(), 600);
                }
            }
        } else {
            currentUserUID = null;
            isAdmin = false;
            loginOverlay.style.display = 'flex';
            if (blockedOverlay) blockedOverlay.style.display = 'none';
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    });

    // ===== THEME TOGGLE (Light/Dark) =====
    const themeToggleStudent = document.getElementById('themeToggleStudent');
    const themeToggleAdmin = document.getElementById('themeToggleAdmin');

    function getCurrentTheme() {
        return localStorage.getItem('planeja-concurso-theme') || 'dark';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('planeja-concurso-theme', theme);
        // Update manifest theme-color
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.content = theme === 'light' ? '#f0f2f5' : '#0a0a0a';
        }
    }

    function toggleTheme() {
        const current = getCurrentTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
    }

    // Apply saved theme on load
    applyTheme(getCurrentTheme());

    // Bind toggle buttons
    themeToggleStudent?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme();
    });
    themeToggleAdmin?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme();
    });
});


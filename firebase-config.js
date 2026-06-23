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
const storage = firebase.storage();
const googleProvider = new firebase.auth.GoogleAuthProvider();

let currentUserUID = null;

// Enable offline persistence
try {
    firestore.settings({
        localCache: firebase.firestore.persistentLocalCache({tabManager: firebase.firestore.persistentMultipleTabManager()})
    });
} catch (err) {
    console.warn('Firestore offline persistence warning:', err);
}

// ===== Debounced Firestore write queue (PRO — minimiza writes) =====
const _writeQueue = {};
const _writeTimers = {};
const _writeRetries = {};
const DEBOUNCE_MS = 2500;  // 2.5s — agrupa múltiplos saves em 1 write
const MAX_RETRIES = 3;

function _flushWrite(key, attempt = 0) {
    if (!currentUserUID) return;
    const data = _writeQueue[key];
    if (data === undefined) return;
    delete _writeQueue[key];
    firestore.collection('users').doc(currentUserUID).collection('dados').doc(key).set({
        items: data,
        updatedAt: new Date().toISOString()
    }, { merge: true }).then(() => {
        delete _writeRetries[key];
    }).catch(err => {
        console.warn(`⚠️ Firestore write ${key}:`, err.message);
        if (attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
            _writeRetries[key] = setTimeout(() => _flushWrite(key, attempt + 1), delay);
        } else {
            _writeQueue[key] = data; // requeue for next save
        }
    });
}

function _flushAll() {
    Object.keys(_writeTimers).forEach(key => {
        clearTimeout(_writeTimers[key]);
        delete _writeTimers[key];
    });
    Object.keys(_writeRetries).forEach(key => {
        clearTimeout(_writeRetries[key]);
        delete _writeRetries[key];
    });
    Object.keys(_writeQueue).forEach(key => _flushWrite(key));
}

// Flush pending writes before page close
window.addEventListener('beforeunload', () => _flushAll());
// Also flush when visibility changes (tab switch)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) _flushAll();
});

// ===== HYBRID DB: localStorage (instant) + Firestore (debounced, retry) =====
const DB = {
    save(key, data, customDebounce = DEBOUNCE_MS) {
        if (!currentUserUID) return;
        localStorage.setItem(`mentor_${currentUserUID}_${key}`, JSON.stringify(data));
        _writeQueue[key] = data;
        if (_writeTimers[key]) clearTimeout(_writeTimers[key]);
        
        if (customDebounce === 0) {
            _flushWrite(key);
        } else {
            _writeTimers[key] = setTimeout(() => _flushWrite(key), customDebounce);
        }
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
        const keys = ['rotinas', 'concursos', 'ciclos', 'simulados', 'userProfile', 'historicoEstudos', 'editais', 'pomodoroEnabled', 'pomodoroBreakMin', 'activeTimerState', 'metas'];
        keys.forEach(key => {
            localStorage.removeItem(`mentor_${currentUserUID}_${key}`);
            localStorage.removeItem(`mentor_${currentUserUID}_${key}_ts`);
            firestore.collection('users').doc(currentUserUID).collection('dados').doc(key).delete()
                .catch(err => console.warn('Firestore delete error for ' + key + ':', err));
        });
        console.log('🗑️ All data cleared');
    },

    // Force immediate flush of all pending writes
    flush() { _flushAll(); }
};

// ===== SYNC FROM FIRESTORE → localStorage (cached — só lê se necessário) =====
async function syncFromFirestore() {
    if (!currentUserUID) return false;
    // Skip if already synced in this session
    if (sessionStorage.getItem(`synced_${currentUserUID}`)) return false;
    try {
        const snapshot = await firestore.collection('users').doc(currentUserUID).collection('dados').get();
        let synced = false;
        snapshot.forEach(doc => {
            const data = doc.data().items;
            if (data) {
                // Only overwrite localStorage if cloud version is newer (or absent)
                const localTime = localStorage.getItem(`mentor_${currentUserUID}_${doc.id}_ts`);
                const cloudTime = doc.data().updatedAt || '';
                if (!localTime || cloudTime > localTime) {
                    localStorage.setItem(`mentor_${currentUserUID}_${doc.id}`, JSON.stringify(data));
                    localStorage.setItem(`mentor_${currentUserUID}_${doc.id}_ts`, cloudTime);
                    synced = true;
                }
            }
        });
        sessionStorage.setItem(`synced_${currentUserUID}`, '1');
        return synced;
    } catch (err) {
        console.warn('📴 Offline — usando localStorage:', err.message);
        return false;
    }
}

// ===== PUSH localStorage → Firestore (batch — 1 write total) =====
async function pushLocalToFirestore() {
    if (!currentUserUID) return;
    const keys = ['rotinas', 'concursos', 'ciclos', 'simulados', 'userProfile', 'historicoEstudos', 'editais', 'pomodoroEnabled', 'pomodoroBreakMin', 'activeTimerState', 'metas'];
    const batch = firestore.batch();
    const now = new Date().toISOString();
    let hasOps = false;
    for (const key of keys) {
        const local = DB.load(key, key === 'userProfile' ? {} : key === 'pomodoroEnabled' ? false : key === 'pomodoroBreakMin' ? 5 : key === 'lastNpcTick' ? Date.now() : []);
        // Skip truly empty: null, undefined, empty arrays, empty objects, zero for non-scalar
        const isEmpty = local === null || local === undefined
            || (Array.isArray(local) && local.length === 0)
            || (!Array.isArray(local) && typeof local === 'object' && Object.keys(local).length === 0);
        if (isEmpty) continue;
        const docRef = firestore.collection('users').doc(currentUserUID).collection('dados').doc(key);
        batch.set(docRef, { items: local, updatedAt: now }, { merge: true });
        localStorage.setItem(`mentor_${currentUserUID}_${key}_ts`, now);
        hasOps = true;
    }
    if (hasOps) {
        try { await batch.commit(); }
        catch (e) { console.warn('Batch sync falhou:', e.message); }
    }
}

// ===== AVATAR STORAGE (Firebase Storage — efficient for images) =====
async function uploadAvatarToStorage(file) {
    if (!currentUserUID) return null;
    const ref = storage.ref(`avatars/${currentUserUID}`);
    try {
        const snapshot = await ref.put(file, { contentType: file.type, cacheControl: 'public,max-age=86400' });
        const url = await snapshot.ref.getDownloadURL();
        console.log('📷 Avatar uploaded to Storage');
        return url;
    } catch (e) {
        console.warn('Avatar upload failed:', e.message);
        return null;
    }
}

// ===== GLOBAL REFRESH: re-read from localStorage + re-render =====
function refreshAllData() {
    // These variables are defined globally in app-core.js
    if (typeof rotinas !== 'undefined') rotinas = DB.load('rotinas', []);
    if (typeof concursos !== 'undefined') concursos = DB.load('concursos', []);
    if (typeof ciclos !== 'undefined') ciclos = DB.load('ciclos', []);
    if (typeof simulados !== 'undefined') simulados = DB.load('simulados', []);
    if (typeof historicoEstudos !== 'undefined') historicoEstudos = DB.load('historicoEstudos', []);
    if (typeof metas !== 'undefined') metas = DB.load('metas', []);
    if (typeof userProfile !== 'undefined') {
        userProfile = DB.load('userProfile', { nome: auth.currentUser?.displayName || 'Aluno' });
    }
    
    // Re-render all modules if their functions exist
    if (typeof renderRotinas === 'function') renderRotinas();
    if (typeof renderConcursosList === 'function') renderConcursosList();
    if (typeof renderCiclosList === 'function') renderCiclosList();
    if (typeof renderSimuladosList === 'function') renderSimuladosList();
    if (typeof renderMetas === 'function') renderMetas();
    if (typeof updateUserProfileDisplay === 'function') updateUserProfileDisplay();
    
    // Load dashboard extras
    if (typeof restoreActiveTimerState === 'function') restoreActiveTimerState();
    if (typeof updateDashboard === 'function') updateDashboard();
}

// ===== AUTH & LOGIN UI LOGIC =====
document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('loginOverlay');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loginAlunoView = document.getElementById('loginAlunoView');

    // Google Login (Student)
    document.getElementById('btnGoogleLogin')?.addEventListener('click', () => {
        auth.signInWithPopup(googleProvider).catch(err => {
            alert('Erro no login: ' + err.message);
        });
    });


    // Logout via student sidebar
    document.querySelector('#sidebar .user-logout')?.addEventListener('click', () => {
        auth.signOut().then(() => window.location.reload());
    });


    // Auth State Observer
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUserUID = user.uid;

            console.log('✅ User logged in:', user.email);
            
            if (loadingOverlay) loadingOverlay.style.display = 'flex';

            // ===== STUDENT FLOW =====
            console.log('👤 Student detected, setting up student UI...');
            // Hide login overlay for student
            loginOverlay.style.display = 'none';
            
            // Save user profile
            if (typeof saveUserProfile === 'function') {
                await saveUserProfile(user);
            }

            // Normal student flow
            await syncFromFirestore();
            refreshAllData();

            // Check if onboarding preconfiguration is needed
            if (!userProfile.soldierConfigured) {
                if (typeof showSoldierOnboardingModal === 'function') {
                    showSoldierOnboardingModal(user);
                }
            }

            if (loadingOverlay) {
                loadingOverlay.classList.add('fade-out');
                setTimeout(() => loadingOverlay.remove(), 600);
            }
        } else {
            currentUserUID = null;
            loginOverlay.style.display = 'flex';
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    });

    // ===== THEME TOGGLE (Light/Dark) =====
    const themeToggleStudent = document.getElementById('themeToggleStudent');

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
});


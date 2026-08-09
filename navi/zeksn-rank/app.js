// ----------------------------
// WYKRYWANIE STRONY (ROUTER)
// ----------------------------
const isRankingPage = document.getElementById('rankingTilesContainer') !== null;
const isRestreamPage = document.getElementById('restreamRows') !== null;
const isMainPage = document.getElementById('panel') !== null;

console.log(`Strona: ${isRankingPage ? 'RANKING' : isRestreamPage ? 'RESTREAM' : 'GŁÓWNA'}`);

// ----------------------------
// FIREBASE CONFIG
// ----------------------------
const firebaseConfig = {
    apiKey: "AIzaSyAm1X3V10ImJ_RVaIqRpcFqRjlyg9vA5yI",
    authDomain: "filmy-zk.firebaseapp.com",
    databaseURL: "https://filmy-zk-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "filmy-zk",
    storageBucket: "filmy-zk.firebasestorage.app",
    messagingSenderId: "168407000386",
    appId: "1:168407000386:web:9220f943400263461394db",
    measurementId: "G-TLSHRQH647"
};

try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log('Firebase zainicjalizowane');
} catch (error) {
    console.error('Firebase error:', error);
}

const dbRef = firebase.database().ref("ranking");
const usersRef = firebase.database().ref("users");
const restreamRef = firebase.database().ref("restream");

// ----------------------------
// ZMIENNE GLOBALNE
// ----------------------------
let data = [];
let users = [];
let restreamSites = [];
let currentSort = { key: "rating", dir: -1 };
let currentUser = "";
let isAdmin = false;

// ----------------------------
// INICJALIZACJA APLIKACJI
// ----------------------------
function initApp() {
    console.log('Startowanie aplikacji...');

    setupAuth();

    loadSavedTheme();
    setupThemeChanger();
    setupTopBarSettings();
    setupScrollButtons();

    if (isMainPage) {
        console.log('>>> Setup Index');
        setupAddUserButton();
        setupIndexEventListeners();
        populateRatingSelect();
    }

    if (isRankingPage) {
        console.log('>>> Setup Ranking');
        setupSearch();
        setupRankingEventListeners();
        setupRankingListeners();
        loadInitialRankingData();
    }

    setupUsersListener();
}

// ----------------------------
// AUTORYZACJA (ADMIN)
// ----------------------------
function setupAuth() {
    const auth = firebase.auth();

    const authUI = `
        <div class="admin-login-trigger" id="loginTrigger" title="Logowanie">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M34.2824 14.3746V16.6546H31.9874V18.9496H29.7074V21.2296H27.4274V25.8046H29.7074V28.0846H31.9874V30.3796H34.2824V32.6596H36.5624V25.8046H45.7124V21.2296H36.5624V14.3746H34.2824ZM31.9874 37.2346H34.2824V41.8096H31.9874V37.2346ZM31.9874 2.94458H34.2824V9.79958H31.9874V2.94458ZM22.8524 46.3696V44.0896H31.9874V41.8096H22.8524V12.0946H20.5724V46.3696H22.8524ZM13.7024 46.3696H20.5724V48.6646H13.7024V46.3696ZM15.9974 25.8046H18.2774V30.3796H15.9974V25.8046ZM15.9974 9.79958H20.5724V12.0946H15.9974V9.79958ZM9.14238 44.0896H13.7024V46.3696H9.14238V44.0896ZM11.4224 7.51958H15.9974V9.79958H11.4224V7.51958ZM4.56738 41.8096H9.14238V44.0896H4.56738V41.8096ZM6.84738 5.23958H11.4224V7.51958H6.84738V5.23958Z" fill="currentColor"/>
                <path d="M4.5676 0.664551V2.94455H2.2876V41.8095H4.5676V5.23955H6.8476V2.94455H31.9876V0.664551H4.5676Z" fill="currentColor"/>
            </svg>
        </div>
        
        <div class="admin-logout-trigger" id="logoutBtn" title="Wyloguj">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_47_8)">
<path d="M25.1449 9.14V13.71H19.0449V16.76H25.1449V21.33H26.6649V19.81H28.1949V18.29H29.7149V16.76H31.2349V13.71H29.7149V12.19H28.1949V10.67H26.6649V9.14H25.1449ZM20.5749 21.33H22.0949V27.43H20.5749V21.33ZM20.5749 1.52H22.0949V9.14H20.5749V1.52ZM14.4749 30.48V28.95H20.5749V27.43H14.4749V7.62H12.9549V30.48H14.4749ZM8.38491 30.48H12.9549V32H8.38491V30.48ZM9.90491 16.76H11.4249V19.81H9.90491V16.76ZM9.90491 6.1H12.9549V7.62H9.90491V6.1ZM5.33491 28.95H8.38491V30.48H5.33491V28.95ZM6.85491 4.57H9.90491V6.1H6.85491V4.57ZM2.28491 27.43H5.33491V28.95H2.28491V27.43ZM3.81491 3.05H6.85491V4.57H3.81491V3.05Z" fill="#B3B3B3"/><path d="M2.28489 0V1.52H0.764893V27.43H2.28489V3.05H3.81489V1.52H20.5749V0H2.28489Z" fill="#B3B3B3"/></g><defs><clipPath id="clip0_47_8"><rect width="32" height="32" fill="white"/></clipPath></defs>
</svg>
    </div>
        
        <div id="loginModal" class="modal-overlay hidden">
            <div class="modal-content login-content">
                <div class="modal-header"><h3>Admin Login</h3><button class="modal-close-login">&times;</button></div>
                <div class="modal-body">
                    <input type="email" id="adminEmail" placeholder="Email" class="form-input">
                    <input type="password" id="adminPass" placeholder="Hasło" class="form-input">
                    <button id="doLoginBtn" class="btn-confirm full-width">Zaloguj</button>
                    <p id="loginError" class="error-msg"></p>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', authUI);

    const loginTrigger = document.getElementById('loginTrigger');
    const loginModal = document.getElementById('loginModal');
    const closeLogin = document.querySelector('.modal-close-login');
    const doLoginBtn = document.getElementById('doLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginTrigger) loginTrigger.addEventListener('click', () => loginModal.classList.remove('hidden'));
    if (closeLogin) closeLogin.addEventListener('click', () => loginModal.classList.add('hidden'));

    if (doLoginBtn) doLoginBtn.addEventListener('click', () => {
        const email = document.getElementById('adminEmail').value;
        const pass = document.getElementById('adminPass').value;

        auth.signInWithEmailAndPassword(email, pass)
            .then(() => {
                loginModal.classList.add('hidden');
                showNotification('Zalogowano jako Admin', 'success');
                document.getElementById('adminEmail').value = '';
                document.getElementById('adminPass').value = '';
            })
            .catch(error => {
                const errElem = document.getElementById('loginError');
                if (errElem) errElem.textContent = "Błąd: " + error.message;
            });
    });

    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => showNotification('Wylogowano', 'info'));
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            isAdmin = true;
            document.body.classList.add('is-admin');
            console.log('Tryb: ADMIN');
        } else {
            isAdmin = false;
            document.body.classList.remove('is-admin');
            console.log('Tryb: GOŚĆ');
        }
    });
}

// ============================================================
// SEKCJA 1: STRONA GŁÓWNA (INDEX)
// ============================================================

function setupAddUserButton() {
    if (document.getElementById('addUserBtn')) return;
    const panel = document.getElementById('panel');
    if (!panel) return;

    const addUserHTML = `
        <div class="panel-step">
            <label>Opcje:</label>
            <div class="options-wrapper">
                <button id="addUserBtn" class="btn-option">Nowy</button>
                <button id="manageUsersBtn" class="btn-option">Zarządzaj</button>
            </div>
        </div>
    `;
    panel.insertAdjacentHTML('afterbegin', addUserHTML);

    document.getElementById('addUserBtn').addEventListener('click', () => {
        if (!isAdmin) return showNotification("🔒 admin only", "error");
        showAddUserModal();
    });

    document.getElementById('manageUsersBtn').addEventListener('click', () => {
        if (!isAdmin) return showNotification("🔒 admin only", "error");
        showManageUsersModal();
    });
}

function setupIndexEventListeners() {
    const userSelect = document.getElementById("userSelect");
    const nextBtn = document.getElementById("nextBtn");
    const saveBtn = document.getElementById("saveBtn");
    const movieTitle = document.getElementById("movieTitle");
    const ratingInput = document.getElementById("ratingInput");
    const ratingSelect = document.getElementById("ratingSelect");

    if (userSelect) userSelect.addEventListener("change", handleUserSelect);
    if (nextBtn) nextBtn.addEventListener("click", handleNextStep);
    if (saveBtn) saveBtn.addEventListener("click", handleSaveRating);

    if (movieTitle) movieTitle.addEventListener("keypress", (e) => { if (e.key === "Enter") handleNextStep(); });
    if (ratingInput) ratingInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSaveRating(); });

    if (ratingSelect) {
        ratingSelect.addEventListener("change", (e) => {
            if (e.target.value && ratingInput) ratingInput.value = e.target.value;
        });
    }
}

function populateRatingSelect() {
    const ratingSelect = document.getElementById("ratingSelect");
    const ratingInput = document.getElementById("ratingInput");

    if (!ratingSelect || ratingSelect.options.length > 1) return;

    ratingSelect.innerHTML = '';
    const defaultOption = new Option('Szybki wybór', '', true, true);
    defaultOption.disabled = true;
    ratingSelect.add(defaultOption);

    const ratings = [
        '10 - Perfekcyjny', '9 - Arcydzieło', '8 - Znakomity', '7 - Bardzo dobry',
        '6 - Dobry', '5 - Przeciętny', '4 - Taki sobie', '3 - Kiepski',
        '2 - Słaby', '1 - Bardzo słaby', '0 - Katastrofa'
    ];

    ratings.forEach(label => {
        const value = label.split(' - ')[0];
        ratingSelect.add(new Option(label, value));
    });

    ratingSelect.addEventListener('change', function () {
        if (this.value && ratingInput) {
            ratingInput.value = this.value;
        }
    });
}

function handleUserSelect() {
    const stepTitle = document.getElementById("stepTitle");
    const stepRating = document.getElementById("stepRating");
    const userSelect = document.getElementById("userSelect");
    const movieTitle = document.getElementById("movieTitle");

    if (!stepTitle || !stepRating) return;
    stepTitle.classList.add("hidden");
    stepRating.classList.add("hidden");
    currentUser = userSelect ? userSelect.value : "";
    if (!currentUser) return;
    stepTitle.classList.remove("hidden");
    if (movieTitle) movieTitle.focus();
}

function handleNextStep() {
    const movieTitle = document.getElementById("movieTitle");
    const stepRating = document.getElementById("stepRating");
    const ratingInput = document.getElementById("ratingInput");

    if (!movieTitle.value.trim()) {
        showNotification("Wpisz tytuł filmu", 'error');
        movieTitle.focus();
        return;
    }
    stepRating.classList.remove("hidden");
    if (ratingInput) ratingInput.focus();
}

async function handleSaveRating() {
    if (!isAdmin) {
        showNotification("🔒 Log in", "error");
        return;
    }

    const userSelect = document.getElementById("userSelect");
    const movieTitle = document.getElementById("movieTitle");
    const ratingInput = document.getElementById("ratingInput");
    const ratingSelect = document.getElementById("ratingSelect");

    const user = userSelect.value;
    const film = movieTitle.value.trim();
    let ratingText = ratingInput.value.trim() || ratingSelect.value;
    ratingText = ratingText.replace(',', '.');
    const rating = parseFloat(ratingText);

    if (!user || !film) return;
    if (isNaN(rating) || rating < 0 || rating > 10) {
        showNotification("Podaj poprawną ocenę (0-10)", 'error');
        return;
    }

    const normalizedFilm = film.toLowerCase().trim();

    try {
        const snapshot = await dbRef.once('value');
        let existingKey = null;
        let existingData = null;

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const val = child.val();
                if (val.film.toLowerCase().trim() === normalizedFilm) {
                    if (!existingKey) {
                        existingKey = child.key;
                        existingData = val;
                    }
                }
            });
        }

        if (existingKey && existingData) {
            const userRatings = existingData.ratings || {};
            userRatings[user] = rating.toString();
            const arr = Object.values(userRatings).map(r => parseFloat(r));
            const avg = arr.reduce((a, b) => a + b, 0) / arr.length;

            await dbRef.child(existingKey).update({
                ratings: userRatings,
                avgRating: avg.toFixed(1),
                film: existingData.film
            });
            showNotification(`Zaktualizowano ocenę: ${rating}`, 'success');
        } else {
            const key = normalizedFilm.replace(/[^a-z0-9]/g, '_');
            const userRatings = { [user]: rating.toString() };
            await dbRef.child(key).set({
                film: film,
                ratings: userRatings,
                avgRating: rating.toFixed(1),
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            showNotification(`Dodano: ${film}`, 'success');
        }
    } catch (err) {
        console.error(err);
        showNotification("Błąd zapisu", 'error');
    }

    document.getElementById("stepRating").classList.add("hidden");
    movieTitle.value = "";
    ratingInput.value = "";
    ratingSelect.selectedIndex = 0;
    movieTitle.focus();
}

// ============================================================
// SEKCJA 3: RANKING
// ============================================================

function setupRankingEventListeners() {
    const headers = document.querySelectorAll(".ranking-header-row div");
    if (headers) {
        headers.forEach(h => {
            h.addEventListener("click", () => {
                // Rozpoznajemy, w którą kolumnę kliknął użytkownik
                if (h.classList.contains('col-rank')) handleSort('rank');
                else if (h.classList.contains('col-change')) handleSort('change');
                else if (h.classList.contains('col-team')) handleSort('film');
                else if (h.classList.contains('col-pf')) handleSort('rating');
            });
        });
    }
}

function setupRankingListeners() {
    dbRef.on("value", snapshot => {
        if (snapshot.exists()) {
            data = [];
            snapshot.forEach(child => {
                const v = child.val();
                data.push({ 
                    id: child.key, 
                    film: v.film, 
                    ratings: v.ratings || { [v.user]: v.rating }, 
                    avgRating: v.avgRating || v.rating,
                    createdAt: v.createdAt || 0
                });
            });

            // --- NOWOŚĆ: Nadajemy twardy ranking na podstawie samej oceny ---
            // 1. Układamy dane od najlepszej do najgorszej oceny
            data.sort((a, b) => {
                const rA = parseFloat(a.avgRating || a.rating || 0);
                const rB = parseFloat(b.avgRating || b.rating || 0);
                return rB - rA; // sortowanie malejące
            });

            // 2. Każdemu filmowi zapisujemy na sztywno jego miejsce
            data.forEach((item, index) => {
                item.trueRank = index + 1;
            });

            renderFullTable();
        } else {
            const container = document.getElementById("rankingTilesContainer");
            if (container) container.innerHTML = '<div style="color: white; padding: 20px;">Brak danych w rankingu.</div>';
        }
    });
}

function loadInitialRankingData() { }

function renderFullTable() {
    renderTiles(data);
}

function filterTableLogic(term) {
    const filtered = data.filter(item => item.film.toLowerCase().includes(term));
    renderTiles(filtered);
}

// Funkcja generująca płynny gradient koloru na podstawie oceny (0-10)
function getDynamicRatingColor(avg) {
    // Zabezpieczenie przed dziwnymi wartościami (wymusza zakres 0-10)
    const rating = Math.max(0, Math.min(10, parseFloat(avg || 0)));

    if (rating >= 8.0) {
        // 8.0 do 10.0 -> Przejście w mocny fiolet motywu
        // Różowo-fioletowy przechodzi w głęboki, nasycony fiolet
        const progress = (rating - 8) / 2; // Progres od 0.0 do 1.0
        const hue = 290 - (progress * 30); // Zmiana barwy z 290 na 260
        const lightness = 70 - (progress * 10); // Odrobina przyciemnienia przy 10
        return `hsl(${hue}, 90%, ${lightness}%)`;
    } 
    else if (rating >= 5.0) {
        // 5.0 do 7.9 -> Pomarańcz przechodzący płynnie w zieleń
        const progress = (rating - 5) / 2.9; 
        const hue = 35 + (progress * 115); // Barwa z 35 (pomarańcz) na 150 (zieleń)
        return `hsl(${hue}, 85%, 55%)`;
    } 
    else {
        // 0.0 do 4.9 -> Czerwień przechodząca w pomarańcz
        const progress = rating / 4.9;
        const hue = progress * 35; // Barwa z 0 (czerwień) na 35 (pomarańcz)
        return `hsl(${hue}, 90%, 60%)`;
    }
}

// 2. Nowa uniwersalna funkcja do budowania kafelków
function renderTiles(dataToRender) {
    const container = document.getElementById("rankingTilesContainer");
    if (!container) return;

    container.innerHTML = "";
    const sorted = applyCurrentSortArray([...dataToRender]);

    sorted.forEach((item, index) => {
        const tile = document.createElement("div");
        tile.className = "ranking-tile";
        tile.dataset.id = item.id;
        
        // --- KLUCZOWE: PRAWY PRZYCISK MYSZY Z TWOJEGO KODU ---
        tile.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            // ---> BLOKADA <---
            if (!isAdmin) {
                showNotification("admin", "error");
                return;
            }
            showRatingDetails(item); 
        });

        // --- OCENA I KOLORY (PŁYNNE) ---
        const avg = parseFloat(item.avgRating || item.rating || 0);
        const ratingColor = getDynamicRatingColor(avg);

        // --- SPRAWDZANIE CZY FILM JEST NOWY (dodany max 3 dni temu) ---
        const TRZY_DNI_W_MS = 3 * 24 * 60 * 60 * 1000;
        let changeHTML = '<span style="color: var(--text-muted);">-</span>';
        
        if (item.createdAt && (Date.now() - item.createdAt < TRZY_DNI_W_MS)) {
            // Neutralny, elegancki wygląd "NEW" (biały z bardzo delikatną poświatą)
            changeHTML = '<span style="color: rgba(255, 255, 255, 0.85); font-weight: 800; font-size: 0.85rem;opacity: 0.75 ; letter-spacing: 1.5px; text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);">NEW</span>';
        }

        // --- STRUKTURA KAFELKA ---
        tile.innerHTML = `
            <div class="col-rank">${item.trueRank}</div>
            <div class="col-change">${changeHTML}</div>
            
            <div class="col-team">
                <div class="team-banner"></div>
                <span class="team-name" title="${item.film}">${item.film}</span>
                
                <div class="filmweb-icon-wrapper" title="Szukaj na Filmwebie">
                    <img class="fw-icon" src="https://www.filmweb.pl/favicon.ico" alt="FW">
                </div>
            </div>

            <div class="col-pf" style="color: ${ratingColor};">
                ${avg.toFixed(1)}
            </div>
        `;

        // --- LOGIKA KLIKNIĘCIA I HOVERA ---
        const fwWrapper = tile.querySelector('.filmweb-icon-wrapper');
        
        fwWrapper.addEventListener("click", (e) => {
            e.stopPropagation(); // Żeby nie kolidowało z innymi kliknięciami
            const query = encodeURIComponent(item.film);
            window.open(`https://www.filmweb.pl/search#/all?query=${query}`);
        });

        // --- WAŻNE: Dodanie gotowego kafelka na stronę ---
        container.appendChild(tile);
    });
}

function showRatingDetails(item) {
    const ratings = item.ratings || { [item.user]: item.rating };

    let detailsHTML = '<div class="rating-details-container">';
    detailsHTML += '<strong>Szczegóły ocen:</strong><br><br>';

    Object.entries(ratings).forEach(([user, rating]) => {
        detailsHTML += `
            <div class="rating-item">
                <div><strong>${user}:</strong> ${parseFloat(rating).toFixed(1)}</div>
                <div class="rating-actions">
                    <button class="btn-edit-rating" data-user="${user}">✎</button>
                    <button class="btn-delete-rating" data-user="${user}">🗑</button>
                </div>
            </div>
        `;
    });
    detailsHTML += `</div>`;

    const modalHTML = `
        <div id="ratingDetailsModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${item.film}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${detailsHTML}
                    <div class="modal-actions"><button id="closeRatingDetails" class="btn-cancel">Zamknij</button></div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('ratingDetailsModal');

    modal.querySelectorAll('.btn-edit-rating').forEach(btn => {
        btn.addEventListener('click', () => editUserRating(item, btn.dataset.user, ratings[btn.dataset.user]));
    });
    modal.querySelectorAll('.btn-delete-rating').forEach(btn => {
        btn.addEventListener('click', () => deleteUserRating(item, btn.dataset.user));
    });

    const closeModal = () => modal.remove();
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('#closeRatingDetails').addEventListener('click', closeModal);
}

function editUserRating(item, user, currentRating) {
    const newRating = prompt(`Nowa ocena użytkownika ${user}:`, currentRating);
    if (newRating === null) return;

    const parsed = parseFloat(newRating.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0 || parsed > 10) {
        showNotification("Błędna ocena", "error");
        return;
    }

    const updatedRatings = { ...item.ratings };
    updatedRatings[user] = parsed.toString();

    const arr = Object.values(updatedRatings).map(r => parseFloat(r));
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;

    dbRef.child(item.id).update({
        ratings: updatedRatings,
        avgRating: avg.toFixed(1)
    }).then(() => {
        showNotification("Zaktualizowano ocenę", "success");
        document.getElementById('ratingDetailsModal').remove();
    });
}

function deleteUserRating(item, user) {

    const updatedRatings = { ...item.ratings };
    delete updatedRatings[user];

    if (Object.keys(updatedRatings).length === 0) {
        dbRef.child(item.id).remove();
        showNotification("Usunięto film (brak ocen)", "success");
    } else {
        const arr = Object.values(updatedRatings).map(r => parseFloat(r));
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;

        dbRef.child(item.id).update({
            ratings: updatedRatings,
            avgRating: avg.toFixed(1)
        });
        showNotification("Usunięto ocenę", "success");
    }
    document.getElementById('ratingDetailsModal').remove();
}

function handleSort(header) {
    const key = header.dataset.sort;
    if (!key) return;
    if (currentSort.key === key) currentSort.dir *= -1;
    else currentSort = { key: key, dir: key === "rating" ? -1 : 1 };
    renderFullTable();
}

function handleSort(key) {
    if (!key) return;
    
    // Jeśli klikasz w to samo, odwróć kolejność (np. Z-A, najniższe oceny)
    if (currentSort.key === key) {
        currentSort.dir *= -1; 
    } else {
        // Domyślne kierunki dla pierwszego kliknięcia w daną kolumnę
        let defaultDir = 1; // Dla RANK i FILM: rosnąco (1-99, A-Z)
        if (key === 'rating' || key === 'change') {
            defaultDir = -1; // Dla OCENY i CHANGE: malejąco (Najwyższe oceny i najnowsze filmy na górze)
        }
        currentSort = { key: key, dir: defaultDir };
    }
    renderFullTable();
}

function applyCurrentSortArray(arr) {
    return arr.sort((a, b) => {
        if (currentSort.key === "rating") {
            // Sortowanie po ocenie
            const rA = parseFloat(a.avgRating || a.rating || 0);
            const rB = parseFloat(b.avgRating || b.rating || 0);
            return (rA - rB) * currentSort.dir;
            
        } else if (currentSort.key === "rank") {
            // Sortowanie po twardej pozycji w rankingu
            return (a.trueRank - b.trueRank) * currentSort.dir;
            
        } else if (currentSort.key === "change") {
            // Sortowanie od najnowszych (po dacie dodania)
            const tA = a.createdAt || 0;
            const tB = b.createdAt || 0;
            return (tA - tB) * currentSort.dir;
            
        } else {
            // Sortowanie alfabetyczne po tytule
            return a.film.localeCompare(b.film) * currentSort.dir;
        }
    });
}

function setupSearch() {
    const tableContainer = document.querySelector('.table-container');
    if (!tableContainer) return;

    const searchHTML = `
        <div class="search-container">
            <div class="search-wrapper">
                <input type="text" id="searchInput" class="search-input" placeholder="Szukaj filmu...">
                <button id="searchClear" class="search-clear-btn" title="Wyczyść">✕</button>
            </div>
        </div>
    `;

    const oldWrapper = document.querySelector('.search-container');
    if (oldWrapper) oldWrapper.remove();

    tableContainer.insertAdjacentHTML('beforebegin', searchHTML);

    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClear');

    searchInput.addEventListener('keyup', (e) => {
        const term = e.target.value.toLowerCase().trim();
        clearBtn.style.display = term.length > 0 ? 'block' : 'none';
        filterTableLogic(term);
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        filterTableLogic('');
        searchInput.focus();
    });
}

function filterTableLogic(term) {
    const filtered = data.filter(item => item.film.toLowerCase().includes(term));
    renderTiles(filtered);
}

// ============================================================
// SEKCJA 4: WSPÓLNE I UŻYTKOWNICY
// ============================================================

function setupUsersListener() {
    usersRef.on("value", snapshot => {
        if (snapshot.exists()) {
            users = Object.keys(snapshot.val());
        } else {
            users = [];
        }
        updateUserSelect();
        if (document.getElementById('usersList')) populateUsersList();
    });
}

function updateUserSelect() {
    const userSelect = document.getElementById("userSelect");
    if (!userSelect) return;

    const current = userSelect.value;
    userSelect.innerHTML = '<option value=""> wybierz użytkownika </option>';

    users.forEach(user => {
        const opt = document.createElement('option');
        opt.value = user;
        opt.textContent = user;
        userSelect.appendChild(opt);
    });

    if (current && users.includes(current)) userSelect.value = current;
}

function showAddUserModal() {
    const modalHTML = `
        <div id="addUserModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header"><h3>Nowy użytkownik</h3></div>
                <div class="modal-body">
                    <div class="modal-input-group">
                        <label>Nazwa użytkownika</label>
                        <input type="text" id="newUserName" placeholder="Nazwa..." maxlength="20">
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="cancelAddUser" class="btn-cancel">Anuluj</button>
                    <button id="confirmAddUser" class="btn-confirm">Dodaj</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('addUserModal');
    const closeModal = () => modal.remove();

    modal.querySelector('#cancelAddUser').addEventListener('click', closeModal);
    modal.querySelector('#confirmAddUser').addEventListener('click', () => {
        const name = document.getElementById('newUserName').value.trim();
        if (name && name.length >= 2) {
            if (!users.includes(name.toLowerCase())) {
                usersRef.child(name.toLowerCase()).set(true);
                showNotification(`Dodano: ${name}`, 'success');
                closeModal();
            } else {
                showNotification('Użytkownik już istnieje', 'error');
            }
        }
    });
}

function showManageUsersModal() {
    const modalHTML = `
        <div id="manageUsersModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header"><h3>Zarządzaj użytkownikami</h3></div>
                <div class="modal-body">
                    <div class="users-list" id="usersList">Ładowanie...</div>
                </div>
                <div class="modal-footer">
                    <button id="closeManage" class="btn-cancel" style="width: 100%;">Zamknij</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    populateUsersList();
    const modal = document.getElementById('manageUsersModal');
    const closeModal = () => modal.remove();
    modal.querySelector('#closeManage').addEventListener('click', closeModal);
}

function populateUsersList() {
    const list = document.getElementById('usersList');
    if (!list) return;
    list.innerHTML = '';

    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `<span>${user}</span>`;

        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑';
        delBtn.className = 'btn-delete-user';

        delBtn.onclick = () => {
                usersRef.child(user).remove();
                showNotification('Usunięto', 'success');
        };
        div.appendChild(delBtn);
        list.appendChild(div);
    });
}

// ============================================================
// SEKCJA 5: SCROLLOWANIE (STRZAŁKI)
// ============================================================

function setupScrollButtons() {
    const scrollHTML = `
        <div id="scrollDownBtn" class="scroll-btn" title="Down">↓</div>
        <div id="scrollUpBtn" class="scroll-btn" title="Up">↑</div>
    `;
    document.body.insertAdjacentHTML('beforeend', scrollHTML);

    const scrollUpBtn = document.getElementById('scrollUpBtn');
    const scrollDownBtn = document.getElementById('scrollDownBtn');

    scrollUpBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    scrollDownBtn.addEventListener('click', () => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

        if (scrollY > 200) scrollUpBtn.classList.add('visible');
        else scrollUpBtn.classList.remove('visible');

        if (scrollY < maxScroll - 50) scrollDownBtn.classList.add('visible');
        else scrollDownBtn.classList.remove('visible');
    });

    window.dispatchEvent(new Event('scroll'));
}

function setupTopBarSettings() {
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsMenu = document.getElementById('settingsMenu');
    
    const bgToggleBtn = document.getElementById('bgToggle');
    const bgIcon = document.getElementById('bgIcon');
    
    const themeToggleBtn = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    
    if (!settingsToggle || !settingsMenu) return;

    // Rozwijanie / zwijanie menu
    settingsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!settingsMenu.contains(e.target)) {
            settingsMenu.classList.remove('show');
        }
    });

    // CZYSTE IKONY SVG ZGODNE Z DESIGNEM
    const svgMoon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    const svgSun = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    
    const svgSparkles = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.485-6.364l-2.121 2.121M7.636 17.678l-2.121 2.121m13.435 0l-2.121-2.121M7.636 6.364L5.515 4.243"/></svg>`;
    const svgImage = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;

    // --- 1. Logika Motywu ---
    let isLightMode = localStorage.getItem('lightMode') === 'true';
    
    const updateThemeIcon = () => {
        if (themeIcon) {
            themeIcon.innerHTML = isLightMode ? svgSun : svgMoon;
        }
    };
    updateThemeIcon();

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            isLightMode = !isLightMode;
            localStorage.setItem('lightMode', isLightMode);
            updateThemeIcon();
            // Możesz tu dodać ewentualnie dodawanie klasy dla trybu jasnego, 
            // jeśli użyjesz go z kropką "white".
        });
    }

    // --- 2. Logika Tła ---
    let isStatic = localStorage.getItem('staticBg') === 'true';

    const updateBgState = () => {
        document.body.classList.toggle('static-mode', isStatic);
        if (bgIcon) {
            bgIcon.innerHTML = isStatic ? svgImage : svgSparkles;
        }
    };
    updateBgState();

    if (bgToggleBtn) {
        bgToggleBtn.addEventListener('click', () => {
            isStatic = !isStatic;
            localStorage.setItem('staticBg', isStatic);
            updateBgState();
        });
    }
}

// ----------------------------
// UTILS
// ----------------------------
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.className = `notification notification-${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => {
        if (notif.parentNode) {
            notif.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }
    }, 3000);
}

function setupThemeChanger() {
    const themeDots = document.querySelectorAll('.theme-dot');
    const savedTheme = localStorage.getItem('selectedTheme') || 'original';

    const originalNotify = window.showNotification;
    window.showNotification = function () { };
    changeTheme(savedTheme);
    window.showNotification = originalNotify;
    updateActiveDot(savedTheme);

    themeDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const theme = dot.getAttribute('data-theme');
            const originalNotify = window.showNotification;
            window.showNotification = function () { };
            changeTheme(theme);
            window.showNotification = originalNotify;
            updateActiveDot(theme);
            localStorage.setItem('selectedTheme', theme);
        });
    });
}

function updateActiveDot(themeName) {
    document.querySelectorAll('.theme-dot').forEach(dot => {
        if (dot.getAttribute('data-theme') === themeName) dot.classList.add('active');
        else dot.classList.remove('active');
    });
}

function changeTheme(themeName) {
    const themes = {
        white: { background: '#050505', surface: '#1a1a1a', primary: '#ffffff', glow1: 'rgba(255, 255, 255, 0.12)', glow2: 'rgba(200, 200, 200, 0.04)', filter: 'grayscale(1) brightness(2)' },
        blue: { background: '#0a0a1a', surface: '#15152b', primary: '#00d4ff', glow1: 'rgba(0, 212, 255, 0.15)', glow2: 'rgba(0, 100, 255, 0.05)', filter: 'hue-rotate(-90deg)' },
        purple: { background: '#1a0a1a', surface: '#2d152b', primary: '#d946ef', glow1: 'rgba(217, 70, 239, 0.15)', glow2: 'rgba(150, 0, 200, 0.05)', filter: 'hue-rotate(30deg)' },
        green: { background: '#0a1a0a', surface: '#152b15', primary: '#10b981', glow1: 'rgba(16, 185, 129, 0.15)', glow2: 'rgba(0, 100, 50, 0.05)', filter: 'hue-rotate(180deg)' },
        red: { background: '#1a0a0a', surface: '#2b1515', primary: '#ef4444', glow1: 'rgba(239, 68, 68, 0.15)', glow2: 'rgba(150, 0, 0, 0.05)', filter: 'hue-rotate(70deg)' },
        orange: { background: '#1a100a', surface: '#2b1d15', primary: '#f97316', glow1: 'rgba(249, 115, 22, 0.15)', glow2: 'rgba(200, 50, 0, 0.05)', filter: 'hue-rotate(100deg)' },
        original: { background: '#0f0f1f', surface: 'rgba(25, 25, 45, 0.8)', primary: '#8b5cf6', glow1: 'rgba(139, 92, 246, 0.15)', glow2: 'rgba(64, 147, 193, 0.05)', filter: 'none' }
    };

    const theme = themes[themeName] || themes.original;
    const root = document.documentElement;

    // EFEKT SHIMMER: Wymuszenie rozbłysku przy kliknięciu
    document.body.classList.remove('theme-changing');
    void document.body.offsetWidth; // Magiczny hack (reflow) resetujący animację, żeby można było klikać szybko wiele razy
    document.body.classList.add('theme-changing');

    // Zmiana zmiennych CSS pod maską
    root.style.setProperty('--background', theme.background);
    root.style.setProperty('--surface', theme.surface);
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--glow1', theme.glow1);
    root.style.setProperty('--glow2', theme.glow2);
    root.style.setProperty('--particle-filter', theme.filter);

    // Posprzątanie klasy po zakończeniu animacji
    setTimeout(() => {
        document.body.classList.remove('theme-changing');
    }, 1500);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) changeTheme(savedTheme);
}

document.addEventListener('DOMContentLoaded', initApp);

// ==========================================
// --- LOGIKA MOTYWU (JASNY/CIEMNY) ---
// ==========================================
const themeToggleBtn = document.getElementById('themeToggle');
const htmlElement = document.documentElement; 

if (themeToggleBtn) {
    const sunIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    const moonIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'light') {
        htmlElement.classList.add('dark'); // dark klasa u Ciebie to jasny motyw
        themeToggleBtn.innerHTML = sunIcon;
    } else {
        htmlElement.classList.remove('dark');
        themeToggleBtn.innerHTML = moonIcon;
    }

    themeToggleBtn.addEventListener('click', () => {
        htmlElement.classList.toggle('dark');
        
        if (htmlElement.classList.contains('dark')) {
            localStorage.setItem('theme', 'light');
            themeToggleBtn.innerHTML = sunIcon;
        } else {
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.innerHTML = moonIcon;
        }
    });
}

// ==========================================
// --- LOGIKA TŁA (ANIMOWANE / STATYCZNE) ---
// ==========================================
const bgToggleBtn = document.getElementById('bgToggle');
const fluidCanvas = document.getElementById('fluid-canvas'); // stary canvas
const ambientBg = document.querySelector('.ambient-bg');     // nowe bańki
const contentCanvas = document.querySelector('.content--canvas'); 

if (bgToggleBtn) {
    let isStatic = localStorage.getItem('staticBg') === 'true';

    const updateBgState = () => {
        if (isStatic) {
            // Ukrywamy płyny i bańki, dodajemy klasę dla siatki statycznej
            if (fluidCanvas) fluidCanvas.style.opacity = '0';
            if (ambientBg) ambientBg.style.opacity = '0';
            if (contentCanvas) contentCanvas.style.opacity = '0';
            document.body.classList.add('static-mode');
        } else {
            // Pokazujemy z powrotem
            if (fluidCanvas) fluidCanvas.style.opacity = '1';
            if (ambientBg) ambientBg.style.opacity = '1';
            if (contentCanvas) contentCanvas.style.opacity = '1';
            document.body.classList.remove('static-mode');
        }
    };

    // Odpalamy przy wejściu na stronę
    updateBgState();

    bgToggleBtn.addEventListener('click', () => {
        isStatic = !isStatic;
        localStorage.setItem('staticBg', isStatic);
        updateBgState();
        showNotification(isStatic ? "Tryb wydajności: Tło statyczne" : "Tło animowane włączone", "info");
    });
}
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
let currentUser = "";
let isAdmin = false;
let isLoggedIn = false;
let loggedGuestName = "";

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

    setupUsersListener();
}

// ----------------------------
// AUTORYZACJA (ADMIN & GOŚĆ)
// ----------------------------
function setupAuth() {
    const auth = firebase.auth();
    const googleProvider = new firebase.auth.GoogleAuthProvider(); // Dostawca Google

    const authUI = `
        <div class="admin-login-trigger" id="loginTrigger" title="Logowanie" style="display: block;">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M34.2824 14.3746V16.6546H31.9874V18.9496H29.7074V21.2296H27.4274V25.8046H29.7074V28.0846H31.9874V30.3796H34.2824V32.6596H36.5624V25.8046H45.7124V21.2296H36.5624V14.3746H34.2824ZM31.9874 37.2346H34.2824V41.8096H31.9874V37.2346ZM31.9874 2.94458H34.2824V9.79958H31.9874V2.94458ZM22.8524 46.3696V44.0896H31.9874V41.8096H22.8524V12.0946H20.5724V46.3696H22.8524ZM13.7024 46.3696H20.5724V48.6646H13.7024V46.3696ZM15.9974 25.8046H18.2774V30.3796H15.9974V25.8046ZM15.9974 9.79958H20.5724V12.0946H15.9974V9.79958ZM9.14238 44.0896H13.7024V46.3696H9.14238V44.0896ZM11.4224 7.51958H15.9974V9.79958H11.4224V7.51958ZM4.56738 41.8096H9.14238V44.0896H4.56738V41.8096ZM6.84738 5.23958H11.4224V7.51958H6.84738V5.23958Z" fill="currentColor"/>
                <path d="M4.5676 0.664551V2.94455H2.2876V41.8095H4.5676V5.23955H6.8476V2.94455H31.9876V0.664551H4.5676Z" fill="currentColor"/>
            </svg>
        </div>
        
        <div class="admin-logout-trigger" id="logoutBtn" title="Wyloguj" style="display: none;">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0_47_8)"><path d="M25.1449 9.14V13.71H19.0449V16.76H25.1449V21.33H26.6649V19.81H28.1949V18.29H29.7149V16.76H31.2349V13.71H29.7149V12.19H28.1949V10.67H26.6649V9.14H25.1449ZM20.5749 21.33H22.0949V27.43H20.5749V21.33ZM20.5749 1.52H22.0949V9.14H20.5749V1.52ZM14.4749 30.48V28.95H20.5749V27.43H14.4749V7.62H12.9549V30.48H14.4749ZM8.38491 30.48H12.9549V32H8.38491V30.48ZM9.90491 16.76H11.4249V19.81H9.90491V16.76ZM9.90491 6.1H12.9549V7.62H9.90491V6.1ZM5.33491 28.95H8.38491V30.48H5.33491V28.95ZM6.85491 4.57H9.90491V6.1H6.85491V4.57ZM2.28491 27.43H5.33491V28.95H2.28491V27.43ZM3.81491 3.05H6.85491V4.57H3.81491V3.05Z" fill="#B3B3B3"/><path d="M2.28489 0V1.52H0.764893V27.43H2.28489V3.05H3.81489V1.52H20.5749V0H2.28489Z" fill="#B3B3B3"/></g><defs><clipPath id="clip0_47_8"><rect width="32" height="32" fill="white"/></clipPath></defs>
            </svg>
        </div>
        
        <div id="loginModal" class="modal-overlay hidden">
            <div class="modal-content login-content" style="max-width: 380px;">
                <div class="modal-header"><h3>Zaloguj się</h3><button class="modal-close-login">&times;</button></div>
                <div class="modal-body" style="display: flex; flex-direction: column; gap: 15px;">
                    
                    <button id="doGoogleLoginBtn" style="display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 12px; background: #fff; color: #1a1a1a; border: none; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                        <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Logowanie Google
                    </button>

                    <div style="display: flex; align-items: center; text-align: center; color: rgba(255,255,255,0.3); font-size: 0.8rem; margin: 5px 0;">
                        <span style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></span>
                        <span style="padding: 0 10px; text-transform: uppercase; letter-spacing: 1px;">lub jako admin</span>
                        <span style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></span>
                    </div>

                    <input type="email" id="adminEmail" placeholder="Email admina" class="form-input">
                    <input type="password" id="adminPass" placeholder="Hasło" class="form-input">
                    <button id="doLoginBtn" class="btn-confirm full-width">Zaloguj klasycznie</button>
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
    const doGoogleLoginBtn = document.getElementById('doGoogleLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginTrigger) loginTrigger.addEventListener('click', () => loginModal.classList.remove('hidden'));
    if (closeLogin) closeLogin.addEventListener('click', () => loginModal.classList.add('hidden'));

    // Klasyczne logowanie (Admin)
    if (doLoginBtn) doLoginBtn.addEventListener('click', () => {
        const email = document.getElementById('adminEmail').value;
        const pass = document.getElementById('adminPass').value;
        auth.signInWithEmailAndPassword(email, pass)
            .then(() => {
                loginModal.classList.add('hidden');
                document.getElementById('adminEmail').value = '';
                document.getElementById('adminPass').value = '';
            })
            .catch(error => document.getElementById('loginError').textContent = "Błąd: " + error.message);
    });

    // NOWOŚĆ: Logowanie Google (Gość) - Wersja z Popupem
    if (doGoogleLoginBtn) doGoogleLoginBtn.addEventListener('click', () => {
        auth.signInWithPopup(googleProvider)
            .then(() => {
                const loginModal = document.getElementById('loginModal');
                if (loginModal) loginModal.classList.add('hidden');
            })
            .catch(error => {
                const errEl = document.getElementById('loginError');
                if (errEl) errEl.textContent = "Błąd Google: " + error.message;
            });
    });

    if (logoutBtn) logoutBtn.addEventListener('click', () => auth.signOut().then(() => showNotification('Wylogowano', 'info')));

    // Reakcja na zmianę stanu logowania
    auth.onAuthStateChanged(user => {
        if (user) {
            isLoggedIn = true;
            document.getElementById('loginTrigger').style.display = 'none';
            document.getElementById('logoutBtn').style.display = 'block';

            const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');

            if (!isGoogleUser) {
                // TRYB ADMINA (Odblokowany)
                isAdmin = true;
                loggedGuestName = "";
                document.body.classList.add('is-admin');
                showNotification('Zalogowano jako Admin', 'success');
                
                // Zdejmujemy ewentualną blokadę z dropdowna
                const userSelect = document.getElementById("userSelect");
                if (userSelect) userSelect.disabled = false;
            } else {
                // TRYB GOŚCIA (Zablokowany)
                isAdmin = false;
                document.body.classList.remove('is-admin');
                
                loggedGuestName = user.displayName.split(' ')[0].toLowerCase();
                showNotification(`Witaj, ${loggedGuestName}!`, 'success');
                usersRef.child(loggedGuestName).set(true);

                // Automatyczne ustawienie i ZABLOKOWANIE wyboru użytkownika
                setTimeout(() => {
                    const userSelect = document.getElementById("userSelect");
                    if (userSelect) {
                        // Upewniamy się, że jego imię jest na liście, jak nie to dodajemy
                        if (!Array.from(userSelect.options).some(opt => opt.value === loggedGuestName)) {
                            userSelect.add(new Option(loggedGuestName, loggedGuestName));
                        }
                        userSelect.value = loggedGuestName;
                        userSelect.disabled = true; // <--- MAGIA: Blokuje klikanie w listę!
                        userSelect.style.opacity = "0.7"; 
                        handleUserSelect(); 
                    }
                }, 1000);
            }
        } else {
            // TRYB NIEZALOGOWANY
            isLoggedIn = false;
            isAdmin = false;
            loggedGuestName = "";
            document.body.classList.remove('is-admin');
            document.getElementById('loginTrigger').style.display = 'block';
            document.getElementById('logoutBtn').style.display = 'none';
            
            const userSelect = document.getElementById("userSelect");
            if (userSelect) {
                userSelect.disabled = false;
                userSelect.style.opacity = "1";
            }
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

    // 1. PRZYWRÓCONE AKCJE GŁÓWNYCH PRZYCISKÓW (tego brakowało!)
    if (userSelect) userSelect.addEventListener("change", handleUserSelect);
    if (nextBtn) nextBtn.addEventListener("click", handleNextStep);
    if (saveBtn) saveBtn.addEventListener("click", handleSaveRating);

    // Enter przechodzi dalej z tytułu
    if (movieTitle) {
        movieTitle.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleNextStep();
        });
    }

    // Enter zapisuje ocenę
    if (ratingInput) {
        ratingInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleSaveRating();
        });
    }

    // 2. NOWOŚĆ: Obsługa rozwijania i dodawania kolejnych sezonów
    const seasonToggle = document.getElementById("seasonToggle");
    const seasonsContainer = document.getElementById("seasonsContainer");
    const addAnotherSeasonBtn = document.getElementById("addAnotherSeasonBtn");
    const seasonsList = document.getElementById("seasonsList");

    if (seasonToggle && seasonsContainer) {
        seasonToggle.addEventListener("click", () => {
            seasonsContainer.classList.toggle("hidden");
            seasonToggle.textContent = seasonsContainer.classList.contains("hidden") 
                ? "+ Dodaj oceny sezonów (opcjonalnie)" 
                : "- Ukryj opcje sezonów";
        });
    }

    if (addAnotherSeasonBtn && seasonsList) {
        addAnotherSeasonBtn.addEventListener("click", () => {
            const newRow = document.createElement("div");
            newRow.className = "season-row";
            newRow.style.cssText = "display: flex; gap: 10px; align-items: center;";
            newRow.innerHTML = `
                <input type="number" class="form-input season-num-input" placeholder="Nr sezonu" style="width: 90px; text-align: center;">
                <input type="number" class="form-input season-rating-input" step="0.1" min="0" max="10" placeholder="Ocena sezonu" style="flex: 1; text-align: center;">
                <button class="remove-season-btn" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem; padding: 0 5px;" title="Usuń">✕</button>
            `;
            
            // Obsługa czerwonego krzyżyka do usuwania rzędu
            newRow.querySelector(".remove-season-btn").addEventListener("click", (e) => {
                e.target.parentElement.remove();
            });

            seasonsList.appendChild(newRow);
        });
    }
} // <--- Przywrócona zamykająca klamra!


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
    // Od teraz blokuje tylko osoby kompletnie wylogowane
    if (!isLoggedIn && !isAdmin) {
        showNotification("🔒 Zaloguj się przez Google, aby dodawać oceny", "error");
        return;
    }

    const userSelect = document.getElementById("userSelect");
    const movieTitle = document.getElementById("movieTitle");
    const ratingInput = document.getElementById("ratingInput");
    const ratingSelect = document.getElementById("ratingSelect");
    const noteInput = document.getElementById("noteInput");

    const user = userSelect.value;
    const film = movieTitle.value.trim();
    let ratingText = ratingInput.value.trim() || ratingSelect.value;
    ratingText = ratingText.replace(',', '.');
    const mainRating = parseFloat(ratingText);
    const note = noteInput ? noteInput.value.trim() : "";

    if (!user || !film) return;

    // 1. Zbieramy dane o sezonach ZANIM sprawdzimy ocenę główną
    const seasonRows = document.querySelectorAll(".season-row");
    let seasonsToSave = [];
    seasonRows.forEach(row => {
        const numInput = row.querySelector(".season-num-input").value;
        const sRatingRaw = row.querySelector(".season-rating-input").value;
        if (numInput && sRatingRaw) {
            const sRating = parseFloat(sRatingRaw.replace(',', '.'));
            if (!isNaN(sRating) && sRating >= 0 && sRating <= 10) {
                seasonsToSave.push({ num: numInput, rating: sRating });
            }
        }
    });

    const hasMainRating = !isNaN(mainRating) && mainRating >= 0 && mainRating <= 10;

    // Możesz teraz dodać TYLKO sezon bez oceny głównej!
    if (!hasMainRating && seasonsToSave.length === 0) {
        showNotification("Podaj ocenę główną LUB ocenę sezonu!", 'error');
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

        const finalKey = existingKey || normalizedFilm.replace(/[^a-z0-9]/g, '_');

        // 2. Zapis Oceny Głównej (tylko jeśli ją wpisano)
        if (hasMainRating) {
            if (existingKey && existingData) {
                const userRatings = existingData.ratings || {};
                userRatings[user] = mainRating.toString();
                
                const userNotes = existingData.notes || {};
                if (note) userNotes[user] = note; 
                else delete userNotes[user];

                const arr = Object.values(userRatings).map(r => parseFloat(r));
                const avg = arr.reduce((a, b) => a + b, 0) / arr.length;

                await dbRef.child(existingKey).update({
                    ratings: userRatings,
                    notes: userNotes,
                    avgRating: avg.toFixed(1),
                    film: existingData.film
                });
                showNotification(`Zaktualizowano ocenę ogólną: ${mainRating}`, 'success');
            } else {
                const userRatings = { [user]: mainRating.toString() };
                const userNotes = note ? { [user]: note } : {};
                
                await dbRef.child(finalKey).set({
                    film: film,
                    ratings: userRatings,
                    notes: userNotes,
                    avgRating: mainRating.toFixed(1),
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
                showNotification(`Dodano do bazy: ${film}`, 'success');
            }
        } else if (!existingKey) {
            // Nowy serial, ale dodany BEZ oceny głównej (tylko sezony)
            await dbRef.child(finalKey).set({
                film: film,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
        }

        // 3. PANCERNY Zapis Sezonów (Naprawiony błąd asynchroniczności)
        let addedSeasonsCount = 0;
        for (const s of seasonsToSave) {
            await dbRef.child(finalKey).child('seasons').child(s.num).child('ratings').child(user).set(s.rating.toString());
            addedSeasonsCount++;
        }

        if (addedSeasonsCount > 0) {
            showNotification(`Zapisano ${addedSeasonsCount} sezon(y)!`, 'success');
        }

        // 4. Czyszczenie Formularza
        document.getElementById("stepRating").classList.add("hidden");
        const sContainer = document.getElementById("seasonsContainer");
        if (sContainer) sContainer.classList.add("hidden");
        
        const sToggle = document.getElementById("seasonToggle");
        if (sToggle) sToggle.textContent = "+ Dodaj oceny sezonów (opcjonalnie)";
        
        movieTitle.value = "";
        ratingInput.value = "";
        ratingSelect.selectedIndex = 0;
        if (noteInput) noteInput.value = "";
        
        const sList = document.getElementById("seasonsList");
        if (sList) {
            sList.innerHTML = `
                <div class="season-row" style="display: flex; gap: 10px; align-items: center;">
                    <input type="number" class="form-input season-num-input" placeholder="Nr sezonu" style="width: 90px; text-align: center;">
                    <input type="number" class="form-input season-rating-input" step="0.1" min="0" max="10" placeholder="Ocena sezonu" style="flex: 1; text-align: center;">
                </div>
            `;
        }
        movieTitle.focus();

    } catch (err) {
        console.error(err);
        showNotification("Błąd zapisu", 'error');
    }
}

// ============================================================
// SEKCJA 3: WSPÓLNE I UŻYTKOWNICY
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
    // --- 1. Logika Motywu ---
    let isLightMode = localStorage.getItem('lightMode') === 'true';
    
    const updateThemeIcon = () => {
        if (themeIcon) {
            themeIcon.innerHTML = isLightMode ? svgSun : svgMoon;
        }
        
        // Dodawanie/usuwanie klasy z elementu <html>
        if (isLightMode) {
            document.documentElement.classList.add('light-mode');
        } else {
            document.documentElement.classList.remove('light-mode');
        }
    };
    
    // Wywołanie przy starcie, aby wczytać zapisany stan
    updateThemeIcon();

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            isLightMode = !isLightMode;
            localStorage.setItem('lightMode', isLightMode);
            updateThemeIcon();
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

// ============================================================
// AUTOUZUPEŁNIANIE (PODPOWIEDZI FILMÓW TMDB)
// ============================================================
const TMDB_API_KEY_AUTO = "48c52791cb1b9e1161aa996403fd4299"; // Twój klucz API

function setupAutocomplete() {
    const input = document.getElementById('movieTitle');
    if (!input) return;

    // 1. Tworzymy kontener na wyniki
    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    dropdown.id = 'autocompleteResults';
    
    // 2. Owijamy Twój input w "wrapper", żeby lista rozwijała się idealnie pod nim
    const wrapper = document.createElement('div');
    wrapper.className = 'autocomplete-wrapper';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    wrapper.appendChild(dropdown);

    let timeoutId;

    // 3. Nasłuchujemy, co wpisujesz
    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(timeoutId); // Kasujemy poprzednie odliczanie
        
        if (query.length < 2) {
            dropdown.style.display = 'none'; // Ukryj, jeśli mniej niż 2 znaki
            return;
        }

        // Czekamy ułamek sekundy (300ms) po tym jak przestaniesz pisać, żeby nie spamować API
        timeoutId = setTimeout(async () => {
            try {
                const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY_AUTO}&query=${encodeURIComponent(query)}&language=pl-PL`);
                const data = await res.json();
                
                // Wybieramy tylko filmy i seriale (bez aktorów) i bierzemy top 5 wyników
                const results = (data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv').slice(0, 5);

                if (results.length > 0) {
                    dropdown.innerHTML = ''; // Czyścimy starą listę
                    
                    results.forEach(item => {
                        const title = item.title || item.name;
                        const year = (item.release_date || item.first_air_date || "").substring(0, 4);
                        const poster = item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : 'https://pub-c4bdff47af9f412bb44968e460266513.r2.dev/cf05c8b7-c646-40f6-9c14-a58df7de2b7a-77717a77-8185-4545-9d81-47efc7e56cfe.png';
                        
                        const div = document.createElement('div');
                        div.className = 'autocomplete-item';
                        div.innerHTML = `
                            <img src="${poster}" class="autocomplete-poster" alt="Plakat">
                            <div class="autocomplete-details">
                                <span class="autocomplete-title">${title}</span>
                                <span class="autocomplete-year">${year ? '(' + year + ')' : ''}</span>
                            </div>
                        `;
                        
                        // 4. Co się dzieje po kliknięciu w podpowiedź?
                        div.addEventListener('click', () => {
                            // Wklejamy do pola Tytuł wraz z Rokiem!
                            input.value = year ? `${title} (${year})` : title;
                            dropdown.style.display = 'none'; // Zamykamy listę
                            input.focus(); // Zostawiamy kursor w polu
                        });
                        
                        dropdown.appendChild(div);
                    });
                    dropdown.style.display = 'block'; // Pokazujemy listę
                } else {
                    dropdown.style.display = 'none';
                }
            } catch (err) {
                console.error('Błąd autouzupełniania', err);
            }
        }, 300);
    });

    // 5. Zamykanie listy, jeśli klikniesz gdziekolwiek indziej na ekranie
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

// Uruchamiamy funkcję, gdy strona się załaduje
document.addEventListener('DOMContentLoaded', () => {
    setupAutocomplete();
});

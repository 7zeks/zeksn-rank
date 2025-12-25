// ----------------------------
// WYKRYWANIE STRONY (ROUTER)
// ----------------------------
const isRankingPage = document.getElementById('rankingTable') !== null;
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

// ----------------------------
// INICJALIZACJA APLIKACJI
// ----------------------------
function initApp() {
    console.log('Startowanie aplikacji...');
    
    // 1. Wspólne dla wszystkich stron (Motywy)
    loadSavedTheme();
    setupThemeChanger();

    // 2. Logika dla Strony Głównej (Index)
    if (isMainPage) {
        console.log('>>> Setup Index');
        setupAddUserButton(); 
        setupIndexEventListeners();
        populateRatingSelect();
    }

    // 3. Logika dla Rankingu
    if (isRankingPage) {
        console.log('>>> Setup Ranking');
        setupSearch();
        setupRankingEventListeners();
        setupRankingListeners();
        // Fallback dla initial load
        loadInitialRankingData();
    }

    // 4. Logika dla Restream
    if (isRestreamPage) {
        console.log('>>> Setup Restream');
        setupRestreamLogic();
    }

    // 5. Pobieranie użytkowników (potrzebne wszędzie)
    setupUsersListener();
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
            <div style="display:flex; gap:10px;">
                <button id="addUserBtn" style="background: var(--success); flex:1;">Nowy</button>
                <button id="manageUsersBtn" style="background: var(--warning); flex:1;">Zarządzaj</button>
            </div>
        </div>
    `;
    panel.insertAdjacentHTML('afterbegin', addUserHTML);
    
    document.getElementById('addUserBtn').addEventListener('click', showAddUserModal);
    document.getElementById('manageUsersBtn').addEventListener('click', showManageUsersModal);
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
    
    if(!ratingSelect || ratingSelect.options.length > 1) return;
    
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
    
    ratingSelect.addEventListener('change', function() {
        if(this.value && ratingInput) {
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
            const avg = arr.reduce((a,b)=>a+b,0) / arr.length;
            
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
// SEKCJA 2: RESTREAM
// ============================================================

function setupRestreamLogic() {
    const addButton = document.getElementById('addRestreamRow');
    const syncStatus = document.getElementById('syncStatus');

    restreamRef.on("value", snapshot => {
        if (snapshot.exists()) {
            restreamSites = Object.values(snapshot.val());
            renderRestreamRows();
            if(syncStatus) syncStatus.textContent = "(zsynchronizowano)";
        } else {
            restreamSites = [];
            renderRestreamRows();
        }
    });

    if (addButton) {
        addButton.addEventListener('click', () => {
            let counter = 1;
            let baseName = 'Nowa strona';
            let newName = baseName;
            while (restreamSites.some(s => s.name === newName)) {
                counter++;
                newName = `${baseName} ${counter}`;
            }
            restreamSites.push({ name: newName, url: 'https://', createdAt: new Date().toISOString() });
            saveRestreamSites();
        });
    }
}

function saveRestreamSites() {
    restreamRef.set(restreamSites).catch(err => showNotification('Błąd zapisu Restream', 'error'));
}

function renderRestreamRows() {
    const rowsContainer = document.getElementById('restreamRows');
    if (!rowsContainer) return;
    rowsContainer.innerHTML = '';
    
    if (restreamSites.length === 0) {
        rowsContainer.innerHTML = `<div class="restream-empty-state"><div class="icon">📺</div><div class="title">Brak stron</div></div>`;
        return;
    }
    
    restreamSites.forEach((site, index) => {
        const row = document.createElement('div');
        row.className = 'restream-row';
        
        const nameContainer = document.createElement('div');
        nameContainer.style.display = 'flex';
        nameContainer.style.alignItems = 'center';
        nameContainer.style.gap = '10px';
        
        const nameLink = document.createElement('a');
        nameLink.href = site.url;
        nameLink.target = '_blank';
        nameLink.textContent = site.name || '[bez nazwy]';
        nameLink.className = 'restream-name-link';
        
        const editIcon = document.createElement('span');
        editIcon.textContent = '✏️';
        editIcon.style.cursor = 'pointer';
        editIcon.style.opacity = '0.5';
        editIcon.onclick = () => {
            const newName = prompt('Zmień nazwę:', site.name);
            if (newName) {
                restreamSites[index].name = newName;
                saveRestreamSites();
            }
        };
        
        nameContainer.appendChild(nameLink);
        nameContainer.appendChild(editIcon);
        
        const urlInput = document.createElement('input');
        urlInput.className = 'restream-url-input';
        urlInput.value = site.url;
        urlInput.placeholder = 'https://...';
        urlInput.onchange = (e) => {
            let val = e.target.value.trim();
            if (val && !val.startsWith('http')) val = 'https://' + val;
            restreamSites[index].url = val;
            saveRestreamSites();
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'restream-delete-btn';
        deleteBtn.textContent = '🗑️';
        deleteBtn.onclick = () => {
            if(confirm(`Usunąć "${site.name}"?`)) {
                restreamSites.splice(index, 1);
                saveRestreamSites();
            }
        };
        
        row.appendChild(nameContainer);
        row.appendChild(urlInput);
        row.appendChild(deleteBtn);
        rowsContainer.appendChild(row);
    });
}

// ============================================================
// SEKCJA 3: RANKING
// ============================================================

function setupRankingEventListeners() {
    const headers = document.querySelectorAll("#rankingTable th");
    if (headers) {
        headers.forEach(h => h.addEventListener("click", () => handleSort(h)));
    }
}

function setupRankingListeners() {
    const tbody = document.querySelector("#rankingTable tbody");
    
    dbRef.on("value", snapshot => {
        if (snapshot.exists()) {
            data = [];
            snapshot.forEach(child => {
                const v = child.val();
                data.push(v.ratings ? 
                    { id: child.key, film: v.film, ratings: v.ratings, avgRating: v.avgRating } :
                    { id: child.key, film: v.film, ratings: {[v.user]: v.rating}, avgRating: v.rating });
            });
            renderFullTable();
        } else {
            if (tbody) tbody.innerHTML = '';
        }
    });
}

function loadInitialRankingData() {
    // Fallback if needed
}

function renderFullTable() {
    const tbody = document.querySelector("#rankingTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    const sorted = applyCurrentSortArray([...data]);
    
    sorted.forEach(item => {
        const tr = document.createElement("tr");
        tr.dataset.id = item.id;
        
        // --- KLUCZOWE: PRAWY PRZYCISK MYSZY ---
        tr.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            showRatingDetails(item); // Wywołanie menu kontekstowego
        });
        
        // Tytuł
        const tdFilm = document.createElement("td");
        tdFilm.innerHTML = `<span style="font-weight:500">${item.film}</span>`;
        tr.appendChild(tdFilm);
        
        // Ocena
        const tdRating = document.createElement("td");
        const avg = parseFloat(item.avgRating || item.rating || 0);
        tdRating.textContent = avg.toFixed(1);
        tdRating.style.textAlign = 'center';
        tdRating.style.fontWeight = '700';
        
        if (avg >= 8) tdRating.style.color = '#10b981';
        else if (avg >= 5) tdRating.style.color = '#f59e0b';
        else tdRating.style.color = '#ef4444';
        
        tr.appendChild(tdRating);
        tbody.appendChild(tr);
    });
}

// --- NOWA FUNKCJA: Szczegóły Ocen (Modal) ---
function showRatingDetails(item) {
    const ratings = item.ratings || { [item.user]: item.rating };
    
    let detailsHTML = '<div style="padding: 10px 0;">';
    detailsHTML += '<strong>Szczegóły ocen:</strong><br><br>';
    
    Object.entries(ratings).forEach(([user, rating]) => {
        detailsHTML += `
            <div class="rating-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;">
                <div><strong>${user}:</strong> ${parseFloat(rating).toFixed(1)}</div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-edit-rating" data-user="${user}" style="padding: 4px 8px; background: var(--primary); font-size: 0.8rem;">✏️</button>
                    <button class="btn-delete-rating" data-user="${user}" style="padding: 4px 8px; background: var(--error); font-size: 0.8rem;">🗑️</button>
                </div>
            </div>
        `;
    });
    detailsHTML += `</div>`;
    
    const modalHTML = `
        <div id="ratingDetailsModal" class="modal-overlay">
            <div class="modal-content" style="max-width: 400px;">
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
    
    // Listenery
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
    
    // Przelicz średnią
    const arr = Object.values(updatedRatings).map(r => parseFloat(r));
    const avg = arr.reduce((a,b)=>a+b,0) / arr.length;
    
    dbRef.child(item.id).update({
        ratings: updatedRatings,
        avgRating: avg.toFixed(1)
    }).then(() => {
        showNotification("Zaktualizowano ocenę", "success");
        document.getElementById('ratingDetailsModal').remove(); // Zamknij modal
    });
}

function deleteUserRating(item, user) {
    if(!confirm(`Usunąć ocenę użytkownika ${user}?`)) return;
    
    const updatedRatings = { ...item.ratings };
    delete updatedRatings[user];
    
    // Jeśli to była jedyna ocena -> usuń film
    if (Object.keys(updatedRatings).length === 0) {
        dbRef.child(item.id).remove();
        showNotification("Usunięto film (brak ocen)", "success");
    } else {
        // Przelicz średnią
        const arr = Object.values(updatedRatings).map(r => parseFloat(r));
        const avg = arr.reduce((a,b)=>a+b,0) / arr.length;
        
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

function applyCurrentSortArray(arr) {
    return arr.sort((a, b) => {
        if (currentSort.key === "rating") {
            const rA = parseFloat(a.avgRating || a.rating || 0);
            const rB = parseFloat(b.avgRating || b.rating || 0);
            return (rA - rB) * currentSort.dir;
        } else {
            return a.film.localeCompare(b.film) * currentSort.dir;
        }
    });
}

function setupSearch() {
    const tableContainer = document.querySelector('.table-container');
    if (!tableContainer) return;

    // Dodajemy input ORAZ przycisk czyszczenia (button)
    const searchHTML = `
        <div class="search-wrapper" style="margin-bottom: 20px; position: relative; z-index: 5;">
            <input type="text" id="searchInput" placeholder="🔍 Szukaj filmu..." 
            style="width: 100%; padding: 15px 45px 15px 20px; background: rgba(15, 15, 25, 0.4); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 50px; color: white; font-size: 1rem; outline: none; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
            
            <button id="searchClear" class="search-clear-btn" title="Wyczyść">✕</button>
        </div>
    `;
    
    // Usuwamy starą wyszukiwarkę jeśli istnieje, żeby nie dublować
    const oldWrapper = document.querySelector('.search-wrapper');
    if (oldWrapper) oldWrapper.remove();

    tableContainer.insertAdjacentHTML('beforebegin', searchHTML);
    
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClear');

    // 1. Obsługa pisania (pokazywanie X i filtrowanie)
    searchInput.addEventListener('keyup', (e) => {
        const term = e.target.value.toLowerCase().trim();
        
        // Pokaż/Ukryj przycisk X
        clearBtn.style.display = term.length > 0 ? 'block' : 'none';
        
        // Filtrowanie
        filterTableLogic(term);
    });

    // 2. Obsługa przycisku X (czyszczenie)
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';        // Wyczyść tekst
        clearBtn.style.display = 'none'; // Ukryj przycisk
        filterTableLogic('');          // Zresetuj tabelę (pokaż wszystko)
        searchInput.focus();           // Ustaw kursor z powrotem w polu
    });
}

// Wydzielona logika filtrowania (dla porządku)
function filterTableLogic(term) {
    const filtered = data.filter(item => item.film.toLowerCase().includes(term));
    
    const tbody = document.querySelector("#rankingTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    const sorted = applyCurrentSortArray([...filtered]);
    
    sorted.forEach(item => {
        const tr = document.createElement("tr");
        tr.dataset.id = item.id;
        
        // Prawy przycisk myszy
        tr.addEventListener("contextmenu", (ev) => {
            ev.preventDefault();
            showRatingDetails(item);
        });

        const tdFilm = document.createElement("td");
        tdFilm.innerHTML = `<span style="font-weight:500">${item.film}</span>`;
        tr.appendChild(tdFilm);
        
        const tdRating = document.createElement("td");
        const avg = parseFloat(item.avgRating || item.rating || 0);
        tdRating.textContent = avg.toFixed(1);
        tdRating.style.textAlign = 'center';
        tdRating.style.fontWeight = '700';
        
        if (avg >= 8) tdRating.style.color = '#10b981';
        else if (avg >= 5) tdRating.style.color = '#f59e0b';
        else tdRating.style.color = '#ef4444';
        
        tr.appendChild(tdRating);
        tbody.appendChild(tr);
    });
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
        if(document.getElementById('usersList')) populateUsersList();
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
                <div class="modal-header"><h3>Nowy użytkownik</h3><button class="modal-close">&times;</button></div>
                <div class="modal-body">
                    <div class="modal-input-group">
                        <label>Nazwa:</label>
                        <input type="text" id="newUserName" placeholder="Nazwa..." maxlength="20">
                    </div>
                    <div class="modal-actions">
                        <button id="cancelAddUser" class="btn-cancel">Anuluj</button>
                        <button id="confirmAddUser" class="btn-confirm">Dodaj</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('addUserModal');
    const closeModal = () => modal.remove();
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
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
                <div class="modal-header"><h3>Zarządzaj</h3><button class="modal-close">&times;</button></div>
                <div class="modal-body">
                    <div class="users-list" id="usersList">Ładowanie...</div>
                    <div class="modal-actions"><button id="closeManage" class="btn-cancel">Zamknij</button></div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    populateUsersList();
    const modal = document.getElementById('manageUsersModal');
    const closeModal = () => modal.remove();
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('#closeManage').addEventListener('click', closeModal);
}

function populateUsersList() {
    const list = document.getElementById('usersList');
    if(!list) return;
    list.innerHTML = '';
    
    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.style.cssText = 'display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #333;';
        div.innerHTML = `<span>${user}</span>`;
        
        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑️';
        delBtn.className = 'btn-delete-user';
        delBtn.style.cssText = 'padding:5px 10px; background:var(--error); border:none; border-radius:3px; color:white; cursor:pointer;';
        
        delBtn.onclick = () => {
            if(confirm(`Usunąć ${user}?`)) {
                usersRef.child(user).remove();
                showNotification('Usunięto', 'success');
            }
        };
        div.appendChild(delBtn);
        list.appendChild(div);
    });
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

// Motywy
function setupThemeChanger() {
    const themeDots = document.querySelectorAll('.theme-dot');
    const savedTheme = localStorage.getItem('selectedTheme') || 'original';
    
    const originalNotify = window.showNotification;
    window.showNotification = function() {}; 
    changeTheme(savedTheme);
    window.showNotification = originalNotify;
    updateActiveDot(savedTheme);

    themeDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const theme = dot.getAttribute('data-theme');
            const originalNotify = window.showNotification;
            window.showNotification = function() {}; 
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
        white: { background: '#000000', surface: '#1a1a1a', primary: '#ffffff' },
        blue: { background: '#0a0a1a', surface: '#15152b', primary: '#6366f1' },
        purple: { background: '#1a0a1a', surface: '#2d152b', primary: '#a855f7' },
        green: { background: '#0a1a0a', surface: '#152b15', primary: '#10b981' },
        red: { background: '#1a0a0a', surface: '#2b1515', primary: '#ef4444' },
        orange: { background: '#1a100a', surface: '#2b1d15', primary: '#f97316' },
        original: { background: '#121212', surface: '#1e1e1e', primary: '#00bcd4' }
    };
    const theme = themes[themeName] || themes.original;
    const root = document.documentElement;
    root.style.setProperty('--background', theme.background);
    root.style.setProperty('--surface', theme.surface);
    root.style.setProperty('--primary', theme.primary);
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) changeTheme(savedTheme);
}

// Start
document.addEventListener('DOMContentLoaded', initApp);
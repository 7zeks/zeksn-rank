// ----------------------------
// WYKRYWANIE STRONY
// ----------------------------
const isRankingPage = window.location.pathname.includes('ranking.html') || 
                     document.title.includes('Tylko Ranking');

console.log('Strona:', isRankingPage ? 'RANKING' : 'GŁÓWNA');

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

// init Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log('Firebase zainicjalizowane');
} catch (error) {
    console.log('Firebase już zainicjalizowane');
}

const dbRef = firebase.database().ref("ranking");

// ----------------------------
// SELECTORY / UI (tylko jeśli istnieją)
// ----------------------------
const userSelect = document.getElementById("userSelect");
const stepTitle = document.getElementById("stepTitle");
const movieTitle = document.getElementById("movieTitle");
const nextBtn = document.getElementById("nextBtn");
const stepRating = document.getElementById("stepRating");
const ratingSelect = document.getElementById("ratingSelect");
const ratingInput = document.getElementById("ratingInput");
const saveBtn = document.getElementById("saveBtn");
const tbody = document.querySelector("#rankingTable tbody");
const headers = document.querySelectorAll("#rankingTable th");

// ----------------------------
// STAN APLIKACJI
// ----------------------------
let data = [];
let users = ['zeku', 'pierozek']; // Domyślni użytkownicy
let currentSort = { key: "rating", dir: -1 };
let currentUser = "";

// ----------------------------
// INICJALIZACJA
// ----------------------------
function initApp() {
    console.log('Inicjalizacja aplikacji...');
    
    // ZAWSZE ładujemy zapisany motyw - na obu stronach
    loadSavedTheme();
    
    if (!isRankingPage) {
        console.log('Inicjalizacja głównej strony');
        // Tylko na głównej stronie
        setupEventListeners();
        setupThemeSelector(); 
        setupAddUserButton();
        updateUserSelect();
        populateRatingSelect();
        hideRankingAndStatsOnMainPage();
    } else {
        console.log('Inicjalizacja strony rankingowej');
        // Na stronie rankingowej: theme selector i wyszukiwarka
        setupThemeSelector();
        setupSearch(); // WYSZUKIWARKA TYLKO NA RANKINGU
        setupEventListeners();
    }
    
    loadInitialData();
    setupFirebaseListeners();
}

// ----------------------------
// OBSŁUGA UŻYTKOWNIKÓW (UPROSZCZONA)
// ----------------------------
function setupAddUserButton() {
    if (isRankingPage) return;
    
    console.log('Setup add user button');
    const addUserHTML = `
        <div class="panel-step">
            <button id="addUserBtn" style="background: var(--success);">
                ➕ Dodaj nowego użytkownika
            </button>
            <button id="manageUsersBtn" style="background: var(--warning);">
                👥 Zarządzaj użytkownikami
            </button>
        </div>
    `;
    
    const panel = document.getElementById('panel');
    if (panel) {
        panel.insertAdjacentHTML('afterbegin', addUserHTML);
        
        const addUserBtn = document.getElementById('addUserBtn');
        const manageUsersBtn = document.getElementById('manageUsersBtn');
        
        if (addUserBtn) {
            addUserBtn.addEventListener('click', showAddUserModal);
        }
        
        if (manageUsersBtn) {
            manageUsersBtn.addEventListener('click', showManageUsersModal);
        }
    }
}

function showManageUsersModal() {
    const existingModal = document.getElementById('manageUsersModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div id="manageUsersModal" class="modal-overlay">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>👥 Zarządzaj użytkownikami</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="users-list" id="usersList">
                        <!-- Lista użytkowników zostanie wypełniona dynamicznie -->
                    </div>
                    <div class="modal-actions" style="margin-top: 20px;">
                        <button id="closeManageUsers" class="btn-cancel">Zamknij</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    populateUsersList();
    setupManageUsersModalEvents();
}

function populateUsersList() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    if (users.length === 0) {
        usersList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Brak użytkowników</p>';
        return;
    }
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.style.display = 'flex';
        userItem.style.justifyContent = 'space-between';
        userItem.style.alignItems = 'center';
        userItem.style.padding = '12px 15px';
        userItem.style.marginBottom = '8px';
        userItem.style.background = 'var(--surface-light)';
        userItem.style.borderRadius = '2px';
        userItem.style.border = '1px solid var(--border)';
        
        const userInfo = document.createElement('div');
        userInfo.style.display = 'flex';
        userInfo.style.alignItems = 'center';
        userInfo.style.gap = '10px';
        
        const userName = document.createElement('span');
        userName.textContent = user;
        userName.style.fontWeight = '500';
        
        const moviesCount = document.createElement('span');
        const userMovies = data.filter(item => item.user === user);
        moviesCount.textContent = `(${userMovies.length} filmów)`;
        moviesCount.style.color = 'var(--text-secondary)';
        moviesCount.style.fontSize = '0.9rem';
        
        userInfo.appendChild(userName);
        userInfo.appendChild(moviesCount);
        
        const userActions = document.createElement('div');
        userActions.style.display = 'flex';
        userActions.style.gap = '8px';
        
        // Przycisk usuwania
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Usuń';
        deleteBtn.className = 'btn-delete-user';
        deleteBtn.style.padding = '6px 12px';
        deleteBtn.style.background = 'var(--error)';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '2px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.fontSize = '0.8rem';
        deleteBtn.style.transition = 'all 0.2s ease';
        
        deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.background = '#dc2626';
            deleteBtn.style.transform = 'scale(1.05)';
        });
        
        deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.background = 'var(--error)';
            deleteBtn.style.transform = 'scale(1)';
        });
        
        deleteBtn.addEventListener('click', () => {
            deleteUser(user, userMovies.length);
        });
        
        // Zablokuj usuwanie jeśli użytkownik ma filmy
        if (userMovies.length > 0) {
            deleteBtn.disabled = true;
            deleteBtn.style.background = 'var(--text-muted)';
            deleteBtn.style.cursor = 'not-allowed';
            deleteBtn.title = 'Nie można usunąć użytkownika z filmami';
        }
        
        userActions.appendChild(deleteBtn);
        userItem.appendChild(userInfo);
        userItem.appendChild(userActions);
        usersList.appendChild(userItem);
    });
}

function deleteUser(userName, moviesCount) {
    if (moviesCount > 0) {
        showNotification(`Nie można usunąć użytkownika "${userName}" - ma ${moviesCount} filmów w rankingu`, 'error');
        return;
    }
    
    if (users.length <= 1) {
        showNotification('Nie można usunąć ostatniego użytkownika', 'error');
        return;
    }
    
    const confirmDelete = confirm(`Czy na pewno chcesz usunąć użytkownika "${userName}"?`);
    
    if (!confirmDelete) return;
    
    // Usuń użytkownika z listy
    const userIndex = users.indexOf(userName);
    if (userIndex > -1) {
        users.splice(userIndex, 1);
        updateUserSelect();
        populateUsersList(); // Odśwież listę w modal
        showNotification(`Usunięto użytkownika: ${userName}`, 'success');
        
        // Jeśli aktualnie wybrany użytkownik został usunięty, zresetuj selektor
        if (userSelect && userSelect.value === userName) {
            userSelect.value = '';
            if (stepTitle) stepTitle.classList.add("hidden");
            if (stepRating) stepRating.classList.add("hidden");
        }
    }
}

function setupManageUsersModalEvents() {
    const modal = document.getElementById('manageUsersModal');
    const closeBtn = modal.querySelector('.modal-close');
    const closeManageUsers = modal.querySelector('#closeManageUsers');
    
    const closeModal = () => {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    closeManageUsers.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape' && modal) {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function showAddUserModal() {
    const existingModal = document.getElementById('addUserModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div id="addUserModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>➕ Dodaj nowego użytkownika</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="modal-input-group">
                        <label for="newUserName">Nazwa użytkownika:</label>
                        <input type="text" id="newUserName" placeholder="Wpisz nazwę użytkownika..." maxlength="20">
                    </div>
                    <div class="modal-actions">
                        <button id="cancelAddUser" class="btn-cancel">Anuluj</button>
                        <button id="confirmAddUser" class="btn-confirm">Dodaj użytkownika</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('addUserModal');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('#cancelAddUser');
    const confirmBtn = modal.querySelector('#confirmAddUser');
    const nameInput = modal.querySelector('#newUserName');
    
    const closeModal = () => {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape' && modal) {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    confirmBtn.addEventListener('click', () => {
        const userName = nameInput.value.trim();
        
        if (!userName) {
            showNotification('Wpisz nazwę użytkownika', 'error');
            nameInput.focus();
            return;
        }
        
        if (userName.length < 2) {
            showNotification('Nazwa użytkownika musi mieć co najmniej 2 znaki', 'error');
            nameInput.focus();
            return;
        }
        
        if (users.includes(userName.toLowerCase())) {
            showNotification('Użytkownik o tej nazwie już istnieje', 'error');
            nameInput.focus();
            return;
        }
        
        addNewUser(userName);
        closeModal();
    });
    
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmBtn.click();
        }
    });
    
    setTimeout(() => {
        nameInput.focus();
    }, 100);
}

function addNewUser(userName) {
    const normalizedName = userName.toLowerCase().trim();
    
    // Sprawdź czy użytkownik już istnieje
    if (users.includes(normalizedName)) {
        showNotification('Użytkownik o tej nazwie już istnieje', 'error');
        return;
    }
    
    // Dodaj użytkownika do lokalnej listy
    users.push(normalizedName);
    updateUserSelect();
    showNotification(`Dodano użytkownika: ${userName}`, 'success');
    console.log('Dodano użytkownika:', normalizedName);
    
    // Odśwież listę w modal jeśli jest otwarty
    const manageModal = document.getElementById('manageUsersModal');
    if (manageModal) {
        populateUsersList();
    }
}

function updateUserSelect() {
    if (!userSelect) return;
    
    const currentSelected = userSelect.value;
    userSelect.innerHTML = '<option value=""> wybierz użytkownika </option>';
    
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        userSelect.appendChild(option);
    });
    
    if (currentSelected && users.includes(currentSelected)) {
        userSelect.value = currentSelected;
    }
}

// ----------------------------
// UKRYWANIE RANKINGU I STATYSTYK NA GŁÓWNEJ STRONIE
// ----------------------------
function hideRankingAndStatsOnMainPage() {
    if (!isRankingPage) {
        const tableContainer = document.querySelector('.table-container');
        const statsContainer = document.querySelector('.stats-container');
        
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
        
        if (statsContainer) {
            statsContainer.style.display = 'none';
        }
    }
}

// ----------------------------
// MOTYWY
// ----------------------------
function setupThemeSelector() {
    if (isRankingPage) {
        return;
    }
    
    console.log('Setup theme selector');
    const themeSelect = document.getElementById('themeSelect');
    if (!themeSelect) {
        console.log('Tworzenie selektora motywu');
        const themeHTML = `
            <div class="panel-step">
                <label for="themeSelect">🎨 Motyw:</label>
                <select id="themeSelect">
                    <option value="original">Oryginalny</option>
                    <option value="white">Biały</option>
                    <option value="blue">Niebieski</option>
                    <option value="purple">Fioletowy</option>
                    <option value="green">Zielony</option>
                    <option value="red">Czerwony</option>
                    <option value="orange">Pomarańczowy</option>
                </select>
            </div>
        `;
        const panel = document.getElementById('panel');
        if (panel) {
            panel.insertAdjacentHTML('afterbegin', themeHTML);
            
            const newThemeSelect = document.getElementById('themeSelect');
            if (newThemeSelect) {
                newThemeSelect.addEventListener('change', (e) => {
                    changeTheme(e.target.value);
                });
                
                const savedTheme = localStorage.getItem('selectedTheme') || 'original';
                newThemeSelect.value = savedTheme;
            }
        }
    } else {
        themeSelect.addEventListener('change', (e) => {
            changeTheme(e.target.value);
        });
    }
}

function changeTheme(themeName) {
    const themes = {
        white: {
            background: '#000000',
            surface: '#1a1a1a',
            surfaceHover: '#2a2a2a',
            text: '#ffffff',
            textSecondary: '#cccccc',
            primary: '#ffffff',
            primaryDark: '#e6e6e6',
            success: '#e6e6e6'
        },
        blue: {
            background: '#0a0a1a',
            surface: '#15152b',
            surfaceHover: '#1e1e3a',
            text: '#e0e0ff',
            textSecondary: '#a0a0cc',
            primary: '#6366f1',
            primaryDark: '#4f46e5',
            success: '#10b981'
        },
        purple: {
            background: '#1a0a1a',
            surface: '#2d152b',
            surfaceHover: '#3a1e3a',
            text: '#f0e0ff',
            textSecondary: '#cca0cc',
            primary: '#a855f7',
            primaryDark: '#9333ea',
            success: '#ec4899'
        },
        green: {
            background: '#0a1a0a',
            surface: '#152b15',
            surfaceHover: '#1e3a1e',
            text: '#e0ffe0',
            textSecondary: '#a0cca0',
            primary: '#10b981',
            primaryDark: '#059669',
            success: '#22c55e'
        },
        red: {
            background: '#1a0a0a',
            surface: '#2b1515',
            surfaceHover: '#3a1e1e',
            text: '#ffe0e0',
            textSecondary: '#cca0a0',
            primary: '#ef4444',
            primaryDark: '#dc2626',
            success: '#f59e0b'
        },
        orange: {
            background: '#1a100a',
            surface: '#2b1d15',
            surfaceHover: '#3a281e',
            text: '#fff0e0',
            textSecondary: '#ccb0a0',
            primary: '#f97316',
            primaryDark: '#ea580c',
            success: '#eab308'
        },
        original: {
            background: '#121212',
            surface: '#1e1e1e',
            surfaceHover: '#2a2a2a',
            text: '#f5f5f5',
            textSecondary: '#bbbbbb',
            primary: '#00bcd4',
            primaryDark: '#0097a7',
            success: '#00c853'
        }
    };
    
    const theme = themes[themeName] || themes.original;
    const root = document.documentElement;
    
    Object.entries(theme).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
    });
    
    const glowColor = hexToRgba(theme.primary, 0.4);
    const glowHoverColor = hexToRgba(theme.primary, 0.7);
    root.style.setProperty('--glow', `0 0 20px ${glowColor}`);
    root.style.setProperty('--glow-hover', `0 0 30px ${glowHoverColor}`);
    
    localStorage.setItem('selectedTheme', themeName);
    
    if (!isRankingPage) {
        showNotification(`Zmieniono motyw na: ${themeName}`, 'success');
    }
}

function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) {
        changeTheme(savedTheme);
    }
}

// ----------------------------
// WYSZUKIWARKA (TYLKO NA STRONIE RANKINGOWEJ)
// ----------------------------
function setupSearch() {
    // WYSZUKIWARKA TYLKO NA STRONIE RANKINGOWEJ
    if (!isRankingPage) return;
    
    console.log('Setup search - RANKING PAGE');
    const searchHTML = `
        <div class="panel-step">
            <label for="searchInput">🔍 Wyszukaj:</label>
            <input type="text" id="searchInput" placeholder="Szukaj filmu lub użytkownika...">
            <button id="clearSearch">Wyczyść</button>
        </div>
    `;
    
    // Dodaj wyszukiwarkę na górze strony rankingowej
    const statsContainer = document.querySelector('.stats-container');
    const tableContainer = document.querySelector('.table-container');
    const container = document.querySelector('.container');
    
    if (statsContainer) {
        statsContainer.insertAdjacentHTML('beforebegin', searchHTML);
    } else if (tableContainer) {
        tableContainer.insertAdjacentHTML('beforebegin', searchHTML);
    } else if (container) {
        container.insertAdjacentHTML('beforeend', searchHTML);
    }
    
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    if (searchInput && clearSearch) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            filterTable(searchTerm);
        });
        
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            filterTable('');
            searchInput.focus();
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.target.value.trim()) {
                filterTable('');
            }
        });
    }
}

function filterTable(searchTerm) {
    if (!searchTerm) {
        renderFullTable();
        return;
    }
    
    const filteredData = data.filter(item => 
        item.film.toLowerCase().includes(searchTerm) ||
        item.user.toLowerCase().includes(searchTerm) ||
        item.rating.toString().includes(searchTerm)
    );
    
    renderFilteredTable(filteredData);
}

function renderFilteredTable(filteredData) {
    if (!tbody) return;
    
    tbody.innerHTML = "";
    const sortedData = applyCurrentSortArray([...filteredData]);
    sortedData.forEach(item => {
        const tr = createRow(item);
        tbody.appendChild(tr);
    });
}

// ----------------------------
// EVENT LISTENERS
// ----------------------------
function setupEventListeners() {
    console.log('Setup event listeners dla:', isRankingPage ? 'RANKING' : 'GŁÓWNA');
    
    // EVENT LISTENERS DLA NAGŁÓWKÓW TABELI - DZIAŁAJĄ NA OBIU STRONACH
    if (headers && headers.length > 0) {
        console.log('Dodawanie listenerów dla', headers.length, 'nagłówków');
        headers.forEach((h, index) => {
            h.addEventListener("click", () => {
                console.log('Kliknięto nagłówek:', h.dataset.sort);
                handleSort(h);
            });
        });
    } else {
        console.log('Brak nagłówków do nasłuchiwania');
    }
    
    // POZOSTAŁE EVENT LISTENERS TYLKO NA GŁÓWNEJ STRONIE
    if (isRankingPage) return;
    
    if (userSelect) {
        userSelect.addEventListener("change", handleUserSelect);
    }
    if (nextBtn) {
        nextBtn.addEventListener("click", handleNextStep);
    }
    if (saveBtn) {
        saveBtn.addEventListener("click", handleSaveRating);
    }
    
    if (ratingSelect) {
        ratingSelect.addEventListener("change", (e) => {
            if (e.target.value && ratingInput) {
                ratingInput.value = e.target.value;
            }
        });
    }
    
    if (movieTitle) {
        movieTitle.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleNextStep();
        });
    }
    
    if (ratingInput) {
        ratingInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleSaveRating();
        });
    }
}

function handleUserSelect() {
    if (!stepTitle || !stepRating) return;
    
    stepTitle.classList.add("hidden");
    stepRating.classList.add("hidden");
    if (movieTitle) movieTitle.value = "";
    if (ratingInput) ratingInput.value = "";
    if (ratingSelect) ratingSelect.selectedIndex = 0;

    currentUser = userSelect ? userSelect.value : "";

    if (!currentUser) return;

    stepTitle.classList.remove("hidden");
    if (movieTitle) movieTitle.focus();
    showNotification(`Witaj ${currentUser}! Możesz dodać film.`, 'success');
}

function handleNextStep() {
    if (!movieTitle || !stepRating) return;
    
    const title = movieTitle.value.trim();
    if (!title) { 
        showNotification("Wpisz tytuł filmu", 'error');
        movieTitle.focus();
        return; 
    }
    
    stepRating.classList.remove("hidden");
    const labelRate = document.getElementById("labelRate");
    if (labelRate) labelRate.innerHTML = `Ocena: <strong>"${title}"</strong>`;
    if (ratingInput) ratingInput.focus();
}

// ----------------------------
// ZAPISYWANIE OCENY
// ----------------------------
async function handleSaveRating() {
    const user = userSelect ? userSelect.value : "";
    const film = movieTitle ? movieTitle.value.trim() : "";
    let ratingText = ratingInput ? ratingInput.value.trim() : "";
    if (!ratingText && ratingSelect) ratingText = ratingSelect.value;
    ratingText = ratingText.replace(',', '.');
    const rating = parseFloat(ratingText);

    if (!user) { showNotification("Wybierz użytkownika", 'error'); return; }
    if (!film) { showNotification("Wpisz tytuł filmu", 'error'); return; }
    if (isNaN(rating) || rating < 0 || rating > 10) { 
        showNotification("Podaj poprawną ocenę (0-10)", 'error'); 
        return; 
    }

    const existingEntry = data.find(item => item.user === user && item.film.toLowerCase() === film.toLowerCase());
    
    if (existingEntry) {
        const confirmUpdate = confirm(`Film "${film}" już istnieje z oceną ${existingEntry.rating}. Czy chcesz zaktualizować ocenę?`);
        if (!confirmUpdate) return;
        
        try {
            await dbRef.child(existingEntry.id).update({ rating: rating.toString() });
            showNotification(`Zaktualizowano ocenę "${film}" na ${rating}`, 'success');
        } catch (err) {
            console.error("Update error:", err);
            showNotification("Błąd podczas aktualizacji", 'error');
            return;
        }
    } else {
        try {
            await dbRef.push({ user, film, rating: rating.toString() });
            showNotification(`Dodano film "${film}" z oceną ${rating}`, 'success');
        } catch (err) {
            console.error("Save error:", err);
            showNotification("Błąd zapisu", 'error');
            return;
        }
    }

    resetForm();
}

function resetForm() {
    if (!stepRating || !stepTitle) return;
    
    stepRating.classList.add("hidden");
    stepTitle.classList.remove("hidden");
    if (movieTitle) movieTitle.value = "";
    if (ratingInput) ratingInput.value = "";
    if (ratingSelect) ratingSelect.selectedIndex = 0;
    if (movieTitle) movieTitle.focus();
}

// ----------------------------
// NOTYFIKACJE
// ----------------------------
function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

// ----------------------------
// RENDEROWANIE TABELI
// ----------------------------
function createRow(item) {
    const tr = document.createElement("tr");
    tr.dataset.id = item.id;

    const tdUser = document.createElement("td");
    tdUser.textContent = item.user;
    tdUser.className = "user-cell editable";
    tdUser.addEventListener("click", () => startEdit(item, 'user', tdUser));

    const tdFilm = document.createElement("td");
    tdFilm.className = "film-cell";
    
    // Kontener dla tytułu i ikony Filmwebu
    const filmContainer = document.createElement('div');
    filmContainer.style.display = 'flex';
    filmContainer.style.alignItems = 'center';
    filmContainer.style.gap = '8px';
    filmContainer.style.justifyContent = 'space-between';
    
    // Tytuł (edytowalny)
    const filmTitle = document.createElement('span');
    filmTitle.textContent = item.film;
    filmTitle.className = "editable";
    filmTitle.style.flex = '1';
    filmTitle.addEventListener('click', () => startEdit(item, 'film', filmTitle));
    
    // Ikonka Filmwebu
    const filmwebIcon = document.createElement('span');
    filmwebIcon.textContent = '🎬';
    filmwebIcon.title = 'Szukaj w Filmwebie';
    filmwebIcon.style.cursor = 'pointer';
    filmwebIcon.style.fontSize = '1.1rem';
    filmwebIcon.style.opacity = '0.7';
    filmwebIcon.style.transition = 'opacity 0.2s ease';
    
    filmwebIcon.addEventListener('mouseenter', () => {
        filmwebIcon.style.opacity = '1';
        filmwebIcon.style.transform = 'scale(1.1)';
    });
    
    filmwebIcon.addEventListener('mouseleave', () => {
        filmwebIcon.style.opacity = '0.7';
        filmwebIcon.style.transform = 'scale(1)';
    });
    
    filmwebIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        searchFilmweb(item.film);
    });
    
    filmContainer.appendChild(filmTitle);
    filmContainer.appendChild(filmwebIcon);
    tdFilm.appendChild(filmContainer);

    const tdRating = document.createElement("td");
    tdRating.className = `rating-cell ${getRatingClass(item.rating)} editable`;
    const ratingValue = Number.isFinite(item.rating) ? item.rating : 0;
    
    tdRating.innerHTML = `<span class="rating-number">${ratingValue.toFixed(1)}</span>`;
    tdRating.addEventListener("click", () => startEdit(item, 'rating', tdRating));

    tr.appendChild(tdUser);
    tr.appendChild(tdFilm);
    tr.appendChild(tdRating);

    // Zachowaj kontekstowe menu...
    tr.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (!confirm(`Czy na pewno chcesz usunąć "${item.film}" (${item.user})?`)) return;
        tr.classList.add("selected-right");
        dbRef.child(item.id).remove()
            .then(() => showNotification(`Usunięto "${item.film}"`, 'success'))
            .catch(err => {
                console.error("Remove error:", err);
                showNotification("Błąd podczas usuwania", 'error');
            });
    });

    return tr;
}
// ----------------------------
// EDYCJA POZYCJI W RANKINGU
// ----------------------------
function startEdit(item, field, cell) {
    // Sprawdź czy już edytujemy
    if (document.querySelector('.edit-input') || document.querySelector('.edit-select')) {
        return;
    }

    const currentValue = item[field];
    
    if (field === 'user') {
        // Edycja użytkownika - selektor
        createUserSelect(item, field, cell, currentValue);
    } else if (field === 'rating') {
        // Edycja oceny - input number
        createRatingInput(item, field, cell, currentValue);
    } else {
        // Edycja tytułu - input text
        createTextInput(item, field, cell, currentValue);
    }
}

function createTextInput(item, field, cell, currentValue) {
    cell.innerHTML = '';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = currentValue;
    
    const actions = createEditActions(item, field, input, cell, currentValue);
    
    cell.appendChild(input);
    cell.appendChild(actions);
    input.focus();
    input.select();
}

function createRatingInput(item, field, cell, currentValue) {
    cell.innerHTML = '';
    cell.classList.remove('rating-high', 'rating-medium', 'rating-low');
    
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'edit-input';
    input.value = currentValue;
    input.step = '0.1';
    input.min = '0';
    input.max = '10';
    
    const actions = createEditActions(item, field, input, cell, currentValue);
    
    cell.appendChild(input);
    cell.appendChild(actions);
    input.focus();
    input.select();
}

function createUserSelect(item, field, cell, currentValue) {
    cell.innerHTML = '';
    
    const select = document.createElement('select');
    select.className = 'edit-select';
    
    // Dodaj dostępnych użytkowników
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        if (user === currentValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    const actions = createEditActions(item, field, select, cell, currentValue);
    
    cell.appendChild(select);
    cell.appendChild(actions);
    select.focus();
}

function createEditActions(item, field, inputElement, cell, originalValue) {
    const actions = document.createElement('div');
    actions.className = 'edit-actions';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-save-edit';
    saveBtn.textContent = '💾 Zapisz';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-cancel-edit';
    cancelBtn.textContent = '❌ Anuluj';
    
    const saveEdit = () => {
        const newValue = inputElement.value.trim();
        
        if (!newValue) {
            showNotification('Wartość nie może być pusta', 'error');
            return;
        }
        
        if (field === 'rating') {
            const rating = parseFloat(newValue);
            if (isNaN(rating) || rating < 0 || rating > 10) {
                showNotification('Ocena musi być między 0 a 10', 'error');
                return;
            }
        }
        
        updateItem(item, field, newValue);
    };
    
    const cancelEdit = () => {
        restoreCell(cell, field, originalValue, item);
    };
    
    saveBtn.addEventListener('click', saveEdit);
    cancelBtn.addEventListener('click', cancelEdit);
    
    // Enter zapisuje, Escape anuluje
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    });
    
    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    
    return actions;
}

function updateItem(item, field, newValue) {
    const updates = {};
    updates[field] = field === 'rating' ? newValue.toString() : newValue;
    
    dbRef.child(item.id).update(updates)
        .then(() => {
            showNotification(`Zaktualizowano ${field === 'user' ? 'użytkownika' : field === 'film' ? 'tytuł' : 'ocenę'}`, 'success');
        })
        .catch(err => {
            console.error("Update error:", err);
            showNotification("Błąd podczas aktualizacji", 'error');
        });
}

function restoreCell(cell, field, value, item) {
    if (field === 'rating') {
        cell.className = `rating-cell ${getRatingClass(parseFloat(value))} editable`;
        cell.innerHTML = `<span class="rating-number">${parseFloat(value).toFixed(1)}</span>`;
    } else {
        cell.textContent = value;
        cell.className = `${field}-cell editable`;
    }
    
    // USUŃ stare event listeners i dodaj nowy
    cell.replaceWith(cell.cloneNode(true));
    const newCell = cell.parentElement.querySelector(`.${field}-cell`);
    
    newCell.addEventListener('click', () => startEdit(item, field, newCell));
}

function getRatingClass(rating) {
    if (rating >= 8) return 'rating-high';
    if (rating >= 6) return 'rating-medium';
    return 'rating-low';
}

function renderFullTable() {
    if (!tbody) return;
    
    tbody.innerHTML = "";
    const sortedData = applyCurrentSortArray([...data]);
    sortedData.forEach(item => {
        const tr = createRow(item);
        tbody.appendChild(tr);
    });
    updateStats();
}

// ----------------------------
// WYSZUKIWANIE W FILMWEBIE
// ----------------------------
function searchFilmweb(movieTitle) {
    const encodedTitle = encodeURIComponent(movieTitle);
    const filmwebUrl = `https://www.filmweb.pl/search#/all?query=${encodedTitle}`;
    window.open(filmwebUrl, '_blank');
}

// ----------------------------
// STATYSTYKI
// ----------------------------
function updateStats() {
    let statsContainer = document.querySelector('.stats-container');
    if (!statsContainer) return;
    
    let statsHTML = `<div class="stats-container"><div class="stat"><span class="stat-value">${data.length}</span><span class="stat-label">Wszystkie filmy</span></div>`;
    const users = [...new Set(data.map(item => item.user))];
    users.forEach(user => {
        const userMovies = data.filter(item => item.user === user);
        const avgRating = userMovies.reduce((sum, item) => sum + item.rating, 0) / userMovies.length;
        statsHTML += `<div class="stat"><span class="stat-value">${userMovies.length}</span><span class="stat-label">${user} (śr: ${avgRating.toFixed(1)})</span></div>`;
    });
    statsHTML += `</div>`;

    statsContainer.outerHTML = statsHTML;
}

// ----------------------------
// SORTOWANIE
// ----------------------------
function handleSort(header) {
    const key = header.dataset.sort;
    if (!key) return;
    
    console.log('Sortowanie po:', key, 'obecny kierunek:', currentSort.dir);
    
    if (currentSort.key === key) {
        currentSort.dir *= -1;
    } else {
        currentSort = { 
            key: key, 
            dir: key === "rating" ? -1 : 1
        };
    }
    
    if (headers && headers.length > 0) {
        headers.forEach(h => { 
            h.classList.remove('sort-asc', 'sort-desc');
            if (h.dataset.sort === currentSort.key) {
                h.classList.add(currentSort.dir === 1 ? 'sort-asc' : 'sort-desc');
            }
        });
    }
    
    renderFullTable();
}

function applyCurrentSortArray(arr) {
    return arr.sort((a, b) => {
        let valueA, valueB;
        
        if (currentSort.key === "rating") {
            valueA = a.rating;
            valueB = b.rating;
            return (valueA - valueB) * currentSort.dir;
        } else {
            valueA = (a[currentSort.key] || "").toString().toLowerCase();
            valueB = (b[currentSort.key] || "").toString().toLowerCase();
            return valueA.localeCompare(valueB) * currentSort.dir;
        }
    });
}

// ----------------------------
// FIREBASE LISTENERS
// ----------------------------
function setupFirebaseListeners() {
    console.log('Setup Firebase listeners');
    
    dbRef.on("child_added", snapshot => {
        const v = snapshot.val();
        const item = { id: snapshot.key, user: v.user, film: v.film, rating: parseFloat(v.rating)||0 };
        if (!data.find(d=>d.id===item.id)) { 
            data.push(item); 
            renderFullTable(); 
        }
    });

    dbRef.on("child_changed", snapshot => {
        const v = snapshot.val(), id = snapshot.key, idx = data.findIndex(x=>x.id===id);
        if(idx>=0){ 
            data[idx]={...data[idx], ...v, rating:parseFloat(v.rating)||0}; 
            renderFullTable(); 
        }
    });

    dbRef.on("child_removed", snapshot => {
        const id = snapshot.key;
        data = data.filter(x=>x.id!==id);
        const tr = tbody ? tbody.querySelector(`tr[data-id="${id}"]`) : null;
        if(tr) tr.remove();
        updateStats();
    });
}

function loadInitialData() {
    console.log('Loading initial data...');
    dbRef.once("value", snapshot => {
        if(snapshot.exists() && data.length===0){
            data=[];
            snapshot.forEach(s=>{
                const v=s.val();
                data.push({id:s.key,user:v.user,film:v.film,rating:parseFloat(v.rating)||0});
            });
            console.log('Załadowano danych:', data.length);
            renderFullTable();
        } else {
            console.log('Brak danych lub dane już załadowane');
        }
    });
}

// ----------------------------
// POMOCNICZE
// ----------------------------
function populateRatingSelect() {
    if(!ratingSelect) {
        console.error('Rating select element not found!');
        return;
    }
    
    console.log('Populating rating select...');
    
    if (ratingSelect.options.length > 1) {
        console.log('Rating select already populated');
        return;
    }
    
    ratingSelect.innerHTML = '';
    
    const defaultOption = new Option('Szybki wybór', '', true, true);
    defaultOption.disabled = true;
    ratingSelect.add(defaultOption);
    
    const ratings = [
        '10 - Perfekcyjny',
        '9 - Arcydzieło', 
        '8 - Znakomity',
        '7 - Bardzo dobry',
        '6 - Dobry',
        '5 - Przeciętny',
        '4 - Taki sobie',
        '3 - Kiepski',
        '2 - Słaby',
        '1 - Bardzo słaby',
        '0 - Katastrofa'
    ];
    
    ratings.forEach((label, index) => {
        const value = (10 - index).toString();
        ratingSelect.add(new Option(label, value));
    });
    
    console.log('Rating select populated with', ratings.length, 'options');
    
    ratingSelect.addEventListener('change', function() {
        console.log('Rating select changed to:', this.value, this.options[this.selectedIndex].text);
        if (this.value && ratingInput) {
            ratingInput.value = this.value;
            console.log('Rating input set to:', ratingInput.value);
        }
    });
}

// ----------------------------
// START APLIKACJI
// ----------------------------
document.addEventListener('DOMContentLoaded',()=>{
    console.log('DOM załadowany');
    initApp();
});
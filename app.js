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
const usersRef = firebase.database().ref("users");
const restreamRef = firebase.database().ref("restream");
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
let users = []; // Pusta lista - użytkownicy będą ładowani z Firebase
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
        populateRatingSelect();
        hideRankingAndStatsOnMainPage();
    } else {
        console.log('Inicjalizacja strony rankingowej');
        // Na stronie rankingowej: theme selector i wyszukiwarka
        setupThemeSelector();
        setupSearch();
        setupEventListeners();
    }
    
    // URUCHOM WSZYSTKIE LISTENERY OD RAZU
    setupFirebaseListeners();
    loadInitialData();
}

// ----------------------------
// OBSŁUGA UŻYTKOWNIKÓW
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
                    <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                        <span>Aktualni użytkownicy:</span>
                        <button id="refreshUsersBtn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--primary);">
                            🔄 Odśwież listę
                        </button>
                    </div>
                    <div class="users-list" id="usersList">
                        <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                            ⌛ Ładowanie użytkowników...
                        </div>
                    </div>
                    <div class="modal-actions" style="margin-top: 20px;">
                        <button id="closeManageUsers" class="btn-cancel">Zamknij</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Dodaj event listener dla przycisku odświeżania
    const refreshBtn = document.getElementById('refreshUsersBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('Ręczne odświeżanie użytkowników');
            reloadUsers();
        });
    }
    
    // ODŚWIEŻ LISTĘ UŻYTKOWNIKÓW PO OTWARCIU MODALA
    setTimeout(() => {
        populateUsersList();
    }, 100);
    
    setupManageUsersModalEvents();
}

function populateUsersList() {
    const usersList = document.getElementById('usersList');
    if (!usersList) {
        console.log('usersList nie znaleziony');
        return;
    }
    
    console.log('Aktualna lista użytkowników do wyświetlenia:', users);
    
    usersList.innerHTML = '';
    
    if (users.length === 0) {
        usersList.innerHTML = `
            <div style="text-align: center; padding: 30px; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 10px;">👤</div>
                <div style="font-size: 1.1rem; margin-bottom: 10px;">Brak użytkowników</div>
                <div style="font-size: 0.9rem; opacity: 0.7;">
                    Kliknij "➕ Dodaj nowego użytkownika" aby dodać pierwszego użytkownika
                </div>
            </div>
        `;
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
        const userMovies = data.filter(item => {
            if (item.ratings) {
                return Object.keys(item.ratings).includes(user);
            }
            return item.user === user;
        });
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
            if (!deleteBtn.disabled) {
                deleteBtn.style.background = '#dc2626';
                deleteBtn.style.transform = 'scale(1.05)';
            }
        });
        
        deleteBtn.addEventListener('mouseleave', () => {
            if (!deleteBtn.disabled) {
                deleteBtn.style.background = 'var(--error)';
                deleteBtn.style.transform = 'scale(1)';
            }
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
        
        // Zablokuj usuwanie jeśli to ostatni użytkownik
        if (users.length <= 1) {
            deleteBtn.disabled = true;
            deleteBtn.style.background = 'var(--text-muted)';
            deleteBtn.style.cursor = 'not-allowed';
            deleteBtn.title = 'Nie można usunąć ostatniego użytkownika';
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
    
    // Usuń użytkownika z Firebase
    usersRef.child(userName).remove()
        .then(() => {
            // Usuń użytkownika z lokalnej listy po udanym usunięciu
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
        })
        .catch(err => {
            console.error("Error deleting user:", err);
            showNotification("Błąd podczas usuwania użytkownika", 'error');
        });
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
    
    // Dodaj użytkownika do Firebase
    usersRef.child(normalizedName).set(true)
        .then(() => {
            // Dodaj do lokalnej listy po udanym zapisie
            users.push(normalizedName);
            updateUserSelect();
            showNotification(`Dodano użytkownika: ${userName}`, 'success');
            console.log('Dodano użytkownika:', normalizedName);
            
            // ODŚWIEŻ LISTĘ W MODALACH
            const manageModal = document.getElementById('manageUsersModal');
            if (manageModal) {
                populateUsersList();
            }
        })
        .catch(err => {
            console.error("Error adding user:", err);
            showNotification("Błąd podczas dodawania użytkownika", 'error');
        });
}

// FUNKCJA DO WYMUSZENIA PRZEŁADOWANIA UŻYTKOWNIKÓW
function reloadUsers() {
    console.log('Wymuszone przeładowanie użytkowników...');
    
    usersRef.once("value", snapshot => {
        if (snapshot.exists()) {
            users = Object.keys(snapshot.val());
            console.log('Przeładowano użytkowników:', users);
            updateUserSelect();
            
            // Odśwież listę w modal jeśli jest otwarty
            const manageModal = document.getElementById('manageUsersModal');
            if (manageModal) {
                populateUsersList();
            }
        } else {
            console.log('Brak użytkowników po przeładowaniu');
            users = [];
            updateUserSelect();
            
            const manageModal = document.getElementById('manageUsersModal');
            if (manageModal) {
                populateUsersList();
            }
        }
    });
}

function updateUserSelect() {
    if (!userSelect) return;
    
    console.log('Aktualizacja selektora użytkowników. Dostępni użytkownicy:', users);
    
    const currentSelected = userSelect.value;
    userSelect.innerHTML = '<option value=""> wybierz użytkownika </option>';
    
    if (users.length === 0) {
        const noUsersOption = document.createElement('option');
        noUsersOption.value = "";
        noUsersOption.textContent = "brak użytkowników";
        noUsersOption.disabled = true;
        userSelect.appendChild(noUsersOption);
        return;
    }
    
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
        (item.ratings && Object.keys(item.ratings).some(user => 
            user.toLowerCase().includes(searchTerm)
        )) ||
        (item.avgRating && item.avgRating.toString().includes(searchTerm)) ||
        (item.rating && item.rating.toString().includes(searchTerm))
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
// ZAPISYWANIE OCENY - AUTOMATYCZNE ŁĄCZENIE DUPLIKATÓW
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

    // NORMALIZUJ TYTUŁ FILMU DLA PORÓWNANIA
    const normalizedFilm = film.toLowerCase().trim();
    
    try {
        // SPRAWDŹ CZY FILM JUŻ ISTNIEJE (POPRZEZ PRZESZUKANIE)
        const snapshot = await dbRef.once('value');
        let existingFilmKey = null;
        let existingFilmData = null;
        let duplicates = [];
        
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const filmData = childSnapshot.val();
                // PORÓWNAJ ZNORMALIZOWANE TYTUŁY
                const existingNormalizedTitle = filmData.film.toLowerCase().trim();
                if (existingNormalizedTitle === normalizedFilm) {
                    if (!existingFilmKey) {
                        // Pierwsze znalezione wystąpienie - traktuj jako główne
                        existingFilmKey = childSnapshot.key;
                        existingFilmData = filmData;
                    } else {
                        // Kolejne wystąpienie - to duplikat
                        duplicates.push({
                            key: childSnapshot.key,
                            data: filmData
                        });
                    }
                }
            });
        }
        
        // JEŚLI ZNALEZIONO DUPLIKATY - AUTOMATYCZNIE JE POŁĄCZ
        if (duplicates.length > 0) {
            console.log(`Znaleziono ${duplicates.length} duplikatów dla filmu "${film}"`);
            await mergeSpecificDuplicates(existingFilmKey, existingFilmData, duplicates);
        }
        
        if (existingFilmKey && existingFilmData) {
            // Film istnieje - dodaj/aktualizuj ocenę użytkownika
            const filmRef = dbRef.child(existingFilmKey);
            const userRatings = existingFilmData.ratings || {};
            userRatings[user] = rating.toString();
            
            // Oblicz nową średnią
            const ratingsArray = Object.values(userRatings).map(r => parseFloat(r));
            const avgRating = ratingsArray.reduce((sum, r) => sum + r, 0) / ratingsArray.length;
            
            await filmRef.update({
                ratings: userRatings,
                avgRating: avgRating.toFixed(1),
                film: existingFilmData.film // Zachowaj oryginalną nazwę filmu
            });
            
            showNotification(`Zaktualizowano ocenę "${existingFilmData.film}" na ${rating}`, 'success');
        } else {
            // Nowy film - utwórz znormalizowany klucz
            const filmKey = normalizedFilm.replace(/[^a-z0-9]/g, '_');
            const userRatings = { [user]: rating.toString() };
            
            await dbRef.child(filmKey).set({
                film: film, // Zachowaj oryginalną pisownię
                ratings: userRatings,
                avgRating: rating.toFixed(1),
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            showNotification(`Dodano film "${film}" z oceną ${rating}`, 'success');
        }
    } catch (err) {
        console.error("Save error:", err);
        showNotification("Błąd zapisu", 'error');
        return;
    }

    resetForm();
}

// FUNKCJA DO AUTOMATYCZNEGO ŁĄCZENIA KONKRETNYCH DUPLIKATÓW
async function mergeSpecificDuplicates(mainKey, mainData, duplicates) {
    console.log('Automatyczne łączenie duplikatów...');
    
    const mainRef = dbRef.child(mainKey);
    let mergedRatings = { ...mainData.ratings };
    
    // Połącz wszystkie oceny z duplikatów
    for (const duplicate of duplicates) {
        const duplicateRatings = duplicate.data.ratings || {};
        
        // Dodaj oceny z duplikatu do głównego filmu
        Object.keys(duplicateRatings).forEach(user => {
            if (!mergedRatings[user] || duplicate.key !== mainKey) {
                mergedRatings[user] = duplicateRatings[user];
            }
        });
        
        console.log(`Połączono oceny z duplikatu: ${duplicate.data.film}`);
    }
    
    // Oblicz nową średnią
    const ratingsArray = Object.values(mergedRatings).map(r => parseFloat(r));
    const avgRating = ratingsArray.reduce((sum, r) => sum + r, 0) / ratingsArray.length;
    
    // Zaktualizuj główny film
    await mainRef.update({
        ratings: mergedRatings,
        avgRating: avgRating.toFixed(1)
    });
    
    // Usuń duplikaty (tylko jeśli mają różne klucze)
    for (const duplicate of duplicates) {
        if (duplicate.key !== mainKey) {
            await dbRef.child(duplicate.key).remove();
            console.log(`Usunięto duplikat: ${duplicate.key}`);
        }
    }
    
    console.log(`Automatycznie połączono ${duplicates.length} duplikatów dla "${mainData.film}"`);
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

    // USUŃ KOLUMNĘ UŻYTKOWNIKA - pokazujemy tylko film i średnią
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
    const avgRating = item.avgRating || item.rating;
    tdRating.className = `rating-cell ${getRatingClass(parseFloat(avgRating))}`;
    const ratingValue = Number.isFinite(parseFloat(avgRating)) ? parseFloat(avgRating) : 0;
    
    // Pokazuj średnią i liczbę ocen
    const ratingsCount = item.ratings ? Object.keys(item.ratings).length : 1;
    tdRating.innerHTML = `
        <span class="rating-number">${ratingValue.toFixed(1)}</span>
        <div class="rating-details" style="font-size: 0.8rem; opacity: 0.7;">
            (${ratingsCount} ${ratingsCount === 1 ? 'głos' : ratingsCount < 5 ? 'głosy' : 'głosów'})
        </div>
    `;

    tr.appendChild(tdFilm);
    tr.appendChild(tdRating);

    // Kontekstowe menu pokazujące szczegóły ocen
    tr.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showRatingDetails(item);
    });

    return tr;
}

function showRatingDetails(item) {
    const ratings = item.ratings || { [item.user]: item.rating };
    
    let detailsHTML = '<div style="padding: 10px 0;">';
    detailsHTML += '<strong>Szczegóły ocen:</strong><br><br>';
    
    Object.entries(ratings).forEach(([user, rating]) => {
        detailsHTML += `
            <div class="rating-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 8px; background: var(--surface-light); border-radius: 2px;">
                <div>
                    <strong>${user}:</strong> ${parseFloat(rating).toFixed(1)}
                </div>
                <div class="rating-actions" style="display: flex; gap: 5px;">
                    <button class="btn-edit-rating" data-user="${user}" style="padding: 4px 8px; background: var(--primary); color: white; border: none; border-radius: 2px; cursor: pointer; font-size: 0.8rem;">✏️</button>
                    <button class="btn-delete-rating" data-user="${user}" style="padding: 4px 8px; background: var(--error); color: white; border: none; border-radius: 2px; cursor: pointer; font-size: 0.8rem;">🗑️</button>
                </div>
            </div>
        `;
    });
    
    detailsHTML += `</div>`;
    
    const modalHTML = `
        <div id="ratingDetailsModal" class="modal-overlay">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3> Oceny dla ${item.film}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${detailsHTML}
                    <div class="modal-actions">
                        <button id="closeRatingDetails" class="btn-cancel">Zamknij</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('ratingDetailsModal');
    const closeBtn = modal.querySelector('.modal-close');
    const closeDetails = modal.querySelector('#closeRatingDetails');
    
    // Dodaj event listeners dla przycisków edycji i usuwania
    const editButtons = modal.querySelectorAll('.btn-edit-rating');
    const deleteButtons = modal.querySelectorAll('.btn-delete-rating');
    
    editButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const user = btn.dataset.user;
            editUserRating(item, user, ratings[user]);
        });
    });
    
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const user = btn.dataset.user;
            deleteUserRating(item, user);
        });
    });
    
    const closeModal = () => {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    closeDetails.addEventListener('click', closeModal);
    
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

function editUserRating(item, user, currentRating) {
    const modal = document.getElementById('ratingDetailsModal');
    
    const editHTML = `
        <div id="editRatingModal" class="modal-overlay">
            <div class="modal-content" style="max-width: 300px;">
                <div class="modal-header">
                    <h3>✏️ Edytuj ocenę</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="modal-input-group">
                        <label for="editRatingValue">Ocena użytkownika <strong>${user}</strong> dla "${item.film}":</label>
                        <input type="number" id="editRatingValue" value="${currentRating}" step="0.1" min="0" max="10" style="width: 100%;">
                    </div>
                    <div class="modal-actions">
                        <button id="cancelEditRating" class="btn-cancel">Anuluj</button>
                        <button id="saveEditRating" class="btn-confirm">💾 Zapisz</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', editHTML);
    
    const editModal = document.getElementById('editRatingModal');
    const closeBtn = editModal.querySelector('.modal-close');
    const cancelBtn = editModal.querySelector('#cancelEditRating');
    const saveBtn = editModal.querySelector('#saveEditRating');
    const ratingInput = editModal.querySelector('#editRatingValue');
    
    const closeEditModal = () => {
        editModal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (editModal.parentNode) {
                editModal.remove();
            }
        }, 300);
    };
    
    const saveEdit = () => {
        const newRating = parseFloat(ratingInput.value);
        
        if (isNaN(newRating) || newRating < 0 || newRating > 10) {
            showNotification('Podaj poprawną ocenę (0-10)', 'error');
            return;
        }
        
        updateUserRating(item, user, newRating);
        closeEditModal();
        // Zamknij też główny modal szczegółów
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 300);
        }
    };
    
    closeBtn.addEventListener('click', closeEditModal);
    cancelBtn.addEventListener('click', closeEditModal);
    saveBtn.addEventListener('click', saveEdit);
    
    ratingInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        }
    });
    
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    });
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape' && editModal) {
            closeEditModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    setTimeout(() => {
        ratingInput.focus();
        ratingInput.select();
    }, 100);
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
    return 'rating-high';
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
    
    const totalMovies = data.length;
    const totalRatings = data.reduce((sum, item) => {
        return sum + (item.ratings ? Object.keys(item.ratings).length : 1);
    }, 0);
    
    let statsHTML = `
        <div class="stats-container">
            <div class="stat"><span class="stat-value">${totalMovies}</span><span class="stat-label">Wszystkie filmy</span></div>
            <div class="stat"><span class="stat-value">${totalRatings}</span><span class="stat-label">Wszystkie oceny</span></div>
    `;
    
    // Statystyki użytkowników
    const userStats = {};
    data.forEach(item => {
        if (item.ratings) {
            Object.keys(item.ratings).forEach(user => {
                if (!userStats[user]) {
                    userStats[user] = { count: 0, sum: 0 };
                }
                userStats[user].count++;
                userStats[user].sum += parseFloat(item.ratings[user]);
            });
        } else {
            // Dla starych danych
            if (!userStats[item.user]) {
                userStats[item.user] = { count: 0, sum: 0 };
            }
            userStats[item.user].count++;
            userStats[item.user].sum += item.rating;
        }
    });
    
    Object.entries(userStats).forEach(([user, stats]) => {
        const avgRating = stats.sum / stats.count;
        statsHTML += `<div class="stat"><span class="stat-value">${stats.count}</span><span class="stat-label">${user} (śr: ${avgRating.toFixed(1)})</span></div>`;
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
        if (currentSort.key === "rating") {
            const ratingA = a.avgRating || a.rating || 0;
            const ratingB = b.avgRating || b.rating || 0;
            return (ratingA - ratingB) * currentSort.dir;
        } else if (currentSort.key === "film") {
            return a.film.localeCompare(b.film) * currentSort.dir;
        } else {
            return currentSort.dir;
        }
    });
}

// ----------------------------
// FIREBASE LISTENERS
// ----------------------------
function setupFirebaseListeners() {
    console.log('Setup Firebase listeners');
    
    // LISTENER DLA ZMIAN UŻYTKOWNIKÓW W CZASIE RZECZYWISTYM
    usersRef.on("value", snapshot => {
        if (snapshot.exists()) {
            const newUsers = Object.keys(snapshot.val());
            console.log('Aktualizacja użytkowników (live):', newUsers);
            users = newUsers;
            updateUserSelect();
            
            // Odśwież listę w modal jeśli jest otwarty
            const manageModal = document.getElementById('manageUsersModal');
            if (manageModal) {
                populateUsersList();
            }
        } else {
            console.log('Brak użytkowników w Firebase');
            users = [];
            updateUserSelect();
            
            // Odśwież listę w modal jeśli jest otwarty
            const manageModal = document.getElementById('manageUsersModal');
            if (manageModal) {
                populateUsersList();
            }
        }
    });

    // Reszta listenerów dla filmów
    dbRef.on("child_added", snapshot => {
        const v = snapshot.val();
        let item;
        
        if (v.ratings) {
            item = { 
                id: snapshot.key, 
                film: v.film, 
                ratings: v.ratings,
                avgRating: parseFloat(v.avgRating) || 0
            };
        } else {
            item = {
                id: snapshot.key,
                film: v.film,
                ratings: { [v.user]: v.rating.toString() },
                avgRating: parseFloat(v.rating) || 0
            };
        }
        
        if (!data.find(d=>d.id===item.id)) { 
            data.push(item); 
            renderFullTable(); 
        }
    });

    dbRef.on("child_changed", snapshot => {
        const v = snapshot.val(), id = snapshot.key, idx = data.findIndex(x=>x.id===id);
        if(idx>=0){ 
            if (v.ratings) {
                data[idx] = {
                    ...data[idx],
                    film: v.film,
                    ratings: v.ratings,
                    avgRating: parseFloat(v.avgRating) || 0
                };
            } else {
                data[idx] = {
                    ...data[idx],
                    film: v.film,
                    ratings: { [v.user]: v.rating.toString() },
                    avgRating: parseFloat(v.rating) || 0
                };
            }
            renderFullTable(); 
        }
    });

    dbRef.on("child_removed", snapshot => {
        const id = snapshot.key;
        data = data.filter(item => item.id !== id);
        renderFullTable();
    });
}

function loadInitialData() {
    console.log('Loading initial data...');
    dbRef.once("value", snapshot => {
        if(snapshot.exists() && data.length===0){
            data=[];
            snapshot.forEach(s=>{
                const v = s.val();
                // SPRAWDŹ CZY TO STARA CZY NOWA STRUKTURA
                if (v.ratings) {
                    // NOWA STRUKTURA - film z wieloma ocenami
                    data.push({
                        id: s.key, 
                        film: v.film, 
                        ratings: v.ratings,
                        avgRating: parseFloat(v.avgRating) || 0
                    });
                } else {
                    // STARA STRUKTURA - pojedyncza ocena
                    // KONWERTUJ NA NOWĄ STRUKTURĘ
                    const ratings = { [v.user]: v.rating.toString() };
                    data.push({
                        id: s.key, 
                        film: v.film, 
                        ratings: ratings,
                        avgRating: parseFloat(v.rating) || 0
                    });
                    
                    // ZAPISZ JAKO NOWĄ STRUKTURĘ W FIREBASE
                    const filmRef = dbRef.child(s.key);
                    filmRef.update({
                        ratings: ratings,
                        avgRating: parseFloat(v.rating).toFixed(1)
                    });
                }
            });
            console.log('Załadano danych:', data.length);
            renderFullTable();
        } else {
            console.log('Brak danych lub dane już załadowane');
        }
    });
}

function updateUserRating(item, user, newRating) {
    const filmRef = dbRef.child(item.id);
    const updatedRatings = { ...item.ratings };
    updatedRatings[user] = newRating.toString();
    
    // Oblicz nową średnią
    const ratingsArray = Object.values(updatedRatings).map(r => parseFloat(r));
    const avgRating = ratingsArray.reduce((sum, r) => sum + r, 0) / ratingsArray.length;
    
    filmRef.update({
        ratings: updatedRatings,
        avgRating: avgRating.toFixed(1)
    })
    .then(() => {
        showNotification(`Zaktualizowano ocenę użytkownika ${user} na ${newRating}`, 'success');
    })
    .catch(err => {
        console.error("Update rating error:", err);
        showNotification("Błąd podczas aktualizacji oceny", 'error');
    });
}

function deleteUserRating(item, user) {
    const confirmDelete = confirm(`Czy na pewno chcesz usunąć ocenę użytkownika ${user} dla filmu "${item.film}"?`);
    
    if (!confirmDelete) return;
    
    const filmRef = dbRef.child(item.id);
    const updatedRatings = { ...item.ratings };
    delete updatedRatings[user];
    
    // Jeśli nie ma już żadnych ocen, usuń cały film
    if (Object.keys(updatedRatings).length === 0) {
        filmRef.remove()
            .then(() => {
                showNotification(`Usunięto wszystkie oceny i film "${item.film}"`, 'success');
            })
            .catch(err => {
                console.error("Delete film error:", err);
                showNotification("Błąd podczas usuwania filmu", 'error');
            });
        return;
    }
    
    // Oblicz nową średnią
    const ratingsArray = Object.values(updatedRatings).map(r => parseFloat(r));
    const avgRating = ratingsArray.reduce((sum, r) => sum + r, 0) / ratingsArray.length;
    
    filmRef.update({
        ratings: updatedRatings,
        avgRating: avgRating.toFixed(1)
    })
    .then(() => {
        showNotification(`Usunięto ocenę użytkownika ${user}`, 'success');
        
        // Zamknij modal szczegółów
        const modal = document.getElementById('ratingDetailsModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 300);
        }
    })
    .catch(err => {
        console.error("Delete rating error:", err);
        showNotification("Błąd podczas usuwania oceny", 'error');
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

// Debugowanie Firebase
console.log('🔥 Firebase Users Ref:', usersRef.toString());
console.log('🔥 Firebase DB Ref:', dbRef.toString());

// Sprawdź czy Firebase działa
firebase.database().ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === true) {
        console.log('✅ Połączono z Firebase');
    } else {
        console.log('❌ Brak połączenia z Firebase');
    }

});


// ============================================================
// RANKING PAGE LOGIC
// ============================================================

// Zmienne potrzebne tylko w rankingu
let currentSort = { key: "rating", dir: -1 };
let currentFilter = "all";
let currentUserFilter = "all";
let currentTypeFilter = "all";

function initRanking() {
    console.log('>>> Inicjalizacja Rankingu...');
    setupSearch();
    setupRankingListeners();
    setupFilters(); // Pasek z "Top 5", "All", "New"
}

// --- NASŁUCHIWANIE BAZY DANYCH ---
function setupRankingListeners() {
    dbRef.on("value", snapshot => {
        if (snapshot.exists()) {
            data = [];
            snapshot.forEach(child => {
                const v = child.val();
                
                // Bezpieczne wczytanie (jeśli ktoś dodał tylko sezon, omijamy awarie)
                const ratings = v.ratings || {};
                let avgRating = parseFloat(v.avgRating) || 0;
                
                data.push({ 
                    id: child.key, 
                    film: v.film, 
                    ratings: ratings, 
                    notes: v.notes || {}, 
                    seasons: v.seasons || null, 
                    avgRating: avgRating,
                    createdAt: v.createdAt || 0
                });
            });

            // Nadawanie twardego rankingu
            data.sort((a, b) => parseFloat(b.avgRating) - parseFloat(a.avgRating));
            data.forEach((item, index) => item.trueRank = index + 1);

            populateUserDropdown(data);
            applyFiltersAndRender();
        } else {
            const container = document.getElementById("rankingTilesContainer");
            if (container) container.innerHTML = '<div class="restream-empty-state">Brak danych.</div>';
        }
    });
}

// --- RENDEROWANIE KAFELKÓW (Wersja Kinowa) ---
// ============================================================
// PAMIĘĆ PODRĘCZNA I API TMDB
// ============================================================
const movieCache = {};
const TMDB_API_KEY = "48c52791cb1b9e1161aa996403fd4299"; 

async function fetchMovieDetails(title) {
    if (movieCache[title]) return movieCache[title]; // Zwraca z pamięci, by nie męczyć API

    // 1. Usuwanie fraz typu "sezon 1" na potrzeby wyszukiwania
    let cleanTitle = title.replace(/[-|()]*\s*sezon\s*\d+\s*[-|()]*/gi, '').trim();
    
    // 2. NOWOŚĆ: Wykrywanie dokładnego roku w nawiasie (np. "(2013)")
    let targetYear = null;
    const yearMatch = cleanTitle.match(/\((\d{4})\)/);
    
    if (yearMatch) {
        targetYear = yearMatch[1]; // Zapisujemy wyłapany rok (np. "2013")
        // Usuwamy rok z tytułu dla API, żeby szukało szeroko
        cleanTitle = cleanTitle.replace(/\(\d{4}\)/, '').trim(); 
    }

    try {
        const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}&language=pl-PL`);
        const searchData = await searchRes.json();
        
        if (searchData.results && searchData.results.length > 0) {
            let movie = searchData.results[0]; // Domyślnie bierzemy pierwszy wynik
            
            // 3. NOWOŚĆ: Jeśli wpisałeś rok, wymuszamy dokładne dopasowanie!
            if (targetYear) {
                const exactMatch = searchData.results.find(m => {
                    const mYear = (m.release_date || m.first_air_date || "").substring(0, 4);
                    return mYear === targetYear;
                });
                
                // Jeśli API znalazło wersję z tego roku, podmieniamy wynik!
                if (exactMatch) {
                    movie = exactMatch;
                }
            }

            const info = {
                poster: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : 'https://pub-c4bdff47af9f412bb44968e460266513.r2.dev/cf05c8b7-c646-40f6-9c14-a58df7de2b7a-77717a77-8185-4545-9d81-47efc7e56cfe.png',
                year: (movie.release_date || movie.first_air_date || "").substring(0, 4),
                stars: movie.vote_average ? (movie.vote_average / 2).toFixed(1) : "0" 
            };
            movieCache[title] = info;
            return info;
        }
    } catch (err) {
        console.error("Błąd TMDB", err);
    }
    return null;
}

// ============================================================
// RENDEROWANIE KAFELKÓW
// ============================================================

function renderTiles(dataToRender) {
    const container = document.getElementById("rankingTilesContainer");
    if (!container) return;

    container.innerHTML = "";
    const sorted = applyCurrentSortArray([...dataToRender]);

    sorted.forEach((item) => {
        const tile = document.createElement("div");
        tile.className = "ranking-tile";
        
        // CZYTANIE OCENY (Własna albo Średnia)
        const avg = item.displayRating !== undefined ? item.displayRating : parseFloat(item.avgRating || 0);

        // NOWE: Przeliczanie Waszej oceny (0-10) na gwiazdki (0-5)
        const numStars = Math.round(avg / 2);
        const starsHTML = '★'.repeat(numStars) + '☆'.repeat(5 - numStars);

        // --- GENEROWANIE HTML DLA NOTATEK (Filtrowane po użytkowniku!) ---
        let notesHTML = '';
        if (item.notes && Object.keys(item.notes).length > 0) {
            notesHTML = '<div class="movie-notes-container">';
            for (const [user, note] of Object.entries(item.notes)) {
                if (currentUserFilter !== 'all' && user !== currentUserFilter) continue; 
                
                if (note && note.trim() !== "") {
                    notesHTML += `<div class="movie-note"><span class="note-user">${user}:</span> ${note}</div>`;
                }
            }
            notesHTML += '</div>';
        }

        // --- CZYSTY TYTUŁ (Usuwamy dublujący się rok do wyświetlania) ---
        const displayTitle = item.film.replace(/\(\d{4}\)/, '').trim();

        // --- HTML KAFELKA ---
        tile.innerHTML = `
            <div class="col-rank">${item.trueRank}</div>
            <div class="col-poster">
                <img id="poster-${item.id}" src="https://pub-c4bdff47af9f412bb44968e460266513.r2.dev/cf05c8b7-c646-40f6-9c14-a58df7de2b7a-77717a77-8185-4545-9d81-47efc7e56cfe.png" alt="Plakat">
            </div>
            <div class="col-team">
                <div class="movie-header">
                    <!-- UŻYWAMY displayTitle ZAMIAST item.film -->
                    <h2 class="team-name" title="${item.film}">${displayTitle}</h2>
                    <span class="movie-year" id="year-${item.id}"></span>
                    <div class="filmweb-icon-wrapper" title="Szukaj na Filmwebie">
                        <img class="fw-icon" src="https://www.filmweb.pl/favicon.ico" alt="FW">
                    </div>
                </div>
                <div class="movie-director" id="stars-${item.id}" style="color: #FF6B00; letter-spacing: 2px;">${starsHTML}</div>
                
                <!-- TUTAJ WSKAKUJĄ WASZE NOTATKI ZAMIAST OPISU -->
                ${notesHTML} 
            </div>
            <div class="col-pf">
                <div class="rating-number">${avg.toFixed(1)}</div>
            </div>
        `;

        // ŁADOWANIE DANYCH Z API W TLE (Bez podmieniania opisów!)
        // ŁADOWANIE DANYCH Z API W TLE (Teraz tylko plakat i rok)
        fetchMovieDetails(item.film).then(info => {
            if (info) {
                document.getElementById(`poster-${item.id}`).src = info.poster;
                document.getElementById(`year-${item.id}`).textContent = info.year ? `(${info.year})` : '';
            } 
        });

        // Kliknięcie w Filmweb
        const fwBtn = tile.querySelector('.filmweb-icon-wrapper');
        fwBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            window.open(`https://www.filmweb.pl/search#/all?query=${encodeURIComponent(item.film)}`);
        });

        // Prawy przycisk (Admin: Edycja/Usuwanie)
        tile.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            if (!isAdmin) return showNotification("Tylko dla Admina", "error");
            showRatingDetails(item);
        });

        // LEWY PRZYCISK: Otwiera ZUPEŁNIE NOWE okno tylko dla sezonów!
        tile.addEventListener('click', (e) => {
            if (!e.target.closest('.filmweb-icon-wrapper')) {
                showSeasonsModal(item);
            }
        });

        container.appendChild(tile);
    });
}

// --- FILTROWANIE I SORTOWANIE ---

// Dynamiczne pobieranie użytkowników z bazy i wrzucanie do <select>
function populateUserDropdown(allData) {
    const select = document.getElementById('userFilterSelect');
    if (!select) return;
    
    const users = new Set();
    
    // Szukamy ocenionych użytkowników zarówno w ocenach ogólnych jak i SEZONACH!
    allData.forEach(item => {
        if (item.ratings) {
            Object.keys(item.ratings).forEach(u => users.add(u));
        }
        if (item.seasons) {
            Object.values(item.seasons).forEach(sData => {
                if (sData && sData.ratings) {
                    Object.keys(sData.ratings).forEach(u => users.add(u));
                }
            });
        }
    });
    
    const currentVal = select.value;
    let html = '<option value="all">Wszyscy użytkownicy</option>';
    
    Array.from(users).sort().forEach(user => {
        html += `<option value="${user}">${user}</option>`;
    });
    
    select.innerHTML = html;
    
    if (Array.from(users).includes(currentVal)) {
        select.value = currentVal;
    } else {
        select.value = 'all';
        currentUserFilter = 'all';
    }
}

function setupFilters() {
    // 1. Filtry (Top 5, All, New)
    document.querySelectorAll('.filter-pill[data-filter]').forEach(pill => {
        pill.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-pill[data-filter]').forEach(p => p.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.filter;
            applyFiltersAndRender();
        });
    });
    
    // NOWOŚĆ: Przeklikiwana kapsułka (Wszystko -> Filmy -> Seriale -> Wszystko)
    const typePill = document.getElementById('typeTogglePill');
    if (typePill) {
        typePill.addEventListener('click', () => {
            if (currentTypeFilter === 'all') {
                currentTypeFilter = 'movie';
                typePill.textContent = 'Typ: Filmy';
                typePill.classList.add('active'); // Podświetla przycisk
            } else if (currentTypeFilter === 'movie') {
                currentTypeFilter = 'series';
                typePill.textContent = 'Typ: Seriale';
                typePill.classList.add('active');
            } else {
                currentTypeFilter = 'all';
                typePill.textContent = 'Typ: Wszystko';
                typePill.classList.remove('active'); // Wraca do neutralnego koloru
            }
            applyFiltersAndRender();
        });
    }

    // 2. Sortowanie (Nazwa, Ocena)
    document.querySelectorAll('.sort-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            const sortKey = e.currentTarget.dataset.sort;
            document.querySelectorAll('.sort-pill').forEach(p => p.classList.remove('active-sort'));
            e.currentTarget.classList.add('active-sort');
            handleSort(sortKey);
        });
    });

    // 3. Filtr użytkownika (<select>)
    const userSelect = document.getElementById('userFilterSelect');
    if (userSelect) {
        userSelect.addEventListener('change', (e) => {
            currentUserFilter = e.target.value;
            applyFiltersAndRender();
        });
    }
}

function applyFiltersAndRender() {
    let filtered = [...data];

    // Filtrowanie po Typie (Film czy Serial)
    if (currentTypeFilter === 'movie') {
        filtered = filtered.filter(i => !i.seasons);
    } else if (currentTypeFilter === 'series') {
        filtered = filtered.filter(i => i.seasons);
    }
    
    // Filtrowanie po Użytkowniku (Upewnia się, że widzi sezony)
    if (currentUserFilter !== 'all') {
        filtered = filtered.filter(i => {
            // Sprawdza czy oceniłeś cały film
            let hasMainRating = i.ratings && i.ratings[currentUserFilter] !== undefined;
            
            // Sprawdza czy oceniłeś choćby 1 sezon tego serialu
            let hasSeasonRating = false;
            if (i.seasons) {
                for (const sData of Object.values(i.seasons)) {
                    if (sData && sData.ratings && sData.ratings[currentUserFilter] !== undefined) {
                        hasSeasonRating = true;
                        break;
                    }
                }
            }
            
            return hasMainRating || hasSeasonRating; // Zostawia jeśli cokolwiek oceniłeś
        });
        
        filtered.forEach(i => {
            if (i.ratings && i.ratings[currentUserFilter] !== undefined) {
                i.displayRating = parseFloat(i.ratings[currentUserFilter]);
            } else {
                i.displayRating = parseFloat(i.avgRating) || 0; 
            }
        });
    } else {
        // Tryb ogólny
        filtered.forEach(i => i.displayRating = parseFloat(i.avgRating) || 0);
    }
    
    // Reszta filtrów
    if (currentFilter === 'top5') {
        filtered = applyCurrentSortArray(filtered).slice(0, 5);
    } else if (currentFilter === 'new') {
        const limit = 3 * 24 * 60 * 60 * 1000; 
        filtered = filtered.filter(i => i.createdAt && (Date.now() - i.createdAt < limit));
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value) {
        const term = searchInput.value.toLowerCase().trim();
        filtered = filtered.filter(i => i.film.toLowerCase().includes(term));
    }
    
    renderTiles(filtered);
}

function handleSort(key) {
    if (currentSort.key === key) currentSort.dir *= -1;
    else currentSort = { key, dir: (key === 'rating' ? -1 : 1) };
    applyFiltersAndRender(); 
}

function applyCurrentSortArray(arr) {
    return arr.sort((a, b) => {
        // Sortujemy po displayRating (czyli albo po średniej, albo po ocenie wybranego usera!)
        if (currentSort.key === "rating") return (a.displayRating - b.displayRating) * currentSort.dir;
        if (currentSort.key === "rank") return (a.trueRank - b.trueRank) * currentSort.dir;
        return a.film.localeCompare(b.film) * currentSort.dir;
    });
}

// Dynamiczny kolor oceny
function getDynamicRatingColor(avg) {
    const rating = Math.max(0, Math.min(10, avg));
    if (rating >= 8.0) return `hsl(${290 - (rating-8)*15}, 90%, 65%)`;
    if (rating >= 5.0) return `hsl(${35 + (rating-5)*40}, 85%, 55%)`;
    return `hsl(${rating*7}, 90%, 60%)`;
}

// Funkcja wyszukiwarki
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    searchInput.addEventListener('keyup', () => {
        applyFiltersAndRender(); // Zamiast ręcznie filtrować, odpala główną rurę
    });
}

// Uruchomienie, gdy strona jest gotowa
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('rankingTilesContainer')) {
        initRanking();
    }
});

// ============================================================
// MODAL EDYCJI: TYTUŁ I OCENY (BEZ PROMPT)
// ============================================================
function showRatingDetails(item) {
    const modalHTML = `
        <div id="ratingModal" class="modal-overlay">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 id="modalHeaderTitle">Zarządzaj: ${item.film}</h3>
                    <button class="modal-close" onclick="document.getElementById('ratingModal').remove()">&times;</button>
                </div>
                <div class="modal-body" style="padding-bottom: 0;">
                    <div class="modal-input-group" style="margin-bottom: 30px;">
                        <label>Tytuł filmu / serialu</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="editMovieTitleInput" value="${item.film}" class="form-input">
                            <button class="btn-edit-rating" onclick="saveNewMovieTitle('${item.id}')">Zapisz</button>
                        </div>
                    </div>

                    <p style="text-align: center; font-size: 0.9rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Oceny użytkowników</p>

                    <!-- <div class="menu-divider" style="margin: 20px 0;"></div> -->

                    <div class="rating-details-container">
                        ${Object.entries(item.ratings).map(([user, rating]) => {
                            const userNote = (item.notes && item.notes[user]) ? item.notes[user] : ""; // Pobieranie notatki
                            return `
                            <div class="rating-item" id="rating-item-${user}" style="flex-wrap: wrap;">
                                <div style="display: flex; width: 100%; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="font-weight: 600; color: #fff; min-width: 80px;">${user}</span>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <input type="number" step="0.1" min="0" max="10" 
                                            id="input-rating-${user}" 
                                            value="${rating}" 
                                            class="form-input" 
                                            style="width: 60px; text-align: center; padding: 5px 0; font-size: 1rem;">
                                        <button class="btn-edit-rating" onclick="saveOnPageRating('${item.id}', '${user}')">✓</button>
                                        <button class="btn-delete-rating" onclick="deleteUserRating('${item.id}', '${user}')">✕</button>
                                    </div>
                                </div>
                                <!-- NOWE POLE NA NOTATKĘ -->
                                <input type="text" id="input-note-${user}" value="${userNote}" placeholder="Brak notatki..." class="form-input" style="width: 100%; font-size: 0.85rem; padding: 6px 10px; background: rgba(0,0,0,0.2);">
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="modal-footer" style="margin-top: 1px;">
                    <button class="btn-delete-rating" onclick="deleteEntireMovie('${item.id}', '${item.film.replace(/'/g, "\\'")}')" style="width: 100%; padding: 14px; background: rgba(255, 255, 255, 0.04); color: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 5px; font-size: 15px; font-weight: 600; letter-spacing: 0.5px; cursor: pointer; transition: all 0.3s ease;">Usuń cały film z bazy</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- FUNKCJA USUWANIA CAŁEGO FILMU (Z PODWÓJNYM KLIKNIĘCIEM) ---
let pendingDeleteId = null;
let pendingDeleteTimeout = null;

async function deleteEntireMovie(itemId, movieTitle) {
    // Łapiemy nasz główny przycisk na dole modala
    const btnElement = document.querySelector('#ratingModal .modal-footer .btn-delete-rating');

    if (pendingDeleteId === itemId) {
        // DRUGIE KLIKNIĘCIE - Faktyczne usunięcie z bazy!
        clearTimeout(pendingDeleteTimeout);
        pendingDeleteId = null;

        await dbRef.child(itemId).remove();
        document.getElementById('ratingModal').remove();
        showNotification(`Usunięto film: ${movieTitle}`, "success");
    } else {
        // PIERWSZE KLIKNIĘCIE - Oczekujemy na potwierdzenie
        pendingDeleteId = itemId;

        // Tymczasowa zmiana wyglądu przycisku
        // Tymczasowa zmiana wyglądu przycisku na "Ostrzegawczy"
        if (btnElement) {
            const originalText = btnElement.textContent;
            btnElement.textContent = "Potwierdź usunięcie!";
            btnElement.style.background = "rgba(239, 68, 68, 0.85)"; // Odpalamy wyraźną czerwień!
            btnElement.style.color = "#ffffff";
            btnElement.style.borderColor = "rgba(239, 68, 68, 1)";
            
            // Masz 3 sekundy na drugie kliknięcie, potem przycisk wraca do normy
            pendingDeleteTimeout = setTimeout(() => {
                pendingDeleteId = null;
                if (btnElement) {
                    btnElement.textContent = originalText;
                    btnElement.style.background = "rgba(255, 255, 255, 0.03)"; // Wraca do dyskretnej szarości
                    btnElement.style.color = "rgba(255, 255, 255, 0.5)";
                    btnElement.style.borderColor = "rgba(255, 255, 255, 0.05)";
                }
            }, 3000);
        }

        // Pokaż lekki komunikat na środku ekranu
        showCenterToast("Kliknij przycisk jeszcze raz, aby ostatecznie usunąć film.");
    }
}

// Funkcja generująca lekki, estetyczny komunikat na środku
function showCenterToast(msg) {
    // Usuń poprzedni komunikat, jeśli klikasz za szybko
    const existing = document.getElementById('centerToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'centerToast';
    toast.textContent = msg;
    
    // Stylowanie w locie (szklany efekt rodem z Twojego panelu)
    Object.assign(toast.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(20, 20, 30, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '50px',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: '99999',
        pointerEvents: 'none',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        transition: 'opacity 0.3s ease',
        opacity: '0'
    });

    document.body.appendChild(toast);
    
    // Płynne pojawienie się
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Zniknięcie po 2.5 sekundach
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }
    }, 2500);
}

// Funkcja zapisu nowego tytułu
async function saveNewMovieTitle(itemId) {
    const newTitle = document.getElementById('editMovieTitleInput').value.trim();
    if (newTitle && newTitle.length > 0) {
        await dbRef.child(itemId).update({ film: newTitle });
        showNotification("Zmieniono tytuł na: " + newTitle, "success");
        // Opcjonalnie aktualizujemy nagłówek modala
        document.getElementById('modalHeaderTitle').textContent = "Zarządzaj: " + newTitle;
    } else {
        showNotification("Tytuł nie może być pusty", "error");
    }
}

// Funkcja zapisu oceny bezpośrednio z inputa w modalu
async function saveOnPageRating(itemId, user) {
    const input = document.getElementById(`input-rating-${user}`);
    const noteInput = document.getElementById(`input-note-${user}`); // Szukamy pola notatki
    const newValue = parseFloat(input.value.replace(',', '.'));
    const newNote = noteInput ? noteInput.value.trim() : "";

    if (!isNaN(newValue) && newValue >= 0 && newValue <= 10) {
        // Zapis oceny
        await dbRef.child(itemId).child('ratings').child(user).set(newValue.toString());
        
        // Zapis notatki
        if (newNote) {
            await dbRef.child(itemId).child('notes').child(user).set(newNote);
        } else {
            await dbRef.child(itemId).child('notes').child(user).remove();
        }
        
        // Przeliczanie średniej
        dbRef.child(itemId).once('value', snap => {
            const data = snap.val();
            if (data && data.ratings) {
                const arr = Object.values(data.ratings).map(r => parseFloat(r));
                const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
                dbRef.child(itemId).update({ avgRating: avg.toFixed(1) });
            }
        });
        showNotification(`Zaktualizowano dane dla: ${user}`, "success");
    } else {
        showNotification("Ocena musi być w przedziale 0-10", "error");
    }
}

// Funkcja usuwania oceny użytkownika
async function deleteUserRating(itemId, user) {
    if (confirm(`Czy na pewno chcesz usunąć ocenę użytkownika ${user}?`)) {
        await dbRef.child(itemId).child('ratings').child(user).remove();
        showNotification(`Usunięto ocenę użytkownika ${user}`, "success");
    }
}

// ==========================================
// --- NOWE OKNO: ZARZĄDZANIE SEZONAMI ---
// ==========================================
function showSeasonsModal(item) {
    const existingModal = document.getElementById('seasonsModal');
    if (existingModal) existingModal.remove();

    let seasonsHTML = '';
    if (item.seasons) {
        for (const [seasonNum, seasonData] of Object.entries(item.seasons)) {
            if (!seasonData) continue; 

            let ratingsText = '';
            if (seasonData.ratings) {
                for (const [user, rating] of Object.entries(seasonData.ratings)) {
                    // SPRAWDZANIE UPRAWNIEŃ: Czy gość może kliknąć i usunąć?
                    const canDelete = isAdmin || user === loggedGuestName;
                    const clickAction = canDelete ? `onclick="if(event.detail === 3) deleteSpecificSeasonRating('${item.id}', '${seasonNum}', '${user}')" title="Kliknij 3 razy szybko, aby usunąć swoją ocenę"` : `title="Ocena użytkownika ${user}"`;
                    const hoverStyle = canDelete ? `onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'"` : "";
                    const cursorStyle = canDelete ? "cursor: pointer;" : "cursor: default;";

                    ratingsText += `
                        <span 
                            ${clickAction} 
                            style="font-size: 0.85rem; background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 4px; color: #ccc; ${cursorStyle} user-select: none; transition: background 0.2s;"
                            ${hoverStyle}
                        >
                            <b>${user}:</b> ${rating}
                        </span> `;
                }
            }

            // X USUWAJĄCY CAŁY SEZON - WIDOCZNY TYLKO DLA ADMINA
            const deleteSeasonBtn = isAdmin ? `<button onclick="deleteSeasonRecord('${item.id}', '${seasonNum}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.1rem; padding: 0 5px; transition: 0.2s;" title="Usuń sezon">✕</button>` : '';

            seasonsHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <strong style="color: #fff; font-size: 0.95rem;">Sezon ${seasonNum}</strong>
                        ${ratingsText}
                    </div>
                    ${deleteSeasonBtn}
                </div>
            `;
        }
    } else {
        seasonsHTML = '<div style="text-align: center; padding: 20px 0; font-size: 0.9rem; color: rgba(255,255,255,0.4);">Ten serial nie ma jeszcze ocenionych sezonów.</div>';
    }

    // LISTA UŻYTKOWNIKÓW ZALEŻNA OD ROLI
    let userOpts = '';
    if (isAdmin) {
        // Admin może wybierać do woli
        const generatedUsers = (typeof users !== 'undefined' && users.length > 0) 
            ? users.map(u => `<option value="${u}">${u}</option>`).join('') 
            : `<option value="zeku">zeku</option><option value="pierozek">pierozek</option>`;
        userOpts = `<option value="" disabled selected>wybierz użytkownika</option>` + generatedUsers;
    } else {
        // Gość widzi tylko siebie
        userOpts = `<option value="${loggedGuestName}" selected>${loggedGuestName}</option>`;
    }

    const modalHTML = `
        <div id="seasonsModal" class="modal-overlay">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 style="letter-spacing: 1px;">SEZONY: ${item.film.toUpperCase()}</h3>
                    <button class="modal-close" onclick="document.getElementById('seasonsModal').remove()">&times;</button>
                </div>
                
                <div class="modal-body" style="padding-bottom: 20px;">
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 25px;">
                        ${seasonsHTML}
                    </div>

                    <div style="display: flex; gap: 8px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                        <select id="newSeasonUser" class="form-input" style="width: auto; padding: 8px; flex: 1; border-radius: 4px;" ${isAdmin ? '' : 'disabled'}>
                            ${userOpts}
                        </select>
                        <input type="number" id="newSeasonNum" placeholder="Sezon" class="form-input" style="width: 70px; padding: 8px; text-align: center; border-radius: 4px;" min="1">
                        <input type="number" id="newSeasonRating" placeholder="Ocena" class="form-input" step="0.1" min="0" max="10" style="width: 70px; padding: 8px; text-align: center; border-radius: 4px;">
                        <button onclick="saveNewSeason('${item.id}')" style="padding: 8px 16px; background: rgba(255, 255, 255, 0.08); color: #fff; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; font-weight: 500; cursor: pointer; transition: 0.2s;">Dodaj</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- POPRAWIONE FUNKCJE ODŚWIEŻANIA OKNA ---
async function saveNewSeason(itemId) {
    const user = document.getElementById('newSeasonUser').value;
    const sNum = document.getElementById('newSeasonNum').value;
    let sRating = document.getElementById('newSeasonRating').value;

    if (!user || !sNum || !sRating) return showNotification("Wypełnij wszystkie pola", "error");
    
    sRating = parseFloat(sRating.replace(',', '.'));
    if (isNaN(sRating) || sRating < 0 || sRating > 10) return showNotification("Ocena 0-10", "error");

    try {
        await dbRef.child(itemId).child('seasons').child(sNum).child('ratings').child(user).set(sRating.toString());
        
        // POBIERAMY ŚWIEŻE DANE Z BAZY I ODŚWIEŻAMY OKNO BEZ ZAMYKANIA
        const snap = await dbRef.child(itemId).once('value');
        if (snap.exists()) {
            showSeasonsModal({ id: itemId, ...snap.val() });
        }
        showNotification(`Dodano sezon ${sNum}`, "success");
    } catch (err) { console.error(err); }
}

async function deleteSpecificSeasonRating(itemId, seasonNum, user) {
    try {
        await dbRef.child(itemId).child('seasons').child(seasonNum).child('ratings').child(user).remove();
        
        const snap = await dbRef.child(itemId).once('value');
        if (snap.exists()) {
            showSeasonsModal({ id: itemId, ...snap.val() });
        }
        
        showNotification(`Usunięto ocenę użytkownika ${user}`, "success");
    } catch (err) {
        console.error("Błąd usuwania oceny sezonu:", err);
    }
}

async function deleteSeasonRecord(itemId, seasonNum) {
    try {
        await dbRef.child(itemId).child('seasons').child(seasonNum).remove();
        
        const snap = await dbRef.child(itemId).once('value');
        if (snap.exists()) {
            showSeasonsModal({ id: itemId, ...snap.val() });
        }
        
        showNotification(`Usunięto sezon ${seasonNum}`, "success");
    } catch (err) { console.error(err); }
}
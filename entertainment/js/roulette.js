// js/roulette.js

let allMovies = [];
let isSpinning = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log("Startowanie Ruletki...");
    
    // Sprawdzamy czy config się załadował
    if (!window.refs) {
        alert("BŁĄD KRYTYCZNY: Nie załadowano config.js! Sprawdź czy plik jest w folderze 'js'.");
        return;
    }

    fetchMovies();
    
    const spinBtn = document.getElementById('spinBtn');
    if(spinBtn) spinBtn.addEventListener('click', startSpin);
    
    const resetBtn = document.getElementById('resetBtn');
    if(resetBtn) resetBtn.addEventListener('click', resetView);
});

// 1. POBIERANIE DANYCH
function fetchMovies() {
    const display = document.getElementById('movieDisplay');
    display.textContent = "ŁADOWANIE...";

    console.log("Próba pobrania filmów z bazy...");

    window.refs.ranking.once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                console.warn("Baza danych jest pusta lub zła ścieżka!");
                display.textContent = "BRAK DANYCH";
                return;
            }

            const data = snapshot.val();
            allMovies = [];

            snapshot.forEach(child => {
                const val = child.val();
                const rating = val.avgRating ? parseFloat(val.avgRating) : parseFloat(val.rating || 0);
                
                // Zabezpieczenie przed pustymi tytułami
                if (val.film) {
                    allMovies.push({
                        title: val.film,
                        rating: rating
                    });
                }
            });

            console.log(`Pobrano ${allMovies.length} filmów.`);
            display.textContent = "🎥🎟️🍿";
        })
        .catch(error => {
            console.error("Błąd pobierania:", error);
            display.textContent = "BŁĄD BAZY";
            alert("Błąd połączenia z bazą: " + error.message);
        });
}

// 2. LOGIKA LOSOWANIA
function startSpin() {
    if (isSpinning) return;
    
    if (allMovies.length === 0) {
        alert("Nie pobrano jeszcze filmów! Poczekaj chwilę lub odśwież stronę.");
        return;
    }

    // Filtrowanie
    const onlyGood = document.getElementById('goodMoviesOnly').checked;
    const pool = onlyGood ? allMovies.filter(m => m.rating >= 7.0) : allMovies;

    console.log(`Losowanie z puli: ${pool.length} filmów (Filtr 7.0+: ${onlyGood})`);

    if (pool.length === 0) {
        alert("Brak filmów spełniających kryteria (powyżej 7.0)!");
        return;
    }

    // Setup UI
    isSpinning = true;
    const display = document.getElementById('movieDisplay');
    const ratingBadge = document.getElementById('ratingDisplay');
    const spinBtn = document.getElementById('spinBtn');
    const controls = document.querySelector('.controls-panel');
    const resultActions = document.getElementById('resultActions');
    
    // --- NOWE: Czyszczenie plakatu przy starcie ---
    const posterImg = document.getElementById('moviePoster');
    const screen = document.querySelector('.roulette-screen');
    
    if (posterImg) {
        posterImg.classList.add('hidden'); // Ukryj plakat
        posterImg.src = ""; // Wyczyść stare źródło
    }
    if (screen) {
        screen.classList.remove('has-poster'); // Przywróć duży tekst
    }
    // ----------------------------------------------

    ratingBadge.classList.add('hidden');
    resultActions.classList.add('hidden');
    controls.style.opacity = "0.5";
    spinBtn.disabled = true;
    display.classList.add('blur-effect');

    // --- ANIMACJA ---
    let speed = 50;
    let counter = 0;
    const totalSpins = 35 + Math.floor(Math.random() * 15);
    
    function step() {
        const randomMovie = pool[Math.floor(Math.random() * pool.length)];
        display.textContent = randomMovie.title;

        counter++;

        if (counter < totalSpins) {
            if (counter > totalSpins - 10) {
                speed += 40; // Zwalnianie
                if (counter === totalSpins - 1) display.classList.remove('blur-effect');
            }
            setTimeout(step, speed);
        } else {
            finalizeSpin(randomMovie);
        }
    }

    step();
}

function finalizeSpin(winner) {
    console.log("Wylosowano:", winner.title);
    isSpinning = false;
    
    const display = document.getElementById('movieDisplay');
    const posterImg = document.getElementById('moviePoster'); // Pobieramy obrazek
    const screen = document.querySelector('.roulette-screen'); // Pobieramy ekran
    const ratingBadge = document.getElementById('ratingDisplay');
    const filmwebLink = document.getElementById('filmwebLink');
    const resultActions = document.getElementById('resultActions');
    const spinBtn = document.getElementById('spinBtn');
    const controls = document.querySelector('.controls-panel');

    // Stylizacja tytułu
    display.style.color = "var(--cyber-blue)";
    display.style.textShadow = "0 0 50px var(--cyber-blue)";
    
    // Ocena
    ratingBadge.textContent = winner.rating.toFixed(1);
    ratingBadge.className = "rating-badge"; 
    
    if (winner.rating >= 8) ratingBadge.style.background = "#10b981";
    else if (winner.rating >= 6) ratingBadge.style.background = "#f59e0b";
    else ratingBadge.style.background = "#ef4444";
    
    ratingBadge.classList.remove('hidden');

    // --- POBIERANIE OKŁADKI (TWÓJ KLUCZ) ---
    const API_KEY = "c2cb53e6"; 
    
    // Reset przed szukaniem
    posterImg.classList.add('hidden');
    screen.classList.remove('has-poster');

    // Szukamy w OMDb
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(winner.title)}&apikey=${API_KEY}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.Poster && data.Poster !== "N/A") {
                posterImg.src = data.Poster;
                posterImg.classList.remove('hidden');
                screen.classList.add('has-poster'); // Dodaje klasę zmniejszającą tekst
            } else {
                console.log("Brak plakatu w OMDb dla:", winner.title);
            }
        })
        .catch(err => console.error("Błąd API okładek:", err));
    // ---------------------------------------

    const query = encodeURIComponent(winner.title);
    filmwebLink.href = `https://www.filmweb.pl/search#/all?query=${query}`;
    
    resultActions.classList.remove('hidden');
    controls.style.display = 'none';
}

function resetView() {
    const display = document.getElementById('movieDisplay');
    const posterImg = document.getElementById('moviePoster');
    const screen = document.querySelector('.roulette-screen');
    const ratingBadge = document.getElementById('ratingDisplay');
    const resultActions = document.getElementById('resultActions');
    const controls = document.querySelector('.controls-panel');
    const spinBtn = document.getElementById('spinBtn');

    display.textContent = "🎥🎟️🍿";
    display.style.color = "white";
    display.style.textShadow = "0 0 30px rgba(255,255,255,0.3)";
    
    // Czyścimy plakat
    if(posterImg) {
        posterImg.classList.add('hidden');
        posterImg.src = "";
    }
    if(screen) screen.classList.remove('has-poster');
    
    ratingBadge.classList.add('hidden');
    resultActions.classList.add('hidden');
    
    controls.style.display = 'flex';
    controls.style.opacity = "1";
    spinBtn.disabled = false;
}
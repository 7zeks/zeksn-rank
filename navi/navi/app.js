// --- LOGIKA KARUELI ---
const carousel = document.querySelector('.carousel');
const cards = document.querySelectorAll('.card');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
const dots = document.querySelectorAll('.dot');

let currentIndex = 1; // Zaczynamy od drugiej karty (indeks 1)
const totalCards = cards.length;


// --- ANIMACJA WEJŚCIA ---
document.addEventListener('DOMContentLoaded', () => {
    const irisContainer = document.getElementById('irisContainer');
    // Lekkie opóźnienie, po którym śluza płynnie się otwiera
    if (irisContainer) {
        setTimeout(() => {
            irisContainer.classList.add('is-open');
        }, 100);
    }
});
// Funkcja do aktualizacji pozycji kart
function updateCarousel(dragOffset = 0, isDragging = false) {
    cards.forEach((card, index) => {
        card.classList.remove('active-card');
        
        // Magiczna matematyka cykliczna - zawsze wskaże poprawną pozycję względem środka
        // 0 = środek, 1 = po prawej, totalCards - 1 = po lewej
        const circularOffset = (index - currentIndex + totalCards) % totalCards;
        
        let transform = '';
        let x = 0;
        let scale = 1;
        let rotY = 0;
        let opacity = 1; // Teraz domyślnie każda karta chce być widoczna
        let pointerEvents = 'auto'; // i klikalna
        
        if (circularOffset === 0) {
            // Centralna karta
            x = dragOffset * 0.3;
            scale = 1;
            rotY = 0;
            card.classList.add('active-card');
        } else if (circularOffset === totalCards - 1) {
            // Karta po lewej (jeden krok w tył w cyklu)
            x = -270 + dragOffset * 0.3;
            scale = 0.8;
            rotY = 35;
        } else if (circularOffset === 1) {
            // Karta po prawej (jeden krok do przodu w cyklu)
            x = 270 + dragOffset * 0.3;
            scale = 0.8;
            rotY = -35;
        } else {
            // Karty ukryte (z tyłu)
            // Jeśli jest bliżej prawej strony leci w prawo, inaczej w lewo
            x = circularOffset <= totalCards / 2 ? 600 + dragOffset * 0.3 : -600 + dragOffset * 0.3; 
            scale = 0.6;
            rotY = 0;
            opacity = 0; // Tylko te spoza ekranu są niewidoczne
            pointerEvents = 'none'; // Zabezpieczenie przed niewidzialnymi kliknięciami
        }
        
        transform = `translateX(${x}px) scale(${scale}) rotateY(${rotY}deg)`;
        card.style.transform = transform;
        card.style.opacity = opacity;
        card.style.pointerEvents = pointerEvents;
        
        // Usuwamy transition podczas drag dla płynności, przywracamy po puszczeniu
        if (isDragging) {
            card.style.transition = 'none';
        } else {
            card.style.transition = 'var(--transition)';
        }
    });
    
    // Aktualizujemy paginację
    dots.forEach((dot, index) => {
        dot.classList.remove('active-dot');
        if (index === currentIndex) {
            dot.classList.add('active-dot');
        }
    });
}

// Obsługa przycisków nawigacji
prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + totalCards) % totalCards;
    updateCarousel();
});

nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % totalCards;
    updateCarousel();
});

// Obsługa klików na kropki paginacji
dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        currentIndex = index;
        updateCarousel();
    });
});

// Obsługa przeciągania myszką
let isDragging = false;
let dragStartX = 0;
let dragCurrentX = 0;
const dragThreshold = 50; // Minimalny dystans do zmiany karty

carousel.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    carousel.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    dragCurrentX = e.clientX - dragStartX;
    updateCarousel(dragCurrentX, true); // Gładkie przesuwanie w trakcie drag
});

document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    carousel.style.cursor = 'grab';
    
    // Jeśli przeciągnięto wystarczająco daleko, zmień kartę
    if (dragCurrentX > dragThreshold) {
        // Przeciągnięcie w prawo = poprzednia karta
        currentIndex = (currentIndex - 1 + totalCards) % totalCards;
    } else if (dragCurrentX < -dragThreshold) {
        // Przeciągnięcie w lewo = następna karta
        currentIndex = (currentIndex + 1) % totalCards;
    }
    dragCurrentX = 0;
    updateCarousel(0, false); // Animuj z powrotem na ostateczną pozycję
});

carousel.addEventListener('mouseenter', () => {
    carousel.style.cursor = 'grab';
});

// Inicjalizacja
updateCarousel();

// --- EFEKT PRZYCISKU "ODPAL" (Tłumaczenie z React/Framer) ---
    const playBtn = document.getElementById('playBtn');
    const cursorsContainer = document.getElementById('cursorsContainer');
    
// ==========================================
// --- ZAAWANSOWANA NAWIGACJA (KARTY + ODPAL) ---
// ==========================================

const moduleLinks = [
    '../Przecho/index.html',     // Karta 0: Dropsite
    '../zeksn-rank/index.html',  // Karta 1: zk`sn rank
    '../matches/index.html',      // Karta 2: zk`ns analysis
    '../fireplace/index.html'     // Karta 3: fireplace
];

// 1. Główna funkcja nawigująca
function navigateToTarget(e, url) {
    e.preventDefault(); 

    prevBtn.style.opacity = '0';
    nextBtn.style.opacity = '0';
    prevBtn.style.pointerEvents = 'none';
    nextBtn.style.pointerEvents = 'none';
    
    if (e.ctrlKey || e.metaKey || e.button === 1) {
        window.open(url, '_blank'); 
    } else if (e.button === 0) {
        
        const irisContainer = document.getElementById('irisContainer');
        const activeCard = document.querySelector('.card.active-card');
        
        if (irisContainer) {
            // 1. Zabieramy klasę 'is-open', co zamyka śluzę
            irisContainer.classList.remove('is-open');
            
            // 2. Odpalamy efekt "lotu w kartę" na aktywnej karcie
            if (activeCard) {
                activeCard.classList.add('is-diving');
            }
            
            // 3. Dodajemy klasę ukrywającą resztę interfejsu (przyciski, tytuł)
            document.body.classList.add('is-navigating');
            
            // 4. Czekamy 1200ms (równiutko z czasem transition w CSS) i zmieniamy stronę
            setTimeout(() => {
                window.location.href = url;
            }, 1200); 
            
        } else {
            window.location.href = url; 
        }
    }
}

// 2. Obsługa przycisku "odpal"
playBtn.addEventListener('click', (e) => {
    navigateToTarget(e, moduleLinks[currentIndex]);
});

// Zdarzenie 'auxclick' jest wymagane do przechwycenia kliknięcia scrollem
playBtn.addEventListener('auxclick', (e) => {
    if (e.button === 1) navigateToTarget(e, moduleLinks[currentIndex]);
});


// 3. System wykrywania "Czy to kliknięcie czy przeciąganie (drag)?"
let wasDragged = false;

carousel.addEventListener('mousedown', () => {
    wasDragged = false; // Przy wciśnięciu myszki zakładamy, że użytkownik chce kliknąć
});

carousel.addEventListener('mousemove', () => {
    if (isDragging) wasDragged = true; // Jeśli podczas trzymania ruszył myszką, to znaczy że przeciąga
});

// 4. Obsługa klikania bezpośrednio w karty
cards.forEach((card, index) => {

    // Obsługa Lewego przycisku i Ctrl+Click na karcie
    card.addEventListener('click', (e) => {
        if (wasDragged) return; // Przerywamy, jeśli to było przeciągnięcie karuzeli

        if (index !== currentIndex) {
            // Jeśli kliknięto kartę, która jest z boku -> przesuń ją na środek
            currentIndex = index;
            updateCarousel();
        } else {
            // Jeśli kliknięto kartę na środku -> odpal stronę
            navigateToTarget(e, moduleLinks[index]);
        }
    });

    // Obsługa Środkowego przycisku (scrolla) na karcie
    card.addEventListener('auxclick', (e) => {
        if (wasDragged) return;

        // Otwieramy w nowej karcie tylko, jeśli to środkowa karta
        if (e.button === 1 && index === currentIndex) {
            navigateToTarget(e, moduleLinks[index]);
        }
    });
});
    // Konfiguracja okręgów z Reacta
    const circles = [140, 180, 220, 260];
    const cursorsPerCircle = [8, 12, 16, 20];

    // Funkcja generująca matematykę kursorów
    function createCursors() {
        cursorsContainer.innerHTML = ''; // Czyścimy poprzednie
        
        circles.forEach((radius, circleIndex) => {
            const count = cursorsPerCircle[circleIndex];
            
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * 2 * Math.PI;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const rotationOutward = Math.atan2(y, x) * (180 / Math.PI);
                
                // Główny kursor + 2 "ogony" (trails) dla efektu płynności
                for (let t = 0; t <= 2; t++) {
                    const isTrail = t > 0;
                    const delay = circleIndex * 0.01 + i * 0.002 + t * 0.008;
                    const opacity = isTrail ? 1 - (t * 0.3) : 1;
                    const scale = isTrail ? 1 - (t * 0.2) : 1;
                    
                    const cursor = document.createElement('div');
                    cursor.className = 'flying-cursor';
                    
                    // Ikona Lucide React MousePointer przetłumaczona na czyste SVG
                    cursor.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/>
                        </svg>
                    `;
                    
                    // Przekazanie obliczeń do CSS Variables
                    cursor.style.setProperty('--x', `${x}px`);
                    cursor.style.setProperty('--y', `${y}px`);
                    cursor.style.setProperty('--rot', `${rotationOutward}deg`);
                    cursor.style.setProperty('--scale', scale);
                    cursor.style.setProperty('--opacity', opacity);
                    cursor.style.setProperty('--delay', `${delay}s`);
                    
                    cursorsContainer.appendChild(cursor);
                }
            }
        });
    }

    // Dodanie eventów
    playBtn.addEventListener('mouseenter', () => {
        if (cursorsContainer.innerHTML === '') {
            createCursors(); // Generujemy DOM dopiero po najechaniu dla wydajności
        }
        // Lekkie opóźnienie wymusza przerysowanie DOM, aby animacja zadziałała poprawnie
        requestAnimationFrame(() => {
            playBtn.classList.add('is-hovered');
        });
    });

    playBtn.addEventListener('mouseleave', () => {
        playBtn.classList.remove('is-hovered');
        // Opcjonalnie: można czyścić zawartość po zakończeniu animacji wyjścia
        setTimeout(() => {
            if (!playBtn.classList.contains('is-hovered')) {
                cursorsContainer.innerHTML = '';
            }
        }, 800); // Czas musi pasować do najdłuższego transition z CSS
    });

    // --- LOGIKA FORTUNE COOKIE ---
const fortunes = [
    { quote: "Twoja przyszłość jest tworzona przez to co robisz dzisiaj, nie jutro.", numbers: [7, 14, 23, 31, 42, 56] },
    { quote: "Najlepszy czas na posadzenie drzewa był 20 lat temu. Drugi najlepszy czas jest teraz.", numbers: [3, 18, 27, 35, 49, 63] },
    { quote: "Sukces nie jest ostateczny, porażka nie jest fatalna: liczy się odwaga by kontynuować.", numbers: [9, 16, 24, 38, 47, 55] },
    { quote: "Uwierz, że możesz, a będziesz w połowie drogi.", numbers: [2, 11, 29, 33, 44, 51] },
    { quote: "Jedynym sposobem na wykonanie świetnej pracy jest kochanie tego, co się robi.", numbers: [5, 12, 21, 36, 43, 58] },
    { quote: "Nieważne jak wolno idziesz, dopóki się nie zatrzymujesz.", numbers: [8, 15, 22, 37, 46, 59] },
    { quote: "Pośrodku trudności leży okazja.", numbers: [4, 13, 25, 32, 48, 57] }
];

const fortuneModal = document.getElementById('fortuneModal');
const closeFortuneBtn = document.getElementById('closeFortuneBtn');

// TUTAJ ZMIANA: Szukamy nowej ikony na pasku (musisz mieć ten przycisk w HTML)
const openFortuneBtn = document.getElementById('openFortuneBtn'); 

// Stany ciasteczka
const stateUnopened = document.getElementById('cookieUnopened');
const stateCracking = document.getElementById('cookieCracking');
const stateOpened = document.getElementById('cookieOpened');

// Elementy klikalne
const crackBtn = document.getElementById('crackBtn');
const resetCookieBtn = document.getElementById('resetCookieBtn');

// Elementy docelowe na tekst
const quoteEl = document.getElementById('fortuneQuote');
const numbersEl = document.getElementById('fortuneNumbers');

// Otwieranie modalu TYLKO po kliknięciu w nową ikonę ciasteczka
if (openFortuneBtn) {
    openFortuneBtn.addEventListener('click', () => {
        fortuneModal.classList.remove('hidden');
    });
}

// Zamykanie modalu
closeFortuneBtn.addEventListener('click', () => {
    fortuneModal.classList.add('hidden');
    // Mały reset w tle
    setTimeout(resetCookie, 500);
});

// Zmiana stanów (Switch klas 'active' i 'hidden')
function switchState(showState) {
    stateUnopened.classList.remove('active'); stateUnopened.classList.add('hidden');
    stateCracking.classList.remove('active'); stateCracking.classList.add('hidden');
    stateOpened.classList.remove('active'); stateOpened.classList.add('hidden');
    
    showState.classList.remove('hidden');
    // Timeout wymusza restart animacji CSS
    setTimeout(() => showState.classList.add('active'), 10);
}

// Logika pękania
crackBtn.addEventListener('click', () => {
    switchState(stateCracking);
    
    // Losowanie wróżby
    const randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    
    // Po 2 sekundach (tyle trwa animacja CSS pękania), pokaż wynik
    setTimeout(() => {
        // Wypełnianie danych
        quoteEl.textContent = `"${randomFortune.quote}"`;
        numbersEl.innerHTML = '';
        
        randomFortune.numbers.forEach((num, index) => {
            const numDiv = document.createElement('div');
            numDiv.className = 'lucky-number';
            numDiv.textContent = num;
            // Dodajemy opóźnienie animacji dla każdej liczby żeby "wskakiwały" po kolei
            numDiv.style.animationDelay = `${index * 0.1}s`;
            numbersEl.appendChild(numDiv);
        });
        
        switchState(stateOpened);
    }, 2000);
});

// Resetowanie do początku
function resetCookie() {
    switchState(stateUnopened);
}

resetCookieBtn.addEventListener('click', resetCookie);

// ==========================================
// --- LOGIKA MOTYWU (JASNY/CIEMNY) ---
// ==========================================
const themeToggleBtn = document.getElementById('themeToggle');
const htmlElement = document.documentElement; 

if (themeToggleBtn) {
    // Ikony SVG
    const sunIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    const moonIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

    // Sprawdzenie zapisanego motywu w pamięci przeglądarki
    const savedTheme = localStorage.getItem('theme');
    
    // Ustawienie początkowego motywu (domyślnie ciemny, żeby pasował do Twojej wizji)
    if (savedTheme === 'light') {
        htmlElement.classList.remove('dark');
        themeToggleBtn.innerHTML = moonIcon;
    } else {
        htmlElement.classList.add('dark');
        themeToggleBtn.innerHTML = sunIcon;
    }

    // Nasłuchiwanie kliknięcia
    themeToggleBtn.addEventListener('click', () => {
        htmlElement.classList.toggle('dark');
        
        // Zapisanie wyboru użytkownika i zmiana ikony
        if (htmlElement.classList.contains('dark')) {
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.innerHTML = sunIcon;
        } else {
            localStorage.setItem('theme', 'light');
            themeToggleBtn.innerHTML = moonIcon;
        }
    });
}

// ==========================================
// --- NAPRAWA ANIMACJI PO POWROCIE WSTECZ (BFCache) ---
// ==========================================
window.addEventListener('pageshow', (event) => {
    // Jeśli strona została przywrócona z pamięci podręcznej (przycisk Wstecz)
    // lub po prostu ładuje się na nowo, zdejmujemy wszystkie klasy "uciekające"
    
    // 1. Odkrywamy cały interfejs
    document.body.classList.remove('is-navigating');
    
    // 2. Zabieramy klasę "is-diving" ze wszystkich kart, żeby wróciły na miejsce
    const divingCards = document.querySelectorAll('.card.is-diving');
    divingCards.forEach(card => card.classList.remove('is-diving'));
    
    // 3. Ponownie otwieramy śluzę
    const irisContainer = document.getElementById('irisContainer');
    if (irisContainer && !irisContainer.classList.contains('is-open')) {
        irisContainer.classList.add('is-open');
    }

    // 4. Przywracamy przyciski nawigacyjne karuzeli, które wcześniej ukryliśmy
    if (typeof prevBtn !== 'undefined' && typeof nextBtn !== 'undefined') {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'auto';
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
    }
});
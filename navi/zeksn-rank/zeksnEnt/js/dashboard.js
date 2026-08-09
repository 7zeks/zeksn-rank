// js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initWeather();
    initVisitCounter();
    fetchRestreamLinks();
    initTicker();

});

// --- 1. ZEGAR I DATA ---
function initClock() {
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');

    function update() {
        const now = new Date();
        
        // Czas
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        clockEl.textContent = `${hours}:${minutes}`;

        // Data
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        dateEl.textContent = now.toLocaleDateString('pl-PL', options);
    }
    
    update();
    setInterval(update, 1000); // Odświeżaj co sekundę
}

// --- 2. POGODA (Open-Meteo API - darmowe, bez klucza) ---
async function initWeather() {
    // Domyślnie Warszawa (52.22, 21.01) - możesz zmienić koordynaty
    const lat = 51.24;
    const lon = 21.09;
    
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await res.json();
        
        if (data.current_weather) {
            const temp = Math.round(data.current_weather.temperature);
            document.querySelector('.weather-temp').textContent = `${temp}°C`;
            // Prosta ikona zależna od kodu pogody (uproszczona)
            document.querySelector('.weather-icon').textContent = temp > 15 ? '☀️' : '☁️';
        }
    } catch (e) {
        console.log("Błąd pogody:", e);
    }
}

// --- 3. POBIERANIE LINKÓW Z FIREBASE (Restream) ---
function fetchRestreamLinks() {
    const container = document.getElementById('restreamGrid');
    
    // Używamy referencji z config.js
    refs.restream.once('value', snapshot => {
        container.innerHTML = ''; // Czyścimy "Loading..."
        
        if (!snapshot.exists()) {
            container.innerHTML = '<div style="color:gray">Brak linków w bazie. Dodaj je w Panelu Admina!</div>';
            return;
        }

        const data = snapshot.val(); // To jest tablica lub obiekt
        const items = Object.values(data); // Konwertujemy na tablicę

        // Filtrujemy i spłaszczamy strukturę (żeby wyjąć linki z folderów)
        // Na startpage chcemy mieć szybki dostęp do wszystkiego
        const allLinks = [];

        items.forEach(item => {
            if (item.type === 'folder' && item.children) {
                // Jeśli folder -> dodaj jego zawartość
                item.children.forEach(child => {
                    if (child.url) allLinks.push(child);
                });
            } else if (item.url) {
                // Jeśli zwykły link -> dodaj
                allLinks.push(item);
            }
        });

        // Generowanie HTML

// --- 4. LIVE TICKER (WERSJA POPRAWIONA) ---
async function initTicker() {
    const tickerEl = document.getElementById('tickerContent');
    
    // Zabezpieczenie: jeśli nie ma paska w HTML, przerwij
    if (!tickerEl) {
        console.error("Błąd: Nie znaleziono elementu #tickerContent");
        return;
    }

    const quotes = [
        "May the Force be with you.",
        "I'll be back.",
        "Why so serious?",
        "Wake up, Neo...",
        "It's alive! It's alive!",
        "Houston, we have a problem."
    ];

    // Domyślna wartość (na wypadek błędu API)
    let cryptoHtml = '<span class="ticker-item"><span class="ticker-highlight">SYSTEM</span> ONLINE</span>';
    
    try {
        // Ustawiamy limit czasu na 2 sekundy (żeby nie wisiało wiecznie)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Anuluj timer, jeśli się udało

        if (response.ok) {
            const data = await response.json();
            const btc = data.bitcoin;
            const eth = data.ethereum;
            
            const getTrend = (val) => val >= 0 ? 'trend-up' : 'trend-down';
            const arrow = (val) => val >= 0 ? '▲' : '▼';

            cryptoHtml = `
                <span class="ticker-item">
                    <span class="ticker-highlight">BTC</span> $${btc.usd} 
                    <span class="${getTrend(btc.usd_24h_change)}">(${arrow(btc.usd_24h_change)} ${btc.usd_24h_change.toFixed(2)}%)</span>
                </span>
                <span class="ticker-item">
                    <span class="ticker-highlight">ETH</span> $${eth.usd} 
                    <span class="${getTrend(eth.usd_24h_change)}">(${arrow(eth.usd_24h_change)} ${eth.usd_24h_change.toFixed(2)}%)</span>
                </span>
            `;
        }
    } catch (e) {
        console.warn("API Krypto nie odpowiada (to normalne na darmowym planie), używam wersji offline.", e);
        // Tu nic nie robimy, zostaje "SYSTEM ONLINE"
    }

    // Losowanie cytatu
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    const quoteHtml = `<span class="ticker-item">🎬 "${randomQuote}"</span>`;
    
    // Status
    const statusHtml = `<span class="ticker-item">🚀 NEON HUB v2.0 READY</span>`;

    // Składamy pasek (powielamy treść x3 dla płynności animacji)
    const content = cryptoHtml + quoteHtml + statusHtml;
    tickerEl.innerHTML = content + content + content;
}

function initVisitCounter() {
    const counterEl = document.getElementById('visitCount');
    // Odwołujemy się bezpośrednio do bazy
    const visitRef = firebase.database().ref('stats/visits');

    // Transakcja - bezpieczne zwiększanie licznika (nawet jak 10 osób wejdzie naraz)
    visitRef.transaction((current_value) => {
        return (current_value || 0) + 1;
    }).then((result) => {
        if (result.committed) {
            const val = result.snapshot.val();
            // Formatowanie: dodajemy zera wiodące (np. 001234)
            counterEl.textContent = String(val).padStart(6, '0');
        }
    }).catch(err => {
        console.error("Licznik error:", err);
        counterEl.textContent = "ERROR";
    });
}

allLinks.forEach(link => {
    const tile = document.createElement('a');
    
    // --- 🛠️ NAPRAWIENIE LINKÓW (SMART URL) ---
    let safeUrl = link.url;
    
    // Sprawdzamy, czy link już ma http:// lub https://
    // Jeśli NIE ma, to dopisujemy https://
    if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://')) {
        safeUrl = 'https://' + safeUrl;
    }
    
    tile.href = safeUrl;
    // ------------------------------------------

    tile.target = "_blank";
    tile.className = "shortcut-tile";
    
    // Pobieranie domeny dla faviconki
    let domain = "";
    try { 
        // Teraz używamy safeUrl, więc funkcja URL() nie wyrzuci błędu
        domain = new URL(safeUrl).hostname; 
    } catch(e) {
        console.warn("Błędny URL:", safeUrl);
    }
    
    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : 'assets/icon.png';

    tile.innerHTML = `
        <img src="${faviconUrl}" style="width:24px; height:24px; border-radius:4px;" alt="icon">
        <span class="shortcut-name">${link.name || "Link"}</span>
    `;
    
    container.appendChild(tile);
});
    });
}
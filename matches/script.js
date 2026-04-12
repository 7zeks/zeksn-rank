// =========================================
// 1. WZORZEC ZWYCIĘZCY Z TWOICH TABEL
// =========================================
const WINNER_PROFILE = {
    possession: 57.5,    // Środek przedziału 55-60%
    shotsOnTarget: 5.5,  // Środek przedziału 5-6
    totalShots: 14,      // Środek przedziału 13-15
    corners: 5.5         // Środek przedziału 5-6
};

// =========================================
// 2. FUNKCJA POBIERAJĄCA Z ZEWNĄTRZ (SYMULACJA API)
// =========================================
// Tutaj docelowo wstawisz swojego fetch() do API. 
// Na razie zwraca sztuczne dane, żeby strona działała bez wywalania błędów.
async function fetchExternalStats(teamName) {
    console.log(`Pobieranie danych zewnętrznych dla: ${teamName}...`);
    
    // Symulacja opóźnienia sieci (np. 1 sekunda)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Symulowana baza danych zewnętrznego API (zastąp to potem prawdziwym API)
    const externalDatabase = {
        "Real Madryt": { possession: 58, shotsOnTarget: 6.2, totalShots: 15, corners: 6 },
        "FC Barcelona": { possession: 64, shotsOnTarget: 5.8, totalShots: 13, corners: 5 },
        "Bayern Munich": { possession: 61, shotsOnTarget: 7.1, totalShots: 16, corners: 7 },
        "Manchester City": { possession: 68, shotsOnTarget: 6.9, totalShots: 14, corners: 8 },
        "Arsenal": { possession: 59, shotsOnTarget: 5.5, totalShots: 14, corners: 6 }
    };

    // Zwraca dane z bazy lub domyślne "średniackie" statystyki
    return externalDatabase[teamName] || { possession: 50, shotsOnTarget: 4, totalShots: 10, corners: 4 };
}

// =========================================
// 3. TWÓJ ALGORYTM BAZUJĄCY NA WZORCU
// =========================================
function calculateProbability(statsA, statsB) {
    let scoreA = 0;
    let scoreB = 0;

    // Funkcja pomocnicza obliczająca "podobieństwo" statystyki do wzorca zwycięzcy.
    // Im bliżej statystyka jest (lub przekracza) wzorzec, tym więcej punktów.
    const evaluateStat = (valA, valB, target, weight) => {
        // Liczymy stosunek względem wzorca (max 1.2, żeby wielkie odchylenia nie psuły matmy)
        const ratioA = Math.min(valA / target, 1.2);
        const ratioB = Math.min(valB / target, 1.2);
        
        scoreA += ratioA * weight;
        scoreB += ratioB * weight;
    };

    // Przypisujemy wagi (tak jak chciałeś, strzały celne są najważniejsze)
    evaluateStat(statsA.shotsOnTarget, statsB.shotsOnTarget, WINNER_PROFILE.shotsOnTarget, 60); // 60% wagi
    evaluateStat(statsA.possession, statsB.possession, WINNER_PROFILE.possession, 20);          // 20% wagi
    evaluateStat(statsA.totalShots, statsB.totalShots, WINNER_PROFILE.totalShots, 10);          // 10% wagi
    evaluateStat(statsA.corners, statsB.corners, WINNER_PROFILE.corners, 10);                   // 10% wagi

    // Przeliczamy to na ostateczne procenty (zabezpieczone od 5% do 95%)
    const totalScore = scoreA + scoreB;
    const probA = Math.max(5, Math.min(95, Math.round((scoreA / totalScore) * 100)));
    const probB = Math.max(5, Math.min(95, Math.round((scoreB / totalScore) * 100)));

    return { probA, probB };
}

// =========================================
// 4. PRZYCISK KALKULUJ
// =========================================
document.getElementById('calculateBtn').addEventListener('click', async () => {
    const inputA = document.getElementById('teamAInput').value.trim();
    const inputB = document.getElementById('teamBInput').value.trim();

    if (!inputA || !inputB) {
        alert('Wpisz nazwy obu drużyn!');
        return;
    }

    const btn = document.getElementById('calculateBtn');
    btn.disabled = true;
    btn.classList.add('loading');
    btn.textContent = 'Obliczanie...';

    try {
        // Pobieramy "zewnętrzne" dane
        const statsA = await fetchExternalStats(inputA);
        const statsB = await fetchExternalStats(inputB);

        // Odpalamy algorytm
        const { probA, probB } = calculateProbability(statsA, statsB);

        // Tu wstaw kod do aktualizacji paska postępu z Twojej funkcji showResults()
        document.getElementById('probA').textContent = `${probA}%`;
        document.getElementById('probB').textContent = `${probB}%`;
        document.getElementById('progressBar').style.width = `${probA}%`;
        
        // Zaktualizuj liczby pod paskiem postępu
        document.getElementById('statPossA').textContent = `${statsA.possession}%`;
        document.getElementById('statPossB').textContent = `${statsB.possession}%`;
        document.getElementById('statShotsA').textContent = statsA.shotsOnTarget;
        document.getElementById('statShotsB').textContent = statsB.shotsOnTarget;

        document.getElementById('results').classList.remove('hidden');

    } catch (error) {
        alert('Błąd podczas pobierania danych.');
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = 'Kalkuluj';
    }
});

// =========================================
// 5. POBIERANIE STATYSTYK
// =========================================
async function getAverageStats(teamId) {
    const cacheKey = `stats_${teamId}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const seasons = [2024, 2023, 2022];
    let fixtures = [];

    for (const season of seasons) {
        const data = await apiFetch(`${API_URL}/fixtures?team=${teamId}&last=5&status=FT&season=${season}`);
        if (data && data.length > 0) { fixtures = data; break; }
    }

    if (fixtures.length === 0) {
        console.warn(`[Stats] Brak meczów dla ID ${teamId}`);
        return null;
    }

    let totalPossession = 0, totalShots = 0, validCount = 0;

    for (const match of fixtures) {
        const stats = await apiFetch(`${API_URL}/fixtures/statistics?fixture=${match.fixture.id}&team=${teamId}`);
        if (stats && stats.length > 0) {
            const statList = stats[0].statistics;
            const poss = statList.find(s => s.type === 'Ball Possession');
            const shots = statList.find(s => s.type === 'Shots on Goal');
            const possVal = poss?.value ? parseInt(String(poss.value).replace('%', '')) : NaN;
            const shotsVal = shots?.value !== null && shots?.value !== undefined ? parseInt(shots.value) : NaN;
            if (!isNaN(possVal) && !isNaN(shotsVal)) {
                totalPossession += possVal;
                totalShots += shotsVal;
                validCount++;
            }
        }
    }

    if (validCount === 0) return null;

    const result = {
        avgPossession: Math.round(totalPossession / validCount),
        avgShots: Math.round((totalShots / validCount) * 10) / 10
    };
    setCachedData(cacheKey, result);
    return result;
}

// =========================================
// 6. POBIERANIE H2H
// =========================================
async function getH2HStats(teamIdA, teamIdB) {
    const cacheKey = `h2h_${Math.min(teamIdA, teamIdB)}_${Math.max(teamIdA, teamIdB)}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const data = await apiFetch(`${API_URL}/fixtures/headtohead?h2h=${teamIdA}-${teamIdB}&last=10`);
    if (!data || data.length === 0) return null;

    let winsA = 0, winsB = 0;
    data.forEach(match => {
        const homeId = match.teams.home.id;
        const homeWin = match.teams.home.winner;
        const awayWin = match.teams.away.winner;
        if (homeWin === null && awayWin === null) return;
        if ((homeId === teamIdA && homeWin) || (homeId !== teamIdA && awayWin)) winsA++;
        else winsB++;
    });

    const total = data.length;
    const result = { winsA, winsB, total, ratioA: winsA / total, ratioB: winsB / total };
    setCachedData(cacheKey, result);
    return result;
}

// =========================================
// 7. KALKULACJA PRAWDOPODOBIEŃSTWA
// =========================================
function calculateProbability(statsA, statsB, h2h, useH2H) {
    let scoreA = 50, scoreB = 50;

    if (statsA && statsB) {
        const maxShots = Math.max(statsA.avgShots, statsB.avgShots, 1);
        scoreA = (statsA.avgPossession * 0.4) + ((statsA.avgShots / maxShots) * 100 * 0.6);
        scoreB = (statsB.avgPossession * 0.4) + ((statsB.avgShots / maxShots) * 100 * 0.6);
    } else if (statsA && !statsB) {
        scoreA = 60; scoreB = 40;
    } else if (!statsA && statsB) {
        scoreA = 40; scoreB = 60;
    }

    // Korekta H2H (max ±15 pkt)
    if (useH2H && h2h && h2h.total >= 3) {
        const boost = (h2h.ratioA - 0.5) * 30;
        scoreA += boost;
        scoreB -= boost;
    }

    const total = scoreA + scoreB;
    return {
        probA: Math.max(5, Math.min(95, Math.round((scoreA / total) * 100))),
        probB: Math.max(5, Math.min(95, Math.round((scoreB / total) * 100)))
    };
}

// =========================================
// 8. WYŚWIETLANIE WYNIKÓW
// =========================================
function showResults(statsA, statsB, probA, probB) {
    document.getElementById('nameA').textContent = teamNameA;
    document.getElementById('nameB').textContent = teamNameB;
    document.getElementById('probA').textContent = `${probA}%`;
    document.getElementById('probB').textContent = `${probB}%`;
    document.getElementById('progressBar').style.width = `${probA}%`;

    document.getElementById('statPossA').textContent = statsA ? `${statsA.avgPossession}%` : '–';
    document.getElementById('statPossB').textContent = statsB ? `${statsB.avgPossession}%` : '–';
    document.getElementById('statShotsA').textContent = statsA ? statsA.avgShots : '–';
    document.getElementById('statShotsB').textContent = statsB ? statsB.avgShots : '–';

    document.getElementById('results').classList.remove('hidden');
}

// =========================================
// 9. PRZYCISK KALKULUJ
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('calculateBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        if (!selectedTeamA || !selectedTeamB) {
            alert('Wybierz obie drużyny z listy podpowiedzi!');
            return;
        }
        if (String(selectedTeamA) === String(selectedTeamB)) {
            alert('Wybierz dwie różne drużyny!');
            return;
        }

        // Reset flagi - jeden alert na kalkulację
        apiLimitAlertShown = false;

        btn.disabled = true;
        btn.textContent = 'Obliczam...';

        try {
            const useH2H = document.getElementById('h2hSwitch')?.checked ?? true;

            const [statsA, statsB, h2h] = await Promise.all([
                getAverageStats(selectedTeamA),
                getAverageStats(selectedTeamB),
                useH2H ? getH2HStats(selectedTeamA, selectedTeamB) : Promise.resolve(null)
            ]);

            console.log('[Wyniki] statsA:', statsA, '| statsB:', statsB, '| h2h:', h2h);

            const { probA, probB } = calculateProbability(statsA, statsB, h2h, useH2H);
            showResults(statsA, statsB, probA, probB);

        } catch (err) {
            console.error('[Kalkulacja] Nieoczekiwany błąd:', err);
            alert('Wystąpił nieoczekiwany błąd. Sprawdź konsolę (F12).');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Kalkuluj';
        }
    });
});

// =========================================
// 10. TICKER
// =========================================
function initClubTicker() {
    const track = document.getElementById('tickerTrack');
    if (!track) return;

    const logos = [
        "https://media.api-sports.io/football/teams/42.png",
        "https://media.api-sports.io/football/teams/49.png",
        "https://media.api-sports.io/football/teams/40.png",
        "https://media.api-sports.io/football/teams/50.png",
        "https://media.api-sports.io/football/teams/33.png",
        "https://media.api-sports.io/football/teams/47.png",
        "https://media.api-sports.io/football/teams/34.png",
        "https://media.api-sports.io/football/teams/529.png",
        "https://media.api-sports.io/football/teams/541.png",
        "https://media.api-sports.io/football/teams/530.png",
        "https://media.api-sports.io/football/teams/496.png",
        "https://media.api-sports.io/football/teams/497.png",
        "https://media.api-sports.io/football/teams/505.png",
        "https://media.api-sports.io/football/teams/157.png",
        "https://media.api-sports.io/football/teams/153.png",
        "https://media.api-sports.io/football/teams/85.png"
    ];

    [1, 2].forEach(() => logos.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'ticker-logo';
        img.alt = 'Logo Klubu';
        track.appendChild(img);
    }));
}

document.addEventListener('DOMContentLoaded', initClubTicker);

// =========================================
// 11. NOTATNIK + KLIKALNE LOGA TICKERA
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    const dockLinks = document.querySelectorAll('.dock-link');
    const stickyNote = document.getElementById('stickyNote');
    const closeStickyBtn = document.getElementById('closeStickyBtn');
    const dragStickyBtn = document.getElementById('dragStickyBtn');
    const inputA = document.getElementById('teamAInput');
    const inputB = document.getElementById('teamBInput');
    const tickerTrack = document.getElementById('tickerTrack');

    const teamNames = {
        "42": "Arsenal", "49": "Chelsea", "40": "Liverpool", "50": "Manchester City",
        "33": "Manchester United", "47": "Tottenham", "34": "Newcastle",
        "529": "FC Barcelona", "541": "Real Madrid", "530": "Atletico Madrid",
        "505": "Inter", "497": "AC Milan", "496": "Juventus", "157": "Bayern Munich",
        "153": "Borussia Dortmund", "85": "Paris Saint Germain"
    };

    if (tickerTrack) {
        tickerTrack.addEventListener('click', (e) => {
            const img = e.target.closest('.ticker-logo');
            if (!img) return;
            const teamId = img.src.split('/').pop().split('.')[0];
            const teamName = teamNames[teamId] || 'Klub piłkarski';
            const idNum = parseInt(teamId, 10);

            if (!inputA.value) {
                inputA.value = teamName;
                selectedTeamA = idNum;
                teamNameA = teamName;
            } else if (!inputB.value && inputA.value !== teamName) {
                inputB.value = teamName;
                selectedTeamB = idNum;
                teamNameB = teamName;
            }
        });
    }

    if (stickyNote && closeStickyBtn) {
        dockLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                stickyNote.classList.toggle('active');
            });
        });
        closeStickyBtn.addEventListener('click', () => stickyNote.classList.remove('active'));

        if (dragStickyBtn) {
            let isDragging = false, offsetX = 0, offsetY = 0;

            dragStickyBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isDragging = true;
                const rect = stickyNote.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                Object.assign(stickyNote.style, {
                    right: 'auto', bottom: 'auto', transform: 'none',
                    transition: 'none',
                    left: `${rect.left}px`, top: `${rect.top}px`
                });
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                stickyNote.style.left = `${e.clientX - offsetX}px`;
                stickyNote.style.top = `${e.clientY - offsetY}px`;
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    stickyNote.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                }
            });
        }
    }
});
// js/tierlist.js

document.addEventListener('DOMContentLoaded', () => {
    // Sprawdzenie configu
    if (!window.refs) {
        alert("Błąd: Brak config.js!");
        return;
    }
    
    fetchMoviesForBank();
    setupDragAndDrop();
    setupScreenshotButton(); // <--- Nowa funkcja
});

function setupScreenshotButton() {
    const saveBtn = document.getElementById('saveScreenBtn');
    
    // Zabezpieczenie: czy przycisk istnieje?
    if (!saveBtn) return;

    saveBtn.addEventListener('click', () => {
        const container = document.querySelector('.tier-container');
        
        // Zmień tekst przycisku, żeby user wiedział, że coś się dzieje
        const originalText = saveBtn.textContent;
        saveBtn.textContent = "⏳ Generowanie...";
        saveBtn.disabled = true; // Zablokuj klikanie

        // Konfiguracja html2canvas
        const options = {
            backgroundColor: "#0f0f1f", // Kolor tła Twojej strony (inaczej będzie białe/przezroczyste)
            scale: 2, // Lepsza jakość (HD)
            logging: true, // Pokaże błędy w konsoli
            useCORS: true // Ważne przy zewnętrznych obrazkach
        };

        // Generowanie
        // Sprawdzamy czy biblioteka się załadowała
        if (typeof html2canvas === 'undefined') {
            alert("Błąd: Biblioteka html2canvas nie została załadowana!");
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            return;
        }

        html2canvas(container, options).then(canvas => {
            // Tworzenie linku do pobrania
            const link = document.createElement('a');
            link.download = 'moj-ranking-filmow.jpg';
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
            
            // Przywróć przycisk
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }).catch(err => {
            console.error("Błąd screenshota:", err);
            alert("Nie udało się zapisać obrazka. Sprawdź konsolę (F12).");
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        });
    });
}

function fetchMoviesForBank() {
    const bank = document.getElementById('moviesBank');
    if(!bank) return;

    window.refs.ranking.once('value', snapshot => {
        bank.innerHTML = ''; 

        if (!snapshot.exists()) return;

        snapshot.forEach(child => {
            const val = child.val();
            const div = document.createElement('div');
            div.className = 'movie-card';
            div.textContent = val.film;
            div.draggable = true; 
            div.id = 'movie-' + child.key; 
            
            const rating = val.avgRating || 0;
            div.title = `Ocena: ${rating}`;
            
            bank.appendChild(div);
        });
    });
}

function setupDragAndDrop() {
    let draggedItem = null;

    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('movie-card')) {
            draggedItem = e.target;
            e.target.style.opacity = '0.5';
            e.dataTransfer.setData('text/plain', e.target.id);
        }
    });

    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('movie-card')) {
            e.target.style.opacity = '1';
            draggedItem = null;
            document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('drag-over'));
        }
    });

    const zones = document.querySelectorAll('.drop-zone');
    
    zones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            
            const id = e.dataTransfer.getData('text/plain');
            const item = document.getElementById(id);
            
            if (item) {
                zone.appendChild(item);
            }
        });
    });
}
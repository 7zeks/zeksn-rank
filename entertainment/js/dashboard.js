
document.addEventListener('DOMContentLoaded', () => {
    // Reveal app after short delay to prevent transition flash
    setTimeout(() => {
        document.body.classList.remove('preload-theme');
    }, 300);

    updateClock();
    setInterval(updateClock, 60000);
    
    fetchWeather();
    loadShortcuts();
});

function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');

    clockEl.textContent = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    dateEl.textContent = now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}

async function fetchWeather() {
    const weatherEl = document.getElementById('weather');
    try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=52.22&longitude=21.01&current_weather=true');
        const data = await res.json();
        weatherEl.textContent = `${Math.round(data.current_weather.temperature)}°C`;
    } catch (e) {
        weatherEl.style.display = 'none';
    }
}

function loadShortcuts() {
    const grid = document.getElementById('links-grid');
    if (!window.refs || !window.refs.restream) return;

    window.refs.restream.once('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        grid.innerHTML = '';
        renderItems(data, grid);
    });
}

function renderItems(list, container) {
    list.forEach(item => {
        if (item.type === 'link') {
            const tile = document.createElement('a');
            tile.className = 'modern-tile';
            tile.target = '_blank';
            
            let url = item.url.startsWith('http') ? item.url : 'https://' + item.url;
            tile.href = url;

            const domain = new URL(url).hostname;
            tile.innerHTML = `
                <img src="https://www.google.com/s2/favicons?sz=128&domain=${domain}" alt="">
                <span>${item.name}</span>
            `;
            container.appendChild(tile);
        } else if (item.children) {
            renderItems(item.children, container);
        }
    });
}

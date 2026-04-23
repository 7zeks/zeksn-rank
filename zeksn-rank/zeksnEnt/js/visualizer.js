// js/visualizer.js

const startBtn = document.getElementById('startMicBtn');
const canvas = document.getElementById('audio-canvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('statusText');

let audioContext;
let analyser;
let source;
let isRunning = false;

// Dostosuj rozmiar canvasu
canvas.width = window.innerWidth;
canvas.height = window.innerHeight * 0.6;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.6;
});

startBtn.addEventListener('click', async () => {
    if (isRunning) return;

    try {
        statusText.textContent = "Proszę zaakceptować dostęp do mikrofonu...";
        
        // 1. Prosimy przeglądarkę o dostęp do audio
        // To uruchomi okienko "Czy zezwolić na mikrofon?"
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // 2. Jeśli się uda, inicjujemy AudioContext
        initAudioContext(stream);
        
        statusText.textContent = "🎧 Nasłuchiwanie aktywne! Puść muzykę.";
        startBtn.style.display = 'none'; // Ukrywamy przycisk
        isRunning = true;

    } catch (err) {
        console.error(err);
        statusText.textContent = "❌ Błąd: Brak dostępu do audio. Sprawdź ustawienia.";
        statusText.style.color = "red";
    }
});

function initAudioContext(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    
    // Ustawienia analizatora
    analyser.fftSize = 512; // Zwiększyłem dla lepszej dokładności
    analyser.smoothingTimeConstant = 0.8; // Wygładza ruch słupków

    // 3. Tworzymy źródło ze strumienia (zamiast z pliku)
    source = audioContext.createMediaStreamSource(stream);
    
    // 4. Łączymy źródło TYLKO z analizatorem. 
    // WAŻNE: Nie łączymy z głośnikami (destination), żeby uniknąć sprzężenia zwrotnego (pisku)!
    source.connect(analyser);
    
    animate();
}

function animate() {
    // Czyścimy ekran
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] * 2.5; // Mnożnik wysokości
        
        // Kolorowanie - trochę bardziej zaawansowane
        // Dół (cichsze) -> Fiolet, Góra (głośne) -> Cyjan/Biel
        const r = barHeight + (25 * (i/bufferLength));
        const g = 50 * (i/bufferLength);
        const b = 200; // Więcej niebieskiego dla neonu
        
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        
        // Rysujemy słupek
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }

    requestAnimationFrame(animate);
}
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Sprzątanie po starym Fluidzie (jeśli w HTML został stary canvas)
    const oldCanvas = document.getElementById('fluid-canvas');
    if (oldCanvas) {
        oldCanvas.remove(); // Usuwamy go, żeby nie przeszkadzał
    }

    // 2. Uruchomienie Vanta Birds
    // Upewniamy się, że biblioteka się załadowała
    if (window.VANTA) {
        VANTA.BIRDS({
            el: "body",                 // Podpinamy pod całe tło strony
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00,
            
            // --- KOLORY (Dopasowane do Twojego stylu) ---
            backgroundColor: 0x0f0f1f,  // Twoje ciemne tło
            color1: 0x8b5cf6,           // Fiolet (Primary)
            color2: 0x00d4ff,           // Błękit (Cyber Blue)
            colorMode: "lerpGradient",  // Płynne przejścia
            
            // --- PARAMETRY PTAKÓW ---
            birdSize: 1.50,
            wingSpan: 30.00,
            speedLimit: 5.00,
            separation: 50.00,
            alignment: 50.00,
            cohesion: 50.00,
            quantity: 3.00              // Ilość ptaków (3-4 jest optymalne)
        });
    } else {
        console.error("Nie załadowano bibliotek Vanta/Three.js! Sprawdź HTML.");
    }

    // 3. Fix CSS - upewniamy się, że tło jest pod spodem
    setTimeout(() => {
        const vantaCanvas = document.querySelector('.vanta-canvas');
        if (vantaCanvas) {
            vantaCanvas.style.position = 'fixed';
            vantaCanvas.style.top = '0';
            vantaCanvas.style.left = '0';
            vantaCanvas.style.zIndex = '-1'; // Wrzuca tło pod tabele
            vantaCanvas.style.pointerEvents = 'none'; // Ważne: pozwala klikać przez ptaki
        }
    }, 100);
});
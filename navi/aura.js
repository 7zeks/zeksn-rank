document.addEventListener('DOMContentLoaded', () => {
    const auraBtn = document.getElementById('auraToggle');
    const moggMusic = document.getElementById('moggMusic');
    const body = document.body;

    if (auraBtn && moggMusic) {
        auraBtn.addEventListener('click', () => {
            body.classList.toggle('aura-active');
            
            if (body.classList.contains('aura-active')) {
                // ODPALAMY TRYB AURY
                moggMusic.volume = 0.8;
                moggMusic.play().catch(e => console.log("Przeglądarka blokuje autoplay, kliknij jeszcze raz."));
                
                // Przycisk świeci jak pojebany
                auraBtn.style.boxShadow = "0 0 20px #ff004c, 0 0 40px #4c00ff";
            } else {
                // WYŁĄCZAMY TRYB AURY
                moggMusic.pause();
                moggMusic.currentTime = 0; // Reset nuty do zera
                auraBtn.style.boxShadow = "none";
            }
        });
    }
});
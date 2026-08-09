// js/gastro.js

const foods = [
    "🍕 PIZZA", "🍔 BURGER", "🍣 SUSHI", "🌯 KEBAB", 
    "🍝 MAKARON", "🥟 PIEROGI", "🍜 RAMEN", "🍟 FRYTKI",
    "🥪 KANAPKI", "🌮 TACOS", "🥗 SAŁATKA", "🥞 NALEŚNIKI",
    "🍗 KUBEŁEK", "🌭 HOT-DOG", "🥩 STEK", "🥡 CHIŃCZYK"
];

const display = document.getElementById('foodDisplay');
const btn = document.getElementById('spinBtn');
let isSpinning = false;

// Dźwięki (opcjonalne, jeśli masz pliki)
const tickSound = new Audio('assets/sounds/tick.mp3'); 
const winSound = new Audio('assets/sounds/win.mp3');

btn.addEventListener('click', () => {
    if (isSpinning) return;
    isSpinning = true;
    btn.disabled = true;
    btn.style.opacity = "0.5";
    
    let counter = 0;
    let speed = 50;
    // Losowa ilość obrotów (30-50)
    const totalSpins = 30 + Math.floor(Math.random() * 20);

    function step() {
        // Losuj jedzenie
        const randomFood = foods[Math.floor(Math.random() * foods.length)];
        display.textContent = randomFood;
        display.style.transform = "scale(1.1)"; // Lekki puls
        setTimeout(() => display.style.transform = "scale(1)", 50);

        // Dźwięk cykania
        tickSound.currentTime = 0;
        tickSound.play().catch(()=>{});

        counter++;

        if (counter < totalSpins) {
            // Zwalnianie pod koniec
            if (counter > totalSpins - 10) speed += 30;
            if (counter > totalSpins - 5) speed += 50;
            
            setTimeout(step, speed);
        } else {
            finalize(randomFood);
        }
    }
    
    step();
});

function finalize(winner) {
    isSpinning = false;
    btn.disabled = false;
    btn.style.opacity = "1";
    
    // Efekt wygranej
    display.style.color = "#ff0055";
    display.style.textShadow = "0 0 40px #ff0055";
    winSound.play().catch(()=>{});
    
    // Dodajemy konfetti z emoji (prosty efekt tekstowy)
    display.textContent = `✨ ${winner} ✨`;
}
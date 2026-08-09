import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAdJD-3_gxeV9YoSAQpXi_SqTPPkOFz4uI",
  authDomain: "fireplace-900cd.firebaseapp.com",
  projectId: "fireplace-900cd",
  storageBucket: "fireplace-900cd.firebasestorage.app",
  messagingSenderId: "124415939158",
  appId: "1:124415939158:web:660da16fae0639463ce1f7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('messageInput');
const world = document.getElementById('world');
const messagesRef = collection(db, "messages");

// --- ZWIJANIE I PRZECIĄGANIE COMMAND CENTER ---
const inputBubble = document.getElementById('inputBubble');
const bubbleHeader = document.getElementById('bubbleHeader');
const bubbleContent = document.getElementById('bubbleContent');
const toggleBtn = document.getElementById('toggleBtn');

toggleBtn.addEventListener('click', () => {
    inputBubble.classList.toggle('minimized');

    bubbleContent.classList.toggle('collapsed');
    toggleBtn.innerText = bubbleContent.classList.contains('collapsed') ? '□' : '_';
});

let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
bubbleHeader.onmousedown = dragMouseDown;

function dragMouseDown(e) {
    if (e.target === toggleBtn) return;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
}

function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    inputBubble.style.transform = "none";
    inputBubble.style.top = (inputBubble.offsetTop - pos2) + "px";
    inputBubble.style.left = (inputBubble.offsetLeft - pos1) + "px";
}

function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
}

// --- WYSYŁANIE WIADOMOŚCI ---
sendBtn.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (text !== "") {
        messageInput.value = "";
        await addDoc(messagesRef, {
            text: text,
            timestamp: serverTimestamp()
        });
    }
});

// --- UNIKANIE KOLIZJI ---
// Przechowujemy zajęte strefy jako obiekty {x, y} w procentach
const occupiedSpots = [];

// Strefa ogniska – środek ekranu, wykluczone ~25% x 25% obszaru
const FIRE_ZONE = { x: 50, y: 50, radiusX: 15, radiusY: 15 };

// Command Center zajmuje lewą stronę (0–25% szerokości, środkowa wysokość)
const COMMAND_ZONE = { x: 0, y: 30, w: 28, h: 40 };

function isInFireZone(x, y) {
    const dx = (x - FIRE_ZONE.x) / FIRE_ZONE.radiusX;
    const dy = (y - FIRE_ZONE.y) / FIRE_ZONE.radiusY;
    return (dx * dx + dy * dy) < 1;
}

function isInCommandZone(x, y) {
    return x < COMMAND_ZONE.x + COMMAND_ZONE.w &&
           y > COMMAND_ZONE.y &&
           y < COMMAND_ZONE.y + COMMAND_ZONE.h;
}

function isTooCloseToOthers(x, y, minDist = 14) {
    for (const spot of occupiedSpots) {
        const dx = x - spot.x;
        const dy = y - spot.y;
        if (Math.sqrt(dx * dx + dy * dy) < minDist) return true;
    }
    return false;
}

function findFreeSpot() {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
        // Losuj w bezpiecznych marginesach (8%–85% w poziomie, 8%–80% w pionie)
        const x = Math.floor(Math.random() * 77) + 8;
        const y = Math.floor(Math.random() * 72) + 8;

        if (isInFireZone(x, y)) continue;
        if (isInCommandZone(x, y)) continue;
        if (isTooCloseToOthers(x, y)) continue;

        return { x, y };
    }
    // Fallback – znajdź cokolwiek po prawej stronie
    return {
        x: Math.floor(Math.random() * 40) + 55,
        y: Math.floor(Math.random() * 60) + 15
    };
}

// --- ODBIERANIE WIADOMOŚCI (MAX 1 GODZINA) ---
const q = query(messagesRef, orderBy("timestamp", "asc"));
let renderedMessageIds = new Set();

onSnapshot(q, (snapshot) => {
    const now = new Date().getTime();
    const oneHour = 60 * 60 * 1000;

    snapshot.docs.forEach(doc => {
        const msg = doc.data();
        const id = doc.id;

        if (!msg.timestamp || renderedMessageIds.has(id)) return;
        const msgTime = msg.timestamp.toDate().getTime();

        if (now - msgTime < oneHour) {
            renderedMessageIds.add(id);
            createKnightMessage(msg, id, msgTime);
        }
    });
});

// --- TWORZENIE RYCERZA ---
function createKnightMessage(msg, id, msgTime) {
    const msgDate = msg.timestamp.toDate();
    const hours = String(msgDate.getHours()).padStart(2, '0');
    const minutes = String(msgDate.getMinutes()).padStart(2, '0');

    const wrapper = document.createElement('div');
    wrapper.className = 'knight-wrapper';
    wrapper.id = id;

    const spot = findFreeSpot();
    occupiedSpots.push(spot);
    wrapper.dataset.spotX = spot.x;
    wrapper.dataset.spotY = spot.y;

    wrapper.style.left = `${spot.x}%`;
    wrapper.style.top = `${spot.y}%`;

    wrapper.innerHTML = `
        <div class="speech-bubble">
            <span class="bubble-time">${hours}:${minutes}</span>
            ${msg.text}
        </div>
        <img src="rycerz.gif" alt="Rycerz" class="pixel-art knight-gif" onerror="this.style.display='none'">
    `;

    // Usuwanie środkowym przyciskiem myszy
    wrapper.addEventListener('auxclick', (e) => {
        if (e.button === 1) removeKnight(wrapper, spot);
    });

    world.appendChild(wrapper);

    // --- AUTO-USUWANIE PO 45 SEKUNDACH ---
    const now = Date.now();
    const age = now - msgTime; // ile ms minęło od wysłania
    const remaining = Math.max(0, 45000 - age);

    // Ostrzeżenie – zanikanie zaczyna się 5s przed usunięciem
    const fadeDelay = Math.max(0, remaining - 5000);

    setTimeout(() => {
        wrapper.classList.add('fading');
    }, fadeDelay);

    setTimeout(() => {
        removeKnight(wrapper, spot);
    }, remaining);
}

function removeKnight(wrapper, spot) {
    wrapper.classList.add('removing');
    setTimeout(() => {
        wrapper.remove();
        // Zwolnij zajęte miejsce
        const idx = occupiedSpots.findIndex(s => s.x === spot.x && s.y === spot.y);
        if (idx !== -1) occupiedSpots.splice(idx, 1);
    }, 600);
}
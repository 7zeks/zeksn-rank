// 1. Skopiowana konfiguracja
const firebaseConfig = {
  apiKey: "AIzaSyAm1X3V10ImJ_RVaIqRpcFqRjlyg9vA5yI",
  authDomain: "filmy-zk.firebaseapp.com",
  projectId: "filmy-zk",
  storageBucket: "filmy-zk.firebasestorage.app",
  messagingSenderId: "168407000386",
  appId: "1:168407000386:web:9220f943400263461394db",
  measurementId: "G-TLSHRQH647"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 2. Obsługa okienka logowania
const auth = firebase.auth();
const loginBtn = document.getElementById('loginBtn');
const loginModalWrap = document.getElementById('loginModalWrap');
const closeLoginModal = document.getElementById('closeLoginModal');
const doLoginBtn = document.getElementById('doLoginBtn');
const loginError = document.getElementById('loginError');

if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        if (document.body.classList.contains('is-admin')) {
            auth.signOut();
        } else {
            loginModalWrap.removeAttribute('hidden');
        }
    });
}

if (closeLoginModal) {
    closeLoginModal.addEventListener('click', () => {
        loginModalWrap.setAttribute('hidden', '');
        loginError.textContent = '';
    });
}

if (doLoginBtn) {
    doLoginBtn.addEventListener('click', () => {
        const email = document.getElementById('adminEmail').value;
        const pass = document.getElementById('adminPass').value;
        loginError.textContent = '';
        
        auth.signInWithEmailAndPassword(email, pass)
            .then(() => {
                loginModalWrap.setAttribute('hidden', '');
            })
            .catch(error => {
    loginError.textContent = error.message; // Teraz pokaże prawdziwy powód!
    console.error("Błąd Firebase:", error.code, error.message);
});
    });
}

// 3. Nasłuchiwanie czy jesteś zalogowany
auth.onAuthStateChanged(user => {
    const btnText = loginBtn ? loginBtn.querySelector('span') : null;
    const openModBtn = document.getElementById('openModBtn');

    if (user) {
        document.body.classList.add('is-admin');
        if (btnText) btnText.textContent = 'Logout';
        if (openModBtn) openModBtn.style.display = 'flex'; // Pokazuje przycisk Modera
    } else {
        document.body.classList.remove('is-admin');
        if (btnText) btnText.textContent = 'Login';
        if (openModBtn) openModBtn.style.display = 'none'; // Ukrywa przycisk Modera
    }
});

let currentFreeSpace = 10737418240; // Domyślnie 10 GB
const WORKER_URL = 'https://uploud-api.yytjarus.workers.dev';

// Główne elementy UI
const uploadBtn = document.getElementById('uploadBtn');
const statusDiv = document.getElementById('status');
const successFlow = document.getElementById('successFlow');
const dropzone = document.getElementById('dropzone');
const optionsContainer = document.querySelector('.options-container');

const fileStatusBox = document.getElementById('fileStatusBox');
const fsName = document.getElementById('fsName');
const fsSizeOrProgress = document.getElementById('fsSizeOrProgress');
const fsTrack = document.getElementById('fsTrack');
const fsProgressBar = document.getElementById('fsProgressBar');

// Zapisujemy oryginalny stan Dropzone
const originalDropzoneHtml = dropzone.innerHTML;
let selectedFile = null;

function formatBytes(bytes) {
    if (bytes <= 0) return '0 B'; // <-- ZMIANA TUTAJ (łapie zera i liczby ujemne)
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}

// === WYBÓR PLIKU I DUŻY PODGLĄD ===
function updateSelectedFile(file) {
    selectedFile = file;
    
    fileStatusBox.classList.add('visible'); 
    fsTrack.hidden = true; 
    fsProgressBar.style.width = '0%';
    
    fsName.textContent = file.name;
    fsSizeOrProgress.innerText = formatBytes(file.size);
    
    uploadBtn.disabled = false;
    statusDiv.textContent = '';

    if (file.type.startsWith('image/')) {
        const imgUrl = URL.createObjectURL(file);
        dropzone.innerHTML = `<img src="${imgUrl}" style="max-width: 100%; max-height: 250px; border-radius: 8px; object-fit: contain;">`;
        dropzone.style.padding = "10px";
    } else if (file.type.startsWith('video/')) {
        const vidUrl = URL.createObjectURL(file);
        dropzone.innerHTML = `<video src="${vidUrl}" controls autoplay muted loop playsinline style="max-width: 100%; max-height: 250px; border-radius: 8px; background: #000;"></video>`;
        dropzone.style.padding = "10px";
    } else {
        dropzone.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-main); font-size: 48px;">📄</div><div style="color: var(--text-muted); padding-bottom: 20px; text-align: center;">${file.name}</div>`;
        dropzone.style.padding = "10px";
    }
}

// === DRAG & DROP ===
['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => { e.preventDefault(); dropzone.classList.add('active'); }, false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => { e.preventDefault(); dropzone.classList.remove('active'); }, false);
});
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('active');
    const dt = e.dataTransfer;
    if (dt.files && dt.files.length > 0) {
        updateSelectedFile(dt.files[0]);
    }
});

document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'fileInput') {
        if (e.target.files && e.target.files.length > 0) {
            updateSelectedFile(e.target.files[0]);
        }
    }
});

// === NOWY SYSTEM WGRYWANIA BEZ LIMITU WAGI ===
async function uploadFile() {
    if (!selectedFile) return;

    const file = selectedFile;
    if (file.size > currentFreeSpace) {
        showError(`Brakuje miejsca na dysku! Plik zajmuje ${formatBytes(file.size)}, a zostało tylko ${formatBytes(currentFreeSpace)} wolnego.`);
        return;
    }
    const duration = document.querySelector('input[name="duration"]:checked')?.value || '30d';

    uploadBtn.disabled = true;
    uploadBtn.classList.add('loading');
    const btnTextSpan = uploadBtn.querySelector('.btn-text');
    if (btnTextSpan) btnTextSpan.textContent = 'Przygotowywanie...';
    
    fsTrack.hidden = false;
    fsProgressBar.style.width = '0%';
    fsSizeOrProgress.innerText = `0% - ${formatBytes(file.size)}`;
    statusDiv.innerText = '';

    try {
        // Etap 1: Pobieramy bilet na wrzucenie pliku omijając limity skryptu
        const urlReq = `${WORKER_URL}/get-upload-url?file=${encodeURIComponent(file.name)}&type=${encodeURIComponent(file.type || 'application/octet-stream')}&expiry=${duration}`;
        
        const response = await fetch(urlReq);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || "Błąd generowania linku");
        }

        if (btnTextSpan) btnTextSpan.textContent = 'Wgrywanie...';

        // Etap 2: Wrzucamy plik bezpośrednio do R2 używając wygenerowanego biletu
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                fsProgressBar.style.width = percentComplete + '%';
                fsSizeOrProgress.innerText = `${Math.round(percentComplete)}% - ${formatBytes(event.total)}`;
            }
        });

        xhr.addEventListener("load", () => {
            uploadBtn.classList.remove('loading');
            if (xhr.status >= 200 && xhr.status < 300) {
                const finalLink = document.getElementById('finalLink');
                if (finalLink) {
                    finalLink.href = data.finalUrl;
                    finalLink.textContent = data.finalUrl;
                }

                setTimeout(() => {
                    dropzone.hidden = true;
                    optionsContainer.hidden = true;
                    uploadBtn.hidden = true;
                    fileStatusBox.classList.remove('visible');
                    statusDiv.innerText = '';
                    
                    successFlow.hidden = false;
                    successFlow.style.animation = 'slideInUp 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)';
                }, 500);
                
                fetchDiskStats();
            } else {
                showError('Błąd podczas zapisu na dysku: ' + xhr.status);
            }
        });

        xhr.addEventListener("error", () => showError('Błąd połączenia podczas wgrywania.'));
        xhr.addEventListener("abort", () => showError('Wgrywanie przerwane.'));

        // Kluczowe: Metoda PUT na zwrócony adres (bezpośrednio do bucketu)
        xhr.open("PUT", data.uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || 'application/octet-stream');
        xhr.send(file);

    } catch (error) {
        showError(error.message);
    }
}

function showError(msg) {
    uploadBtn.classList.remove('loading');
    uploadBtn.disabled = false;
    const btnTextSpan = uploadBtn.querySelector('.btn-text');
    if (btnTextSpan) btnTextSpan.textContent = 'Spróbuj ponownie';
    statusDiv.style.color = "#FF4439";
    statusDiv.innerText = msg;
    fsTrack.hidden = true; 
}

// === LOGIKA DYSKU ===
async function fetchDiskStats() {
    try {
        const response = await fetch(`${WORKER_URL}/stats`);
        let data;
        if (response.ok) {
            data = await response.json();
        } else {
            data = {
                totalBytes: 549755813888, 
                usedBytes: 131342342342,  
                categories: { images: 40000000000, videos: 60000000000, documents: 15000000000, archives: 10000000000, others: 6342342342 }
            };
        }
        renderDiskStats(data);
    } catch (e) {
        console.error("Nie udało się pobrać statystyk dysku", e);
    }
}

function renderDiskStats(data) {
    const { totalBytes, usedBytes, categories } = data;
    currentFreeSpace = Math.max(0, totalBytes - usedBytes);
    
    document.getElementById('diskUsedText').innerText = `${formatBytes(usedBytes)} z ${formatBytes(totalBytes)} zajęte`;
    document.getElementById('diskFreeText').innerText = formatBytes(totalBytes - usedBytes) + " wolne";

    const storageBar = document.getElementById('storageBar');
    storageBar.innerHTML = ''; 

    const categoryColors = { images: '#0F91D2', videos: '#FF4439', documents: '#FFBC39', archives: '#59A829', others: '#48484A' };

    for (const [key, bytes] of Object.entries(categories)) {
        if (bytes > 0) {
            const percentage = (bytes / totalBytes) * 100;
            const segment = document.createElement('div');
            segment.className = 'segment';
            segment.style.width = `${percentage}%`;
            segment.style.background = categoryColors[key] || '#FFFFFF';
            segment.title = `${key}: ${formatBytes(bytes)}`;
            storageBar.appendChild(segment);
        }
    }
}

fetchDiskStats();

// === PANEL MODERACJI ===
const modModal = document.getElementById('modModal');
const openModBtn = document.getElementById('openModBtn');
const closeModBtn = document.getElementById('closeModBtn');
const refreshModBtn = document.getElementById('refreshModBtn');
const modFileList = document.getElementById('modFileList');

openModBtn.addEventListener('click', () => {
    modModal.hidden = false;
    fetchModFiles();
});

closeModBtn.addEventListener('click', (e) => {
    e.preventDefault();
    modModal.hidden = true;
});

modModal.addEventListener('click', (e) => {
    if (e.target === modModal) {
        modModal.hidden = true;
    }
});

refreshModBtn.addEventListener('click', fetchModFiles);

async function fetchModFiles() {
    refreshModBtn.innerText = 'Ładowanie...';
    try {
        const response = await fetch(`${WORKER_URL}/list`);
        if (!response.ok) throw new Error('Błąd serwera');
        
        const data = await response.json();
        renderModFiles(data.files);
    } catch (e) {
        alert('Błąd pobierania listy plików.');
    } finally {
        refreshModBtn.innerText = 'Odśwież';
    }
}

function renderModFiles(files) {
    modFileList.innerHTML = ''; 
    if (files.length === 0) {
        modFileList.innerHTML = '<p style="color: #8A8F98; text-align: center; font-size: 13px; margin: 20px 0;">Brak wgranych plików.</p>';
        return;
    }

    files.reverse().forEach(file => {
        const li = document.createElement('li');
        li.className = 'mod-file-item';
        
        // Generujemy publiczny link bazując na formacie Cloudflare R2
        // Upewnij się, że masz włączony Public Access w swoim buckecie!
        const publicLink = `https://pub-c4bdff47af9f412bb44968e460266513.r2.dev/${file.name}`;        
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
        const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(file.name);
        
        let previewHtml = '';
        if (isImage) {
            previewHtml = `<img src="${publicLink}" class="mod-preview-img" alt="preview" onclick="openImagePreview('${publicLink}')" title="Kliknij, aby powiększyć">`;
        } else if (isVideo) {
            previewHtml = `<div class="mod-preview-icon" style="cursor: pointer; background: rgba(255, 68, 57, 0.1); color: #FF4439;" onclick="openVideoPreview('${publicLink}')" title="Odtwórz wideo">🎬</div>`;
        } else {
            previewHtml = `<div class="mod-preview-icon">📄</div>`;
        }

        li.innerHTML = `
            <div class="mod-file-main">
                ${previewHtml}
                <div class="mod-file-info">
                    <a href="${publicLink}" target="_blank" class="mod-file-name">${file.name}</a>
                    <span class="mod-file-size">${formatBytes(file.size)}</span>
                </div>
            </div>
            <button class="btn-delete" onclick="deleteModFile('${file.name}')">Usuń</button>
        `;
        modFileList.appendChild(li);
    });
}

window.deleteModFile = async function(filename) {
    try {
        const response = await fetch(`${WORKER_URL}/delete/${filename}`, { method: 'DELETE' });
        if (response.ok) {
            fetchModFiles(); 
            fetchDiskStats(); 
        }
        // Brak alertu - jak coś pójdzie nie tak, po prostu zignoruje
    } catch (e) {
        // Zostawiamy tylko cichy log w konsoli dla Ciebie, żeby strona nie wywalała okienek
        console.error('Błąd połączenia z serwerem:', e);
    }
};

// === SUCCESS FLOW FUNCTIONS ===
function copyToClipboard() {
    const linkElement = document.getElementById('finalLink');
    if (linkElement && linkElement.href && linkElement.href !== '#') {
        navigator.clipboard.writeText(linkElement.href).then(() => {
            showNotification('Link skopiowany do schowka!', 'success');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = linkElement.href;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Link skopiowany do schowka!', 'success');
        });
    }
}

function shareLink() {
    const linkElement = document.getElementById('finalLink');
    if (linkElement && linkElement.href && linkElement.href !== '#' && navigator.share) {
        navigator.share({
            title: 'Przesłany plik',
            text: 'Sprawdź mój przesłany plik:',
            url: linkElement.href
        });
    } else {
        copyToClipboard();
    }
}

function resetUpload() {
    successFlow.style.animation = 'slideOutDown 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
    
    setTimeout(() => {
        successFlow.hidden = true;
        dropzone.hidden = false;
        optionsContainer.hidden = false;
        uploadBtn.hidden = false;
        
        selectedFile = null;
        dropzone.innerHTML = originalDropzoneHtml;
        dropzone.style.padding = "";
        
        const finalLink = document.getElementById('finalLink');
        if (finalLink) {
            finalLink.href = '#';
            finalLink.textContent = 'https://link...';
        }

        uploadBtn.disabled = true;
        const btnTextSpan = uploadBtn.querySelector('.btn-text');
        if (btnTextSpan) btnTextSpan.textContent = 'Upload';
        
    }, 300);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-green)' : 'var(--accent-blue)'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Efekt "ripple" na przyciskach
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-primary') || e.target.classList.contains('btn-secondary')) {
            const button = e.target;
            const ripple = document.createElement('div');
            ripple.className = 'btn-ripple';
            
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            button.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        }
    });
    
    const featureTags = document.querySelectorAll('.feature-tag');
    featureTags.forEach(tag => {
        tag.addEventListener('mouseenter', () => tag.style.transform = 'translateY(-2px) scale(1.05)');
        tag.addEventListener('mouseleave', () => tag.style.transform = 'translateY(0) scale(1)');
    });

    // === NOWE: LOGIKA MINIMALIZACJI WIDŻETU DYSKU ===
    const minimizeDot = document.getElementById('minimizeDot');
    const storageWidget = document.getElementById('storageWidget');

    if (minimizeDot && storageWidget) {
        minimizeDot.addEventListener('click', () => {
            storageWidget.classList.toggle('minimized');
        });
    }
});

// === PODGLĄD ZDJĘĆ W PANELU MODERACJI (LIGHTBOX) ===
window.openImagePreview = function(url) {
    let previewModal = document.getElementById('imagePreviewModal');

    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'imagePreviewModal';
        previewModal.style.cssText = `
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(5px);
            z-index: 99999;
            justify-content: center;
            align-items: center;
            cursor: zoom-out;
        `;

        const img = document.createElement('img');
        img.id = 'imagePreviewSrc';
        img.style.cssText = `
            max-width: 90%;
            max-height: 90vh;
            border-radius: var(--radius-md, 14px);
            box-shadow: 0 24px 60px rgba(0,0,0,0.8);
            object-fit: contain;
            transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        `;

        previewModal.appendChild(img);

        previewModal.onclick = () => {
            previewModal.style.display = 'none';
            img.src = ''; 
        };

        document.body.appendChild(previewModal);
    }

    document.getElementById('imagePreviewSrc').src = url;
    previewModal.style.display = 'flex';
};

// === ODTWARZACZ WIDEO W PANELU MODERACJI ===
window.openVideoPreview = function(url) {
    let previewModal = document.getElementById('videoPreviewModal');

    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'videoPreviewModal';
        previewModal.style.cssText = `
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(8px);
            z-index: 99999;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        `;

        const videoContainer = document.createElement('div');
        videoContainer.style.cssText = `
            position: relative;
            width: 90%;
            max-width: 1000px;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: -40px;
            right: 0;
            background: none;
            border: none;
            color: var(--text-muted, #8A8F98);
            font-size: 36px;
            cursor: pointer;
            line-height: 1;
            transition: color 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.color = '#FF4439';
        closeBtn.onmouseout = () => closeBtn.style.color = '#8A8F98';

        const videoPlayer = document.createElement('video');
        videoPlayer.id = 'videoPreviewSrc';
        videoPlayer.controls = true; 
        videoPlayer.autoplay = true; 
        videoPlayer.style.cssText = `
            width: 100%;
            max-height: 80vh;
            border-radius: var(--radius-md, 14px);
            box-shadow: 0 24px 60px rgba(0,0,0,0.8);
            background: #000;
            outline: none;
        `;

        const closeModal = () => {
            previewModal.style.display = 'none';
            videoPlayer.pause(); 
            videoPlayer.src = ''; 
        };

        closeBtn.onclick = closeModal;
        
        previewModal.onclick = (e) => {
            if (e.target === previewModal) closeModal();
        };

        videoContainer.appendChild(closeBtn);
        videoContainer.appendChild(videoPlayer);
        previewModal.appendChild(videoContainer);
        document.body.appendChild(previewModal);
    }

    const videoElement = document.getElementById('videoPreviewSrc');
    videoElement.src = url;
    previewModal.style.display = 'flex';
};

// === SYSTEM ZAKŁADEK (SPA NAVIGATION) ===
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Pobierz ID docelowego widoku
            const targetId = link.getAttribute('data-target');
            
            // Zdejmij klasę 'active' ze wszystkich linków
            navLinks.forEach(nav => nav.classList.remove('active'));
            // Dodaj klasę 'active' do klikniętego linku
            link.classList.add('active');
            
            // Ukryj wszystkie widoki
            views.forEach(view => {
                view.hidden = true;
                view.classList.remove('active');
            });
            
            // Pokaż docelowy widok
            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.hidden = false;
                targetView.classList.add('active');
            }
        });
    });
});
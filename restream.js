class RestreamManager {
    constructor() {
        console.log('RestreamManager (Firebase Mode) inicjalizacja');
        
        // Zamiast localStorage, zaczynamy z pustą tablicą
        this.sites = [];
        this.currentPath = [];
        
        // Referencja do bazy danych
        this.dbRef = firebase.database().ref("restream_structure");
        
        // Zmienne do obsługi Drag & Drop i UI
        this.dragSrcIndex = null;
        this.lastAdminState = this.isAdmin(); 
        
        this.rowsDiv = document.getElementById("restreamRows");
        this.breadcrumbsDiv = document.getElementById("breadcrumbs");
        this.addButton = document.getElementById("addRestreamRow");
        this.addFolderButton = document.getElementById("addRestreamFolder");
        
        if (!this.rowsDiv) {
            console.error('Brak elementu restreamRows!');
            return;
        }
        
        this.init();
    }

    isAdmin() {
        return document.body.classList.contains('is-admin');
    }
    
    init() {
        // Podpięcie przycisków dodawania
        if (this.addButton) this.addButton.onclick = () => this.addItem('link');
        if (this.addFolderButton) this.addFolderButton.onclick = () => this.addItem('folder');
        
        // Powiadomienia
        this.showNotification = (msg) => {
            if (window.showNotification) window.showNotification(msg, 'success');
            else console.log('Notification:', msg);
        };

        // Nasłuchiwanie zmian w bazie Firebase (to zastępuje localStorage.getItem)
        this.dbRef.on('value', (snapshot) => {
            const data = snapshot.val();
            // Jeśli baza jest pusta, ustawiamy pustą tablicę. Jeśli są dane, przypisujemy je.
            this.sites = data || [];
            this.render();
        });

        // Odświeżanie widoku przy zmianie uprawnień (Admin/Gość)
        setInterval(() => {
            const currentAdmin = this.isAdmin();
            if (this.lastAdminState !== currentAdmin) {
                this.lastAdminState = currentAdmin;
                this.render();
            }
        }, 1000);
    }
    
    // --- ZAPIS DO FIREBASE ---
    save() {
        // Zapisujemy całą strukturę this.sites do Firebase
        this.dbRef.set(this.sites)
            .then(() => console.log('Zapisano strukturę do Firebase'))
            .catch(err => console.error('Błąd zapisu do Firebase:', err));
    }

    // Reszta funkcji pozostaje bez zmian logicznych, ale korzysta z this.sites zaktualizowanego przez Firebase
    
    getCurrentList() {
        let list = this.sites;
        
        // Jeśli z jakiegoś powodu główna lista nie istnieje, zwróć pustą tablicę
        if (!list) {
            this.sites = [];
            return this.sites;
        }

        // Pętla po ścieżce (nawigacja w głąb folderów)
        for (let i = 0; i < this.currentPath.length; i++) {
            const index = this.currentPath[i];

            // Zabezpieczenie: Czy element o tym indeksie w ogóle istnieje?
            if (!list[index]) {
                console.warn("Błędna ścieżka - resetuję widok");
                this.currentPath = [];
                return this.sites;
            }

            // === KLUCZOWA POPRAWKA ===
            // Jeśli element nie ma tablicy 'children' (bo jest pusty w Firebase),
            // tworzymy ją teraz ręcznie, zamiast resetować widok.
            if (typeof list[index].children === 'undefined') {
                list[index].children = [];
            }

            // Wchodzimy poziom głębiej
            list = list[index].children;
        }
        return list;
    }
    
    render() {
        if (!this.rowsDiv) return;
        
        this.rowsDiv.innerHTML = "";
        this.renderBreadcrumbs();
        
        const currentList = this.getCurrentList();
        
        // Jeśli lista nie istnieje (np. błąd synchronizacji), traktuj jako pustą
        if (!currentList) {
             this.rowsDiv.innerHTML = `<div class="restream-empty-state">...</div>`;
             return;
        }
        
        if (currentList.length === 0) {
            this.rowsDiv.innerHTML = `
                <div class="restream-empty-state">
                    <div class="icon">📭</div>
                    <div class="title">Pusto tutaj</div>
                    <div class="subtitle">Dodaj pierwszą stronę lub folder</div>
                </div>
            `;
            return;
        }
        
        currentList.forEach((item, index) => {
            if(item) this.createSimpleRow(item, index);
        });
    }
    
    createSimpleRow(item, index) {
        const row = document.createElement("div");
        row.className = "restream-row";
        row.style.cssText = `
            display: flex; align-items: center; padding: 15px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            gap: 15px; transition: background 0.2s, transform 0.2s;
        `;
        
        if (item.type === 'folder') {
            row.style.background = 'rgba(139, 92, 246, 0.1)';
            row.style.borderLeft = '3px solid var(--primary)';
        }

        // --- 1. IKONA ---
        const iconContainer = document.createElement("div");
        iconContainer.style.fontSize = "1.5rem";
        iconContainer.style.padding = "0 10px";
        iconContainer.textContent = item.type === 'folder' ? '📂' : '🔗';
        
        if (this.isAdmin()) {
            iconContainer.style.cursor = "grab";
            iconContainer.title = "Przytrzymaj i przeciągnij (Admin)";
            iconContainer.draggable = true;
            
            iconContainer.addEventListener('dragstart', (e) => {
                this.dragSrcIndex = index;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', row.innerHTML);
                row.style.opacity = '0.4';
                row.classList.add('drag-active');
            });

            iconContainer.addEventListener('dragend', () => {
                row.style.opacity = '1';
                row.classList.remove('drag-active');
                this.render(); // Prerenderowanie czyści style drag
            });

            // Obsługa upuszczania (Drop)
            const parentList = this.rowsDiv; // kontener
            
            row.addEventListener('dragover', (e) => { e.preventDefault(); return false; });
            row.addEventListener('dragenter', () => { if (index !== this.dragSrcIndex) row.style.background = "rgba(255, 255, 255, 0.1)"; });
            row.addEventListener('dragleave', () => { 
                if (item.type === 'folder') row.style.background = 'rgba(139, 92, 246, 0.1)';
                else row.style.background = "transparent";
            });

            row.addEventListener('drop', (e) => {
                e.stopPropagation();
                if (this.dragSrcIndex !== index && this.dragSrcIndex !== null) {
                    this.reorderItems(this.dragSrcIndex, index);
                }
                return false;
            });
        }

        // --- 2. NAZWA ---
        const nameContainer = document.createElement("div");
        nameContainer.style.cssText = "flex: 1; display: flex; align-items: center; gap: 10px; overflow: hidden; padding-right: 10px;";

        const nameSpan = document.createElement("span");
        nameSpan.textContent = item.name || "Bez nazwy";
        nameSpan.className = "restream-name-clickable"; // Klasa pomocnicza dla CSS
        nameSpan.style.cssText = "font-weight: 500; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 1rem; padding: 5px; cursor: pointer;";
        
        nameSpan.onclick = () => {
            if (item.type === 'folder') this.enterFolder(index);
            else {
                let url = item.url;
                if (url && !url.startsWith('http')) url = 'https://' + url;
                if (url) window.open(url, '_blank');
            }
        };

        const editIcon = document.createElement("span");
        if (this.isAdmin()) {
            editIcon.textContent = "✒";
            editIcon.style.cssText = "cursor: pointer; opacity: 0.2; font-size: 0.9rem; margin-left: auto; padding: 5px;";
            nameContainer.onmouseover = () => editIcon.style.opacity = "0.8";
            nameContainer.onmouseout = () => editIcon.style.opacity = "0.2";
            
            editIcon.onclick = (e) => {
                e.stopPropagation();
                const newName = prompt("Zmień nazwę:", item.name);
                if (newName && newName.trim() !== "") {
                    item.name = newName.trim();
                    this.save();
                }
            };
        }

        nameContainer.appendChild(nameSpan);
        if (this.isAdmin()) nameContainer.appendChild(editIcon);

        // --- 3. URL / INFO ---
        const urlCol = document.createElement("div");
        urlCol.style.flex = "2";
        
        if (item.type === 'folder') {
            const count = item.children ? item.children.length : 0;
            urlCol.innerHTML = `<span style="color:rgba(255,255,255,0.6); font-size:0.9rem">${count} elementów</span>`;
        } else {
            if (this.isAdmin()) {
                const urlInput = document.createElement("input");
                urlInput.type = "text";
                urlInput.value = item.url || "";
                urlInput.style.cssText = "width: 100%; padding: 8px 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.9); border-radius: 6px;";
                
                urlInput.oninput = (e) => {
                    item.url = e.target.value;
                    // Debounce save mógłby być tu przydatny, ale przy oninput lepiej zapisać przy onchange
                };
                urlInput.onchange = async (e) => {
                    item.url = e.target.value;
                    
                    // Auto-tytuł
                    if (item.url.length > 8 && (item.name.startsWith("Nowa strona"))) {
                        nameSpan.textContent = "⏳...";
                        const title = await this.fetchPageTitle(item.url);
                        if (title) item.name = title.trim();
                        this.render();
                    }
                    this.save();
                };
                urlCol.appendChild(urlInput);
            } else {
                urlCol.innerHTML = `<span style="color:rgba(255,255,255,0.5); font-size:0.9rem">${item.url}</span>`;
            }
        }
        
        // --- 4. USUWANIE ---
        row.appendChild(iconContainer);
        row.appendChild(nameContainer);
        row.appendChild(urlCol);

        if (this.isAdmin()) {
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "restream-delete-btn";
            deleteBtn.textContent = "🗑";
            deleteBtn.onclick = () => {
                if (confirm(`Usunąć "${item.name}"?`)) {
                    const list = this.getCurrentList();
                    list.splice(index, 1);
                    this.save();
                }
            };
            row.appendChild(deleteBtn);
        } else {
             row.appendChild(document.createElement("div")); // Spacer
        }
        
        this.rowsDiv.appendChild(row);
    }

    reorderItems(fromIndex, toIndex) {
        const list = this.getCurrentList();
        const [movedItem] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, movedItem);
        this.save();
    }
    
    renderBreadcrumbs() {
        if (!this.breadcrumbsDiv) return;
        let html = `<span class="crumb ${this.currentPath.length === 0 ? 'active' : ''}" onclick="window.restreamManager.navigateTo(-1)">📜 Główna</span>`;
        
        let pathRef = this.sites;
        this.currentPath.forEach((folderIndex, i) => {
            // Sprawdzenie czy folder nadal istnieje w strukturze
            if (pathRef && pathRef[folderIndex]) {
                const folder = pathRef[folderIndex];
                const isActive = (i === this.currentPath.length - 1);
                html += ` <span class="separator">/</span> 
                          <span class="crumb ${isActive ? 'active' : ''}" onclick="window.restreamManager.navigateTo(${i})">
                            🗂️ ${folder.name}
                          </span>`;
                pathRef = folder.children;
            }
        });
        this.breadcrumbsDiv.innerHTML = html;
    }
    
    navigateTo(pathIndex) {
        if (pathIndex === -1) this.currentPath = [];
        else this.currentPath = this.currentPath.slice(0, pathIndex + 1);
        this.render();
    }
    
    enterFolder(index) {
        this.currentPath.push(index);
        this.render();
    }
    
    addItem(type) {
        if (!this.isAdmin()) {
            alert("🔒 Zaloguj się jako admin!");
            return;
        }

        const list = this.getCurrentList();
        
        // Inicjalizacja tablicy jeśli nie istnieje (np. nowy pusty folder)
        if (!list) return;

        if (type === 'folder') {
            list.push({ type: 'folder', name: 'Nowy Folder', children: [] });
            this.showNotification('Dodano folder');
        } else {
            list.push({ type: 'link', name: 'Nowa strona', url: 'https://' });
            this.showNotification('Dodano stronę');
        }
        
        this.save();
    }

    async fetchPageTitle(url) {
        if (!url.startsWith('http')) return null;
        try {
            const fastApiUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
            const response = await fetch(fastApiUrl);
            const data = await response.json();
            if (data.title) return data.title;
        } catch (e) {}
        
        try {
            const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const text = await response.text();
            const doc = new DOMParser().parseFromString(text, "text/html");
            return doc.title || null;
        } catch (error) { console.error(error); }
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById("restreamRows")) {
        window.restreamManager = new RestreamManager();
    }
});
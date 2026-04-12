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
                    <div class="icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.5;">
                            <path d="M22 19V9M20 5V19C20 19.5304 19.7893 20.0391 19.4142 20.4142C19.0391 20.7893 18.5304 21 18 21H6C5.46957 21 4.96086 20.7893 4.58579 20.4142C4.21071 20.0391 4 19.5304 4 19V5C4 4.46957 4.21071 3.96086 4.58579 3.58579C4.96086 3.21071 5.46957 3 6 3H16L20 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
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
        iconContainer.style.cssText = "padding: 0 10px; display: flex; align-items: center; justify-content: center;";

        const folderSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 9.34997V4.99997C2 4.46954 2.21071 3.96083 2.58579 3.58576C2.96086 3.21069 3.46957 2.99997 4 2.99997H7.9C8.23449 2.99669 8.56445 3.07736 8.8597 3.23459C9.15495 3.39183 9.40604 3.6206 9.59 3.89997L10.4 5.09997C10.5821 5.3765 10.83 5.60349 11.1215 5.76058C11.413 5.91766 11.7389 5.99992 12.07 5.99997H20C20.5304 5.99997 21.0391 6.21069 21.4142 6.58576C21.7893 6.96083 22 7.46954 22 7.99997V18C22 18.5304 21.7893 19.0391 21.4142 19.4142C21.0391 19.7893 20.5304 20 20 20H4C3.46957 20 2.96086 19.7893 2.58579 19.4142C2.21071 19.0391 2 18.5304 2 18V15C2 14.4695 2.21071 13.9608 2.58579 13.5858C2.96086 13.2107 3.46957 13 4 13H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 16L11 13L8 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const linkSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 17H7C5.67392 17 4.40215 16.4732 3.46447 15.5355C2.52678 14.5979 2 13.3261 2 12C2 10.6739 2.52678 9.40215 3.46447 8.46447C4.40215 7.52678 5.67392 7 7 7H9M15 7H17C18.3261 7 19.5979 7.52678 20.5355 8.46447C21.4732 9.40215 22 10.6739 22 12C22 13.3261 21.4732 14.5979 20.5355 15.5355C19.5979 16.4732 18.3261 17 17 17H15M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        iconContainer.innerHTML = item.type === 'folder' ? folderSvg : linkSvg;
        
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
            editIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20H21M16.5 3.50023C16.8978 3.1024 17.4374 2.87888 18 2.87888C18.2786 2.87888 18.5544 2.93378 18.8118 3.04038C19.0692 3.14699 19.303 3.30324 19.5 3.50023C19.697 3.69721 19.8532 3.93106 19.9598 4.18843C20.0665 4.4458 20.1213 4.72165 20.1213 5.00023C20.1213 5.2788 20.0665 5.55465 19.9598 5.81202C19.8532 6.06939 19.697 6.30324 19.5 6.50023L7 19.0002L3 20.0002L4 16.0002L16.5 3.50023Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            editIcon.style.cssText = "cursor: pointer; opacity: 0.2; margin-left: auto; padding: 5px; display: flex;";
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
            deleteBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6H5H21M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M10 11V17M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            deleteBtn.style.padding = "0"; // Usuwamy padding żeby wyśrodkować ikonę w przycisku
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
        
        let html = `<span class="crumb ${this.currentPath.length === 0 ? 'active' : ''}" onclick="window.restreamManager.navigateTo(-1)">Główna</span>`;
        
        let pathRef = this.sites;
        this.currentPath.forEach((folderIndex, i) => {
            // Sprawdzenie czy folder nadal istnieje w strukturze
            if (pathRef && pathRef[folderIndex]) {
                const folder = pathRef[folderIndex];
                const isActive = (i === this.currentPath.length - 1);
                html += ` <span class="separator">/</span> 
                          <span class="crumb ${isActive ? 'active' : ''}" onclick="window.restreamManager.navigateTo(${i})">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: sub; margin-right: 4px;">
                                <path d="M2 9.34997V4.99997C2 4.46954 2.21071 3.96083 2.58579 3.58576C2.96086 3.21069 3.46957 2.99997 4 2.99997H7.9C8.23449 2.99669 8.56445 3.07736 8.8597 3.23459C9.15495 3.39183 9.40604 3.6206 9.59 3.89997L10.4 5.09997C10.5821 5.3765 10.83 5.60349 11.1215 5.76058C11.413 5.91766 11.7389 5.99992 12.07 5.99997H20C20.5304 5.99997 21.0391 6.21069 21.4142 6.58576C21.7893 6.96083 22 7.46954 22 7.99997V18C22 18.5304 21.7893 19.0391 21.4142 19.4142C21.0391 19.7893 20.5304 20 20 20H4C3.46957 20 2.96086 19.7893 2.58579 19.4142C2.21071 19.0391 2 18.5304 2 18V15C2 14.4695 2.21071 13.9608 2.58579 13.5858C2.96086 13.2107 3.46957 13 4 13H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M8 16L11 13L8 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            ${folder.name}
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
        // ZAMIANA: alert na showNotification
        if (window.showNotification) {
            window.showNotification("🔒 Zaloguj się jako admin!", "error");
        }
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
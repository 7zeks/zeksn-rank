class RestreamManager {
    constructor() {
        console.log('RestreamManager inicjalizacja');
        
        // Start z pustą tablicą lub danymi z localStorage
        this.sites = JSON.parse(localStorage.getItem("restreamSites") || "[]");
        this.currentPath = [];
        
        // Zmienne do obsługi Drag & Drop
        this.dragSrcIndex = null;
        this.lastAdminState = this.isAdmin(); 
        
        // Uchwyty do elementów DOM
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
        if (this.addButton) {
            this.addButton.onclick = () => this.addItem('link');
        }
        
        if (this.addFolderButton) {
            this.addFolderButton.onclick = () => this.addItem('folder');
        }
        
        // Proste powiadomienie - próbuje użyć globalnego, jeśli dostępne
        this.showNotification = (msg) => {
            if (window.showNotification) {
                window.showNotification(msg, 'success');
            } else {
                console.log('Notification:', msg);
            }
        };

        // Odświeżanie widoku przy zmianie logowania
        setInterval(() => {
            const currentAdmin = this.isAdmin();
            if (this.lastAdminState !== currentAdmin) {
                this.lastAdminState = currentAdmin;
                this.render();
            }
        }, 1000);
        
        // Pierwsze renderowanie listy
        this.render();
    }
    
    getCurrentList() {
        let list = this.sites;
        for (let index of this.currentPath) {
            if (list[index] && list[index].children) {
                list = list[index].children;
            } else {
                this.currentPath = [];
                return this.sites;
            }
        }
        return list;
    }
    
    render() {
        if (!this.rowsDiv) return;
        
        this.rowsDiv.innerHTML = "";
        this.renderBreadcrumbs();
        
        const currentList = this.getCurrentList();
        
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
            this.createSimpleRow(item, index);
        });
    }
    
    createSimpleRow(item, index) {
        const row = document.createElement("div");
        row.className = "restream-row";
        row.style.cssText = `
            display: flex;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            gap: 15px;
            transition: background 0.2s, transform 0.2s;
        `;
        
        if (item.type === 'folder') {
            row.style.background = 'rgba(139, 92, 246, 0.1)';
            row.style.borderLeft = '3px solid var(--primary)';
        }

        // --- 1. IKONA (Uchwyt do przesuwania) ---
        const iconContainer = document.createElement("div");
        iconContainer.style.fontSize = "1.5rem";
        iconContainer.style.padding = "0 10px";
        iconContainer.textContent = item.type === 'folder' ? '📂' : '🔗';
        
        // LOGIKA ADMINA: DRAG & DROP
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
                Array.from(this.rowsDiv.children).forEach(child => {
                    child.style.borderTop = "none";
                    child.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
                    const isFolder = child.style.borderLeft.includes('var(--primary)');
                    child.style.background = isFolder ? 'rgba(139, 92, 246, 0.1)' : 'transparent';
                });
                this.render();
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault(); 
                e.dataTransfer.dropEffect = 'move';
                return false;
            });
            
            row.addEventListener('dragenter', () => {
                 if (index !== this.dragSrcIndex) {
                     row.style.background = "rgba(255, 255, 255, 0.1)";
                 }
            });

            row.addEventListener('dragleave', () => {
                 if (item.type === 'folder') {
                     row.style.background = 'rgba(139, 92, 246, 0.1)';
                 } else {
                     row.style.background = "transparent";
                 }
            });

            row.addEventListener('drop', (e) => {
                e.stopPropagation();
                if (this.dragSrcIndex !== index) {
                    this.reorderItems(this.dragSrcIndex, index);
                }
                return false;
            });
        } else {
            iconContainer.style.cursor = "default";
        }

        // --- 2. NAZWA (Klikalna) + EDYCJA ---
        const nameContainer = document.createElement("div");
        nameContainer.style.cssText = `
            flex: 1;
            display: flex;
            align-items: center;
            gap: 10px;
            overflow: hidden;
            padding-right: 10px;
        `;

        const nameSpan = document.createElement("span");
        nameSpan.textContent = item.name || "Bez nazwy";
        nameSpan.style.cssText = `
            font-weight: 500;
            color: white;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 1rem;
            padding: 5px;
            border-radius: 4px;
            transition: all 0.2s;
            cursor: pointer;
        `;
        
        nameSpan.onmouseover = () => nameSpan.style.color = "var(--primary)";
        nameSpan.onmouseout = () => nameSpan.style.color = "white";

        nameSpan.onclick = () => {
            if (item.type === 'folder') {
                this.enterFolder(index);
            } else {
                let url = item.url;
                if (url) {
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        url = 'https://' + url;
                    }
                    window.open(url, '_blank');
                }
            }
        };
        
        if (item.type === 'folder') {
            nameSpan.title = "Kliknij, aby otworzyć folder";
        } else {
            nameSpan.title = `Kliknij, aby otworzyć: ${item.url}`;
        }

        // Ikonka edycji (tylko Admin)
        const editIcon = document.createElement("span");
        if (this.isAdmin()) {
            editIcon.textContent = "✒";
            editIcon.style.cssText = `
                cursor: pointer;
                opacity: 0.1; 
                font-size: 0.9rem;
                margin-left: auto;
                padding: 5px;
                transition: all 0.2s;
            `;
            editIcon.title = "Zmień nazwę";

            nameContainer.onmouseover = () => { editIcon.style.opacity = "0.5"; };
            nameContainer.onmouseout = () => { editIcon.style.opacity = "0.1"; };

            editIcon.onmouseover = (e) => {
                e.stopPropagation();
                editIcon.style.opacity = "1";
                editIcon.style.transform = "scale(1.2)";
            };
            editIcon.onmouseout = (e) => {
                e.stopPropagation();
                editIcon.style.transform = "scale(1)";
            };

            editIcon.onclick = (e) => {
                e.stopPropagation();
                const newName = prompt("Zmień nazwę:", item.name);
                if (newName && newName.trim() !== "") {
                    item.name = newName.trim();
                    this.save();
                    this.render();
                }
            };
        }

        nameContainer.appendChild(nameSpan);
        if (this.isAdmin()) {
            nameContainer.appendChild(editIcon);
        }

        // --- 3. KOLUMNA URL / INFO ---
        const urlCol = document.createElement("div");
        urlCol.style.flex = "2";
        
        if (item.type === 'folder') {
            const count = item.children ? item.children.length : 0;
            const info = document.createElement("span");
            info.textContent = `${count} elementów`;
            info.style.color = 'rgba(255,255,255,0.6)';
            info.style.fontSize = '0.9rem';
            urlCol.appendChild(info);
        } else {
            // INPUT URL (Admin)
            if (this.isAdmin()) {
                const urlInput = document.createElement("input");
                urlInput.type = "text";
                urlInput.value = item.url || "";
                urlInput.style.cssText = `
                    width: 100%;
                    padding: 8px 12px;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.9);
                    border-radius: 6px;
                    font-family: inherit;
                    font-size: 0.9rem;
                `;
                urlInput.placeholder = "https://...";
                
                // === AUTOMATYCZNE POBIERANIE TYTUŁU ===
                urlInput.oninput = (e) => {
                    item.url = e.target.value;
                    this.save();
                };

                // Pobieramy tytuł dopiero po zakończeniu edycji (Enter lub kliknięcie poza)
                urlInput.onchange = async (e) => {
                    const url = e.target.value;
                    
                    // Sprawdzamy czy jest URL i czy nazwa jest domyślna
                    if (url.length > 8 && (item.name === "Nowa strona" || item.name.startsWith("Nowa strona"))) {
                        
                        // Wizualizacja ładowania
                        nameSpan.textContent = "⏳ Pobieranie tytułu...";
                        nameSpan.style.opacity = "0.7";

                        const title = await this.fetchPageTitle(url);

                        if (title) {
                            item.name = title.trim();
                            this.showNotification(`Nazwano: ${item.name}`);
                        } else {
                            if (nameSpan.textContent.includes("⏳")) {
                                nameSpan.textContent = item.name; 
                            }
                        }
                        
                        nameSpan.style.opacity = "1";
                        this.save();
                        this.render(); 
                    }
                };

                urlCol.appendChild(urlInput);
            } else {
                // TEXT URL (Gość)
                const urlText = document.createElement("span");
                urlText.textContent = item.url;
                urlText.style.color = "rgba(255,255,255,0.5)";
                urlText.style.fontSize = "0.9rem";
                urlCol.appendChild(urlText);
            }
        }
        
        // --- 4. PRZYCISK USUWANIA ---
        row.appendChild(iconContainer);
        row.appendChild(nameContainer);
        row.appendChild(urlCol);

        if (this.isAdmin()) {
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "🗑";
            deleteBtn.style.cssText = `
                padding: 8px 12px;
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444;
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            deleteBtn.onmouseover = () => {
                deleteBtn.style.background = "rgba(239, 68, 68, 0.3)";
                deleteBtn.style.transform = "scale(1.05)";
            };
            deleteBtn.onmouseout = () => {
                deleteBtn.style.background = "rgba(239, 68, 68, 0.1)";
                deleteBtn.style.transform = "scale(1)";
            };
            deleteBtn.onclick = () => {
                if (confirm(`Usunąć "${item.name}"?`)) {
                    const list = this.getCurrentList();
                    list.splice(index, 1);
                    this.save();
                    this.render();
                }
            };
            row.appendChild(deleteBtn);
        } else {
             const dummy = document.createElement("div");
             dummy.style.width = "40px";
             row.appendChild(dummy);
        }
        
        this.rowsDiv.appendChild(row);
    }

    reorderItems(fromIndex, toIndex) {
        const list = this.getCurrentList();
        const [movedItem] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, movedItem);
        this.save();
        this.render();
    }
    
    renderBreadcrumbs() {
        if (!this.breadcrumbsDiv) return;
        
        let html = `<span class="crumb ${this.currentPath.length === 0 ? 'active' : ''}" onclick="window.restreamManager.navigateTo(-1)">🏠 Główna</span>`;
        
        let pathRef = this.sites;
        this.currentPath.forEach((folderIndex, i) => {
            const folder = pathRef[folderIndex];
            if (folder) {
                const isActive = (i === this.currentPath.length - 1);
                html += ` <span class="separator">/</span> 
                          <span class="crumb ${isActive ? 'active' : ''}" onclick="window.restreamManager.navigateTo(${i})">
                            📂 ${folder.name}
                          </span>`;
                pathRef = folder.children;
            }
        });
        
        this.breadcrumbsDiv.innerHTML = html;
    }
    
    navigateTo(pathIndex) {
        if (pathIndex === -1) {
            this.currentPath = [];
        } else {
            this.currentPath = this.currentPath.slice(0, pathIndex + 1);
        }
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

        console.log('Dodawanie elementu typu:', type);
        const list = this.getCurrentList();
        
        if (type === 'folder') {
            list.push({
                type: 'folder',
                name: 'Nowy Folder',
                children: []
            });
            this.showNotification('Dodano folder');
        } else {
            list.push({
                type: 'link',
                name: 'Nowa strona',
                url: 'https://'
            });
            this.showNotification('Dodano stronę');
        }
        
        this.save();
        this.render();
    }
    
    save() {
        localStorage.setItem("restreamSites", JSON.stringify(this.sites));
        console.log('Zapisano do localStorage:', this.sites);
    }

    // --- NOWA, SZYBSZA METODA: Pobieranie tytułu strony ---
    async fetchPageTitle(url) {
        if (!url.startsWith('http')) return null;

        // 1. SPOSÓB SZYBKI (NoEmbed) - Idealny dla YouTube, Twitch, Vimeo, TikTok etc.
        try {
            // NoEmbed zwraca JSON, jest lekki i bardzo szybki
            const fastApiUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
            const response = await fetch(fastApiUrl);
            const data = await response.json();
            
            // Jeśli NoEmbed znalazł tytuł, zwracamy go od razu
            if (data.title) {
                console.log("Użyto szybkiego pobierania (NoEmbed)");
                return data.title;
            }
        } catch (e) {
            // Ignorujemy błąd, przechodzimy do sposobu wolnego
        }

        // 2. SPOSÓB WOLNY (Fallback) - Dla zwykłych stron internetowych
        // Używamy innego proxy (codetabs), które często jest szybsze niż allorigins
        try {
            console.log("Przełączanie na tryb HTML (wolniejszy)...");
            const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const text = await response.text();
            
            // Szukamy tagu <title> w pobranym HTMLu
            const doc = new DOMParser().parseFromString(text, "text/html");
            return doc.title || null;
        } catch (error) {
            console.error("Nie udało się pobrać tytułu żadną metodą:", error);
        }
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById("restreamRows")) {
        window.restreamManager = new RestreamManager();
    }
});
class RestreamManager {
    constructor() {
        console.log('RestreamManager (Firebase Fix) inicjalizacja');
        
        this.sites = [];
        this.currentPath = [];
        
        this.dragSrcIndex = null;
        this.lastAdminState = this.isAdmin();

        this.rowsDiv = document.getElementById("restreamRows");
        this.breadcrumbsDiv = document.getElementById("breadcrumbs");
        this.addButton = document.getElementById("addRestreamRow");
        this.addFolderButton = document.getElementById("addRestreamFolder");
        
        try {
            this.dbRef = firebase.database().ref("restream");
        } catch (e) {
            console.error("Błąd połączenia z Firebase.", e);
        }
        
        if (!this.rowsDiv) return;
        this.init();
    }

    isAdmin() {
        return document.body.classList.contains('is-admin');
    }
    
    notify(msg, type = 'info') {
        if (typeof showNotification === 'function') showNotification(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
    
    init() {
        if (this.addButton) this.addButton.onclick = () => this.addItem('link');
        if (this.addFolderButton) this.addFolderButton.onclick = () => this.addItem('folder');
        
        if (this.dbRef) {
            this.rowsDiv.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">Ładowanie...</div>';
            
            this.dbRef.on('value', (snapshot) => {
                const data = snapshot.val();
                this.sites = data || [];
                this.render();
            });
        }

        setInterval(() => {
            const currentAdmin = this.isAdmin();
            if (this.lastAdminState !== currentAdmin) {
                this.lastAdminState = currentAdmin;
                this.render();
            }
        }, 1000);
    }
    
    // --- TUTAJ BYŁ BŁĄD, TO JEST WERSJA NAPRAWIONA ---
    getCurrentList() {
        let list = this.sites;
        for (let index of this.currentPath) {
            // Sprawdzamy czy folder istnieje w strukturze
            if (list[index]) {
                // Jeśli folder jest pusty, Firebase nie odsyła pola 'children'.
                // Musimy je wtedy utworzyć ręcznie, żeby móc do niego wejść lub coś dodać.
                if (!list[index].children) {
                    list[index].children = [];
                }
                list = list[index].children;
            } else {
                // Jeśli ścieżka jest błędna, wracamy na start
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
        
        if (!currentList || currentList.length === 0) {
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
        
        // Oryginalne style
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
        } else {
            row.style.background = 'transparent';
            row.style.borderLeft = 'none';
        }

        // 1. IKONA (Drag Handle)
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
                this.render();
            });

            row.addEventListener('dragover', (e) => { e.preventDefault(); return false; });
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

        // 2. NAZWA (Klikalna)
        const nameContainer = document.createElement("div");
        nameContainer.style.cssText = `flex: 1; display: flex; align-items: center; gap: 10px; overflow: hidden; padding-right: 10px;`;

        const nameSpan = document.createElement("span");
        nameSpan.textContent = item.name || "Bez nazwy";
        nameSpan.style.cssText = `
            font-weight: 500; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            font-size: 1rem; padding: 5px; border-radius: 4px; transition: all 0.2s; cursor: pointer;
        `;
        nameSpan.onmouseover = () => nameSpan.style.color = "var(--primary)";
        nameSpan.onmouseout = () => nameSpan.style.color = "white";

        nameSpan.onclick = () => {
            if (item.type === 'folder') {
                this.enterFolder(index);
            } else {
                let url = item.url;
                if (url) {
                    if (!url.startsWith('http')) url = 'https://' + url;
                    window.open(url, '_blank');
                }
            }
        };
        
        // Ikonka edycji (Admin)
        const editIcon = document.createElement("span");
        if (this.isAdmin()) {
            editIcon.textContent = "✒";
            editIcon.style.cssText = `cursor: pointer; opacity: 0.1; font-size: 0.9rem; margin-left: auto; padding: 5px; transition: all 0.2s;`;
            editIcon.onmouseover = (e) => { e.stopPropagation(); editIcon.style.opacity = "1"; editIcon.style.transform = "scale(1.2)"; };
            editIcon.onmouseout = (e) => { e.stopPropagation(); editIcon.style.opacity = "0.1"; editIcon.style.transform = "scale(1)"; };
            editIcon.onclick = (e) => {
                e.stopPropagation();
                const newName = prompt("Zmień nazwę:", item.name);
                if (newName && newName.trim() !== "") {
                    item.name = newName.trim();
                    this.save();
                }
            };
            
            // Pokazywanie ołówka po najechaniu na kontener nazwy
            nameContainer.onmouseover = () => { editIcon.style.opacity = "0.5"; };
            nameContainer.onmouseout = () => { editIcon.style.opacity = "0.1"; };
        }

        nameContainer.appendChild(nameSpan);
        if (this.isAdmin()) nameContainer.appendChild(editIcon);

        // 3. URL / INFO
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
            if (this.isAdmin()) {
                const urlInput = document.createElement("input");
                urlInput.type = "text";
                urlInput.value = item.url || "";
                urlInput.style.cssText = `
                    width: 100%; padding: 8px 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.9); border-radius: 6px; font-family: inherit; font-size: 0.9rem;
                `;
                urlInput.placeholder = "https://...";
                urlInput.onchange = (e) => {
                    item.url = e.target.value;
                    this.save();
                };
                urlCol.appendChild(urlInput);
            } else {
                const urlText = document.createElement("span");
                urlText.textContent = item.url;
                urlText.style.color = "rgba(255,255,255,0.5)";
                urlText.style.fontSize = "0.9rem";
                urlCol.appendChild(urlText);
            }
        }
        
        // 4. PRZYCISK USUWANIA
        row.appendChild(iconContainer);
        row.appendChild(nameContainer);
        row.appendChild(urlCol);

        if (this.isAdmin()) {
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "🗑";
            deleteBtn.style.cssText = `
                padding: 8px 12px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 6px; cursor: pointer; transition: all 0.2s;
            `;
            deleteBtn.onmouseover = () => { deleteBtn.style.background = "rgba(239, 68, 68, 0.3)"; deleteBtn.style.transform = "scale(1.05)"; };
            deleteBtn.onmouseout = () => { deleteBtn.style.background = "rgba(239, 68, 68, 0.1)"; deleteBtn.style.transform = "scale(1)"; };
            deleteBtn.onclick = () => {
                if (confirm(`Usunąć "${item.name}"?`)) {
                    const list = this.getCurrentList();
                    list.splice(index, 1);
                    this.save();
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
    }
    
    renderBreadcrumbs() {
        if (!this.breadcrumbsDiv) return;
        
        let html = `<span class="crumb ${this.currentPath.length === 0 ? 'active' : ''}" onclick="window.restreamManager.navigateTo(-1)">🏠 Główna</span>`;
        
        let pathRef = this.sites;
        this.currentPath.forEach((folderIndex, i) => {
            if(pathRef[folderIndex]) {
                const folder = pathRef[folderIndex];
                const isActive = (i === this.currentPath.length - 1);
                html += ` <span class="separator">/</span> 
                          <span class="crumb ${isActive ? 'active' : ''}" onclick="window.restreamManager.navigateTo(${i})">
                            📂 ${folder.name}
                          </span>`;
                pathRef = folder.children || [];
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
            this.notify("🔒 Zaloguj się jako admin!", "error");
            return;
        }

        const list = this.getCurrentList(); // Teraz to na pewno zwróci poprawną tablicę
        
        if (type === 'folder') {
            list.push({
                type: 'folder',
                name: 'Nowy Folder',
                children: []
            });
            this.notify('Dodano folder', 'success');
        } else {
            list.push({
                type: 'link',
                name: 'Nowa strona',
                url: 'https://'
            });
            this.notify('Dodano stronę', 'success');
        }
        
        this.save();
    }
    
    save() {
        if (this.dbRef) {
            this.dbRef.set(this.sites).catch(err => {
                console.error(err);
                this.notify("Błąd zapisu w chmurze", "error");
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById("restreamRows")) {
        setTimeout(() => {
            window.restreamManager = new RestreamManager();
        }, 500);
    }
});
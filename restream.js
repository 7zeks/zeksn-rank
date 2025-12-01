class RestreamManager {
    constructor() {
        this.sites = JSON.parse(localStorage.getItem("restreamSites") || "[]");
        this.rowsDiv = document.getElementById("restreamRows");
        this.addButton = document.getElementById("addRestreamRow");
        
        this.init();
    }
    
    init() {
        // Użyj funkcji z app.js jeśli istnieje
        if (window.showNotification) {
            this.showNotification = window.showNotification;
        } else {
            this.showNotification = this.defaultNotification;
        }
        
        this.render();
        this.bindEvents();
        
        // Użyj motywu z app.js
        this.applyTheme();
    }
    
    applyTheme() {
        const savedTheme = localStorage.getItem('selectedTheme');
        if (savedTheme && window.changeTheme) {
            window.changeTheme(savedTheme);
        }
    }
    
    defaultNotification(message, type = 'success') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Prosta notyfikacja jeśli nie ma z app.js
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#ef4444' : '#10b981'};
            color: white;
            border-radius: 2px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    save() {
        localStorage.setItem("restreamSites", JSON.stringify(this.sites));
        this.showNotification('Zapisano zmiany');
    }
    
    render() {
        if (this.sites.length === 0) {
            this.rowsDiv.innerHTML = `
                <div class="restream-empty-state">
                    <div class="icon">📺</div>
                    <h3>Brak stron streamingowych</h3>
                    <p>Kliknij przycisk poniżej, aby dodać pierwszą stronę</p>
                </div>
            `;
            return;
        }
    
        this.rowsDiv.innerHTML = "";
        this.sites.forEach((row, i) => {
            const rowElement = document.createElement('div');
            rowElement.className = 'restream-row';
            rowElement.innerHTML = `
                <input class="restream-input" value="${this.escapeHtml(row.name)}" 
                       placeholder="Wpisz nazwę strony..." 
                       data-index="${i}" data-type="name">
                <input class="restream-input" value="${this.escapeHtml(row.url)}" 
                       placeholder="https://przyklad.com" 
                       data-index="${i}" data-type="url">
                <button class="restream-delete-btn" data-index="${i}" 
                        title="Usuń stronę">🗑️</button>
            `;
            this.rowsDiv.appendChild(rowElement);
        });
        
        // Dodaj event listeners do nowych elementów
        this.bindRowEvents();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    bindEvents() {
        this.addButton.addEventListener('click', () => this.addRow());
        
        // Obsługa Enter w inputach
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.classList.contains('restream-input')) {
                e.target.blur();
            }
        });
    }
    
    bindRowEvents() {
        // Input changes
        document.querySelectorAll('.restream-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const type = e.target.dataset.type;
                const value = e.target.value.trim();
                
                if (type === 'name') {
                    this.updateName(index, value);
                } else if (type === 'url') {
                    this.updateUrl(index, value);
                }
            });
            
            // Auto-select przy focus
            input.addEventListener('focus', (e) => {
                e.target.select();
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.restream-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeRow(index);
            });
        });
    }
    
    updateName(i, val) {
        if (!val.trim()) {
            this.showNotification('Nazwa nie może być pusta', 'error');
            this.render();
            return;
        }
        this.sites[i].name = val;
        this.save();
    }
    
    updateUrl(i, val) {
        if (!val.trim()) {
            this.showNotification('URL nie może być pusty', 'error');
            this.render();
            return;
        }
        
        // Dodaj https:// jeśli brakuje
        if (!val.startsWith('http://') && !val.startsWith('https://')) {
            val = 'https://' + val;
        }
        
        this.sites[i].url = val;
        this.save();
        this.render(); // Re-render żeby pokazać poprawiony URL
    }
    
    removeRow(i) {
    const siteName = this.sites[i].name;
    
    this.sites.splice(i, 1);
    this.save();
    this.render();
    this.showNotification(`Usunięto stronę: ${siteName}`);
}
    
    addRow() {
        this.sites.push({ 
            name: "Nowa strona", 
            url: "https://" 
        });
        this.save();
        this.render();
        
        // Focus na nowym inpucie nazwy
        setTimeout(() => {
            const newRow = this.rowsDiv.lastChild;
            if (newRow) {
                const nameInput = newRow.querySelector('[data-type="name"]');
                if (nameInput) {
                    nameInput.focus();
                    nameInput.select();
                }
            }
        }, 100);
    }
}

// Uruchom po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
    // Sprawdź czy jesteśmy na stronie restream
    if (window.location.pathname.includes('restream.html') || 
        document.title.includes('Restream')) {
        new RestreamManager();
    }
});
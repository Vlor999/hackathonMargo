/**
 * Gestion des contrôles de l'interface utilisateur
 */

// Initialisation des écouteurs d'événements pour les boutons
function initUIControls() {
    try {
        // Bouton de recherche d'itinéraire
        const drawButton = document.getElementById('drawLineButton');
        if (drawButton) {
            drawButton.addEventListener('click', function() {
                if (window.routing && typeof window.routing.findPath === 'function') {
                    window.routing.findPath();
                } else {
                    alert("Le module de recherche d'itinéraire n'est pas chargé correctement.");
                }
            });
        } else {
            console.error("Bouton de recherche d'itinéraire introuvable");
        }
        
        // Bouton pour changer de thème
        const themeButton = document.getElementById('toggleThemeButton');
        if (themeButton) {
            themeButton.addEventListener('click', function() {
                if (window.mapInit && typeof window.mapInit.toggleTheme === 'function') {
                    window.mapInit.toggleTheme();
                } else {
                    document.body.classList.toggle('dark-mode');
                    this.textContent = document.body.classList.contains('dark-mode') ? 'Mode Clair' : 'Mode Sombre';
                }
            });
        } else {
            console.error("Bouton de changement de thème introuvable");
        }
        
        // Gestionnaire pour le sélecteur de mode de transport
        const transportMode = document.getElementById('transportMode');
        if (transportMode) {
            transportMode.addEventListener('change', function(e) {
                if (e.target.value === 'transit') {
                    // Précharger le réseau de transport
                    if (!window.transportNetworkLoaded && window.main && typeof window.main.loadTransitNetworkOnDemand === 'function') {
                        window.main.loadTransitNetworkOnDemand();
                    }
                }
            });
        }
        
        // Ajouter un bouton pour effacer le cache
        const controlsDiv = document.getElementById('controls');
        if (controlsDiv) {
            const clearCacheButton = document.createElement('button');
            clearCacheButton.id = 'clearCacheButton';
            clearCacheButton.textContent = 'Effacer cache';
            clearCacheButton.title = 'Effacer les données en cache pour résoudre les problèmes';
            clearCacheButton.style.marginLeft = '5px';
            clearCacheButton.style.background = '#dc3545';
            
            clearCacheButton.addEventListener('click', function() {
                if (window.networkBuilder && typeof window.networkBuilder.clearAllCaches === 'function') {
                    window.networkBuilder.clearAllCaches();
                    window.main.showFloatingMessage('Cache effacé avec succès', 'success');
                    
                    // Recharger la page après un court délai
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                }
            });
            
            controlsDiv.appendChild(clearCacheButton);
        }
        
        console.log("Contrôles UI initialisés avec succès");
    } catch (e) {
        console.error("Erreur lors de l'initialisation des contrôles UI:", e);
    }
}

// Export des fonctions
window.uiControls = {
    initUIControls
};

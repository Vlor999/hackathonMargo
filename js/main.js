/**
 * Script principal qui coordonne l'ensemble de l'application
 */

// Fonction d'initialisation principale
function initApplication() {
    console.log("Initialisation de l'application...");
    
    // S'assurer que la carte est initialisée
    if (!window.mapInit || !window.mapInit.getMap()) {
        console.error("La carte n'est pas initialisée, nouvelle tentative dans 300ms...");
        setTimeout(initApplication, 300);
        return;
    }
    
    // S'assurer que les nouveaux modules sont bien chargés
    if (!window.utils || !window.networkBuilder || 
        !window.geocoding || !window.pathDisplay || 
        !window.directionDisplay || !window.routing) {
        console.error("Les modules requis ne sont pas tous chargés, nouvelle tentative dans 300ms...");
        setTimeout(initApplication, 300);
        return;
    }
    
    // Initialiser les contrôles UI immédiatement
    try {
        if (window.uiControls && typeof window.uiControls.initUIControls === 'function') {
            window.uiControls.initUIControls();
        }
    } catch (e) {
        console.error("Erreur lors de l'initialisation des contrôles UI:", e);
    }
    
    // Activer immédiatement la sélection des points sur la carte
    console.log("Interface activée - vous pouvez déjà sélectionner des points sur la carte");
    
    // Afficher un message de chargement discret
    const loadingMessageContainer = document.createElement('div');
    loadingMessageContainer.id = 'loading-progress-container';
    loadingMessageContainer.style.cssText = 'position: fixed; bottom: 10px; left: 10px; z-index: 1000; background-color: rgba(255,255,255,0.8); padding: 5px 10px; border-radius: 5px; font-size: 14px; max-width: 300px; display: flex; align-items: center;';
    
    const loadingIcon = document.createElement('div');
    loadingIcon.className = 'mini-spinner';
    loadingIcon.style.cssText = 'width: 16px; height: 16px; border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; margin-right: 10px; animation: spin 1s linear infinite;';
    
    const loadingText = document.createElement('span');
    loadingText.id = 'loading-progress-text';
    loadingText.innerHTML = 'Chargement des données réseau en arrière-plan (0%)';
    
    loadingMessageContainer.appendChild(loadingIcon);
    loadingMessageContainer.appendChild(loadingText);
    document.body.appendChild(loadingMessageContainer);
    
    // Modification: charger uniquement les réseaux routiers et piéton/vélo
    loadBasicNetworks(loadingMessageContainer, loadingText);
    
    // Ajouter un gestionnaire d'événements au sélecteur de mode de transport
    const transportModeSelect = document.getElementById('transportMode');
    if (transportModeSelect) {
        transportModeSelect.addEventListener('change', function(e) {
            if (e.target.value === 'transit' && !window.transportNetworkLoaded) {
                loadTransitNetworkOnDemand();
            }
        });
    }
}

// Nouvelle fonction pour charger uniquement les réseaux de base
function loadBasicNetworks(progressContainer, progressText) {
    // Vérifier si les données sont déjà en cache
    const cachedNetworks = localStorage.getItem('margo_basic_networks');
    if (cachedNetworks) {
        try {
            const networksData = JSON.parse(cachedNetworks);
            const timestamp = parseInt(localStorage.getItem('margo_networks_timestamp') || '0');
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            
            // Utiliser les données en cache si elles sont récentes
            if (timestamp && now - timestamp < oneDay) {
                console.log("Utilisation des réseaux mis en cache");
                window.networkBuilder.deserializeBasicNetworks(networksData);
                progressText.innerHTML = 'Données routières chargées depuis le cache';
                
                // Cacher le message après 2 secondes
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                }, 2000);
                
                return;
            }
        } catch (e) {
            console.warn("Erreur lors du chargement des données en cache:", e);
        }
    }
    
    // Fonction pour mettre à jour la progression
    let progress = 0;
    function updateProgress(increment, message) {
        progress += increment;
        progress = Math.min(progress, 100);
        progressText.innerHTML = `${message || 'Chargement des données'} (${Math.round(progress)}%)`;
        
        // Terminer une fois à 100%
        if (progress >= 100) {
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 2000);
            
            // Désactiver la mise en cache - trop volumineux pour être fiable
            // tout en gardant la date de dernière tentative pour éviter les erreurs
            try {
                localStorage.setItem('margo_networks_timestamp', Date.now().toString());
                console.log("Horodatage du réseau enregistré");
            } catch (e) {
                console.warn("Erreur lors de la sauvegarde de l'horodatage:", e);
            }
        }
    }
    
    // Charger uniquement le réseau routier (qui contient aussi les chemins piétons et vélo)
    setTimeout(() => {
        window.networkBuilder.loadNetworkInChunks(
            'dataSetHackathon/grenoble.geojson',
            'routier',
            (pct) => updateProgress(pct, 'Chargement du réseau routier')
        ).then(() => {
            console.log("Réseau routier chargé - l'application est utilisable");
            updateProgress(100, 'Réseaux de base chargés');
        }).catch(error => {
            console.error("Erreur lors du chargement des données routières:", error);
            progressText.innerHTML = 'Erreur de chargement';
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 3000);
        });
    }, 100);
}

// Nouvelle fonction pour charger le réseau de transport uniquement quand nécessaire
function loadTransitNetworkOnDemand() {
    console.log("Chargement du réseau de transport à la demande...");
    
    // Vérifier si déjà chargé
    if (window.transportNetworkLoaded) {
        console.log("Réseau de transport déjà chargé");
        return Promise.resolve();
    }
    
    // Créer ou afficher l'indicateur de chargement
    showFloatingMessage('Chargement des données de transport en cours...', 'loading');
    
    // Désactiver complètement le cache pour le réseau de transport qui est trop volumineux
    window.transitDataLoaded = false;
    
    // Ajouter un contrôle de mémoire pour éviter les crashs
    const memoryCheck = setInterval(() => {
        try {
            if (window.performance && window.performance.memory) {
                const memoryInfo = window.performance.memory;
                const usedHeapSizeMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
                const heapLimitMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024);
                
                console.log(`Utilisation mémoire: ${Math.round(usedHeapSizeMB)}MB / ${Math.round(heapLimitMB)}MB`);
                
                // Si on approche 80% de la limite de mémoire, afficher un avertissement
                if (usedHeapSizeMB > heapLimitMB * 0.8) {
                    console.warn("Attention: utilisation élevée de la mémoire!");
                    showFloatingMessage('Attention: utilisation élevée de la mémoire', 'warning');
                }
            }
        } catch (e) {
            // Ignorer les erreurs de vérification mémoire
            console.log("Impossible de vérifier la mémoire");
        }
    }, 5000);
    
    // Optimisation: chargement plus léger des données de transport avec optimisation extrême
    return window.networkBuilder.loadNetworkInChunks(
        'dataSetHackathon/data_transport_commun_grenoble.geojson',
        'transport',
        (progress) => {
            // Mettre à jour l'indicateur de progression
            const floatingMsg = document.getElementById('floating-message');
            if (floatingMsg) {
                floatingMsg.innerHTML = `<span>⏳</span> Chargement des données de transport (${Math.round(progress*100)}%)`;
            }
        },
        true // optimisation maximale
    ).then(() => {
        clearInterval(memoryCheck);
        console.log("Données de transport chargées");
        window.transitDataLoaded = true;
        
        // Construire le réseau multimodal immédiatement avec optimisation maximale
        try {
            console.log("Construction du réseau multimodal optimisé");
            window.networkBuilder.buildMultimodalNetwork(true); // avec flag d'optimisation maximale
            window.transportNetworkLoaded = true;
            console.log("Réseau multimodal construit");
            
            // Forcer la libération de mémoire
            if (window.gc) {
                try { window.gc(); } catch(e) {}
            }
        } catch (e) {
            console.error("Erreur lors de la construction du réseau multimodal:", e);
            window.transportNetworkLoaded = false;
            throw e; // Propager l'erreur
        }
        
        showFloatingMessage('Données de transport chargées avec succès', 'success');
        return Promise.resolve();
    }).catch(error => {
        clearInterval(memoryCheck);
        console.error("Erreur lors du chargement des données de transport:", error);
        showFloatingMessage('Erreur lors du chargement des données de transport', 'error');
        return Promise.reject(error);
    });
}

// Fonction utilitaire pour afficher un message flottant
function showFloatingMessage(message, type = 'info') {
    let icon = '🔄';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'loading') icon = '⏳';
    
    const existingMessage = document.getElementById('floating-message');
    if (existingMessage) {
        existingMessage.innerHTML = `<span>${icon}</span> ${message}`;
        existingMessage.className = `floating-message ${type}`;
        
        // Réinitialiser le timer de disparition
        clearTimeout(existingMessage.timer);
        if (type !== 'loading') {
            existingMessage.timer = setTimeout(() => {
                existingMessage.style.opacity = '0';
                setTimeout(() => {
                    if (existingMessage.parentNode) {
                        existingMessage.parentNode.removeChild(existingMessage);
                    }
                }, 500);
            }, 3000);
        }
    } else {
        const messageElement = document.createElement('div');
        messageElement.id = 'floating-message';
        messageElement.className = `floating-message ${type}`;
        messageElement.innerHTML = `<span>${icon}</span> ${message}`;
        messageElement.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: white;
            color: #333;
            padding: 10px 15px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            transition: opacity 0.5s;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        document.body.appendChild(messageElement);
        
        // Faire disparaître après quelques secondes sauf si c'est un message de chargement
        if (type !== 'loading') {
            messageElement.timer = setTimeout(() => {
                messageElement.style.opacity = '0';
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.parentNode.removeChild(messageElement);
                    }
                }, 500);
            }, 3000);
        }
    }
}

// Créer une animation CSS pour le spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}`;
document.head.appendChild(styleSheet);

// Attendre le chargement complet de la page pour initialiser
window.addEventListener('load', function() {
    setTimeout(initApplication, 100);
});

// Export de l'objet
window.main = {
    initApplication,
    loadTransitNetworkOnDemand // Exposer pour utilisation dans d'autres modules
};

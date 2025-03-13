/**
 * Fonctions pour obtenir les noms de rues via géocodage inversé
 */

// Cache des noms de rues
window.roadNameCache = window.roadNameCache || {};

// Nombre de requêtes envoyées récemment
let recentRequests = 0;
// Timestamp de la dernière réinitialisation du compteur
let lastResetTime = Date.now();
// File d'attente pour les requêtes
const geocodeQueue = [];
// Indicateur de traitement en cours
let isProcessingQueue = false;

// Fonction principale pour obtenir le nom d'une rue entre deux points
function tryGetRoadName(pointStart, pointEnd) {
    // Créer une clé de cache unique pour ce segment
    const cacheKey = `${pointStart[0]},${pointStart[1]}_${pointEnd[0]},${pointEnd[1]}`;
    
    // Vérifier si nous avons déjà ce nom de rue en cache
    if (window.roadNameCache[cacheKey]) {
        return window.roadNameCache[cacheKey];
    }
    
    // Calculer le point central du segment pour le géocodage inversé
    const midLng = (pointStart[0] + pointEnd[0]) / 2;
    const midLat = (pointStart[1] + pointEnd[1]) / 2;
    
    // Utiliser une requête asynchrone, mais retourner null immédiatement
    // Les résultats seront mis en cache pour les utilisations futures
    reverseGeocode(midLat, midLng, cacheKey);
    
    return null;
}

// Fonction pour effectuer le géocodage inversé avec contrôle de débit
function reverseGeocode(lat, lng, cacheKey) {
    // Ajouter la requête à la file d'attente
    geocodeQueue.push({ lat, lng, cacheKey });
    
    // Si le traitement n'est pas en cours, le démarrer
    if (!isProcessingQueue) {
        processGeocodeQueue();
    }
}

// Fonction pour traiter la file d'attente des requêtes de géocodage
function processGeocodeQueue() {
    if (geocodeQueue.length === 0) {
        isProcessingQueue = false;
        return;
    }
    
    isProcessingQueue = true;
    
    // Vérifier si nous devons réinitialiser le compteur
    const now = Date.now();
    if (now - lastResetTime > 1000) { // Réinitialiser toutes les secondes
        recentRequests = 0;
        lastResetTime = now;
    }
    
    // Si nous avons fait trop de requêtes récemment, attendre
    if (recentRequests >= 3) { // Limite à 3 requêtes par seconde
        setTimeout(processGeocodeQueue, 1000);
        return;
    }
    
    // Traiter la prochaine requête
    const { lat, lng, cacheKey } = geocodeQueue.shift();
    recentRequests++;
    
    // Utiliser l'API Nominatim pour le géocodage inversé
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    fetch(url, {
        headers: {
            'User-Agent': 'MargoRouting/1.0' 
        }
    })
    .then(response => response.json())
    .then(data => {
        let roadName = null;
        
        // Extraire le nom de la rue
        if (data && data.address) {
            if (data.address.road) {
                roadName = data.address.road;
            } else if (data.address.pedestrian) {
                roadName = data.address.pedestrian;
            } else if (data.address.path) {
                roadName = data.address.path;
            } else if (data.address.footway) {
                roadName = data.address.footway;
            }
        }
        
        // Stocker dans le cache
        if (roadName) {
            window.roadNameCache[cacheKey] = roadName;
            
            // Également stocker en localStorage pour persistance
            try {
                const existingCache = JSON.parse(localStorage.getItem('roadNameCache') || '{}');
                existingCache[cacheKey] = roadName;
                localStorage.setItem('roadNameCache', JSON.stringify(existingCache));
            } catch (e) {
                console.warn("Impossible de stocker le cache de noms de rues:", e);
            }
            
            // Si un résultat d'itinéraire est affiché, mettre à jour dynamiquement l'interface
            updateDirectionsDisplay();
        }
    })
    .catch(error => {
        console.warn("Erreur de géocodage inversé:", error);
    })
    .finally(() => {
        // Continuer avec la file après un court délai
        setTimeout(processGeocodeQueue, 333); // Espacer les requêtes
    });
}

// Fonction pour mettre à jour l'affichage des directions si nécessaire
function updateDirectionsDisplay() {
    const resultsElement = document.getElementById('path-results');
    if (!resultsElement || resultsElement.style.display === 'none') {
        return; // Ne rien faire si les résultats ne sont pas affichés
    }
    
    const directionSteps = resultsElement.querySelectorAll('.direction-step');
    if (!directionSteps.length) return;
    
    // Mettre à jour les noms de rues si disponibles
    directionSteps.forEach(step => {
        const instructionElement = step.querySelector('.step-instruction');
        if (!instructionElement) return;
        
        const instructionText = instructionElement.textContent;
        
        // Vérifier si l'instruction contient déjà "sur <Nom de Rue>"
        if (instructionText && !instructionText.includes(" sur ")) {
            // Regarder s'il y a une propriété de data stockant la clé de cache
            const cacheKey = step.getAttribute('data-cache-key');
            if (cacheKey && window.roadNameCache[cacheKey]) {
                instructionElement.textContent = `${instructionText} sur ${window.roadNameCache[cacheKey]}`;
            }
        }
    });
}

// Charger le cache des noms de rues depuis le localStorage
function loadRoadNameCache() {
    try {
        const cachedData = localStorage.getItem('roadNameCache');
        if (cachedData) {
            const cachedRoadNames = JSON.parse(cachedData);
            // Fusionner avec le cache global
            Object.assign(window.roadNameCache, cachedRoadNames);
            console.log(`Cache de noms de rues chargé: ${Object.keys(window.roadNameCache).length} entrées`);
        }
    } catch (e) {
        console.warn("Erreur lors du chargement du cache de noms de rues:", e);
    }
}

// Charger le cache au démarrage
loadRoadNameCache();

// Export des fonctions
window.geocoding = {
    tryGetRoadName,
    reverseGeocode,
    updateDirectionsDisplay,
    loadRoadNameCache
};

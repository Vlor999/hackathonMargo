/**
 * Fonctions de base pour la recherche d'itinéraires
 * (Division de l'ancien fichier routing.js)
 */

// Fonction principale pour rechercher un chemin
function findPath() {
    const map = window.mapInit.getMap();
    const markers = window.mapInit.markers;

    if (!map) {
        alert("La carte n'est pas initialisée. Veuillez rafraîchir la page.");
        return;
    }

    if (!markers.depart || !markers.arriver) {
        alert('Veuillez enregistrer les deux adresses avant de tracer la ligne.');
        return;
    }
    
    // Masquer les résultats précédents s'ils existent
    let resultsElement = document.getElementById('path-results');
    if (resultsElement) {
        resultsElement.style.display = 'none';
    } else {
        // Créer le conteneur pour les résultats s'il n'existe pas
        resultsElement = document.createElement('div');
        resultsElement.id = 'path-results';
        document.body.appendChild(resultsElement);
    }
    
    // Afficher un message de chargement
    let loadingElement = document.createElement('div'); // Remplacer const par let
    loadingElement.id = 'loading-indicator';
    loadingElement.innerHTML = '<div class="spinner"></div><span>Calcul du chemin en cours...</span>';
    document.body.appendChild(loadingElement);
    
    // Récupérer le mode de transport sélectionné
    const transportMode = document.getElementById('transportMode').value;
    document.getElementById('drawLineButton').disabled = true;
    
    // Sélectionner le réseau approprié
    let network;
    let useHybrid = false;
    let startNetwork, endNetwork;
    
    try {
        switch (transportMode) {
            case 'car':
                // Modification: utiliser le réseau piéton pour accéder au réseau routier si nécessaire
                network = window.networkBuilder.roadNetwork;
                startNetwork = window.networkBuilder.footpathNetwork;
                endNetwork = window.networkBuilder.footpathNetwork;
                useHybrid = true;
                break;
            case 'bike':
                network = window.networkBuilder.bikeNetwork;
                break;
            case 'foot':
                network = window.networkBuilder.footpathNetwork;
                break;
            case 'transit':
                // Affichage d'un avertissement sur la performance
                if (!window.transportPerformanceWarningShown) {
                    alert("Le mode transport en commun est expérimental et peut ralentir l'application. Utilisez-le avec parcimonie.");
                    window.transportPerformanceWarningShown = true;
                }
                
                // Vérifier si le réseau de transport est chargé
                if (!window.transportNetworkLoaded) {
                    // Désactiver le bouton pendant le chargement
                    document.getElementById('drawLineButton').disabled = true;
                    
                    // Mettre à jour l'indicateur de chargement au lieu de le recréer
                    if (document.body.contains(loadingElement)) {
                        loadingElement.innerHTML = '<div class="spinner"></div><span>Chargement des données de transport en cours...</span>';
                    } else {
                        loadingElement = document.createElement('div');
                        loadingElement.id = 'loading-indicator';
                        loadingElement.innerHTML = '<div class="spinner"></div><span>Chargement des données de transport en cours...</span>';
                        document.body.appendChild(loadingElement);
                    }
                    
                    // Vérifier si un chargement est déjà en cours
                    if (window.isLoadingTransitNetwork) {
                        cleanupAndAlert("Chargement des données de transport déjà en cours...");
                        return;
                    }
                    
                    window.isLoadingTransitNetwork = true;
                    
                    // Ajouter un timeout pour éviter le blocage infini
                    const loadingTimeout = setTimeout(() => {
                        if (window.isLoadingTransitNetwork) {
                            console.error("Timeout lors du chargement du réseau de transport");
                            document.getElementById('drawLineButton').disabled = false;
                            window.isLoadingTransitNetwork = false;
                            
                            if (document.body.contains(loadingElement)) {
                                document.body.removeChild(loadingElement);
                            }
                            alert("Le chargement des données de transport a pris trop de temps. Veuillez réessayer ou choisir un autre mode de transport.");
                        }
                    }, 60000); // 60 secondes de timeout
                    
                    // Charger le réseau de transport puis réessayer
                    window.main.loadTransitNetworkOnDemand()
                        .then(() => {
                            // Une fois chargé, annuler le timeout
                            clearTimeout(loadingTimeout);
                            
                            // Relancer la recherche
                            document.getElementById('drawLineButton').disabled = false;
                            window.isLoadingTransitNetwork = false;
                            
                            if (document.body.contains(loadingElement)) {
                                document.body.removeChild(loadingElement);
                            }
                            
                            // Vérifier l'état des données avant de rappeler findPath
                            if (window.transportNetworkLoaded) {
                                // Éviter la récursion directe qui peut causer des problèmes de mémoire
                                setTimeout(() => {
                                    // Vérifier à nouveau que la page est toujours active
                                    if (document.body.contains(document.getElementById('map'))) {
                                        findPath();
                                    }
                                }, 500);
                            } else {
                                cleanupAndAlert("Le réseau de transport n'a pas pu être correctement chargé.");
                            }
                        })
                        .catch(error => {
                            // Annuler le timeout en cas d'erreur
                            clearTimeout(loadingTimeout);
                            
                            console.error("Impossible de charger le réseau de transport:", error);
                            document.getElementById('drawLineButton').disabled = false;
                            window.isLoadingTransitNetwork = false;
                            
                            if (document.body.contains(loadingElement)) {
                                document.body.removeChild(loadingElement);
                            }
                            alert("Impossible de charger les données de transport. Veuillez réessayer avec un autre mode de transport.");
                        });
                    return;
                }
                
                // Construire le réseau multimodal à la demande si nécessaire
                if (!window.transportNetworkLoaded && window.transitDataLoaded) {
                    console.time('build-multimodal-ondemand');
                    window.networkBuilder.buildMultimodalNetwork();
                    window.transportNetworkLoaded = true;
                    console.timeEnd('build-multimodal-ondemand');
                }
                
                network = window.networkBuilder.multimodalNetwork;
                startNetwork = window.networkBuilder.footpathNetwork;
                endNetwork = window.networkBuilder.footpathNetwork;
                useHybrid = true;
                break;
            default:
                network = window.networkBuilder.roadNetwork;
        }
    
        // Vérifier l'état du chargement du réseau
        const networkSize = Object.keys(network).length;
        if (networkSize < 10) {
            // Réseau très petit ou vide - vérifier l'état du chargement
            const loadingProgress = document.getElementById('loading-progress-container');
            
            if (loadingProgress && loadingProgress.style.display !== 'none') {
                cleanupAndAlert("Les données de réseau sont en cours de chargement. Veuillez réessayer dans quelques instants.");
                return;
            } else if (networkSize === 0) {
                cleanupAndAlert(`Le réseau pour ${utils.getTransportModeName(transportMode)} n'est pas disponible.`);
                return;
            }
        }
        
        // Si on n'utilise pas le mode hybride, utiliser le même réseau pour départ et arrivée
        if (!useHybrid) {
            startNetwork = network;
            endNetwork = network;
        }
        
        if (!startNetwork || !endNetwork || 
            Object.keys(startNetwork).length === 0 || 
            Object.keys(endNetwork).length === 0) {
            cleanupAndAlert("Le réseau sélectionné est vide ou non initialisé.");
            return;
        }
        
        // Trouver les nœuds les plus proches
        const startNode = window.networkBuilder.findNearestNode(markers.depart.getLatLng(), startNetwork);
        const endNode = window.networkBuilder.findNearestNode(markers.arriver.getLatLng(), endNetwork);
        
        console.log(`Point de départ: ${startNode}`);
        console.log(`Point d'arrivée: ${endNode}`);
        
        if (!startNode || !endNode) {
            cleanupAndAlert(`Impossible de trouver un point de départ ou d'arrivée dans le réseau ${utils.getTransportModeName(transportMode)}.`);
            return;
        }
        
        // Créer un réseau combiné pour les modes hybrides
        let routingNetwork = network;
        if (useHybrid && transportMode === 'car') {
            // Pour la voiture, créer un réseau hybride voiture + piéton
            routingNetwork = createHybridNetwork(network, startNetwork, endNetwork, startNode, endNode);
        }
        
        // Simplifier le réseau pour accélérer les calculs
        const simplifiedNetwork = window.networkBuilder.simplifyNetwork(routingNetwork, startNode, endNode);
        
        // Calcul différé pour actualiser l'UI
        setTimeout(() => {
            try {
                // Algorithme de recherche de chemin
                const result = dijkstra(simplifiedNetwork, startNode, endNode);
                
                // Nettoyage du chargement
                if (document.body.contains(loadingElement)) {
                    document.body.removeChild(loadingElement);
                }
                document.getElementById('drawLineButton').disabled = false;
                
                if (!result.path || !result.path.length) {
                    alert(`Aucun chemin trouvé en ${utils.getTransportModeName(transportMode)}.`);
                    return;
                }
                
                // Afficher le chemin et les informations
                window.pathDisplay.drawMultimodalPathOnMap(result.path, transportMode);
                const travelTime = utils.calculateTravelTime(result.distance, transportMode);
                window.directionDisplay.displayPathInfo(transportMode, travelTime, result);
            } catch (error) {
                console.error("Erreur lors du calcul du chemin:", error);
                cleanupAndAlert("Une erreur s'est produite lors du calcul du chemin.");
            }
        }, 10);
    } catch (e) {
        console.error("Erreur critique:", e);
        cleanupAndAlert("Une erreur critique s'est produite. Veuillez rafraîchir la page.");
    }
    
    // Helper pour nettoyer et afficher une alerte
    function cleanupAndAlert(message) {
        try {
            if (document.body.contains(loadingElement)) {
                document.body.removeChild(loadingElement);
            }
        } catch (err) { 
            console.error(err); 
        }
        document.getElementById('drawLineButton').disabled = false;
        alert(message);
    }
}

// Nouvelle fonction pour créer un réseau hybride (voiture + piéton) pour permettre
// de marcher jusqu'à/depuis la voiture si nécessaire
function createHybridNetwork(mainNetwork, startNetwork, endNetwork, startNode, endNode) {
    const hybridNetwork = {};
    
    // Copier le réseau principal (voiture)
    for (const node in mainNetwork) {
        if (node === 'stations' || node === 'lines') continue;
        hybridNetwork[node] = Object.assign({}, mainNetwork[node]);
    }
    
    // Ajouter les connexions depuis le point de départ vers le réseau routier
    const MAX_WALKING_DIST = 0.003; // environ 300m max à pied
    
    // Ajouter le nœud de départ s'il n'existe pas déjà
    if (!hybridNetwork[startNode]) {
        hybridNetwork[startNode] = {};
    }
    
    // Chercher les points de connexion proches dans le réseau routier
    const startCoords = utils.stringToCoord(startNode);
    let startConnections = 0;
    
    for (const roadNode in mainNetwork) {
        if (roadNode === 'stations' || roadNode === 'lines') continue;
        
        const roadCoords = utils.stringToCoord(roadNode);
        const distance = utils.calculateDistance(startCoords, roadCoords);
        
        // Si le nœud routier est assez proche du départ
        if (distance < MAX_WALKING_DIST) {
            // Calculer temps à pied pour cette connexion (vitesse 5 km/h)
            const distanceKm = distance * 111.32;
            const walkingTime = (distanceKm / 5) * 3600; // secondes
            
            hybridNetwork[startNode][roadNode] = walkingTime;
            startConnections++;
            
            // Limiter le nombre de connexions pour éviter de surcharger
            if (startConnections >= 5) break;
        }
    }
    
    // Pareil pour le point d'arrivée
    if (!hybridNetwork[endNode]) {
        hybridNetwork[endNode] = {};
    }
    
    // Chercher les points de connexion proches dans le réseau routier
    const endCoords = utils.stringToCoord(endNode);
    let endConnections = 0;
    
    for (const roadNode in mainNetwork) {
        if (roadNode === 'stations' || roadNode === 'lines') continue;
        
        const roadCoords = utils.stringToCoord(roadNode);
        const distance = utils.calculateDistance(endCoords, roadCoords);
        
        // Si le nœud routier est assez proche de l'arrivée
        if (distance < MAX_WALKING_DIST) {
            // Calculer temps à pied pour cette connexion
            const distanceKm = distance * 111.32;
            const walkingTime = (distanceKm / 5) * 3600; // secondes
            
            if (!hybridNetwork[roadNode]) hybridNetwork[roadNode] = {};
            hybridNetwork[roadNode][endNode] = walkingTime;
            endConnections++;
            
            // Limiter le nombre de connexions
            if (endConnections >= 5) break;
        }
    }
    
    console.log(`Réseau hybride créé avec ${startConnections} connexions au départ et ${endConnections} connexions à l'arrivée`);
    return hybridNetwork;
}

// Analyse des segments de transport en commun
function analyzeMultimodalPath(path) {
    if (!path || path.length < 2) {
        console.error("Chemin invalide ou vide");
        return [];
    }
    
    const segments = [];
    let currentMode = "foot"; // Par défaut, on commence à pied
    let currentSegment = { mode: "foot", points: [path[0]], start: path[0] };
    let currentLine = null;
    
    for (let i = 1; i < path.length; i++) {
        const fromNode = path[i-1];
        const toNode = path[i];
        const segmentKey = `${fromNode}-${toNode}`;
        
        // Vérifier si ce segment est un transport en commun
        const transitNetwork = window.networkBuilder.transitNetwork;
        const isTransit = transitNetwork.lines && transitNetwork.lines[segmentKey];
        
        if (isTransit) {
            if (currentMode === "foot") {
                // Terminer segment piéton
                currentSegment.end = fromNode;
                segments.push(currentSegment);
                
                // Commencer segment transport
                const lineInfo = transitNetwork.lines[segmentKey][0];
                currentMode = "transit";
                currentLine = lineInfo;
                currentSegment = { 
                    mode: "transit", 
                    line: lineInfo,
                    points: [fromNode], 
                    start: fromNode 
                };
            } else if (currentMode === "transit") {
                // Vérifier changement de ligne
                const lineInfo = transitNetwork.lines[segmentKey][0];
                if (lineInfo !== currentLine) {
                    currentSegment.end = fromNode;
                    segments.push(currentSegment);
                    
                    currentLine = lineInfo;
                    currentSegment = { 
                        mode: "transit", 
                        line: lineInfo,
                        points: [fromNode], 
                        start: fromNode 
                    };
                }
            }
        } else {
            if (currentMode === "transit") {
                // Terminer segment transport
                currentSegment.end = fromNode;
                segments.push(currentSegment);
                
                // Commencer segment piéton
                currentMode = "foot";
                currentLine = null;
                currentSegment = { 
                    mode: "foot", 
                    points: [fromNode], 
                    start: fromNode 
                };
            }
        }
        
        // Ajouter point au segment
        currentSegment.points.push(toNode);
    }
    
    // Ajouter dernier segment
    currentSegment.end = path[path.length - 1];
    segments.push(currentSegment);
    
    return segments;
}

// Export des fonctions principales de routage
window.routing = {
    findPath,
    analyzeMultimodalPath,
    createHybridNetwork
};

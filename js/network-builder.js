/**
 * Construction des réseaux routiers
 */

// Déclaration des réseaux
const roadNetwork = {};
const transitNetwork = {};
const bikeNetwork = {};
const footpathNetwork = {};
const multimodalNetwork = {};

// Nouvelle fonction pour charger les données en morceaux, sans bloquer l'interface
async function loadNetworkInChunks(fichier, type, progressCallback = null, optimize = false) {
    try {
        console.log(`Début du chargement ${fichier}`);
        
        // Charger les données JSON
        const response = await fetch(fichier);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.features || !Array.isArray(data.features)) {
            throw new Error("Format de données invalide");
        }
        
        // Échantillonner et simplifier les données pour les transports en commun
        let features = data.features;
        if (type === 'transport') {
            console.log("Simplification du réseau de transport...");
            
            // Réduire le nombre de points pour les lignes de transport
            const isLineString = feature => feature.geometry && feature.geometry.type === 'LineString';
            const isPoint = feature => feature.geometry && feature.geometry.type === 'Point';
            
            // Garder tous les points (arrêts) mais simplifier et filtrer les lignes
            const points = features.filter(isPoint);
            let lines = features.filter(isLineString);
            
            // Optimisation plus agressive si demandée
            if (optimize) {
                console.log("Optimisation agressive du réseau de transport");
                
                // Réduction encore plus agressive - garder 1 point sur 10
                lines = lines.map(feature => {
                    if (feature.geometry && feature.geometry.coordinates.length > 5) {
                        feature.geometry.coordinates = feature.geometry.coordinates.filter((_, i) => 
                            i % 10 === 0 || i === feature.geometry.coordinates.length - 1);
                    }
                    return feature;
                });
                
                // Ne garder que les lignes principales
                const mainLines = ['A', 'B', 'C', 'D', 'E', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
                lines = lines.filter(feature => 
                    feature.properties && 
                    feature.properties.ref && 
                    mainLines.includes(feature.properties.ref)
                );
                
                // Limiter le nombre de points d'arrêt
                // Prendre un échantillon d'arrêts pour chaque ligne
                const sampledPoints = points.filter((_, i) => i % 3 === 0);
                
                console.log(`Réduction drastique du réseau: ${sampledPoints.length} arrêts (${Math.round(sampledPoints.length/points.length*100)}%), ${lines.length} lignes`);
                features = [...sampledPoints, ...lines];
            } else {
                // Réduction standard - garder 1 point sur 5
                lines = lines.map(feature => {
                    if (feature.geometry && feature.geometry.coordinates.length > 10) {
                        feature.geometry.coordinates = feature.geometry.coordinates.filter((_, i) => 
                            i % 5 === 0 || i === feature.geometry.coordinates.length - 1);
                    }
                    return feature;
                });
                
                // Filtrage par importance - ignorer les lignes sans références ou noms
                lines = lines.filter(feature => 
                    feature.properties && 
                    (feature.properties.ref || feature.properties.name)
                );
                
                features = [...points, ...lines];
            }
            
            console.log(`Réseau de transport simplifié: ${features.length} features (${points.length} arrêts, ${lines.length} segments)`);
        }
        
        const totalFeatures = features.length;
        console.log(`${totalFeatures} features à traiter`);
        
        // Traiter les données par morceaux
        // Augmenter encore plus la taille des chunks pour le transport
        const CHUNK_SIZE = type === 'transport' ? 5000 : 1000;
        const DELAY = 0; // Pas de délai pour maximiser la performance
        
        return new Promise((resolve, reject) => {
            let processed = 0;
            
            function processChunk() {
                const start = processed;
                const end = Math.min(processed + CHUNK_SIZE, totalFeatures);
                
                // Traiter un morceau de données
                for (let i = start; i < end; i++) {
                    const feature = features[i];
                    if (type === 'routier') {
                        buildNetworkFromFeature(feature, roadNetwork, bikeNetwork, footpathNetwork);
                    } else if (type === 'transport') {
                        buildTransitNetworkFromFeature(feature, transitNetwork);
                    }
                }
                
                processed = end;
                const progress = processed / totalFeatures;
                
                if (progressCallback) {
                    progressCallback(progress);
                }
                
                if (processed < totalFeatures) {
                    // Continuer avec le prochain morceau, en laissant respirer l'interface
                    setTimeout(processChunk, DELAY);
                } else {
                    // Terminé
                    console.log(`Traitement de ${fichier} terminé (${totalFeatures} features)`);
                    resolve();
                }
            }
            
            // Démarrer le traitement
            processChunk();
        });
    } catch (error) {
        console.error(`Erreur lors du chargement de ${fichier}:`, error);
        throw error;
    }
}

// Fonctions pour la mise en cache des réseaux
function serializeNetworks() {
    // Crée une représentation simplifiée des réseaux pour le stockage
    return {
        road: Object.keys(roadNetwork).length,
        bike: Object.keys(bikeNetwork).length,
        foot: Object.keys(footpathNetwork).length,
        transit: Object.keys(transitNetwork).length,
        multimodal: Object.keys(multimodalNetwork).length,
        roadNetwork,
        transitNetwork,
        bikeNetwork,
        footpathNetwork,
        multimodalNetwork
    };
}

function deserializeNetworks(data) {
    // Restaure les réseaux depuis la représentation sauvegardée
    if (!data) return false;
    
    try {
        // Copier les données dans les réseaux actuels
        Object.assign(roadNetwork, data.roadNetwork || {});
        Object.assign(bikeNetwork, data.bikeNetwork || {});
        Object.assign(footpathNetwork, data.footpathNetwork || {});
        Object.assign(transitNetwork, data.transitNetwork || {});
        Object.assign(multimodalNetwork, data.multimodalNetwork || {});
        
        console.log(`Réseaux restaurés: route(${Object.keys(roadNetwork).length}), vélo(${Object.keys(bikeNetwork).length}), piéton(${Object.keys(footpathNetwork).length}), transport(${Object.keys(transitNetwork).length}), multimodal(${Object.keys(multimodalNetwork).length})`);
        
        return true;
    } catch (e) {
        console.error("Erreur lors de la désérialisation des réseaux:", e);
        return false;
    }
}

// Fonction pour sérialiser uniquement les réseaux de base (sans transport)
function serializeBasicNetworks() {
    return {
        road: Object.keys(roadNetwork).length,
        bike: Object.keys(bikeNetwork).length,
        foot: Object.keys(footpathNetwork).length,
        roadNetwork,
        bikeNetwork,
        footpathNetwork
    };
}

// Fonction pour sérialiser uniquement le réseau de transport
function serializeTransitNetwork() {
    return {
        transit: Object.keys(transitNetwork).length,
        multimodal: Object.keys(multimodalNetwork).length,
        transitNetwork,
        multimodalNetwork
    };
}

// Fonction pour désérialiser uniquement les réseaux de base
function deserializeBasicNetworks(data) {
    if (!data) return false;
    
    try {
        // Copier les données dans les réseaux actuels
        Object.assign(roadNetwork, data.roadNetwork || {});
        Object.assign(bikeNetwork, data.bikeNetwork || {});
        Object.assign(footpathNetwork, data.footpathNetwork || {});
        
        console.log(`Réseaux de base restaurés: route(${Object.keys(roadNetwork).length}), vélo(${Object.keys(bikeNetwork).length}), piéton(${Object.keys(footpathNetwork).length})`);
        
        return true;
    } catch (e) {
        console.error("Erreur lors de la désérialisation des réseaux de base:", e);
        return false;
    }
}

// Fonction pour désérialiser uniquement le réseau de transport
function deserializeTransitNetwork(data) {
    if (!data) return false;
    
    try {
        // Copier les données dans les réseaux de transport
        Object.assign(transitNetwork, data.transitNetwork || {});
        Object.assign(multimodalNetwork, data.multimodalNetwork || {});
        
        console.log(`Réseau de transport restauré: transport(${Object.keys(transitNetwork).length}), multimodal(${Object.keys(multimodalNetwork).length})`);
        
        return true;
    } catch (e) {
        console.error("Erreur lors de la désérialisation du réseau de transport:", e);
        return false;
    }
}

// Fonction pour nettoyer les anciens caches qui peuvent provoquer des erreurs de quota
function cleanupOldCaches() {
    try {
        // Supprimer les anciens formats de cache
        localStorage.removeItem('margo_basic_networks');
        localStorage.removeItem('margo_transit_network');
        
        // Nettoyer les entrées du cache qui dépassent 2 jours
        const now = Date.now();
        const twoDays = 2 * 24 * 60 * 60 * 1000;
        
        const basicTimestamp = parseInt(localStorage.getItem('margo_networks_timestamp') || '0');
        const transitTimestamp = parseInt(localStorage.getItem('margo_transit_timestamp') || '0');
        
        if (now - basicTimestamp > twoDays) {
            // Nettoyer le cache des réseaux de base
            const basicChunks = parseInt(localStorage.getItem('margo_basic_networks_chunks') || '0');
            for (let i = 0; i < basicChunks; i++) {
                localStorage.removeItem(`margo_basic_networks_chunk_${i}`);
            }
            localStorage.removeItem('margo_basic_networks_chunks');
            localStorage.removeItem('margo_networks_timestamp');
            console.log("Cache des réseaux de base nettoyé (expiré)");
        }
        
        if (now - transitTimestamp > twoDays) {
            // Nettoyer le cache du réseau de transport
            const transitChunks = parseInt(localStorage.getItem('margo_transit_chunks') || '0');
            for (let i = 0; i < transitChunks; i++) {
                localStorage.removeItem(`margo_transit_chunk_${i}`);
            }
            localStorage.removeItem('margo_transit_chunks');
            localStorage.removeItem('margo_transit_timestamp');
            console.log("Cache du réseau de transport nettoyé (expiré)");
        }
    } catch (e) {
        console.warn("Erreur lors du nettoyage des caches:", e);
    }
}

// Fonction pour nettoyer complètement le cache
function clearAllCaches() {
    try {
        // Supprimer tous les caches existants
        console.log("Nettoyage complet du cache...");
        
        // Supprimer les caches basiques
        const basicChunks = parseInt(localStorage.getItem('margo_basic_networks_chunks') || '0');
        for (let i = 0; i < basicChunks; i++) {
            localStorage.removeItem(`margo_basic_networks_chunk_${i}`);
        }
        localStorage.removeItem('margo_basic_networks_chunks');
        
        // Supprimer les caches de transport
        const transitChunks = parseInt(localStorage.getItem('margo_transit_chunks') || '0');
        for (let i = 0; i < transitChunks; i++) {
            localStorage.removeItem(`margo_transit_chunk_${i}`);
        }
        localStorage.removeItem('margo_transit_chunks');
        localStorage.removeItem('margo_transit_timestamp');
        
        // Supprimer les anciens formats
        localStorage.removeItem('margo_basic_networks');
        localStorage.removeItem('margo_transit_network');
        
        console.log("Cache nettoyé avec succès");
    } catch (e) {
        console.error("Erreur lors du nettoyage du cache:", e);
    }
}

// Appeler le nettoyage au chargement
clearAllCaches();
cleanupOldCaches();

// Chargement des données GeoJSON
function ajoutDataMap(fichier, randomColor, lineRadius = 5, lineWeight = 2) {
    return fetch(fichier)
    .then(response => response.json())
    .then(data => {
        console.log(`Chargement des données ${fichier} réussi`);
        
        // Ne plus ajouter de couches à la carte, juste construire le réseau
        data.features.forEach(feature => {
            if (fichier.includes('grenoble.geojson')) {
                buildNetworkFromFeature(feature, roadNetwork, bikeNetwork, footpathNetwork);
            } else if (fichier.includes('transport_commun')) {
                buildTransitNetworkFromFeature(feature, transitNetwork);
            }
        });
        
        return data;
    })
    .catch(error => console.error('Erreur lors du chargement du fichier GeoJSON:', error));
}

// Construction du réseau routier à partir des features GeoJSON
function buildNetworkFromFeature(feature, roadNet, bikeNet, footNet) {
    if (feature.geometry && feature.geometry.type === 'LineString') {
        const coordinates = feature.geometry.coordinates;
        const properties = feature.properties || {};
        
        // Vérification améliorée des attributs transport
        // Pour les voitures
        const isCar = (!properties.highway || 
                      !['cycleway', 'footway', 'path', 'pedestrian', 'steps', 'corridor', 'bridleway'].includes(properties.highway)) && 
                      properties.motorcar !== 'no' &&
                      properties.motor_vehicle !== 'no';
        
        // Pour les vélos - explicitement vérifié 'bicycle' = 'yes'/'designated'
        const isBike = properties.bicycle === 'yes' ||
                      properties.bicycle === 'designated' ||
                      properties.highway === 'cycleway' ||
                      properties.cycleway ||
                      (properties.highway && 
                       !['motorway', 'trunk', 'motorway_link', 'trunk_link', 'steps', 'corridor'].includes(properties.highway) &&
                       properties.bicycle !== 'no');
        
        // Pour les piétons - explicitement vérifié 'foot' = 'yes'/'designated'
        const isFoot = properties.foot === 'yes' || 
                      properties.foot === 'designated' ||
                      ['footway', 'path', 'pedestrian', 'steps', 'corridor'].includes(properties.highway) || 
                      properties.sidewalk || 
                      (!properties.highway || properties.foot !== 'no');
        
        // Déterminer la vitesse maximale pour la voiture
        let maxSpeed = 50; // Valeur par défaut en km/h
        if (properties.maxspeed) {
            // Extraire la vitesse numérique si présente
            const speedMatch = String(properties.maxspeed).match(/^(\d+)/);
            if (speedMatch) {
                maxSpeed = parseInt(speedMatch[1], 10);
            }
        } else if (properties.highway) {
            // Vitesses estimées selon le type de route
            const speedLimits = {
                'motorway': 130,
                'trunk': 110,
                'primary': 90,
                'secondary': 70,
                'tertiary': 50,
                'unclassified': 50,
                'residential': 30,
                'service': 20,
                'living_street': 20,
                'track': 30
            };
            if (speedLimits[properties.highway]) {
                maxSpeed = speedLimits[properties.highway];
            }
        }
        
        // Créer les connexions dans les réseaux appropriés
        for (let i = 0; i < coordinates.length - 1; i++) {
            const start = utils.coordToString(coordinates[i]);
            const end = utils.coordToString(coordinates[i + 1]);
            
            // Calculer la distance en km (approximatif)
            const distance = utils.calculateDistance(coordinates[i], coordinates[i + 1]);
            const distanceKm = distance * 111.32; // Conversion approximative en km
            
            // Ajouter aux réseaux spécifiques en fonction des attributs
            if (isCar) {
                // Temps en secondes = (distance en km) / (vitesse en km/h) * 3600
                const timeCost = (distanceKm / maxSpeed) * 3600;
                utils.addToNetwork(roadNet, start, end, timeCost);
            }
            
            if (isBike) {
                // Vitesse moyenne vélo: 15 km/h avec ajustements
                let bikeSpeed = 15; 
                
                // Ajustements selon la surface
                if (properties.surface) {
                    if (['unpaved', 'compacted', 'gravel', 'fine_gravel', 'pebblestone', 'ground', 'dirt', 'earth', 'grass'].includes(properties.surface)) {
                        bikeSpeed = 10;
                    } else if (['cobblestone', 'unhewn_cobblestone', 'sett'].includes(properties.surface)) {
                        bikeSpeed = 8;
                    } else if (['sand', 'mud'].includes(properties.surface)) {
                        bikeSpeed = 5;
                    }
                }
                
                const timeCost = (distanceKm / bikeSpeed) * 3600;
                utils.addToNetwork(bikeNet, start, end, timeCost);
            }
            
            if (isFoot) {
                // Vitesse moyenne à pied: 5 km/h
                let footSpeed = 5;
                
                // Ajustements selon la surface et la pente
                if (properties.surface && ['cobblestone', 'unhewn_cobblestone', 'sett', 'mud', 'sand'].includes(properties.surface)) {
                    footSpeed = 4;
                }
                
                const timeCost = (distanceKm / footSpeed) * 3600;
                utils.addToNetwork(footNet, start, end, timeCost);
            }
        }
    }
}

// Construction du réseau de transport en commun
function buildTransitNetworkFromFeature(feature, transitNet) {
    if (feature.geometry) {
        if (feature.geometry.type === 'Point') {
            // C'est un arrêt de transport
            const coord = utils.coordToString(feature.geometry.coordinates);
            if (!transitNet[coord]) {
                transitNet[coord] = {};
            }
            // Stocker les informations sur la station
            if (!transitNet.stations) transitNet.stations = {};
            transitNet.stations[coord] = {
                coordinates: feature.geometry.coordinates,
                properties: feature.properties || {}
            };
        } else if (feature.geometry.type === 'LineString') {
            // C'est une ligne de transport
            const coordinates = feature.geometry.coordinates;
            // Extraire l'ID ou le nom de la ligne si disponible
            const lineInfo = feature.properties ? 
                (feature.properties.ref || feature.properties.name || 'Line') : 'Line';
            
            for (let i = 0; i < coordinates.length - 1; i++) {
                const start = utils.coordToString(coordinates[i]);
                const end = utils.coordToString(coordinates[i + 1]);
                
                // Calculer la distance et le coût en temps (vitesse moyenne: 20 km/h avec arrêts)
                const distance = utils.calculateDistance(coordinates[i], coordinates[i + 1]);
                // Vitesse moyenne transport: 20 km/h avec arrêts
                const timeCost = distance * 180; // Facteur temps pour le transport
                
                utils.addToNetwork(transitNet, start, end, timeCost);
                
                // Stocker l'info de la ligne pour pouvoir l'afficher
                if (!transitNet.lines) transitNet.lines = {};
                if (!transitNet.lines[`${start}-${end}`]) {
                    transitNet.lines[`${start}-${end}`] = [];
                }
                if (!transitNet.lines[`${end}-${start}`]) {
                    transitNet.lines[`${end}-${start}`] = [];
                }
                
                transitNet.lines[`${start}-${end}`].push(lineInfo);
                transitNet.lines[`${end}-${start}`].push(lineInfo);
            }
        }
    }
}

// Fonction pour construire un réseau multimodal combinant marche et transport en commun
function buildMultimodalNetwork(optimize = false) {
    try {
        console.time('build-multimodal');
    } catch (e) {
        // Timer peut déjà exister, ignorer l'erreur
    }
    
    // Réinitialiser le réseau multimodal
    Object.keys(multimodalNetwork).forEach(key => {
        delete multimodalNetwork[key];
    });
    
    // Copier les métadonnées du réseau de transport
    if (transitNetwork.stations) multimodalNetwork.stations = transitNetwork.stations;
    if (transitNetwork.lines) multimodalNetwork.lines = transitNetwork.lines;
    
    // Optimisation 1: Copier par référence directe les réseaux de base
    // Pour le réseau piéton et transport en commun
    for (const nodeStr in footpathNetwork) {
        multimodalNetwork[nodeStr] = Object.assign({}, footpathNetwork[nodeStr]);
    }
    
    for (const nodeStr in transitNetwork) {
        if (nodeStr === 'stations' || nodeStr === 'lines') continue;
        
        if (!multimodalNetwork[nodeStr]) {
            multimodalNetwork[nodeStr] = {};
        }
        Object.assign(multimodalNetwork[nodeStr], transitNetwork[nodeStr]);
    }
    
    // Optimisation 2: Réduire encore plus le nombre de connexions stations-piétons
    const MAX_WALKING_DISTANCE = optimize ? 0.001 : 0.002; // Réduire à 100m pour l'optimisation agressive
    const MAX_CONNECTIONS_PER_STATION = optimize ? 2 : 3;  // Limiter à 2 connexions par station
    let connectionsCount = 0;
    
    if (transitNetwork.stations) {
        console.log(`Optimisation des connexions pour ${Object.keys(transitNetwork.stations).length} stations`);
        
        // Optimisation 3: Traiter les stations par lots pour éviter le blocage de l'interface
        const stationKeys = Object.keys(transitNetwork.stations);
        const BATCH_SIZE = 100;
        
        for (let i = 0; i < stationKeys.length; i += BATCH_SIZE) {
            const batchStations = stationKeys.slice(i, i + BATCH_SIZE);
            
            for (const stationStr of batchStations) {
                const stationCoords = utils.stringToCoord(stationStr);
                
                // Optimisation 4: Utiliser une grille spatiale pour limiter la recherche
                const nearbyFootNodes = [];
                const searchBounds = {
                    minLng: stationCoords[0] - MAX_WALKING_DISTANCE,
                    maxLng: stationCoords[0] + MAX_WALKING_DISTANCE,
                    minLat: stationCoords[1] - MAX_WALKING_DISTANCE,
                    maxLat: stationCoords[1] + MAX_WALKING_DISTANCE
                };
                
                // Uniquement rechercher dans les nœuds qui sont dans cette grille approximative
                for (const footNodeStr in footpathNetwork) {
                    const footNodeCoords = utils.stringToCoord(footNodeStr);
                    
                    if (footNodeCoords[0] >= searchBounds.minLng && 
                        footNodeCoords[0] <= searchBounds.maxLng && 
                        footNodeCoords[1] >= searchBounds.minLat && 
                        footNodeCoords[1] <= searchBounds.maxLat) {
                        
                        const distance = utils.calculateDistance(stationCoords, footNodeCoords);
                        if (distance < MAX_WALKING_DISTANCE) {
                            nearbyFootNodes.push({
                                node: footNodeStr,
                                distance: distance
                            });
                        }
                    }
                }
                
                // Trier par distance et garder uniquement les 3 plus proches
                nearbyFootNodes.sort((a, b) => a.distance - b.distance);
                const closestNodes = nearbyFootNodes.slice(0, MAX_CONNECTIONS_PER_STATION);
                
                // Ajouter les connexions
                for (const {node: footNodeStr, distance} of closestNodes) {
                    // Distance en km approximative et temps de marche estimé
                    const distanceKm = distance * 111.32;
                    const walkingTimeCost = (distanceKm / 5) * 3600;
                    
                    if (!multimodalNetwork[stationStr]) multimodalNetwork[stationStr] = {};
                    if (!multimodalNetwork[footNodeStr]) multimodalNetwork[footNodeStr] = {};
                    
                    multimodalNetwork[stationStr][footNodeStr] = walkingTimeCost;
                    multimodalNetwork[footNodeStr][stationStr] = walkingTimeCost;
                    
                    connectionsCount++;
                }
            }
        }
    }
    
    console.log(`${connectionsCount} connexions piéton-station optimisées`);
    try {
        console.timeEnd('build-multimodal');
    } catch (e) {
        // Ignorer l'erreur si le timer n'existe pas
    }
    console.log(`Réseau multimodal construit: ${Object.keys(multimodalNetwork).length} nœuds`);
}

// Fonction pour simplifier un réseau pour le calcul de chemin
function simplifyNetwork(network, startNode, endNode) {
    if (!startNode || !endNode) return network;
    
    // Convertir les coordonnées des nœuds de départ et d'arrivées
    const startCoords = utils.stringToCoord(startNode);
    const endCoords = utils.stringToCoord(endNode);
    
    // Calculer la boîte englobante avec une marge
    const minLng = Math.min(startCoords[0], endCoords[0]) - 0.05;
    const maxLng = Math.max(startCoords[0], endCoords[0]) + 0.05;
    const minLat = Math.min(startCoords[1], endCoords[1]) - 0.05;
    const maxLat = Math.max(startCoords[1], endCoords[1]) + 0.05;
    
    // Créer un réseau simplifié ne contenant que les nœuds dans la boîte
    const simplifiedNetwork = {};
    
    // Ajouter les nœuds qui sont dans la boîte englobante
    for (const nodeStr in network) {
        if (nodeStr === 'stations' || nodeStr === 'lines') {
            simplifiedNetwork[nodeStr] = network[nodeStr];
            continue;
        }
        
        const coords = utils.stringToCoord(nodeStr);
        if (coords[0] >= minLng && coords[0] <= maxLng && 
            coords[1] >= minLat && coords[1] <= maxLat) {
            
            simplifiedNetwork[nodeStr] = {};
            
            // N'ajouter que les voisins qui sont aussi dans la boîte ou sont proches
            for (const neighborStr in network[nodeStr]) {
                if (neighborStr === 'stations' || neighborStr === 'lines') continue;
                
                const neighborCoords = utils.stringToCoord(neighborStr);
                
                // Vérifier si le voisin est dans la boîte ou proche des points de départ/arrivée
                if ((neighborCoords[0] >= minLng && neighborCoords[0] <= maxLng && 
                     neighborCoords[1] >= minLat && neighborCoords[1] <= maxLat) || 
                     utils.calculateDistance(neighborCoords, startCoords) < 0.01 || 
                     utils.calculateDistance(neighborCoords, endCoords) < 0.01) {
                    simplifiedNetwork[nodeStr][neighborStr] = network[nodeStr][neighborStr];
                }
            }
        }
    }
    
    // S'assurer que les nœuds de départ et d'arrivée sont inclus
    if (!simplifiedNetwork[startNode]) simplifiedNetwork[startNode] = network[startNode] || {};
    if (!simplifiedNetwork[endNode]) simplifiedNetwork[endNode] = network[endNode] || {};
    
    console.log(`Réseau simplifié: ${Object.keys(simplifiedNetwork).length} nœuds (original: ${Object.keys(network).length})`);
    return simplifiedNetwork;
}

// Trouver le nœud du réseau le plus proche d'un point
function findNearestNode(latLng, network) {
    let minDist = Infinity;
    let nearestNode = null;
    let minRadius = 0.01; // Limite de distance de recherche (environ 1km)
    
    // Parcourir tous les nœuds du réseau
    for (const nodeStr in network) {
        if (nodeStr === 'stations' || nodeStr === 'lines') continue;
        
        const nodeCoord = utils.stringToCoord(nodeStr);
        const distance = utils.calculateDistance([latLng.lng, latLng.lat], nodeCoord);
        
        if (distance < minDist && distance < minRadius) {
            minDist = distance;
            nearestNode = nodeStr;
        }
    }
    
    // Si aucun nœud proche n'est trouvé, essayer de chercher dans un rayon plus large
    if (!nearestNode) {
        for (const nodeStr in network) {
            if (nodeStr === 'stations' || nodeStr === 'lines') continue;
            
            const nodeCoord = utils.stringToCoord(nodeStr);
            const distance = utils.calculateDistance([latLng.lng, latLng.lat], nodeCoord);
            
            if (distance < minDist) {
                minDist = distance;
                nearestNode = nodeStr;
            }
        }
    }
    
    // S'assurer que le nœud trouvé a bien des voisins
    if (nearestNode && Object.keys(network[nearestNode] || {}).length === 0) {
        console.warn(`Nœud sans connections trouvé: ${nearestNode}`);
    }
    
    return nearestNode;
}

// Export des objets et fonctions
window.networkBuilder = {
    roadNetwork,
    transitNetwork,
    bikeNetwork,
    footpathNetwork,
    multimodalNetwork,
    ajoutDataMap,
    buildMultimodalNetwork,
    simplifyNetwork,
    findNearestNode,
    loadNetworkInChunks,
    serializeNetworks,
    deserializeNetworks,
    serializeBasicNetworks,
    serializeTransitNetwork,
    deserializeBasicNetworks,
    deserializeTransitNetwork,
    clearAllCaches
};

/**
 * Construction des réseaux routiers
 */

// Déclaration des réseaux
const roadNetwork = {};
const transitNetwork = {};
const bikeNetwork = {};
const footpathNetwork = {};
const multimodalNetwork = {};

// Chargement des données GeoJSON
function ajoutDataMap(fichier, randomColor, lineRadius = 5, lineWeight = 2) {
    return fetch(fichier)
    .then(response => response.json())
    .then(data => {
        // Vérifier que la carte est initialisée
        const map = window.mapInit.getMap();
        if (!map) {
            console.error("Carte non initialisée lors du chargement des données");
            return data;
        }
        
        const layer = L.geoJSON(data, {
            style: function (feature) {
                let color = randomColor ? utils.getRandomColor() : "black";
                return {
                    color: color,
                    weight: lineWeight 
                };
            },
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: lineRadius
                });
            },
            onEachFeature: function(feature, layer) {
                // Construction du réseau
                if (fichier.includes('grenoble.geojson')) {
                    buildNetworkFromFeature(feature, roadNetwork, bikeNetwork, footpathNetwork);
                } else if (fichier.includes('transport_commun')) {
                    buildTransitNetworkFromFeature(feature, transitNetwork);
                }
            }
        }).addTo(map);
        
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
function buildMultimodalNetwork() {
    console.time('build-multimodal');
    
    // Copier les réseaux de base dans le réseau multimodal
    for (const nodeStr in footpathNetwork) {
        if (!multimodalNetwork[nodeStr]) multimodalNetwork[nodeStr] = {};
        for (const neighborStr in footpathNetwork[nodeStr]) {
            multimodalNetwork[nodeStr][neighborStr] = footpathNetwork[nodeStr][neighborStr];
        }
    }
    
    for (const nodeStr in transitNetwork) {
        if (nodeStr === 'stations' || nodeStr === 'lines') continue; // Ignorer les métadonnées
        
        if (!multimodalNetwork[nodeStr]) multimodalNetwork[nodeStr] = {};
        for (const neighborStr in transitNetwork[nodeStr]) {
            multimodalNetwork[nodeStr][neighborStr] = transitNetwork[nodeStr][neighborStr];
        }
    }
    
    // Créer des connexions entre les stations de transport et les points de marche proches
    // pour permettre les changements de mode
    const MAX_WALKING_DISTANCE = 0.002; // Distance max de marche pour atteindre une station
    
    // Pour chaque station de transport
    if (transitNetwork.stations) {
        for (const stationStr in transitNetwork.stations) {
            const stationCoords = utils.stringToCoord(stationStr);
            
            // Vérifier les points accessibles à pied
            for (const footNodeStr in footpathNetwork) {
                const footNodeCoords = utils.stringToCoord(footNodeStr);
                const distance = utils.calculateDistance(stationCoords, footNodeCoords);
                
                // Si la distance est raisonnable, créer une connexion piéton <-> station
                if (distance < MAX_WALKING_DISTANCE) {
                    // Temps de marche estimé (5 km/h)
                    const walkingTimeCost = distance * 720;
                    
                    // Ajouter une connexion bidirectionnelle avec un coût de temps de marche
                    if (!multimodalNetwork[stationStr]) multimodalNetwork[stationStr] = {};
                    if (!multimodalNetwork[footNodeStr]) multimodalNetwork[footNodeStr] = {};
                    
                    multimodalNetwork[stationStr][footNodeStr] = walkingTimeCost;
                    multimodalNetwork[footNodeStr][stationStr] = walkingTimeCost;
                }
            }
        }
    }
    
    console.timeEnd('build-multimodal');
    console.log(`Réseau multimodal construit: ${Object.keys(multimodalNetwork).length} nœuds`);
}

// Fonction pour simplifier un réseau pour le calcul de chemin
function simplifyNetwork(network, startNode, endNode) {
    if (!startNode || !endNode) return network;
    
    // Convertir les coordonnées des nœuds de départ et d'arrivée
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
    
    // Parcourir tous les nœuds du réseau
    for (const nodeStr in network) {
        if (nodeStr === 'stations' || nodeStr === 'lines') continue;
        
        const nodeCoord = utils.stringToCoord(nodeStr);
        const distance = utils.calculateDistance([latLng.lng, latLng.lat], nodeCoord);
        
        if (distance < minDist) {
            minDist = distance;
            nearestNode = nodeStr;
        }
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
    findNearestNode
};

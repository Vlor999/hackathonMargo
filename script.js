// Initialisation de la carte
var map = L.map('map').setView([45.188529, 5.724524], 13);

// Ajout de la couche de tuiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Chargement et ajout des données GeoJSON
var roadNetwork = {};
var transitNetwork = {};
var bikeNetwork = {};
var footpathNetwork = {};

function ajoutDataMap(fichier, randomColor, lineRadius = 5, lineWeight = 2) {
    return fetch(fichier)
    .then(response => response.json())
    .then(data => {
        var layer = L.geoJSON(data, {
            style: function (feature) {
                let color = randomColor ? getRandomColor() : "black";
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

function buildNetworkFromFeature(feature, roadNet, bikeNet, footNet) {
    if (feature.geometry && feature.geometry.type === 'LineString') {
        const coordinates = feature.geometry.coordinates;
        const properties = feature.properties;
        
        // Déterminer si cette voie est accessible par différents modes
        const isCar = !properties.highway || (
            properties.highway !== 'cycleway' && 
            properties.highway !== 'footway' && 
            properties.highway !== 'path' && 
            !properties.motorcar || properties.motorcar !== 'no'
        );
        
        const isBike = properties.bicycle !== 'no' || 
                      properties.highway === 'cycleway' || 
                      properties.cycleway;
        
        const isFoot = properties.foot !== 'no' || 
                      properties.highway === 'footway' || 
                      properties.highway === 'path';
        
        // Créer les connexions dans les réseaux appropriés
        for (let i = 0; i < coordinates.length - 1; i++) {
            const start = coordToString(coordinates[i]);
            const end = coordToString(coordinates[i + 1]);
            
            // Calculer la distance
            const distance = calculateDistance(coordinates[i], coordinates[i + 1]);
            
            if (isCar) addToNetwork(roadNet, start, end, distance);
            if (isBike) addToNetwork(bikeNet, start, end, distance * 1.2); // Vélo légèrement pénalisé
            if (isFoot) addToNetwork(footNet, start, end, distance * 3);   // À pied plus lent
        }
    }
}

function buildTransitNetworkFromFeature(feature, transitNet) {
    if (feature.geometry) {
        if (feature.geometry.type === 'Point') {
            // C'est un arrêt de transport
            const coord = coordToString(feature.geometry.coordinates);
            if (!transitNet[coord]) {
                transitNet[coord] = {};
            }
        } else if (feature.geometry.type === 'LineString') {
            // C'est une ligne de transport
            const coordinates = feature.geometry.coordinates;
            for (let i = 0; i < coordinates.length - 1; i++) {
                const start = coordToString(coordinates[i]);
                const end = coordToString(coordinates[i + 1]);
                
                const distance = calculateDistance(coordinates[i], coordinates[i + 1]) * 0.8; // Transit légèrement favorisé
                addToNetwork(transitNet, start, end, distance);
            }
        }
    }
}

function coordToString(coord) {
    return `${coord[0]},${coord[1]}`;
}

function stringToCoord(str) {
    const parts = str.split(',');
    return [parseFloat(parts[0]), parseFloat(parts[1])];
}

function addToNetwork(network, start, end, distance) {
    if (!network[start]) network[start] = {};
    if (!network[end]) network[end] = {};
    
    network[start][end] = distance;
    network[end][start] = distance; // Graph non-dirigé
}

function calculateDistance(coord1, coord2) {
    // Calcul simple de la distance euclidienne, à améliorer avec Haversine pour plus de précision
    const dx = coord1[0] - coord2[0];
    const dy = coord1[1] - coord2[1];
    return Math.sqrt(dx * dx + dy * dy);
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Chargement des données
Promise.all([
    ajoutDataMap('dataSetHackathon/data_transport_commun_grenoble.geojson', true, 0, 2),
    ajoutDataMap('dataSetHackathon/grenoble.geojson', false, 0, 0.5)
]).then(() => {
    console.log('Données chargées avec succès');
});

var markers = {
    depart: null,
    arriver: null
};

// Déclaration de la variable line
var line = null;

function addGeocoder(buttonId, markerColor, markerKey) {
    var geocoder = L.Control.geocoder({
        defaultMarkGeocode: false
    }).on('markgeocode', function(e) {
        var latlng = e.geocode.center;

        if (markers[markerKey]) {
            map.removeLayer(markers[markerKey]);
        }

        markers[markerKey] = L.marker(latlng, { icon: L.icon({
            iconUrl: `http://maps.google.com/mapfiles/ms/icons/${markerColor}-dot.png`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        })}).addTo(map)
            .bindPopup(`<b>${e.geocode.name}</b>`)
            .openPopup();

        console.log(`${markerKey.charAt(0).toUpperCase() + markerKey.slice(1)} : \n\t- Adresse: ${e.geocode.name}\n\t- Latitude: ${latlng.lat}\n\t- Longitude: ${latlng.lng}`);
        
    }).addTo(map);
}

addGeocoder('depart', 'blue', 'depart');
addGeocoder('arriver', 'red', 'arriver');

function findNearestNode(latLng, network) {
    let minDist = Infinity;
    let nearestNode = null;
    
    // Parcourir tous les nœuds du réseau
    for (const nodeStr in network) {
        const nodeCoord = stringToCoord(nodeStr);
        const distance = calculateDistance([latLng.lng, latLng.lat], nodeCoord);
        
        if (distance < minDist) {
            minDist = distance;
            nearestNode = nodeStr;
        }
    }
    
    return nearestNode;
}

function simplifyNetwork(network, startNode, endNode) {
    if (!startNode || !endNode) return network;
    
    // Convertir les coordonnées des nœuds de départ et d'arrivée
    const startCoords = stringToCoord(startNode);
    const endCoords = stringToCoord(endNode);
    
    // Calculer la boîte englobante avec une marge
    const minLng = Math.min(startCoords[0], endCoords[0]) - 0.05;
    const maxLng = Math.max(startCoords[0], endCoords[0]) + 0.05;
    const minLat = Math.min(startCoords[1], endCoords[1]) - 0.05;
    const maxLat = Math.max(startCoords[1], endCoords[1]) + 0.05;
    
    // Créer un réseau simplifié ne contenant que les nœuds dans la boîte
    const simplifiedNetwork = {};
    
    // Ajouter les nœuds qui sont dans la boîte englobante
    for (const nodeStr in network) {
        const coords = stringToCoord(nodeStr);
        if (coords[0] >= minLng && coords[0] <= maxLng && 
            coords[1] >= minLat && coords[1] <= maxLat) {
            
            simplifiedNetwork[nodeStr] = {};
            
            // N'ajouter que les voisins qui sont aussi dans la boîte ou sont proches
            for (const neighborStr in network[nodeStr]) {
                const neighborCoords = stringToCoord(neighborStr);
                
                // Vérifier si le voisin est dans la boîte ou proche des points de départ/arrivée
                if ((neighborCoords[0] >= minLng && neighborCoords[0] <= maxLng && 
                     neighborCoords[1] >= minLat && neighborCoords[1] <= maxLat) || 
                     calculateDistance(neighborCoords, startCoords) < 0.01 || 
                     calculateDistance(neighborCoords, endCoords) < 0.01) {
                    
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

function findPath() {
    if (!markers.depart || !markers.arriver) {
        alert('Veuillez enregistrer les deux adresses avant de tracer la ligne.');
        return;
    }
    
    // Afficher un message de chargement
    const loadingElement = document.createElement('div');
    loadingElement.id = 'loading-indicator';
    loadingElement.innerHTML = '<div class="spinner"></div><span>Calcul du chemin en cours...</span>';
    document.body.appendChild(loadingElement);
    
    // Récupérer le mode de transport sélectionné
    const transportMode = document.getElementById('transportMode').value;
    document.getElementById('drawLineButton').disabled = true;
    
    // Sélectionner le réseau approprié
    let network;
    let pathColor;
    
    switch (transportMode) {
        case 'car':
            network = roadNetwork;
            pathColor = 'blue';
            break;
        case 'bike':
            network = bikeNetwork;
            pathColor = 'green';
            break;
        case 'foot':
            network = footpathNetwork;
            pathColor = 'orange';
            break;
        case 'transit':
            network = transitNetwork;
            pathColor = 'red';
            break;
        default:
            network = roadNetwork;
            pathColor = 'blue';
    }
    
    // Trouver les nœuds du réseau les plus proches des marqueurs
    const startNode = findNearestNode(markers.depart.getLatLng(), network);
    const endNode = findNearestNode(markers.arriver.getLatLng(), network);
    
    if (!startNode || !endNode) {
        document.body.removeChild(loadingElement);
        document.getElementById('drawLineButton').disabled = false;
        alert(`Impossible de trouver un chemin en ${transportMode}. Essayez un autre mode de transport.`);
        return;
    }
    
    // Simplifier le réseau pour accélérer les calculs
    const simplifiedNetwork = simplifyNetwork(network, startNode, endNode);
    
    // Utiliser setTimeout pour permettre à l'UI de se mettre à jour avant le calcul intensif
    setTimeout(() => {
        // Exécuter l'algorithme Dijkstra
        const result = dijkstra(simplifiedNetwork, startNode, endNode);
        
        document.body.removeChild(loadingElement);
        document.getElementById('drawLineButton').disabled = false;
        
        if (!result.path.length) {
            alert(`Aucun chemin trouvé en ${transportMode} entre ces deux points.`);
            return;
        }
        
        // Tracer le chemin
        drawPathOnMap(result.path, pathColor);
        
        // Afficher les informations du trajet
        console.log(`Distance totale: ${result.distance}`);
        console.log(`Nœuds vérifiés: ${result.nodesChecked}`);
    }, 50);
}

function drawPathOnMap(path, color) {
    // Supprimer l'ancien chemin s'il existe
    if (line && map.hasLayer(line)) {
        map.removeLayer(line);
    }
    
    // Convertir les coordonnées string en objets LatLng
    const latlngs = path.map(coordStr => {
        const [lng, lat] = stringToCoord(coordStr);
        return L.latLng(lat, lng);
    });
    
    // Créer et afficher la ligne
    line = L.polyline(latlngs, { 
        color: color, 
        weight: 5,
        opacity: 0.7,
        dashArray: '10, 10',
        lineCap: 'round'
    }).addTo(map);
    
    // Zoom sur le chemin
    map.fitBounds(line.getBounds(), { padding: [50, 50] });
}

document.getElementById('drawLineButton').addEventListener('click', findPath);

document.getElementById('toggleThemeButton').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    this.textContent = document.body.classList.contains('dark-mode') ? 'Mode Clair' : 'Mode Sombre';
});


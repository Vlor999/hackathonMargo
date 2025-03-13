/**
 * Fonctions de recherche d'itinéraires et d'affichage des chemins
 */

// Fonction principale pour rechercher un chemin
function findPath() {
    if (!mapInit.markers.depart || !mapInit.markers.arriver) {
        alert('Veuillez enregistrer les deux adresses avant de tracer la ligne.');
        return;
    }
    
    // Gérer les résultats précédents
    let resultsElement = document.getElementById('path-results');
    if (resultsElement) {
        resultsElement.style.display = 'none';
    } else {
        resultsElement = document.createElement('div');
        resultsElement.id = 'path-results';
        document.body.appendChild(resultsElement);
    }
    
    // Afficher le chargement
    const loadingElement = document.createElement('div');
    loadingElement.id = 'loading-indicator';
    loadingElement.innerHTML = '<div class="spinner"></div><span>Calcul du chemin en cours...</span>';
    document.body.appendChild(loadingElement);
    
    // Récupérer le mode de transport
    const transportMode = document.getElementById('transportMode').value;
    document.getElementById('drawLineButton').disabled = true;
    
    // Sélectionner le réseau approprié
    let network;
    let pathColor;
    let useMultimodal = false;
    
    switch (transportMode) {
        case 'car':
            network = networkBuilder.roadNetwork;
            pathColor = 'blue';
            break;
        case 'bike':
            network = networkBuilder.bikeNetwork;
            pathColor = 'green';
            break;
        case 'foot':
            network = networkBuilder.footpathNetwork;
            pathColor = 'orange';
            break;
        case 'transit':
            network = networkBuilder.multimodalNetwork;
            pathColor = 'red';
            useMultimodal = true;
            break;
        default:
            network = networkBuilder.roadNetwork;
            pathColor = 'blue';
    }
    
    // Vérifier que le réseau n'est pas vide
    if (Object.keys(network).length === 0) {
        try {
            if (document.body.contains(loadingElement)) {
                document.body.removeChild(loadingElement);
            }
        } catch (err) { console.error(err); }
        document.getElementById('drawLineButton').disabled = false;
        alert(`Le réseau pour ${utils.getTransportModeName(transportMode)} n'est pas disponible.`);
        return;
    }
    
    // Points de départ et d'arrivée
    let startNetwork = network;
    let endNetwork = network;
    
    // Pour le transport multimodal, commencer et finir à pied
    if (useMultimodal) {
        startNetwork = networkBuilder.footpathNetwork;
        endNetwork = networkBuilder.footpathNetwork;
    }
    
    const startNode = networkBuilder.findNearestNode(
        mapInit.markers.depart.getLatLng(), startNetwork);
    const endNode = networkBuilder.findNearestNode(
        mapInit.markers.arriver.getLatLng(), endNetwork);
    
    if (!startNode || !endNode) {
        try {
            if (document.body.contains(loadingElement)) {
                document.body.removeChild(loadingElement);
            }
        } catch (err) { console.error(err); }
        document.getElementById('drawLineButton').disabled = false;
        alert(`Impossible de trouver un chemin en ${utils.getTransportModeName(transportMode)}.`);
        return;
    }
    
    // Simplifier le réseau
    const simplifiedNetwork = useMultimodal ? 
        networkBuilder.simplifyNetwork(network, startNode, endNode) : 
        networkBuilder.simplifyNetwork(network, startNode, endNode);
    
    // Calcul différé pour actualiser l'UI
    setTimeout(() => {
        try {
            // Algorithme A*
            const result = dijkstra(simplifiedNetwork, startNode, endNode);
            
            try {
                if (document.body.contains(loadingElement)) {
                    document.body.removeChild(loadingElement);
                }
            } catch (err) { console.error(err); }
            
            document.getElementById('drawLineButton').disabled = false;
            
            if (!result.path || !result.path.length) {
                alert(`Aucun chemin trouvé en ${utils.getTransportModeName(transportMode)}.`);
                return;
            }
            
            // Afficher le chemin et les informations
            drawMultimodalPathOnMap(result.path, transportMode);
            const travelTime = utils.calculateTravelTime(result.distance, transportMode);
            displayPathInfo(transportMode, travelTime, result);
            
        } catch (error) {
            console.error("Erreur:", error);
            try {
                if (document.body.contains(loadingElement)) {
                    document.body.removeChild(loadingElement);
                }
            } catch (err) { console.error(err); }
            document.getElementById('drawLineButton').disabled = false;
            alert("Une erreur s'est produite lors du calcul du chemin.");
        }
    }, 50);
}

// Analyse des segments de transport en commun
function analyzeMultimodalPath(path) {
    if (!path || path.length < 2 || !networkBuilder.transitNetwork.lines) return [];
    
    const segments = [];
    let currentMode = "foot";
    let currentSegment = { mode: "foot", points: [path[0]], start: path[0] };
    let currentLine = null;
    
    for (let i = 1; i < path.length; i++) {
        const fromNode = path[i-1];
        const toNode = path[i];
        const segmentKey = `${fromNode}-${toNode}`;
        
        // Vérifier si ce segment est un transport en commun
        const transitNetwork = networkBuilder.transitNetwork;
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

// Affichage des informations du trajet
function displayPathInfo(transportMode, travelTime, result) {
    let resultsElement = document.getElementById('path-results');
    
    if (!resultsElement) {
        resultsElement = document.createElement('div');
        resultsElement.id = 'path-results';
        document.body.appendChild(resultsElement);
    }
    
    if (transportMode === 'transit') {
        // Analyser les segments
        const segments = analyzeMultimodalPath(result.path);
        
        // Créer HTML pour les segments
        let segmentsHtml = '';
        if (segments.length > 0) {
            segmentsHtml = '<ul class="itinerary-segments">';
            segments.forEach((segment) => {
                if (segment.mode === "transit") {
                    segmentsHtml += `<li class="segment-transit">
                        <span class="segment-icon transit-icon">🚊</span>
                        <span class="segment-info">Prendre la ligne <strong>${segment.line}</strong></span>
                    </li>`;
                } else {
                    // Distance de marche approximative
                    const points = segment.points.map(utils.stringToCoord);
                    let walkDistance = 0;
                    for (let i = 1; i < points.length; i++) {
                        walkDistance += utils.calculateDistance(points[i-1], points[i]);
                    }
                    const walkDistanceKm = (walkDistance * 111.32).toFixed(2);
                    
                    segmentsHtml += `<li class="segment-foot">
                        <span class="segment-icon foot-icon">🚶</span>
                        <span class="segment-info">Marcher pendant environ <strong>${walkDistanceKm} km</strong></span>
                    </li>`;
                }
            });
            segmentsHtml += '</ul>';
        }
        
        // Afficher résultat
        resultsElement.innerHTML = `
            <h3>Itinéraire Transport en Commun</h3>
            <p><strong>Temps estimé:</strong> ${travelTime}</p>
            <div class="itinerary-details">
                ${segmentsHtml}
            </div>
            <button class="close-btn" onclick="document.getElementById('path-results').style.display='none'">×</button>
        `;
    } else {
        // Affichage simple pour les autres modes
        resultsElement.innerHTML = `
            <h3>Itinéraire ${utils.getTransportModeName(transportMode)}</h3>
            <p><strong>Temps estimé:</strong> ${travelTime}</p>
            <button class="close-btn" onclick="document.getElementById('path-results').style.display='none'">×</button>
        `;
    }
    
    resultsElement.style.display = 'block';
}

// Fonction pour tracer le chemin sur la carte
function drawMultimodalPathOnMap(path, transportMode) {
    const map = window.mapInit.getMap();
    if (!map) {
        console.error("Carte non initialisée");
        return;
    }
    
    let line = window.mapInit.line;
    
    // Nettoyer les chemins précédents
    if (line) {
        if (Array.isArray(line)) {
            line.forEach(l => {
                if (map.hasLayer(l)) map.removeLayer(l);
            });
        } else if (map.hasLayer(line)) {
            map.removeLayer(line);
        }
    }
    
    if (!path || path.length < 2) {
        console.error("Chemin invalide");
        return;
    }
    
    line = []; // Tableau pour les segments
    
    try {
        if (transportMode === 'transit') {
            // Chemins multimodaux
            const segments = analyzeMultimodalPath(path);
            
            if (!segments || segments.length === 0) {
                console.error("Pas de segments analysés");
                return;
            }
            
            // Groupe pour les bounds
            const featureGroup = L.featureGroup();
            
            // Tracer chaque segment
            segments.forEach(segment => {
                if (!segment.points || segment.points.length < 2) return;
                
                const points = segment.points.map(coordStr => {
                    const [lng, lat] = utils.stringToCoord(coordStr);
                    return L.latLng(lat, lng);
                });
                
                if (points.length < 2) return;
                
                // Style selon le mode
                let segmentColor, segmentStyle;
                if (segment.mode === "transit") {
                    segmentColor = 'red';
                    segmentStyle = { color: segmentColor, weight: 5, opacity: 0.8 };
                } else {
                    segmentColor = 'blue';
                    segmentStyle = { 
                        color: segmentColor, 
                        weight: 4, 
                        opacity: 0.6,
                        dashArray: '5, 10' 
                    };
                }
                
                // Ajouter ligne
                const segmentLine = L.polyline(points, segmentStyle).addTo(map);
                featureGroup.addLayer(segmentLine);
                line.push(segmentLine);
                
                // Marqueurs pour les stations
                if (segment.mode === "transit") {
                    const [startLng, startLat] = utils.stringToCoord(segment.start);
                    const stationMarker = L.circleMarker([startLat, startLng], {
                        radius: 6,
                        fillColor: 'yellow',
                        color: 'black',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).addTo(map);
                    
                    stationMarker.bindPopup(`<b>Station</b><br>Ligne ${segment.line}`);
                    featureGroup.addLayer(stationMarker);
                    line.push(stationMarker);
                }
            });
            
            // Ajouter le groupe et ajuster le zoom
            featureGroup.addTo(map);
            
            if (featureGroup.getBounds().isValid()) {
                map.fitBounds(featureGroup.getBounds(), { padding: [50, 50] });
            } else {
                const group = L.featureGroup([mapInit.markers.depart, mapInit.markers.arriver]);
                map.fitBounds(group.getBounds(), { padding: [50, 50] });
            }
            
            // Mettre à jour la référence
            mapInit.line = line;
            
        } else {
            // Pour les autres modes, tracé simple
            const latlngs = path.map(coordStr => {
                const [lng, lat] = utils.stringToCoord(coordStr);
                return L.latLng(lat, lng);
            });
            
            if (latlngs.length < 2) {
                console.error("Pas assez de points");
                return;
            }
            
            let pathColor;
            switch(transportMode) {
                case 'car': pathColor = 'blue'; break;
                case 'bike': pathColor = 'green'; break;
                case 'foot': pathColor = 'orange'; break;
                default: pathColor = 'black';
            }
            
            // Créer ligne
            const newLine = L.polyline(latlngs, { 
                color: pathColor, 
                weight: 5,
                opacity: 0.7
            }).addTo(map);
            
            // Zoom sur le chemin
            if (newLine.getBounds().isValid()) {
                map.fitBounds(newLine.getBounds(), { padding: [50, 50] });
            } else {
                const group = L.featureGroup([mapInit.markers.depart, mapInit.markers.arriver]);
                map.fitBounds(group.getBounds(), { padding: [50, 50] });
            }
            
            // Mettre à jour la référence
            mapInit.line = newLine;
        }
    } catch (error) {
        console.error("Erreur lors du tracé:", error);
    }
}

// Export des fonctions
window.routing = {
    findPath,
    analyzeMultimodalPath,
    displayPathInfo,
    drawMultimodalPathOnMap
};

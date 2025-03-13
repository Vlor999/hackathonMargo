/**
 * Fonctions pour l'affichage des chemins sur la carte
 */

// Fonction pour tracer le chemin sur la carte
function drawMultimodalPathOnMap(path, transportMode) {
    const map = window.mapInit.getMap();
    if (!map) {
        console.error("Carte non initialisée");
        return;
    }
    
    // Nettoyer les chemins précédents
    let line = window.mapInit.line;
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
    
    line = []; // Tableau pour tous types de segments
    const featureGroup = L.featureGroup();
    
    try {
        // Pour tous les modes, traiter les segments de manière standard
        let segments;
        
        if (transportMode === 'transit') {
            // Analyser les segments de transport en commun
            segments = window.routing.analyzeMultimodalPath(path);
        } else if (transportMode === 'car') {
            // Pour la voiture, détecter les tronçons à pied
            segments = analyzeCarPath(path);
        } else {
            // Pour les autres modes, créer un segment simple
            segments = [{
                mode: transportMode,
                points: path,
                start: path[0],
                end: path[path.length - 1]
            }];
        }
        
        if (!segments || segments.length === 0) {
            console.error("Pas de segments analysés");
            return;
        }
        
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
            switch (segment.mode) {
                case "transit":
                    segmentColor = 'red';
                    segmentStyle = { color: segmentColor, weight: 5, opacity: 0.8 };
                    break;
                case "foot":
                    segmentColor = 'blue';
                    segmentStyle = { 
                        color: segmentColor, 
                        weight: 4, 
                        opacity: 0.6,
                        dashArray: '5, 10' 
                    };
                    break;
                case "car":
                    segmentColor = 'blue';
                    segmentStyle = { color: segmentColor, weight: 5, opacity: 0.8 };
                    break;
                case "bike":
                    segmentColor = 'green';
                    segmentStyle = { color: segmentColor, weight: 5, opacity: 0.8 };
                    break;
                default:
                    segmentColor = 'purple';
                    segmentStyle = { color: segmentColor, weight: 5, opacity: 0.7 };
            }
            
            // Ajouter ligne
            const segmentLine = L.polyline(points, segmentStyle).addTo(map);
            featureGroup.addLayer(segmentLine);
            line.push(segmentLine);
            
            // Ajouter des marqueurs pour les points importants (stations de transport, intersections majeures)
            if (segment.mode === "transit" && segment.line) {
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
        window.mapInit.line = line;
        
    } catch (error) {
        console.error("Erreur lors du tracé:", error);
    }
}

// Fonction pour analyser un itinéraire voiture avec des segments à pied
function analyzeCarPath(path) {
    if (!path || path.length < 2) {
        console.error("Chemin invalide ou vide");
        return [];
    }
    
    const segments = [];
    let currentMode = "car"; // Par défaut on commence en voiture
    let currentSegment = { mode: "car", points: [path[0]], start: path[0] };
    
    // On vérifie si le premier point est dans le réseau routier
    const firstNode = path[0];
    if (!window.networkBuilder.roadNetwork[firstNode]) {
        currentMode = "foot";
        currentSegment.mode = "foot";
    }
    
    for (let i = 1; i < path.length; i++) {
        const fromNode = path[i-1];
        const toNode = path[i];
        
        // Vérifier si ce segment est accessible en voiture
        const isRoad = window.networkBuilder.roadNetwork[fromNode] && 
                       window.networkBuilder.roadNetwork[toNode] &&
                       window.networkBuilder.roadNetwork[fromNode][toNode] !== undefined;
        
        if ((currentMode === "car" && !isRoad) || (currentMode === "foot" && isRoad)) {
            // Changement de mode, terminer segment actuel
            currentSegment.end = fromNode;
            segments.push(currentSegment);
            
            // Commencer nouveau segment avec le mode opposé
            currentMode = currentMode === "car" ? "foot" : "car";
            currentSegment = { 
                mode: currentMode, 
                points: [fromNode], 
                start: fromNode 
            };
        }
        
        // Ajouter le point au segment actuel
        currentSegment.points.push(toNode);
    }
    
    // Ajouter le dernier segment
    currentSegment.end = path[path.length - 1];
    segments.push(currentSegment);
    
    return segments;
}

// Export des fonctions
window.pathDisplay = {
    drawMultimodalPathOnMap,
    analyzeCarPath
};

/**
 * Fonctions pour l'affichage des instructions de navigation
 */

// Fonction pour convertir le texte de direction en icône
function getDirectionIcon(instruction) {
    if (instruction.includes("droit")) {
        return "⬆️"; // Tout droit
    } else if (instruction.includes("légèrement") && instruction.includes("droite")) {
        return "↗️"; // Légèrement à droite
    } else if (instruction.includes("droite") && !instruction.includes("demi-tour")) {
        return "➡️"; // À droite
    } else if (instruction.includes("légèrement") && instruction.includes("gauche")) {
        return "↖️"; // Légèrement à gauche
    } else if (instruction.includes("gauche") && !instruction.includes("demi-tour")) {
        return "⬅️"; // À gauche
    } else if (instruction.includes("demi-tour")) {
        return "🔄"; // Demi-tour
    } else if (instruction.includes("Arrivée")) {
        return "🏁"; // Arrivée
    } else if (instruction.includes("Départ")) {
        return "🚩"; // Départ
    }
    return "ℹ️"; // Autre instruction
}

// Affichage des informations du trajet avec des icônes de direction
function displayPathInfo(transportMode, travelTime, result) {
    let resultsElement = document.getElementById('path-results');
    
    if (!resultsElement) {
        resultsElement = document.createElement('div');
        resultsElement.id = 'path-results';
        document.body.appendChild(resultsElement);
    }
    
    if (transportMode === 'transit') {
        // Analyser les segments
        const segments = window.routing.analyzeMultimodalPath(result.path);
        
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
    } else if (transportMode === 'car') {
        // Pour la voiture, détecter les segments à pied
        const segments = window.pathDisplay.analyzeCarPath(result.path);
        const directions = generateDirections(result.path);
        
        let directionsHtml = '<ul class="walking-directions">';
        
        if (segments.length > 1) {
            // Affichage des segments hybrides pour la voiture
            let totalFootDistance = 0;
            segments.forEach((segment) => {
                if (segment.mode === "foot") {
                    const points = segment.points.map(utils.stringToCoord);
                    let walkDistance = 0;
                    for (let i = 1; i < points.length; i++) {
                        walkDistance += utils.calculateDistance(points[i-1], points[i]);
                    }
                    totalFootDistance += walkDistance * 111.32;
                }
            });
            
            // Afficher un avertissement si marche à pied nécessaire
            if (totalFootDistance > 0.01) {  // Plus de 10m à pied
                directionsHtml += `
                    <li class="direction-step warning">
                        <div class="step-number">⚠️</div>
                        <div class="step-content">
                            <div class="step-instruction">Ce trajet inclut environ <strong>${totalFootDistance.toFixed(2)} km</strong> à pied</div>
                        </div>
                    </li>
                `;
            }
        }
        
        // Ajouter les instructions régulières
        directions.forEach((direction, index) => {
            // Déterminer l'icône à utiliser selon la direction
            let directionIcon = getDirectionIcon(direction.instruction);
            
            // Ajouter l'attribut data-cache-key pour permettre les mises à jour dynamiques
            const cacheKeyAttr = direction.cacheKey ? `data-cache-key="${direction.cacheKey}"` : '';
            
            directionsHtml += `
                <li class="direction-step ${index === directions.length - 1 ? 'destination' : ''}" ${cacheKeyAttr}>
                    <div class="step-number">${directionIcon}</div>
                    <div class="step-content">
                        <div class="step-instruction">${direction.roadName ? 
                            `${direction.instruction} sur ${direction.roadName}` : 
                            direction.instruction}</div>
                        <div class="step-distance">
                            ${index < directions.length - 1 ? 
                                `Continuer sur <strong>${direction.distance} km</strong>` : 
                                `Distance totale: <strong>${direction.totalDistance} km</strong>`
                            }
                        </div>
                    </div>
                </li>
            `;
        });
        directionsHtml += '</ul>';
        
        resultsElement.innerHTML = `
            <h3>Itinéraire ${utils.getTransportModeName(transportMode)}</h3>
            <p><strong>Temps estimé:</strong> ${travelTime}</p>
            <div class="directions-container">
                ${directionsHtml}
            </div>
            <button class="close-btn" onclick="document.getElementById('path-results').style.display='none'">×</button>
        `;
    } else {
        // Pour vélo et piéton - utiliser les mêmes instructions améliorées
        const directions = generateDirections(result.path);
        
        let directionsHtml = '<ul class="walking-directions">';
        directions.forEach((direction, index) => {
            // Déterminer l'icône à utiliser selon la direction
            let directionIcon = getDirectionIcon(direction.instruction);
            
            // Ajouter l'attribut data-cache-key pour permettre les mises à jour dynamiques
            const cacheKeyAttr = direction.cacheKey ? `data-cache-key="${direction.cacheKey}"` : '';
            
            directionsHtml += `
                <li class="direction-step ${index === directions.length - 1 ? 'destination' : ''}" ${cacheKeyAttr}>
                    <div class="step-number">${directionIcon}</div>
                    <div class="step-content">
                        <div class="step-instruction">${direction.roadName ? 
                            `${direction.instruction} sur ${direction.roadName}` : 
                            direction.instruction}</div>
                        <div class="step-distance">
                            ${index < directions.length - 1 ? 
                                `Continuer sur <strong>${direction.distance} km</strong>` : 
                                `Distance totale: <strong>${direction.totalDistance} km</strong>`
                            }
                        </div>
                    </div>
                </li>
            `;
        });
        directionsHtml += '</ul>';
        
        resultsElement.innerHTML = `
            <h3>Itinéraire ${utils.getTransportModeName(transportMode)}</h3>
            <p><strong>Temps estimé:</strong> ${travelTime}</p>
            <div class="directions-container">
                ${directionsHtml}
            </div>
            <button class="close-btn" onclick="document.getElementById('path-results').style.display='none'">×</button>
        `;
    }
    
    resultsElement.style.display = 'block';
}

// Version améliorée de generateWalkingDirections pour tous les modes de transport
function generateDirections(path) {
    if (!path || path.length < 3) return [];
    
    const directions = [];
    let totalDistance = 0;
    
    // Transforme les points en coordonnées réelles
    const points = path.map(p => utils.stringToCoord(p));
    
    // Augmenter ce seuil pour ne détecter que des changements significatifs
    const SIGNIFICANT_ANGLE_THRESHOLD = 45; 
    
    // Premier point - instruction de départ
    directions.push({
        point: points[0],
        instruction: "Départ",
        distance: "0.00",
        totalDistance: "0.00"
    });
    
    let currentDirection = "Continuer tout droit";
    let currentSegmentStartIndex = 0;
    let currentSegmentDistance = 0;
    let currentRoad = null; // Pour suivre la route courante
    
    // Pour chaque segment, déterminer la direction
    for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i-1];
        const curr = points[i];
        const next = points[i+1];
        
        // Calculer les angles
        const incomingAngle = Math.atan2(curr[1] - prev[1], curr[0] - prev[0]) * 180 / Math.PI;
        const outgoingAngle = Math.atan2(next[1] - curr[1], next[0] - curr[0]) * 180 / Math.PI;
        
        // Calculer la différence d'angle (tournant)
        let angleDiff = outgoingAngle - incomingAngle;
        // Normaliser entre -180 et 180
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;
        
        // Calculer la distance du segment
        const segmentDistance = utils.calculateDistance(prev, curr) * 111.32; // en km
        totalDistance += segmentDistance;
        currentSegmentDistance += segmentDistance;
        
        // Déterminer la direction
        let newDirection = '';
        let isSignificantTurn = false;
        
        // Déterminer si c'est un virage significatif
        if (Math.abs(angleDiff) < SIGNIFICANT_ANGLE_THRESHOLD) {
            newDirection = "Continuer tout droit";
        } else {
            isSignificantTurn = true;
            
            if (angleDiff >= SIGNIFICANT_ANGLE_THRESHOLD && angleDiff <= 120) {
                newDirection = "Tourner à droite";
            } else if (angleDiff > 120) {
                newDirection = "Faire demi-tour à droite";
            } else if (angleDiff <= -SIGNIFICANT_ANGLE_THRESHOLD && angleDiff >= -120) {
                newDirection = "Tourner à gauche";
            } else if (angleDiff < -120) {
                newDirection = "Faire demi-tour à gauche";
            }
        }
        
        // Ajouter instruction uniquement lors d'un changement de direction significatif
        if (isSignificantTurn) {
            // Si ce n'est pas le premier changement, ajouter le segment précédent
            if (currentSegmentStartIndex < i-1) {
                // Créer une clé pour ce segment de route
                const segmentKey = `${points[currentSegmentStartIndex][0]},${points[currentSegmentStartIndex][1]}_${points[i-1][0]},${points[i-1][1]}`;
                
                directions.push({
                    point: curr,
                    instruction: currentDirection,
                    roadName: window.geocoding.tryGetRoadName(points[currentSegmentStartIndex], points[i-1]),
                    cacheKey: segmentKey, // Stocker la clé pour mise à jour future
                    distance: currentSegmentDistance.toFixed(2),
                    totalDistance: (totalDistance - segmentDistance).toFixed(2)
                });
            }
            
            // Réinitialiser pour le nouveau segment
            currentDirection = newDirection;
            currentSegmentStartIndex = i;
            currentSegmentDistance = segmentDistance;
            currentRoad = window.geocoding.tryGetRoadName(curr, next);
        }
    }
    
    // Ajouter le dernier segment de direction
    if (currentSegmentStartIndex < points.length - 2) {
        directions.push({
            point: points[points.length - 2],
            instruction: currentDirection,
            roadName: window.geocoding.tryGetRoadName(points[currentSegmentStartIndex], points[points.length - 2]),
            distance: currentSegmentDistance.toFixed(2),
            totalDistance: (totalDistance - utils.calculateDistance(points[points.length-2], points[points.length-1]) * 111.32).toFixed(2)
        });
    }
    
    // Ajouter l'instruction d'arrivée
    directions.push({
        point: points[points.length-1],
        instruction: "Arrivée à destination",
        distance: (utils.calculateDistance(points[points.length-2], points[points.length-1]) * 111.32).toFixed(2),
        totalDistance: totalDistance.toFixed(2)
    });
    
    return directions;
}

// Export des fonctions
window.directionDisplay = {
    displayPathInfo,
    generateDirections,
    getDirectionIcon
};

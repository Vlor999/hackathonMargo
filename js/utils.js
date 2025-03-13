/**
 * Fonctions utilitaires pour l'application de cartographie
 */

// Conversion entre coordonnées et chaînes
function coordToString(coord) {
    return `${coord[0]},${coord[1]}`;
}

function stringToCoord(str) {
    const parts = str.split(',');
    return [parseFloat(parts[0]), parseFloat(parts[1])];
}

// Calcul de distance entre deux points
function calculateDistance(coord1, coord2) {
    // Calcul de la distance euclidienne
    const dx = coord1[0] - coord2[0];
    const dy = coord1[1] - coord2[1];
    return Math.sqrt(dx * dx + dy * dy);
}

// Génération d'une couleur aléatoire en hexadécimal
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Ajout de connexions dans un réseau
function addToNetwork(network, start, end, distance) {
    if (!network[start]) network[start] = {};
    if (!network[end]) network[end] = {};
    
    network[start][end] = distance;
    network[end][start] = distance; // Graph non-dirigé
}

// Conversion du nom du mode de transport
function getTransportModeName(mode) {
    switch(mode) {
        case 'car': return 'Voiture';
        case 'bike': return 'Vélo';
        case 'foot': return 'À pied';
        case 'transit': return 'Transport en commun';
        default: return mode;
    }
}

// Temps de trajet formaté
function calculateTravelTime(distance, transportMode) {
    // Les facteurs de temps sont intégrés dans les poids du graphe
    // Cette valeur est déjà un temps approximatif en secondes
    const timeInSeconds = distance;
    
    // Convertir en minutes
    const timeInMinutes = timeInSeconds / 60;
    
    // Formater le temps
    if (timeInMinutes < 1) {
        return "moins d'une minute";
    } else if (timeInMinutes < 60) {
        return `${Math.round(timeInMinutes)} minutes`;
    } else {
        const hours = Math.floor(timeInMinutes / 60);
        const minutes = Math.round(timeInMinutes % 60);
        return `${hours} h ${minutes} min`;
    }
}

// Export des fonctions
window.utils = {
    coordToString,
    stringToCoord,
    calculateDistance,
    getRandomColor,
    addToNetwork,
    getTransportModeName,
    calculateTravelTime
};

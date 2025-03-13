/**
 * Intégration avec l'API MTAG pour les transports en commun
 */

// Fonction pour récupérer les horaires MTAG depuis l'API
async function fetchMtagSchedules(lineName) {
    try {
        // D'abord essayer de récupérer du localStorage
        const cachedData = localStorage.getItem(`mtag_schedule_${lineName}`);
        if (cachedData) {
            console.log(`Utilisation des données mises en cache pour la ligne ${lineName}`);
            return JSON.parse(cachedData);
        }
        
        // Si pas en cache, utiliser l'API
        console.log(`Récupération des données pour la ligne ${lineName} depuis l'API`);
        const url = `https://data.mobilites-m.fr/api/ficheHoraires/json?route=SEM%3A${lineName}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Mettre en cache pour usage futur
        try {
            localStorage.setItem(`mtag_schedule_${lineName}`, JSON.stringify(data));
        } catch (e) {
            console.warn("Impossible de mettre en cache les données:", e);
        }
        
        return data;
    } catch (error) {
        console.error(`Erreur lors de la récupération des horaires pour la ligne ${lineName}:`, error);
        return null;
    }
}

// Fonction pour charger les données de l'API MTAG et enrichir le réseau de transport
async function loadMtagStationData() {
    try {
        const lines = ['A', 'B', 'C', 'D', 'E']; // Lignes de tram principales
        const busLines = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', '12', '13', '14', '15', '16'];
        
        // Combiner les lignes de tram et de bus
        const allLines = [...lines, ...busLines];
        
        console.log("Chargement des données de l'API MTAG...");
        
        const lineData = {};
        
        // Charger les données de chaque ligne
        for (const line of allLines) {
            try {
                // Utiliser l'API pour récupérer les données en direct
                const data = await fetchMtagSchedules(line);
                if (!data) {
                    console.log(`Pas de données disponibles pour la ligne ${line}`);
                    continue;
                }
                
                lineData[line] = data;
                console.log(`Données de la ligne ${line} chargées`);
                
                // Enrichir le réseau avec ces données
                enrichTransitNetwork(line, data);
            } catch (err) {
                console.log(`Erreur lors du chargement des données de la ligne ${line}:`, err);
            }
        }
        
        console.log("Terminé le chargement des données MTAG");
        return lineData;
    } catch (error) {
        console.error("Erreur lors du chargement des données MTAG:", error);
        return null;
    }
}

// Fonction pour enrichir le réseau de transport avec les données de l'API
function enrichTransitNetwork(lineName, lineData) {
    // Si pas de données ou pas de réseau de transport, sortir
    if (!lineData || !networkBuilder.transitNetwork || !networkBuilder.transitNetwork.stations) return;
    
    // Pour chaque direction de la ligne
    for (const direction in lineData) {
        if (!lineData[direction].arrets || lineData[direction].arrets.length === 0) continue;
        
        const stops = lineData[direction].arrets;
        
        // Pour chaque arrêt, sauf le dernier
        for (let i = 0; i < stops.length - 1; i++) {
            const currentStop = stops[i];
            const nextStop = stops[i + 1];
            
            // Coordonnées de l'arrêt actuel et suivant
            const currentCoord = [currentStop.lon, currentStop.lat];
            const nextCoord = [nextStop.lon, nextStop.lat];
            
            // Convertir en chaînes pour le réseau
            const currentCoordStr = utils.coordToString(currentCoord);
            const nextCoordStr = utils.coordToString(nextCoord);
            
            // Distance entre les arrêts
            const distance = utils.calculateDistance(currentCoord, nextCoord);
            // Temps entre les arrêts (vitesse moyenne 20 km/h)
            const timeCost = distance * 180;
            
            // Ajouter au réseau de transport
            const transitNetwork = networkBuilder.transitNetwork;
            if (!transitNetwork[currentCoordStr]) transitNetwork[currentCoordStr] = {};
            if (!transitNetwork[nextCoordStr]) transitNetwork[nextCoordStr] = {};
            
            transitNetwork[currentCoordStr][nextCoordStr] = timeCost;
            transitNetwork[nextCoordStr][currentCoordStr] = timeCost;
            
            // Stocker les informations de la ligne
            if (!transitNetwork.lines) transitNetwork.lines = {};
            
            const segmentKey1 = `${currentCoordStr}-${nextCoordStr}`;
            const segmentKey2 = `${nextCoordStr}-${currentCoordStr}`;
            
            if (!transitNetwork.lines[segmentKey1]) transitNetwork.lines[segmentKey1] = [];
            if (!transitNetwork.lines[segmentKey2]) transitNetwork.lines[segmentKey2] = [];
            
            if (!transitNetwork.lines[segmentKey1].includes(lineName)) {
                transitNetwork.lines[segmentKey1].push(lineName);
            }
            if (!transitNetwork.lines[segmentKey2].includes(lineName)) {
                transitNetwork.lines[segmentKey2].push(lineName);
            }
            
            // Stocker les informations de la station
            if (!transitNetwork.stations) transitNetwork.stations = {};
            
            transitNetwork.stations[currentCoordStr] = {
                coordinates: currentCoord,
                properties: {
                    name: currentStop.name,
                    lineName: lineName,
                    stopId: currentStop.stopId,
                    city: currentStop.city
                }
            };
            
            transitNetwork.stations[nextCoordStr] = {
                coordinates: nextCoord,
                properties: {
                    name: nextStop.name,
                    lineName: lineName,
                    stopId: nextStop.stopId,
                    city: nextStop.city
                }
            };
        }
    }
}

// Export des fonctions
window.transportApi = {
    fetchMtagSchedules,
    loadMtagStationData,
    enrichTransitNetwork
};

/**
 * Intégration avec l'API MTAG pour les transports en commun
 */

// Fonction pour récupérer les horaires MTAG depuis l'API
async function fetchMtagSchedules(lineName) {
    // Désactivé pour améliorer les performances
    console.log(`Récupération des horaires MTAG désactivée pour la ligne ${lineName}`);
    return null;
}

// Fonction pour charger les données de l'API MTAG et enrichir le réseau de transport
async function loadMtagStationData() {
    // Fonction désactivée pour améliorer les performances
    console.log("Chargement des données MTAG désactivé pour améliorer les performances");
    return null;
}

// Fonction pour enrichir le réseau de transport avec les données de l'API
function enrichTransitNetwork(lineName, lineData) {
    // Désactivé - nous utilisons directement les données GeoJSON sans enrichissement MTAG
    return;
}

// Export des fonctions
window.transportApi = {
    fetchMtagSchedules,
    loadMtagStationData,
    enrichTransitNetwork
};

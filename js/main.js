/**
 * Script principal qui coordonne l'ensemble de l'application
 */

// Fonction d'initialisation principale
function initApplication() {
    console.log("Initialisation de l'application...");
    
    // S'assurer que la carte est initialisée
    if (!window.mapInit || !window.mapInit.getMap()) {
        console.error("La carte n'est pas initialisée, attente...");
        setTimeout(initApplication, 100);
        return;
    }
    
    // Initialiser les contrôles UI
    if (window.uiControls && typeof window.uiControls.initUIControls === 'function') {
        window.uiControls.initUIControls();
    }
    
    // Chargement des données
    Promise.all([
        window.networkBuilder.ajoutDataMap('dataSetHackathon/data_transport_commun_grenoble.geojson', true, 0, 2),
        window.networkBuilder.ajoutDataMap('dataSetHackathon/grenoble.geojson', false, 0, 0.5)
    ]).then(() => {
        console.log('Données GeoJSON chargées avec succès');
        
        // Construire le réseau multimodal
        window.networkBuilder.buildMultimodalNetwork();
        
        // Charger les données MTAG
        if (window.transportApi && typeof window.transportApi.loadMtagStationData === 'function') {
            window.transportApi.loadMtagStationData()
                .then(() => {
                    console.log('Réseau de transport enrichi avec les données MTAG');
                    // Reconstruire le réseau multimodal avec les nouvelles données
                    window.networkBuilder.buildMultimodalNetwork();
                })
                .catch(err => {
                    console.log("Pas de données MTAG disponibles:", err);
                });
        }
    });
    
    console.log("Application initialisée");
}

// Déclencher l'initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Attendre un court moment pour s'assurer que tous les modules sont chargés
    setTimeout(initApplication, 100);
});

// Export de l'objet
window.main = {
    initApplication
};

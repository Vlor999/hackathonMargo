/**
 * Gestion des contrôles de l'interface utilisateur
 */

// Initialisation des écouteurs d'événements pour les boutons
function initUIControls() {
    // Bouton de recherche d'itinéraire
    document.getElementById('drawLineButton').addEventListener('click', function() {
        routing.findPath();
    });
    
    // Bouton pour changer de thème
    document.getElementById('toggleThemeButton').addEventListener('click', function() {
        mapInit.toggleTheme();
    });
    
    console.log("Contrôles UI initialisés");
}

// Export des fonctions
window.uiControls = {
    initUIControls
};

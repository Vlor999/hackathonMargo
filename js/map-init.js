/**
 * Initialisation de la carte et fonctionnalités de base
 */

// Variables globales pour stocker la carte, les marqueurs et lignes
let map;
const markers = {
    depart: null,
    arriver: null
};
let line = null;

// Initialiser immédiatement si le DOM est déjà chargé
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initMap();
} else {
    // Sinon attendre le chargement du DOM
    document.addEventListener('DOMContentLoaded', initMap);
}

// Fonction d'initialisation de la carte
function initMap() {
    try {
        // Vérifier que l'élément map existe
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error("Élément map non trouvé dans le DOM");
            return;
        }
        
        // Initialisation de la carte Leaflet centrée sur Grenoble
        map = L.map('map').setView([45.188529, 5.724524], 13);

        // Ajout de la couche de tuiles OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Ajouter les géocodeurs pour le départ et l'arrivée
        addGeocoder('depart', 'blue', 'depart');
        addGeocoder('arriver', 'red', 'arriver');
        
        console.log("Carte initialisée avec succès");
    } catch (error) {
        console.error("Erreur lors de l'initialisation de la carte:", error);
    }
}

// Fonction pour ajouter un géocodeur à la carte
function addGeocoder(buttonId, markerColor, markerKey) {
    if (!map) return;
    
    const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false
    }).on('markgeocode', function(e) {
        const latlng = e.geocode.center;

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

// Fonction pour basculer entre les modes clair et sombre
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const button = document.getElementById('toggleThemeButton');
    if (button) {
        button.textContent = document.body.classList.contains('dark-mode') ? 'Mode Clair' : 'Mode Sombre';
    }
}

// Export des objets et fonctions
window.mapInit = {
    getMap: function() { return map; },
    markers: markers,
    line: line,
    toggleTheme: toggleTheme,
    initMap: initMap
};

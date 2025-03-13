var map = L.map('map').setView([45.188529, 5.724524], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

var geocoder = L.Control.Geocoder.nominatim(); // Utilisation de Nominatim (gratuit)
var startMarker, endMarker;

function getCoordinates(address, callback) {
    geocoder.geocode(address, function(results) {
        if (results.length > 0) {
            var latlng = results[0].center;
            callback(latlng);
        } else {
            alert("Lieu non trouvé : " + address);
        }
    });
}

function calculateRoute() {
    var startLocation = document.getElementById("start-location").value;
    var endLocation = document.getElementById("end-location").value;

    console.log("Départ : " + startLocation);
    console.log("Arrivée : " + endLocation);

    if (!startLocation || !endLocation) {
        alert("Veuillez entrer un départ et une arrivée !");
        return;
    }

    getCoordinates(startLocation, function(startCoords) {
        getCoordinates(endLocation, function(endCoords) {
            // Ajout des marqueurs sur la carte
            if (startMarker) map.removeLayer(startMarker);
            if (endMarker) map.removeLayer(endMarker);

            startMarker = L.marker(startCoords).addTo(map).bindPopup("Départ : " + startLocation).openPopup();
            endMarker = L.marker(endCoords).addTo(map).bindPopup("Arrivée : " + endLocation).openPopup();

            // Tracer une ligne entre les deux points
            L.polyline([startCoords, endCoords], { color: 'blue' }).addTo(map);

            // Calcul de la distance (à vol d'oiseau)
            var distance = map.distance(startCoords, endCoords) / 1000; // en km
            alert("Distance approximative : " + distance.toFixed(2) + " km");
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const themeButton = document.getElementById('theme-toggle-button');
    const themes = ['light', 'dark'];
    let currentThemeIndex = 0;

    // Check if the user has a preferred theme saved
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        currentThemeIndex = themes.indexOf(savedTheme);
    }

    themeButton.addEventListener('click', function() {
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;
        const selectedTheme = themes[currentThemeIndex];
        document.documentElement.setAttribute('data-theme', selectedTheme);
        localStorage.setItem('theme', selectedTheme);

        // Update the button text to reflect the current theme
        themeButton.textContent = `Theme: ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)}`;
    });

    // Initial button text
    themeButton.textContent = `Theme: ${themes[currentThemeIndex].charAt(0).toUpperCase() + themes[currentThemeIndex].slice(1)}`;
});


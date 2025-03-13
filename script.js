// Initialisation de la carte
var map = L.map('map').setView([45.188529, 5.724524], 13);

// Ajout de la couche de tuiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Ajout du contrôle de géocodage

function addGeocoder(buttonId, markerColor) {
    var geocoder = L.Control.geocoder({
        defaultMarkGeocode: false
    })
    .on('markgeocode', function(e) {
        var latlng = e.geocode.center;
        console.log('Latitude: ' + latlng.lat + ', Longitude: ' + latlng.lng);
        
        L.marker(latlng, { icon: L.icon({
            iconUrl: `http://maps.google.com/mapfiles/ms/icons/${markerColor}-dot.png`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        })}).addTo(map)
            .bindPopup(`<b>${e.geocode.name}</b><br>Latitude: ${latlng.lat}<br>Longitude: ${latlng.lng}`)
            .openPopup();
    })
    .addTo(map);
}

addGeocoder('depart', 'blue');
addGeocoder('arriver', 'red');

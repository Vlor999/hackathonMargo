// Initialisation de la carte
var map = L.map('map').setView([45.188529, 5.724524], 13);

// Ajout de la couche de tuiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Ajout du contrôle de géocodage
var geocoder = L.Control.geocoder({
    defaultMarkGeocode: false
})
.on('markgeocode', function(e) {
    var bbox = e.geocode.bbox;
    var poly = L.polygon([
        bbox.getSouthEast(),
        bbox.getNorthEast(),
        bbox.getNorthWest(),
        bbox.getSouthWest()
    ]).addTo(map);
    map.fitBounds(poly.getBounds());

    var latlng = e.geocode.center;
    console.log('Latitude: ' + latlng.lat + ', Longitude: ' + latlng.lng);
})
.addTo(map);




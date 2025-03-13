// Initialisation de la carte
var map = L.map('map').setView([45.188529, 5.724524], 13);

// Ajout de la couche de tuiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Chargement et ajout des données GeoJSON

function ajoutDataMap(fichier, randomColor, lineRadius = 5, lineWeight = 2) {
    fetch(fichier)
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: function (feature) {
                let color = randomColor ? getRandomColor() : "black";
                return {
                    color: color,
                    weight: lineWeight  // Ajout de l'épaisseur de la ligne
                };
            },
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: lineRadius
                });
            }
        }).addTo(map);
    })
    .catch(error => console.error('Erreur lors du chargement du fichier GeoJSON:', error));
}


function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

ajoutDataMap('dataSetHackathon/data_transport_commun_grenoble.geojson', true, 0, 2);
ajoutDataMap('dataSetHackathon/grenoble.geojson', false, 0, 0.5);

var markers = {
    depart: null,
    arriver: null
};

// Déclaration de la variable line
var line = null;

function addGeocoder(buttonId, markerColor, markerKey) {
    var geocoder = L.Control.geocoder({
        defaultMarkGeocode: false
    }).on('markgeocode', function(e) {
        var latlng = e.geocode.center;

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

addGeocoder('depart', 'blue', 'depart');
addGeocoder('arriver', 'red', 'arriver');

function drawLine() {
    if (markers.depart && markers.arriver) {
        var latlngs = [
            markers.depart.getLatLng(),
            markers.arriver.getLatLng()
        ];

        if (line && map.hasLayer(line)) {
            map.removeLayer(line);
        }

        line = L.polyline(latlngs, { color: 'black' }).addTo(map);
    }
}

document.getElementById('drawLineButton').addEventListener('click', function() {
    if (markers.depart && markers.arriver) {
        drawLine();
        
    } else {
        alert('Veuillez enregistrer les deux adresses avant de tracer la ligne.');
    }
});

document.getElementById('toggleThemeButton').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    this.textContent = document.body.classList.contains('dark-mode') ? 'Mode Clair' : 'Mode Sombre';
});


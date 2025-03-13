import requests
import json

class Station:
    def __init__(self, stopId: str, stopName: str, name: str, city: str, latitude: float, longitude: float, parentStation: dict):
        self.stopId = stopId
        self.stopName = stopName
        self.name = name
        self.city = city
        self.latitude = latitude
        self.longitude = longitude
        self.parentStation = parentStation

    def __str__(self):
        parent_info = f"Parent Station: {self.parentStation['name']} ({self.parentStation['lat']}, {self.parentStation['lon']})" if self.parentStation else "No parent station"
        return f"{self.stopName} ({self.name}, {self.city}) -> ({self.longitude}, {self.latitude})\n\t{parent_info}"

def giveJsonFile(name):
    url = "https://data.mobilites-m.fr/api/ficheHoraires/json?route=SEM%3A" + name
    response = requests.get(url)
    return response.json()

def getStopNamePos(jsonFile):
    stations = []
    for direction in jsonFile.values():
        for arret in direction['arrets']:
            stopId = arret['stopId']
            stopName = arret['stopName']
            name = arret['name']
            city = arret['city']
            latitude = arret['lat']
            longitude = arret['lon']
            parentStation = arret.get('parentStation', None)
            stations.append(Station(stopId, stopName, name, city, latitude, longitude, parentStation))
    return stations



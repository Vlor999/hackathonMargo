/**
 * Script pour récupérer les horaires des lignes de transport MTAG
 * et les stocker en local pour les utiliser dans l'application.
 * Ce script peut être exécuté indépendamment pour créer des fichiers locaux.
 */

// Fonction pour récupérer les horaires d'une ligne depuis l'API MTAG
async function fetchMtagSchedule(lineName) {
    try {
        const url = `https://data.mobilites-m.fr/api/ficheHoraires/json?route=SEM%3A${lineName}`;
        console.log(`Récupération des données pour la ligne ${lineName} depuis ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Erreur lors de la récupération des horaires pour la ligne ${lineName}:`, error);
        return null;
    }
}

// Fonction pour récupérer les horaires de toutes les lignes et les stocker
async function fetchAllMtagSchedules() {
    // Lignes de transport à récupérer
    const tramLines = ['A', 'B', 'C', 'D', 'E'];
    const busLines = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', '12', '13', '14', '15', '16'];
    const allLines = [...tramLines, ...busLines];
    
    const allSchedules = {};
    
    console.log("Récupération des horaires de transport...");
    
    for (const line of allLines) {
        try {
            const data = await fetchMtagSchedule(line);
            if (data) {
                allSchedules[line] = data;
                console.log(`Données récupérées pour la ligne ${line}`);
                
                // Dans un environnement Node.js, on pourrait les sauvegarder dans un fichier
                // Pour le navigateur, on peut les stocker dans le localStorage
                try {
                    localStorage.setItem(`mtag_schedule_${line}`, JSON.stringify(data));
                    console.log(`Données de la ligne ${line} sauvegardées dans le localStorage`);
                } catch (storageError) {
                    console.warn(`Impossible de sauvegarder les données dans le localStorage:`, storageError);
                }
            }
        } catch (error) {
            console.error(`Erreur lors du traitement de la ligne ${line}:`, error);
        }
    }
    
    return allSchedules;
}

// Fonction pour charger les horaires depuis le localStorage si disponibles
function loadLocalMtagSchedules() {
    const tramLines = ['A', 'B', 'C', 'D', 'E'];
    const busLines = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', '12', '13', '14', '15', '16'];
    const allLines = [...tramLines, ...busLines];
    
    const schedules = {};
    let foundLocalData = false;
    
    for (const line of allLines) {
        const storedData = localStorage.getItem(`mtag_schedule_${line}`);
        if (storedData) {
            try {
                schedules[line] = JSON.parse(storedData);
                foundLocalData = true;
                console.log(`Données de la ligne ${line} chargées depuis le localStorage`);
            } catch (error) {
                console.error(`Erreur lors du parsing des données pour la ligne ${line}:`, error);
            }
        }
    }
    
    return foundLocalData ? schedules : null;
}

// Exécuter la récupération des données quand le script est chargé
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Initialisation du chargement des données MTAG...");
    
    // D'abord essayer de charger depuis le localStorage
    const localSchedules = loadLocalMtagSchedules();
    
    if (localSchedules) {
        console.log("Données MTAG chargées depuis le stockage local");
    } else {
        console.log("Aucune donnée locale trouvée, récupération depuis l'API...");
        try {
            const newSchedules = await fetchAllMtagSchedules();
            console.log("Données MTAG récupérées avec succès");
        } catch (error) {
            console.error("Erreur lors de la récupération des données MTAG:", error);
        }
    }
});

// Exposer les fonctions pour les utiliser dans d'autres scripts
window.mtagUtils = {
    fetchSchedule: fetchMtagSchedule,
    fetchAllSchedules: fetchAllMtagSchedules,
    loadLocalSchedules: loadLocalMtagSchedules
};

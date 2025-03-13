/**
 * Implémentation de l'algorithme A* pour trouver le chemin le plus court
 * dans un graphe pondéré avec une heuristique pour accélérer la recherche.
 */
function dijkstra(graph, start, end) {
    // Vérifications de sécurité améliorées
    if (!graph || typeof graph !== 'object' || Object.keys(graph).length === 0) {
        console.error("Le graphe est vide ou invalide");
        return { path: [], distance: Infinity, nodesChecked: 0 };
    }
    
    // S'assurer que start et end sont des chaînes valides
    if (typeof start !== 'string' || typeof end !== 'string') {
        console.error("Les nœuds de départ ou d'arrivée ne sont pas des chaînes valides");
        return { path: [], distance: Infinity, nodesChecked: 0 };
    }
    
    if (!graph[start] || !graph[end]) {
        console.error(`Nœuds de départ (${start}) ou d'arrivée (${end}) non trouvés dans le graphe`);
        return { path: [], distance: Infinity, nodesChecked: 0 };
    }

    // Initialisation des structures de données
    const distances = {};
    const previous = {};
    const visited = new Set();
    const queue = new BinaryHeap();
    const path = [];
    
    try {
        // Convertir les coordonnées pour calculer l'heuristique
        const endCoordParts = end.split(',');
        if (endCoordParts.length !== 2) {
            throw new Error(`Format de coordonnées invalide: ${end}`);
        }
        const endCoords = endCoordParts.map(parseFloat);
        if (endCoords.some(isNaN)) {
            throw new Error(`Coordonnées invalides: ${end}`);
        }
        
        // Initialiser pour le nœud de départ uniquement
        distances[start] = 0;
        queue.insert(start, 0);
        
        // Variables pour le suivi de progression
        let totalChecked = 0;
        const MAX_NODES = 1000000; // Limite augmentée pour les grands graphes
        
        console.time('pathfinding');
        
        while (!queue.isEmpty() && totalChecked < MAX_NODES) {
            totalChecked++;
            
            const current = queue.extractMin();
            if (!current) continue; // Protection contre les valeurs null
            
            const currentNode = current.value;
            
            // Ignorer les nœuds spéciaux
            if (currentNode === 'stations' || currentNode === 'lines') continue;
            
            if (visited.has(currentNode) || !graph[currentNode]) continue;
            
            visited.add(currentNode);
            
            // Si nous avons atteint la destination
            if (currentNode === end) {
                let curr = end;
                while (curr) {
                    path.unshift(curr);
                    curr = previous[curr];
                }
                console.timeEnd('pathfinding');
                return {
                    path: path,
                    distance: distances[end] || 0,
                    nodesChecked: totalChecked
                };
            }
            
            // Parcourir tous les voisins
            for (let neighbor in graph[currentNode]) {
                // Ignorer les métadonnées
                if (neighbor === 'stations' || neighbor === 'lines') continue;
                
                // Ignorer les voisins invalides ou si la valeur est invalide
                if (!graph[currentNode][neighbor] || typeof graph[currentNode][neighbor] !== 'number') continue;
                
                // Ne pas revisiter les nœuds déjà traités
                if (visited.has(neighbor)) continue;
                
                // Calculer la nouvelle distance
                const distance = distances[currentNode] + graph[currentNode][neighbor];
                
                // Si première visite ou chemin plus court trouvé
                if (distances[neighbor] === undefined || distance < distances[neighbor]) {
                    distances[neighbor] = distance;
                    previous[neighbor] = currentNode;
                    
                    // Calculer l'heuristique (distance à vol d'oiseau)
                    try {
                        const neighborCoordParts = neighbor.split(',');
                        if (neighborCoordParts.length !== 2) continue;
                        
                        const neighborCoords = neighborCoordParts.map(parseFloat);
                        if (neighborCoords.some(isNaN)) continue;
                        
                        const heuristic = calculateHeuristicDistance(neighborCoords, endCoords) * 0.9;
                        
                        // Priorité = distance réelle + heuristique (A*)
                        queue.insert(neighbor, distance + heuristic);
                    } catch (error) {
                        // En cas d'erreur dans le calcul de l'heuristique, utiliser simplement la distance
                        queue.insert(neighbor, distance);
                    }
                }
            }
            
            // Afficher une progression toutes les 5000 nœuds
            if (totalChecked % 5000 === 0) {
                console.log(`Progression: ${totalChecked} nœuds traités`);
            }
        }
        
        console.timeEnd('pathfinding');
        console.log(`Recherche terminée après avoir vérifié ${totalChecked} nœuds`);
        
    } catch (error) {
        console.error("Erreur dans l'algorithme A*:", error);
    }
    
    // Si on arrive ici, aucun chemin n'a été trouvé
    return {
        path: [],
        distance: Infinity,
        nodesChecked: 0
    };
}

/**
 * Calcule une distance heuristique (approximative) entre deux points
 */
function calculateHeuristicDistance(point1, point2) {
    const dx = point1[0] - point2[0];
    const dy = point1[1] - point2[1];
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Implémentation efficace d'un tas binaire (Binary Heap) pour la file de priorité
 */
class BinaryHeap {
    constructor() {
        this.heap = [];
    }
    
    insert(value, priority) {
        this.heap.push({value, priority});
        this.bubbleUp(this.heap.length - 1);
    }
    
    extractMin() {
        if (this.heap.length === 0) return null;
        
        const min = this.heap[0];
        const end = this.heap.pop();
        
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.sinkDown(0);
        }
        
        return min;
    }
    
    bubbleUp(index) {
        const element = this.heap[index];
        
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parent = this.heap[parentIndex];
            
            if (element.priority >= parent.priority) break;
            
            this.heap[parentIndex] = element;
            this.heap[index] = parent;
            index = parentIndex;
        }
    }
    
    sinkDown(index) {
        const length = this.heap.length;
        const element = this.heap[index];
        
        while (true) {
            const leftChildIndex = 2 * index + 1;
            const rightChildIndex = 2 * index + 2;
            let smallest = index;
            
            if (leftChildIndex < length && this.heap[leftChildIndex].priority < this.heap[smallest].priority) {
                smallest = leftChildIndex;
            }
            
            if (rightChildIndex < length && this.heap[rightChildIndex].priority < this.heap[smallest].priority) {
                smallest = rightChildIndex;
            }
            
            if (smallest === index) break;
            
            this.heap[index] = this.heap[smallest];
            this.heap[smallest] = element;
            index = smallest;
        }
    }
    
    isEmpty() {
        return this.heap.length === 0;
    }
}
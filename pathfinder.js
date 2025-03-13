/**
 * Implémentation de l'algorithme A* pour trouver le chemin le plus court
 * dans un graphe pondéré avec une heuristique pour accélérer la recherche.
 * 
 * @param {Object} graph - Graphe sous forme d'objet avec les noeuds comme clés et les voisins/distances comme valeurs
 * @param {String} start - Noeud de départ
 * @param {String} end - Noeud d'arrivée
 * @returns {Object} - Objet contenant le chemin et la distance totale
 */
function dijkstra(graph, start, end) {
    // Vérifier si les points existent
    if (!graph[start] || !graph[end]) {
        console.error("Nœuds de départ ou d'arrivée non trouvés dans le graphe");
        return { path: [], distance: Infinity };
    }

    // Initialisation des structures de données plus efficaces
    const distances = {};
    const previous = {};
    const visited = new Set();
    const queue = new BinaryHeap();
    const path = [];
    
    // Convertir les coordonnées pour calculer l'heuristique
    const endCoords = end.split(',').map(parseFloat);
    
    // Initialiser pour le nœud de départ uniquement - les autres seront traités à la demande
    distances[start] = 0;
    queue.insert(start, 0);
    
    // Tant qu'il reste des nœuds à visiter
    let totalChecked = 0;
    const MAX_NODES = 10000; // Limite de sécurité pour éviter les calculs infinis
    
    // Indiquer que le calcul commence
    console.time('pathfinding');
    
    while (!queue.isEmpty() && totalChecked < MAX_NODES) {
        totalChecked++;
        
        // Récupérer le nœud avec la plus petite distance estimée
        const current = queue.extractMin();
        const currentNode = current.value;
        
        // Si le nœud est déjà traité ou n'existe pas dans le graphe, passer au suivant
        if (visited.has(currentNode) || !graph[currentNode]) continue;
        
        visited.add(currentNode);
        
        // Si nous avons atteint la destination, reconstruire et retourner le chemin
        if (currentNode === end) {
            let curr = end;
            while (curr) {
                path.unshift(curr);
                curr = previous[curr];
            }
            console.timeEnd('pathfinding');
            return {
                path: path,
                distance: distances[end],
                nodesChecked: totalChecked
            };
        }
        
        // Parcourir tous les voisins du nœud actuel
        for (let neighbor in graph[currentNode]) {
            // Ne pas revisiter les nœuds déjà traités
            if (visited.has(neighbor)) continue;
            
            const distance = distances[currentNode] + graph[currentNode][neighbor];
            
            // Si première visite ou chemin plus court trouvé
            if (distances[neighbor] === undefined || distance < distances[neighbor]) {
                distances[neighbor] = distance;
                previous[neighbor] = currentNode;
                
                // Calculer l'heuristique (distance à vol d'oiseau)
                const neighborCoords = neighbor.split(',').map(parseFloat);
                const heuristic = calculateHeuristicDistance(neighborCoords, endCoords);
                
                // Priorité = distance réelle + heuristique (A*)
                queue.insert(neighbor, distance + heuristic);
            }
        }
    }
    
    console.timeEnd('pathfinding');
    console.log(`Recherche terminée après avoir vérifié ${totalChecked} nœuds`);
    
    // Si on arrive ici, aucun chemin n'a été trouvé
    return {
        path: [],
        distance: Infinity,
        nodesChecked: totalChecked
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

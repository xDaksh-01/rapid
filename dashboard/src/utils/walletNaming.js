/**
 * Wallet Naming Utility
 * Simplifies wallet IDs to human-readable names based on role
 */

/**
 * Create simplified names for wallets based on their suspicion score and network role
 * @param {Array} nodes - Array of node objects with id, suspicionScore, volume
 * @param {Array} links - Array of link objects
 * @returns {Object} - Mapping of original ID to simplified name
 */
export function createWalletNameMapping(nodes, links) {
    if (!nodes || !links) return {};

    const mapping = {};
    
    // Calculate in/out degrees for each node
    const nodeStats = {};
    nodes.forEach(node => {
        nodeStats[node.id] = {
            node,
            inDegree: 0,
            outDegree: 0,
            suspicionScore: node.suspicionScore || 0
        };
    });

    links.forEach(link => {
        const src = link.source?.id || link.source;
        const dst = link.target?.id || link.target;
        if (nodeStats[src]) nodeStats[src].outDegree++;
        if (nodeStats[dst]) nodeStats[dst].inDegree++;
    });

    // Classify nodes
    const illicitSeeds = [];
    const mules = [];
    const cleanDests = [];

    Object.values(nodeStats).forEach(stat => {
        const { node, inDegree, outDegree, suspicionScore } = stat;
        
        // Illicit sources: high suspicion, high out-degree, low in-degree
        if (suspicionScore > 0.7 && outDegree > inDegree) {
            illicitSeeds.push(node);
        }
        // Mules: medium-high suspicion, both in and out connections
        else if (suspicionScore > 0.4 && inDegree > 0 && outDegree > 0) {
            mules.push(node);
        }
        // Clean destinations: low suspicion
        else if (suspicionScore < 0.4) {
            cleanDests.push(node);
        }
        // Default to mules for medium suspicion
        else {
            mules.push(node);
        }
    });

    // Sort by suspicion score (descending)
    illicitSeeds.sort((a, b) => b.suspicionScore - a.suspicionScore);
    mules.sort((a, b) => b.suspicionScore - a.suspicionScore);
    cleanDests.sort((a, b) => a.suspicionScore - b.suspicionScore);

    // Assign names
    illicitSeeds.forEach((node, idx) => {
        mapping[node.id] = `Source_${String(idx + 1).padStart(2, '0')}`;
    });

    // Group mules by "chain" for better naming (Mule_A_1, Mule_A_2, Mule_B_1, etc.)
    const mulesPerGroup = 10;
    mules.forEach((node, idx) => {
        const groupLetter = String.fromCharCode(65 + Math.floor(idx / mulesPerGroup)); // A, B, C...
        const groupNum = (idx % mulesPerGroup) + 1;
        mapping[node.id] = `Mule_${groupLetter}_${groupNum}`;
    });

    cleanDests.forEach((node, idx) => {
        mapping[node.id] = `Dest_Clean_${String(idx + 1).padStart(2, '0')}`;
    });

    return mapping;
}

/**
 * Apply name mapping to nodes (creates displayName property)
 * @param {Array} nodes - Array of node objects
 * @param {Object} nameMapping - Mapping from original ID to display name
 * @returns {Array} - Nodes with displayName property added
 */
export function applyNamesToNodes(nodes, nameMapping) {
    return nodes.map(node => ({
        ...node,
        displayName: nameMapping[node.id] || node.id
    }));
}

/**
 * Get display name for a wallet ID
 * @param {string} walletId - Original wallet ID
 * @param {Object} nameMapping - Mapping from original ID to display name
 * @returns {string} - Display name or original ID
 */
export function getDisplayName(walletId, nameMapping) {
    return nameMapping[walletId] || walletId;
}

/**
 * Prune large trees to keep only most suspicious nodes
 * @param {Array} nodes - Array of node objects
 * @param {Array} links - Array of link objects
 * @param {number} maxNodesPerTree - Maximum nodes to keep per tree
 * @returns {Object} - Pruned {nodes, links}
 */
export function pruneGraphTrees(nodes, links, maxNodesPerTree = 20) {
    if (nodes.length <= maxNodesPerTree) return { nodes, links };

    // Find connected components (trees)
    const visited = new Set();
    const trees = [];

    const getNeighbors = (nodeId) => {
        const neighbors = [];
        links.forEach(link => {
            const src = link.source?.id || link.source;
            const dst = link.target?.id || link.target;
            if (src === nodeId && !visited.has(dst)) neighbors.push(dst);
            if (dst === nodeId && !visited.has(src)) neighbors.push(src);
        });
        return neighbors;
    };

    const dfs = (startId) => {
        const tree = [];
        const stack = [startId];
        
        while (stack.length > 0) {
            const nodeId = stack.pop();
            if (visited.has(nodeId)) continue;
            
            visited.add(nodeId);
            const node = nodes.find(n => n.id === nodeId);
            if (node) tree.push(node);
            
            const neighbors = getNeighbors(nodeId);
            neighbors.forEach(n => {
                if (!visited.has(n)) stack.push(n);
            });
        }
        
        return tree;
    };

    // Extract all trees
    nodes.forEach(node => {
        if (!visited.has(node.id)) {
            const tree = dfs(node.id);
            if (tree.length > 0) trees.push(tree);
        }
    });

    // Sort trees by total suspicion (keep most suspicious trees)
    trees.sort((a, b) => {
        const sumA = a.reduce((sum, n) => sum + (n.suspicionScore || 0), 0);
        const sumB = b.reduce((sum, n) => sum + (n.suspicionScore || 0), 0);
        return sumB - sumA;
    });

    // Keep top 5-6 trees
    const keptTrees = trees.slice(0, 6);

    // Prune each tree if it exceeds maxNodesPerTree
    const prunedNodes = [];
    keptTrees.forEach(tree => {
        if (tree.length <= maxNodesPerTree) {
            prunedNodes.push(...tree);
        } else {
            // Sort by suspicion score and keep top nodes
            const sorted = [...tree].sort((a, b) => 
                (b.suspicionScore || 0) - (a.suspicionScore || 0)
            );
            prunedNodes.push(...sorted.slice(0, maxNodesPerTree));
        }
    });

    // Filter links to only include edges between kept nodes
    const keptNodeIds = new Set(prunedNodes.map(n => n.id));
    const prunedLinks = links.filter(link => {
        const src = link.source?.id || link.source;
        const dst = link.target?.id || link.target;
        return keptNodeIds.has(src) && keptNodeIds.has(dst);
    });

    return {
        nodes: prunedNodes,
        links: prunedLinks
    };
}

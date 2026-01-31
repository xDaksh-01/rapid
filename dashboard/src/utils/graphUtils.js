/**
 * Graph Data Utilities
 * Seed selection and subgraph extraction for investigative view.
 */

/**
 * Select 6 seed wallets: 3 highest suspicion + 3 clean with high volume
 */
export function selectSeedWallets(nodes) {
    if (!nodes || nodes.length === 0) return [];

    // Sort by suspicion (descending) for illicit seeds
    const byScore = [...nodes].sort((a, b) => b.suspicionScore - a.suspicionScore);
    const illicitSeeds = byScore.slice(0, 3);

    // Filter clean nodes (score < 0.3) and sort by volume
    const cleanNodes = nodes.filter(n => n.suspicionScore < 0.3);
    const byVolume = cleanNodes.sort((a, b) => b.volume - a.volume);
    const cleanSeeds = byVolume.slice(0, 3);

    return [...illicitSeeds, ...cleanSeeds];
}

/**
 * Extract N-hop subgraph from seed nodes
 */
export function extractSubgraph(seeds, allNodes, allLinks, hops = 2) {
    const seedIds = new Set(seeds.map(n => n.id));
    const includedIds = new Set(seedIds);
    const includedLinks = new Set();

    // Build adjacency map
    const adjacency = {};
    allLinks.forEach(link => {
        const src = link.source?.id || link.source;
        const dst = link.target?.id || link.target;

        if (!adjacency[src]) adjacency[src] = [];
        if (!adjacency[dst]) adjacency[dst] = [];

        adjacency[src].push({ neighbor: dst, link });
        adjacency[dst].push({ neighbor: src, link });
    });

    // BFS for N hops
    let frontier = [...seedIds];

    for (let hop = 0; hop < hops; hop++) {
        const nextFrontier = [];

        for (const nodeId of frontier) {
            const neighbors = adjacency[nodeId] || [];

            for (const { neighbor, link } of neighbors) {
                if (!includedIds.has(neighbor)) {
                    includedIds.add(neighbor);
                    nextFrontier.push(neighbor);
                }

                // Add link to set (use stringified for uniqueness)
                const linkKey = `${link.source?.id || link.source}-${link.target?.id || link.target}`;
                includedLinks.add(linkKey);
            }
        }

        frontier = nextFrontier;
    }

    // Filter nodes and links
    const nodeMap = {};
    allNodes.forEach(n => nodeMap[n.id] = n);

    const filteredNodes = Array.from(includedIds)
        .map(id => nodeMap[id])
        .filter(Boolean);

    const filteredLinks = allLinks.filter(link => {
        const src = link.source?.id || link.source;
        const dst = link.target?.id || link.target;
        return includedIds.has(src) && includedIds.has(dst);
    });

    return {
        nodes: filteredNodes,
        links: filteredLinks,
        seedIds: Array.from(seedIds)
    };
}

/**
 * Extract subgraph centered on a single node
 */
export function extractNodeNeighborhood(nodeId, allNodes, allLinks, hops = 3) {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return { nodes: [], links: [], seedIds: [] };

    return extractSubgraph([node], allNodes, allLinks, hops);
}

/**
 * Calculate centrality score (degree-based)
 */
export function calculateCentrality(nodeId, links) {
    let inDegree = 0;
    let outDegree = 0;

    links.forEach(link => {
        const src = link.source?.id || link.source;
        const dst = link.target?.id || link.target;

        if (src === nodeId) outDegree++;
        if (dst === nodeId) inDegree++;
    });

    return {
        inDegree,
        outDegree,
        total: inDegree + outDegree,
        score: Math.min(1, (inDegree + outDegree) / 20) // Normalize
    };
}

/**
 * Get transactions for a wallet
 */
export function getWalletTransactions(nodeId, links) {
    const incoming = [];
    const outgoing = [];

    links.forEach(link => {
        const src = link.source?.id || link.source;
        const dst = link.target?.id || link.target;

        if (dst === nodeId) {
            incoming.push({
                from: src,
                to: dst,
                amount: link.amount,
                chainId: link.chainId,
                hopNumber: link.hopNumber
            });
        }

        if (src === nodeId) {
            outgoing.push({
                from: src,
                to: dst,
                amount: link.amount,
                chainId: link.chainId,
                hopNumber: link.hopNumber
            });
        }
    });

    return { incoming, outgoing };
}

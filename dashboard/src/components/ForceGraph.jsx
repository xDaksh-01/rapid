import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { getWalletTransactions } from '../utils/graphUtils';

/**
 * ForceGraph with working hover tooltips for ALL nodes
 */
export default function ForceGraph({
    data,
    threshold = 0,
    onNodeClick,
    onInvestigateNode,
    width,
    height,
    onGraphDataUpdate,
    activeWalletId,
    focusNodeId,
    highlightedChainId
}) {
    const graphRef = useRef();
    const [hoveredNode, setHoveredNode] = useState(null);
    const [pulseFactor, setPulseFactor] = useState(1);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Auto-focus logic
    useEffect(() => {
        if (focusNodeId?.id && graphRef.current && data?.nodes) {
            const node = data.nodes.find(n => n.id === focusNodeId.id);
            if (node && node.x && node.y) {
                graphRef.current.centerAt(node.x, node.y, 800);
                graphRef.current.zoom(4, 900); // Zoom in a bit more and slightly slower for comfort
            }
        }
    }, [focusNodeId, data]);

    // Pulsing animation
    useEffect(() => {
        const interval = setInterval(() => {
            setPulseFactor(prev => (prev + 0.1) > 2 ? 1 : prev + 0.1);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    // Pre-compute transaction data for ALL nodes
    const nodeTransactions = useMemo(() => {
        if (!data?.links || !data?.nodes) return {};

        const txMap = {};
        data.nodes.forEach(node => {
            let inCount = 0, outCount = 0, inAmount = 0, outAmount = 0;

            data.links.forEach(link => {
                const src = link.source?.id || link.source;
                const dst = link.target?.id || link.target;

                if (dst === node.id) {
                    inCount++;
                    inAmount += link.amount || 0;
                }
                if (src === node.id) {
                    outCount++;
                    outAmount += link.amount || 0;
                }
            });

            txMap[node.id] = {
                inCount,
                outCount,
                inAmount,
                outAmount,
                netBalance: inAmount - outAmount
            };
        });
        return txMap;
    }, [data]);

    // Filter to connected nodes only and limit edges to 100
    const graphData = useMemo(() => {
        if (!data?.nodes || !data?.links) return { nodes: [], links: [] };

        let filteredNodes = data.nodes.filter(n => n.suspicionScore >= threshold);
        const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

        let filteredLinks = data.links.filter(
            l => filteredNodeIds.has(l.source?.id || l.source) &&
                filteredNodeIds.has(l.target?.id || l.target)
        );

        // Limit to 100 edges for better visibility
        if (filteredLinks.length > 100) {
            // Sort by amount (highest value transactions first) and take top 100
            filteredLinks.sort((a, b) => (b.amount || 0) - (a.amount || 0));
            filteredLinks = filteredLinks.slice(0, 100);
        }

        // Keep only connected nodes
        const connectedNodeIds = new Set();
        filteredLinks.forEach(link => {
            connectedNodeIds.add(link.source?.id || link.source);
            connectedNodeIds.add(link.target?.id || link.target);
        });

        filteredNodes = filteredNodes.filter(n => connectedNodeIds.has(n.id));

        const result = { nodes: filteredNodes, links: filteredLinks };
        // Notify parent of filtered graph data
        onGraphDataUpdate?.(result);
        return result;
    }, [data, threshold, onGraphDataUpdate]);

    // Custom node rendering
    const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
        const score = node.suspicionScore || 0;
        const volume = node.volume || 1;
        const isHovered = hoveredNode?.id === node.id;
        const isActiveWallet = activeWalletId === node.id;
        const isInHighlightedChain = highlightedChainId && data.links.some(l => l.chainId === highlightedChainId && (l.source.id === node.id || l.target.id === node.id));

        let baseRadius = Math.max(6, Math.min(25, Math.log(volume + 1) * 3));
        if (isHovered || isActiveWallet) baseRadius *= 1.3;
        const radius = baseRadius / globalScale;

        let color = score > 0.7 ? '#ef4444' : score > 0.4 ? '#eab308' : '#22c55e';

        // Glow
        if (isActiveWallet) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#00ffff'; // Bright Cyan for focused wallet
        } else if (isInHighlightedChain) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#a855f7'; // Purple glow
        } else if (score > 0.7) {
            const pulse = 0.5 + Math.sin(pulseFactor * Math.PI) * 0.5;
            ctx.shadowBlur = 15 + pulse * 15;
            ctx.shadowColor = `rgba(239, 68, 68, ${0.6 + pulse * 0.4})`;
        } else if (isHovered) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#3b82f6';
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.strokeStyle = isActiveWallet ? '#00ffff' : (isInHighlightedChain ? '#a855f7' : (isHovered ? '#ffffff' : 'rgba(255,255,255,0.5)'));
        ctx.lineWidth = (isActiveWallet ? 5 : (isInHighlightedChain ? 4 : (isHovered ? 3 : 1.5))) / globalScale;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Label when zoomed or active
        if (globalScale > 0.8 || isHovered || isActiveWallet) {
            const label = node.id.split('_').slice(-2).join('_');
            ctx.font = `bold ${Math.max(10, 12 / globalScale)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(10, 10, 15, 0.9)';
            const tw = ctx.measureText(label).width;
            ctx.fillRect(node.x - tw / 2 - 4, node.y + radius + 6 / globalScale, tw + 8, 14 / globalScale);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, node.x, node.y + radius + 15 / globalScale);
        }
    }, [hoveredNode, pulseFactor]);

    // Custom link rendering
    const linkCanvasObject = useCallback((link, ctx, globalScale) => {
        const start = link.source;
        const end = link.target;
        if (!start?.x || !end?.x) return;

        const isHighlighted = highlightedChainId && link.chainId === highlightedChainId;

        const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
        const getColor = (s, opacity = 0.6) => {
            if (isHighlighted) return `rgba(168, 85, 247, 0.9)`; // Purple for highlight
            return s > 0.7 ? `rgba(239,68,68,${opacity})` : s > 0.4 ? `rgba(234,179,8,${opacity})` : `rgba(34,197,94,${opacity})`;
        };

        gradient.addColorStop(0, getColor(link.sourceScore || 0, isHighlighted ? 0.9 : 0.6));
        gradient.addColorStop(1, getColor(link.targetScore || 0, isHighlighted ? 0.9 : 0.6));

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = (isHighlighted ? 4 : Math.max(1.5, Math.log(link.amount + 1) * 0.8)) / globalScale;
        ctx.stroke();

        // Arrow
        const dx = end.x - start.x, dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);
        const arrowX = start.x + dx * 0.75, arrowY = start.y + dy * 0.75;
        const al = (isHighlighted ? 12 : 8) / globalScale;
        ctx.beginPath();
        ctx.moveTo(arrowX + al * Math.cos(angle), arrowY + al * Math.sin(angle));
        ctx.lineTo(arrowX - 5 / globalScale * Math.cos(angle - Math.PI / 2), arrowY - 5 / globalScale * Math.sin(angle - Math.PI / 2));
        ctx.lineTo(arrowX - 5 / globalScale * Math.cos(angle + Math.PI / 2), arrowY - 5 / globalScale * Math.sin(angle + Math.PI / 2));
        ctx.closePath();
        ctx.fillStyle = getColor(link.targetScore || 0, 0.9);
        ctx.fill();
    }, []);

    const handleNodeClick = useCallback((node) => {
        if (onNodeClick) onNodeClick(node);
        if (onInvestigateNode) onInvestigateNode(node);
        if (graphRef.current) {
            graphRef.current.centerAt(node.x, node.y, 500);
            graphRef.current.zoom(3, 500);
        }
    }, [onNodeClick, onInvestigateNode]);

    const handleNodeHover = useCallback((node, prevNode) => {
        setHoveredNode(node);
        document.body.style.cursor = node ? 'pointer' : 'default';
    }, []);

    // Particles
    const linkDirectionalParticles = useCallback((link) => Math.max(1, Math.min(4, Math.log(link.amount + 1))), []);
    const linkDirectionalParticleSpeed = useCallback((link) => 0.003 + (link.amount / 5000) * 0.007, []);

    // Get tooltip content for hovered node
    const tooltipContent = useMemo(() => {
        if (!hoveredNode) return null;
        const tx = nodeTransactions[hoveredNode.id] || { inCount: 0, outCount: 0, inAmount: 0, outAmount: 0, netBalance: 0 };
        const score = ((hoveredNode.suspicionScore || 0) * 100).toFixed(1);
        const status = hoveredNode.suspicionScore > 0.7 ? 'Illicit' : hoveredNode.suspicionScore > 0.4 ? 'Suspected' : 'Clean';

        return {
            id: hoveredNode.id,
            score,
            status,
            ...tx
        };
    }, [hoveredNode, nodeTransactions]);

    return (
        <div
            className="relative w-full h-full"
            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        >
            {/* Custom HTML Tooltip with Pointer */}
            {hoveredNode && tooltipContent && (
                <div
                    className="fixed z-[100] glass p-3 rounded-lg text-xs max-w-xs pointer-events-none"
                    style={{
                        left: `${Math.min(window.innerWidth - 280, Math.max(10, mousePos.x + 20))}px`,
                        top: `${Math.min(window.innerHeight - 200, Math.max(10, mousePos.y - 80))}px`
                    }}
                >
                    {/* Pointer Arrow */}
                    <div
                        className="absolute w-0 h-0"
                        style={{
                            left: '-8px',
                            top: '20px',
                            borderTop: '8px solid transparent',
                            borderBottom: '8px solid transparent',
                            borderRight: '8px solid rgba(30, 30, 35, 0.95)'
                        }}
                    />

                    <div className="font-mono text-blue-400 font-bold mb-2 truncate">
                        {tooltipContent.id}
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span className="text-[var(--text-secondary)]">Suspicion:</span>
                            <span className={tooltipContent.status === 'Illicit' ? 'text-red-400' : tooltipContent.status === 'Suspected' ? 'text-yellow-400' : 'text-green-400'}>
                                {tooltipContent.score}% ({tooltipContent.status})
                            </span>
                        </div>
                        <div className="border-t border-[var(--border-color)] my-1"></div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-secondary)]">💰 Incoming:</span>
                            <span className="text-green-400">{tooltipContent.inCount} tx (${tooltipContent.inAmount.toFixed(2)})</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-secondary)]">💸 Outgoing:</span>
                            <span className="text-red-400">{tooltipContent.outCount} tx (${tooltipContent.outAmount.toFixed(2)})</span>
                        </div>
                        <div className="border-t border-[var(--border-color)] my-1"></div>
                        <div className="flex justify-between font-semibold">
                            <span className="text-white">📈 Net Balance:</span>
                            <span className={tooltipContent.netBalance >= 0 ? 'text-green-400' : 'text-red-400'}>
                                ${tooltipContent.netBalance.toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[var(--border-color)] text-center text-[var(--text-secondary)]">
                        🔍 Click to investigate
                    </div>
                </div>
            )}

            {/* Graph stats */}
            <div className="absolute top-20 right-4 z-40 glass px-3 py-1.5 rounded-lg text-xs">
                <span className="text-white font-medium">{graphData.nodes.length} nodes</span>
                <span className="text-[var(--text-secondary)]"> • </span>
                <span className="text-white font-medium">{graphData.links.length} edges</span>
            </div>

            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={width}
                height={height}
                backgroundColor="#0a0a0f"
                nodeCanvasObject={nodeCanvasObject}
                linkCanvasObject={linkCanvasObject}
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                nodeLabel={() => ''}
                linkDirectionalParticles={linkDirectionalParticles}
                linkDirectionalParticleSpeed={linkDirectionalParticleSpeed}
                linkDirectionalParticleWidth={2.5}
                linkDirectionalParticleColor={() => '#ffffff'}
                d3AlphaDecay={0.01}
                d3VelocityDecay={0.2}
                warmupTicks={200}
                cooldownTicks={150}
                enableNodeDrag={true}
                nodePointerAreaPaint={(node, color, ctx) => {
                    // Use actual node size for precise clicking
                    const radius = Math.max(6, Math.min(25, Math.log((node.volume || 1) + 1) * 3));
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
                    ctx.fill();
                }}
            />
        </div>
    );
}

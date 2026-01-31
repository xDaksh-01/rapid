import { useMemo } from 'react';
import { FileText, AlertTriangle, Clock, GitBranch, DollarSign, Users, ArrowRight, Zap } from 'lucide-react';

/**
 * Audit Log - Smurfing Debrief Panel
 * Provides automated analysis of laundering chains.
 */
export default function AuditLog({ data, chainAnalysis, selectedNode }) {
    // Compute temporal analysis
    const temporalAnalysis = useMemo(() => {
        if (!data?.links) return [];

        const chainLinks = data.links.filter(l => l.chainId && l.hopNumber > 0);
        const byChain = {};

        chainLinks.forEach(link => {
            if (!byChain[link.chainId]) byChain[link.chainId] = [];
            byChain[link.chainId].push(link);
        });

        return Object.entries(byChain).map(([chainId, links]) => {
            const sortedByHop = links.sort((a, b) => a.hopNumber - b.hopNumber);
            const hops = sortedByHop.map((l, i) => ({
                hop: l.hopNumber,
                amount: l.amount,
                fee: i > 0 ? (sortedByHop[i - 1].amount - l.amount).toFixed(4) : 0
            }));

            return {
                chainId,
                initialAmount: links[0]?.initialAmount || 0,
                hops,
                totalHops: Math.max(...links.map(l => l.hopNumber))
            };
        }).slice(0, 5); // Limit for display
    }, [data]);

    // Peeling chain detection
    const peelingChains = useMemo(() => {
        if (!temporalAnalysis.length) return [];

        return temporalAnalysis.map(chain => {
            let totalFees = 0;
            const feeBreakdown = chain.hops.map(hop => {
                totalFees += parseFloat(hop.fee) || 0;
                return { hop: hop.hop, fee: hop.fee, amount: hop.amount };
            }).filter(h => h.fee > 0);

            return {
                chainId: chain.chainId,
                initial: chain.initialAmount,
                totalFees: totalFees.toFixed(4),
                feePercent: ((totalFees / chain.initialAmount) * 100).toFixed(2),
                breakdown: feeBreakdown
            };
        });
    }, [temporalAnalysis]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--accent-blue)]" />
                <h2 className="font-semibold text-white">Audit Log</h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Summary Stats */}
                {chainAnalysis && (
                    <div className="grid grid-cols-2 gap-2">
                        <StatBox
                            icon={<GitBranch className="w-4 h-4 text-purple-400" />}
                            label="Chains Detected"
                            value={chainAnalysis.totalChains}
                        />
                        <StatBox
                            icon={<DollarSign className="w-4 h-4 text-yellow-400" />}
                            label="Total Laundered"
                            value={`$${(chainAnalysis.totalLaundered / 1000).toFixed(1)}k`}
                        />
                        <StatBox
                            icon={<ArrowRight className="w-4 h-4 text-blue-400" />}
                            label="Max Depth"
                            value={`${chainAnalysis.maxDepth} hops`}
                        />
                        <StatBox
                            icon={<Users className="w-4 h-4 text-green-400" />}
                            label="Mule Wallets"
                            value={data?.metadata?.illicitNodes || 0}
                        />
                    </div>
                )}

                {/* Smurfing Debrief */}
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-white flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        Smurfing Debrief
                    </h3>

                    <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 text-sm space-y-2 border border-[var(--border-color)]">
                        {chainAnalysis?.chains?.slice(0, 3).map((chain, i) => (
                            <div key={chain.id} className="pb-2 border-b border-[var(--border-color)] last:border-0 last:pb-0">
                                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                    <span className="text-xs font-mono bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                                        {chain.id}
                                    </span>
                                </div>
                                <p className="text-[var(--text-primary)] mt-1">
                                    <span className="text-yellow-400">Origin</span>: Split{' '}
                                    <span className="text-green-400 font-mono">${chain.initialAmount?.toLocaleString()}</span>{' '}
                                    into <span className="text-blue-400">{chain.numWallets}</span> mules over{' '}
                                    <span className="text-purple-400">{chain.maxHops}</span> hops.
                                </p>
                            </div>
                        ))}

                        {(!chainAnalysis?.chains?.length) && (
                            <p className="text-[var(--text-secondary)] text-center py-4">
                                No chain data available. Run with v2 data generator.
                            </p>
                        )}
                    </div>
                </div>

                {/* Peeling Chain Detection */}
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        Peeling Chain Analysis
                    </h3>

                    <div className="bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-[var(--bg-primary)]">
                                <tr>
                                    <th className="text-left p-2 text-[var(--text-secondary)]">Chain</th>
                                    <th className="text-right p-2 text-[var(--text-secondary)]">Initial</th>
                                    <th className="text-right p-2 text-[var(--text-secondary)]">Fees</th>
                                    <th className="text-right p-2 text-[var(--text-secondary)]">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {peelingChains.slice(0, 5).map((chain, i) => (
                                    <tr key={chain.chainId} className="border-t border-[var(--border-color)]">
                                        <td className="p-2 font-mono text-blue-400">{chain.chainId.slice(0, 12)}</td>
                                        <td className="p-2 text-right text-green-400">${chain.initial?.toLocaleString()}</td>
                                        <td className="p-2 text-right text-orange-400">${chain.totalFees}</td>
                                        <td className="p-2 text-right text-[var(--text-secondary)]">{chain.feePercent}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Temporal Log */}
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        Temporal Log
                    </h3>

                    <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 border border-[var(--border-color)]">
                        <div className="space-y-2">
                            {temporalAnalysis.slice(0, 3).map((chain, i) => (
                                <div key={chain.chainId} className="text-xs">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-purple-400">{chain.chainId.slice(0, 12)}</span>
                                        <span className="text-[var(--text-secondary)]">→</span>
                                        <span className="text-cyan-400">{chain.totalHops} hops</span>
                                    </div>
                                    {/* Timeline visualization */}
                                    <div className="flex items-center gap-1 pl-2">
                                        {chain.hops.slice(0, 8).map((hop, j) => (
                                            <div key={j} className="flex items-center">
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{
                                                        backgroundColor: `hsl(${120 - (hop.hop / chain.totalHops) * 120}, 70%, 50%)`
                                                    }}
                                                />
                                                {j < chain.hops.length - 1 && (
                                                    <div className="w-4 h-0.5 bg-[var(--border-color)]" />
                                                )}
                                            </div>
                                        ))}
                                        {chain.hops.length > 8 && (
                                            <span className="text-[var(--text-secondary)]">+{chain.hops.length - 8}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Selected Node Info */}
                {selectedNode && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-white">Selected Node</h3>
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs">
                            <p className="font-mono text-blue-400 truncate">{selectedNode.id}</p>
                            <p className="text-[var(--text-secondary)] mt-1">
                                Score: {(selectedNode.suspicionScore * 100).toFixed(1)}% •
                                In: {selectedNode.inDegree} • Out: {selectedNode.outDegree}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatBox({ icon, label, value }) {
    return (
        <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 border border-[var(--border-color)]">
            <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <span className="text-xs text-[var(--text-secondary)]">{label}</span>
            </div>
            <span className="text-lg font-semibold text-white">{value}</span>
        </div>
    );
}

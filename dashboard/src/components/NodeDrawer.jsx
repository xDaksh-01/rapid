import { X, AlertTriangle, ArrowDownLeft, ArrowUpRight, Clock, Link2, DollarSign, GitBranch, ExternalLink } from 'lucide-react';

/**
 * Side drawer showing detailed node statistics with money flow tracking.
 */
export default function NodeDrawer({ node, onClose, onViewTransactions }) {
    if (!node) return null;

    const isHighRisk = node.suspicionScore > 0.8;
    const riskLevel = node.suspicionScore > 0.8 ? 'Critical'
        : node.suspicionScore > 0.5 ? 'High'
            : node.suspicionScore > 0.2 ? 'Medium'
                : 'Low';

    const riskColor = node.suspicionScore > 0.8 ? 'text-red-500'
        : node.suspicionScore > 0.5 ? 'text-orange-500'
            : node.suspicionScore > 0.2 ? 'text-yellow-500'
                : 'text-green-500';

    const hasChainData = node.chainIds && node.chainIds.length > 0;

    return (
        <div className="fixed right-0 top-0 h-full w-96 glass z-50 shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isHighRisk && <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />}
                    <h2 className="text-lg font-semibold text-white truncate max-w-[250px]">
                        {node.id}
                    </h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* View Transactions Button */}
                <button
                    onClick={onViewTransactions}
                    className="w-full py-3 px-4 rounded-lg bg-[var(--accent-blue)] hover:bg-blue-600 text-white font-medium flex items-center justify-center gap-2 transition-colors"
                >
                    <ExternalLink className="w-4 h-4" />
                    View All Transactions
                </button>

                {/* Suspicion Score */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)] text-sm">Suspicion Score</span>
                        <span className={`font-bold text-xl ${riskColor}`}>
                            {(node.suspicionScore * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                            className="h-full transition-all duration-500"
                            style={{
                                width: `${node.suspicionScore * 100}%`,
                                background: `linear-gradient(to right, #22c55e, #eab308, #ef4444)`,
                            }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                        <span>Clean</span>
                        <span className={`font-medium ${riskColor}`}>{riskLevel} Risk</span>
                        <span>Dirty</span>
                    </div>
                </div>

                {/* Money Flow Section */}
                {hasChainData && (
                    <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <GitBranch className="w-4 h-4 text-purple-400" />
                            <span className="font-medium text-white text-sm">Money Flow Tracking</span>
                        </div>

                        {node.initialAmounts && node.initialAmounts.length > 0 && (
                            <div className="mb-2">
                                <span className="text-xs text-[var(--text-secondary)]">Initial Amounts</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {node.initialAmounts.map((amount, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-mono border border-yellow-500/30"
                                        >
                                            ${amount.toLocaleString()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded bg-[var(--bg-tertiary)]">
                                <span className="text-[var(--text-secondary)] block">Position</span>
                                <span className="text-white font-semibold">Hop {node.avgHopPosition || 0}</span>
                            </div>
                            <div className="p-2 rounded bg-[var(--bg-tertiary)]">
                                <span className="text-[var(--text-secondary)] block">Chains</span>
                                <span className="text-white font-semibold">{node.numChains || 0}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                    <StatCard icon={<ArrowDownLeft className="w-4 h-4 text-blue-400" />} label="In" value={node.inDegree || 0} />
                    <StatCard icon={<ArrowUpRight className="w-4 h-4 text-purple-400" />} label="Out" value={node.outDegree || 0} />
                    <StatCard icon={<Clock className="w-4 h-4 text-cyan-400" />} label="Time Δ" value={`${(node.meanTimeDelta || 0).toFixed(1)}h`} />
                    <StatCard icon={<DollarSign className="w-4 h-4 text-green-400" />} label="Volume" value={`$${(node.volume || 0).toFixed(0)}`} />
                </div>

                {/* Classification */}
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)] text-sm">Label</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${node.label === 1
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-green-500/20 text-green-400 border border-green-500/30'
                            }`}>
                            {node.label === 1 ? 'Illicit' : 'Normal'}
                        </span>
                    </div>
                </div>

                {/* Alert */}
                {isHighRisk && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-red-400 text-xs">
                                High-risk pattern detected.
                                {hasChainData && ` Part of ${node.numChains} chain(s) at hop ${node.avgHopPosition}.`}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value }) {
    return (
        <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
            <div className="flex items-center gap-1.5 mb-0.5">
                {icon}
                <span className="text-[var(--text-secondary)] text-xs">{label}</span>
            </div>
            <span className="text-white font-semibold">{value}</span>
        </div>
    );
}

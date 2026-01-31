import { useMemo } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Clock, DollarSign, GitBranch } from 'lucide-react';

/**
 * Transaction History - Full transaction list for a selected node
 */
export default function TransactionHistory({ node, data, onClose }) {
    // Get all transactions involving this node
    const transactions = useMemo(() => {
        if (!node || !data?.links) return { incoming: [], outgoing: [] };

        const incoming = data.links.filter(
            l => (l.target?.id || l.target) === node.id
        ).map(l => ({
            ...l,
            type: 'incoming',
            counterparty: l.source?.id || l.source,
            counterpartyScore: l.sourceScore
        }));

        const outgoing = data.links.filter(
            l => (l.source?.id || l.source) === node.id
        ).map(l => ({
            ...l,
            type: 'outgoing',
            counterparty: l.target?.id || l.target,
            counterpartyScore: l.targetScore
        }));

        return { incoming, outgoing };
    }, [node, data]);

    const totalIncoming = transactions.incoming.reduce((sum, t) => sum + t.amount, 0);
    const totalOutgoing = transactions.outgoing.reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
            <div className="glass w-full max-w-4xl max-h-[80vh] rounded-xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Transaction History</h2>
                        <p className="text-sm text-[var(--text-secondary)] font-mono">{node.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats */}
                <div className="p-4 border-b border-[var(--border-color)] grid grid-cols-4 gap-4">
                    <StatCard
                        icon={<ArrowDownLeft className="w-4 h-4 text-green-400" />}
                        label="Incoming"
                        value={transactions.incoming.length}
                    />
                    <StatCard
                        icon={<ArrowUpRight className="w-4 h-4 text-red-400" />}
                        label="Outgoing"
                        value={transactions.outgoing.length}
                    />
                    <StatCard
                        icon={<DollarSign className="w-4 h-4 text-green-400" />}
                        label="Total In"
                        value={`$${totalIncoming.toFixed(2)}`}
                    />
                    <StatCard
                        icon={<DollarSign className="w-4 h-4 text-red-400" />}
                        label="Total Out"
                        value={`$${totalOutgoing.toFixed(2)}`}
                    />
                </div>

                {/* Transaction List */}
                <div className="flex-1 overflow-y-auto">
                    {/* Incoming */}
                    <div className="p-4 border-b border-[var(--border-color)]">
                        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                            <ArrowDownLeft className="w-4 h-4 text-green-400" />
                            Incoming Transactions ({transactions.incoming.length})
                        </h3>

                        {transactions.incoming.length === 0 ? (
                            <p className="text-[var(--text-secondary)] text-sm">No incoming transactions</p>
                        ) : (
                            <div className="space-y-2">
                                {transactions.incoming.map((tx, i) => (
                                    <TransactionRow key={i} tx={tx} type="incoming" />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Outgoing */}
                    <div className="p-4">
                        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                            <ArrowUpRight className="w-4 h-4 text-red-400" />
                            Outgoing Transactions ({transactions.outgoing.length})
                        </h3>

                        {transactions.outgoing.length === 0 ? (
                            <p className="text-[var(--text-secondary)] text-sm">No outgoing transactions</p>
                        ) : (
                            <div className="space-y-2">
                                {transactions.outgoing.map((tx, i) => (
                                    <TransactionRow key={i} tx={tx} type="outgoing" />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function TransactionRow({ tx, type }) {
    const isChainTx = tx.chainId != null;
    const scoreColor = tx.counterpartyScore > 0.8 ? 'text-red-400'
        : tx.counterpartyScore > 0.5 ? 'text-orange-400'
            : 'text-green-400';

    return (
        <div className={`p-3 rounded-lg border ${isChainTx ? 'bg-red-500/5 border-red-500/30' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'
            }`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${type === 'incoming' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {type === 'incoming' ? (
                            <ArrowDownLeft className="w-3 h-3 text-green-400" />
                        ) : (
                            <ArrowUpRight className="w-3 h-3 text-red-400" />
                        )}
                    </div>
                    <div>
                        <p className="font-mono text-sm text-white truncate max-w-[200px]">
                            {tx.counterparty}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <span className={scoreColor}>
                                {(tx.counterpartyScore * 100).toFixed(0)}% risk
                            </span>
                            {isChainTx && (
                                <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <GitBranch className="w-3 h-3" />
                                        Hop {tx.hopNumber}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`font-semibold ${type === 'incoming' ? 'text-green-400' : 'text-red-400'}`}>
                        {type === 'incoming' ? '+' : '-'}${tx.amount.toFixed(4)}
                    </p>
                    {isChainTx && tx.initialAmount && (
                        <p className="text-xs text-[var(--text-secondary)]">
                            of ${tx.initialAmount.toLocaleString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value }) {
    return (
        <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
                {icon}
                <span className="text-xs text-[var(--text-secondary)]">{label}</span>
            </div>
            <span className="text-lg font-semibold text-white">{value}</span>
        </div>
    );
}

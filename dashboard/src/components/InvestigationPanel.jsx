import { useState, useMemo, useCallback } from 'react';
import {
    Search, AlertTriangle, ArrowDownLeft, ArrowUpRight,
    GitBranch, DollarSign, Users, Zap, Activity, X, ChevronRight, Zap as Lightning, FileText, Percent
} from 'lucide-react';

/**
 * Investigation Panel with clickable chain details
 */
export default function InvestigationPanel({ context, chainStats, metadata, data, investigatedNodeData, onHighlightChain, onBack }) {
    const [selectedChain, setSelectedChain] = useState(null);

    // Get chain details with all wallets and amounts
    const chainDetails = useMemo(() => {
        if (!selectedChain || !data?.links) return null;

        const chainLinks = data.links.filter(l => l.chainId === selectedChain);
        if (chainLinks.length === 0) return null;

        // Build wallet flow
        const wallets = new Map();
        chainLinks.forEach(link => {
            const src = link.source?.id || link.source;
            const dst = link.target?.id || link.target;

            if (!wallets.has(src)) {
                wallets.set(src, { id: src, sent: 0, received: 0, hops: new Set() });
            }
            if (!wallets.has(dst)) {
                wallets.set(dst, { id: dst, sent: 0, received: 0, hops: new Set() });
            }

            wallets.get(src).sent += link.amount;
            wallets.get(src).hops.add(link.hopNumber || 0);
            wallets.get(dst).received += link.amount;
            wallets.get(dst).hops.add(link.hopNumber || 0);
        });

        // Sort by hop number
        const walletList = Array.from(wallets.values())
            .map(w => ({ ...w, minHop: Math.min(...w.hops), hops: Array.from(w.hops) }))
            .sort((a, b) => a.minHop - b.minHop);

        return {
            chainId: selectedChain,
            initialAmount: chainLinks[0]?.initialAmount || 0,
            totalTx: chainLinks.length,
            wallets: walletList
        };
    }, [selectedChain, data]);

    // Chains list
    const chains = useMemo(() => {
        if (!chainStats) return [];
        return Object.entries(chainStats).map(([id, stats]) => ({
            id,
            ...stats
        }));
    }, [chainStats]);

    // Correct Volume: Sum of incoming transaction amounts only (must be before conditional returns)
    const correctVolume = useMemo(() => {
        if (!context?.transactions?.incoming) return 0;
        return context.transactions.incoming.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    }, [context]);


    // Generate AI Forensic Reasoning
    const generateForensicReasoning = useCallback((node, transactions, status) => {
        const inCount = transactions?.incoming?.length || 0;
        const outCount = transactions?.outgoing?.length || 0;
        // Correct volume: sum of incoming transaction amounts only
        const incomingVolume = transactions?.incoming?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
        const score = ((node?.suspicionScore || 0) * 100).toFixed(1);

        const patterns = [];
        if (outCount > 5) patterns.push("high fan-out pattern (possible smurfing)");
        if (inCount > 5) patterns.push("high fan-in pattern (possible aggregation)");
        if (inCount === 1 && outCount > 3) patterns.push("single source → multiple destinations (distribution node)");
        if (outCount === 1 && inCount > 3) patterns.push("multiple sources → single destination (collection node)");

        const riskFactors = [];
        if (node?.suspicionScore > 0.8) riskFactors.push("suspicion score exceeds 80% threshold");
        if (incomingVolume > 5000) riskFactors.push("high incoming volume ($" + incomingVolume.toFixed(2) + ")");

        return `
FORENSIC ANALYSIS REPORT
========================

Wallet: ${node?.id || 'Unknown'}
Status: ${status} | Suspicion Score: ${score}%

BEHAVIORAL ANALYSIS:
- Incoming Transactions: ${inCount}
- Outgoing Transactions: ${outCount}
- Incoming Volume: $${incomingVolume.toFixed(2)}

${patterns.length > 0 ? `DETECTED PATTERNS:\n${patterns.map(p => "• " + p).join('\n')}` : 'No suspicious patterns detected.'}

${riskFactors.length > 0 ? `RISK FACTORS:\n${riskFactors.map(r => "⚠ " + r).join('\n')}` : 'No significant risk factors.'}

RECOMMENDATION:
${status === 'Illicit' ? '🔴 IMMEDIATE ACTION REQUIRED - Flag for compliance review' :
                status === 'Suspected' ? '🟡 MONITOR - Continue surveillance, gather more evidence' :
                    '🟢 LOW RISK - No immediate action required'}
        `.trim();
    }, []);

    // Generate and export forensic report as PDF
    const generateForensicReport = useCallback(() => {
        if (!context) return;

        const { node, centrality, transactions, status } = context;
        const reasoning = generateForensicReasoning(node, transactions, status);

        // Calculate correct volume (sum of incoming transactions)
        const incomingVolume = transactions?.incoming?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

        // Get top 10 suspicious transactions
        const allTx = [
            ...(transactions?.incoming || []).map(tx => ({ ...tx, type: 'incoming', counterparty: tx.from })),
            ...(transactions?.outgoing || []).map(tx => ({ ...tx, type: 'outgoing', counterparty: tx.to }))
        ].sort((a, b) => b.amount - a.amount).slice(0, 10);

        const outgoingVolume = transactions?.outgoing?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
        const peelingPercentRaw = incomingVolume > 0 ? (outgoingVolume / incomingVolume) * 100 : null;
        const peelingPercent = peelingPercentRaw != null ? 100 - peelingPercentRaw : null;

        // Create report data
        const reportData = {
            walletId: node.id,
            simplifiedName: node.id.split('_').slice(-2).join('_'),
            suspicionScore: (node.suspicionScore * 100).toFixed(1) + '%',
            status,
            forensicReasoning: reasoning,
            topTransactions: allTx,
            incomingVolume,
            outgoingVolume,
            peelingPercent
        };

        // Create printable HTML
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <title>Forensic Report - ${reportData.simplifiedName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: #0a0a0f;
            color: #e2e8f0;
            padding: 40px;
            line-height: 1.6;
        }
        .header {
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo { color: #3b82f6; font-size: 24px; font-weight: bold; }
        .title { font-size: 32px; margin-top: 10px; color: #ffffff; }
        .subtitle { color: #94a3b8; font-size: 14px; margin-top: 5px; }
        
        .section { 
            background: #1e293b;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 18px;
            color: #3b82f6;
            margin-bottom: 15px;
            border-bottom: 1px solid #334155;
            padding-bottom: 10px;
        }
        
        .wallet-id { 
            font-family: monospace;
            color: #60a5fa;
            font-size: 14px;
            word-break: break-all;
        }
        
        .status {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
        }
        .status.illicit { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .status.suspected { background: rgba(234, 179, 8, 0.2); color: #eab308; }
        .status.clean { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 15px; }
        .stat-box {
            background: #0f172a;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value { font-size: 24px; font-weight: bold; color: #ffffff; }
        .stat-label { font-size: 12px; color: #94a3b8; margin-top: 5px; }
        
        .reasoning {
            background: #0f172a;
            padding: 20px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 13px;
            white-space: pre-wrap;
            line-height: 1.8;
        }
        
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
        th { background: #0f172a; color: #94a3b8; font-size: 12px; text-transform: uppercase; }
        td { font-size: 13px; }
        .amount-in { color: #22c55e; }
        .amount-out { color: #ef4444; }
        .mono { font-family: monospace; color: #60a5fa; }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #334155;
            text-align: center;
            color: #64748b;
            font-size: 12px;
        }
        
        @media print {
            body { background: #0a0a0f !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🔍 THE SMURFING HUNTER</div>
        <div class="title">Forensic Investigation Report</div>
        <div class="subtitle">Generated: ${new Date().toLocaleString()}</div>
    </div>
    
    <div class="section">
        <div class="section-title">📋 Wallet Summary</div>
        <p><strong>Wallet ID:</strong></p>
        <p class="wallet-id">${reportData.walletId}</p>
        <p style="margin-top: 15px;"><strong>Simplified Name:</strong> ${reportData.simplifiedName}</p>
        <p style="margin-top: 10px;">
            <strong>Status:</strong> 
            <span class="status ${status.toLowerCase()}">${status}</span>
            &nbsp;&nbsp;
            <strong>Suspicion Score:</strong> ${reportData.suspicionScore}
        </p>
        
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-value">${centrality?.inDegree || 0}</div>
                <div class="stat-label">Incoming TX</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${centrality?.outDegree || 0}</div>
                <div class="stat-label">Outgoing TX</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">$${reportData.incomingVolume.toFixed(0)}</div>
                <div class="stat-label">Incoming Volume</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${reportData.peelingPercent != null ? reportData.peelingPercent.toFixed(2) + '%' : '—'}</div>
                <div class="stat-label">Peeling %</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">🧠 AI Forensic Reasoning</div>
        <div class="reasoning">${reasoning}</div>
    </div>
    
    <div class="section">
        <div class="section-title">💰 Top 10 Suspicious Transactions</div>
        <table>
            <thead>
                <tr>
                    <th>Source/Target</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Timestamp</th>
                </tr>
            </thead>
            <tbody>
                ${allTx.map(tx => `
                    <tr>
                        <td class="mono">${(tx.counterparty || 'Unknown').split('_').slice(-2).join('_')}</td>
                        <td class="${tx.type === 'incoming' ? 'amount-in' : 'amount-out'}">
                            ${tx.type === 'incoming' ? '+' : '-'}$${tx.amount.toFixed(2)}
                        </td>
                        <td>${tx.type === 'incoming' ? '📥 Incoming' : '📤 Outgoing'}</td>
                        <td>${tx.timestamp ? tx.timestamp.split('T')[0] : 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    
    <div class="footer">
        <p>🔐 CONFIDENTIAL - For Authorized Personnel Only</p>
        <p>Generated by The Smurfing Hunter | Rapid Prototypers © 2026</p>
    </div>
    
    <script>
        window.onload = function() { window.print(); }
    </script>
</body>
</html>
        `);
        printWindow.document.close();
    }, [context, generateForensicReasoning]);

    // Default view when no node is investigated
    if (!context && !selectedChain) {
        return (
            <div className="h-full flex flex-col">
                <div className="p-4 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-[var(--accent-blue)]" />
                        <h2 className="font-semibold text-white">Audit Dashboard</h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Summary */}
                    {metadata && (
                        <div className="grid grid-cols-2 gap-2">
                            <StatBox icon={<Users className="w-4 h-4 text-blue-400" />} label="Nodes" value={metadata.totalNodes} />
                            <StatBox icon={<GitBranch className="w-4 h-4 text-purple-400" />} label="Chains" value={metadata.uniqueChains} />
                            <StatBox icon={<AlertTriangle className="w-4 h-4 text-red-400" />} label="Illicit" value={metadata.illicitNodes} />
                            <StatBox icon={<Zap className="w-4 h-4 text-yellow-400" />} label="Max Depth" value={metadata.maxChainDepth} />
                        </div>
                    )}

                    {/* Clickable Chains List */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-white flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-purple-400" />
                            Laundering Chains (Click to view details)
                        </h3>

                        <div className="space-y-1">
                            {chains.map(chain => (
                                <button
                                    key={chain.id}
                                    onClick={() => setSelectedChain(chain.id)}
                                    className="w-full p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-left group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-purple-400 text-sm">{chain.id}</span>
                                        <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-purple-400 transition-colors" />
                                    </div>
                                    <div className="flex gap-4 mt-1 text-xs text-[var(--text-secondary)]">
                                        <span>💰 ${chain.initialAmount?.toLocaleString()}</span>
                                        <span>🔗 {chain.maxHops} hops</span>
                                        <span>👛 {chain.numWallets} wallets</span>
                                    </div>
                                </button>
                            ))}

                            {chains.length === 0 && (
                                <p className="text-center text-[var(--text-secondary)] text-sm py-4">No chains detected</p>
                            )}
                        </div>
                    </div>

                    <div className="text-center py-4 text-[var(--text-secondary)] text-xs">
                        Click a node on the graph to investigate
                    </div>
                </div>
            </div>
        );
    }

    // Chain details view
    if (selectedChain && chainDetails) {
        return (
            <div className="h-full flex flex-col">
                <div className="p-4 border-b border-[var(--border-color)] bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <GitBranch className="w-5 h-5 text-purple-400" />
                            <h2 className="font-semibold text-white">Chain Details</h2>
                        </div>
                        <button
                            onClick={() => setSelectedChain(null)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="font-mono text-sm text-purple-400 mt-1">{chainDetails.chainId}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Chain Summary */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[var(--bg-tertiary)] p-2 rounded text-center border border-[var(--border-color)]">
                            <div className="text-xs text-[var(--text-secondary)]">Initial</div>
                            <div className="text-green-400 font-semibold">${chainDetails.initialAmount.toLocaleString()}</div>
                        </div>
                        <div className="bg-[var(--bg-tertiary)] p-2 rounded text-center border border-[var(--border-color)]">
                            <div className="text-xs text-[var(--text-secondary)]">Transactions</div>
                            <div className="text-white font-semibold">{chainDetails.totalTx}</div>
                        </div>
                        <div className="bg-[var(--bg-tertiary)] p-2 rounded text-center border border-[var(--border-color)]">
                            <div className="text-xs text-[var(--text-secondary)]">Wallets</div>
                            <div className="text-white font-semibold">{chainDetails.wallets.length}</div>
                        </div>
                    </div>

                    {/* Wallet Flow Table */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-white">Wallet Flow (Ordered by Hop)</h3>

                        <div className="bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-[var(--bg-primary)]">
                                    <tr>
                                        <th className="text-left p-2 text-[var(--text-secondary)]">Wallet</th>
                                        <th className="text-right p-2 text-[var(--text-secondary)]">Received</th>
                                        <th className="text-right p-2 text-[var(--text-secondary)]">Sent</th>
                                        <th className="text-center p-2 text-[var(--text-secondary)]">Hop</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chainDetails.wallets.map((wallet, i) => (
                                        <tr key={wallet.id} className="border-t border-[var(--border-color)]">
                                            <td className="p-2">
                                                <span className="font-mono text-blue-400 truncate block max-w-[100px]" title={wallet.id}>
                                                    {wallet.id.split('_').slice(-2).join('_')}
                                                </span>
                                            </td>
                                            <td className="p-2 text-right text-green-400">
                                                {wallet.received > 0 ? `+$${wallet.received.toFixed(2)}` : '-'}
                                            </td>
                                            <td className="p-2 text-right text-red-400">
                                                {wallet.sent > 0 ? `-$${wallet.sent.toFixed(2)}` : '-'}
                                            </td>
                                            <td className="p-2 text-center text-[var(--text-secondary)]">
                                                {wallet.hops.join(',')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Visual Flow */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-white">Money Flow</h3>
                        <div className="flex items-center flex-wrap gap-1 p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
                            {chainDetails.wallets.slice(0, 10).map((wallet, i) => (
                                <div key={wallet.id} className="flex items-center">
                                    <div
                                        className={`px-2 py-1 rounded text-xs font-mono ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                            i === chainDetails.wallets.length - 1 ? 'bg-red-500/20 text-red-400' :
                                                'bg-orange-500/20 text-orange-400'
                                            }`}
                                    >
                                        {wallet.id.split('_').pop()}
                                    </div>
                                    {i < chainDetails.wallets.length - 1 && i < 9 && (
                                        <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                                    )}
                                </div>
                            ))}
                            {chainDetails.wallets.length > 10 && (
                                <span className="text-xs text-[var(--text-secondary)]">+{chainDetails.wallets.length - 10} more</span>
                            )}
                        </div>
                    </div>

                    {/* Back Button */}
                    <button
                        onClick={() => {
                            setSelectedChain(null);
                            onBack?.();
                        }}
                        className="w-full py-3 px-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-white font-medium flex items-center justify-center gap-2"
                    >
                        ← Back to All Chains
                    </button>
                </div>
            </div>
        );
    }

    // Investigated node view
    const { node, centrality, transactions, status } = context;
    const statusColor = status === 'Illicit' ? 'text-red-400' : status === 'Suspected' ? 'text-orange-400' : 'text-green-400';
    const statusBg = status === 'Illicit' ? 'bg-red-500/20' : status === 'Suspected' ? 'bg-orange-500/20' : 'bg-green-500/20';

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[var(--border-color)] bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[var(--accent-blue)]" />
                        <h2 className="font-semibold text-white">Investigating</h2>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedChain(null);
                            onBack?.();
                        }}
                        className="text-xs text-[var(--text-secondary)] hover:text-white"
                    >
                        ← Back to chains
                    </button>
                </div>
                <p className="font-mono text-sm text-blue-400 truncate mt-1">{node.id}</p>
                <div className="flex items-center gap-3 text-xs mt-2">
                    <span className={`px-2 py-1 rounded ${statusBg} ${statusColor} font-medium`}>{status}</span>
                    <span className="text-[var(--text-secondary)]">Score: <span className={statusColor}>{(node.suspicionScore * 100).toFixed(0)}%</span></span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    <MiniStat label="In" value={centrality.inDegree} icon={<ArrowDownLeft className="w-3 h-3 text-green-400" />} />
                    <MiniStat label="Out" value={centrality.outDegree} icon={<ArrowUpRight className="w-3 h-3 text-red-400" />} />
                    <MiniStat label="Vol" value={`$${correctVolume.toFixed(0)}`} icon={<DollarSign className="w-3 h-3 text-yellow-400" />} />
                    <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Percent className="w-3 h-3 text-amber-400" />
                            <span className="text-xs text-[var(--text-secondary)]">Peeling %</span>
                        </div>
                        <span className="font-bold text-amber-400 text-lg tabular-nums">
                            {context.peeling?.peelingPercent != null
                                ? `${(100 - context.peeling.peelingPercent).toFixed(2)}%`
                                : '—'}
                        </span>
                    </div>
                </div>
                {context.peeling && (context.peeling.totalIncoming > 0 || context.peeling.totalOutgoing > 0) && (
                    <p className="text-xs text-[var(--text-secondary)]">
                        100 − Peeling % (displayed above)
                    </p>
                )}

                {/* Peeling Chain Section */}
                {investigatedNodeData?.peeling?.inPeelingChain && (
                    <PeelingChainSection peeling={investigatedNodeData.peeling} nodeId={node.id} />
                )}

                {/* Transactions tables */}
                <TransactionTable title="Incoming" transactions={transactions.incoming} type="in" />
                <TransactionTable title="Outgoing" transactions={transactions.outgoing} type="out" />

                {/* Generate Forensic Report Button */}
                <button
                    onClick={generateForensicReport}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                >
                    <FileText className="w-5 h-5" />
                    Generate Forensic Report
                </button>
            </div>
        </div>
    );
}

function TransactionTable({ title, transactions, type }) {
    // Format timestamp to "Feb 01, 02:57" format
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return null;
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return null;
            const month = date.toLocaleString('en-US', { month: 'short' });
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${month} ${day}, ${hours}:${minutes}`;
        } catch {
            return null;
        }
    };

    if (!transactions || transactions.length === 0) {
        return (
            <div className="text-xs text-[var(--text-secondary)] text-center py-2">
                No {title.toLowerCase()} transactions
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <h4 className="text-xs font-medium text-white">{title} ({transactions.length})</h4>
            <div className="bg-[var(--bg-tertiary)] rounded border border-[var(--border-color)] max-h-40 overflow-y-auto">
                {transactions.slice(0, 8).map((tx, i) => {
                    const formattedTime = formatTimestamp(tx.timestamp);
                    return (
                        <div key={i} className="flex flex-col p-2 text-xs border-b border-[var(--border-color)] last:border-0">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="font-mono text-blue-400 truncate max-w-[100px]">
                                        {(type === 'in' ? tx.from : tx.to)?.split('_').slice(-2).join('_')}
                                    </span>
                                    {formattedTime && (
                                        <span className="text-gray-400 text-xs mt-0.5">
                                            {formattedTime}
                                        </span>
                                    )}
                                </div>
                                <span className={type === 'in' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                                    {type === 'in' ? '+' : '-'}${tx.amount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function StatBox({ icon, label, value }) {
    return (
        <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 border border-[var(--border-color)]">
            <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-xs text-[var(--text-secondary)]">{label}</span></div>
            <span className="text-lg font-semibold text-white">{value}</span>
        </div>
    );
}

function MiniStat({ icon, label, value }) {
    return (
        <div className="bg-[var(--bg-tertiary)] rounded p-2 text-center border border-[var(--border-color)]">
            <div className="flex items-center justify-center gap-1 mb-0.5">{icon}<span className="text-xs text-[var(--text-secondary)]">{label}</span></div>
            <span className="text-sm font-semibold text-white">{value}</span>
        </div>
    );
}

function PeelingChainSection({ peeling, nodeId }) {
    const roleColor = {
        'source': 'text-yellow-400 bg-yellow-500/20',
        'intermediate': 'text-orange-400 bg-orange-500/20',
        'destination': 'text-red-400 bg-red-500/20',
        null: 'text-gray-400 bg-gray-500/20'
    };

    const roleLabel = {
        'source': '🔴 Origin',
        'intermediate': '⚪ Hop',
        'destination': '🟢 End',
        null: 'N/A'
    };

    return (
        <div className="bg-purple-500/5 border border-purple-500/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
                <Lightning className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-medium text-white">Peeling Chain Detection</h4>
                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/30 text-purple-300">⚠️ Obfuscation Pattern</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[var(--bg-tertiary)] rounded p-2 border border-[var(--border-color)]">
                    <div className="text-[var(--text-secondary)]">Role</div>
                    <div className={`text-sm font-semibold ${roleColor[peeling.chainParticipation]}`}>
                        {roleLabel[peeling.chainParticipation]}
                    </div>
                </div>
                <div className="bg-[var(--bg-tertiary)] rounded p-2 border border-[var(--border-color)]">
                    <div className="text-[var(--text-secondary)]">Chain Length</div>
                    <div className="text-sm font-semibold text-blue-400">
                        {peeling.maxChainLength} hops
                    </div>
                </div>
            </div>

            {peeling.numChains > 0 && (
                <div className="space-y-1">
                    <p className="text-xs text-[var(--text-secondary)]">
                        Part of <span className="text-purple-400 font-semibold">{peeling.numChains}</span> peeling chain{peeling.numChains > 1 ? 's' : ''}
                    </p>
                    {peeling.chains.length > 0 && (
                        <div className="text-xs bg-[var(--bg-tertiary)] rounded p-2 border border-[var(--border-color)] max-h-24 overflow-y-auto">
                            {peeling.chains.map((chain, i) => (
                                <div key={i} className="py-1 border-b border-[var(--border-color)] last:border-0">
                                    <div className="text-[var(--text-secondary)] mb-0.5">
                                        <div className="font-medium text-white/90 mb-0.5">Chain {i + 1}</div>
                                        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5" title={(chain.path || []).join(' → ')}>
                                            {[...(chain.path || [])].reverse().slice(0, 6).map((w, j) => (
                                                <span key={j}>
                                                    <span className="font-mono text-blue-300" title={w}>{w.split('_').slice(1).join('_') || w}</span>
                                                    {j < Math.min(chain.path?.length ?? 0, 6) - 1 && <span className="text-[var(--text-secondary)]">→</span>}
                                                </span>
                                            ))}
                                            {(chain.path?.length ?? 0) > 6 && <span className="text-[var(--text-secondary)]">...</span>}
                                        </div>
                                    </div>
                                    <div className="space-y-0.5 text-xs">
                                        <div className="flex gap-2 text-[var(--text-secondary)]">
                                            <span>Len: <span className="text-blue-400">{chain.length}</span></span>
                                        </div>
                                        {chain.incomingTimestamp && (
                                            <div className="text-[var(--text-secondary)]">
                                                ↓ In: <span className="text-green-400">{chain.incomingTimestamp.split('T')[0]} {chain.incomingTimestamp.split('T')[1]?.slice(0, 5)}</span>
                                            </div>
                                        )}
                                        {chain.outgoingTimestamp && (
                                            <div className="text-[var(--text-secondary)]">
                                                ↑ Out: <span className="text-red-400">{chain.outgoingTimestamp.split('T')[0]} {chain.outgoingTimestamp.split('T')[1]?.slice(0, 5)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="text-xs text-purple-300 italic">
                💡 Peeling chains indicate obfuscation through sequential transfers with decreasing amounts (to cover fees)
            </div>
        </div>
    );
}

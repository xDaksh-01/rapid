import { Filter, AlertTriangle, Users, Link2 } from 'lucide-react';

/**
 * Filter panel with suspicion threshold slider and graph stats.
 */
export default function FilterPanel({
    threshold,
    onThresholdChange,
    metadata
}) {
    return (
        <div className="absolute top-4 left-4 w-80 glass rounded-xl p-4 z-40 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[var(--accent-blue)]" />
                <h3 className="font-semibold text-white">Filters</h3>
            </div>

            {/* Threshold Slider */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Suspicion Threshold</span>
                    <span className="font-mono text-white bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                        {(threshold * 100).toFixed(0)}%
                    </span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={threshold}
                    onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, 
              var(--accent-green) 0%, 
              var(--accent-green) ${threshold * 100}%, 
              var(--bg-tertiary) ${threshold * 100}%, 
              var(--bg-tertiary) 100%)`
                    }}
                />
                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                    <span>Show All</span>
                    <span>High Risk Only</span>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border-color)]" />

            {/* Stats */}
            {metadata && (
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-[var(--text-secondary)]">Graph Statistics</h4>

                    <div className="grid grid-cols-2 gap-2">
                        <MiniStat
                            icon={<Users className="w-4 h-4" />}
                            label="Nodes"
                            value={metadata.totalNodes?.toLocaleString()}
                        />
                        <MiniStat
                            icon={<Link2 className="w-4 h-4" />}
                            label="Edges"
                            value={metadata.totalLinks?.toLocaleString()}
                        />
                        <MiniStat
                            icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
                            label="Illicit"
                            value={metadata.illicitNodes?.toLocaleString()}
                            highlight
                        />
                        <MiniStat
                            icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
                            label="High Risk"
                            value={metadata.highRiskNodes?.toLocaleString()}
                        />
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium text-[var(--text-secondary)]">Legend</h4>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-[var(--text-secondary)]">Clean</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-[var(--text-secondary)]">Medium</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500 neon-glow" />
                        <span className="text-[var(--text-secondary)]">High Risk</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MiniStat({ icon, label, value, highlight }) {
    return (
        <div className={`p-2 rounded-lg ${highlight ? 'bg-red-500/10' : 'bg-[var(--bg-tertiary)]'}`}>
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                {icon}
                <span className="text-xs">{label}</span>
            </div>
            <span className={`font-semibold ${highlight ? 'text-red-400' : 'text-white'}`}>
                {value || '—'}
            </span>
        </div>
    );
}

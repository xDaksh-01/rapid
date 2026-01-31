import { Filter, AlertTriangle, Users } from 'lucide-react';

/**
 * Filter panel with suspicion threshold slider and graph stats.
 */
export default function FilterPanel({
    threshold,
    onThresholdChange,
    metadata
}) {
    console.log('FilterPanel metadata:', metadata);
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

            {/* Stats Tabs */}
            {metadata && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                            <div className="flex items-center gap-1.5 text-[var(--text-secondary)] mb-1">
                                <Users className="w-4 h-4" />
                                <span className="text-xs">Nodes</span>
                            </div>
                            <span className="font-semibold text-white text-lg">
                                {metadata.visibleNodes?.toLocaleString() || '—'}
                            </span>
                        </div>
                        <div className="p-3 rounded-lg bg-red-500/10">
                            <div className="flex items-center gap-1.5 text-[var(--text-secondary)] mb-1">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <span className="text-xs">Illicit</span>
                            </div>
                            <span className="font-semibold text-red-400 text-lg">
                                {metadata.illicitNodes?.toLocaleString() || '—'}
                            </span>
                        </div>
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

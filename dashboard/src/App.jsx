import { useState, useEffect, useCallback, useMemo } from 'react';
import ForceGraph from './components/ForceGraph';
import FilterPanel from './components/FilterPanel';
import TopTabs from './components/TopTabs';
import InvestigationPanel from './components/InvestigationPanel';
import { Loader2, AlertTriangle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { calculateCentrality, getWalletTransactions } from './utils/graphUtils';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [investigatedNode, setInvestigatedNode] = useState(null);
  const [focusedChainId, setFocusedChainId] = useState(null);
  const [highlightedChainId, setHighlightedChainId] = useState(null);
  const [activeWalletId, setActiveWalletId] = useState(null);
  const [focusNodeId, setFocusNodeId] = useState(null);
  const [threshold, setThreshold] = useState(0);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(false);
  const [filteredGraphData, setFilteredGraphData] = useState(null);
  const [selectedTab, setSelectedTab] = useState('Overview');

  const leftPaneWidth = rightPaneCollapsed ? dimensions.width - 48 : Math.floor(dimensions.width * 0.6);
  const rightPaneWidth = rightPaneCollapsed ? 48 : dimensions.width - leftPaneWidth;

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const response = await fetch('/network_data.json');
        if (!response.ok) throw new Error('Failed to load network data. Run python run_test.py first.');
        const json = await response.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute filtered node counts based on threshold
  const filterStats = useMemo(() => {
    if (!data?.nodes) return { visibleNodes: 0, illicitNodes: 0 };

    const filteredNodes = data.nodes.filter(n => n.suspicionScore >= threshold);
    const illicitCount = data.nodes.filter(n => n.suspicionScore > 0.7).length;

    const stats = {
      visibleNodes: filteredNodes.length,
      illicitNodes: illicitCount
    };
    console.log('filterStats updated:', stats, 'threshold:', threshold);
    return stats;
  }, [data, threshold]);

  // Merge filterStats with metadata
  const mergedMetadata = useMemo(() => {
    const merged = { ...data?.metadata, ...filterStats };
    console.log('Merged metadata:', merged);
    return merged;
  }, [data?.metadata, filterStats]);

  // Compute investigation context with filtered transactions (only direct neighbors in visible graph)
  const investigationContext = useMemo(() => {
    if (!investigatedNode || !filteredGraphData) return null;

    // Use the filtered graph data that's actually being displayed
    const visibleLinks = filteredGraphData.links;

    // Get ONLY direct neighbors of the investigated node from visible links
    const directLinks = visibleLinks.filter(l => {
      const src = l.source?.id || l.source;
      const tgt = l.target?.id || l.target;
      const nodeId = investigatedNode.id;

      return src === nodeId || tgt === nodeId;
    });

    console.log('Investigation node:', investigatedNode.id);
    console.log('Visible graph has', filteredGraphData.nodes.length, 'nodes and', filteredGraphData.links.length, 'links');
    console.log('Direct links from node:', directLinks.length);
    directLinks.forEach(l => {
      const src = l.source?.id || l.source;
      const tgt = l.target?.id || l.target;
      console.log(`Link: ${src} -> ${tgt}`);
    });

    const centrality = calculateCentrality(investigatedNode.id, directLinks);
    const transactions = getWalletTransactions(investigatedNode.id, directLinks);

    // Peeling % at this node: (Total Outgoing / Total Incoming) × 100
    const totalIncoming = (transactions.incoming || []).reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    const totalOutgoing = (transactions.outgoing || []).reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    const peelingPercent = totalIncoming > 0 ? (totalOutgoing / totalIncoming) * 100 : null;

    return {
      node: investigatedNode,
      centrality,
      transactions,
      peeling: { totalIncoming, totalOutgoing, peelingPercent },
      status: investigatedNode.suspicionScore > 0.7 ? 'Illicit' :
        investigatedNode.suspicionScore > 0.4 ? 'Suspected' : 'Licit'
    };
  }, [investigatedNode, filteredGraphData]);

  const handleInvestigateNode = useCallback((node) => {
    setInvestigatedNode(node);
  }, []);

  const handleWalletClick = useCallback((id) => {
    setFocusNodeId({ id, ts: Date.now() });
  }, []);

  const handleNodeClick = useCallback((node) => {
    setInvestigatedNode(node);
    setFocusedChainId(null); // Reset chain focus when clicking a node
    setHighlightedChainId(null);
    setRightPaneCollapsed(false);  // Auto-expand right pane
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--bg-primary)]">
        <Loader2 className="w-12 h-12 text-[var(--accent-blue)] animate-spin" />
        <p className="text-[var(--text-secondary)]">Loading network data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-[var(--bg-primary)]">
        <AlertTriangle className="w-16 h-16 text-red-500" />
        <h1 className="text-xl font-semibold text-white">Error Loading Data</h1>
        <p className="text-[var(--text-secondary)]">{error}</p>
        <code className="bg-[var(--bg-tertiary)] px-3 py-2 rounded text-green-400">python run_test.py</code>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[var(--bg-primary)] flex">
      {/* Left Pane - Graph */}
      <div className="relative" style={{ width: leftPaneWidth, height: '100%' }}>
        {/* Header */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="glass px-6 py-3 rounded-full flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <h1 className="text-lg font-bold text-white">The Smurfing Hunter</h1>
            <span className="text-[var(--text-secondary)] text-sm">Forensics Dashboard</span>
          </div>
        </div>

        {/* Tabs + Filter tab */}
        <div className="absolute top-4 left-4 z-50">
          <TopTabs selected={selectedTab} onSelect={setSelectedTab} />
          <div className="mt-2">
            {selectedTab === 'Filter' && (
              <FilterPanel
                threshold={threshold}
                onThresholdChange={setThreshold}
                metadata={mergedMetadata}
                embedded
              />
            )}
          </div>
        </div>

        <ForceGraph
          data={data}
          threshold={threshold}
          onNodeClick={handleNodeClick}
          onInvestigateNode={handleInvestigateNode}
          onGraphDataUpdate={setFilteredGraphData}
          highlightedChainId={highlightedChainId}
          activeWalletId={activeWalletId}
          focusNodeId={focusNodeId}
          width={leftPaneWidth}
          height={dimensions.height}
        />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 glass rounded-lg p-3 z-40">
          <h4 className="text-xs font-medium text-[var(--text-secondary)] mb-2">Legend</h4>
          <div className="space-y-1.5 text-xs">
            <LegendItem color="bg-red-500" glow label="Known Illicit (score > 0.7)" />
            <LegendItem color="bg-yellow-500" label="Suspected Mule (0.4-0.7)" />
            <LegendItem color="bg-green-500" label="Clean Account (< 0.4)" />
            <LegendItem color="border-2 border-yellow-500 bg-transparent" label="Seed / Investigated Node" />
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
          <div className="glass px-4 py-2 rounded-lg text-xs text-[var(--text-secondary)]">
            Click any node to drill down • Particles show money flow
          </div>
        </div>
      </div>

      {/* Right Pane - Investigation Panel */}
      <div
        className="h-full border-l border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col"
        style={{ width: rightPaneWidth }}
      >
        <button
          onClick={() => setRightPaneCollapsed(!rightPaneCollapsed)}
          className="absolute top-4 right-4 z-50 p-2 glass rounded-lg hover:bg-white/10 transition-colors"
        >
          {rightPaneCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>

        {!rightPaneCollapsed && (
          <InvestigationPanel
            context={investigationContext}
            chainStats={data?.chainStats}
            metadata={data?.metadata}
            data={data}
            investigatedNodeData={investigatedNode}
            externalChainId={focusedChainId}
            onHighlightChain={setHighlightedChainId}
            onWalletFocus={setActiveWalletId}
            onWalletClick={handleWalletClick}
            onBack={() => {
              setInvestigatedNode(null);
              setFocusedChainId(null);
              setHighlightedChainId(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, glow, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color} ${glow ? 'shadow-[0_0_8px_rgba(239,68,68,0.6)]' : ''}`} />
      <span className="text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}

export default App;

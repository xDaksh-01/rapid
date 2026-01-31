"""
The Smurfing Hunter - Network Data Exporter v2
===============================================
Enhanced export with money flow tracking for forensics dashboard.
"""

import json
import pandas as pd
import numpy as np
from collections import defaultdict


def export_network_data(
    transactions_path: str = 'massive_transactions_v2.csv',
    scores_path: str = 'suspicion_scores.csv',
    output_path: str = 'dashboard/public/network_data.json',
    sample_size: int = None
):
    """
    Export transaction graph as JSON with money flow tracking.
    """
    print("📂 Loading data...")
    tx_df = pd.read_csv(transactions_path)
    
    # Check if scores exist, otherwise use labels
    try:
        scores_df = pd.read_csv(scores_path)
        score_map = dict(zip(scores_df['Wallet_ID'], scores_df['Suspicion_Score']))
        label_map = dict(zip(scores_df['Wallet_ID'], scores_df['True_Label']))
    except:
        print("   ⚠️  No suspicion_scores.csv found, using transaction data labels")
        score_map = {}
        label_map = {}
    
    print(f"   Transactions: {len(tx_df):,}")
    
    # Check for enhanced columns
    has_chain_data = 'Chain_ID' in tx_df.columns
    if has_chain_data:
        print(f"   ✅ Enhanced chain data detected")
        print(f"   Unique chains: {tx_df['Chain_ID'].dropna().nunique()}")
        print(f"   Max hop number: {tx_df['Hop_Number'].max()}")
    
    # Sample for performance if needed
    if sample_size and len(tx_df) > sample_size:
        print(f"   Sampling {sample_size:,} transactions...")
        # Prioritize keeping complete chains
        if has_chain_data:
            chains = tx_df['Chain_ID'].dropna().unique()
            sampled_chains = np.random.choice(chains, min(len(chains), sample_size // 10), replace=False)
            chain_tx = tx_df[tx_df['Chain_ID'].isin(sampled_chains)]
            
            # Calculate remaining normal tx to sample
            normal_pool = tx_df[tx_df['Chain_ID'].isna()]
            remaining = max(0, sample_size - len(chain_tx))
            
            if remaining > 0 and len(normal_pool) > 0:
                normal_tx = normal_pool.sample(n=min(remaining, len(normal_pool)), random_state=42)
                tx_df = pd.concat([chain_tx, normal_tx])
            else:
                tx_df = chain_tx.head(sample_size)
        else:
            tx_df = tx_df.sample(n=sample_size, random_state=42)
    
    # Calculate node volumes and stats
    print("📊 Computing node statistics...")
    node_volume = defaultdict(float)
    node_in_degree = defaultdict(int)
    node_out_degree = defaultdict(int)
    node_timestamps = defaultdict(list)
    node_chains = defaultdict(set)  # Track which chains a node belongs to
    node_initial_amounts = defaultdict(set)  # Track initial amounts passing through
    node_hop_numbers = defaultdict(list)  # Track hop positions
    
    for _, row in tx_df.iterrows():
        src = row['Source_Wallet_ID']
        dst = row['Dest_Wallet_ID']
        amount = row['Amount']
        
        node_volume[src] += amount
        node_volume[dst] += amount
        node_out_degree[src] += 1
        node_in_degree[dst] += 1
        
        node_timestamps[src].append(pd.to_datetime(row['Timestamp']))
        
        # Track chain data
        if has_chain_data and pd.notna(row.get('Chain_ID')):
            node_chains[src].add(row['Chain_ID'])
            node_chains[dst].add(row['Chain_ID'])
            if pd.notna(row.get('Initial_Amount')):
                node_initial_amounts[src].add(row['Initial_Amount'])
                node_initial_amounts[dst].add(row['Initial_Amount'])
            if pd.notna(row.get('Hop_Number')):
                node_hop_numbers[dst].append(row['Hop_Number'])
    
    # Calculate mean time delta for each node
    node_time_delta = {}
    for node, timestamps in node_timestamps.items():
        if len(timestamps) > 1:
            timestamps = sorted(timestamps)
            deltas = [(timestamps[i+1] - timestamps[i]).total_seconds() / 3600 
                      for i in range(len(timestamps)-1)]
            node_time_delta[node] = np.mean(deltas)
        else:
            node_time_delta[node] = 0
    
    # Get unique wallets from transactions
    unique_wallets = set(tx_df['Source_Wallet_ID'].unique()) | set(tx_df['Dest_Wallet_ID'].unique())
    
    # Infer labels from wallet names if no scores
    def infer_label(wallet_id):
        if wallet_id in label_map:
            return label_map[wallet_id]
        # Infer from naming convention
        # Old patterns: Illicit, Mule, Attack, Complex, Siphon, Exit, Origin
        # New patterns: W_A0_S0 (source), W_A0_H1_0 (hop), W_A0_D (dest)
        if 'Clean' in wallet_id:
            return 0
        if any(x in wallet_id for x in ['Illicit', 'Mule', 'Attack', 'Complex', 'Siphon', 'Exit', 'Origin']):
            return 1
        # New pattern: W_A{attack_id}_... (attack wallets)
        if '_A' in wallet_id and wallet_id.startswith('W_'):
            return 1
        return 0
    
    # Add variation based on wallet hash for consistency
    def infer_score(wallet_id):
        if wallet_id in score_map:
            return score_map[wallet_id]
        
        label = infer_label(wallet_id)
        
        # Generate consistent variation based on wallet ID hash
        hash_val = hash(wallet_id) % 1000 / 1000.0
        
        if label == 1:
            # Illicit: 0.75 - 0.95 (high risk with variation)
            return 0.75 + hash_val * 0.20
        else:
            # Clean: 0.05 - 0.35 (low risk with variation)
            return 0.05 + hash_val * 0.30
    
    # Build nodes
    print("🔵 Building nodes...")
    nodes = []
    for wallet_id in unique_wallets:
        node = {
            'id': wallet_id,
            'suspicionScore': float(infer_score(wallet_id)),
            'label': int(infer_label(wallet_id)),
            'volume': float(node_volume.get(wallet_id, 0)),
            'inDegree': node_in_degree.get(wallet_id, 0),
            'outDegree': node_out_degree.get(wallet_id, 0),
            'meanTimeDelta': float(node_time_delta.get(wallet_id, 0))
        }
        
        # Add chain-specific data
        if has_chain_data:
            chains = list(node_chains.get(wallet_id, set()))
            node['chainIds'] = chains[:5]  # Limit for JSON size
            node['numChains'] = len(chains)
            initial_amounts = list(node_initial_amounts.get(wallet_id, set()))
            node['initialAmounts'] = [round(a, 2) for a in sorted(initial_amounts, reverse=True)[:3]]
            hops = node_hop_numbers.get(wallet_id, [])
            node['avgHopPosition'] = round(np.mean(hops), 1) if hops else 0
            node['maxHopPosition'] = max(hops) if hops else 0
        
        nodes.append(node)
    
    print(f"   Nodes: {len(nodes):,}")
    
    # Build links
    print("🔗 Building links...")
    links = []
    for _, row in tx_df.iterrows():
        src = row['Source_Wallet_ID']
        dst = row['Dest_Wallet_ID']
        
        link = {
            'source': src,
            'target': dst,
            'amount': float(row['Amount']),
            'sourceScore': float(infer_score(src)),
            'targetScore': float(infer_score(dst))
        }
        
        # Add chain-specific data
        if has_chain_data:
            if pd.notna(row.get('Chain_ID')):
                link['chainId'] = row['Chain_ID']
                link['initialAmount'] = float(row['Initial_Amount']) if pd.notna(row.get('Initial_Amount')) else None
                link['hopNumber'] = int(row['Hop_Number']) if pd.notna(row.get('Hop_Number')) else 0
                link['splitRatio'] = float(row['Split_Ratio']) if pd.notna(row.get('Split_Ratio')) else 1.0
            else:
                link['chainId'] = None
                link['hopNumber'] = 0
        
        links.append(link)
    
    print(f"   Links: {len(links):,}")
    
    # Compute chain statistics
    chain_stats = {}
    if has_chain_data:
        chain_groups = tx_df[tx_df['Chain_ID'].notna()].groupby('Chain_ID')
        for chain_id, group in chain_groups:
            chain_stats[chain_id] = {
                'initialAmount': float(group['Initial_Amount'].iloc[0]) if 'Initial_Amount' in group else 0,
                'maxHops': int(group['Hop_Number'].max()),
                'numTransactions': len(group),
                'numWallets': len(set(group['Source_Wallet_ID']) | set(group['Dest_Wallet_ID']))
            }
    
    # Export JSON
    print(f"💾 Exporting to {output_path}...")
    network_data = {
        'nodes': nodes,
        'links': links,
        'metadata': {
            'totalNodes': len(nodes),
            'totalLinks': len(links),
            'illicitNodes': sum(1 for n in nodes if n['label'] == 1),
            'highRiskNodes': sum(1 for n in nodes if n['suspicionScore'] > 0.8),
            'hasChainData': has_chain_data,
            'uniqueChains': len(chain_stats),
            'maxChainDepth': max([s['maxHops'] for s in chain_stats.values()], default=0)
        },
        'chainStats': chain_stats
    }
    
    # Ensure output directory exists
    import os
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(network_data, f)
    
    print(f"✅ Export complete!")
    print(f"   File size: {os.path.getsize(output_path) / 1e6:.2f} MB")
    print(f"\n📈 Stats:")
    print(f"   High-risk nodes (score > 0.8): {network_data['metadata']['highRiskNodes']:,}")
    print(f"   Illicit nodes: {network_data['metadata']['illicitNodes']:,}")
    if has_chain_data:
        print(f"   Unique chains: {network_data['metadata']['uniqueChains']}")
        print(f"   Max chain depth: {network_data['metadata']['maxChainDepth']}")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Export network data for visualization')
    parser.add_argument('--input', type=str, default='massive_transactions_v2.csv',
                        help='Input transactions CSV (use v2 for chain data)')
    parser.add_argument('--sample', type=int, default=None, 
                        help='Sample size for testing (default: use all)')
    parser.add_argument('--output', type=str, default='dashboard/public/network_data.json',
                        help='Output JSON path')
    args = parser.parse_args()
    
    export_network_data(
        transactions_path=args.input,
        sample_size=args.sample, 
        output_path=args.output
    )

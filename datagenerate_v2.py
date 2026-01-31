"""
Enhanced Data Generator v3 - Mixed Transactions
================================================
Creates realistic data with clean wallet naming (no Origin/Exit).
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import uuid


def generate_chain_id():
    return f"CHAIN_{uuid.uuid4().hex[:8].upper()}"


def generate_mixed_dataset(
    num_normal=200, 
    num_attacks=15,
    max_chain_depth=8
):
    """
    Generate dataset with MIXED connections between clean and illicit wallets.
    """
    edges = []
    labels = []
    
    print("🔵 Phase 1: Creating normal wallets...")
    normal_wallets = [f"W_Clean_{i}" for i in range(num_normal)]
    for w in normal_wallets:
        labels.append({'Wallet_ID': w, 'Label': 0})
    
    # Normal traffic between clean wallets
    for i in range(num_normal * 2):
        src = random.choice(normal_wallets)
        dst = random.choice(normal_wallets)
        if src != dst:
            edges.append({
                'Source_Wallet_ID': src,
                'Dest_Wallet_ID': dst,
                'Timestamp': datetime(2026, 1, 1) + timedelta(minutes=random.randint(0, 50000)),
                'Amount': round(random.uniform(0.01, 20.0), 4),
                'Token_Type': 'BTC',
                'Chain_ID': None,
                'Initial_Amount': None,
                'Hop_Number': 0,
                'Split_Ratio': 1.0
            })
    
    print("🔴 Phase 2: Creating laundering attacks with MIXED connections...")
    
    for attack_id in range(num_attacks):
        chain_id = generate_chain_id()
        initial_amount = random.uniform(5000, 30000)
        chain_depth = random.randint(3, max_chain_depth)
        
        print(f"   Attack {attack_id+1}/{num_attacks}: depth={chain_depth}, amount=${initial_amount:.0f}")
        
        # Source wallet (renamed from Origin)
        source_wallet = f"W_A{attack_id}_S0"
        labels.append({'Wallet_ID': source_wallet, 'Label': 1})
        
        # Source receives money FROM clean wallets first (to mix colors)
        for i in range(random.randint(2, 5)):
            clean_sender = random.choice(normal_wallets)
            edges.append({
                'Source_Wallet_ID': clean_sender,
                'Dest_Wallet_ID': source_wallet,
                'Timestamp': datetime(2026, 1, 15) + timedelta(days=-random.randint(1, 30)),
                'Amount': round(random.uniform(500, 3000), 4),
                'Token_Type': 'BTC',
                'Chain_ID': None,
                'Initial_Amount': None,
                'Hop_Number': 0,
                'Split_Ratio': 1.0
            })
        
        # Layering: create mule chain
        current_layer = [source_wallet]
        current_amounts = {source_wallet: initial_amount}
        base_time = datetime(2026, 2, 1) + timedelta(days=attack_id)
        
        mule_wallets = []
        dest_wallet = f"W_A{attack_id}_D"  # Destination (renamed from Exit)
        
        for hop in range(1, chain_depth + 1):
            next_layer = []
            next_amounts = {}
            
            for wallet in current_layer:
                wallet_amount = current_amounts.get(wallet, 0)
                if wallet_amount <= 0:
                    continue
                
                # Decide split pattern
                if hop == chain_depth:
                    num_targets = 1  # Final hop - consolidate
                elif hop < 3:
                    num_targets = random.randint(2, 4)  # Fan out
                else:
                    num_targets = random.randint(1, 3)  # Mix
                
                splits = np.random.dirichlet(np.ones(num_targets))
                
                for i, split_ratio in enumerate(splits):
                    if hop == chain_depth:
                        new_wallet = dest_wallet
                    else:
                        new_wallet = f"W_A{attack_id}_H{hop}_{len(mule_wallets)}"
                        mule_wallets.append(new_wallet)
                    
                    if new_wallet not in [l['Wallet_ID'] for l in labels]:
                        labels.append({'Wallet_ID': new_wallet, 'Label': 1})
                    
                    split_amount = wallet_amount * split_ratio * 0.995
                    next_amounts[new_wallet] = next_amounts.get(new_wallet, 0) + split_amount
                    
                    if new_wallet not in next_layer:
                        next_layer.append(new_wallet)
                    
                    edges.append({
                        'Source_Wallet_ID': wallet,
                        'Dest_Wallet_ID': new_wallet,
                        'Timestamp': base_time + timedelta(hours=hop*12 + random.randint(0, 6)),
                        'Amount': round(split_amount, 4),
                        'Token_Type': random.choice(['BTC', 'ETH']),
                        'Chain_ID': chain_id,
                        'Initial_Amount': round(initial_amount, 4),
                        'Hop_Number': hop,
                        'Split_Ratio': round(split_ratio, 6)
                    })
            
            current_layer = next_layer
            current_amounts = next_amounts
        
        # Mules interact with clean wallets
        for mule in random.sample(mule_wallets, min(len(mule_wallets), 5)):
            clean_target = random.choice(normal_wallets)
            edges.append({
                'Source_Wallet_ID': mule,
                'Dest_Wallet_ID': clean_target,
                'Timestamp': base_time + timedelta(hours=random.randint(24, 72)),
                'Amount': round(random.uniform(10, 200), 4),
                'Token_Type': 'BTC',
                'Chain_ID': None,
                'Initial_Amount': None,
                'Hop_Number': 0,
                'Split_Ratio': 1.0
            })
        
        # Destination wallet sends to clean wallets (cashing out)
        for i in range(random.randint(3, 8)):
            clean_receiver = random.choice(normal_wallets)
            edges.append({
                'Source_Wallet_ID': dest_wallet,
                'Dest_Wallet_ID': clean_receiver,
                'Timestamp': base_time + timedelta(days=chain_depth + random.randint(1, 5)),
                'Amount': round(random.uniform(500, 2000), 4),
                'Token_Type': 'USDT',
                'Chain_ID': None,
                'Initial_Amount': None,
                'Hop_Number': 0,
                'Split_Ratio': 1.0
            })

    print("\n✅ Generation complete!")
    return pd.DataFrame(edges), pd.DataFrame(labels)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--normal', type=int, default=200, help='Number of normal wallets')
    parser.add_argument('--attacks', type=int, default=15, help='Number of attack chains')
    parser.add_argument('--max-depth', type=int, default=8, help='Max chain depth')
    args = parser.parse_args()
    
    df_tx, df_lb = generate_mixed_dataset(
        num_normal=args.normal,
        num_attacks=args.attacks,
        max_chain_depth=args.max_depth
    )
    
    df_tx.to_csv('massive_transactions_v2.csv', index=False)
    df_lb.to_csv('massive_labels_v2.csv', index=False)
    
    # Stats
    illicit = df_lb[df_lb['Label'] == 1]['Wallet_ID'].tolist()
    clean = df_lb[df_lb['Label'] == 0]['Wallet_ID'].tolist()
    
    mixed_edges = 0
    for _, row in df_tx.iterrows():
        src_illicit = row['Source_Wallet_ID'] in illicit
        dst_illicit = row['Dest_Wallet_ID'] in illicit
        if src_illicit != dst_illicit:
            mixed_edges += 1
    
    print(f"\n📊 Dataset Statistics:")
    print(f"   Transactions: {len(df_tx):,}")
    print(f"   Wallets: {len(df_lb):,}")
    print(f"   Clean wallets: {len(clean)}")
    print(f"   Illicit wallets: {len(illicit)}")
    print(f"   Mixed edges (clean↔illicit): {mixed_edges}")
    print(f"   Unique Chains: {df_tx['Chain_ID'].nunique()}")

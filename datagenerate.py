import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

def generate_massive_dataset(num_normal=100000, num_attacks=500):
    edges = []
    labels = []
    
    # 1. High-Volume Normal Traffic (The "Haystack")
    for i in range(num_normal):
        wallet_id = f"W_Normal_{i}"
        labels.append({'Wallet_ID': wallet_id, 'Label': 0})
        
        # Simulating active and passive users
        num_tx = random.choices([1, 2, 3, 4, 10], weights=[40, 30, 15, 10, 5])[0]
        for _ in range(num_tx):
            target = f"W_Normal_{random.randint(0, num_normal-1)}"
            edges.append({
                'Source_Wallet_ID': wallet_id,
                'Dest_Wallet_ID': target,
                'Timestamp': datetime(2026, 1, 1) + timedelta(minutes=random.randint(0, 100000)),
                'Amount': round(random.uniform(0.001, 15.0), 4),
                'Token_Type': 'BTC'
            })

    # 2. Sophisticated Illicit Clusters (The "Needle")
    for s in range(num_attacks):
        src = f"W_Illicit_Src_{s}"
        dest = f"W_Illicit_Dest_{s}"
        labels.append({'Wallet_ID': src, 'Label': 1})
        labels.append({'Wallet_ID': dest, 'Label': 1})
        
        total_dirty_money = random.uniform(2000, 20000)
        num_mules = random.randint(30, 100) # Increased mule count for complex fan-out
        
        mules = []
        for m in range(num_mules):
            mule_id = f"W_Mule_{s}_{m}"
            mules.append(mule_id)
            labels.append({'Wallet_ID': mule_id, 'Label': 1})
            
            # Fan-out with peeling
            edges.append({
                'Source_Wallet_ID': src,
                'Dest_Wallet_ID': mule_id,
                'Timestamp': datetime(2026, 2, 1) + timedelta(minutes=m*2),
                'Amount': round((total_dirty_money / num_mules) * 0.995, 4),
                'Token_Type': 'BTC'
            })
            
        # Fan-in aggregation
        for m_id in mules:
            edges.append({
                'Source_Wallet_ID': m_id,
                'Dest_Wallet_ID': dest,
                'Timestamp': datetime(2026, 2, 10) + timedelta(hours=random.randint(1, 120)),
                'Amount': round((total_dirty_money / num_mules) * 0.92, 4),
                'Token_Type': 'BTC'
            })

    return pd.DataFrame(edges), pd.DataFrame(labels)

# Generate and Save
df_tx, df_lb = generate_massive_dataset()
df_tx.to_csv('massive_transactions.csv', index=False)
df_lb.to_csv('massive_labels.csv', index=False)

print(f"🔥 Dataset Ready: {len(df_tx)} Transactions | {len(df_lb)} Wallets")
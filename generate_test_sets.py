"""
Generate sample test datasets in XLSX format for demonstration
"""
import pandas as pd
import random
import os

def generate_test_sets():
    """Create multiple sample XLSX files from the main dataset"""
    
    # Load main dataset
    print("📂 Loading main dataset...")
    tx_df = pd.read_csv('massive_transactions_v2.csv')
    labels_df = pd.read_csv('massive_labels_v2.csv')
    
    # Create test_sets folder
    os.makedirs('test_sets', exist_ok=True)
    
    # Test Set 1: Small Clean Network (50 transactions, mostly clean)
    print("📝 Generating Test Set 1: Small Clean Network...")
    clean_wallets = labels_df[labels_df['Label'] == 0]['Wallet_ID'].tolist()
    clean_tx = tx_df[
        tx_df['Source_Wallet_ID'].isin(clean_wallets) & 
        tx_df['Dest_Wallet_ID'].isin(clean_wallets)
    ].head(50)
    
    with pd.ExcelWriter('test_sets/test1_clean_network.xlsx', engine='openpyxl') as writer:
        clean_tx.to_excel(writer, sheet_name='Transactions', index=False)
        labels_subset = labels_df[labels_df['Wallet_ID'].isin(
            set(clean_tx['Source_Wallet_ID']) | set(clean_tx['Dest_Wallet_ID'])
        )]
        labels_subset.to_excel(writer, sheet_name='Labels', index=False)
    
    # Test Set 2: Single Chain Attack (1 complete laundering chain)
    print("📝 Generating Test Set 2: Single Chain Attack...")
    chains = tx_df[tx_df['Chain_ID'].notna()]['Chain_ID'].unique()
    if len(chains) > 0:
        selected_chain = chains[0]
        chain_tx = tx_df[tx_df['Chain_ID'] == selected_chain]
        # Add some clean context transactions
        chain_wallets = set(chain_tx['Source_Wallet_ID']) | set(chain_tx['Dest_Wallet_ID'])
        context_tx = tx_df[
            (tx_df['Source_Wallet_ID'].isin(chain_wallets) | 
             tx_df['Dest_Wallet_ID'].isin(chain_wallets)) &
            tx_df['Chain_ID'].isna()
        ].head(20)
        combined_tx = pd.concat([chain_tx, context_tx])
        
        with pd.ExcelWriter('test_sets/test2_single_chain.xlsx', engine='openpyxl') as writer:
            combined_tx.to_excel(writer, sheet_name='Transactions', index=False)
            labels_subset = labels_df[labels_df['Wallet_ID'].isin(
                set(combined_tx['Source_Wallet_ID']) | set(combined_tx['Dest_Wallet_ID'])
            )]
            labels_subset.to_excel(writer, sheet_name='Labels', index=False)
    
    # Test Set 3: Mixed Network (100 transactions, mix of clean and illicit)
    print("📝 Generating Test Set 3: Mixed Network...")
    # Get 2 chains
    if len(chains) >= 2:
        selected_chains = chains[:2]
        chains_tx = tx_df[tx_df['Chain_ID'].isin(selected_chains)]
    else:
        chains_tx = tx_df[tx_df['Chain_ID'].notna()].head(50)
    
    # Add clean transactions
    clean_sample = tx_df[tx_df['Chain_ID'].isna()].sample(n=min(50, len(tx_df[tx_df['Chain_ID'].isna()])))
    mixed_tx = pd.concat([chains_tx, clean_sample]).head(100)
    
    with pd.ExcelWriter('test_sets/test3_mixed_network.xlsx', engine='openpyxl') as writer:
        mixed_tx.to_excel(writer, sheet_name='Transactions', index=False)
        labels_subset = labels_df[labels_df['Wallet_ID'].isin(
            set(mixed_tx['Source_Wallet_ID']) | set(mixed_tx['Dest_Wallet_ID'])
        )]
        labels_subset.to_excel(writer, sheet_name='Labels', index=False)
    
    # Test Set 4: Large Complex Network (all data)
    print("📝 Generating Test Set 4: Full Dataset...")
    with pd.ExcelWriter('test_sets/test4_full_dataset.xlsx', engine='openpyxl') as writer:
        tx_df.to_excel(writer, sheet_name='Transactions', index=False)
        labels_df.to_excel(writer, sheet_name='Labels', index=False)
    
    # Test Set 5: High Risk Only (transactions involving high-suspicion wallets)
    print("📝 Generating Test Set 5: High Risk Network...")
    # Get all chain transactions (they're the high risk ones)
    high_risk_tx = tx_df[tx_df['Chain_ID'].notna()].head(80)
    
    with pd.ExcelWriter('test_sets/test5_high_risk.xlsx', engine='openpyxl') as writer:
        high_risk_tx.to_excel(writer, sheet_name='Transactions', index=False)
        labels_subset = labels_df[labels_df['Wallet_ID'].isin(
            set(high_risk_tx['Source_Wallet_ID']) | set(high_risk_tx['Dest_Wallet_ID'])
        )]
        labels_subset.to_excel(writer, sheet_name='Labels', index=False)
    
    print("\n✅ Test sets generated successfully!")
    print(f"   Test Set 1: {len(clean_tx)} transactions (Clean Network)")
    if 'chain_tx' in locals():
        print(f"   Test Set 2: {len(combined_tx)} transactions (Single Chain)")
    print(f"   Test Set 3: {len(mixed_tx)} transactions (Mixed Network)")
    print(f"   Test Set 4: {len(tx_df)} transactions (Full Dataset)")
    print(f"   Test Set 5: {len(high_risk_tx)} transactions (High Risk)")
    print(f"\n📁 Files saved in: test_sets/")

if __name__ == '__main__':
    generate_test_sets()

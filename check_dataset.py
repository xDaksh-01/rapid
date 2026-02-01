import pandas as pd

tx = pd.read_csv('massive_transactions_v2.csv')
labels = pd.read_csv('massive_labels_v2.csv')

print(f'Transactions: {len(tx)}')
print(f'Total wallets: {len(labels)}')
print(f'Clean wallets: {(labels["Label"] == 0).sum()}')
print(f'Illicit wallets: {(labels["Label"] == 1).sum()}')

if 'Chain_ID' in tx.columns:
    print(f'Chains: {tx["Chain_ID"].dropna().nunique()}')

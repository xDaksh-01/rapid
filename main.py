"""
The Smurfing Hunter - Main Training Script
===========================================
Complete pipeline for training GraphSAGE model on blockchain transactions
to detect money laundering patterns (Fan-out/Fan-in).

Outputs:
- Trained model checkpoint
- Suspicion scores for all wallets
- 2-hop subgraph extraction for visualization
"""

import os
import sys
import argparse
import pandas as pd
import torch
import torch.nn.functional as F
from torch.optim import Adam
from torch.optim.lr_scheduler import ReduceLROnPlateau
from torch_geometric.utils import k_hop_subgraph
from sklearn.metrics import classification_report, roc_auc_score

# Add src to path
sys.path.insert(0, os.path.dirname(__file__))

from src.model import SmurfingHunter
from src.data_loader import load_transaction_graph


def train_epoch_fullbatch(model, data, optimizer, device):
    """Train for one epoch using full-batch training."""
    model.train()
    data = data.to(device)
    
    optimizer.zero_grad()
    
    # Forward pass on entire graph
    out = model(data.x, data.edge_index)
    
    # Compute loss only on training nodes
    loss = F.cross_entropy(out[data.train_mask], data.y[data.train_mask])
    
    loss.backward()
    optimizer.step()
    
    # Compute accuracy
    pred = out[data.train_mask].argmax(dim=1)
    correct = (pred == data.y[data.train_mask]).sum().item()
    total = data.train_mask.sum().item()
    
    return loss.item(), correct / total


@torch.no_grad()
def evaluate(model, data, device, mask_key='val_mask'):
    """Evaluate model on validation or test set."""
    model.eval()
    data = data.to(device)
    
    out = model(data.x, data.edge_index)
    mask = getattr(data, mask_key)
    
    pred = out[mask].argmax(dim=1)
    y_true = data.y[mask]
    
    acc = (pred == y_true).float().mean().item()
    
    # ROC-AUC for illicit class
    probs = F.softmax(out[mask], dim=1)[:, 1].cpu().numpy()
    try:
        auc = roc_auc_score(y_true.cpu().numpy(), probs)
    except:
        auc = 0.0
    
    return acc, auc


@torch.no_grad()
def compute_suspicion_scores(model, data, idx_to_wallet, device, output_path='suspicion_scores.csv'):
    """
    Compute and save suspicion scores for all wallets.
    
    Suspicion Score = P(illicit) from model softmax output.
    """
    model.eval()
    data = data.to(device)
    
    out = model(data.x, data.edge_index)
    probs = F.softmax(out, dim=1)
    
    # Suspicion score = probability of being illicit (class 1)
    suspicion_scores = probs[:, 1].cpu().numpy()
    
    # Create output DataFrame
    results = []
    for idx in range(data.num_nodes):
        results.append({
            'Wallet_ID': idx_to_wallet[idx],
            'Suspicion_Score': suspicion_scores[idx],
            'Predicted_Label': 1 if suspicion_scores[idx] > 0.5 else 0,
            'True_Label': data.y[idx].item()
        })
    
    df = pd.DataFrame(results)
    df = df.sort_values('Suspicion_Score', ascending=False)
    df.to_csv(output_path, index=False)
    
    print(f"\n📊 Suspicion scores saved to: {output_path}")
    print(f"   Top 10 most suspicious wallets:")
    print(df.head(10).to_string(index=False))
    
    return df


def extract_2hop_subgraph(data, target_wallet_id, wallet_to_idx, idx_to_wallet):
    """
    Extract a 2-hop subgraph around a target wallet for visualization.
    
    Args:
        data: PyG Data object
        target_wallet_id: Wallet ID string to center on
        wallet_to_idx: Wallet to index mapping
        idx_to_wallet: Index to wallet mapping
        
    Returns:
        subgraph_nodes: List of wallet IDs in subgraph
        subgraph_edges: List of (source, dest) tuples
        node_labels: Dictionary of node -> label
    """
    if target_wallet_id not in wallet_to_idx:
        print(f"⚠️  Wallet {target_wallet_id} not found in graph")
        return None, None, None
    
    target_idx = wallet_to_idx[target_wallet_id]
    
    # Use PyG's k_hop_subgraph
    subset, sub_edge_index, mapping, edge_mask = k_hop_subgraph(
        node_idx=target_idx,
        num_hops=2,
        edge_index=data.edge_index,
        relabel_nodes=True,
        num_nodes=data.num_nodes
    )
    
    # Convert to wallet IDs
    subgraph_nodes = [idx_to_wallet[idx.item()] for idx in subset]
    
    # Convert edge index to list of tuples with wallet IDs
    subgraph_edges = []
    for i in range(sub_edge_index.size(1)):
        src_local = sub_edge_index[0, i].item()
        dst_local = sub_edge_index[1, i].item()
        src_wallet = idx_to_wallet[subset[src_local].item()]
        dst_wallet = idx_to_wallet[subset[dst_local].item()]
        subgraph_edges.append((src_wallet, dst_wallet))
    
    # Node labels
    node_labels = {
        idx_to_wallet[subset[i].item()]: data.y[subset[i]].item()
        for i in range(len(subset))
    }
    
    print(f"\n🔍 2-hop subgraph around '{target_wallet_id}':")
    print(f"   Nodes: {len(subgraph_nodes)}")
    print(f"   Edges: {len(subgraph_edges)}")
    print(f"   Illicit nodes: {sum(1 for l in node_labels.values() if l == 1)}")
    
    return subgraph_nodes, subgraph_edges, node_labels


def main():
    parser = argparse.ArgumentParser(description='The Smurfing Hunter - Train GraphSAGE for AML')
    parser.add_argument('--epochs', type=int, default=50, help='Training epochs')
    parser.add_argument('--lr', type=float, default=0.01, help='Learning rate')
    parser.add_argument('--hidden', type=int, default=128, help='Hidden dimension')
    parser.add_argument('--device', type=str, default='auto', help='Device (cuda/cpu/auto)')
    parser.add_argument('--extract_subgraph', type=str, default=None, 
                        help='Wallet ID to extract 2-hop subgraph for')
    args = parser.parse_args()
    
    # Device setup
    if args.device == 'auto':
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    else:
        device = torch.device(args.device)
    
    print("=" * 60)
    print("🎯 THE SMURFING HUNTER - Blockchain AML Detection")
    print("=" * 60)
    print(f"🖥️  Device: {device}")
    if device.type == 'cuda':
        print(f"   GPU: {torch.cuda.get_device_name(0)}")
        print(f"   VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    
    # Load data
    print("\n" + "=" * 60)
    data, wallet_to_idx, idx_to_wallet = load_transaction_graph()
    
    # Initialize model
    print("\n" + "=" * 60)
    print("🏗️  Building model...")
    model = SmurfingHunter(
        input_dim=data.x.size(1),
        hidden_dim=args.hidden,
        num_classes=2,
        dropout=0.3
    ).to(device)
    
    total_params = sum(p.numel() for p in model.parameters())
    print(f"   Parameters: {total_params:,}")
    
    # Optimizer and scheduler
    optimizer = Adam(model.parameters(), lr=args.lr, weight_decay=1e-5)
    scheduler = ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=5)
    
    # Training loop (full-batch)
    print("\n" + "=" * 60)
    print("🚀 Starting training (full-batch mode)...")
    print("-" * 60)
    
    best_auc = 0
    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = train_epoch_fullbatch(model, data, optimizer, device)
        val_acc, val_auc = evaluate(model, data, device, 'val_mask')
        
        scheduler.step(val_auc)
        
        if val_auc > best_auc:
            best_auc = val_auc
            torch.save(model.state_dict(), 'best_model.pt')
        
        if epoch % 5 == 0 or epoch == 1:
            print(f"Epoch {epoch:3d} | Loss: {train_loss:.4f} | "
                  f"Train Acc: {train_acc:.4f} | Val Acc: {val_acc:.4f} | "
                  f"Val AUC: {val_auc:.4f}")
    
    # Load best model
    model.load_state_dict(torch.load('best_model.pt', weights_only=True))
    
    # Final evaluation
    print("\n" + "=" * 60)
    print("📈 Final Evaluation (Test Set)")
    print("-" * 60)
    test_acc, test_auc = evaluate(model, data, device, 'test_mask')
    print(f"Test Accuracy: {test_acc:.4f}")
    print(f"Test ROC-AUC:  {test_auc:.4f}")
    
    # Detailed classification report
    model.eval()
    data = data.to(device)
    with torch.no_grad():
        out = model(data.x, data.edge_index)
        pred = out[data.test_mask].argmax(dim=1).cpu()
        y_true = data.y[data.test_mask].cpu()
    
    print("\nClassification Report:")
    print(classification_report(y_true, pred, target_names=['Normal', 'Illicit']))
    
    # Compute suspicion scores
    print("\n" + "=" * 60)
    print("🔎 Computing Suspicion Scores...")
    compute_suspicion_scores(model, data, idx_to_wallet, device)
    
    # Optional: Extract subgraph for visualization
    if args.extract_subgraph:
        print("\n" + "=" * 60)
        print("🌐 Extracting 2-hop Subgraph...")
        nodes, edges, labels = extract_2hop_subgraph(
            data.cpu(), args.extract_subgraph, wallet_to_idx, idx_to_wallet
        )
        
        if nodes:
            # Save subgraph to files
            pd.DataFrame({'Wallet_ID': nodes, 'Label': [labels[n] for n in nodes]}).to_csv(
                f'subgraph_{args.extract_subgraph}_nodes.csv', index=False
            )
            pd.DataFrame(edges, columns=['Source', 'Dest']).to_csv(
                f'subgraph_{args.extract_subgraph}_edges.csv', index=False
            )
            print(f"   Subgraph saved to subgraph_{args.extract_subgraph}_*.csv")
    
    print("\n" + "=" * 60)
    print("✅ Training complete! Best model saved to 'best_model.pt'")
    print("=" * 60)


if __name__ == '__main__':
    main()

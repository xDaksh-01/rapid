"""
The Smurfing Hunter - Data Loader
=================================
Memory-efficient data loading using PyTorch Geometric's NeighborLoader
for handling 500K+ edge transaction graphs on RTX 4060 (8GB VRAM).
"""

import os
import pandas as pd
import torch
from torch_geometric.data import Data
from torch_geometric.loader import NeighborLoader
from typing import Dict, Tuple, Optional

from .utils import compute_node_features


def load_transaction_graph(
    transactions_path: str = 'massive_transactions.csv',
    labels_path: str = 'massive_labels.csv',
    compute_features: bool = True
) -> Tuple[Data, Dict[str, int], Dict[int, str]]:
    """
    Load transaction graph from CSV files into PyG Data object.
    
    Args:
        transactions_path: Path to transaction CSV
        labels_path: Path to labels CSV
        compute_features: Whether to compute node features
        
    Returns:
        data: PyG Data object with node features, edge_index, and labels
        wallet_to_idx: Mapping from wallet ID to node index
        idx_to_wallet: Reverse mapping from node index to wallet ID
    """
    # Load CSVs
    print("📂 Loading transaction data...")
    tx_df = pd.read_csv(transactions_path)
    labels_df = pd.read_csv(labels_path)
    
    print(f"   Transactions: {len(tx_df):,}")
    print(f"   Labeled wallets: {len(labels_df):,}")
    
    # Build wallet vocabulary (all unique wallets)
    all_wallets = set(tx_df['Source_Wallet_ID'].unique()) | \
                  set(tx_df['Dest_Wallet_ID'].unique()) | \
                  set(labels_df['Wallet_ID'].unique())
    
    wallet_to_idx = {w: i for i, w in enumerate(sorted(all_wallets))}
    idx_to_wallet = {i: w for w, i in wallet_to_idx.items()}
    num_nodes = len(wallet_to_idx)
    
    print(f"   Total unique wallets: {num_nodes:,}")
    
    # Build edge index
    print("🔗 Building edge index...")
    source_indices = tx_df['Source_Wallet_ID'].map(wallet_to_idx).values
    dest_indices = tx_df['Dest_Wallet_ID'].map(wallet_to_idx).values
    
    edge_index = torch.tensor(
        [source_indices, dest_indices],
        dtype=torch.long
    )
    
    # Build label tensor (default to 0 for unlabeled)
    print("🏷️  Processing labels...")
    y = torch.zeros(num_nodes, dtype=torch.long)
    for _, row in labels_df.iterrows():
        if row['Wallet_ID'] in wallet_to_idx:
            y[wallet_to_idx[row['Wallet_ID']]] = int(row['Label'])
    
    num_illicit = (y == 1).sum().item()
    print(f"   Illicit wallets: {num_illicit:,} ({100*num_illicit/num_nodes:.2f}%)")
    
    # Compute node features
    if compute_features:
        print("⚙️  Computing node features...")
        x = compute_node_features(
            edge_index=edge_index,
            transactions_df=tx_df,
            wallet_to_idx=wallet_to_idx,
            num_nodes=num_nodes,
            normalize=True
        )
    else:
        # Fallback: use simple degree-based features
        x = torch.zeros(num_nodes, 1, dtype=torch.float32)
    
    # Create train/val/test masks (stratified)
    print("📊 Creating train/val/test splits...")
    train_mask, val_mask, test_mask = create_stratified_masks(
        y, train_ratio=0.6, val_ratio=0.2
    )
    
    # Build PyG Data object
    data = Data(
        x=x,
        edge_index=edge_index,
        y=y,
        train_mask=train_mask,
        val_mask=val_mask,
        test_mask=test_mask,
        num_nodes=num_nodes
    )
    
    print(f"✅ Graph loaded: {data.num_nodes:,} nodes, {data.num_edges:,} edges")
    
    return data, wallet_to_idx, idx_to_wallet


def create_stratified_masks(
    y: torch.Tensor,
    train_ratio: float = 0.6,
    val_ratio: float = 0.2
) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """
    Create stratified train/val/test masks preserving class distribution.
    
    Args:
        y: Label tensor
        train_ratio: Proportion for training
        val_ratio: Proportion for validation
        
    Returns:
        train_mask, val_mask, test_mask (boolean tensors)
    """
    num_nodes = y.size(0)
    
    train_mask = torch.zeros(num_nodes, dtype=torch.bool)
    val_mask = torch.zeros(num_nodes, dtype=torch.bool)
    test_mask = torch.zeros(num_nodes, dtype=torch.bool)
    
    # Stratify by class
    for label in y.unique():
        label_indices = (y == label).nonzero(as_tuple=True)[0]
        n = len(label_indices)
        
        # Shuffle
        perm = torch.randperm(n)
        label_indices = label_indices[perm]
        
        # Split
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)
        
        train_mask[label_indices[:n_train]] = True
        val_mask[label_indices[n_train:n_train + n_val]] = True
        test_mask[label_indices[n_train + n_val:]] = True
    
    return train_mask, val_mask, test_mask


def get_neighbor_loader(
    data: Data,
    batch_size: int = 512,
    num_neighbors: list = [15, 10],
    shuffle: bool = True,
    num_workers: int = 0,
    mask_key: str = 'train_mask'
) -> NeighborLoader:
    """
    Create a NeighborLoader for mini-batch training.
    
    Optimized for RTX 4060 (8GB VRAM):
    - Conservative batch size (512)
    - 2-hop sampling with [15, 10] neighbors
    - No workers on Windows for stability
    
    Args:
        data: PyG Data object
        batch_size: Number of target nodes per batch
        num_neighbors: Neighbors to sample per hop
        shuffle: Whether to shuffle nodes
        num_workers: Number of data loading workers
        mask_key: Which mask to use for input nodes
        
    Returns:
        NeighborLoader instance
    """
    # Get input nodes based on mask
    if mask_key and hasattr(data, mask_key):
        input_nodes = getattr(data, mask_key).nonzero(as_tuple=True)[0]
    else:
        input_nodes = None
    
    loader = NeighborLoader(
        data,
        num_neighbors=num_neighbors,
        batch_size=batch_size,
        input_nodes=input_nodes,
        shuffle=shuffle,
        num_workers=num_workers,
        pin_memory=True if torch.cuda.is_available() else False
    )
    
    return loader


def get_full_loader(
    data: Data,
    batch_size: int = 2048,
    num_neighbors: list = [-1, -1]
) -> NeighborLoader:
    """
    Create a NeighborLoader for inference with all neighbors.
    Uses larger batch size since no gradients needed.
    
    Args:
        data: PyG Data object
        batch_size: Number of target nodes per batch
        num_neighbors: -1 means all neighbors
        
    Returns:
        NeighborLoader for inference
    """
    loader = NeighborLoader(
        data,
        num_neighbors=num_neighbors,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0
    )
    
    return loader

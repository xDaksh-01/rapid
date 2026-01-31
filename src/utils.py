"""
The Smurfing Hunter - Utility Functions
========================================
Feature engineering functions to calculate anti-obfuscation node features
from blockchain transaction data.
"""

import numpy as np
import pandas as pd
import torch
from typing import Dict, Tuple, Optional
from collections import defaultdict


def calculate_degree_features(
    edge_index: torch.Tensor,
    num_nodes: int
) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Calculate in-degree and out-degree for each node.
    
    Fan-out sources have high out-degree (splitting funds).
    Fan-in destinations have high in-degree (aggregating funds).
    
    Args:
        edge_index: Edge connectivity [2, num_edges]
        num_nodes: Total number of nodes
        
    Returns:
        in_degree: [num_nodes] tensor
        out_degree: [num_nodes] tensor
    """
    source_nodes = edge_index[0]
    dest_nodes = edge_index[1]
    
    # Out-degree: count edges leaving each node
    out_degree = torch.zeros(num_nodes, dtype=torch.float32)
    out_degree.scatter_add_(0, source_nodes, torch.ones_like(source_nodes, dtype=torch.float32))
    
    # In-degree: count edges entering each node
    in_degree = torch.zeros(num_nodes, dtype=torch.float32)
    in_degree.scatter_add_(0, dest_nodes, torch.ones_like(dest_nodes, dtype=torch.float32))
    
    return in_degree, out_degree


def calculate_time_delta_features(
    transactions_df: pd.DataFrame,
    wallet_to_idx: Dict[str, int],
    num_nodes: int
) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Calculate time delta statistics between transactions for each wallet.
    
    Smurfing transactions are typically tightly clustered in time with
    low variance, while normal activity has irregular patterns.
    
    Args:
        transactions_df: DataFrame with 'Source_Wallet_ID', 'Timestamp' columns
        wallet_to_idx: Mapping from wallet ID to node index
        num_nodes: Total number of nodes
        
    Returns:
        time_delta_mean: [num_nodes] avg time gap in hours
        time_delta_std: [num_nodes] std dev of time gaps
    """
    # Convert timestamps to datetime
    if not pd.api.types.is_datetime64_any_dtype(transactions_df['Timestamp']):
        transactions_df = transactions_df.copy()
        transactions_df['Timestamp'] = pd.to_datetime(transactions_df['Timestamp'])
    
    # Group transactions by source wallet
    time_deltas_per_wallet = defaultdict(list)
    
    for wallet_id, group in transactions_df.groupby('Source_Wallet_ID'):
        if wallet_id not in wallet_to_idx:
            continue
        
        timestamps = group['Timestamp'].sort_values()
        if len(timestamps) > 1:
            # Calculate time deltas in hours
            deltas = timestamps.diff().dropna().dt.total_seconds() / 3600.0
            time_deltas_per_wallet[wallet_to_idx[wallet_id]] = deltas.tolist()
    
    # Initialize feature tensors
    time_delta_mean = torch.zeros(num_nodes, dtype=torch.float32)
    time_delta_std = torch.zeros(num_nodes, dtype=torch.float32)
    
    for node_idx, deltas in time_deltas_per_wallet.items():
        if len(deltas) > 0:
            time_delta_mean[node_idx] = np.mean(deltas)
            time_delta_std[node_idx] = np.std(deltas) if len(deltas) > 1 else 0.0
    
    return time_delta_mean, time_delta_std


def calculate_amount_features(
    transactions_df: pd.DataFrame,
    wallet_to_idx: Dict[str, int],
    num_nodes: int
) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Calculate transaction amount statistics for each wallet.
    
    Smurfing often splits funds into similar-sized chunks, resulting in
    low amount variance. Also detect unusually high volume wallets.
    
    Args:
        transactions_df: DataFrame with 'Source_Wallet_ID', 'Amount' columns
        wallet_to_idx: Mapping from wallet ID to node index
        num_nodes: Total number of nodes
        
    Returns:
        amount_mean: [num_nodes] average transaction amount
        amount_std: [num_nodes] std dev of transaction amounts
    """
    amount_mean = torch.zeros(num_nodes, dtype=torch.float32)
    amount_std = torch.zeros(num_nodes, dtype=torch.float32)
    
    for wallet_id, group in transactions_df.groupby('Source_Wallet_ID'):
        if wallet_id not in wallet_to_idx:
            continue
        
        amounts = group['Amount'].values
        node_idx = wallet_to_idx[wallet_id]
        
        amount_mean[node_idx] = np.mean(amounts)
        amount_std[node_idx] = np.std(amounts) if len(amounts) > 1 else 0.0
    
    return amount_mean, amount_std


def compute_node_features(
    edge_index: torch.Tensor,
    transactions_df: pd.DataFrame,
    wallet_to_idx: Dict[str, int],
    num_nodes: int,
    normalize: bool = True
) -> torch.Tensor:
    """
    Compute all node features for the transaction graph.
    
    Features (6 total):
        1. In-degree (normalized)
        2. Out-degree (normalized)
        3. Time delta mean
        4. Time delta std
        5. Amount mean
        6. Amount std
    
    Args:
        edge_index: Edge connectivity tensor
        transactions_df: Transaction DataFrame
        wallet_to_idx: Wallet ID to node index mapping
        num_nodes: Total number of nodes
        normalize: Whether to normalize features (recommended)
        
    Returns:
        Node feature matrix [num_nodes, 6]
    """
    # Calculate individual feature groups
    in_degree, out_degree = calculate_degree_features(edge_index, num_nodes)
    time_mean, time_std = calculate_time_delta_features(transactions_df, wallet_to_idx, num_nodes)
    amount_mean, amount_std = calculate_amount_features(transactions_df, wallet_to_idx, num_nodes)
    
    # Stack features
    features = torch.stack([
        in_degree,
        out_degree,
        time_mean,
        time_std,
        amount_mean,
        amount_std
    ], dim=1)
    
    if normalize:
        features = normalize_features(features)
    
    return features


def normalize_features(features: torch.Tensor, eps: float = 1e-8) -> torch.Tensor:
    """
    Z-score normalization of features.
    
    Args:
        features: Feature matrix [num_nodes, num_features]
        eps: Small constant to prevent division by zero
        
    Returns:
        Normalized feature matrix
    """
    mean = features.mean(dim=0, keepdim=True)
    std = features.std(dim=0, keepdim=True)
    
    # Replace zero std with 1 to avoid NaN
    std = torch.where(std < eps, torch.ones_like(std), std)
    
    return (features - mean) / std


def calculate_suspicion_score(
    probs: torch.Tensor,
    in_degree: Optional[torch.Tensor] = None,
    out_degree: Optional[torch.Tensor] = None,
    degree_weight: float = 0.1
) -> torch.Tensor:
    """
    Calculate a composite suspicion score combining model predictions
    and structural features.
    
    Args:
        probs: Model probability for illicit class [num_nodes]
        in_degree: Optional in-degree tensor
        out_degree: Optional out-degree tensor
        degree_weight: Weight for degree-based boosting
        
    Returns:
        Suspicion scores [num_nodes]
    """
    suspicion = probs.clone()
    
    if in_degree is not None and out_degree is not None:
        # Boost score for nodes with unusual degree patterns
        # High fan-out or high fan-in nodes are more suspicious
        degree_anomaly = (in_degree + out_degree) / (in_degree.max() + out_degree.max() + 1e-8)
        suspicion = suspicion + degree_weight * degree_anomaly
        suspicion = torch.clamp(suspicion, 0, 1)
    
    return suspicion

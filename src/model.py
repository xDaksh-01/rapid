"""
The Smurfing Hunter - GraphSAGE Model
=====================================
2-layer GraphSAGE model optimized for node classification in blockchain
transaction graphs to detect money laundering (Fan-out/Fan-in patterns).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv


class SmurfingHunter(nn.Module):
    """
    GraphSAGE-based model for detecting suspicious wallet activity.
    
    Architecture:
        - Layer 1: input_dim -> hidden_dim (mean aggregation)
        - Layer 2: hidden_dim -> hidden_dim//2 (mean aggregation)
        - Classifier: hidden_dim//2 -> num_classes
    
    Args:
        input_dim: Number of input features per node
        hidden_dim: Hidden layer dimension (default: 128)
        num_classes: Number of output classes (default: 2 for binary)
        dropout: Dropout probability (default: 0.3)
    """
    
    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 128,
        num_classes: int = 2,
        dropout: float = 0.3
    ):
        super(SmurfingHunter, self).__init__()
        
        # GraphSAGE convolution layers with mean aggregation
        self.conv1 = SAGEConv(input_dim, hidden_dim, aggr='mean')
        self.conv2 = SAGEConv(hidden_dim, hidden_dim // 2, aggr='mean')
        
        # Batch normalization for stable training
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.bn2 = nn.BatchNorm1d(hidden_dim // 2)
        
        # Classification head
        self.classifier = nn.Linear(hidden_dim // 2, num_classes)
        
        self.dropout = dropout
    
    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        """
        Forward pass through the GraphSAGE layers.
        
        Args:
            x: Node feature matrix [num_nodes, input_dim]
            edge_index: Edge connectivity [2, num_edges]
            
        Returns:
            Class logits [num_nodes, num_classes]
        """
        # Layer 1: SAGE + BN + ReLU + Dropout
        x = self.conv1(x, edge_index)
        x = self.bn1(x)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        
        # Layer 2: SAGE + BN + ReLU + Dropout
        x = self.conv2(x, edge_index)
        x = self.bn2(x)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        
        # Classification
        logits = self.classifier(x)
        
        return logits
    
    def get_embeddings(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        """
        Extract node embeddings (before classification layer).
        Useful for visualization and downstream analysis.
        
        Args:
            x: Node feature matrix
            edge_index: Edge connectivity
            
        Returns:
            Node embeddings [num_nodes, hidden_dim//2]
        """
        self.eval()
        with torch.no_grad():
            x = self.conv1(x, edge_index)
            x = self.bn1(x)
            x = F.relu(x)
            
            x = self.conv2(x, edge_index)
            x = self.bn2(x)
            x = F.relu(x)
        
        return x
    
    def predict_proba(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        """
        Get probability scores for each class.
        
        Args:
            x: Node feature matrix
            edge_index: Edge connectivity
            
        Returns:
            Class probabilities [num_nodes, num_classes]
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(x, edge_index)
            probs = F.softmax(logits, dim=1)
        return probs

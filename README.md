# The Smurfing Hunter
# Blockchain Money Laundering Detection using Graph Neural Networks

## Overview
This project uses PyTorch Geometric and GraphSAGE to detect "Fan-out / Fan-in" money laundering patterns (smurfing) in blockchain transaction data.

## Requirements

```bash
pip install torch torch_geometric pandas numpy scikit-learn
```

For CUDA support with PyTorch Geometric, follow the [official installation guide](https://pytorch-geometric.readthedocs.io/en/latest/install/installation.html).

## Project Structure

```
├── main.py                    # Main training and inference script
├── src/
│   ├── __init__.py
│   ├── model.py               # 2-layer GraphSAGE model
│   ├── utils.py               # Feature engineering utilities
│   └── data_loader.py         # NeighborLoader for efficient batching
├── massive_transactions.csv   # Transaction ledger
├── massive_labels.csv         # Wallet labels (0=normal, 1=illicit)
└── README.md
```

## Usage

### Training
```bash
python main.py --epochs 50 --batch_size 512 --lr 0.001
```

### With 2-hop Subgraph Extraction
```bash
python main.py --extract_subgraph W_Illicit_Src_0
```

### Options
| Argument | Default | Description |
|----------|---------|-------------|
| `--epochs` | 50 | Training epochs |
| `--lr` | 0.001 | Learning rate |
| `--hidden` | 128 | Hidden layer dimension |
| `--batch_size` | 512 | Batch size (reduce if OOM) |
| `--device` | auto | Device (cuda/cpu/auto) |
| `--extract_subgraph` | None | Wallet ID for subgraph visualization |

## Outputs

- `best_model.pt` - Trained model checkpoint
- `suspicion_scores.csv` - Per-wallet suspicion scores (0-1)
- `subgraph_*_nodes.csv` / `subgraph_*_edges.csv` - Subgraph data for visualization

## GPU Memory Notes

Optimized for RTX 4060 (8GB VRAM). If you encounter OOM errors:
1. Reduce `--batch_size` to 256 or 128
2. Modify `num_neighbors` in `data_loader.py` to `[10, 5]`

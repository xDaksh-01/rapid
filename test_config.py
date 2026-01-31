# ============================================
# The Smurfing Hunter - Test Configuration
# ============================================
# Edit these values to control test dataset size

# Number of normal wallets (background noise)
NORMAL_WALLETS = 200

# Number of simple attacks (2-3 hop chains)
SIMPLE_ATTACKS = 5

# Number of complex attacks (long chains)
COMPLEX_ATTACKS = 10

# Maximum chain depth for complex attacks
MAX_CHAIN_DEPTH = 8

# Total transactions to export for visualization
# Set to None to use all, or a number like 500, 1000
SAMPLE_SIZE = None  # Uses all generated transactions

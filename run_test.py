"""
The Smurfing Hunter - Test Runner
=================================
Run this file to generate a small test dataset and launch the dashboard.

Edit test_config.py to change dataset size.
"""

import subprocess
import sys
import os

# Import config
from test_config import (
    NORMAL_WALLETS,
    SIMPLE_ATTACKS,
    COMPLEX_ATTACKS,
    MAX_CHAIN_DEPTH,
    SAMPLE_SIZE
)


def main():
    print("=" * 60)
    print("🎯 THE SMURFING HUNTER - Test Runner")
    print("=" * 60)
    print(f"\n📋 Config:")
    print(f"   Normal wallets:  {NORMAL_WALLETS}")
    print(f"   Simple attacks:  {SIMPLE_ATTACKS}")
    print(f"   Complex attacks: {COMPLEX_ATTACKS}")
    print(f"   Max chain depth: {MAX_CHAIN_DEPTH}")
    print(f"   Sample size:     {SAMPLE_SIZE or 'All'}")
    
    # Step 1: Generate dataset
    print(f"\n{'='*60}")
    print("📊 Step 1: Generating test dataset...")
    print("-" * 60)
    
    cmd = [
        sys.executable, "datagenerate_v2.py",
        "--normal", str(NORMAL_WALLETS),
        "--simple", str(SIMPLE_ATTACKS),
        "--complex", str(COMPLEX_ATTACKS),
        "--max-depth", str(MAX_CHAIN_DEPTH)
    ]
    
    result = subprocess.run(cmd, cwd=os.path.dirname(__file__) or ".")
    if result.returncode != 0:
        print("❌ Data generation failed!")
        return
    
    # Step 2: Export to JSON
    print(f"\n{'='*60}")
    print("💾 Step 2: Exporting network data...")
    print("-" * 60)
    
    cmd = [
        sys.executable, "export_network.py",
        "--input", "massive_transactions_v2.csv"
    ]
    if SAMPLE_SIZE:
        cmd.extend(["--sample", str(SAMPLE_SIZE)])
    
    result = subprocess.run(cmd, cwd=os.path.dirname(__file__) or ".")
    if result.returncode != 0:
        print("❌ Export failed!")
        return
    
    # Done
    print(f"\n{'='*60}")
    print("✅ Test data ready!")
    print("=" * 60)
    print("\n🌐 Dashboard should auto-refresh at: http://localhost:5173")
    print("\n💡 Tips:")
    print("   - Click nodes to see money flow details")
    print("   - Use threshold slider to filter low-risk nodes")
    print("   - Look for yellow-bordered origin/exit nodes")
    print("\n📝 To change dataset size, edit: test_config.py")


if __name__ == "__main__":
    main()

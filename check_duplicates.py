"""
Check for Duplicate Rows in Transaction and Label Data
======================================================
Analyzes massive_transactions_v2.csv and massive_labels_v2.csv
to identify and count entirely duplicate rows.
"""

import pandas as pd


def check_duplicates(filepath, dataset_name):
    """
    Check for duplicate rows in a CSV file.
    
    Args:
        filepath: Path to CSV file
        dataset_name: Name for display purposes
        
    Returns:
        num_duplicates: Number of duplicate rows
        total_rows: Total number of rows
    """
    print(f"\n{'='*60}")
    print(f"Analyzing: {dataset_name}")
    print(f"File: {filepath}")
    print(f"{'='*60}")
    
    # Load data
    df = pd.read_csv(filepath)
    total_rows = len(df)
    
    # Find duplicates
    duplicates = df.duplicated(keep='first')
    num_duplicates = duplicates.sum()
    num_unique = total_rows - num_duplicates
    
    print(f"Total rows: {total_rows:,}")
    print(f"Unique rows: {num_unique:,}")
    print(f"Duplicate rows: {num_duplicates:,}")
    print(f"Duplicate percentage: {(num_duplicates/total_rows)*100:.2f}%")
    
    # Show sample duplicates if any exist
    if num_duplicates > 0:
        print(f"\nSample duplicate rows (first 5):")
        duplicate_rows = df[duplicates].head(5)
        print(duplicate_rows.to_string(index=False))
    else:
        print("\n✅ No duplicates found!")
    
    return num_duplicates, total_rows


def main():
    print("="*60)
    print("🔍 DUPLICATE ROW CHECKER")
    print("="*60)
    
    # Check transactions
    trans_duplicates, trans_total = check_duplicates(
        'massive_transactions_v2.csv',
        'Transactions Dataset'
    )
    
    # Check labels
    label_duplicates, label_total = check_duplicates(
        'massive_labels_v2.csv',
        'Labels Dataset'
    )
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 SUMMARY")
    print(f"{'='*60}")
    print(f"Transactions: {trans_duplicates:,} duplicates out of {trans_total:,} rows")
    print(f"Labels: {label_duplicates:,} duplicates out of {label_total:,} rows")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()

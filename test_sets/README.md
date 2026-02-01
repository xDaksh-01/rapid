# Sample Test Datasets

This folder contains 5 pre-generated test datasets in XLSX format for testing the Crypto Forensics dashboard.

## Files

### 1. `test1_clean_network.xlsx` (50 transactions)
- **Type**: Clean Network
- **Description**: Contains only transactions between clean wallets
- **Use Case**: Testing the system with legitimate transactions

### 2. `test2_single_chain.xlsx` (68 transactions)
- **Type**: Single Chain Attack
- **Description**: One complete money laundering chain with some clean context transactions
- **Use Case**: Analyzing a single attack pattern

### 3. `test3_mixed_network.xlsx` (100 transactions)
- **Type**: Mixed Network
- **Description**: 2 laundering chains mixed with clean transactions
- **Use Case**: Testing detection in a realistic mixed environment

### 4. `test4_full_dataset.xlsx` (382 transactions)
- **Type**: Full Dataset
- **Description**: Complete dataset with all transactions and chains
- **Use Case**: Full system analysis and performance testing

### 5. `test5_high_risk.xlsx` (80 transactions)
- **Type**: High Risk Network
- **Description**: Only transactions from laundering chains
- **Use Case**: Testing the system with known illicit activity

## How to Use

1. Start the API server:
   ```bash
   python api_server.py
   ```

2. Start the dashboard:
   ```bash
   cd dashboard
   npm run dev
   ```

3. Click "Upload Dataset" in the dashboard

4. Select any test file from this folder

5. The system will:
   - Process the XLSX file
   - Run ML predictions
   - Generate network visualization
   - Display results

## File Structure

Each XLSX file contains two sheets:
- **Transactions**: Transaction data with columns (Source_Wallet_ID, Dest_Wallet_ID, Timestamp, Amount, etc.)
- **Labels**: Ground truth labels (Wallet_ID, Label)

## Regenerating Test Sets

To regenerate these files with updated data:
```bash
python generate_test_sets.py
```

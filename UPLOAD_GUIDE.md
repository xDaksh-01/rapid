# Upload Dataset Feature - Quick Start Guide

## 🎯 Overview

The dashboard now supports uploading custom XLSX datasets for on-the-fly analysis. Upload any transaction dataset and the ML model will process it and generate an interactive visualization.

## 🚀 Getting Started

### 1. Start the API Server

The API server handles file processing and ML inference:

```bash
# Install dependencies first (if not already installed)
pip install openpyxl flask flask-cors

# Start the server
python api_server.py
```

You should see:
```
🚀 Starting API server on http://localhost:5000
📁 Ensure best_model.pt exists in the current directory
```

### 2. Start the Dashboard

In a new terminal:

```bash
cd dashboard
npm run dev
```

### 3. Upload a Dataset

1. Click the **"Upload Dataset"** button in the top-left corner
2. Drag & drop an XLSX file or click to browse
3. Click **"Process & Analyze"**
4. Wait for processing (usually 5-30 seconds)
5. The graph will update with your new data!

## 📁 Test Datasets

5 sample datasets are included in the `test_sets/` folder:

| File | Size | Description |
|------|------|-------------|
| `test1_clean_network.xlsx` | 50 tx | Only clean transactions |
| `test2_single_chain.xlsx` | 68 tx | One laundering chain |
| `test3_mixed_network.xlsx` | 100 tx | Mixed clean + illicit |
| `test4_full_dataset.xlsx` | 382 tx | Complete dataset |
| `test5_high_risk.xlsx` | 80 tx | High-risk transactions only |

## 📊 XLSX File Format

Your XLSX file must have **two sheets**:

### Sheet 1: "Transactions"
Required columns:
- `Source_Wallet_ID` - Source wallet
- `Dest_Wallet_ID` - Destination wallet  
- `Timestamp` - Transaction time (YYYY-MM-DD HH:MM:SS)
- `Amount` - Transaction amount
- `Token_Type` - Token (BTC, ETH, USDT, etc.)

Optional columns (for chain tracking):
- `Chain_ID` - Laundering chain identifier
- `Initial_Amount` - Initial amount in chain
- `Hop_Number` - Hop position in chain
- `Split_Ratio` - Split ratio at this hop

### Sheet 2: "Labels"
Required columns:
- `Wallet_ID` - Wallet identifier
- `Label` - Ground truth label (0 = clean, 1 = illicit)

## 🔧 How It Works

```
[Upload XLSX] 
    ↓
[API Server Receives File]
    ↓
[Read Transactions & Labels]
    ↓
[Prepare Graph Data]
    ↓
[Run ML Model (best_model.pt)]
    ↓
[Generate Suspicion Scores]
    ↓
[Export Network JSON]
    ↓
[Send to Dashboard]
    ↓
[Display Interactive Graph]
```

## 🛠️ Troubleshooting

### API Server Not Running
**Error**: "Failed to process file"  
**Solution**: Make sure `python api_server.py` is running in a terminal

### Model Not Found
**Error**: "Trained model not found"  
**Solution**: Ensure `best_model.pt` exists in the project root. Train it with:
```bash
python main.py
```

### Invalid File Format
**Error**: "Invalid file structure"  
**Solution**: Check that your XLSX has "Transactions" and "Labels" sheets with required columns

### Port Already in Use
**Error**: "Address already in use"  
**Solution**: Kill the existing process on port 5000:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill
```

## 🎨 Customization

Want to use your own dataset? Just ensure it follows the XLSX format above. The system will:
- ✅ Automatically detect wallet types
- ✅ Build the transaction graph
- ✅ Run ML predictions
- ✅ Visualize money flows
- ✅ Identify suspicious patterns

## 📝 Example Usage

```bash
# Terminal 1: Start API server
python api_server.py

# Terminal 2: Start dashboard  
cd dashboard && npm run dev

# Browser: http://localhost:5173
# 1. Click "Upload Dataset"
# 2. Select test_sets/test3_mixed_network.xlsx
# 3. Click "Process & Analyze"
# 4. Explore the interactive graph!
```

## 🔐 Security Notes

- The API server runs locally (localhost only)
- No data is sent to external services
- Uploaded files are processed and immediately deleted
- All processing happens on your machine

## 🎓 Next Steps

1. Try all 5 test datasets to see different patterns
2. Create your own dataset following the format
3. Adjust the ML model in `main.py` for better accuracy
4. Modify the dashboard visualization in `ForceGraph.jsx`

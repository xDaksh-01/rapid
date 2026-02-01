"""
Flask API Server for handling file uploads and ML processing
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import torch
import os
import json
import tempfile
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Import your existing ML model code
from src.model import SmurfingHunter
from src.data_loader import load_transaction_graph
from export_network import export_network_data

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle XLSX file upload and process through ML pipeline"""
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if not file.filename.endswith('.xlsx'):
        return jsonify({'error': 'Invalid file format. Please upload .xlsx file'}), 400
    
    tmp_path = None
    temp_tx_path = None
    temp_labels_path = None
    temp_scores_path = None
    temp_network_path = None
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name
        
        # Read Excel file
        print(f"📂 Reading uploaded file: {file.filename}")
        xlsx = pd.ExcelFile(tmp_path)
        
        if 'Transactions' not in xlsx.sheet_names or 'Labels' not in xlsx.sheet_names:
            return jsonify({
                'error': 'Invalid file structure. Expected "Transactions" and "Labels" sheets'
            }), 400
        
        transactions_df = pd.read_excel(tmp_path, sheet_name='Transactions')
        labels_df = pd.read_excel(tmp_path, sheet_name='Labels')
        
        # Save to temporary CSV files for processing
        temp_tx_path = 'temp_transactions.csv'
        temp_labels_path = 'temp_labels.csv'
        
        transactions_df.to_csv(temp_tx_path, index=False)
        labels_df.to_csv(temp_labels_path, index=False)
        
        print("🔄 Preparing graph data...")
        # Prepare graph data
        graph_data, wallet_to_idx, idx_to_wallet = load_transaction_graph(
            transactions_path=temp_tx_path,
            labels_path=temp_labels_path,
            compute_features=True
        )
        
        print("🧠 Loading model...")
        # Load the trained model
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model = SmurfingHunter(
            input_dim=graph_data.num_features,
            hidden_dim=128,
            num_classes=2
        ).to(device)
        
        if os.path.exists('best_model.pt'):
            model.load_state_dict(torch.load('best_model.pt', map_location=device))
            model.eval()
            print("   ✅ Model loaded from best_model.pt")
        else:
            return jsonify({'error': 'Trained model not found. Please train the model first.'}), 500
        
        print("🔮 Running predictions...")
        # Run predictions
        graph_data = graph_data.to(device)
        with torch.no_grad():
            out = model(graph_data.x, graph_data.edge_index)
            pred_probs = torch.softmax(out, dim=1)
            suspicion_scores = pred_probs[:, 1].cpu().numpy()
        
        # Save scores to CSV
        temp_scores_path = 'temp_suspicion_scores.csv'
        scores_data = []
        for idx in range(len(suspicion_scores)):
            wallet_id = idx_to_wallet[idx]
            scores_data.append({
                'Wallet_ID': wallet_id,
                'Suspicion_Score': suspicion_scores[idx],
                'True_Label': graph_data.y[idx].item()
            })
        scores_df = pd.DataFrame(scores_data)
        scores_df.to_csv(temp_scores_path, index=False)
        
        print("📊 Exporting network visualization...")
        # Export network data
        temp_network_path = 'temp_network_data.json'
        export_network_data(
            transactions_path=temp_tx_path,
            scores_path=temp_scores_path,
            output_path=temp_network_path
        )
        
        # Read the generated network data
        with open(temp_network_path, 'r') as f:
            network_data = json.load(f)
        
        # Clean up temporary files
        for path in [tmp_path, temp_tx_path, temp_labels_path, temp_scores_path, temp_network_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception as e:
                    print(f"⚠️ Warning: Could not delete {path}: {e}")
        
        print("✅ Processing complete!")
        
        return jsonify({
            'success': True,
            'filename': file.filename,
            'network_data': network_data,
            'stats': {
                'total_transactions': len(transactions_df),
                'total_wallets': len(labels_df),
                'illicit_wallets': int((suspicion_scores > 0.5).sum()),
                'high_risk_wallets': int((suspicion_scores > 0.8).sum())
            }
        })
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        # Clean up any temporary files that were created
        for path in [tmp_path, temp_tx_path, temp_labels_path, temp_scores_path, temp_network_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except:
                    pass
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'API server running'})

if __name__ == '__main__':
    print("🚀 Starting API server on http://localhost:5000")
    print("📁 Ensure best_model.pt exists in the current directory")
    app.run(debug=True, port=5000)

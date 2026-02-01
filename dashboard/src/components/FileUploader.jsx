import { useState } from 'react';
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';

export default function FileUploader({ onFileProcessed, onClose }) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.name.endsWith('.xlsx')) {
            setFile(droppedFile);
            setError(null);
        } else {
            setError('Please upload a valid .xlsx file');
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.name.endsWith('.xlsx')) {
            setFile(selectedFile);
            setError(null);
        } else {
            setError('Please upload a valid .xlsx file');
        }
    };

    const processFile = async () => {
        if (!file) return;

        setProcessing(true);
        setError(null);

        try {
            // Read the file
            const formData = new FormData();
            formData.append('file', file);

            // Call the backend API to process the file
            const response = await fetch('http://localhost:5000/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to process file');
            }

            const data = await response.json();
            setSuccess(true);
            
            // Wait a bit to show success message
            setTimeout(() => {
                onFileProcessed(data);
            }, 1000);

        } catch (err) {
            setError(err.message || 'Error processing file');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] max-w-lg w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Upload Dataset</h2>
                    <button
                        onClick={onClose}
                        className="text-[var(--text-secondary)] hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-[var(--border-color)] hover:border-blue-500/50'
                    }`}
                >
                    {!file ? (
                        <>
                            <Upload className="w-12 h-12 mx-auto mb-4 text-[var(--text-secondary)]" />
                            <p className="text-white mb-2">
                                Drag & drop your .xlsx file here
                            </p>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                or click to browse
                            </p>
                            <input
                                type="file"
                                accept=".xlsx"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer transition-colors"
                            >
                                Select File
                            </label>
                        </>
                    ) : (
                        <div className="flex items-center justify-center gap-3">
                            <FileSpreadsheet className="w-8 h-8 text-blue-400" />
                            <div className="text-left">
                                <p className="text-white font-medium">{file.name}</p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    {(file.size / 1024).toFixed(2)} KB
                                </p>
                            </div>
                            {!processing && !success && (
                                <button
                                    onClick={() => setFile(null)}
                                    className="ml-auto text-red-400 hover:text-red-300"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">File processed successfully!</span>
                    </div>
                )}

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-white rounded transition-colors"
                        disabled={processing}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={processFile}
                        disabled={!file || processing || success}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'Processing...' : success ? 'Processed!' : 'Process & Analyze'}
                    </button>
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                    <p className="text-xs text-blue-400">
                        <strong>Expected format:</strong> XLSX file with "Transactions" and "Labels" sheets.
                        Sample files available in test_sets/ folder.
                    </p>
                </div>
            </div>
        </div>
    );
}

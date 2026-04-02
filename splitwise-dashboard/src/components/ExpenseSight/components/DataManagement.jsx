/**
 * DataManagement - Export/Import UI for ExpenseSight data
 */

import { useState, useRef, useCallback } from 'react';
import { 
  Download, Upload, FileJson, CheckCircle2, AlertCircle, 
  Loader2, FileText, Database, AlertTriangle
} from 'lucide-react';
import { 
  exportAllData, 
  importData, 
  validateImportData, 
  downloadAsJSON, 
  readJSONFile 
} from '../../../firebase/dataExportService';

function ProgressBar({ progress, stage }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-stone-400 capitalize">{stage || 'Preparing'}...</span>
        <span className="text-stone-500">{progress}%</span>
      </div>
      <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ImportSummary({ summary }) {
  const collections = [
    { key: 'expenses', label: 'Expenses', icon: FileText },
    { key: 'tags', label: 'Tags', icon: FileText },
    { key: 'goals', label: 'Goals', icon: FileText },
    { key: 'bills', label: 'Bills', icon: FileText },
    { key: 'income', label: 'Income', icon: FileText },
    { key: 'investments', label: 'Investments', icon: FileText },
    { key: 'budgets', label: 'Budgets', icon: FileText },
  ];

  const totalImported = Object.values(summary).reduce((sum, s) => sum + (s.imported || 0), 0);
  const totalSkipped = Object.values(summary).reduce((sum, s) => sum + (s.skipped || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-emerald-400">
        <CheckCircle2 size={18} />
        <span className="text-sm font-medium">Import Complete</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
          <p className="text-xl font-display text-emerald-400">{totalImported}</p>
          <p className="text-[10px] text-stone-500">Items Imported</p>
        </div>
        <div className="p-3 bg-stone-800/50 border border-stone-700/30 rounded-xl text-center">
          <p className="text-xl font-display text-stone-400">{totalSkipped}</p>
          <p className="text-[10px] text-stone-500">Skipped (Existing)</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {collections.map(({ key, label }) => {
          const data = summary[key] || { imported: 0, skipped: 0 };
          if (data.imported === 0 && data.skipped === 0) return null;
          return (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-stone-400">{label}</span>
              <span className="text-stone-500">
                {data.imported > 0 && <span className="text-emerald-400">+{data.imported}</span>}
                {data.imported > 0 && data.skipped > 0 && ' / '}
                {data.skipped > 0 && <span className="text-stone-500">{data.skipped} skipped</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DataManagement({ userId }) {
  const fileInputRef = useRef(null);
  
  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ stage: '', percent: 0 });
  const [exportResult, setExportResult] = useState(null);
  
  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ stage: '', percent: 0 });
  const [importResult, setImportResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  const handleExport = useCallback(async () => {
    if (!userId) return;
    
    setExporting(true);
    setExportResult(null);
    setExportProgress({ stage: 'starting', percent: 0 });

    const result = await exportAllData(userId, (stage, percent) => {
      setExportProgress({ stage, percent });
    });

    if (result.success) {
      downloadAsJSON(result.data, 'expensesight-backup');
      setExportResult({ 
        success: true, 
        stats: result.data.stats,
        exportedAt: result.data.meta.exportedAt,
      });
    } else {
      setExportResult({ success: false, error: result.error });
    }

    setExporting(false);
  }, [userId]);

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportResult(null);
    setValidationResult(null);
    setParsedData(null);

    const readResult = await readJSONFile(file);
    
    if (!readResult.success) {
      setValidationResult({ valid: false, errors: [readResult.error], warnings: [] });
      return;
    }

    const validation = validateImportData(readResult.data);
    setValidationResult(validation);
    
    if (validation.valid) {
      setParsedData(readResult.data);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!userId || !parsedData) return;

    setImporting(true);
    setImportResult(null);
    setImportProgress({ stage: 'starting', percent: 0 });

    const result = await importData(userId, parsedData, (stage, percent, details) => {
      setImportProgress({ stage, percent, details });
    });

    setImportResult(result);
    setImporting(false);

    // Clear file selection on success
    if (result.success) {
      setSelectedFile(null);
      setParsedData(null);
      setValidationResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [userId, parsedData]);

  const clearFileSelection = useCallback(() => {
    setSelectedFile(null);
    setParsedData(null);
    setValidationResult(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-teal-400" />
          <h3 className="text-sm font-medium text-stone-200">Export Data</h3>
        </div>
        
        <p className="text-xs text-stone-500">
          Download all your ExpenseSight data including expenses, goals, bills, income, investments, and budgets.
        </p>

        {exporting ? (
          <ProgressBar progress={exportProgress.percent} stage={exportProgress.stage} />
        ) : exportResult ? (
          exportResult.success ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <CheckCircle2 size={16} />
                <span className="text-sm font-medium">Export Complete</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-display text-stone-200">{exportResult.stats.totalExpenses}</p>
                  <p className="text-[10px] text-stone-500">Expenses</p>
                </div>
                <div>
                  <p className="text-lg font-display text-stone-200">{exportResult.stats.totalGoals}</p>
                  <p className="text-[10px] text-stone-500">Goals</p>
                </div>
                <div>
                  <p className="text-lg font-display text-stone-200">{exportResult.stats.totalIncome}</p>
                  <p className="text-[10px] text-stone-500">Income</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle size={16} />
                <span className="text-sm">{exportResult.error}</span>
              </div>
            </div>
          )
        ) : null}

        <button
          onClick={handleExport}
          disabled={exporting || !userId}
          className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-stone-700 disabled:cursor-not-allowed 
                     text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {exporting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download size={16} />
              Export All Data
            </>
          )}
        </button>
      </div>

      {/* Import Section */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Upload size={18} className="text-cyan-400" />
          <h3 className="text-sm font-medium text-stone-200">Import Data</h3>
        </div>

        <p className="text-xs text-stone-500">
          Import data from a previous export. Existing items with the same ID will be skipped.
        </p>

        {/* File Input */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            disabled={importing}
          />
          
          {!selectedFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full py-8 border-2 border-dashed border-stone-700 hover:border-cyan-500/50 
                         rounded-xl transition-colors flex flex-col items-center justify-center gap-2"
            >
              <FileJson size={32} className="text-stone-500" />
              <span className="text-sm text-stone-400">Click to select JSON file</span>
            </button>
          ) : (
            <div className="p-3 bg-stone-800/50 border border-stone-700/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson size={18} className="text-cyan-400" />
                  <div>
                    <p className="text-sm text-stone-200">{selectedFile.name}</p>
                    <p className="text-[10px] text-stone-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearFileSelection}
                  disabled={importing}
                  className="text-xs text-stone-500 hover:text-stone-300"
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Validation Results */}
        {validationResult && (
          <div className={`p-3 rounded-xl ${
            validationResult.valid 
              ? 'bg-emerald-500/10 border border-emerald-500/20' 
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            {validationResult.valid ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={16} />
                <span className="text-sm">File validated successfully</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle size={16} />
                  <span className="text-sm">Validation failed</span>
                </div>
                {validationResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-400/80 pl-6">{err}</p>
                ))}
              </div>
            )}
            {validationResult.warnings.length > 0 && (
              <div className="mt-2 pt-2 border-t border-stone-700/30">
                {validationResult.warnings.map((warn, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-400">
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}
            {parsedData && (
              <div className="mt-3 pt-2 border-t border-stone-700/30 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-sm font-medium text-stone-200">
                    {parsedData.data.expenses?.length || 0}
                  </p>
                  <p className="text-[9px] text-stone-500">Expenses</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-200">
                    {parsedData.data.goals?.length || 0}
                  </p>
                  <p className="text-[9px] text-stone-500">Goals</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-200">
                    {parsedData.data.income?.length || 0}
                  </p>
                  <p className="text-[9px] text-stone-500">Income</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-200">
                    {parsedData.data.budgets?.length || 0}
                  </p>
                  <p className="text-[9px] text-stone-500">Budgets</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Import Progress */}
        {importing && (
          <ProgressBar progress={importProgress.percent} stage={importProgress.stage} />
        )}

        {/* Import Result */}
        {importResult && (
          importResult.success ? (
            <ImportSummary summary={importResult.summary} />
          ) : (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle size={16} />
                <span className="text-sm">{importResult.error}</span>
              </div>
            </div>
          )
        )}

        {/* Import Button */}
        <button
          onClick={handleImport}
          disabled={importing || !parsedData || !validationResult?.valid}
          className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-stone-700 disabled:cursor-not-allowed 
                     text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {importing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload size={16} />
              Import Data
            </>
          )}
        </button>
      </div>
    </div>
  );
}

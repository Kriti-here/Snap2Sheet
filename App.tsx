
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Uploader } from './components/Uploader';
import { Worksheet } from './components/Worksheet';
import { convertImageToData } from './services/geminiService';
import { downloadAsExcel, downloadAsCSV, copyToClipboard, copyTableToClipboard, shareData } from './utils/excelUtils';
import { ConversionState, TableData, TableStyles, ConditionalRule } from './types';

const STORAGE_KEY = 'snap2sheet_autosave';

const App: React.FC = () => {
  const [state, setState] = useState<ConversionState>({
    isProcessing: false,
    error: null,
    data: null,
    fileName: null,
    styles: {},
    conditionalRules: []
  });
  const [isSaved, setIsSaved] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.data && parsed.fileName) {
          setState(prev => ({ 
            ...prev, 
            data: parsed.data, 
            fileName: parsed.fileName,
            styles: parsed.styles || {},
            conditionalRules: parsed.conditionalRules || []
          }));
        }
      } catch (e) {
        console.error("Failed to load autosave data", e);
      }
    }
  }, []);

  // Save to localStorage whenever data, fileName, styles or rules changes
  useEffect(() => {
    if (state.data && state.fileName) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data: state.data,
        fileName: state.fileName,
        styles: state.styles,
        conditionalRules: state.conditionalRules
      }));
      setIsSaved(true);
      const timer = setTimeout(() => setIsSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [state.data, state.fileName, state.styles, state.conditionalRules]);

  const handleImageSelected = async (base64: string, fileName: string) => {
    setState({ ...state, isProcessing: true, error: null, data: null, styles: {}, conditionalRules: [] });
    
    try {
      const extractedData = await convertImageToData(base64);
      setState({
        isProcessing: false,
        error: null,
        data: extractedData,
        fileName: fileName.split('.')[0],
        styles: {},
        conditionalRules: []
      });
    } catch (err: any) {
      setState({
        ...state,
        isProcessing: false,
        error: err.message || 'An unexpected error occurred.'
      });
    }
  };

  const handleDataChange = (newData: TableData) => {
    setState(prev => ({ ...prev, data: newData }));
  };

  const handleStylesChange = (newStyles: TableStyles) => {
    setState(prev => ({ ...prev, styles: newStyles }));
  };

  const handleRulesChange = (newRules: ConditionalRule[]) => {
    setState(prev => ({ ...prev, conditionalRules: newRules }));
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      isProcessing: false,
      error: null,
      data: null,
      fileName: null,
      styles: {},
      conditionalRules: []
    });
  };

  const handleCopy = async () => {
    if (!state.data) return;
    const success = await copyToClipboard(state.data);
    if (success) {
      alert('Text copied to clipboard!');
    }
  };

  const handleCopyFormatted = async () => {
    if (!state.data) return;
    const success = await copyTableToClipboard(state.data, state.styles);
    if (success) {
      alert('Table with formatting copied! You can now paste it directly into Excel or Google Sheets.');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        {!state.data && !state.isProcessing && (
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              Turn your images into <span className="text-green-600 underline decoration-green-300">worksheets</span>
            </h2>
            <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
              Extract tabular data from screenshots, photos, or documents directly into Excel-ready grids using advanced AI.
            </p>
          </div>
        )}

        {/* Action Area */}
        <div className="space-y-12">
          {!state.data && !state.isProcessing && (
            <Uploader 
              onImageSelected={handleImageSelected} 
              disabled={state.isProcessing}
            />
          )}

          {/* Loading State */}
          {state.isProcessing && (
            <div className="max-w-md mx-auto text-center py-20 animate-in fade-in zoom-in duration-500">
              <div className="relative inline-block mb-8">
                <div className="w-24 h-24 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Performing High-Precision Analysis...</h3>
              <p className="text-gray-500 italic">Our AI is meticulously scanning every cell and mapping the layout. This ensures maximum accuracy for complex tables.</p>
            </div>
          )}

          {/* Error State */}
          {state.error && (
            <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-red-800 mb-2">Conversion failed</h3>
              <p className="text-red-600 mb-6">{state.error}</p>
              <button 
                onClick={reset}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Try Another Image
              </button>
            </div>
          )}

          {/* Results State */}
          {state.data && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-2xl font-bold text-gray-900">Extracted Worksheet</h3>
                    {isSaved && (
                      <span className="flex items-center text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wider animate-in fade-in slide-in-from-left-2">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        Autosaved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Found {state.data.length} rows of data. Formatting is preserved in copy.</p>
                </div>
                
                <div className="flex items-center flex-wrap gap-2">
                  <button 
                    onClick={handleCopyFormatted}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-all"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy with Formatting
                  </button>
                  <button 
                    onClick={handleCopy}
                    className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
                  >
                    Text only
                  </button>
                  <button 
                    onClick={() => shareData(state.data!)}
                    className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                  <button 
                    onClick={() => downloadAsExcel(state.data!, state.fileName || 'Snap2Sheet_Export')}
                    className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-lg text-sm font-semibold text-white hover:bg-green-700 shadow-sm transition-all"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download .xlsx
                  </button>
                </div>
              </div>

              <Worksheet 
                data={state.data} 
                styles={state.styles || {}}
                conditionalRules={state.conditionalRules || []}
                onChange={handleDataChange}
                onStylesChange={handleStylesChange}
                onRulesChange={handleRulesChange}
              />

              <div className="flex justify-center pt-8">
                <button 
                  onClick={reset}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
                >
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                  </svg>
                  Convert another image
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Features Section */}
        {!state.data && !state.isProcessing && (
          <div className="mt-32 grid grid-cols-1 gap-12 sm:grid-cols-3">
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white mx-auto mb-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-900">Exhaustive Extraction</h4>
              <p className="mt-2 text-gray-500">Powered by Gemini 3 Flash for ultra-fast, reliable OCR and table structure mapping.</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto mb-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-900">Spatial Awareness</h4>
              <p className="mt-2 text-gray-500">Maintains complex multi-column layouts even with merged or blank cells.</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white mx-auto mb-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-900">Secure Processing</h4>
              <p className="mt-2 text-gray-500">Your data is ephemeral and used only for the immediate conversion process.</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default App;

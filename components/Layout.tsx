
import React, { useState } from 'react';
import { Modal } from './Modal';
import { FileSpreadsheet, Info, ShieldCheck, LifeBuoy } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<'how' | 'privacy' | 'support' | null>(null);

  const closeModal = () => setActiveModal(null);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Snap2Sheet</h1>
          </div>
          <nav className="hidden md:flex space-x-8 text-sm font-medium text-gray-500">
            <button 
              onClick={() => setActiveModal('how')}
              className="hover:text-green-600 transition-colors flex items-center space-x-1"
            >
              <Info className="w-4 h-4" />
              <span>How it works</span>
            </button>
            <button 
              onClick={() => setActiveModal('privacy')}
              className="hover:text-green-600 transition-colors flex items-center space-x-1"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy</span>
            </button>
            <button 
              onClick={() => setActiveModal('support')}
              className="hover:text-green-600 transition-colors flex items-center space-x-1"
            >
              <LifeBuoy className="w-4 h-4" />
              <span>Support</span>
            </button>
          </nav>
        </div>
      </header>
      
      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Snap2Sheet. AI-powered image to spreadsheet conversion.
          </p>
          <div className="mt-4 flex justify-center space-x-6 text-xs text-gray-400">
            <button onClick={() => setActiveModal('how')} className="hover:text-gray-600">How it works</button>
            <button onClick={() => setActiveModal('privacy')} className="hover:text-gray-600">Privacy Policy</button>
            <button onClick={() => setActiveModal('support')} className="hover:text-gray-600">Support</button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <Modal 
        isOpen={activeModal === 'how'} 
        onClose={closeModal} 
        title="How Snap2Sheet Works"
      >
        <div className="space-y-6 text-gray-600">
          <section>
            <h4 className="text-lg font-bold text-gray-900 mb-2">1. Upload your image</h4>
            <p>Select a photo, screenshot, or scanned document containing a table or grid. We support PNG, JPG, and WebP formats.</p>
          </section>
          <section>
            <h4 className="text-lg font-bold text-gray-900 mb-2">2. AI Analysis</h4>
            <p>Our advanced Gemini AI scans the image, identifying rows, columns, and headers. It meticulously maps the spatial layout to ensure data integrity.</p>
          </section>
          <section>
            <h4 className="text-lg font-bold text-gray-900 mb-2">3. Review & Edit</h4>
            <p>Once extracted, your data appears in an interactive worksheet. You can edit cells, apply formatting, and set conditional rules directly in the browser.</p>
          </section>
          <section>
            <h4 className="text-lg font-bold text-gray-900 mb-2">4. Export</h4>
            <p>Download your finished worksheet as an Excel (.xlsx) file, CSV, or simply copy it to your clipboard for direct pasting into Google Sheets.</p>
          </section>
        </div>
      </Modal>

      <Modal 
        isOpen={activeModal === 'privacy'} 
        onClose={closeModal} 
        title="Privacy Policy"
      >
        <div className="space-y-6 text-gray-600">
          <p>Your privacy is our priority. Here's how we handle your data:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>No Permanent Storage:</strong> We do not store your uploaded images or extracted data on our servers permanently. Data is processed in real-time and stored locally in your browser's cache for autosave purposes.</li>
            <li><strong>AI Processing:</strong> Images are sent to Google's Gemini API for processing. This is done securely via encrypted connections.</li>
            <li><strong>Local Control:</strong> You have full control over your data. You can reset the application at any time to clear all local data.</li>
            <li><strong>No Tracking:</strong> We do not use invasive tracking cookies or sell your personal information to third parties.</li>
          </ul>
        </div>
      </Modal>

      <Modal 
        isOpen={activeModal === 'support'} 
        onClose={closeModal} 
        title="Support & Help"
      >
        <div className="space-y-6 text-gray-600">
          <p>Need help with Snap2Sheet? Here are some common solutions:</p>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="text-blue-900 font-bold mb-1">Pro Tip for Best Results</h4>
            <p className="text-blue-800 text-sm">Ensure your images are well-lit and the table is not skewed. High-resolution screenshots yield the highest accuracy.</p>
          </div>
          <section>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Common Issues</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Model Unavailable:</strong> If you see a 404 error, the AI service might be temporarily busy. Please try again in a few seconds.</li>
              <li><strong>Formatting Lost:</strong> Use the "Copy Formatted" button to preserve colors and styles when pasting into Excel.</li>
            </ul>
          </section>
          <section>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Contact Us</h4>
            <p>For further assistance, please reach out to our team at <a href="mailto:support@snap2sheet.ai" className="text-green-600 hover:underline">support@snap2sheet.ai</a>.</p>
          </section>
        </div>
      </Modal>
    </div>
  );
};

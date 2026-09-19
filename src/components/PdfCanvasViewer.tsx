import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ChevronLeft, ChevronRight, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';

// Configure the worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface Props {
  pdfUrl: string;
  title: string;
}

export const PdfCanvasViewer: React.FC<Props> = ({ pdfUrl, title }) => {
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfDocRef = useRef<any>(null);

  // Convert data: URL or string to TypedArray for reliable pdf.js loading
  const loadPdfDocument = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let loadingTask: any;

      if (pdfUrl.startsWith('data:application/pdf;base64,')) {
        const base64 = pdfUrl.replace('data:application/pdf;base64,', '');
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        loadingTask = pdfjsLib.getDocument({ data: bytes });
      } else if (pdfUrl.startsWith('data:')) {
        // Generic data URL
        const commaIdx = pdfUrl.indexOf(',');
        const base64 = pdfUrl.substring(commaIdx + 1);
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        loadingTask = pdfjsLib.getDocument({ data: bytes });
      } else {
        loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
      }

      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading PDF with PDF.js:', err);
      setError(err?.message || 'Impossible de charger le fichier PDF.');
      setLoading(false);
    }
  }, [pdfUrl]);

  useEffect(() => {
    loadPdfDocument();
  }, [loadPdfDocument]);

  // Render current page to canvas with high resolution
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    try {
      // Cancel previous render task if active
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDocRef.current.getPage(pageNum);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      // Base viewport at 1.5x scale for sharp sheet music notation
      const pixelRatio = window.devicePixelRatio || 1;
      const desiredWidth = Math.min(1000, window.innerWidth - 60);
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const calculatedScale = (desiredWidth / unscaledViewport.width) * 1.5;

      const viewport = page.getViewport({ scale: calculatedScale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / 1.5}px`;
      canvas.style.height = `${viewport.height / 1.5}px`;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (!loading && pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [currentPage, loading, renderPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const openInNewTab = () => {
    try {
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${pdfUrl}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      }
    } catch {
      window.open(pdfUrl, '_blank');
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-100">Affichage PDF Sécurisé</h4>
        <p className="text-xs text-slate-400">
          {error}
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => loadPdfDocument()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Réessayer</span>
          </button>
          <button
            type="button"
            onClick={openInNewTab}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ouvrir dans un nouvel onglet</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Top Page Selector Bar if multi-page */}
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-3 mb-4 bg-slate-900/90 border border-slate-800 px-4 py-1.5 rounded-xl shadow-md">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200"
            title="Page précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-xs font-mono font-bold text-slate-300">
            Page {currentPage} / {numPages}
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200"
            title="Page suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Décodage et rendu haute résolution du PDF...</p>
        </div>
      ) : (
        <div className="flex justify-center items-center w-full overflow-hidden shadow-2xl rounded-lg bg-white border border-slate-200">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto block"
            style={{ touchAction: 'none' }}
          />
        </div>
      )}
    </div>
  );
};

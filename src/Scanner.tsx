import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, RefreshCcw } from 'lucide-react';

interface Props {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      false
    );

    scanner.render(
      (text) => {
        scanner.clear().then(() => onScan(text));
      },
      (err) => {
        if (err?.includes("NotReadableError")) {
          setError("La cámara está en uso. Cierra otras apps y recarga.");
        }
      }
    );

    return () => {
      scanner.clear().catch(e => console.error("Cierre scanner:", e));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-white font-bold uppercase tracking-widest text-xs">Lector QR Kingston</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 bg-slate-700/50 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div id="reader" className="w-full bg-black"></div>
        
        {error && (
          <div className="p-6 text-center">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="bg-blue-600 px-4 py-2 rounded-lg text-xs font-bold uppercase text-white flex items-center gap-2 mx-auto">
              <RefreshCcw size={14}/> Reiniciar App
            </button>
          </div>
        )}

        <style>{`
          #reader { border: none !important; }
          #reader__dashboard_section_csr button {
            background-color: #2563eb !important;
            color: white !important;
            border-radius: 8px !important;
            padding: 10px 20px !important;
            font-weight: bold !important;
            border: none !important;
          }
          /* Mejorar legibilidad del selector de cámara */
          #reader__camera_selection {
            background-color: #1e293b !important;
            color: #ffffff !important;
            padding: 12px !important;
            border-radius: 8px !important;
            border: 1px solid #3b82f6 !important;
            margin: 15px auto !important;
            width: 90% !important;
            display: block !important;
            font-size: 16px !important;
          }
        `}</style>
      </div>
    </div>
  );
}
import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, RefreshCcw } from 'lucide-react';
import { Button } from './ui';

interface Props {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    let isScanning = true;

    const initScanner = () => {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        false
      );

      scannerRef.current = scanner;

      scanner.render(
        (text) => {
          if (isScanning && scanner) {
            isScanning = false;
            scanner.pause(true);
            onScan(text);
          }
        },
        (err) => {
          if (err?.toString().includes("NotReadableError")) {
            setError("Cámara en uso. Cierra otras apps.");
          } else if (!err?.toString().includes("NotFoundException")) {
            console.debug("Scanner info:", err);
          }
        }
      );
    };

    try {
      initScanner();
    } catch (e) {
      setError("Error al inicializar cámara.");
      console.error(e);
    }

    return () => {
      isScanning = false;
      if (scanner) {
        scanner.clear().catch(e => console.debug("Cleanup error:", e));
      }
      scannerRef.current = null;
    };
  }, [onScan]);

  const handleRestart = () => {
    setError(null);
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-white font-bold uppercase tracking-widest text-xs">Lector QR</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div id="reader" className="w-full bg-black"></div>
        {error && (
          <div className="p-4 space-y-2 bg-red-500/10 border-t border-red-500/20">
            <p className="text-red-400 text-xs font-semibold text-center">{error}</p>
            <div className="flex gap-2">
              <Button onClick={handleRestart} size="sm" className="flex-1 bg-blue-600 text-xs h-8"><RefreshCcw size={12} className="mr-1" /> Reintentar</Button>
              <Button onClick={onClose} size="sm" variant="ghost" className="flex-1 text-xs h-8">Cerrar</Button>
            </div>
          </div>
        )}
        <style>{`
          #reader { border: none !important; }
          #reader__dashboard_section_csr button { display: none !important; }
          #reader select { 
            background-color: #1e293b !important;
            color: white !important;
            border-color: #475569 !important;
          }
          #reader select option {
            background-color: #0f172a !important;
            color: white !important;
          }
        `}</style>
      </div>
    </div>
  );
}
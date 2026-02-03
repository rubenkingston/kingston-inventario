import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: ScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
      },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText);
      },
      (error) => {
        console.warn(error);
      }
    );
    
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.clear(); } catch (e) { console.error("Error limpiando", e); }
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-2 right-2 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">
          <X size={24} />
        </button>
        <div className="p-4 text-center bg-slate-900 text-white">
          <h3 className="font-bold text-lg">Escaneando...</h3>
        </div>
        <div id="reader" className="w-full bg-black min-h-[300px]"></div>
      </div>
    </div>
  );
}
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
          setError("Cámara en uso. Cierra otras apps.");
        }
      }
    );

    return () => {
      scanner.clear().catch(e => console.error(e));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-white font-bold uppercase tracking-widest text-xs">Lector QR</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div id="reader" className="w-full bg-black"></div>
        {error && <div className="p-4 text-center text-red-400 text-xs">{error} <button onClick={() => window.location.reload()}><RefreshCcw size={12}/></button></div>}
        <style>{`#reader { border: none !important; } #reader__dashboard_section_csr button { display: none !important; }`}</style>
      </div>
    </div>
  );
}
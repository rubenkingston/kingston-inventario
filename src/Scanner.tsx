import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, RefreshCcw, Camera } from 'lucide-react';

interface Props {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);
  const onScanRef = useRef(onScan);
  const mountedRef = useRef(true);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    console.log("Scanner: Iniciando useEffect");
    let scanner: Html5QrcodeScanner | null = null;

    const initScanner = () => {
      console.log("Scanner: initScanner llamado");
      if (!readerRef.current) {
        console.log("Scanner: reader element not found, skipping init");
        return;
      }
      try {
        scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 20, 
            qrbox: { width: 300, height: 300 }, 
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
          },
          false
        );
        console.log("Scanner: Html5QrcodeScanner creado");

        scanner.render(
          (text) => {
            console.log("Scanner: Código escaneado:", text);
            if (!mountedRef.current) return;
            try {
              if (!isScanning) {
                setIsScanning(true);
                onScanRef.current(text);
                // Reanudar escaneo después de un delay
                setTimeout(() => setIsScanning(false), 2000);
              }
            } catch (e) {
              console.error("Error en callback de escaneo:", e);
              setError("Error al procesar el código escaneado.");
              setIsScanning(false);
            }
          },
          (err) => {
            console.warn("Scanner: Error del scanner:", err);
            if (!mountedRef.current) return;
            // Capturamos solo errores críticos de permisos
            if (err?.includes("NotAllowedError") || err?.includes("NotReadableError")) {
              setError("Cámara bloqueada. Necesitas dar permisos en tu navegador.");
            }
          }
        );
        console.log("Scanner: render llamado");
        setIsStarting(false);
      } catch (e) {
        console.error("Scanner: Error en initScanner:", e);
        setError("Error al iniciar la cámara.");
        setIsStarting(false);
      }
    };

    // Retraso mínimo para asegurar que el DOM esté listo
    const timer = setTimeout(() => {
      console.log("Scanner: Ejecutando initScanner en timeout");
      initScanner();
    }, 1000); // Aumenté a 1000ms

    // Limpieza segura al cerrar
    return () => {
      console.log("Scanner: Cleanup");
      mountedRef.current = false;
      clearTimeout(timer);
      if (scanner) {
        try {
          scanner.clear().catch((e) => console.log("Cierre silencioso", e));
        } catch (e) {
          console.log("Limpieza forzada");
        }
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-white font-bold uppercase tracking-widest text-xs flex items-center gap-2">
            <Camera size={16} className="text-blue-500"/> Escáner v1.8
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 bg-slate-700/50 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        {/* Contenedor del escáner */}
        <div className="w-full bg-black min-h-[300px] flex items-center justify-center relative">
          <div id="reader" ref={readerRef} className="w-full h-full absolute inset-0"></div>
          {isStarting && <div className="absolute text-blue-400 animate-pulse font-bold text-sm">Iniciando lente...</div>}
        </div>
        
        {error && (
          <div className="p-6 text-center">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <p className="text-slate-400 text-xs mb-4">Ve a los ajustes de tu navegador (Chrome/Safari) y permite el acceso a la cámara para Vercel.</p>
            <button onClick={() => window.location.reload()} className="bg-blue-600 px-4 py-3 rounded-xl text-xs font-bold uppercase text-white flex items-center gap-2 mx-auto">
              <RefreshCcw size={16}/> Recargar App
            </button>
          </div>
        )}

        {/* Input manual para testing */}
        <div className="p-4 border-t border-slate-800">
          <input
            type="text"
            placeholder="Serial manual para testing"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                onScanRef.current(e.currentTarget.value.trim());
                e.currentTarget.value = '';
              }
            }}
          />
          <p className="text-slate-400 text-xs mt-1">Presiona Enter para simular escaneo</p>
        </div>

        {/* Estilos para forzar que los botones de la cámara se vean perfectos */}
        <style>{`
          #reader { border: none !important; }
          #reader video { object-fit: cover !important; }
          #reader__dashboard_section_csr span { color: white !important; }
          #reader__dashboard_section_csr button {
            background-color: #2563eb !important;
            color: white !important;
            border-radius: 8px !important;
            padding: 12px 24px !important;
            font-weight: bold !important;
            border: none !important;
            margin-top: 10px !important;
            text-transform: uppercase !important;
          }
          #reader__camera_selection {
            background-color: #1e293b !important;
            color: white !important;
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
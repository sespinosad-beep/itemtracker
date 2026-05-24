import React, { useState, useEffect, useRef } from 'react';
import { FactoryItem, ZONE_LABELS, CATEGORY_LABELS } from '../types';
import { X, Camera, Sparkles, AlertCircle, CheckCircle, Search, Laptop, Loader2, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QRScannerModalProps {
  onClose: () => void;
  items: FactoryItem[];
  onSelectItem: (item: FactoryItem) => void;
}

export default function QRScannerModal({ onClose, items, onSelectItem }: QRScannerModalProps) {
  const [activeMode, setActiveMode] = useState<'simulate' | 'camera' | 'manual'>('simulate');
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [scannedItem, setScannedItem] = useState<FactoryItem | null>(null);
  
  // Camera mock simulation state
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'permission_denied' | 'active' | 'scanning'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraState('idle');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Request camera access
  const startCamera = async () => {
    setCameraState('requesting');
    setErrorMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraState('active');
      
      // Simulate automatic decode in 3.5 seconds for nice UX
      setTimeout(() => {
        // Choose a random searching item from database to simulate a scan
        const candidates = items.filter(i => i.status !== 'recovered');
        if (candidates.length > 0) {
          const randomIndex = Math.floor(Math.random() * candidates.length);
          const pickedItem = candidates[randomIndex];
          handleSuccessfulDecode(pickedItem.id);
        } else if (items.length > 0) {
          handleSuccessfulDecode(items[0].id);
        } else {
          setErrorMessage('No hay artículos registrados para simular el escaneo.');
        }
      }, 3500);

    } catch (err) {
      console.warn("Camera access failed or blocked: ", err);
      setCameraState('permission_denied');
    }
  };

  const handleSuccessfulDecode = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    const found = items.find(i => i.id.toUpperCase() === trimmed);
    if (found) {
      setScannedItem(found);
      setSuccessMessage(`¡Código QR Decodificado con éxito!: ${found.id}`);
      setErrorMessage('');
      // Vibrate if available for scanner feel!
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate([100, 50, 100]);
      }
    } else {
      setErrorMessage(`El código '${trimmed}' no existe en el sistema de activos.`);
      setScannedItem(null);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleSuccessfulDecode(manualCode);
  };

  const handleSelectSimulate = (item: FactoryItem) => {
    handleSuccessfulDecode(item.id);
  };

  return (
    <div id="qr-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div 
        id="qr-modal-content" 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/30">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-blue-400">📷</span>
              <span>Lector & Simulador QR de Activos</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Identificación instantánea de herramientas mediante etiquetas QR en planta.</p>
          </div>
          <button 
            id="close-qr-modal"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-950 p-1.5 border-b border-slate-800/80 grid grid-cols-3 gap-1">
          <button
            onClick={() => {
              stopCamera();
              setActiveMode('simulate');
              setScannedItem(null);
              setSuccessMessage('');
              setErrorMessage('');
            }}
            className={`py-2 px-3 rounded-xl text-center font-bold text-[11px] transition-all cursor-pointer ${
              activeMode === 'simulate' ? 'bg-slate-800 text-blue-400 border border-slate-705' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            🎯 Simulador de Escaneo
          </button>
          
          <button
            onClick={() => {
              setActiveMode('camera');
              setScannedItem(null);
              setSuccessMessage('');
              setErrorMessage('');
              startCamera();
            }}
            className={`py-2 px-3 rounded-xl text-center font-bold text-[11px] transition-all cursor-pointer ${
              activeMode === 'camera' ? 'bg-slate-800 text-blue-400 border border-slate-705' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            🎥 Cámara Real
          </button>

          <button
            onClick={() => {
              stopCamera();
              setActiveMode('manual');
              setScannedItem(null);
              setSuccessMessage('');
              setErrorMessage('');
            }}
            className={`py-2 px-3 rounded-xl text-center font-bold text-[11px] transition-all cursor-pointer ${
              activeMode === 'manual' ? 'bg-slate-800 text-blue-400 border border-slate-705' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            ⌨️ Ingreso por Teclado
          </button>
        </div>

        {/* Scrollable Scanner Logic Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          
          {/* Status logs */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* MODE RENDER - SIMULATE TAG SELECTION */}
          {activeMode === 'simulate' && (
            <div className="space-y-4">
              <div className="bg-slate-950/30 p-4 border border-slate-800/80 rounded-xl">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para fines de demostración en el entorno de desarrollo, puedes **simular un disparo láser** seleccionando cualquiera de las etiquetas QR vigentes impresas más abajo en la planta. Esto cargará de inmediato la ficha digital de la herramienta.
                </p>
              </div>

              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Artículos Disponibles con QR</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectSimulate(item)}
                      className="p-3 bg-slate-950/70 hover:bg-slate-850 hover:border-blue-500/30 text-left border border-slate-850 rounded-xl flex gap-3 items-center group transition-all cursor-pointer"
                    >
                      <div className="bg-white p-1 rounded border border-slate-300 shrink-0">
                        <QRCodeSVG value={item.id} size={48} />
                      </div>
                      <div className="overflow-hidden">
                        <span className="block text-[10px] font-mono font-bold text-blue-400">{item.id}</span>
                        <span className="block text-xs font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{item.name}</span>
                        <span className="block text-[9px] text-slate-500 font-medium truncate">{ZONE_LABELS[item.zone]}</span>
                      </div>
                    </button>
                  ))}

                  {items.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-xs text-slate-500 italic">
                      No hay artículos registrados para simular. ¡Por favor reporta uno primero!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODE RENDER - REAL CAMERA SCAN */}
          {activeMode === 'camera' && (
            <div className="space-y-4">
              {/* Viewfinder block */}
              <div className="w-full aspect-video bg-black rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
                
                {cameraState === 'requesting' && (
                  <div className="z-10 text-center space-y-2 text-xs text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                    <span>Iniciando sensor óptico de cámara...</span>
                  </div>
                )}

                {cameraState === 'permission_denied' && (
                  <div className="z-10 text-center p-5 max-w-sm space-y-3.5 text-xs text-slate-400">
                    <Laptop className="w-8 h-8 text-slate-650 mx-auto" />
                    <p className="font-semibold text-slate-300">Permisos de Cámara Bloqueados</p>
                    <p className="text-[10.5px] text-slate-550 leading-relaxed">
                      El navegador o el entorno iframe han bloqueado el acceso a la cámara. Prueba usando el <span className="text-blue-400 font-bold">Simulador de Escaneo</span> o abre la app en una nueva pestaña.
                    </p>
                    <button
                      onClick={() => setActiveMode('simulate')}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-[10.5px]"
                    >
                      Volver al Simulador
                    </button>
                  </div>
                )}

                {cameraState === 'active' && (
                  <>
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-cover" 
                      playsInline 
                      muted 
                    />
                    
                    {/* Viewfinder overlay reticle */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444] z-15"></div>
                    
                    <div className="absolute inset-0 border-[28px] border-slate-900/60 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-dashed border-blue-500 rounded-lg shadow-[0_0_20px_#3b82f630]"></div>
                    </div>

                    <div className="absolute top-3 left-3 bg-red-600/70 border border-red-500/30 text-[9.5px] uppercase font-bold px-2 py-0.5 rounded tracking-widest text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                      <span>En línea</span>
                    </div>

                    <div className="absolute bottom-3 text-center w-full px-4 text-[10px] text-slate-400 select-none drop-shadow">
                      Apunta al código QR generado del activo para su decodificación.
                    </div>
                  </>
                )}
              </div>

              {cameraState === 'active' && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-xl text-xs space-y-1 text-blue-400">
                  <div className="font-bold font-mono text-[10px] uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Lector Enlace IA Integrado</span>
                  </div>
                  <p className="text-slate-350 text-[10.5px]">Se simulará una lectura automática exitosa a los pocos segundos de habilitar el sensor.</p>
                </div>
              )}
            </div>
          )}

          {/* MODE RENDER - MANUAL ENTRY */}
          {activeMode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="bg-slate-950/30 p-4 border border-slate-800/80 rounded-xl space-y-1">
                <span className="block text-xs font-bold text-slate-300">Dispositivo Lector Manual por Teclado</span>
                <p className="text-[10.5px] text-slate-500 leading-relaxed">
                  Puedes ingresar manualmente el identificador del QR pegado al activo (ej. <span className="font-mono text-blue-400">FA-4712</span> o <span className="font-mono text-blue-400">FA-0001</span>) para simular la lectura desde una terminal alámbrica de bodega.
                </p>
              </div>

              <div className="flex gap-2.5">
                <input
                  type="text"
                  required
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ej. FA-0001 o ID del artículo"
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs"
                >
                  Confirmar QR
                </button>
              </div>
            </form>
          )}

          {/* DISPLAY DETAILS OF SCANNED ASSET IF SUCCESSFUL */}
          {scannedItem && (
            <div className="border border-slate-750 bg-slate-950/45 p-4 rounded-xl mt-4 animate-in fade-in slide-in-from-bottom-3 duration-200 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                    {scannedItem.id}
                  </span>
                  <h4 className="text-xs font-extrabold text-white mt-1">{scannedItem.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{CATEGORY_LABELS[scannedItem.category]}</p>
                </div>

                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono border ${
                  scannedItem.status === 'searching' 
                    ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                    : (scannedItem.status === 'stored' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')
                }`}>
                  {scannedItem.status === 'searching' ? 'Perdido' : (scannedItem.status === 'stored' ? 'Resguardado' : 'Devuelto')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10.5px] border-t border-slate-900 pt-2.5">
                <div>
                  <span className="text-slate-500 block">Ubicación Teórica:</span>
                  <span className="font-semibold text-slate-300 block">{ZONE_LABELS[scannedItem.zone]}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reportado Por:</span>
                  <span className="font-semibold text-slate-300 block">{scannedItem.reporterName}</span>
                </div>
              </div>

              {scannedItem.storagePlace && (
                <div className="bg-emerald-950/10 border border-emerald-950 text-emerald-400 p-2.5 rounded-lg text-xs font-semibold">
                  <span>📍 Custodiado actualmente en: </span>
                  <span className="underline">{scannedItem.storagePlace}</span>
                </div>
              )}

              <div className="pt-2.5 border-t border-slate-900 flex justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onSelectItem(scannedItem);
                    onClose();
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Abrir Ficha de Administración</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/30 border-t border-slate-800 flex justify-end gap-2 text-xs font-semibold">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-white px-3 py-1.5"
          >
            Cerrar Lector
          </button>
        </div>
      </div>
    </div>
  );
}

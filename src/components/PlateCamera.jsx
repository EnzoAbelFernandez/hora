import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Sparkles, RefreshCw, AlertCircle, Plus, BrainCircuit } from 'lucide-react';
import Tesseract from 'tesseract.js';

export default function PlateCamera({ onPlateSuggested, activeVehicles, settings }) {
  const [useRealCamera, setUseRealCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [ocrStatus, setOcrStatus] = useState('idle'); // idle | initializing | scanning
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const ocrIntervalRef = useRef(null);
  const lastSuggestedPlateRef = useRef(null); // Prevents rapid re-triggering of the same plate

  // Initialize Tesseract Worker on mount
  useEffect(() => {
    const initWorker = async () => {
      try {
        const worker = await Tesseract.createWorker('eng');
        workerRef.current = worker;
      } catch (err) {
        console.error("Error init Tesseract", err);
      }
    };
    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Stop real camera stream and OCR
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (ocrIntervalRef.current) {
      clearInterval(ocrIntervalRef.current);
      ocrIntervalRef.current = null;
    }
    setOcrStatus('idle');
  };

  // Start real camera stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints = {
        video: { facingMode: 'environment', width: 640, height: 480 }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      startOcrLoop();
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("No se pudo acceder a la cámara (permiso denegado o no disponible).");
      setUseRealCamera(false);
    }
  };

  const processOcrText = (text) => {
    // Regex for Argentine plates
    const oldFormatRegex = /[A-Z]{3}[\s-]*\d{3}/gi;
    const newFormatRegex = /[A-Z]{2}[\s-]*\d{3}[\s-]*[A-Z]{2}/gi;

    let matches = [...(text.match(newFormatRegex) || []), ...(text.match(oldFormatRegex) || [])];
    
    if (matches.length > 0) {
      const rawPlate = matches[0].toUpperCase().replace(/[\s-]/g, '');
      
      const activePlates = activeVehicles.map(v => v.plate.toUpperCase());
      
      if (!activePlates.includes(rawPlate) && rawPlate !== lastSuggestedPlateRef.current) {
        lastSuggestedPlateRef.current = rawPlate;
        onPlateSuggested(rawPlate);

        // Clear the cache after 60 seconds so it can be detected again later if needed
        setTimeout(() => {
          if (lastSuggestedPlateRef.current === rawPlate) {
            lastSuggestedPlateRef.current = null;
          }
        }, 60000);
      }
    }
  };

  const startOcrLoop = () => {
    setOcrStatus('scanning');
    
    ocrIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !workerRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          const { data: { text } } = await workerRef.current.recognize(canvas);
          processOcrText(text);
        } catch (err) {
          console.error("OCR Error", err);
        }
      }
    }, (settings?.general?.ocrIntervalSeconds || 2) * 1000);
  };

  // Handle webcam toggle
  useEffect(() => {
    if (useRealCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [useRealCamera]);

  // Format plate string visually (e.g. AA 123 BB or AAA 123)
  const formatPlate = (plate) => {
    if (!plate) return '';
    const p = plate.toUpperCase().replace(/\s+/g, '');
    if (p.length === 7) {
      // New format: AA 123 BB
      return `${p.substring(0, 2)} ${p.substring(2, 5)} ${p.substring(5, 7)}`;
    } else if (p.length === 6) {
      // Old format: AAA 123
      return `${p.substring(0, 3)} ${p.substring(3, 6)}`;
    }
    return p;
  };

  return (
    <div className="glass-panel" style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera className="brand-icon" style={{ width: 20, height: 20 }} />
            Lector de Patentes
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Escaneo automático en la entrada.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setUseRealCamera(!useRealCamera)} 
            className={`btn btn-secondary ${useRealCamera ? 'active' : ''}`}
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', gap: '0.25rem', height: '32px' }}
          >
            {useRealCamera ? <CameraOff style={{ width: 14, height: 14 }} /> : <Camera style={{ width: 14, height: 14 }} />}
            {useRealCamera ? 'Apagar Webcam' : 'Usar Webcam'}
          </button>
        </div>
      </div>

      {cameraError && (
        <div style={{ 
          background: '#FEF2F2', 
          border: '1px solid #FECACA', 
          padding: '12px', 
          borderRadius: '8px', 
          color: 'var(--accent-red)',
          fontSize: '0.875rem',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Camera View Area */}
      <div className="camera-container">
        {useRealCamera ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="webcam-feed"
          />
        ) : (
          <div className="camera-sim-canvas">
            <div style={{ textAlign: 'center', zIndex: 10, padding: '1rem' }}>
              <CameraOff style={{ width: 32, height: 32, color: 'var(--text-muted)', margin: '0 auto 0.75rem', opacity: 0.8 }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Cámara Apagada</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Haz clic en "Usar Webcam" para iniciar el reconocimiento por IA.
              </p>
            </div>
          </div>
        )}

        <div className="camera-overlay">
          <div className="camera-status-tag" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="status-dot"></span>
            <span>{useRealCamera ? (ocrStatus === 'scanning' ? 'IA ESCANEANDO...' : 'CÁMARA VIVO') : 'APAGADO'}</span>
          </div>
          {useRealCamera && (
            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', padding: '0.25rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#10B981' }}>
              <BrainCircuit style={{ width: 12, height: 12 }} /> OCR ACTIVO
            </div>
          )}
        </div>
      </div>
      
      {/* Hidden Canvas for OCR Frame Extraction */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import ElevationProfile from './ElevationProfile';
import PathAnalysis from './PathAnalysis';
import type { PathAnalysisResult, LatLng, Tower } from '../types';

interface PathModalProps {
  analysis: PathAnalysisResult | null;
  clientPoint: LatLng | null;
  tower: Tower | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function PathModal({
  analysis,
  clientPoint,
  tower,
  isLoading,
  onClose,
}: PathModalProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number | null>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    startYRef.current = e.clientY;
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (startYRef.current == null) return;
    const delta = e.clientY - startYRef.current;
    setDragOffset(Math.max(0, delta));
  }

  function handlePointerEnd() {
    if (dragOffset > 120) {
      onClose();
      return;
    }
    startYRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${isDragging ? 'dragging' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined }}
      >
        <div
          className="modal-sheet-handle"
          aria-hidden="true"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        ></div>
        <button className="modal-close" onClick={onClose} title="Close">
          ✕
        </button>
        <div className="modal-header">
          <h2>
            Path Analysis — {tower?.name || 'Tower'}
          </h2>
        </div>
        <div className="modal-body">
          <div className="modal-profile-section">
            <ElevationProfile analysis={analysis} isLoading={isLoading} />
          </div>
          <div className="modal-analysis-section">
            <PathAnalysis
              analysis={analysis}
              clientPoint={clientPoint}
              tower={tower}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

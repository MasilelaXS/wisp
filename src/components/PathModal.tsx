import { useEffect } from 'react';
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
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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

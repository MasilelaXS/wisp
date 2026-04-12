import { getLinkSummary } from '../utils/linkCalculations';
import type { PathAnalysisResult, LatLng, Tower } from '../types';

interface PathAnalysisProps {
  analysis: PathAnalysisResult | null;
  clientPoint: LatLng | null;
  tower: Tower | null;
  isLoading: boolean;
}

export default function PathAnalysis({
  analysis,
  clientPoint,
  tower,
  isLoading,
}: PathAnalysisProps) {
  if (isLoading) {
    return (
      <div className="path-analysis empty">
        <h3>Path Analysis</h3>
        <div className="loading-wrapper">
          <div className="loading-spinner"></div>
          <p>Analyzing path...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="path-analysis empty">
        <h3>Path Analysis</h3>
        <p className="hint">
          {clientPoint
            ? 'Select a tower from the list or map to see detailed path analysis.'
            : 'Click on the map to place a client location, then select a tower.'}
        </p>
        <div className="fresnel-explanation">
          <h4>Fresnel Zone Guide</h4>
          <div className="fresnel-scale">
            <div className="scale-item excellent">
              ≥100% — Excellent (full F1 clearance)
            </div>
            <div className="scale-item good">
              60-100% — Good (recommended minimum)
            </div>
            <div className="scale-item marginal">
              20-60% — Marginal (degraded signal)
            </div>
            <div className="scale-item poor">
              0-20% — Poor (significant loss)
            </div>
            <div className="scale-item obstructed">
              &lt;0% — Obstructed (no LOS)
            </div>
          </div>
        </div>
      </div>
    );
  }

  const summary = getLinkSummary(analysis);
  if (!summary) return null;

  const qualityClass = `quality-${analysis.status}`;

  return (
    <div className="path-analysis">
      <h3>Path Analysis</h3>

      <div className="link-endpoints">
        <div className="endpoint">
          <span className="endpoint-label">Client</span>
          <span className="endpoint-name">
            {clientPoint
              ? `${clientPoint.lat.toFixed(5)}, ${clientPoint.lng.toFixed(5)}`
              : 'N/A'}
          </span>
        </div>
        <div className="link-arrow">→</div>
        <div className="endpoint">
          <span className="endpoint-label">Tower</span>
          <span className="endpoint-name">{tower?.name || 'N/A'}</span>
        </div>
      </div>

      <div className={`quality-badge ${qualityClass}`}>
        <span
          className="quality-dot"
          style={{ backgroundColor: analysis.color }}
        ></span>
        {analysis.quality}
      </div>

      <div className="analysis-grid">
        <div className="analysis-item">
          <span className="label">Distance</span>
          <span className="value">{summary.distance}</span>
        </div>
        <div className="analysis-item">
          <span className="label">Client Ground Elev</span>
          <span className="value">{summary.txElevation}</span>
        </div>
        <div className="analysis-item">
          <span className="label">Tower Ground Elev</span>
          <span className="value">{summary.rxElevation}</span>
        </div>
        <div className="analysis-item">
          <span className="label">Client Antenna ASL</span>
          <span className="value">{summary.txAntennaASL}</span>
        </div>
        <div className="analysis-item">
          <span className="label">Tower Antenna ASL</span>
          <span className="value">{summary.rxAntennaASL}</span>
        </div>
        <div className="analysis-item">
          <span className="label">Worst Clearance</span>
          <span
            className={`value ${analysis.worstClearance < 0 ? 'negative' : ''}`}
          >
            {summary.worstClearance}
          </span>
        </div>
        <div className="analysis-item">
          <span className="label">Fresnel Zone Clear</span>
          <span
            className={`value ${
              analysis.worstClearancePercent >= 60
                ? 'positive'
                : analysis.worstClearancePercent >= 0
                  ? 'warning'
                  : 'negative'
            }`}
          >
            {summary.worstFresnelPercent}
          </span>
        </div>
        <div className="analysis-item">
          <span className="label">Obstructions</span>
          <span
            className={`value ${analysis.obstructionCount > 0 ? 'negative' : 'positive'}`}
          >
            {summary.obstructions}
          </span>
        </div>
      </div>

      {analysis.worstPoint && (
        <div className="worst-point-info">
          <h4>Worst Obstruction Point</h4>
          <p>
            At {(analysis.worstPoint.distance / 1000).toFixed(2)} km from client
            — Terrain: {analysis.worstPoint.elevation.toFixed(1)}m — LOS:{' '}
            {analysis.worstPoint.losHeight.toFixed(1)}m — Clearance:{' '}
            {analysis.worstPoint.clearance.toFixed(1)}m
          </p>
        </div>
      )}
    </div>
  );
}

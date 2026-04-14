import { useState, useMemo } from 'react';

export default function TowerSelector({
  towers,
  selectedTowerA,
  selectedTowerB,
  customPoint,
  onSelectA,
  onSelectB,
  onClear,
  onAnalyze,
  onTogglePlacePoint,
  isPlacingPoint,
  isAnalyzing,
  frequencyGHz,
  onFrequencyChange,
  customPointHeight,
  onCustomPointHeightChange,
  showCoverage,
  onToggleCoverage,
  coverageRadius,
  onCoverageRadiusChange,
}) {
  const [search, setSearch] = useState('');

  const filteredTowers = useMemo(() => {
    if (!search) return towers;
    const s = search.toLowerCase();
    return towers.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        t.id.toString().includes(s)
    );
  }, [towers, search]);

  const pointB = selectedTowerB || customPoint;
  const canAnalyze = selectedTowerA && pointB;

  return (
    <div className="tower-selector">
      <div className="selector-header">
        <h2>WISP Link Planner</h2>
        <p className="subtitle">Line-of-Sight &amp; Fresnel Zone Analysis</p>
      </div>

      {/* Frequency setting */}
      <div className="setting-group">
        <label htmlFor="frequency">Frequency (GHz)</label>
        <input
          type="number"
          id="frequency"
          min="0.1"
          max="80"
          step="0.1"
          value={frequencyGHz}
          onChange={(e) => onFrequencyChange(parseFloat(e.target.value) || 5)}
        />
      </div>

      {/* Coverage toggle */}
      <div className="setting-group row">
        <label>
          <input
            type="checkbox"
            checked={showCoverage}
            onChange={onToggleCoverage}
          />
          Show Coverage Radius
        </label>
        {showCoverage && (
          <div className="coverage-input">
            <input
              type="number"
              min="1000"
              max="50000"
              step="1000"
              value={coverageRadius}
              onChange={(e) => onCoverageRadiusChange(parseInt(e.target.value) || 25000)}
            />
            <span>m</span>
          </div>
        )}
      </div>

      {/* Selected Points */}
      <div className="selected-points">
        <div className={`point-card ${selectedTowerA ? 'active' : ''}`}>
          <div className="point-label">
            <span className="point-marker a">A</span>
            Point A (TX)
          </div>
          {selectedTowerA ? (
            <div className="point-info">
              <strong>{selectedTowerA.name}</strong>
              <span>Height: {selectedTowerA.height}m</span>
            </div>
          ) : (
            <div className="point-info empty">Click a tower on the map</div>
          )}
        </div>

        <div className={`point-card ${pointB ? 'active' : ''}`}>
          <div className="point-label">
            <span className="point-marker b">B</span>
            Point B (RX)
          </div>
          {selectedTowerB ? (
            <div className="point-info">
              <strong>{selectedTowerB.name}</strong>
              <span>Height: {selectedTowerB.height}m</span>
            </div>
          ) : customPoint ? (
            <div className="point-info">
              <strong>Custom Point</strong>
              <span>
                {customPoint.lat.toFixed(5)}, {customPoint.lng.toFixed(5)}
              </span>
              <div className="custom-height-input">
                <label>Antenna Height (m):</label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={customPointHeight}
                  onChange={(e) =>
                    onCustomPointHeightChange(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          ) : (
            <div className="point-info empty">Click tower or place custom point</div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        <button
          className={`btn ${isPlacingPoint ? 'btn-active' : 'btn-secondary'}`}
          onClick={onTogglePlacePoint}
        >
          {isPlacingPoint ? 'Click Map to Place...' : 'Place Custom Point'}
        </button>
        <button
          className="btn btn-primary"
          onClick={onAnalyze}
          disabled={!canAnalyze || isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Path'}
        </button>
        <button className="btn btn-ghost" onClick={onClear}>
          Clear Selection
        </button>
      </div>

      {/* Tower Search */}
      <div className="tower-search">
        <input
          type="text"
          placeholder="Search towers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tower list */}
      <div className="tower-list">
        {filteredTowers.map((tower) => {
          const isA = selectedTowerA && selectedTowerA.id === tower.id;
          const isB = selectedTowerB && selectedTowerB.id === tower.id;
          return (
            <div
              key={tower.id}
              className={`tower-item ${isA ? 'selected-a' : ''} ${isB ? 'selected-b' : ''}`}
              onClick={() => {
                if (!selectedTowerA) {
                  onSelectA(tower);
                } else if (!selectedTowerB && tower.id !== selectedTowerA.id) {
                  onSelectB(tower);
                } else {
                  onSelectA(tower);
                }
              }}
            >
              <div className="tower-item-name">
                {isA && <span className="point-marker a small">A</span>}
                {isB && <span className="point-marker b small">B</span>}
                {tower.name}
              </div>
              <div className="tower-item-meta">
                ID: {tower.id} | {tower.height}m
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

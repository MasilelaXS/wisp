import { useState, useMemo } from 'react';
import type { LatLng, Tower, ScanResult } from '../types';

interface SidebarProps {
  clientPoint: LatLng | null;
  clientHeight: number;
  onClientHeightChange: (h: number) => void;
  frequencyGHz: number;
  onFrequencyChange: (f: number) => void;
  maxRange: number;
  onMaxRangeChange: (r: number) => void;
  scanResults: Map<number, ScanResult> | null;
  isScanning: boolean;
  scanStatus: string;
  selectedTower: Tower | null;
  onSelectTower: (tower: Tower) => void;
  onClear: () => void;
  onRescan: () => void;
  onGotoPaste: (lat: number, lng: number) => void;
  onCloseMenu: () => void;
}

function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try decimal: "-25.123, 29.456" or "-25.123 29.456"
  const decimalMatch = trimmed.match(
    /^([+-]?\d+\.?\d*)[,\s]+([+-]?\d+\.?\d*)$/
  );
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lng = parseFloat(decimalMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Try DMS: 25°7'S 29°27'E or 25°7'12"S 29°27'34"E
  const dmsRegex =
    /(\d+)[°]\s*(\d+)?[′']?\s*(\d+\.?\d*)?[″"]?\s*([NSns])[,\s]+(\d+)[°]\s*(\d+)?[′']?\s*(\d+\.?\d*)?[″"]?\s*([EWew])/;
  const dmsMatch = trimmed.match(dmsRegex);
  if (dmsMatch) {
    let lat =
      parseInt(dmsMatch[1]) +
      (parseInt(dmsMatch[2] || '0') || 0) / 60 +
      (parseFloat(dmsMatch[3] || '0') || 0) / 3600;
    let lng =
      parseInt(dmsMatch[5]) +
      (parseInt(dmsMatch[6] || '0') || 0) / 60 +
      (parseFloat(dmsMatch[7] || '0') || 0) / 3600;

    if (dmsMatch[4].toUpperCase() === 'S') lat = -lat;
    if (dmsMatch[8].toUpperCase() === 'W') lng = -lng;

    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

export default function Sidebar({
  clientPoint,
  clientHeight,
  onClientHeightChange,
  frequencyGHz,
  onFrequencyChange,
  maxRange,
  onMaxRangeChange,
  scanResults,
  isScanning,
  scanStatus,
  selectedTower,
  onSelectTower,
  onClear,
  onRescan,
  onGotoPaste,
  onCloseMenu,
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const [gpsInput, setGpsInput] = useState('');
  const [gpsError, setGpsError] = useState('');

  const sortedResults = useMemo(() => {
    if (!scanResults) return [];

    const entries = Array.from(scanResults.values());

    let filtered = entries;
    if (search) {
      const s = search.toLowerCase();
      filtered = entries.filter(
        (r) =>
          r.tower.name.toLowerCase().includes(s) ||
          r.tower.id.toString().includes(s)
      );
    }

    const qualityOrder: Record<string, number> = {
      Excellent: 0,
      Good: 1,
      Marginal: 2,
      Poor: 3,
      Obstructed: 4,
      'Out of Range': 5,
    };

    filtered.sort((a, b) => {
      const qa = qualityOrder[a.quality] ?? 6;
      const qb = qualityOrder[b.quality] ?? 6;
      if (qa !== qb) return qa - qb;
      return a.distance - b.distance;
    });

    return filtered;
  }, [scanResults, search]);

  const inRangeCount = useMemo(() => {
    if (!scanResults) return 0;
    return Array.from(scanResults.values()).filter(
      (r) => r.status !== 'out-of-range'
    ).length;
  }, [scanResults]);

  const clearCount = useMemo(() => {
    if (!scanResults) return 0;
    return Array.from(scanResults.values()).filter(
      (r) => r.status === 'clear'
    ).length;
  }, [scanResults]);

  function handleGpsPaste() {
    const coords = parseCoordinates(gpsInput);
    if (coords) {
      setGpsError('');
      setGpsInput('');
      onGotoPaste(coords.lat, coords.lng);
    } else {
      setGpsError('Invalid coordinates. Use "-25.123, 29.456" or DMS format.');
    }
  }

  function handleGpsKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleGpsPaste();
    }
  }

  return (
    <div className="sidebar-content">
      <div className="sidebar-header">
        <div className="brand">
          <img src="/logo-clean.png" alt="CTECG" className="brand-logo" />
          <div>
            <h2>CTECG LOS</h2>
            <p className="subtitle">Line-of-Sight Analyzer</p>
          </div>
        </div>
        <button
          className="sidebar-mobile-close"
          onClick={onCloseMenu}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {/* GPS Paste */}
      <div className="gps-paste-section">
        <label>Paste GPS Coordinates</label>
        <div className="gps-paste-row">
          <input
            type="text"
            placeholder="-25.123, 29.456"
            value={gpsInput}
            onChange={(e) => {
              setGpsInput(e.target.value);
              setGpsError('');
            }}
            onKeyDown={handleGpsKeyDown}
          />
          <button className="btn-go" onClick={handleGpsPaste}>
            Go
          </button>
        </div>
        {gpsError && <div className="gps-error">{gpsError}</div>}
      </div>

      {/* Settings */}
      <div className="settings-section">
        <div className="setting-row">
          <label>Frequency (GHz)</label>
          <input
            type="number"
            min="0.1"
            max="80"
            step="0.1"
            value={frequencyGHz}
            onChange={(e) =>
              onFrequencyChange(parseFloat(e.target.value) || 5)
            }
          />
        </div>
        <div className="setting-row">
          <label>Client Antenna (m)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={clientHeight}
            onChange={(e) =>
              onClientHeightChange(parseFloat(e.target.value) || 0)
            }
          />
        </div>
        <div className="setting-row">
          <label>Max Range (km)</label>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={maxRange}
            onChange={(e) =>
              onMaxRangeChange(parseFloat(e.target.value) || 35)
            }
          />
        </div>
      </div>

      {/* Client Point Info */}
      {clientPoint ? (
        <div className="client-info">
          <div className="client-info-header">
            <span className="client-dot"></span>
            <span>Client Location</span>
            <button className="btn-icon" onClick={onClear} title="Clear">
              ✕
            </button>
          </div>
          <div className="client-coords">
            {clientPoint.lat.toFixed(6)}, {clientPoint.lng.toFixed(6)}
          </div>
          {scanResults && !isScanning && (
            <div className="scan-summary">
              <span>{inRangeCount} in range</span>
              <span className="sep">·</span>
              <span className="clear-count">{clearCount} with LOS</span>
              <button
                className="btn-rescan"
                onClick={onRescan}
                disabled={isScanning}
                title="Rescan with current settings"
              >
                ↻
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="client-info empty">
          <p>
            Click anywhere on the map or paste GPS coordinates to place a
            client location and scan for tower visibility.
          </p>
        </div>
      )}

      {/* Scan Status */}
      {isScanning && (
        <div className="scan-progress">
          <div className="scan-spinner"></div>
          <span>{scanStatus}</span>
        </div>
      )}

      {/* Tower Results */}
      {scanResults && !isScanning && (
        <>
          <div className="tower-search">
            <input
              type="text"
              placeholder="Search towers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="tower-results">
            {sortedResults.map((result) => {
              const isSelected = selectedTower?.id === result.tower.id;
              const isOutOfRange = result.status === 'out-of-range';

              return (
                <div
                  key={result.tower.id}
                  className={`tower-result-item ${isSelected ? 'selected' : ''} ${
                    isOutOfRange ? 'out-of-range' : ''
                  }`}
                  onClick={() => onSelectTower(result.tower)}
                >
                  <div className="tower-result-status">
                    <span
                      className="status-dot"
                      style={{ backgroundColor: result.color }}
                    ></span>
                  </div>
                  <div className="tower-result-info">
                    <div className="tower-result-name">
                      {result.tower.name}
                    </div>
                    <div className="tower-result-meta">
                      {(result.distance / 1000).toFixed(1)} km
                      {!isOutOfRange &&
                        result.worstClearancePercent != null && (
                          <>
                            {' '}
                            · F1: {result.worstClearancePercent.toFixed(0)}%
                          </>
                        )}
                      {' '}· {result.tower.height}m tower
                    </div>
                  </div>
                  <div className="tower-result-quality">
                    <span
                      className={`quality-tag quality-${result.status}`}
                    >
                      {result.quality}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

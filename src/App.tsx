import { useState, useCallback, useRef, useEffect } from 'react';
import towers from './data/towers';
import TowerMap from './components/TowerMap';
import Sidebar from './components/Sidebar';
import PathModal from './components/PathModal';
import {
  fetchElevationProfile,
  fetchBatchElevations,
  haversineDistance,
} from './utils/elevationApi';
import { analyzePath, quickLosCheck } from './utils/linkCalculations';
import type { LatLng, Tower, ScanResult, PathAnalysisResult } from './types';
import './App.css';

const NUM_CHECK_POINTS = 20;
const MOBILE_BREAKPOINT = 768;

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function App() {
  const [clientPoint, setClientPoint] = useState<LatLng | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationLocked, setLocationLocked] = useState(true);
  const [clientHeight, setClientHeight] = useState(10);
  const [frequencyGHz, setFrequencyGHz] = useState(5.8);
  const [maxRange, setMaxRange] = useState(35);

  const [scanResults, setScanResults] = useState<Map<number, ScanResult> | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  const [selectedTower, setSelectedTower] = useState<Tower | null>(null);
  const [detailedAnalysis, setDetailedAnalysis] = useState<PathAnalysisResult | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const startScan = useCallback(
    async (point: LatLng) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const signal = controller.signal;

      setIsScanning(true);
      setError(null);
      setScanResults(null);
      setSelectedTower(null);
      setDetailedAnalysis(null);
      setShowModal(false);

      try {
        const maxRangeMeters = maxRange * 1000;

        // Phase 1: Calculate distances and filter
        setScanStatus('Calculating distances...');
        const inRangeTowers: { tower: Tower; distance: number }[] = [];
        const outOfRange = new Map<number, ScanResult>();

        for (const tower of towers) {
          const distance = haversineDistance(point, tower);
          if (distance <= maxRangeMeters) {
            inRangeTowers.push({ tower, distance });
          } else {
            outOfRange.set(tower.id, {
              tower,
              distance,
              status: 'out-of-range',
              quality: 'Out of Range',
              color: '#6b7280',
              worstClearance: Infinity,
              worstClearancePercent: 0,
            });
          }
        }

        inRangeTowers.sort((a, b) => a.distance - b.distance);

        if (inRangeTowers.length === 0) {
          setScanResults(outOfRange);
          setScanStatus('No towers in range');
          setIsScanning(false);
          return;
        }

        // Phase 2: Fetch ground elevations
        setScanStatus(
          `Fetching elevations for ${inRangeTowers.length} towers...`
        );

        const elevLocations: LatLng[] = [
          { lat: point.lat, lng: point.lng },
          ...inRangeTowers.map((t) => ({
            lat: t.tower.lat,
            lng: t.tower.lng,
          })),
        ];

        const groundElevations = await fetchBatchElevations(
          elevLocations,
          signal
        );
        if (signal.aborted) return;

        const clientGroundElev = groundElevations[0];

        // Phase 3: Compute and fetch intermediate points
        setScanStatus('Scanning line of sight...');

        const allIntermediatePoints: LatLng[] = [];
        const towerMeta: {
          tower: Tower;
          distance: number;
          towerGroundElev: number;
          startIdx: number;
          count: number;
        }[] = [];

        for (let i = 0; i < inRangeTowers.length; i++) {
          const { tower, distance } = inRangeTowers[i];
          const towerGroundElev = groundElevations[i + 1];
          const startIdx = allIntermediatePoints.length;

          for (let j = 1; j <= NUM_CHECK_POINTS; j++) {
            const fraction = j / (NUM_CHECK_POINTS + 1);
            allIntermediatePoints.push({
              lat: point.lat + (tower.lat - point.lat) * fraction,
              lng: point.lng + (tower.lng - point.lng) * fraction,
            });
          }

          towerMeta.push({
            tower,
            distance,
            towerGroundElev,
            startIdx,
            count: NUM_CHECK_POINTS,
          });
        }

        const intermediateElevations = await fetchBatchElevations(
          allIntermediatePoints,
          signal
        );
        if (signal.aborted) return;

        // Phase 4: Compute LOS for each tower
        const results = new Map<number, ScanResult>(outOfRange);

        for (let i = 0; i < towerMeta.length; i++) {
          const { tower, distance, towerGroundElev, startIdx, count } =
            towerMeta[i];

          const intermediates: { fraction: number; elevation: number }[] = [];
          for (let j = 0; j < count; j++) {
            const fraction = (j + 1) / (NUM_CHECK_POINTS + 1);
            intermediates.push({
              fraction,
              elevation: intermediateElevations[startIdx + j],
            });
          }

          const losResult = quickLosCheck(
            clientGroundElev,
            clientHeight,
            towerGroundElev,
            tower.height,
            intermediates,
            distance,
            frequencyGHz
          );

          results.set(tower.id, {
            tower,
            distance,
            towerGroundElev,
            clientGroundElev,
            ...losResult,
          });
        }

        setScanResults(results);
        setScanStatus(
          `Scan complete — ${inRangeTowers.length} towers checked`
        );
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Scan failed:', err);
        setError(getErrorMessage(err, 'Scan failed. Try again.'));
        setScanStatus('Scan failed');
      } finally {
        setIsScanning(false);
      }
    },
    [clientHeight, frequencyGHz, maxRange]
  );

  const applyClientPoint = useCallback(
    (point: LatLng) => {
      setClientPoint(point);
      if (isMobileViewport()) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
      startScan(point);
    },
    [startScan]
  );

  const requestCurrentLocation = useCallback(
    (setAsClientPoint = false) => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported on this device/browser.');
        return;
      }

      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const point: LatLng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setCurrentLocation(point);
          setError(null);

          if (setAsClientPoint) {
            applyClientPoint(point);
          }

          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
          setError('Unable to read your current location.');
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 120000,
        }
      );
    },
    [applyClientPoint]
  );

  useEffect(() => {
    requestCurrentLocation(true);
  }, [requestCurrentLocation]);

  const handleMapClick = useCallback(
    (latlng: { lat: number; lng: number }) => {
      if (locationLocked) {
        return;
      }

      const point: LatLng = { lat: latlng.lat, lng: latlng.lng };
      applyClientPoint(point);
    },
    [applyClientPoint, locationLocked]
  );

  const handleSelectTower = useCallback(
    async (tower: Tower) => {
      if (!clientPoint) return;

      if (isMobileViewport()) {
        setSidebarOpen(false);
      }

      setSelectedTower(tower);
      setDetailedAnalysis(null);
      setIsLoadingDetail(true);
      setShowModal(true);
      setError(null);

      try {
        const profile = await fetchElevationProfile(
          { lat: clientPoint.lat, lng: clientPoint.lng },
          { lat: tower.lat, lng: tower.lng },
          100
        );

        const result = analyzePath(
          profile,
          clientHeight,
          tower.height,
          frequencyGHz
        );
        setDetailedAnalysis(result);
      } catch (err: unknown) {
        console.error('Detail analysis failed:', err);
        setError(getErrorMessage(err, 'Failed to load path details.'));
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [clientPoint, clientHeight, frequencyGHz]
  );

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleClear = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setClientPoint(null);
    setScanResults(null);
    setSelectedTower(null);
    setDetailedAnalysis(null);
    setShowModal(false);
    setIsScanning(false);
    setScanStatus('');
    setError(null);
    setSidebarOpen(false);
  }, []);

  const handleRescan = useCallback(() => {
    if (clientPoint) {
      startScan(clientPoint);
    }
  }, [clientPoint, startScan]);

  const handleGotoPaste = useCallback(
    (lat: number, lng: number) => {
      const point: LatLng = { lat, lng };
      applyClientPoint(point);
    },
    [applyClientPoint]
  );

  const handleUseCurrentLocation = useCallback(() => {
    if (currentLocation) {
      applyClientPoint(currentLocation);
      return;
    }

    requestCurrentLocation(true);
  }, [applyClientPoint, currentLocation, requestCurrentLocation]);

  const handleToggleLocationLock = useCallback(() => {
    setLocationLocked((locked) => !locked);
  }, []);

  return (
    <div className="app">
      {/* Mobile menu button */}
      <button
        className={`mobile-menu-btn ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar
          clientPoint={clientPoint}
          clientHeight={clientHeight}
          onClientHeightChange={setClientHeight}
          frequencyGHz={frequencyGHz}
          onFrequencyChange={setFrequencyGHz}
          maxRange={maxRange}
          onMaxRangeChange={setMaxRange}
          scanResults={scanResults}
          isScanning={isScanning}
          scanStatus={scanStatus}
          selectedTower={selectedTower}
          onSelectTower={handleSelectTower}
          onClear={handleClear}
          onRescan={handleRescan}
          onGotoPaste={handleGotoPaste}
          onUseCurrentLocation={handleUseCurrentLocation}
          hasCurrentLocation={!!currentLocation}
          isLocating={isLocating}
          locationLocked={locationLocked}
          onToggleLocationLock={handleToggleLocationLock}
          onCloseMenu={() => setSidebarOpen(false)}
        />
      </div>

      <div className="main-content">
        <div className="map-container">
          <TowerMap
            towers={towers}
            clientPoint={clientPoint}
            scanResults={scanResults}
            selectedTower={selectedTower}
            onMapClick={handleMapClick}
            onSelectTower={handleSelectTower}
          />
        </div>

        {error && <div className="error-banner">{error}</div>}
      </div>

      {showModal && (
        <PathModal
          analysis={detailedAnalysis}
          clientPoint={clientPoint}
          tower={selectedTower}
          isLoading={isLoadingDetail}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default App;

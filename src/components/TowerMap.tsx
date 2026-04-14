import { useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  LayersControl,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Tower, LatLng, ScanResult } from '../types';

// Fix default marker icons for bundlers
const defaultIconPrototype = L.Icon.Default.prototype as typeof L.Icon.Default.prototype & {
  _getIconUrl?: unknown;
};
delete defaultIconPrototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeIcon(color: string) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    iconRetinaUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

const icons = {
  blue: makeIcon('blue'),
  green: makeIcon('green'),
  gold: makeIcon('gold'),
  orange: makeIcon('orange'),
  red: makeIcon('red'),
  grey: makeIcon('grey'),
  violet: makeIcon('violet'),
};

function getIconForResult(result: ScanResult | undefined, isSelected: boolean) {
  if (isSelected) return icons.violet;
  if (!result) return icons.blue;

  switch (result.status) {
    case 'clear':
      return icons.green;
    case 'marginal':
      return result.quality === 'Marginal' ? icons.gold : icons.orange;
    case 'obstructed':
      return icons.red;
    case 'out-of-range':
      return icons.grey;
    default:
      return icons.blue;
  }
}

const clientSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <circle cx="16" cy="16" r="14" fill="#cc0000" stroke="white" stroke-width="3"/>
  <circle cx="16" cy="16" r="5" fill="white"/>
</svg>`;

const clientIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(clientSvg),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

interface MapClickHandlerProps {
  onMapClick: (latlng: L.LatLng) => void;
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

interface TowerMapProps {
  towers: Tower[];
  clientPoint: LatLng | null;
  scanResults: Map<number, ScanResult> | null;
  selectedTower: Tower | null;
  onMapClick: (latlng: L.LatLng) => void;
  onSelectTower: (tower: Tower) => void;
}

export default function TowerMap({
  towers,
  clientPoint,
  scanResults,
  selectedTower,
  onMapClick,
  onSelectTower,
}: TowerMapProps) {
  const center = useMemo<[number, number]>(() => {
    if (towers.length === 0) return [-25.0, 29.5];
    const avgLat = towers.reduce((s, t) => s + t.lat, 0) / towers.length;
    const avgLng = towers.reduce((s, t) => s + t.lng, 0) / towers.length;
    return [avgLat, avgLng];
  }, [towers]);

  const linkLine = useMemo<[number, number][] | null>(() => {
    if (!clientPoint || !selectedTower) return null;
    return [
      [clientPoint.lat, clientPoint.lng],
      [selectedTower.lat, selectedTower.lng],
    ];
  }, [clientPoint, selectedTower]);

  const selectedResult = selectedTower
    ? scanResults?.get(selectedTower.id)
    : undefined;
  const lineColor = selectedResult?.color || '#cc0000';

  return (
    <MapContainer
      center={center}
      zoom={8}
      style={{ height: '100%', width: '100%' }}
      className="tower-map"
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Street Map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <MapClickHandler onMapClick={onMapClick} />

      {towers.map((tower) => {
        const isSelected = selectedTower?.id === tower.id;
        const result = scanResults?.get(tower.id);
        const icon = getIconForResult(result, !!isSelected);

        return (
          <Marker
            key={tower.id}
            position={[tower.lat, tower.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectTower(tower),
            }}
          >
            <Popup>
              <div>
                <strong>{tower.name}</strong>
                <br />
                Height: {tower.height}m
                <br />
                {result && result.status !== 'out-of-range' && (
                  <>
                    Distance: {(result.distance / 1000).toFixed(2)} km
                    <br />
                    Status:{' '}
                    <span style={{ color: result.color }}>
                      {result.quality}
                    </span>
                    <br />
                    {result.worstClearancePercent != null && (
                      <>
                        Fresnel: {result.worstClearancePercent.toFixed(0)}%
                        <br />
                      </>
                    )}
                  </>
                )}
                {result && result.status === 'out-of-range' && (
                  <>
                    Distance: {(result.distance / 1000).toFixed(1)} km (out of
                    range)
                    <br />
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {clientPoint && (
        <Marker
          position={[clientPoint.lat, clientPoint.lng]}
          icon={clientIcon}
        >
          <Popup>
            <div>
              <strong>Client Location</strong>
              <br />
              Lat: {clientPoint.lat.toFixed(6)}
              <br />
              Lng: {clientPoint.lng.toFixed(6)}
            </div>
          </Popup>
        </Marker>
      )}

      {linkLine && (
        <Polyline
          positions={linkLine}
          pathOptions={{ color: lineColor, weight: 3, opacity: 0.8 }}
        />
      )}
    </MapContainer>
  );
}

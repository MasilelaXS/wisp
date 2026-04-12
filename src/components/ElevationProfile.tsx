import {
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import type { PathAnalysisResult } from '../types';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  return (
    <div className="elevation-tooltip">
      <p>
        <strong>Distance:</strong> {(data.distance / 1000).toFixed(2)} km
      </p>
      <p>
        <strong>Terrain:</strong> {data.elevation.toFixed(1)} m
      </p>
      <p>
        <strong>Effective Terrain:</strong>{' '}
        {data.effectiveElevation.toFixed(1)} m
      </p>
      <p>
        <strong>LOS Height:</strong> {data.losHeight.toFixed(1)} m
      </p>
      <p>
        <strong>Fresnel R:</strong> {data.fresnel1.toFixed(1)} m
      </p>
      <p>
        <strong>Clearance:</strong> {data.clearance.toFixed(1)} m
      </p>
      <p>
        <strong>Fresnel %:</strong>{' '}
        <span
          style={{
            color:
              data.clearancePercent >= 60
                ? '#22c55e'
                : data.clearancePercent >= 0
                  ? '#eab308'
                  : '#ef4444',
          }}
        >
          {data.clearancePercent.toFixed(0)}%
        </span>
      </p>
    </div>
  );
}

interface ElevationProfileProps {
  analysis: PathAnalysisResult | null;
  isLoading: boolean;
}

export default function ElevationProfile({
  analysis,
  isLoading,
}: ElevationProfileProps) {
  if (isLoading) {
    return (
      <div className="elevation-profile-empty">
        <div className="loading-spinner"></div>
        <p>Loading elevation profile...</p>
      </div>
    );
  }

  if (!analysis || !analysis.pathPoints) {
    return (
      <div className="elevation-profile-empty">
        <p>Click a tower to view the elevation profile</p>
      </div>
    );
  }

  const { pathPoints } = analysis;

  const chartData = pathPoints.map((p) => ({
    ...p,
    distanceKm: p.distance / 1000,
    terrainFill: p.effectiveElevation,
  }));

  const allHeights = pathPoints.flatMap((p) => [
    p.effectiveElevation,
    p.losHeight,
    p.fresnelUpper,
    p.fresnelLower,
    p.elevation,
  ]);
  const minY = Math.floor(Math.min(...allHeights) - 20);
  const maxY = Math.ceil(Math.max(...allHeights) + 20);

  return (
    <div className="elevation-profile">
      <div className="profile-header">
        <h3>Elevation Profile</h3>
        <div className="profile-legend">
          <span className="legend-item">
            <span
              className="legend-color"
              style={{ backgroundColor: '#8b6914' }}
            ></span>
            Terrain
          </span>
          <span className="legend-item">
            <span
              className="legend-color"
              style={{ backgroundColor: '#a0522d' }}
            ></span>
            Effective Terrain
          </span>
          <span className="legend-item">
            <span
              className="legend-color"
              style={{ backgroundColor: '#ef4444' }}
            ></span>
            Line of Sight
          </span>
          <span className="legend-item">
            <span
              className="legend-color"
              style={{ backgroundColor: 'rgba(59,130,246,0.3)' }}
            ></span>
            1st Fresnel Zone
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="distanceKm"
            label={{
              value: 'Distance (km)',
              position: 'insideBottom',
              offset: -2,
              fill: '#aaa',
            }}
            stroke="#666"
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <YAxis
            domain={[minY, maxY]}
            label={{
              value: 'Elevation (m)',
              angle: -90,
              position: 'insideLeft',
              fill: '#aaa',
            }}
            stroke="#666"
          />
          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#8b6914"
            fill="#8b6914"
            fillOpacity={0.4}
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="effectiveElevation"
            stroke="#a0522d"
            strokeWidth={2}
            dot={false}
            strokeDasharray="4 2"
            isAnimationActive={false}
          />

          <Area
            type="monotone"
            dataKey="fresnelUpper"
            stroke="transparent"
            fill="#3b82f6"
            fillOpacity={0.15}
            dot={false}
            isAnimationActive={false}
          />

          <Area
            type="monotone"
            dataKey="fresnelLower"
            stroke="#3b82f6"
            fill="#1e293b"
            fillOpacity={1}
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="losHeight"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

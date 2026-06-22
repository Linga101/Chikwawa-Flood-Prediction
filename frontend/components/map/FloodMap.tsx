'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fallback static data — used only if the API call fails
const TA_ZONES_FALLBACK = [
  { name: 'TA Ngabu',      lat: -16.27, lng: 34.87, prob: 0.0 },
  { name: 'TA Makhwira',   lat: -16.05, lng: 34.93, prob: 0.0 },
  { name: 'TA Lundu',      lat: -16.45, lng: 34.75, prob: 0.0 },
  { name: 'TA Kasisi',     lat: -15.95, lng: 34.80, prob: 0.0 },
  { name: 'TA Chapananga', lat: -16.15, lng: 34.65, prob: 0.0 },
];

// ─── Shire River — verified GPS-anchored waypoints ──────────────────────────
// Sources: Kapichira Falls (-15.897, 34.752), Chikwawa Boma (-16.034, 34.801),
//          Nchalo Sugar Estate (-16.272, 34.871), Chiromo/Ruo (-16.552, 35.144)
// The river flows S from Kapichira Falls, past Chikwawa town (west bank),
// then curves SE through the floodplain toward the Ruo confluence at Chiromo.
const SHIRE_RIVER: [number, number][] = [
  [-15.897, 34.752],  // Kapichira Falls — district entry from north
  [-15.930, 34.768],  // below Kapichira gorge
  [-15.960, 34.783],  // approaching Chikwawa from north
  [-16.000, 34.793],  // north of Chikwawa town
  [-16.034, 34.801],  // Chikwawa town / bridge crossing (west bank reference)
  [-16.070, 34.815],  // south of Chikwawa boma
  [-16.110, 34.828],  // entering lower Shire floodplain
  [-16.150, 34.840],  // wide valley floor — marshland begins
  [-16.195, 34.852],  // approaching Nchalo area
  [-16.230, 34.860],  // Nchalo Sugar Estate north
  [-16.272, 34.871],  // Nchalo town — mid-point anchor
  [-16.310, 34.903],  // river begins curving southeast
  [-16.355, 34.946],  // Elephant Marsh northern edge
  [-16.400, 34.990],  // deep floodplain / marsh area
  [-16.450, 35.050],  // approaching Bangula
  [-16.490, 35.095],  // south of Bangula
  [-16.530, 35.125],  // near Chiromo
  [-16.552, 35.144],  // Chiromo — Ruo River confluence (district southern exit)
];

// Ruo River — joins Shire at Chiromo from the east (Mozambique border tributary)
const RUO_RIVER: [number, number][] = [
  [-16.480, 35.250],  // Ruo enters from the east (Mozambique border area)
  [-16.505, 35.210],
  [-16.525, 35.178],
  [-16.552, 35.144],  // meets Shire at Chiromo
];

// Chikwawa district bounding box — used to restrict pan/zoom
// These are the actual surveyed extents of Chikwawa District, Malawi
const CHIKWAWA_BOUNDS: L.LatLngBoundsLiteral = [
  [-16.75, 34.45],   // South-West corner (with small padding)
  [-15.70, 35.20],   // North-East corner (with small padding)
];

// Tighter inner bounds — the map snaps to fit this on load
const CHIKWAWA_FIT_BOUNDS: L.LatLngBoundsLiteral = [
  [-16.65, 34.55],
  [-15.80, 35.10],
];

function classifyRisk(prob: number) {
  if (prob >= 0.6) return { level: 'HIGH',   color: '#dc2626', fillColor: '#dc2626' };
  if (prob >= 0.3) return { level: 'MEDIUM', color: '#d97706', fillColor: '#d97706' };
  return               { level: 'LOW',    color: '#16a34a', fillColor: '#16a34a' };
}

function FitAndLockBounds() {
  const map = useMap();
  useEffect(() => {
    // Fit the initial view exactly to Chikwawa district
    map.fitBounds(CHIKWAWA_FIT_BOUNDS, { padding: [10, 10] });

    // After fitting, lock the minimum zoom to whatever level shows the full district
    // This prevents the user from zooming out beyond Chikwawa
    const fitZoom = map.getBoundsZoom(CHIKWAWA_FIT_BOUNDS);
    map.setMinZoom(fitZoom - 0.5); // allow very slight zoom out for context
  }, [map]);
  return null;
}

interface ZoneData {
  name: string;
  lat: number;
  lng: number;
  prob: number;
  description?: string;
}

interface FloodMapProps {
  activeLayers: string[];
}

export default function FloodMap({ activeLayers }: FloodMapProps) {
  const [zones, setZones] = useState<ZoneData[]>(TA_ZONES_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch enriched GeoJSON from the map-data endpoint
    // This now returns Point features with live probability data
    fetch('http://localhost:8000/api/v1/map-data')
      .then(r => {
        if (!r.ok) throw new Error(`API returned ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data?.features?.length > 0) {
          const mapped: ZoneData[] = data.features.map((f: any) => ({
            name:        f.properties.name,
            lat:         f.geometry.coordinates[1],  // GeoJSON is [lng, lat]
            lng:         f.geometry.coordinates[0],
            prob:        f.properties.probability ?? 0,
            description: f.properties.description ?? '',
          }));
          setZones(mapped);
          setError(null);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('[FloodMap] map-data fetch failed:', err);
        setError('Could not load live data — showing cached positions.');
        setLoading(false);
        // Fall back to latest-risk endpoint for at least the probabilities
        fetch('http://localhost:8000/api/v1/risk/latest-risk')
          .then(r => r.json())
          .then(data => {
            if (data?.length > 0) {
              setZones(prev => prev.map(zone => {
                const match = data.find((d: any) => d.grid_id === zone.name);
                return match ? { ...zone, prob: match.probability } : zone;
              }));
            }
          })
          .catch(() => {}); // final silent fallback
      });
  }, []);

  return (
    <MapContainer
      center={[-16.22, 34.83]}
      zoom={10}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      // Geo-restrict the map to Chikwawa District
      // maxBoundsViscosity=1.0 means a hard wall — the map will not scroll outside at all
      maxBounds={CHIKWAWA_BOUNDS}
      maxBoundsViscosity={1.0}
      maxZoom={15}
    >
      <FitAndLockBounds />

      {/* Base tile layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Shire River — verified GPS course through Chikwawa */}
      {activeLayers.includes('rivers') && (
        <>
          <Polyline
            positions={SHIRE_RIVER}
            pathOptions={{ color: '#0ea5e9', weight: 4, opacity: 0.85 }}
          >
            <Popup>
              <strong>Shire River</strong><br />
              <span style={{ fontSize: 11, color: '#4b5563' }}>
                Flows south from Kapichira Falls through Chikwawa town,<br />
                then southeast through the Elephant Marsh floodplain<br />
                to the Ruo confluence at Chiromo. Primary flood risk driver.
              </span>
            </Popup>
          </Polyline>
          <Polyline
            positions={RUO_RIVER}
            pathOptions={{ color: '#38bdf8', weight: 2.5, opacity: 0.75, dashArray: '6 4' }}
          >
            <Popup>
              <strong>Ruo River</strong><br />
              <span style={{ fontSize: 11, color: '#4b5563' }}>
                Tributary joining the Shire at Chiromo.<br />
                Flows from the Mulanje Massif on the Mozambique border.
              </span>
            </Popup>
          </Polyline>
        </>
      )}

      {/* Risk zone circles — one per TA zone */}
      {activeLayers.includes('rainfall') && zones.map(zone => {
        const { level, color, fillColor } = classifyRisk(zone.prob);
        const pct = Math.round(zone.prob * 100);
        return (
          <Circle
            key={zone.name}
            center={[zone.lat, zone.lng]}
            radius={8000}
            pathOptions={{
              color,
              fillColor,
              fillOpacity: loading ? 0.1 : 0.35,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 200 }}>
                <strong style={{ fontSize: 14 }}>{zone.name}</strong>
                {zone.description && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    {zone.description}
                  </div>
                )}
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <div>
                    Flood Probability:{' '}
                    <strong style={{ color }}>{pct}%</strong>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    Risk Level:{' '}
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: level === 'HIGH' ? '#fee2e2' : level === 'MEDIUM' ? '#fef3c7' : '#dcfce7',
                      color: level === 'HIGH' ? '#dc2626' : level === 'MEDIUM' ? '#d97706' : '#16a34a',
                    }}>
                      {level}
                    </span>
                  </div>
                </div>
                <a
                  href="/risk"
                  style={{ display: 'block', marginTop: 10, fontSize: 11, color: '#2563eb' }}
                >
                  → View 5-Factor Risk Assessment
                </a>
              </div>
            </Popup>
          </Circle>
        );
      })}

      {/* Error notice overlaid on map */}
      {error && (
        <div style={{
          position: 'absolute', bottom: 10, left: 10, zIndex: 1000,
          background: 'rgba(251,191,36,0.9)', padding: '6px 12px',
          borderRadius: 8, fontSize: 11, color: '#78350f', fontWeight: 600,
        }}>
          ⚠ {error}
        </div>
      )}
    </MapContainer>
  );
}

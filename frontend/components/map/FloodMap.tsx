'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Polyline, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Chikwawa District Traditional Authority zones with approximate centroids
const TA_ZONES = [
  { name: 'TA Ngabu',      lat: -16.27, lng: 34.87, prob: 0.65 },
  { name: 'TA Makhwira',   lat: -16.05, lng: 34.93, prob: 0.42 },
  { name: 'TA Lundu',      lat: -16.45, lng: 34.75, prob: 0.28 },
  { name: 'TA Kasisi',     lat: -15.95, lng: 34.80, prob: 0.55 },
  { name: 'TA Chapananga', lat: -16.15, lng: 34.65, prob: 0.31 },
];

// Approximate Shire River path through Chikwawa
const SHIRE_RIVER: [number, number][] = [
  [-15.80, 34.85],
  [-15.95, 34.88],
  [-16.10, 34.90],
  [-16.25, 34.85],
  [-16.40, 34.80],
  [-16.55, 34.70],
];

function classifyRisk(prob: number) {
  if (prob >= 0.6) return { level: 'HIGH',   color: '#dc2626', fillColor: '#dc2626' };
  if (prob >= 0.3) return { level: 'MEDIUM', color: '#d97706', fillColor: '#d97706' };
  return               { level: 'LOW',    color: '#16a34a', fillColor: '#16a34a' };
}

function MapZoom({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, bounds]);
  return null;
}

interface FloodMapProps {
  activeLayers: string[];
}

export default function FloodMap({ activeLayers }: FloodMapProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/map-data')
      .then(r => r.json())
      .then(data => {
        if (data && data.features && data.features.length > 0) {
          setGeoData(data);
          const layer = L.geoJSON(data);
          setBounds(layer.getBounds());
        }
      })
      .catch(console.error);
  }, []);

  return (
    <MapContainer
      center={[-16.15, 34.80]}
      zoom={10}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <MapZoom bounds={bounds} />

      {/* Base tile layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* District Boundary GeoJSON */}
      {geoData && (
        <GeoJSON 
          data={geoData} 
          style={{
            color: '#2563eb',
            weight: 2,
            fillColor: '#3b82f6',
            fillOpacity: 0.1
          }} 
        />
      )}

      {/* Shire River overlay */}
      {activeLayers.includes('rivers') && (
        <Polyline
          positions={SHIRE_RIVER}
          pathOptions={{ color: '#0ea5e9', weight: 4, opacity: 0.8 }}
        >
          <Popup>
            <strong>Shire River</strong><br />
            Main flood risk conduit in Chikwawa District.
          </Popup>
        </Polyline>
      )}

      {/* Risk zone circles per TA */}
      {activeLayers.includes('rainfall') && TA_ZONES.map(zone => {
        const { level, color, fillColor } = classifyRisk(zone.prob);
        return (
          <Circle
            key={zone.name}
            center={[zone.lat, zone.lng]}
            radius={8000}
            pathOptions={{
              color,
              fillColor,
              fillOpacity: 0.35,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 180 }}>
                <strong style={{ fontSize: 14 }}>{zone.name}</strong>
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  <div>Flood Probability: <strong>{Math.round(zone.prob * 100)}%</strong></div>
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
                  href={`/risk`}
                  style={{ display: 'block', marginTop: 8, fontSize: 11, color: '#2563eb' }}
                >
                  → View 5-Factor Assessment
                </a>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </MapContainer>
  );
}

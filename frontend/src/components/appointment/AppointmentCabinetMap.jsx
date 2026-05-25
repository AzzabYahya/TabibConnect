import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Marker, TileLayer, useMap } from 'react-leaflet';
import SafeMapContainer from '../common/SafeMapContainer';

const markerIcon = L.divIcon({
  className: 'home-map-marker-icon',
  html: '<span class="home-map-marker" style="background:#1A6B8A"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapRecenter({ latitude, longitude }) {
  const map = useMap();

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    map.setView([latitude, longitude], 15);
  }, [latitude, longitude, map]);

  return null;
}

function AppointmentCabinetMap({ latitude, longitude, height = 140, mapKey }) {
  if (latitude == null || longitude == null) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500"
        style={{ height }}
      >
        Carte indisponible
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200" style={{ height }}>
      <SafeMapContainer
        mapKey={mapKey || `appointment-cabinet-${latitude}-${longitude}`}
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ height }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapRecenter latitude={latitude} longitude={longitude} />
        <Marker position={[latitude, longitude]} icon={markerIcon} />
      </SafeMapContainer>
    </div>
  );
}

export default AppointmentCabinetMap;

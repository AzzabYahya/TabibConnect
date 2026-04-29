import { useEffect, useMemo, useRef } from 'react';

import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

const moroccoCenter = [31.7917, -7.0926];

const markerIcon = (color = '#1A6B8A') =>
  L.divIcon({
    className: 'home-map-marker-icon',
    html: `<span class="home-map-marker" style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildPopupHtml = (marker) => {
  if (Array.isArray(marker.doctorNames)) {
    const doctorCount = marker.doctorNames.length;
    const specialties = Array.isArray(marker.specialties) ? marker.specialties.slice(0, 3).join(' / ') : '';

    return `
      <div style="min-width:240px;max-width:300px;font-family:var(--font-latin);color:#0F172A;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">Cabinet</p>
        <p style="margin:0;font-size:16px;font-weight:800;line-height:1.2;">${escapeHtml(marker.cabinetName || 'Cabinet médical')}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#1A6B8A;font-weight:700;">${escapeHtml(marker.ville || 'Maroc')}</p>
        <p style="margin:8px 0 0;font-size:13px;font-weight:700;color:#0F172A;">${doctorCount} médecin${doctorCount > 1 ? 's' : ''} actifs</p>
        ${specialties ? `<p style="margin:4px 0 0;font-size:12px;color:#64748b;">${escapeHtml(specialties)}</p>` : ''}
      </div>
    `;
  }

  const profileAction = marker.profileHref
    ? `<a href="${escapeHtml(marker.profileHref)}" data-profile-link="true" style="display:inline-flex;align-items:center;justify-content:center;margin-top:12px;height:38px;padding:0 14px;border-radius:8px;background:#1A6B8A;color:#fff;text-decoration:none;font-size:13px;font-weight:700;">Voir le profil</a>`
    : '';

  return `
    <div style="min-width:240px;max-width:300px;font-family:var(--font-latin);color:#0F172A;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">Médecin</p>
      <p style="margin:0;font-size:16px;font-weight:800;line-height:1.2;">${escapeHtml(marker.doctorName || 'Médecin')}</p>
      <p style="margin:6px 0 0;font-size:12px;color:#1A6B8A;font-weight:700;">${escapeHtml(marker.specialty || 'Spécialité')}</p>
      <p style="margin:8px 0 0;font-size:13px;font-weight:700;color:#0F172A;">${escapeHtml(marker.tarifLabel || 'Tarif non renseigné')}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">${escapeHtml(marker.ville || 'Maroc')} ${marker.cabinetName ? `• ${escapeHtml(marker.cabinetName)}` : ''}</p>
      ${profileAction}
    </div>
  `;
};

function ClusteredMarkers({ markerPoints, onMarkerSelect, onProfileClick }) {
  const map = useMap();
  const profileClickRef = useRef(onProfileClick);

  useEffect(() => {
    profileClickRef.current = onProfileClick;
  }, [onProfileClick]);

  useEffect(() => {
    if (!markerPoints.length) {
      return undefined;
    }

    const clusterLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 58,
    });

    markerPoints.forEach((marker) => {
      const leafletMarker = L.marker(marker.coords, {
        icon: markerIcon(marker.color || '#1A6B8A'),
      });

      leafletMarker.bindPopup(buildPopupHtml(marker), {
        closeButton: false,
        className: 'home-map-popup search-map-popup',
        maxWidth: 320,
      });

      leafletMarker.on('click', () => {
        if (onMarkerSelect) {
          onMarkerSelect(marker);
        }
      });

      leafletMarker.on('popupopen', (event) => {
        if (!marker.profileHref) {
          return;
        }

        const popupElement = event.popup.getElement();
        const profileLink = popupElement?.querySelector('[data-profile-link="true"]');

        if (!profileLink) {
          return;
        }

        const handleProfileClick = (clickEvent) => {
          const profileHandler = profileClickRef.current;

          if (typeof profileHandler !== 'function') {
            return;
          }

          clickEvent.preventDefault();
          profileHandler(marker);
        };

        profileLink.addEventListener('click', handleProfileClick);
      });

      clusterLayer.addLayer(leafletMarker);
    });

    map.addLayer(clusterLayer);

    return () => {
      map.removeLayer(clusterLayer);
      clusterLayer.clearLayers();
    };
  }, [map, markerPoints, onMarkerSelect]);

  return null;
}

function FitToMarkers({ markerPoints }) {
  const map = useMap();

  useEffect(() => {
    if (!markerPoints.length) {
      map.setView(moroccoCenter, 6);
      return undefined;
    }

    const bounds = L.latLngBounds(markerPoints);

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }

    return undefined;
  }, [map, markerPoints]);

  return null;
}

function DoctorSearchMap({ markerPoints = [], className = 'h-[520px]', onMarkerSelect, onMarkerProfileClick }) {
  const fitPoints = useMemo(
    () =>
      markerPoints
        .map((marker) => marker.coords)
        .filter((coords) => Number.isFinite(coords[0]) && Number.isFinite(coords[1])),
    [markerPoints]
  );

  return (
    <div className={`overflow-hidden rounded-[16px] border border-slate-200 ${className}`}>
      <MapContainer center={moroccoCenter} zoom={6} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fitPoints.length > 0 ? <FitToMarkers markerPoints={fitPoints} /> : null}
        <ClusteredMarkers markerPoints={markerPoints} onMarkerSelect={onMarkerSelect} onProfileClick={onMarkerProfileClick} />
      </MapContainer>
    </div>
  );
}

export default DoctorSearchMap;

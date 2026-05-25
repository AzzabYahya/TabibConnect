import { useEffect, useMemo, useRef } from 'react';

import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { TileLayer, useMap } from 'react-leaflet';
import SafeMapContainer from './SafeMapContainer';

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
  const doctors = Array.isArray(marker.doctors) ? marker.doctors : [];

  if (doctors.length > 1) {
    const docListHtml = doctors.map(doc => `
      <div style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 2px;">
        <p style="margin:0; font-size: 13px; font-weight: 700; color: #0F172A;">${escapeHtml(doc.name || 'Médecin')}</p>
        <p style="margin:0; font-size: 11px; color: #1A6B8A; font-weight: 600;">${escapeHtml(doc.specialty || 'Spécialiste')}</p>
        ${doc.tarifLabel ? `<p style="margin:2px 0 0; font-size: 11px; font-weight: 600; color: #64748b;">${escapeHtml(doc.tarifLabel)}</p>` : ''}
        <a href="/doctor/${doc.id}" data-profile-link="true" data-doctor-id="${doc.id}" style="display:inline-flex; align-items:center; justify-content:center; margin-top:6px; height:24px; padding:0 10px; border-radius:6px; background:#1A6B8A; color:#fff; text-decoration:none; font-size:11px; font-weight:700; width: fit-content;">
          Voir le profil
        </a>
      </div>
    `).join('');

    return `
      <div style="min-width:260px; max-width:320px; font-family:var(--font-latin); color:#0F172A; max-height:280px; overflow-y:auto; padding-right: 4px;">
        <p style="margin:0 0 2px; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #64748b;">Cabinet Partagé</p>
        <p style="margin:0 0-4px; font-size: 15px; font-weight: 800; line-height: 1.2; color: #1A6B8A;">${escapeHtml(marker.cabinetName || 'Cabinet médical')}</p>
        <p style="margin:6px 0 8px; font-size: 11px; color: #64748b; font-weight: 500;">${escapeHtml(marker.ville || 'Maroc')}</p>
        <div style="display: flex; flex-direction: column;">
          ${docListHtml}
        </div>
      </div>
    `;
  }

  // Single doctor popup
  const doc = doctors[0] || { id: marker.doctorId, name: marker.doctorName, specialty: marker.specialty, tarifLabel: marker.tarifLabel };
  const profileAction = doc.id
    ? `<a href="/doctor/${doc.id}" data-profile-link="true" data-doctor-id="${doc.id}" style="display:inline-flex; align-items:center; justify-content:center; margin-top:12px; height:36px; padding:0 14px; border-radius:8px; background:#1A6B8A; color:#fff; text-decoration:none; font-size:12px; font-weight:700;">Voir le profil</a>`
    : '';

  return `
    <div style="min-width:240px; max-width:300px; font-family:var(--font-latin); color:#0F172A;">
      <p style="margin:0 0 4px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #64748b;">Médecin</p>
      <p style="margin:0; font-size: 16px; font-weight: 800; line-height: 1.2;">${escapeHtml(doc.name || 'Médecin')}</p>
      <p style="margin:4px 0 0; font-size: 12px; color: #1A6B8A; font-weight: 700;">${escapeHtml(doc.specialty || 'Spécialité')}</p>
      <p style="margin:6px 0 0; font-size: 12px; color: #64748b; font-weight: 500;">
        ${escapeHtml(marker.ville || 'Maroc')} ${marker.cabinetName ? `• ${escapeHtml(marker.cabinetName)}` : ''}
      </p>
      ${doc.tarifLabel ? `<p style="margin:8px 0 0; font-size: 13px; font-weight: 700; color: #0F172A;">${escapeHtml(doc.tarifLabel)}</p>` : ''}
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
        const popupElement = event.popup.getElement();
        const profileLinks = popupElement?.querySelectorAll('[data-profile-link="true"]');

        if (!profileLinks || profileLinks.length === 0) {
          return;
        }

        profileLinks.forEach((link) => {
          const docId = link.getAttribute('data-doctor-id');
          if (!docId) return;

          const handleProfileClick = (clickEvent) => {
            clickEvent.preventDefault();
            const profileHandler = profileClickRef.current;

            if (typeof profileHandler !== 'function') {
              return;
            }

            profileHandler({ doctorId: docId });
          };

          link.addEventListener('click', handleProfileClick);
        });
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

function DoctorSearchMap({
  markerPoints = [],
  className = 'h-[520px]',
  mapKey = 'doctor-search-map',
  onMarkerSelect,
  onMarkerProfileClick,
}) {
  const fitPoints = useMemo(
    () =>
      markerPoints
        .map((marker) => marker.coords)
        .filter((coords) => Number.isFinite(coords[0]) && Number.isFinite(coords[1])),
    [markerPoints]
  );

  return (
    <div className={`overflow-hidden rounded-[16px] border border-slate-200 ${className}`}>
      <SafeMapContainer mapKey={mapKey} center={moroccoCenter} zoom={6} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fitPoints.length > 0 ? <FitToMarkers markerPoints={fitPoints} /> : null}
        <ClusteredMarkers markerPoints={markerPoints} onMarkerSelect={onMarkerSelect} onProfileClick={onMarkerProfileClick} />
      </SafeMapContainer>
    </div>
  );
}

export default DoctorSearchMap;

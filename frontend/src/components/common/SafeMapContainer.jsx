import { useEffect, useId, useState } from 'react';
import { MapContainer } from 'react-leaflet';

/**
 * Evite l'erreur Leaflet "Map container is being reused by another instance"
 * lors des remontages React (navigation, onglets, Strict Mode).
 */
function SafeMapContainer({ mapKey: mapKeyProp, children, className, style, ...props }) {
  const reactId = useId().replace(/:/g, '');
  const mapKey = mapKeyProp ?? reactId;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    return () => setReady(false);
  }, [mapKey]);

  if (!ready) {
    return <div className={className} style={style} aria-hidden />;
  }

  return (
    <MapContainer key={mapKey} className={className} style={style} {...props}>
      {children}
    </MapContainer>
  );
}

export default SafeMapContainer;

import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

function extractBounds(map) {
  const bounds = map.getBounds();
  return {
    north: Number(bounds.getNorth().toFixed(6)),
    south: Number(bounds.getSouth().toFixed(6)),
    east: Number(bounds.getEast().toFixed(6)),
    west: Number(bounds.getWest().toFixed(6)),
  };
}

function MapController({ flyTarget, resizeTrigger, onUserMoveEnd }) {
  const map = useMap();
  const isProgrammaticRef = useRef(false);

  useEffect(() => {
    if (!flyTarget || !Array.isArray(flyTarget.center)) return;
    isProgrammaticRef.current = true;
    map.flyTo(flyTarget.center, flyTarget.zoom ?? map.getZoom(), {
      duration: 0.7,
    });
  }, [flyTarget, map]);

  useEffect(() => {
    if (!resizeTrigger) return;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 120);
    return () => clearTimeout(timer);
  }, [resizeTrigger, map]);

  useMapEvents({
    moveend: () => {
      if (isProgrammaticRef.current) {
        isProgrammaticRef.current = false;
        return;
      }
      onUserMoveEnd?.(extractBounds(map));
    },
  });

  return null;
}

export default MapController;

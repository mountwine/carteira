import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
export interface MapPoint {
  id: string;
  title: string;
  lat: number;
  lng: number;
}
export function TravelMap({
  points,
  onSelect,
  route = false,
}: {
  points: MapPoint[];
  onSelect: (id: string) => void;
  route?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current || !points.length) return;
    const map = L.map(root.current, { scrollWheelZoom: false }).setView(
      [points[0].lat, points[0].lng],
      12,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    points.forEach((p, i) => {
      const marker = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: "map-pin",
          html: `<span>${i + 1}</span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
        title: p.title,
        alt: p.title,
      });
      marker.addTo(map).on("click", () => onSelect(p.id));
    });
    if (points.length > 1) {
      const coords = points.map((p) => [p.lat, p.lng] as L.LatLngTuple);
      map.fitBounds(L.latLngBounds(coords), { padding: [35, 35], maxZoom: 14 });
      if (route)
        L.polyline(coords, {
          color: "#168bff",
          dashArray: "5 8",
          weight: 3,
        }).addTo(map);
    }
    return () => {
      map.remove();
    };
  }, [JSON.stringify(points)]);
  return (
    <div>
      <div ref={root} className="travel-map" aria-label="Mapa dos lugares" />
      {!navigator.onLine && (
        <p className="notice">
          Mapa de fundo precisa de internet. Endereços e coordenadas continuam
          disponíveis.
        </p>
      )}
      {route && (
        <small>
          Linha ilustrativa entre pontos; não é uma rota de navegação.
        </small>
      )}
    </div>
  );
}

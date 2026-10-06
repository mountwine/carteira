import { useEffect, useState } from "react";
import { useTravel } from "../data/TravelContext";
import { ofKind, dateLabel } from "../domain/entities";
import { activityMinute } from "../domain/planning";
import { homeContext } from "../domain/models";
import { places } from "../adapters/providers";
import { Card } from "../components/ui";
export function Notifications() {
  const t = useTravel(),
    [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const prefs = ofKind(t.records, "profile").find(
    (p) => p.ownerId === t.user.id,
  )?.data.notifications ?? {
    critical: true,
    useful: true,
    opportunities: false,
  };
  const context = homeContext(
    t.trip,
    new Date(),
    t.trip.isDemo ? t.date : undefined,
  );
  const now =
    context.localHour * 60 + (t.trip.isDemo ? 0 : new Date().getMinutes());
  const fixed = ofKind(t.records, "activity").filter(
    (a) =>
      a.data.date === t.date &&
      a.data.fixed &&
      a.data.status !== "done" &&
      activityMinute(a.data) >= now &&
      activityMinute(a.data) - now <= 60,
  );
  const due = ofKind(t.records, "checklist").filter(
    (c) => !c.data.done && c.data.due && c.data.due <= t.date,
  );
  const spot = places.find(
    (p) => p.city === context.destination?.city && p.category === "photos",
  );
  const notices = [
    ...(prefs.critical
      ? fixed.map((a) => ({
          id: a.id,
          text: `${a.data.time} · ${a.data.title}`,
          category: "Horário próximo",
          screen: "Roteiro" as const,
        }))
      : []),
    ...(prefs.useful && due.length
      ? [
          {
            id: "preparation",
            text: `${due.length} preparativo(s) precisam de atenção`,
            category: "Preparação",
            screen: "Checklist" as const,
          },
        ]
      : []),
    ...(prefs.opportunities && spot
      ? [
          {
            id: "spot",
            text: `${spot.name} · referência fotográfica demonstrativa`,
            category: "Oportunidade",
            screen: "Explorar" as const,
          },
        ]
      : []),
  ];
  useEffect(() => {
    if (
      t.trip.isDemo ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    )
      return;
    for (const n of notices) {
      const key = `travel-os:notification:${t.user.id}:${t.trip.id}:${t.date}:${n.id}`;
      if (localStorage.getItem(key)) continue;
      localStorage.setItem(key, "shown");
      void navigator.serviceWorker?.ready
        .then((reg) =>
          reg.showNotification(n.category, {
            body: n.text,
            tag: key,
            icon: "/icon-192.png",
          }),
        )
        .catch(() => {});
    }
  }, [
    tick,
    notices.map((n) => n.id).join(","),
    prefs.critical,
    prefs.useful,
    prefs.opportunities,
  ]);
  return notices.length ? (
    <div className="notification-list">
      {notices.map((n) => (
        <button
          key={n.id}
          onClick={() =>
            t.navigate(n.screen, n.id === "spot" ? spot?.id : n.id)
          }
        >
          <small>{n.category}</small>
          <span>{n.text}</span>
        </button>
      ))}
    </div>
  ) : null;
}

import { useEffect, useState } from "react";
import { useTravel } from "../data/TravelContext";
import { Today } from "./Today";
import {
  homeContext,
  type HomeData,
  type ActivityPreview,
} from "../domain/models";
import { ofKind, money } from "../domain/entities";
import {
  ordered,
  totals,
  travelEstimate,
  activityMinute,
} from "../domain/planning";
import { places, providers, detour } from "../adapters/providers";
import { isDemo } from "../adapters";
import { Card } from "../components/ui";
export function HomeConnected() {
  const t = useTravel(),
    context = homeContext(
      t.trip,
      new Date(),
      isDemo && t.trip.isDemo ? t.date : undefined,
    ),
    [weather, setWeather] = useState<HomeData["weather"]>(null);
  useEffect(() => {
    let live = true;
    void providers.weather
      .get(context.destination?.city ?? "", t.date)
      .then((w) => {
        if (live) setWeather(w);
      })
      .catch(() => {
        if (live) setWeather(null);
      });
    return () => {
      live = false;
    };
  }, [context.destination?.city]);
  const nowMinutes =
    context.localHour * 60 +
    (isDemo && t.trip.isDemo
      ? 0
      : Number(
          new Intl.DateTimeFormat("en-US", {
            timeZone: context.destination?.timezone ?? "UTC",
            minute: "2-digit",
          }).format(new Date()),
        ));
  const activities = ordered(
      ofKind(t.records, "activity").filter((a) => a.data.date === t.date),
    ),
    remaining = activities.filter((a) => a.data.status !== "done");
  const current =
      remaining.find(
        (a) => activityMinute(a.data) + a.data.duration >= nowMinutes,
      ) ?? null,
    next = current ? remaining[remaining.indexOf(current) + 1] : null;
  const preview = (a: typeof current): ActivityPreview | null => {
    if (!a) return null;
    const p = places.find((p) => p.id === a.data.placeId);
    return {
      title: a.data.title,
      time:
        a.data.time ||
        { morning: "Manhã", afternoon: "Tarde", evening: "Noite" }[
          a.data.period
        ],
      image: p?.image ?? t.trip.cover,
      location: a.data.address || context.destination?.city || "",
      coordinates:
        a.data.lat !== null && a.data.lng !== null
          ? [a.data.lat, a.data.lng]
          : [0, 0],
      duration: `${a.data.duration} min`,
    };
  };
  const checklist = ofKind(t.records, "checklist").filter(
      (c) => c.data.phase === "before",
    ),
    budget = ofKind(t.records, "budget")[0],
    memories = ofKind(t.records, "memory"),
    done = ofKind(t.records, "activity").filter(
      (a) => a.data.status === "done",
    );
  const suggestion = places.find(
      (p) =>
        p.city === context.destination?.city &&
        p.category === "photos" &&
        p.id !== current?.data.placeId,
    ),
    travel = current && next ? travelEstimate(current.data, next.data) : null;
  const fixed = remaining.find(
    (a) => a.data.fixed && activityMinute(a.data) >= nowMinutes,
  );
  const data: HomeData = {
    source: "mock",
    weather,
    current: preview(current),
    next: preview(next),
    suggestion: suggestion
      ? {
          title: suggestion.name,
          image: suggestion.image,
          rating: String(suggestion.rating),
          detour: `~${
            detour(
              suggestion,
              places.find((p) => p.id === current?.data.placeId),
              places.find((p) => p.id === next?.data.placeId),
            ) ?? "—"
          } min`,
          light: suggestion.goldenHour || "Consulte a luz no local",
          coordinates: [suggestion.lat, suggestion.lng],
        }
      : null,
    preparation: checklist.length
      ? Math.round(
          (checklist.filter((c) => c.data.done).length / checklist.length) *
            100,
        )
      : 0,
    pending: checklist.filter((c) => !c.data.done).map((c) => c.data.title),
    spending:
      Math.round(
        totals(
          t.records.filter(
            (r) => r.kind !== "expense" || r.data.date === t.date,
          ),
        ) * 100,
      ) / 100,
    budget:
      budget?.data.currency === "USD"
        ? Math.round(budget.data.total / context.totalDays)
        : null,
    fixedTime: fixed?.data.time ?? null,
    fixedTitle: fixed?.data.title ?? null,
    travel: travel
      ? {
          minutes: travel.minutes,
          kilometers: travel.km,
          temperature: weather?.temperature ?? 0,
          photoLabel: "Luz natural",
        }
      : null,
    summary: {
      places: new Set(done.map((a) => a.data.placeId || a.id)).size,
      photos: memories.reduce((n, m) => n + m.data.photoIds.length, 0),
      favorites: memories.filter((m) => m.data.favorite).length,
    },
  };
  return (
    <>
      <Today
        trip={{
          ...t.trip,
          cover: t.trip.isDemo
            ? (places.find((p) => p.city === context.destination?.city)
                ?.image ?? t.trip.cover)
            : t.trip.cover,
        }}
        user={t.user}
        context={context}
        data={data}
        navigate={t.navigate}
      />
      {context.phase === "before" && (
        <div className="home-extras">
          <Card>
            <h3>Preparativos em um só lugar</h3>
            <div className="home-links">
              <button onClick={() => t.navigate("Reservas")}>
                {ofKind(t.records, "reservation").length} reservas →
              </button>
              <button onClick={() => t.navigate("Bagagem")}>
                {ofKind(t.records, "bag").length} malas →
              </button>
              <button onClick={() => t.navigate("Compras")}>
                {
                  ofKind(t.records, "shopping").filter((s) => !s.data.bought)
                    .length
                }{" "}
                compras pendentes →
              </button>
              <button onClick={() => t.navigate("Gastos")}>
                Orçamento{" "}
                {budget
                  ? money(budget.data.total, budget.data.currency)
                  : "a definir"}{" "}
                →
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

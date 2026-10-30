import type { HomeContext, Trip } from "./models";

export function weekdayName(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(date + "T12:00:00Z"));
}

/** Title of the home screen: where the traveler is today, and the day of the week. */
export function homeHeadline(ctx: HomeContext, trip: Trip) {
  const city = ctx.destination?.city || trip.name;
  if (ctx.phase === "during")
    return { city, tail: `${weekdayName(ctx.date)}.` };
  if (ctx.phase === "before")
    return {
      city,
      tail:
        ctx.daysUntil === 0
          ? "hoje."
          : ctx.daysUntil === 1
            ? "amanhã."
            : `em ${ctx.daysUntil} dias.`,
    };
  return { city, tail: "até a próxima." };
}

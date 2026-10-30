import { describe, expect, it } from "vitest";
import type { Entity } from "../src/domain/entities";
import { nextActivity } from "../src/domain/planning";

const act = (
  id: string,
  date: string,
  time: string,
  status: "planned" | "done" = "planned",
  period: "morning" | "afternoon" | "evening" = "morning",
) =>
  ({
    id,
    kind: "activity",
    data: { title: id, date, time, status, period },
  }) as unknown as Entity<"activity">;

describe("próxima atividade", () => {
  const list = [
    act("ontem", "2027-01-21", "18:00"),
    act("hoje-manha", "2027-01-22", "09:00"),
    act("hoje-noite", "2027-01-22", "21:00"),
    act("amanha", "2027-01-23", "08:00"),
  ];
  it("pega o resto de hoje primeiro", () => {
    expect(nextActivity(list, "2027-01-22", "10:30")?.id).toBe("hoje-noite");
  });
  it("passa para os dias seguintes quando hoje acabou", () => {
    expect(nextActivity(list, "2027-01-22", "22:00")?.id).toBe("amanha");
  });
  it("acha atividade de amanhã mesmo sem nada hoje", () => {
    expect(
      nextActivity(
        [act("amanha", "2027-01-23", "08:00")],
        "2027-01-22",
        "10:00",
      )?.id,
    ).toBe("amanha");
  });
  it("ignora o que já foi feito e o que ficou para trás", () => {
    expect(
      nextActivity(
        [
          act("feita", "2027-01-22", "21:00", "done"),
          act("ontem", "2027-01-21", "18:00"),
        ],
        "2027-01-22",
        "10:00",
      ),
    ).toBeUndefined();
  });
  it("atividade de hoje sem horário também conta", () => {
    expect(
      nextActivity([act("sem-hora", "2027-01-22", "")], "2027-01-22", "15:00")
        ?.id,
    ).toBe("sem-hora");
  });
  it("sem nada pela frente, devolve nada", () => {
    expect(nextActivity([], "2027-01-22", "10:00")).toBeUndefined();
  });
});

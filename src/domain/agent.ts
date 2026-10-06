import {
  type AnyEntity,
  type Change,
  ofKind,
  canRead,
  change,
  entity,
  money,
} from "./entities";
import type { Trip, User } from "./models";
import { ordered, minutes, clock, travelEstimate, totals } from "./planning";
export interface AgentContext {
  trip: Pick<
    Trip,
    "id" | "name" | "startDate" | "endDate" | "destinations" | "pace"
  >;
  date: string;
  userId: string;
  records: AnyEntity[];
  placeId: string;
  weather: { description: string; source: string } | null;
}
export type AgentAction =
  | { type: "move_activity"; id: string; date: string; time: string }
  | { type: "set_budget"; id: string; amount: number }
  | { type: "add_checklist"; title: string; date: string };
export interface AgentReply {
  text: string;
  rationale: string;
  actions: AgentAction[];
  source: "mock" | "live";
}
export function buildContext(
  trip: Trip,
  user: User,
  records: AnyEntity[],
  date: string,
  placeId: string,
): AgentContext {
  const safe = records.filter(
    (r) =>
      !r.deleted &&
      canRead(r, user.id) &&
      !["document", "emergency", "message", "proposal"].includes(r.kind),
  );
  return {
    trip: {
      id: trip.id,
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      destinations: trip.destinations,
      pace: trip.pace,
    },
    date,
    userId: user.id,
    records: safe,
    placeId,
    weather: {
      description: "22°C · céu aberto · demonstração",
      source: "mock",
    },
  };
}
export function validateReply(value: unknown): AgentReply {
  if (!value || typeof value !== "object")
    throw new Error("Resposta de IA inválida.");
  const r = value as AgentReply;
  if (
    typeof r.text !== "string" ||
    !Array.isArray(r.actions) ||
    r.actions.length > 20
  )
    throw new Error("Resposta de IA fora do formato esperado.");
  for (const action of r.actions) {
    if (action.type === "move_activity") {
      if (
        typeof action.id !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(action.date) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(action.time)
      )
        throw new Error("Horário proposto inválido.");
    } else if (action.type === "set_budget") {
      if (
        typeof action.id !== "string" ||
        !Number.isFinite(action.amount) ||
        action.amount < 0
      )
        throw new Error("Orçamento proposto inválido.");
    } else if (action.type === "add_checklist") {
      if (
        !action.title ||
        action.title.length > 160 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(action.date)
      )
        throw new Error("Tarefa proposta inválida.");
    } else throw new Error("Ação de IA não permitida.");
  }
  return {
    ...r,
    rationale: String(r.rationale ?? ""),
    text: r.text.slice(0, 10000),
  };
}
export function proposedChanges(
  reply: AgentReply,
  context: AgentContext,
  trip: Trip,
  user: User,
): Change[] {
  const changed = new Set<string>();
  return reply.actions.map((action) => {
    if (action.type === "add_checklist")
      return change(
        entity(
          "checklist",
          {
            title: action.title,
            phase: "before",
            due: action.date,
            assignee: user.id,
            done: false,
            suggested: true,
          },
          trip,
          user,
        ),
      );
    const old = context.records.find((r) => r.id === action.id);
    if (!old || !canRead(old, user.id))
      throw new Error("A proposta usa um item indisponível.");
    if (changed.has(old.id))
      throw new Error("A proposta repete uma alteração no mesmo item.");
    changed.add(old.id);
    if (action.type === "move_activity") {
      if (old.kind !== "activity")
        throw new Error("Tipo de atividade inválido.");
      if (old.data.fixed)
        throw new Error(
          "A IA não pode mover horários fixos. Edite a reserva ou atividade manualmente.",
        );
      if (action.date < trip.startDate || action.date > trip.endDate)
        throw new Error("A proposta está fora das datas da viagem.");
      return change({
        ...old,
        data: {
          ...old.data,
          date: action.date,
          time: action.time,
          order: minutes(action.time),
        },
      });
    }
    if (old.kind !== "budget") throw new Error("Orçamento não encontrado.");
    return change({ ...old, data: { ...old.data, total: action.amount } });
  });
}
export function mockReply(context: AgentContext, prompt: string): AgentReply {
  const q = prompt.toLowerCase();
  const records = context.records;
  let text = "",
    rationale = "",
    actions: AgentAction[] = [];
  if (/organiz|reorganiz|chuva|planej/.test(q)) {
    const items = ordered(
        ofKind(records, "activity").filter((a) => a.data.date === context.date),
      ),
      fixed = items.filter((a) => a.data.fixed);
    let cursor = 9 * 60;
    let previous = items[0];
    for (const item of items) {
      if (item.data.fixed) {
        cursor = Math.max(cursor, minutes(item.data.time) + item.data.duration);
        previous = item;
        continue;
      }
      if (previous && previous.id !== item.id)
        cursor += travelEstimate(previous.data, item.data)?.minutes ?? 15;
      for (const f of fixed) {
        const start = minutes(f.data.time);
        if (
          cursor < start + f.data.duration &&
          cursor + item.data.duration + 20 > start
        )
          cursor = start + f.data.duration + 20;
      }
      if (cursor + item.data.duration > 23 * 60) continue;
      const time = clock(cursor);
      if (time !== item.data.time)
        actions.push({
          type: "move_activity",
          id: item.id,
          date: item.data.date,
          time,
        });
      cursor += item.data.duration;
      previous = item;
    }
    text = actions.length
      ? `Preparei ${actions.length} alteração(ões) para ${context.date}. Mantive os horários fixos. Revise os detalhes antes de aplicar.`
      : "Seu dia não precisa de mudanças neste cenário. Você pode adicionar atividades pelo Roteiro.";
    rationale =
      "Demonstração: distribui atividades a partir das 9h, preserva horários fixos e inclui deslocamentos estimados. Não consulta trânsito nem clima real.";
  } else if (/or[cç]amento.*\d/.test(q)) {
    const budget = ofKind(records, "budget")[0];
    const amount = Number(q.match(/\d+(?:[.,]\d+)?/)?.[0].replace(",", "."));
    if (budget && Number.isFinite(amount)) {
      actions = [{ type: "set_budget", id: budget.id, amount }];
      text = `Posso preparar o orçamento de ${money(amount, budget.data.currency)}. A alteração depende da sua confirmação.`;
      rationale = "Valor solicitado na conversa.";
    } else text = "Cadastre primeiro um orçamento no módulo Gastos.";
  } else if (/gasto|or[cç]amento/.test(q)) {
    text = `Os gastos disponíveis para você somam ${money(totals(records))} na base USD. Existem ${ofKind(records, "expense").length} lançamentos. Acesse Gastos para categorias, moedas e divisão entre viajantes.`;
  } else if (/compr/.test(q)) {
    const list = ofKind(records, "shopping").filter((s) => !s.data.bought);
    text = list.length
      ? `Na sua wishlist: ${list.map((s) => s.data.title).join(", ")}. Priorize os itens de maior prioridade e confira tamanho e preço-alvo. Posso usar os dados cadastrados; pesquisa de produtos externos ainda usa adapter demonstrativo.`
      : "Sua wishlist está vazia. Você pode cadastrar produtos em Compras.";
  } else if (/mala|bagagem|prepar/.test(q)) {
    const pending = ofKind(records, "packing").filter((p) => !p.data.packed);
    text = `Há ${pending.length} item(ns) de bagagem ainda não marcados e ${ofKind(records, "checklist").filter((c) => !c.data.done).length} pendências no checklist. Preparei uma verificação adicional para você revisar.`;
    actions = [
      {
        type: "add_checklist",
        title: "Conferir carregadores e adaptadores",
        date: context.trip.startDate,
      },
    ];
    rationale = "Sugestão de preparação, aplicada somente após confirmação.";
  } else if (/foto|lugar|comer/.test(q) || context.placeId) {
    text = `Para ${context.trip.name}, considere os lugares salvos e o próximo compromisso fixo. ${context.placeId ? `Estamos conversando sobre o lugar ${context.placeId}. ` : ""}O catálogo demonstrativo inclui Griffith Observatory e Hollywood Sign para fotos e Los Feliz para alimentação. Golden hour e avaliações são exemplos; confira as informações atuais no site do lugar.`;
  } else {
    text = `Estou no contexto de ${context.trip.name}: ${ofKind(records, "activity").length} atividades, ${ofKind(records, "reservation").length} reservas e ${ofKind(records, "bag").length} malas visíveis para você. Posso organizar o dia, resumir gastos e preparar um checklist. Esta resposta usa o Agente de demonstração, sem IA externa conectada.`;
  }
  return { text, rationale, actions, source: "mock" };
}

import { createContext, useContext } from "react";
import type { TravelEngine } from "./engine";
import type { Trip, User } from "../domain/models";
import type {
  AnyEntity,
  Change,
  Entity,
  EntityMap,
  Kind,
} from "../domain/entities";
export type Screen =
  | "Hoje"
  | "Álbum"
  | "Configurações"
  | "Conta"
  | "Amigos"
  | "Roteiro"
  | "Agente"
  | "Explorar"
  | "Mais"
  | "Reservas"
  | "Gastos"
  | "Compras"
  | "Bagagem"
  | "Checklist"
  | "Documentos"
  | "Conversor"
  | "Tradutor"
  | "SOS"
  | "Memórias"
  | "Perfil"
  | "Viajantes"
  | "Busca"
  | "Sincronização";
export interface TravelValue {
  engine: TravelEngine;
  trip: Trip;
  user: User;
  records: AnyEntity[];
  date: string;
  navigate: (screen: Screen, focus?: string) => void;
  focus: string;
  activeScreen: Screen;
  backLabel: string;
  back: () => void;
  notify: (message: string) => void;
  commit: (changes: Change[], label: string) => Promise<void>;
  save: (record: AnyEntity) => Promise<void>;
  drop: (record: AnyEntity) => Promise<void>;
  make: <K extends Kind>(
    kind: K,
    data: EntityMap[K],
    visibility?: "trip" | "private",
  ) => Entity<K>;
}
export const Context = createContext<TravelValue | null>(null);
export function useTravel() {
  const value = useContext(Context);
  if (!value) throw new Error("Contexto de viagem indisponível.");
  return value;
}

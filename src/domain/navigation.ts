export interface NavigationEntry {
  id: string;
  screen: string;
  focus: string;
  scroll: number;
}
export const screenLabel = (screen: string) =>
  screen === "Hoje" ? "Início" : screen === "Perfil" ? "Conta" : screen;
export function pushNavigation(
  entries: NavigationEntry[],
  screen: string,
  focus = "",
  scroll = 0,
) {
  const next = entries.map((e, i) =>
    i === entries.length - 1 ? { ...e, scroll } : e,
  );
  return [...next, { id: crypto.randomUUID(), screen, focus, scroll: 0 }];
}
export function backNavigation(entries: NavigationEntry[]) {
  return entries.length > 1 ? entries.slice(0, -1) : entries;
}

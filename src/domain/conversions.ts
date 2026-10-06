export const unitGroups = {
  distance: { label: "Distância", units: { km: 1, mi: 1.609344 } },
  length: {
    label: "Comprimento",
    units: { cm: 0.01, in: 0.0254, m: 1, ft: 0.3048 },
  },
  weight: {
    label: "Peso",
    units: { kg: 1, lb: 0.45359237, oz: 0.028349523125 },
  },
  volume: { label: "Volume", units: { L: 1, "gal (US)": 3.785411784 } },
};
export function convert(
  value: number,
  from: string,
  to: string,
  group: keyof typeof unitGroups | "temperature" | "fuel",
) {
  if (!Number.isFinite(value)) throw new Error("Informe um número válido.");
  if (from === to) return value;
  if (group === "temperature")
    return from === "°C" ? (value * 9) / 5 + 32 : ((value - 32) * 5) / 9;
  if (group === "fuel")
    return from === "km/L" ? value * 2.352145833 : value / 2.352145833;
  const units = unitGroups[group].units as Record<string, number>;
  if (!units[from] || !units[to]) throw new Error("Unidade inválida.");
  return (value * units[from]) / units[to];
}
export const shoeRows = [
  { BR: "35", US: "6", EU: "37", UK: "4" },
  { BR: "36", US: "7", EU: "38", UK: "5" },
  { BR: "37", US: "8", EU: "39", UK: "6" },
  { BR: "38", US: "8.5", EU: "40", UK: "6.5" },
  { BR: "39", US: "9", EU: "41", UK: "7" },
  { BR: "40", US: "10", EU: "42", UK: "8" },
  { BR: "41", US: "11", EU: "43", UK: "9" },
  { BR: "42", US: "12", EU: "44", UK: "10" },
];
export const clothingRows = [
  { BR: "PP", US: "XS", EU: "44", UK: "34" },
  { BR: "P", US: "S", EU: "46", UK: "36" },
  { BR: "M", US: "M", EU: "48", UK: "38" },
  { BR: "G", US: "L", EU: "50", UK: "40" },
  { BR: "GG", US: "XL", EU: "52", UK: "42" },
];

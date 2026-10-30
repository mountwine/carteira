/** Trip code: 6 uppercase symbols, with no 0, 1, 8 or B to avoid look-alikes. */
export const TRIP_CODE_ALPHABET = "2345679ACDEF";
export const TRIP_CODE_LENGTH = 6;

export const normalizeTripCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, TRIP_CODE_LENGTH);

export const validTripCode = (value: string) =>
  new RegExp(`^[${TRIP_CODE_ALPHABET}]{${TRIP_CODE_LENGTH}}$`).test(value);

/** "4444E2" -> "444 4E2", easier to read and to say aloud. */
export const formatTripCode = (code: string) =>
  code.length === TRIP_CODE_LENGTH
    ? `${code.slice(0, 3)} ${code.slice(3)}`
    : code;

export function codeFormatMessage(value: string) {
  if (value.length < TRIP_CODE_LENGTH)
    return `O código tem ${TRIP_CODE_LENGTH} caracteres.`;
  return "Este código só usa os símbolos 2 a 7, 9, A, C, D, E e F. Confira se não confundiu 0 com O, 1 com I ou 8 com B.";
}

export function joinFailure(reason?: string) {
  switch (reason) {
    case "invalid":
      return "Código não encontrado. Confira e tente de novo.";
    case "locked":
      return "Muitas tentativas erradas. Tente de novo daqui a cerca de uma hora.";
    default:
      return "Não foi possível entrar na viagem. Tente novamente.";
  }
}

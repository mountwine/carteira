import { useEffect, useState } from "react";
import { SyncScreen, type Screen } from "../data/TravelContext";
import { LocalHome } from "../features/LocalHome";
import { Itinerary } from "../features/itinerary/Itinerary";
import {
  Reservations,
  Expenses,
  Shopping,
  Luggage,
  Documents,
} from "../features/operations/Operations";
import { SOS, UniversalSearch } from "../features/tools/Tools";
import { Album } from "../features/Album";
import {
  LocalSettings,
  LocalFriends,
  LocalAccount,
  LocalTravelers,
} from "../features/LocalSettings";
import { ConverterV11 } from "../features/ConverterV11";
import { More } from "../features/More";
export function Workspace({
  screen,
  refresh,
}: {
  screen: Screen;
  refresh: () => Promise<void>;
}) {
  const [visited, setVisited] = useState<Screen[]>([screen]);
  useEffect(() => {
    setVisited((v) => (v.includes(screen) ? v : [...v, screen]));
  }, [screen]);
  const screens: Partial<Record<Screen, React.ReactNode>> = {
    Sincronização: <SyncScreen />,
    Hoje: <LocalHome />,
    Roteiro: <Itinerary />,
    Mais: <More />,
    Álbum: <Album />,
    Reservas: <Reservations />,
    Gastos: <Expenses />,
    Compras: <Shopping />,
    Bagagem: <Luggage />,
    Documentos: <Documents />,
    Conversor: <ConverterV11 />,
    SOS: <SOS />,
    Busca: <UniversalSearch />,
    Viajantes: <LocalTravelers refresh={refresh} />,
    Configurações: <LocalSettings />,
    Conta: <LocalAccount />,
    Amigos: <LocalFriends />,
  };
  return (
    <>
      {Array.from(new Set([...visited, screen])).map((s) => (
        <div key={s} hidden={s !== screen}>
          {screens[s]}
        </div>
      ))}
    </>
  );
}

import type { ReactNode } from "react";
import {
  Home,
  CalendarDays,
  Sparkles,
  Compass,
  Ellipsis,
  ArrowUpRight,
  Plus,
  Camera,
} from "lucide-react";
export type Tab = "Hoje" | "Roteiro" | "Álbum" | "Mais";
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`button ${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Nav({
  active,
  onChange,
  onAdd,
}: {
  active: string;
  onChange: (tab: "Hoje" | "Roteiro" | "Álbum" | "Mais") => void;
  onAdd: () => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {(
        [
          ["Hoje", "Início", Home],
          ["Roteiro", "Roteiro", CalendarDays],
          ["+", "Adicionar", Plus],
          ["Álbum", "Álbum", Camera],
          ["Mais", "Mais", Ellipsis],
        ] as const
      ).map(([tab, label, Icon]) => (
        <button
          key={tab}
          aria-label={label}
          aria-current={tab === active ? "page" : undefined}
          className={`${active === tab ? "active" : ""} ${tab === "+" ? "quick-tab" : ""}`}
          onClick={() => (tab === "+" ? onAdd() : onChange(tab))}
        >
          <span>
            <Icon size={23} />
          </span>
          {tab === "+" ? "" : label}
        </button>
      ))}
    </nav>
  );
}
export function MapsLink({
  coordinates,
  children,
}: {
  coordinates: [number, number];
  children: ReactNode;
}) {
  const destination = encodeURIComponent(coordinates.join(","));
  return (
    <a
      className="button primary"
      href={`https://www.google.com/maps/dir/?api=1&destination=${destination}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {" "}
      <ArrowUpRight size={19} />
      {children}
    </a>
  );
}

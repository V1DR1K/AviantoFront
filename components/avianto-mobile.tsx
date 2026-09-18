import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, Menu } from "lucide-react";
import { BrandLogo } from "./brand-logo";

export type AviantoTab = { id: string; label: string };

export function AviantoHeader({ onMenu, onHome, onIntake }: { onMenu: () => void; onHome: () => void; onIntake: () => void }) {
  return (
    <header className="avianto-mobile-header">
      <button type="button" className="avianto-menu-button" aria-label="Abrir menú" onClick={onMenu}><Menu size={24} /></button>
      <button type="button" className="avianto-mobile-logo" aria-label="Ir al inicio" onClick={onHome}><BrandLogo variant="color" size="sm" /></button>
      <button type="button" className="avianto-intake-button" onClick={onIntake}><span aria-hidden="true">+</span> Ingresar moto</button>
    </header>
  );
}

export function BottomNavigation({ page, onPage, onMenu }: { page: string; onPage: (page: string) => void; onMenu: () => void }) {
  const items = [
    { id: "repuestos", label: "Pedidos", artwork: "/brand/avianto-svg/nav-pedidos.svg" },
    { id: "dashboard", label: "Inicio", artwork: "/brand/avianto-svg/nav-home.svg" },
    { id: "profiles", label: "Perfiles", artwork: "/brand/avianto-svg/nav-profiles.svg" },
    { id: "orders", label: "Fichas", artwork: "/brand/avianto-svg/nav-orders.svg" },
  ];
  return (
    <nav className="avianto-bottom-navigation" aria-label="Navegación móvil">
      <button type="button" aria-label="Más opciones" onClick={onMenu}>
        <span className="avianto-bottom-art" style={{ "--avianto-nav-art": "url('/brand/avianto-svg/nav-more.svg')" } as CSSProperties} aria-hidden="true" />
        <span className="sr-only">Más</span>
      </button>
      {items.map(({ id, label, artwork }) => <button type="button" key={id} className={page === id ? "active" : ""} aria-label={label} aria-current={page === id ? "page" : undefined} onClick={() => onPage(id)}>
        <span className="avianto-bottom-art" style={{ "--avianto-nav-art": `url('${artwork}')` } as CSSProperties} aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </button>)}
    </nav>
  );
}

export function AviantoTabs({ tabs, active, onChange }: { tabs: AviantoTab[]; active: string; onChange: (id: string) => void }) {
  const activeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (tabs[0]?.id !== active) activeButton.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active, tabs]);
  return <nav className="avianto-tabs" aria-label="Secciones de la moto">{tabs.map((tab) => <button ref={active === tab.id ? activeButton : undefined} type="button" key={tab.id} className={active === tab.id ? "active" : ""} onClick={() => onChange(tab.id)}>{tab.label}</button>)}</nav>;
}

export function StatusRail({ items, active, onChange }: { items: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }) {
  return <nav className="avianto-status-rail" aria-label="Estados"><div className="avianto-status-rail-scroll">{items.map((item) => <button type="button" key={item.id} className={active === item.id ? "active" : ""} onClick={() => onChange(item.id)}><strong>{item.count ?? 0}</strong><span>{item.label}</span></button>)}</div></nav>;
}

export function MetricCard({ label, value, detail, tone = "blue" }: { label: string; value: string; detail?: string; tone?: "blue" | "red" | "neutral" }) {
  return <article className={`avianto-metric-card tone-${tone}`}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>;
}

export function VehicleField({ label, value, tone }: { label: string; value: ReactNode; tone?: "red" | "blue" }) {
  return <div className={`avianto-vehicle-field${tone ? ` tone-${tone}` : ""}`}><span>{label}</span><strong>{value}</strong></div>;
}

export function VehicleCard({ plate, children, action }: { plate: string; children: ReactNode; action?: ReactNode }) {
  return <article className="avianto-vehicle-card"><header><strong>{plate}</strong></header><div className="avianto-vehicle-card-fields">{children}</div>{action && <footer>{action}<ArrowRight size={17} aria-hidden="true" /></footer>}</article>;
}

export function ServiceCard({ date, km, next, notes }: { date: string; km: string; next?: string; notes?: string | null }) {
  return <article className="avianto-service-card"><div><VehicleField label="Fecha" value={date} /><VehicleField label="Km" value={km} /></div><div><VehicleField label="Próx. service" value={next ?? "—"} /><span className="avianto-service-arrow" aria-hidden="true">→</span></div>{notes && <p>{notes}</p>}</article>;
}

"use client";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Bike,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  Users,
} from "lucide-react";
const nav = [
  { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
  { id: "orders", label: "Pedidos", icon: ClipboardList },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "vehicles", label: "Motos", icon: Bike },
  { id: "catalog", label: "Catálogo", icon: Package },
  { id: "reports", label: "Reportes", icon: BarChart3 },
  { id: "audit", label: "Auditoría", icon: FileText },
];
export function AppShell({
  children,
  page,
  onPage,
  onNewOrder,
}: {
  children: ReactNode;
  page: string;
  onPage: (page: string) => void;
  onNewOrder: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (target: string) => {
    onPage(target);
    setMenuOpen(false);
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => go("dashboard")}
          aria-label="Ir al inicio"
        >
          <span className="brand-mark">A</span>
          <span>
            Avianto<span>Software</span>
          </span>
        </button>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={page === item.id ? "active" : ""}
                onClick={() => go(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className="button sidebar-new" onClick={onNewOrder}>
            + <span>Nuevo pedido</span>
          </button>
          <p>
            Taller Avianto
            <br />
            Buenos Aires, Argentina
          </p>
          <button className="settings">
            <Settings size={18} /> Administración
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="mobile-header">
          <button aria-label="Abrir menú" onClick={() => setMenuOpen(true)}>
            <Menu />
          </button>
          <button className="brand-text" onClick={() => go("dashboard")}>
            AviantoSoftware
          </button>
          <button
            className="button icon-only"
            onClick={onNewOrder}
            aria-label="Nuevo pedido"
          >
            +
          </button>
        </header>
        {children}
      </main>
      {menuOpen && (
        <div
          className="mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menú principal"
        >
          <button className="drawer-close" onClick={() => setMenuOpen(false)}>
            Cerrar menú ×
          </button>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => go(item.id)}>
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
          <button
            className="button primary"
            onClick={() => {
              onNewOrder();
              setMenuOpen(false);
            }}
          >
            + Nuevo pedido
          </button>
        </div>
      )}
      <nav className="mobile-nav">
        {nav.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => go(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

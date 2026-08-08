"use client";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Bike,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import type { AuthSession } from "../lib/auth";
const nav = [
  { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
  { id: "orders", label: "Fichas", icon: ClipboardList },
  { id: "repuestos", label: "Repuestos", icon: Package },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "vehicles", label: "Motos", icon: Bike },
  { id: "catalog", label: "Controles", icon: Package },
  { id: "reports", label: "Reportes", icon: BarChart3 },
  { id: "audit", label: "Auditoría", icon: FileText },
  { id: "services", label: "Service", icon: Wrench },
];
export function AppShell({
  children,
  page,
  onPage,
  onNewOrder,
  onLogout,
  session,
}: {
  children: ReactNode;
  page: string;
  onPage: (page: string) => void;
  onNewOrder: () => void;
  onLogout: () => void | Promise<void>;
  session: AuthSession;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = session.user.rol === "ADMINISTRACION";
  const visibleNav = nav.filter((item) => item.id !== "audit" || isAdmin);
  const go = (target: string) => {
    onPage(target);
    setMenuOpen(false);
  };
  const back = () => {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else onPage("dashboard");
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
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
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={page === item.id ? "active" : ""}
                onClick={() => go(item.id)}
                title={item.label}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          {isAdmin && <button className="settings" onClick={() => go("settings")} title="Administración">
            <Settings size={18} /> <span>Administración</span>
          </button>}
          <button className="settings" onClick={onLogout} title="Cerrar sesión">
            <LogOut size={18} /> <span>Cerrar sesión</span>
          </button>
          <button
            className="settings collapse-toggle"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            <span>{collapsed ? "Expandir" : "Contraer"}</span>
          </button>
        </div>
      </aside>
      <main className={`main${collapsed ? " sidebar-collapsed" : ""}`}>
        <header className="mobile-header">
          <button aria-label="Abrir menú" onClick={() => setMenuOpen(true)}>
            <Menu />
          </button>
          <button className="brand-text" onClick={() => go("dashboard")}>
            AviantoSoftware
          </button>
          <button
            className="button mobile-new"
            onClick={onNewOrder}
            aria-label="Nueva ficha"
          >
            <Plus size={17} /> <span>Nueva ficha</span>
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
          {visibleNav.map((item) => {
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
            + Nueva ficha
          </button>
          <button className="settings mobile-logout" onClick={onLogout}>
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      )}
      <nav className="mobile-nav">
        <button
          className={page === "orders" ? "active" : ""}
          onClick={() => go("orders")}
        >
          <ClipboardList size={20} />
          <span>Fichas</span>
        </button>
        <button onClick={back}>
          <ChevronLeft size={20} />
          <span>Volver</span>
        </button>
      </nav>
    </div>
  );
}
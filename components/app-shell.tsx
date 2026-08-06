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
  Plus,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import type { AuthSession } from "../lib/auth";
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
  const isAdmin = session.user.rol === "ADMINISTRACION";
  const visibleNav = nav.filter((item) => item.id !== "audit" || isAdmin);
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
          {visibleNav.map((item) => {
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
            <Plus size={17} /> <span>Nuevo pedido</span>
          </button>
          {isAdmin && <button className="settings" onClick={() => go("settings")}>
            <Settings size={18} /> Administración
          </button>}
          <button className="settings" onClick={onLogout}>
            <LogOut size={18} /> Cerrar sesión
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
            className="button mobile-new"
            onClick={onNewOrder}
            aria-label="Nuevo pedido"
          >
            <Plus size={17} /> <span>Nuevo pedido</span>
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
            + Nuevo pedido
          </button>
          <button className="settings mobile-logout" onClick={onLogout}>
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      )}
      <nav className="mobile-nav">
        {visibleNav.slice(0, 5).map((item) => {
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

"use client";
import { useState, type ReactNode } from "react";
import {
  Bike,
  ChevronDown,
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
} from "lucide-react";
import type { AuthSession } from "../lib/auth";
const home = { id: "dashboard", label: "Inicio", icon: LayoutDashboard };
const navGroups = [
  { id: "operation", label: "Operación", items: [{ id: "orders", label: "Fichas", icon: ClipboardList }, { id: "repuestos", label: "Repuestos", icon: Package }] },
  { id: "records", label: "Registros", items: [{ id: "clients", label: "Clientes", icon: Users }, { id: "vehicles", label: "Motos", icon: Bike }, { id: "catalog", label: "Controles", icon: Package }] },
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
  const [openGroup, setOpenGroup] = useState("operation");
  const isAdmin = session.user.rol === "ADMINISTRACION";
  const go = (target: string) => {
    onPage(target);
    setMenuOpen(false);
  };
  const back = () => {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else onPage("dashboard");
  };
  const renderItem = (item: typeof home) => {
    const Icon = item.icon;
    return (
      <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => go(item.id)} title={item.label}>
        <Icon size={20} />
        <span>{item.label}</span>
      </button>
    );
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
          {renderItem(home)}
          {navGroups.map((group) => {
            const expanded = openGroup === group.id || group.items.some((item) => item.id === page);
            return (
              <section className={`nav-group${expanded ? " expanded" : ""}`} key={group.id}>
                <button className="nav-group-toggle" onClick={() => setOpenGroup((current) => current === group.id ? "" : group.id)} aria-expanded={expanded} title={group.label}>
                  <span>{group.label}</span><ChevronDown size={17} aria-hidden="true" />
                </button>
                <div className="nav-group-items">{group.items.map(renderItem)}</div>
              </section>
            );
          })}
          {isAdmin && <div className="sidebar-separated">{renderItem({ id: "audit", label: "Auditoría", icon: FileText })}</div>}
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
          {renderItem(home)}
          {navGroups.map((group) => (
            <section className="mobile-nav-group" key={group.id}>
              <p>{group.label}</p>
              {group.items.map(renderItem)}
            </section>
          ))}
          {isAdmin && renderItem({ id: "audit", label: "Auditoría", icon: FileText })}
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

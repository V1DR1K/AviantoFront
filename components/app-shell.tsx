"use client";
import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ArrowRightLeft,
  BookOpen,
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
const home = { id: "dashboard", label: "Inicio", icon: LayoutDashboard };
const navGroups = [
  { id: "taller", label: "Taller", items: [{ id: "orders", label: "Fichas", icon: FileText }, { id: "repuestos", label: "Pedidos", icon: Package }] },
  { id: "ventas", label: "Ventas", items: [{ id: "sales", label: "Ventas", icon: LayoutDashboard }, { id: "transfers", label: "Transferencias", icon: ArrowRightLeft }] },
  { id: "records", label: "Registros", items: [{ id: "clients", label: "Clientes", icon: Users }, { id: "catalog", label: "Controles", icon: Package }, { id: "trabajos", label: "Trabajos", icon: Wrench, adminOnly: true }] },
];
export function AppShell({
  children,
  page,
  onPage,
  onIntake,
  onLogout,
  session,
}: {
  children: ReactNode;
  page: string;
  onPage: (page: string) => void;
  onIntake: () => void;
  onLogout: () => void | Promise<void>;
  session: AuthSession;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const activeGroup = navGroups.find((group) => group.items.some((item) => item.id === page))?.id;
  const [openGroup, setOpenGroup] = useState(activeGroup ?? "taller");
  const isAdmin = session.user.rol === "ADMINISTRACION";
  const openMenu = () => {
    if (activeGroup) setOpenGroup(activeGroup);
    setMenuOpen(true);
  };
  const go = (target: string) => {
    onPage(target);
    setMenuOpen(false);
  };
  const toggleGroup = (groupId: string) => setOpenGroup((current) => current === groupId ? "" : groupId);
  const renderItem = (item: typeof home & { adminOnly?: boolean }) => {
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
          {renderItem({ id: "profiles", label: "Perfiles", icon: ClipboardList })}
          {renderItem({ id: "wiki", label: "Wiki", icon: BookOpen })}
          {navGroups.map((group) => {
            const expanded = openGroup === group.id || group.items.some((item) => item.id === page);
            return (
              <section className={`nav-group${expanded ? " expanded" : ""}`} key={group.id}>
                <button className="nav-group-toggle" onClick={() => setOpenGroup((current) => current === group.id ? "" : group.id)} aria-expanded={expanded} title={group.label}>
                  <span>{group.label}</span><ChevronDown size={17} aria-hidden="true" />
                </button>
                <div className="nav-group-items">{group.items.filter((item) => !item.adminOnly || isAdmin).map(renderItem)}</div>
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
          <button aria-label="Abrir menú" onClick={openMenu}>
            <Menu />
          </button>
          <button className="brand-text" onClick={() => go("dashboard")}>
            AviantoSoftware
          </button>
          <button
            className="button mobile-new"
            onClick={onIntake}
            aria-label="Ingresar moto"
          >
            <Plus size={17} /> <span>Ingresar moto</span>
          </button>
        </header>
        {children}
      </main>
      {menuOpen && (
        <>
          <button className="mobile-drawer-backdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />
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
              {renderItem({ id: "profiles", label: "Perfiles", icon: ClipboardList })}
              {renderItem({ id: "wiki", label: "Wiki", icon: BookOpen })}
             {navGroups.map((group) => (
              <section className={`mobile-nav-group${openGroup === group.id ? " expanded" : ""}`} key={group.id}>
                <button className="mobile-nav-group-toggle" type="button" aria-expanded={openGroup === group.id} onClick={() => toggleGroup(group.id)}>
                  <span>{group.label}</span><ChevronDown size={17} aria-hidden="true" />
                </button>
                <div className="mobile-nav-group-items">
                  {group.items.filter((item) => !item.adminOnly || isAdmin).map(renderItem)}
                </div>
              </section>
            ))}
            {isAdmin && renderItem({ id: "audit", label: "Auditoría", icon: FileText })}
            <button
              className="button primary"
              onClick={() => {
                onIntake();
                setMenuOpen(false);
              }}
            >
              + Ingresar moto
            </button>
            <button className="settings mobile-logout" onClick={onLogout}>
              <LogOut size={18} /> Cerrar sesión
            </button>
          </div>
        </>
      )}
      <nav className="mobile-nav">
        <button
          className={page === "dashboard" ? "active" : ""}
          onClick={() => go("dashboard")}
        >
          <LayoutDashboard size={20} />
          <span>Inicio</span>
        </button>
        <button className={page === "profiles" ? "active" : ""} onClick={() => go("profiles")}>
          <ClipboardList size={20} />
          <span>Perfiles</span>
        </button>
        <button className={page === "orders" ? "active" : ""} onClick={() => go("orders")}>
          <FileText size={20} />
          <span>Fichas</span>
        </button>
        <button className={page === "repuestos" ? "active" : ""} onClick={() => go("repuestos")}>
          <Package size={20} />
          <span>Repuestos</span>
        </button>
        <button onClick={openMenu}>
          <Menu size={20} />
          <span>Más</span>
        </button>
      </nav>
    </div>
  );
}

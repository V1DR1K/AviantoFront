"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  Package,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import type { AuthSession } from "../lib/auth";
import { BrandLogo } from "./brand-logo";
import { AviantoHeader, BottomNavigation } from "./avianto-mobile";
const home = { id: "dashboard", label: "Inicio", icon: LayoutDashboard };
const navGroups = [
  { id: "taller", label: "Taller", items: [{ id: "orders", label: "Fichas", icon: FileText }, { id: "repuestos", label: "Pedidos", icon: Package }] },
  { id: "ventas", label: "Ventas", items: [{ id: "sales", label: "Ventas", icon: LayoutDashboard }, { id: "transfers", label: "Transferencias", icon: ArrowRightLeft }] },
  { id: "records", label: "Registros", items: [{ id: "clients", label: "Clientes", icon: Users }, { id: "catalog", label: "Controles", icon: Package, adminOnly: true }, { id: "trabajos", label: "Trabajos", icon: Wrench, adminOnly: true }] },
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
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
  useEffect(() => {
    if (!menuOpen) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFirst = window.requestAnimationFrame(() => drawerRef.current?.querySelector<HTMLElement>("button, [href], input")?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMenuOpen(false); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled])") ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { window.cancelAnimationFrame(focusFirst); document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; previousFocus.current?.focus(); };
  }, [menuOpen]);
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
          <BrandLogo variant="white" size="sm" />
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
        <AviantoHeader onMenu={openMenu} onHome={() => go("dashboard")} onIntake={onIntake} />
        {children}
      </main>
      {menuOpen && (
        <>
          <button className="mobile-drawer-backdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />
           <div
             ref={drawerRef}
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
      <BottomNavigation page={page} onPage={go} onMenu={openMenu} />
    </div>
  );
}

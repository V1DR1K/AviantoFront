"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AuthSession } from "../lib/auth";
import { AviantoHeader, BottomNavigation } from "./avianto-mobile";
import { aviantoHome, aviantoNavigationGroups, aviantoPrimaryNavigation, normalizeBottomNavigationPage } from "./avianto-navigation";
import { AviantoSidebarNavigation } from "./avianto-sidebar-navigation";
import { Plus, UserRound } from "lucide-react";
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const isAdmin = session.user.rol === "ADMINISTRACION";
  const currentItem = [aviantoHome, ...aviantoPrimaryNavigation, ...aviantoNavigationGroups.flatMap((group) => group.items)].find((item) => item.id === page);
  const openMenu = () => setMenuOpen(true);
  const go = (target: string) => {
    onPage(target);
    setMenuOpen(false);
  };
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
  return (
    <div className={`app-shell${collapsed ? " sidebar-is-collapsed" : ""}`}>
      <a className="skip-link" href="#avianto-content">Saltar al contenido</a>
      <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
        <AviantoSidebarNavigation
          page={page}
          isAdmin={isAdmin}
          variant="sidebar"
          collapsed={collapsed}
          onNavigate={go}
          onLogout={onLogout}
          onIntake={onIntake}
          onToggleCollapse={() => setCollapsed((value) => !value)}
        />
      </aside>
      <main className={`main${collapsed ? " sidebar-collapsed" : ""}`}>
        <AviantoHeader onMenu={openMenu} onHome={() => go("dashboard")} onIntake={onIntake} />
        <div className="avianto-workspace-header">
          <div className="avianto-workspace-location"><span>Avianto</span><span aria-hidden="true">/</span><strong>{currentItem?.label ?? "Detalle del registro"}</strong></div>
          <div className="avianto-workspace-tools"><div className="avianto-user"><UserRound size={19} aria-hidden="true" /><span><strong>{session.user.nombre}</strong><small>{isAdmin ? "Administración" : "Operario"}</small></span></div><button type="button" className="button primary" onClick={onIntake}><Plus size={18} aria-hidden="true" />Ingresar moto</button></div>
        </div>
        <div id="avianto-content" tabIndex={-1}>{children}</div>
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
            <AviantoSidebarNavigation
              page={page}
              isAdmin={isAdmin}
              variant="drawer"
              onNavigate={go}
              onLogout={onLogout}
              onIntake={onIntake}
              onClose={() => setMenuOpen(false)}
            />
          </div>
        </>
      )}
      <BottomNavigation page={normalizeBottomNavigationPage(page)} onPage={go} onMenu={openMenu} />
    </div>
  );
}

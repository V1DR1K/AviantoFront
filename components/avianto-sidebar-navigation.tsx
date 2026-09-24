"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, LogOut, X } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import {
  aviantoHome,
  aviantoNavigationGroups,
  aviantoPrimaryNavigation,
  type AviantoNavigationItem,
} from "./avianto-navigation";

type AviantoSidebarNavigationProps = {
  page: string;
  isAdmin: boolean;
  variant: "sidebar" | "drawer";
  collapsed?: boolean;
  onNavigate: (page: string) => void;
  onLogout: () => void | Promise<void>;
  onIntake: () => void;
  onToggleCollapse?: () => void;
  onClose?: () => void;
};

export function AviantoSidebarNavigation({
  page,
  isAdmin,
  variant,
  collapsed = false,
  onNavigate,
  onLogout,
  onIntake,
  onToggleCollapse,
  onClose,
}: AviantoSidebarNavigationProps) {
  const activeGroup = aviantoNavigationGroups.find((group) => group.items.some((item) => item.id === page))?.id;
  const [openGroup, setOpenGroup] = useState(activeGroup ?? "taller");
  const isDrawer = variant === "drawer";

  const go = (target: string) => {
    onNavigate(target);
    onClose?.();
  };

  const renderItem = (item: AviantoNavigationItem) => {
    const Icon = item.icon;
    const active = page === item.id;
    return (
      <button
        key={item.id}
        type="button"
        className={`avianto-nav-item${active ? " active" : ""}`}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        onClick={() => go(item.id)}
        title={item.label}
      >
        <Icon size={20} aria-hidden="true" />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className={`avianto-sidebar-navigation avianto-sidebar-navigation-${variant}${collapsed ? " is-collapsed" : ""}`}>
      {isDrawer && (
        <button type="button" className="avianto-nav-close" onClick={onClose}>
          <span>Cerrar menú</span>
          <X size={18} aria-hidden="true" />
        </button>
      )}
      <button type="button" className="avianto-nav-brand" onClick={() => go("dashboard")} aria-label="Ir al inicio">
        {!isDrawer && <BrandLogo className="avianto-nav-logo-symbol" variant="white" markOnly size="sm" />}
        <BrandLogo className="avianto-nav-logo-lockup" variant="white" size={isDrawer ? "md" : "sm"} descriptor={isDrawer} />
      </button>
      <nav className="avianto-nav-menu" aria-label={isDrawer ? "Menú principal móvil" : "Menú principal"}>
        {renderItem(aviantoHome)}
        {aviantoPrimaryNavigation.map(renderItem)}
        {aviantoNavigationGroups.map((group) => {
          const expanded = openGroup === group.id || group.items.some((item) => item.id === page);
          const visibleItems = group.items.filter((item) => !item.adminOnly || isAdmin);
          return (
            <section className={`avianto-nav-group${expanded ? " expanded" : ""}`} key={group.id}>
              <button
                type="button"
                className="avianto-nav-group-toggle"
                aria-label={group.label}
                onClick={() => setOpenGroup((current) => current === group.id ? "" : group.id)}
                aria-expanded={expanded}
                title={group.label}
              >
                <span>{group.label}</span>
                <ChevronDown size={17} aria-hidden="true" />
              </button>
              <div className="avianto-nav-group-items">{visibleItems.map(renderItem)}</div>
            </section>
          );
        })}
      </nav>
      <div className="avianto-nav-footer">
        {isDrawer && (
          <button type="button" className="button primary avianto-nav-intake" onClick={() => { onIntake(); onClose?.(); }}>
            + Ingresar moto
          </button>
        )}
        <button type="button" className="avianto-nav-utility" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut size={18} aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>
        {!isDrawer && onToggleCollapse && (
          <button
            type="button"
            className="avianto-nav-utility avianto-nav-collapse"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
          >
            {collapsed ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
            <span>{collapsed ? "Expandir" : "Contraer"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

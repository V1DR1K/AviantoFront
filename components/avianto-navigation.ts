import {
  ArrowRightLeft,
  BookOpen,
  ClipboardList,
  FileBarChart,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type AviantoNavigationItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  // Código de permiso de menú (menu.*) que habilita la sección. Sin valor, siempre visible.
  permission?: string;
};

export type AviantoNavigationGroup = {
  id: string;
  label: string;
  items: AviantoNavigationItem[];
};

export const aviantoHome: AviantoNavigationItem = {
  id: "dashboard",
  label: "Inicio",
  icon: LayoutDashboard,
  permission: "menu.inicio",
};

export const aviantoPrimaryNavigation: AviantoNavigationItem[] = [
  { id: "profiles", label: "Perfiles", icon: ClipboardList, permission: "menu.perfiles" },
  { id: "wiki", label: "Wiki", icon: BookOpen, permission: "menu.wiki" },
];

export const aviantoNavigationGroups: AviantoNavigationGroup[] = [
  {
    id: "taller",
    label: "Taller",
    items: [
      { id: "orders", label: "Fichas", icon: FileText, permission: "menu.fichas" },
      { id: "repuestos", label: "Pedidos", icon: Package, permission: "menu.pedidos" },
      { id: "services", label: "Services", icon: Wrench, permission: "menu.services" },
    ],
  },
  {
    id: "ventas",
    label: "Ventas",
    items: [
      { id: "sales", label: "Ventas", icon: LayoutDashboard, permission: "menu.ventas" },
      { id: "transfers", label: "Transferencias", icon: ArrowRightLeft, permission: "menu.transferencias" },
    ],
  },
  {
    id: "registros",
    label: "Registros",
    items: [
      { id: "clients", label: "Clientes", icon: Users, permission: "menu.clientes" },
      { id: "vehicles", label: "Motos", icon: ClipboardList, permission: "menu.motos" },
      { id: "catalog", label: "Controles", icon: SlidersHorizontal, permission: "menu.controles" },
      { id: "trabajos", label: "Trabajos", icon: Wrench, permission: "menu.trabajos" },
    ],
  },
  {
    id: "gestion",
    label: "Gestión",
    items: [
      { id: "reports", label: "Reportes", icon: FileBarChart, permission: "menu.reportes" },
      { id: "roles", label: "Roles", icon: ShieldCheck, permission: "menu.roles" },
      { id: "audit", label: "Auditoría", icon: FileText, permission: "menu.auditoria" },
      { id: "settings", label: "Administración", icon: Settings, permission: "menu.administracion" },
    ],
  },
];

// Permiso de menú que exige cada página. Las páginas sin entrada son de acceso libre (p. ej. fichas y motos
// abiertas desde otra pantalla, que ya validan sus propias acciones).
export const pagePermission: Record<string, string> = Object.fromEntries(
  [aviantoHome, ...aviantoPrimaryNavigation, ...aviantoNavigationGroups.flatMap((group) => group.items)]
    .filter((item) => item.permission)
    .map((item) => [item.id, item.permission as string]),
);

const pageAliases: Record<string, string> = {
  profile: "profiles",
  create: "orders",
  edit: "orders",
  fichas: "orders",
  intake: "dashboard",
  "taller-dashboard": "dashboard",
  "ventas-dashboard": "sales",
  sale: "sales",
  "repuesto-create": "repuestos",
  repuesto: "repuestos",
};

export function normalizeNavigationPage(page: string) {
  return pageAliases[page] ?? page;
}

const bottomNavigationPages = new Set(["dashboard", "profiles", "orders", "repuestos"]);

export function normalizeBottomNavigationPage(page: string) {
  const normalized = normalizeNavigationPage(page);
  return bottomNavigationPages.has(normalized) ? normalized : "more";
}


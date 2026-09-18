import {
  ArrowRightLeft,
  BookOpen,
  ClipboardList,
  FileBarChart,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  SlidersHorizontal,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type AviantoNavigationItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
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
};

export const aviantoPrimaryNavigation: AviantoNavigationItem[] = [
  { id: "profiles", label: "Perfiles", icon: ClipboardList },
  { id: "wiki", label: "Wiki", icon: BookOpen },
];

export const aviantoNavigationGroups: AviantoNavigationGroup[] = [
  {
    id: "taller",
    label: "Taller",
    items: [
      { id: "orders", label: "Fichas", icon: FileText },
      { id: "repuestos", label: "Pedidos", icon: Package },
      { id: "services", label: "Services", icon: Wrench },
    ],
  },
  {
    id: "ventas",
    label: "Ventas",
    items: [
      { id: "sales", label: "Ventas", icon: LayoutDashboard },
      { id: "transfers", label: "Transferencias", icon: ArrowRightLeft },
    ],
  },
  {
    id: "registros",
    label: "Registros",
    items: [
      { id: "clients", label: "Clientes", icon: Users },
      { id: "vehicles", label: "Motos", icon: ClipboardList },
      { id: "catalog", label: "Controles", icon: SlidersHorizontal, adminOnly: true },
      { id: "trabajos", label: "Trabajos", icon: Wrench, adminOnly: true },
    ],
  },
  {
    id: "gestion",
    label: "Gestión",
    items: [
      { id: "reports", label: "Reportes", icon: FileBarChart },
      { id: "audit", label: "Auditoría", icon: FileText, adminOnly: true },
      { id: "settings", label: "Administración", icon: Settings, adminOnly: true },
    ],
  },
];

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


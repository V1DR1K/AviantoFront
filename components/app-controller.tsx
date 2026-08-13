"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "./app-shell";
import { FichaForm } from "./ficha-form";
import { ProfilesView } from "./profiles-view";
import {
  Dashboard,
  FichaDetail,
  FichasView,
  ReportsView,
  ServicesView,
  VentasView,
} from "./views";
import { MotoDetail } from "./moto-detail";
import { RepuestoDetail, RepuestosView } from "./repuestos-view";
import { TransferenciasView } from "./transferencias-view";
import { ConfirmModal, Toast, type Notify, type ToastState } from "./ui";
import { AdminView, SettingsView } from "./admin-view";
import { TrabajosCatalogoView } from "./trabajos-catalogo-view";
import type { FichaResponse } from "../lib/types";
import { LoginView } from "./login-view";
import { IntakeView } from "./intake-view";
import {
  clearSession,
  decodeAccessExpiry,
  getSession,
  logout,
  refreshSession,
  type AuthSession,
} from "../lib/auth";
import { api } from "../lib/api";

type RouteState = {
  page: string;
  fichaId?: string;
  motoId?: string;
  repuestoId?: string;
  initialClientId?: string;
  initialMotoId?: string;
  initialPlate?: string;
  intake?: boolean;
  returnTo?: string;
  tab?: "general" | "client" | "services" | "fichas" | "repuestos";
  invalid?: boolean;
};

const safeReturnTo = (value: string | null) =>
  value && value.startsWith("/") ? value : undefined;

const confirmationError = (reason: unknown) =>
  reason instanceof Error ? reason.message : "No fue posible completar la acción.";

function routeState(pathname: string, search: string): RouteState {
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(search);
  const returnTo = safeReturnTo(query.get("returnTo"));
  const base = query.get("base");
  const requestedTab = query.get("tab");
  const tab = ["general", "client", "services", "fichas", "repuestos"].includes(requestedTab ?? "") ? requestedTab as RouteState["tab"] : undefined;
  const initialClientId = query.get("clienteId") || undefined;
  const initialMotoId = query.get("motoId") || undefined;
  const initialPlate = query.get("dominio") || undefined;

  if (!segments.length) return { page: "dashboard" };
  if (segments[0] === "login" && segments.length === 1) return { page: "login" };
  if (segments[0] === "app" && segments.length === 1) return { page: "dashboard" };
  if (segments[0] === "perfiles" && segments[1] === "nuevo" && segments.length === 2) {
    return { page: "profiles", intake: true, returnTo: returnTo || "/perfiles", initialPlate };
  }
  if (segments[0] === "ingresar" && segments.length === 1) return { page: base === "sales" ? "sales" : base === "taller" ? "taller-dashboard" : base === "profiles" ? "profiles" : "dashboard", intake: true, returnTo, initialPlate };
  if (segments[0] === "perfiles" && segments.length === 1) return { page: "profiles" };
  if (segments[0] === "motos" && segments.length === 2) return { page: "profile", motoId: segments[1], returnTo, tab };
  if (segments[0] === "fichas" && segments[1] === "nueva" && segments.length === 2) {
    return { page: "create", initialClientId, initialMotoId, returnTo };
  }
  if (segments[0] === "fichas" && segments.length === 3 && segments[2] === "editar") {
    return { page: "edit", fichaId: segments[1], returnTo };
  }
  if (segments[0] === "fichas" && segments.length === 2) return { page: "fichas", fichaId: segments[1], returnTo };
  if (segments[0] === "fichas" && segments.length === 1) return { page: "orders" };
  if (segments[0] === "repuestos" && segments[1] === "nuevo" && segments.length === 2) {
    return { page: "repuesto-create", initialClientId, initialMotoId, returnTo };
  }
  if (segments[0] === "repuestos" && segments.length === 2) return { page: "repuesto", repuestoId: segments[1], returnTo };
  if (segments[0] === "repuestos" && segments.length === 1) return { page: "repuestos" };

  const pages: Record<string, string> = {
    transferencias: "transfers",
    clientes: "clients",
    motos: "vehicles",
    controles: "catalog",
    trabajos: "trabajos",
    auditoria: "audit",
    administracion: "settings",
    services: "services",
    reportes: "reports",
    taller: "taller-dashboard",
    ventas: "sales",
  };
  const page = segments.length === 1 ? pages[segments[0]] : undefined;
  return page ? { page } : { page: "dashboard", invalid: true };
}

const pathForPage = (page: string) => ({
  dashboard: "/app",
  profiles: "/perfiles",
  transfers: "/transferencias",
  repuestos: "/repuestos",
  clients: "/clientes",
  vehicles: "/motos",
  catalog: "/controles",
  trabajos: "/trabajos",
  audit: "/auditoria",
  settings: "/administracion",
  services: "/services",
    reports: "/reportes",
    intake: "/ingresar",
    sales: "/ventas",
    "taller-dashboard": "/taller",
    "ventas-dashboard": "/ventas",
  orders: "/fichas",
}[page] ?? "/");

const shellPage = (page: string) => {
  if (page === "profile") return "profiles";
  if (page === "intake") return "dashboard";
  if (page === "sales") return "sales";
  if (page === "taller-dashboard") return "taller-dashboard";
  if (page === "ventas-dashboard") return "ventas-dashboard";
  if (page === "repuesto-create" || page === "repuesto") return "repuestos";
  return page;
};

export function AppController() {
  const pathname = usePathname();
  const router = useRouter();
  const urlSearch = useSyncExternalStore(
    (onStoreChange) => {
      const onPopState = () => onStoreChange();
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    },
    () => window.location.search,
    () => "",
  );
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    successMessage: string;
    variant?: "danger" | "success";
    action: () => void | Promise<unknown>;
  } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const lastToast = useRef<{ message: string; tone: ToastState["tone"]; at: number } | null>(null);
  const notify = useCallback<Notify>((message, tone = "success") => {
    const now = Date.now();
    if (lastToast.current?.message === message && lastToast.current.tone === tone && now - lastToast.current.at < 500) return;
    lastToast.current = { message, tone, at: now };
    setToast({ message, tone });
  }, []);
  const route = routeState(pathname || "/", urlSearch);

  useEffect(() => {
    const bootstrap = async () => {
      if (!getSession()) return setSession(null);
      const next = await refreshSession();
      if (!next) {
        notify("Tu sesión expiró. Ingresá nuevamente para continuar.", "warning");
        return setSession(null);
      }
      try {
        const user = await api<AuthSession["user"]>("/auth/me");
        const verified = { ...next, user };
        sessionStorage.setItem("avianto.session", JSON.stringify(verified));
        setSession(verified);
      } catch {
        clearSession();
        setSession(null);
      }
    };
    void bootstrap();
    const expired = () => {
      const message = "Tu sesión expiró. Ingresá nuevamente para continuar.";
      notify(message, "warning");
      setSession(null);
    };
    window.addEventListener("avianto:session-expired", expired);
    const apiError = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      notify(detail?.message ?? "No fue posible completar la operación.", "error");
    };
    window.addEventListener("avianto:api-error", apiError);
    const downloadSuccess = (event: Event) => {
      const filename = (event as CustomEvent<{ filename?: string }>).detail?.filename;
      notify(filename ? `${filename} descargado.` : "Archivo descargado.");
    };
    window.addEventListener("avianto:download-success", downloadSuccess);
    return () => {
      window.removeEventListener("avianto:session-expired", expired);
      window.removeEventListener("avianto:api-error", apiError);
      window.removeEventListener("avianto:download-success", downloadSuccess);
    };
  }, [notify]);

  useEffect(() => {
    if (!session) return;
    const sessionRef = { value: session };
    const tick = () => {
      const exp = decodeAccessExpiry(sessionRef.value.accessToken);
      if (!exp) return;
      const remaining = exp - Date.now();
      if (remaining <= 60_000) void refreshSession().then((next) => {
        if (next) setSession(next);
        else {
          notify("Tu sesión expiró. Ingresá nuevamente para continuar.", "warning");
          setSession(null);
        }
      });
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [notify, session]);

  useEffect(() => {
    if (route.invalid) router.replace("/app");
    if (session && route.page === "login") router.replace("/app");
    if (session?.user.rol !== "ADMINISTRACION" && ["audit", "settings", "trabajos"].includes(route.page)) {
      router.replace("/app");
    }
  }, [route.invalid, route.page, router, session]);

  if (session === undefined) return null;
  if (!session) return <><LoginView notify={notify} onAuthenticated={setSession} /><Toast notification={toast} onClose={() => setToast(null)} /></>;

  const navigate = (path: string) => router.push(path);
  const navigatePage = (page: string) => {
    if (session.user.rol !== "ADMINISTRACION" && ["audit", "settings", "trabajos"].includes(page)) return navigate("/app");
    navigate(pathForPage(page));
  };
  const openFicha = (ficha: FichaResponse, returnTo?: string) => { const params = new URLSearchParams(); if (returnTo) params.set("returnTo", returnTo); navigate(`/fichas/${ficha.id}${params.size ? `?${params}` : ""}`); };
  const openMoto = (id: string, returnTo?: string, tab?: RouteState["tab"]) => { const params = new URLSearchParams(); if (returnTo) params.set("returnTo", returnTo); if (tab) params.set("tab", tab); navigate(`/motos/${id}${params.size ? `?${params}` : ""}`); };
  const openRepuesto = (repuesto: { id: string }, returnTo?: string) => { const params = new URLSearchParams(); if (returnTo) params.set("returnTo", returnTo); navigate(`/repuestos/${repuesto.id}${params.size ? `?${params}` : ""}`); };
  const createFichaForMoto = (prefill: { motoId: string; clienteId?: string | null }) => {
    const params = new URLSearchParams({ motoId: prefill.motoId });
    params.set("returnTo", `/motos/${prefill.motoId}?tab=fichas`);
    navigate(`/fichas/nueva?${params}`);
  };
  const createRepuestoForMoto = (prefill: { motoId: string; clienteId?: string | null }) => {
    const params = new URLSearchParams({ motoId: prefill.motoId });
    if (prefill.clienteId) params.set("clienteId", prefill.clienteId);
    params.set("returnTo", `/motos/${prefill.motoId}?tab=repuestos`);
    navigate(`/repuestos/nuevo?${params}`);
  };
  const currentPage = ["audit", "settings", "trabajos"].includes(route.page) && session.user.rol !== "ADMINISTRACION" ? "dashboard" : route.page;
  let content: ReactNode;
  if (currentPage === "create") {
      content = route.initialMotoId ? <FichaForm key={`${pathname}?${urlSearch}`} initialMotoId={route.initialMotoId} onClose={() => navigate(route.returnTo || "/perfiles")} onSave={(ficha) => { notify("Ficha creada correctamente."); setRefreshKey((key) => key + 1); openFicha(ficha, route.returnTo); }} notify={notify} /> : <ProfilesView onIntake={(plate) => navigate(`/ingresar?returnTo=%2Fperfiles&base=profiles${plate ? `&dominio=${encodeURIComponent(plate)}` : ""}`)} onOpen={openMoto} notify={notify} />;
  } else if (currentPage === "edit" && route.fichaId) {
     content = <FichaForm key={route.fichaId} fichaKey={route.fichaId} onClose={() => navigate(route.returnTo || "/fichas")} onSave={() => { notify("Ficha actualizada correctamente."); setRefreshKey((key) => key + 1); navigate(route.returnTo || "/fichas"); }} notify={notify} />;
  } else if (currentPage === "dashboard") {
        content = <Dashboard onIntake={() => navigate("/ingresar?returnTo=%2Fapp&base=dashboard")} onSelect={(ficha) => openFicha(ficha, "/app")} onOpenMoto={(id) => openMoto(id, "/app")} userName={session.user.nombre} notify={notify} />;
  } else if (currentPage === "taller-dashboard") {
        content = <Dashboard initialSection="taller" onIntake={() => navigate("/ingresar?returnTo=%2Ftaller&base=taller")} onSelect={(ficha) => openFicha(ficha, "/taller")} onOpenMoto={(id) => openMoto(id, "/taller")} userName={session.user.nombre} notify={notify} />;
  } else if (currentPage === "sales") {
      content = <VentasView onIntake={() => navigate("/ingresar?returnTo=%2Fventas&base=sales")} onOpenMoto={(id) => openMoto(id, "/ventas")} onOpenTransfers={(id) => navigate(`/transferencias?motoId=${encodeURIComponent(id)}`)} notify={notify} canCompleteSale={session.user.rol === "ADMINISTRACION"} />;
  } else if (currentPage === "profiles") {
     content = <ProfilesView onIntake={(plate) => navigate(`/ingresar?returnTo=%2Fperfiles&base=profiles${plate ? `&dominio=${encodeURIComponent(plate)}` : ""}`)} onOpen={openMoto} notify={notify} />;
  } else if (currentPage === "orders") {
       content = <FichasView key={refreshKey} onNewOrder={() => navigate("/perfiles")} onSelect={(ficha) => openFicha(ficha, "/fichas")} onEdit={(ficha) => navigate(`/fichas/${ficha.id}/editar?returnTo=%2Ffichas`)} onDelete={(ficha) => setConfirmation({ title: "Eliminar ficha", body: `Vas a dar de baja la ficha ${ficha.numero}. El historial conservará el registro para auditoría.`, confirmLabel: "Eliminar ficha", successMessage: "Ficha eliminada correctamente.", action: () => api(`/fichas/${ficha.id}`, { method: "DELETE" }).then(() => setRefreshKey((key) => key + 1)) })} notify={notify} />;
  } else if (currentPage === "fichas" && route.fichaId) {
      content = <FichaDetail fichaKey={route.fichaId} onBack={() => navigate(route.returnTo || "/fichas")} onConfirm={(request) => setConfirmation(request)} onOpenMoto={(id, tab) => openMoto(id, route.returnTo || `/fichas/${route.fichaId}`, tab ?? "fichas")} notify={notify} />;
  } else if (currentPage === "profile" && route.motoId) {
      content = <MotoDetail key={`${pathname}?${urlSearch}`} id={route.motoId} initialTab={route.tab} onBack={() => navigate(route.returnTo || "/perfiles")} onOpenFicha={(ficha) => openFicha(ficha, `/motos/${route.motoId}?tab=fichas`)} onOpenRepuesto={(repuesto) => openRepuesto(repuesto, `/motos/${route.motoId}?tab=repuestos`)} onNewFicha={createFichaForMoto} onNewRepuesto={createRepuestoForMoto} onIntake={(plate) => navigate(`/ingresar?returnTo=${encodeURIComponent(`/motos/${route.motoId}`)}&base=profiles${plate ? `&dominio=${encodeURIComponent(plate)}` : ""}`)} notify={notify} />;
  } else if (currentPage === "transfers") {
      content = <TransferenciasView canTransfer={session.user.rol === "ADMINISTRACION"} initialMotoId={route.initialMotoId} onOpenMoto={(id) => openMoto(id, "/transferencias", "client")} notify={notify} />;
  } else if (currentPage === "repuestos") {
     content = <RepuestosView onOpen={(repuesto) => openRepuesto(repuesto, "/repuestos")} notify={notify} />;
  } else if (currentPage === "repuesto-create") {
    const prefill = route.initialMotoId ? { motoId: route.initialMotoId, clienteId: route.initialClientId } : null;
     content = <RepuestosView key={`${pathname}?${urlSearch}`} onOpen={(repuesto) => openRepuesto(repuesto, route.returnTo || "/repuestos")} notify={notify} startCreate createPrefill={prefill} onPrefillHandled={() => navigate(route.returnTo || "/repuestos")} />;
  } else if (currentPage === "repuesto" && route.repuestoId) {
     content = <RepuestoDetail repuestoId={route.repuestoId} onBack={() => navigate(route.returnTo || "/repuestos")} notify={notify} />;
  } else if (currentPage === "trabajos") {
    content = <TrabajosCatalogoView notify={notify} />;
  } else if (["clients", "vehicles", "catalog", "audit"].includes(currentPage)) {
     content = <AdminView resource={currentPage as "clients" | "vehicles" | "catalog" | "audit"} notify={notify} onOpenVehicle={(id) => openMoto(id, "/motos", "general")} onOpenServices={() => navigate("/services")} />;
  } else if (currentPage === "services") {
      content = <ServicesView onOpenMoto={(id) => openMoto(id, "/services", "services")} notify={notify} />;
  } else if (currentPage === "settings") {
    content = <SettingsView notify={notify} />;
  } else {
     content = <ReportsView notify={notify} />;
  }

  return (
    <AppShell
      page={shellPage(currentPage)}
      onPage={navigatePage}
       onIntake={() => navigate("/ingresar?returnTo=%2Fapp&base=dashboard")}
      session={session}
      onLogout={async () => {
        await logout();
        notify("Sesión cerrada.");
        setSession(null);
      }}
    >
      {content}
      <ConfirmModal
        open={Boolean(confirmation)}
        title={confirmation?.title ?? ""}
        body={confirmation?.body ?? ""}
        confirmLabel={confirmation?.confirmLabel ?? "Confirmar"}
        variant={confirmation?.variant ?? "danger"}
        onClose={() => setConfirmation(null)}
        onConfirm={() => {
          const pendingConfirmation = confirmation;
          setConfirmation(null);
          if (!pendingConfirmation) return;
           return Promise.resolve()
             .then(pendingConfirmation.action)
             .then(() => notify(pendingConfirmation.successMessage))
             .catch((reason) => {
               notify(confirmationError(reason), "error");
               throw reason;
             });
         }}
      />
       <IntakeView key={`${route.intake ? "open" : "closed"}-${route.initialPlate ?? ""}-${route.returnTo ?? ""}`} open={Boolean(route.intake)} initialPlate={route.initialPlate} onClose={() => navigate(route.returnTo || "/app")} onOpenProfile={(id) => openMoto(id, route.returnTo || "/perfiles")} notify={notify} />
      <Toast notification={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}

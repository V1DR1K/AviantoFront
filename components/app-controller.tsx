"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "./app-shell";
import { FichaForm } from "./ficha-form";
import { ProfileForm } from "./profile-form";
import { ProfilesView } from "./profiles-view";
import {
  Dashboard,
  FichaDetail,
  FichasView,
  ReportsView,
  ServicesView,
} from "./views";
import { MotoDetail } from "./moto-detail";
import { RepuestoDetail, RepuestosView } from "./repuestos-view";
import { TransferenciasView } from "./transferencias-view";
import { ConfirmModal, Toast, type Notify, type ToastState } from "./ui";
import { AdminView, SettingsView } from "./admin-view";
import { TrabajosCatalogoView } from "./trabajos-catalogo-view";
import type { FichaResponse } from "../lib/types";
import { LoginView } from "./login-view";
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
  returnTo?: string;
  invalid?: boolean;
};

const safeReturnTo = (value: string | null) =>
  value && value.startsWith("/") ? value : undefined;

function routeState(pathname: string, search: string): RouteState {
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(search);
  const returnTo = safeReturnTo(query.get("returnTo"));
  const initialClientId = query.get("clienteId") || undefined;
  const initialMotoId = query.get("motoId") || undefined;

  if (!segments.length) return { page: "dashboard" };
  if (segments[0] === "perfiles" && segments[1] === "nuevo" && segments.length === 2) {
    return { page: "new-profile" };
  }
  if (segments[0] === "perfiles" && segments.length === 1) return { page: "profiles" };
  if (segments[0] === "motos" && segments.length === 2) return { page: "profile", motoId: segments[1] };
  if (segments[0] === "fichas" && segments[1] === "nueva" && segments.length === 2) {
    return { page: "create", initialClientId, initialMotoId, returnTo };
  }
  if (segments[0] === "fichas" && segments.length === 3 && segments[2] === "editar") {
    return { page: "edit", fichaId: segments[1] };
  }
  if (segments[0] === "fichas" && segments.length === 2) return { page: "fichas", fichaId: segments[1] };
  if (segments[0] === "fichas" && segments.length === 1) return { page: "orders" };
  if (segments[0] === "repuestos" && segments[1] === "nuevo" && segments.length === 2) {
    return { page: "repuesto-create", initialClientId, initialMotoId, returnTo };
  }
  if (segments[0] === "repuestos" && segments.length === 2) return { page: "repuesto", repuestoId: segments[1] };
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
  };
  const page = segments.length === 1 ? pages[segments[0]] : undefined;
  return page ? { page } : { page: "dashboard", invalid: true };
}

const pathForPage = (page: string) => ({
  dashboard: "/",
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
  "new-profile": "/perfiles/nuevo",
  orders: "/fichas",
}[page] ?? "/");

const shellPage = (page: string) => {
  if (page === "new-profile" || page === "profile") return "profiles";
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
    label: string;
    action: () => void | Promise<unknown>;
  } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const notify: Notify = (message, tone = "success") => setToast({ message, tone });
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
  }, []);

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
  }, [session]);

  useEffect(() => {
    if (route.invalid) router.replace("/");
    if (session?.user.rol !== "ADMINISTRACION" && ["audit", "settings", "trabajos"].includes(route.page)) {
      router.replace("/");
    }
  }, [route.invalid, route.page, router, session]);

  if (session === undefined) return null;
  if (!session) return <><LoginView notify={notify} onAuthenticated={setSession} /><Toast notification={toast} onClose={() => setToast(null)} /></>;

  const navigate = (path: string) => router.push(path);
  const navigatePage = (page: string) => {
    if (session.user.rol !== "ADMINISTRACION" && ["audit", "settings", "trabajos"].includes(page)) return navigate("/");
    navigate(pathForPage(page));
  };
  const openFicha = (ficha: FichaResponse) => navigate(`/fichas/${ficha.id}`);
  const openMoto = (id: string) => navigate(`/motos/${id}`);
  const openRepuesto = (repuesto: { id: string }) => navigate(`/repuestos/${repuesto.id}`);
  const createFichaForMoto = (prefill: { motoId: string; clienteId?: string | null }) => {
    const params = new URLSearchParams({ motoId: prefill.motoId });
    if (prefill.clienteId) params.set("clienteId", prefill.clienteId);
    params.set("returnTo", `/motos/${prefill.motoId}`);
    navigate(`/fichas/nueva?${params}`);
  };
  const createRepuestoForMoto = (prefill: { motoId: string; clienteId?: string | null }) => {
    const params = new URLSearchParams({ motoId: prefill.motoId });
    if (prefill.clienteId) params.set("clienteId", prefill.clienteId);
    params.set("returnTo", `/motos/${prefill.motoId}`);
    navigate(`/repuestos/nuevo?${params}`);
  };
  const currentPage = ["audit", "settings", "trabajos"].includes(route.page) && session.user.rol !== "ADMINISTRACION" ? "dashboard" : route.page;
  let content: ReactNode;
  if (currentPage === "new-profile") {
    content = <ProfileForm onClose={() => navigate("/perfiles")} onOpenProfile={openMoto} onCreated={(id) => { notify("Perfil creado."); openMoto(id); }} notify={notify} />;
  } else if (currentPage === "create") {
    content = <FichaForm key={`${pathname}?${urlSearch}`} initialClientId={route.initialClientId} initialMotoId={route.initialMotoId} onClose={() => navigate(route.returnTo || "/perfiles")} onSave={(ficha) => { notify("Ficha creada."); setRefreshKey((key) => key + 1); openFicha(ficha); }} />;
  } else if (currentPage === "edit" && route.fichaId) {
    content = <FichaForm key={route.fichaId} fichaKey={route.fichaId} onClose={() => navigate("/perfiles")} onSave={() => { notify("Ficha actualizada."); setRefreshKey((key) => key + 1); navigate("/perfiles"); }} />;
  } else if (currentPage === "dashboard") {
    content = <Dashboard onNewOrder={() => navigate("/perfiles/nuevo")} onSelect={openFicha} onOpenMoto={openMoto} userName={session.user.nombre} />;
  } else if (currentPage === "profiles") {
    content = <ProfilesView onNew={() => navigate("/perfiles/nuevo")} onOpen={openMoto} notify={notify} />;
  } else if (currentPage === "orders") {
    content = <FichasView key={refreshKey} onNewOrder={() => navigate("/fichas/nueva")} onSelect={openFicha} onEdit={(ficha) => navigate(`/fichas/${ficha.id}/editar`)} onDelete={(ficha) => setConfirmation({ label: "Borrar ficha", action: () => api(`/fichas/${ficha.id}`, { method: "DELETE" }).then(() => setRefreshKey((key) => key + 1)) })} />;
  } else if (currentPage === "fichas" && route.fichaId) {
    content = <FichaDetail fichaKey={route.fichaId} onBack={() => navigate("/perfiles")} onConfirm={(label, action) => setConfirmation({ label, action })} onOpenMoto={openMoto} notify={notify} />;
  } else if (currentPage === "profile" && route.motoId) {
    content = <MotoDetail id={route.motoId} onBack={() => navigate("/perfiles")} onOpenFicha={openFicha} onOpenRepuesto={openRepuesto} onNewFicha={createFichaForMoto} onNewRepuesto={createRepuestoForMoto} notify={notify} />;
  } else if (currentPage === "transfers") {
    content = <TransferenciasView canTransfer={session.user.rol === "ADMINISTRACION"} onOpenMoto={openMoto} notify={notify} />;
  } else if (currentPage === "repuestos") {
    content = <RepuestosView onOpen={openRepuesto} notify={notify} />;
  } else if (currentPage === "repuesto-create") {
    const prefill = route.initialMotoId ? { motoId: route.initialMotoId, clienteId: route.initialClientId } : null;
    content = <RepuestosView key={`${pathname}?${urlSearch}`} onOpen={openRepuesto} notify={notify} startCreate createPrefill={prefill} onPrefillHandled={() => navigate(route.returnTo || "/repuestos")} />;
  } else if (currentPage === "repuesto" && route.repuestoId) {
    content = <RepuestoDetail repuestoId={route.repuestoId} onBack={() => navigate("/repuestos")} notify={notify} />;
  } else if (currentPage === "trabajos") {
    content = <TrabajosCatalogoView notify={notify} />;
  } else if (["clients", "vehicles", "catalog", "audit"].includes(currentPage)) {
    content = <AdminView resource={currentPage as "clients" | "vehicles" | "catalog" | "audit"} notify={notify} onOpenVehicle={openMoto} onOpenServices={() => navigate("/services")} />;
  } else if (currentPage === "services") {
    content = <ServicesView onOpenMoto={openMoto} />;
  } else if (currentPage === "settings") {
    content = <SettingsView notify={notify} />;
  } else {
    content = <ReportsView />;
  }

  return (
    <AppShell
      page={shellPage(currentPage)}
      onPage={navigatePage}
      onNewOrder={() => navigate("/perfiles/nuevo")}
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
        title={confirmation?.label ?? ""}
        body={`Vas a ejecutar la acción: ${confirmation?.label?.toLowerCase()}. El historial conservará el registro para auditoría.`}
        confirmLabel={confirmation?.label ?? "Confirmar"}
        variant={confirmation?.label?.toLowerCase().includes("pago") ? "success" : "danger"}
        onClose={() => setConfirmation(null)}
        onConfirm={() => {
          const pendingAction = confirmation?.action;
          const label = confirmation?.label;
          setConfirmation(null);
          if (!pendingAction) return;
          void Promise.resolve().then(pendingAction).then(
            () => notify(`${label} realizada.`),
            (reason) => notify(reason instanceof Error ? reason.message : "No fue posible completar la acción.", "error"),
          );
        }}
      />
      <Toast notification={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}

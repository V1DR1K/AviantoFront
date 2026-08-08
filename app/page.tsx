"use client";
import { useEffect, useState } from "react";
import { AppShell } from "../components/app-shell";
import { FichaForm } from "../components/ficha-form";
import {
  Dashboard,
  FichaDetail,
  FichasView,
  ReportsView,
  ServicesView,
} from "../components/views";
import { MotoDetail } from "../components/moto-detail";
import { RepuestoDetail, RepuestosView } from "../components/repuestos-view";
import { ConfirmModal, Toast } from "../components/ui";
import { AdminView, SettingsView } from "../components/admin-view";
import type { FichaResponse } from "../lib/types";
import { LoginView } from "../components/login-view";
import { clearSession, decodeAccessExpiry, getSession, logout, refreshSession, type AuthSession } from "../lib/auth";
import { api } from "../lib/api";

export default function Home() {
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const [page, setPage] = useState("dashboard");
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [editFichaId, setEditFichaId] = useState<string | null>(null);
  const [motoId, setMotoId] = useState<string | null>(null);
  const [repuestoId, setRepuestoId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmation, setConfirmation] = useState<{
    label: string;
    action: () => void;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    const bootstrap = async () => {
      if (!getSession()) return setSession(null);
      const next = await refreshSession();
      if (!next) return setSession(null);
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
    const expired = () => setSession(null);
    window.addEventListener("avianto:session-expired", expired);
    return () => window.removeEventListener("avianto:session-expired", expired);
  }, []);
  useEffect(() => {
    if (!session) return;
    const sessionRef = { value: session };
    const tick = () => {
      const exp = decodeAccessExpiry(sessionRef.value.accessToken);
      if (!exp) return;
      const remaining = exp - Date.now();
      if (remaining <= 60_000) void refreshSession().then((next) => { if (next) setSession(next); });
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [session]);
  if (session === undefined) return null;
  if (!session) return <LoginView onAuthenticated={setSession} />;

  const openFicha = (ficha: FichaResponse) => { setFichaId(ficha.id); setPage("fichas"); };
  const openMoto = (id: string) => { setMotoId(id); setPage("moto"); };
  const openRepuesto = (repuesto: { id: string }) => { setRepuestoId(repuesto.id); setPage("repuesto"); };
  const restricted = session.user.rol !== "ADMINISTRACION";
  const effectivePage = restricted && (page === "audit" || page === "settings") ? "dashboard" : page;
  const setEffectivePage = (target: string) => {
    if (restricted && (target === "audit" || target === "settings")) return setPage("dashboard");
    setPage(target);
  };

  let content;
  if (effectivePage === "create")
    content = <FichaForm onClose={() => setPage("orders")} onSave={() => { setToast("Ficha creada. Podés verla y editarla desde la lista."); setRefreshKey((key) => key + 1); setPage("orders"); }} />;
  else if (effectivePage === "edit" && editFichaId)
    content = <FichaForm key={editFichaId} fichaKey={editFichaId} onClose={() => setPage("orders")} onSave={() => { setToast("Ficha actualizada."); setRefreshKey((key) => key + 1); setPage("orders"); }} />;
  else if (effectivePage === "dashboard")
    content = (
      <Dashboard
        onPage={setEffectivePage}
        onNewOrder={() => setPage("create")}
        onSelect={openFicha}
        onOpenMoto={openMoto}
        userName={session.user.nombre}
      />
    );
  else if (effectivePage === "orders")
    content = (
      <FichasView
        key={refreshKey}
        onNewOrder={() => setPage("create")}
        onSelect={(ficha) => openFicha(ficha)}
        onEdit={(ficha) => { setEditFichaId(ficha.id); setPage("edit"); }}
        onDelete={(ficha) => setConfirmation({
          label: "Borrar ficha",
          action: () => api(`/fichas/${ficha.id}`, { method: "DELETE" }).then(() => { setRefreshKey((key) => key + 1); }),
        })}
      />
    );
else if (effectivePage === "fichas" && fichaId)
    content = (
      <FichaDetail
        fichaKey={fichaId}
        onBack={() => setPage("orders")}
        onConfirm={(label, action) => setConfirmation({ label, action })}
      />
    );
  else if (effectivePage === "moto" && motoId)
    content = (
      <MotoDetail
        id={motoId}
        onBack={() => setPage("vehicles")}
        onOpenFicha={openFicha}
        onOpenRepuesto={openRepuesto}
        notify={setToast}
      />
    );
  else if (effectivePage === "repuestos")
    content = <RepuestosView onOpen={openRepuesto} notify={setToast} />;
  else if (effectivePage === "repuesto" && repuestoId)
    content = <RepuestoDetail repuestoId={repuestoId} onBack={() => setPage("repuestos")} notify={setToast} />;
  else if (["clients", "vehicles", "catalog", "audit"].includes(effectivePage))
    content = (
      <AdminView
        resource={page as "clients" | "vehicles" | "catalog" | "audit"}
        notify={setToast}
        onOpenVehicle={openMoto}
      />
    );
  else if (effectivePage === "services") content = <ServicesView onOpenMoto={openMoto} />;
  else if (effectivePage === "settings") content = <SettingsView notify={setToast} />;
  else content = <ReportsView />;
  return (
    <AppShell
      page={effectivePage}
      onPage={setEffectivePage}
      onNewOrder={() => setPage("create")}
      session={session}
      onLogout={async () => {
        await logout();
        setSession(null);
      }}
    >
      {content}
      <ConfirmModal
        open={Boolean(confirmation)}
        title={confirmation?.label ?? ""}
        body={`Vas a ejecutar la acción: ${confirmation?.label?.toLowerCase()}. El historial conservará el registro para auditoría.`}
        confirmLabel={confirmation?.label ?? "Confirmar"}
        variant={
          confirmation?.label?.toLowerCase().includes("pago") ? "success" : "danger"
        }
        onClose={() => setConfirmation(null)}
        onConfirm={() => {
          void Promise.resolve(confirmation?.action()).then(
            () => setToast(`${confirmation?.label} realizada.`),
            (reason) => setToast(reason instanceof Error ? reason.message : "No fue posible completar la acción."),
          );
          setConfirmation(null);
        }}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}
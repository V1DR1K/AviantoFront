"use client";
import { useEffect, useState } from "react";
import { AppShell } from "../components/app-shell";
import { FichaForm } from "../components/ficha-form";
import {
  Dashboard,
  FichaDetail,
  FichasView,
  ReportsView,
} from "../components/views";
import { MotoDetail } from "../components/moto-detail";
import { RepuestoDetail, RepuestosView } from "../components/repuestos-view";
import { ConfirmModal, Toast } from "../components/ui";
import { AdminView, SettingsView } from "../components/admin-view";
import type { FichaResponse } from "../lib/types";
import { LoginView } from "../components/login-view";
import { clearSession, getSession, logout, refreshSession, type AuthSession } from "../lib/auth";
import { api } from "../lib/api";

export default function Home() {
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const [page, setPage] = useState("dashboard");
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [motoId, setMotoId] = useState<string | null>(null);
  const [repuestoId, setRepuestoId] = useState<string | null>(null);
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
  if (session === undefined) return null;
  if (!session) return <LoginView onAuthenticated={setSession} />;

  const openFicha = (ficha: FichaResponse) => { setFichaId(ficha.id); setPage("ficha"); };
  const openMoto = (id: string) => { setMotoId(id); setPage("moto"); };
  const openRepuesto = (repuesto: { id: string }) => { setRepuestoId(repuesto.id); setPage("repuesto"); };

  let content;
  if (page === "create")
    content = <FichaForm onClose={() => setPage("orders")} onSave={openFicha} />;
  else if (page === "dashboard")
    content = (
      <Dashboard
        onPage={setPage}
        onNewOrder={() => setPage("create")}
        onSelect={openFicha}
        userName={session.user.nombre}
      />
    );
  else if (page === "orders")
    content = <FichasView onNewOrder={() => setPage("create")} onSelect={openFicha} />;
else if (page === "fichas" && fichaId)
    content = (
      <FichaDetail
        fichaKey={fichaId}
        onBack={() => setPage("orders")}
        onConfirm={(label, action) => setConfirmation({ label, action })}
      />
    );
  else if (page === "moto" && motoId)
    content = (
      <MotoDetail
        id={motoId}
        onBack={() => setPage("vehicles")}
        onOpenFicha={openFicha}
        onOpenRepuesto={openRepuesto}
        notify={setToast}
      />
    );
  else if (page === "repuestos")
    content = <RepuestosView onOpen={openRepuesto} notify={setToast} />;
  else if (page === "repuesto" && repuestoId)
    content = <RepuestoDetail repuestoId={repuestoId} onBack={() => setPage("repuestos")} notify={setToast} />;
  else if (["clients", "vehicles", "catalog", "audit"].includes(page))
    content = (
      <AdminView
        resource={page as "clients" | "vehicles" | "catalog" | "audit"}
        notify={setToast}
        onOpenVehicle={openMoto}
      />
    );
  else if (page === "settings") content = <SettingsView notify={setToast} />;
  else content = <ReportsView />;
  return (
    <AppShell
      page={page}
      onPage={setPage}
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
            () => setToast("Acción completada."),
            (reason) => setToast(reason instanceof Error ? reason.message : "No fue posible completar la acción."),
          );
          setConfirmation(null);
        }}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}
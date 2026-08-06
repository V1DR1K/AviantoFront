"use client";
import { useEffect, useState } from "react";
import { AppShell } from "../components/app-shell";
import { OrderForm } from "../components/order-form";
import {
  Dashboard,
  OrderDetail,
  OrdersView,
  ReportsView,
} from "../components/views";
import { ConfirmModal, Toast } from "../components/ui";
import { AdminView, SettingsView } from "../components/admin-view";
import type { PedidoResponse } from "../lib/types";
import { LoginView } from "../components/login-view";
import { clearSession, getSession, logout, refreshSession, type AuthSession } from "../lib/auth";
import { api } from "../lib/api";

export default function Home() {
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const [page, setPage] = useState("dashboard");
  const [selected, setSelected] = useState<PedidoResponse | null>(null);
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
  const select = (order: PedidoResponse) => {
    setSelected(order);
    setPage("detail");
  };
  const saveOrder = (order: PedidoResponse) => {
    setSelected(order);
    setPage("detail");
  };
  let content;
  if (page === "create")
    content = (
      <OrderForm onClose={() => setPage("dashboard")} onSave={saveOrder} />
    );
  else if (page === "dashboard")
    content = (
      <Dashboard
        onPage={setPage}
        onNewOrder={() => setPage("create")}
        onSelect={select}
        userName={session.user.nombre}
      />
    );
  else if (page === "orders")
    content = (
      <OrdersView onNewOrder={() => setPage("create")} onSelect={select} />
    );
  else if (page === "detail")
    content = (
      <OrderDetail
        order={selected!}
        onBack={() => setPage("orders")}
        onConfirm={(label, action) => setConfirmation({ label, action })}
        onUpdated={setSelected}
      />
    );
  else if (["clients", "vehicles", "catalog", "audit"].includes(page))
    content = (
      <AdminView
        resource={page as "clients" | "vehicles" | "catalog" | "audit"}
        notify={setToast}
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
        body={`Vas a ejecutar la acción: ${confirmation?.label?.toLowerCase()}. El historial del pedido conservará el registro para auditoría.`}
        confirmLabel={confirmation?.label ?? "Confirmar"}
        variant={
          confirmation?.label === "Confirmar pago" ? "success" : "danger"
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

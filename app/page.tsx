"use client";
import { useState } from "react";
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
import { orders } from "../lib/mock-data";
import type { PedidoResponse } from "../lib/types";
import { LoginView } from "../components/login-view";
import { clearSession, getSession, type AuthSession } from "../lib/auth";

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(() => getSession());
  const [page, setPage] = useState("dashboard");
  const [selected, setSelected] = useState<PedidoResponse>(orders[0]);
  const [confirmation, setConfirmation] = useState<{
    label: string;
    action: () => void;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  if (!session) return <LoginView />;
  const select = (order: PedidoResponse) => {
    setSelected(order);
    setPage("detail");
  };
  const saveOrder = (payload: {
    cliente: string;
    moto: string;
    patente: string;
    documento: "Presupuesto" | "Factura";
    items: PedidoResponse["items"];
    total: number;
    observaciones: string;
  }) => {
    setSelected({
      id: "new",
      numero: "PT-000190",
      cliente: payload.cliente,
      moto: payload.moto,
      patente: payload.patente,
      creadoEn: "Hoy",
      vencimiento: "31/05/2026",
      estado: "En proceso",
      documento: payload.documento,
      clienteId: "new",
      motovehiculoId: "new",
      observaciones: payload.observaciones,
      descuentoGlobal: 0,
      iva: payload.documento === "Factura",
      total: payload.total,
      fotos: [],
      items: payload.items,
    });
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
      />
    );
  else if (page === "orders")
    content = (
      <OrdersView onNewOrder={() => setPage("create")} onSelect={select} />
    );
  else if (page === "detail")
    content = (
      <OrderDetail
        order={selected}
        onBack={() => setPage("orders")}
        onConfirm={(label, action) => setConfirmation({ label, action })}
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
      onLogout={() => {
        clearSession();
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
          confirmation?.action();
          setToast(
            "Acción confirmada como demostración. Los datos mock no cambiaron.",
          );
          setConfirmation(null);
        }}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}

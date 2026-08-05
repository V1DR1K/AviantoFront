"use client";
import { useState } from "react";
import { AppShell } from "../components/app-shell";
import { OrderForm } from "../components/order-form";
import {
  Dashboard,
  OrderDetail,
  OrdersView,
  RecordsView,
  ReportsView,
} from "../components/views";
import { ConfirmModal } from "../components/ui";
import { orders } from "../lib/mock-data";
import type { PedidoResponse } from "../lib/types";

export default function Home() {
  const [page, setPage] = useState("dashboard");
  const [selected, setSelected] = useState<PedidoResponse>(orders[0]);
  const [confirmation, setConfirmation] = useState<{
    label: string;
    action: () => void;
  } | null>(null);
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
      <RecordsView
        type={page as "clients" | "vehicles" | "catalog" | "audit"}
      />
    );
  else content = <ReportsView />;
  return (
    <AppShell page={page} onPage={setPage} onNewOrder={() => setPage("create")}>
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
          setConfirmation(null);
        }}
      />
    </AppShell>
  );
}

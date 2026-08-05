"use client";
import { useMemo, useState } from "react";
import {
  Download,
  Edit3,
  FileDown,
  Filter,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import {
  audit,
  catalog,
  clients,
  orders,
  reportData,
  vehicles,
} from "../lib/mock-data";
import { exportExcel, exportPdf } from "../lib/export";
import { money } from "../lib/format";
import type { OrderStatus, PedidoResponse } from "../lib/types";
import { EmptyState, Pagination, SearchBox, StatusBadge } from "./ui";

export function Dashboard({
  onPage,
  onNewOrder,
  onSelect,
}: {
  onPage: (page: string) => void;
  onNewOrder: () => void;
  onSelect: (order: PedidoResponse) => void;
}) {
  const [activeOrder, setActiveOrder] = useState(orders[0]);
  const totals = {
    process: orders.filter((o) => o.estado === "En proceso").length,
    approved: orders.filter((o) => o.estado === "Aprobado").length,
    paid: orders.filter((o) => o.estado === "Pagado").length,
    total: orders.reduce((s, o) => s + o.total, 0),
  };
  return (
    <div className="page">
      <div className="page-heading dashboard-heading">
        <div>
          <h1>Buenos días, Avril</h1>
          <p>La cola está al día. Hay {totals.process} pedidos para revisar.</p>
        </div>
        <button className="button primary new-order" onClick={onNewOrder}>
          <Plus size={19} />
          Nuevo pedido
        </button>
      </div>
      <div className="metrics">
        <Metric label="En proceso" value={String(totals.process)} tone="blue" />
        <Metric
          label="Aprobados"
          value={String(totals.approved)}
          tone="green"
        />
        <Metric
          label="Pagados del mes"
          value={String(totals.paid)}
          tone="green"
        />
        <Metric
          label="Total presupuestado"
          value={money(totals.total)}
          tone="ink"
        />
      </div>
      <section className="desk-grid dashboard-dossier">
        <div className="panel order-queue">
          <div className="panel-head">
            <div>
              <h2>Pedidos recientes</h2>
              <p>Ingresos y revisiones pendientes.</p>
            </div>
            <button className="text-button" onClick={() => onPage("orders")}>
              Ver todos
            </button>
          </div>
          <div className="compact-orders">
            {orders.slice(0, 5).map((order) => (
              <button
                className={activeOrder.id === order.id ? "selected" : ""}
                key={order.id}
                onClick={() => setActiveOrder(order)}
              >
                <div>
                  <strong>{order.numero}</strong>
                  <span>
                    {order.cliente} · {order.moto}
                  </span>
                </div>
                <StatusBadge status={order.estado} />
                <strong>{money(order.total)}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className="panel dossier-preview">
          <div className="dossier-kicker">
            <span>Dossier del pedido</span>
            <StatusBadge status={activeOrder.estado} />
          </div>
          <h2>{activeOrder.numero}</h2>
          <div className="dossier-identity">
            <div>
              <span>Cliente</span>
              <strong>{activeOrder.cliente}</strong>
            </div>
            <div>
              <span>Moto</span>
              <strong>{activeOrder.moto}</strong>
              <small>{activeOrder.patente}</small>
            </div>
          </div>
          <div className="dossier-note">
            <span>Motivo de ingreso</span>
            <p>{activeOrder.observaciones}</p>
          </div>
          <div className="dossier-lines">
            <span>Ítems a revisar</span>
            {activeOrder.items.map((item) => (
              <div key={item.id}>
                <b>{item.descripcion}</b>
                <small>
                  {item.tipo} · {money(item.subtotal)}
                </small>
              </div>
            ))}
          </div>
          <div className="dossier-total">
            <span>Total estimado</span>
            <strong>{money(activeOrder.total)}</strong>
          </div>
          <button
            className="button primary"
            onClick={() => onSelect(activeOrder)}
          >
            <Edit3 size={17} />
            Abrir pedido
          </button>
        </div>
      </section>
    </div>
  );
}
function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <section className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>Actualizado hoy</small>
    </section>
  );
}
export function OrdersView({
  onNewOrder,
  onSelect,
}: {
  onNewOrder: () => void;
  onSelect: (order: PedidoResponse) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"Todos" | OrderStatus>("Todos");
  const [documentType, setDocumentType] = useState("Todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const orderDate = (value: string) => {
    const [day, month, year] = value.split("/");
    return `${year}-${month}-${day}`;
  };
  const list = useMemo(
    () =>
      orders.filter(
        (order) =>
          (status === "Todos" || order.estado === status) &&
          (documentType === "Todos" || order.documento === documentType) &&
          (!dateFrom || orderDate(order.creadoEn) >= dateFrom) &&
          (!dateTo || orderDate(order.creadoEn) <= dateTo) &&
          `${order.numero} ${order.cliente} ${order.moto} ${order.patente}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, status, documentType, dateFrom, dateTo],
  );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Pedidos</h1>
          <p>Consultá, filtrá y administrá todas las órdenes de trabajo.</p>
        </div>
        <button className="button primary" onClick={onNewOrder}>
          <Plus size={19} />
          Nuevo pedido
        </button>
      </div>
      <section className="panel table-panel">
        <div className="filter-bar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Número, cliente, moto o patente"
          />
          <label>
            <Filter size={16} />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option>Todos</option>
              {(
                [
                  "En proceso",
                  "Aprobado",
                  "Pagado",
                  "Cancelado",
                ] as OrderStatus[]
              ).map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            >
              <option>Todos</option>
              <option>Presupuesto</option>
              <option>Factura</option>
            </select>
          </label>
          <input
            className="filter-date"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            aria-label="Fecha desde"
          />
          <input
            className="filter-date"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            aria-label="Fecha hasta"
          />
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setStatus("Todos");
              setDocumentType("Todos");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Limpiar filtros
          </button>
          <button
            className="button secondary"
            onClick={() =>
              exportExcel(
                "pedidos",
                list.map((o) => ({
                  Pedido: o.numero,
                  Cliente: o.cliente,
                  Moto: o.moto,
                  Patente: o.patente,
                  Estado: o.estado,
                  Total: money(o.total),
                })),
              )
            }
          >
            <Download size={17} />
            Exportar Excel
          </button>
        </div>
        {list.length ? (
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Moto</th>
                <th>Fecha</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.numero}</strong>
                  </td>
                  <td>{order.cliente}</td>
                  <td>
                    {order.moto}
                    <small>{order.patente}</small>
                  </td>
                  <td>{order.creadoEn}</td>
                  <td>{order.vencimiento}</td>
                  <td>
                    <StatusBadge status={order.estado} />
                  </td>
                  <td>
                    <strong>{money(order.total)}</strong>
                  </td>
                  <td>
                    <button
                      className="row-action"
                      onClick={() => onSelect(order)}
                      aria-label={`Abrir ${order.numero}`}
                    >
                      <Edit3 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No encontramos pedidos"
            body="Probá limpiar los filtros o crear un pedido nuevo."
            action={
              <button className="button primary" onClick={onNewOrder}>
                Nuevo pedido
              </button>
            }
          />
        )}
        <Pagination page={1} total={1} onPage={() => {}} />
      </section>
    </div>
  );
}
export function OrderDetail({
  order,
  onBack,
  onConfirm,
}: {
  order: PedidoResponse;
  onBack: () => void;
  onConfirm: (label: string, action: () => void) => void;
}) {
  const pieces = order.items
    .filter((i) => i.tipo === "Pieza")
    .reduce((s, i) => s + i.subtotal, 0);
  const jobs = order.items
    .filter((i) => i.tipo === "Trabajo")
    .reduce((s, i) => s + i.subtotal, 0);
  return (
    <div className="page">
      <button className="back" onClick={onBack}>
        ← Volver a pedidos
      </button>
      <div className="detail-title">
        <div>
          <p>{order.numero}</p>
          <h1>{order.cliente}</h1>
          <span>
            {order.moto} · {order.patente}
          </span>
        </div>
        <div>
          <StatusBadge status={order.estado} />
          <strong>{money(order.total)}</strong>
        </div>
      </div>
      <section className="detail-grid">
        <div className="form-stack">
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Detalle de reparación</h2>
                <p>
                  Creado el {order.creadoEn} · Vence el {order.vencimiento}
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() =>
                  exportPdf(order.numero, order.cliente, order.total)
                }
              >
                <FileDown size={17} />
                PDF
              </button>
            </div>
            <p className="observation">{order.observaciones}</p>
            <table>
              <thead>
                <tr>
                  <th>Ítem</th>
                  <th>Tipo</th>
                  <th>Cant.</th>
                  <th>Precio</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.descripcion}</strong>
                    </td>
                    <td>{item.tipo}</td>
                    <td>{item.cantidad}</td>
                    <td>{money(item.precioUnitario)}</td>
                    <td>{money(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel">
            <h2>Auditoría resumida</h2>
            <ol className="timeline">
              <li>
                <b>24/05 · 09:15</b> Operario creó el pedido con una observación
                libre.
              </li>
              <li>
                <b>24/05 · 10:30</b> Avril agregó ítems estandarizados del
                catálogo.
              </li>
              <li>
                <b>24/05 · 11:15</b> Estado actualizado a {order.estado}.
              </li>
            </ol>
          </div>
        </div>
        <aside className="summary">
          <h2>Resumen monetario</h2>
          <div>
            <span>Subtotal de trabajos</span>
            <strong>{money(jobs)}</strong>
          </div>
          <div>
            <span>Subtotal de piezas</span>
            <strong>{money(pieces)}</strong>
          </div>
          <div>
            <span>Descuento global</span>
            <strong>{money(order.descuentoGlobal)}</strong>
          </div>
          <div>
            <span>IVA</span>
            <strong>
              {order.iva
                ? money(order.total - (pieces + jobs - order.descuentoGlobal))
                : "No aplicado"}
            </strong>
          </div>
          <div className="total">
            <span>Total final</span>
            <strong>{money(order.total)}</strong>
          </div>
          <button
            className="button primary large"
            onClick={() => onConfirm("Confirmar pago", () => {})}
          >
            Confirmar pago
          </button>
          <button
            className="button secondary"
            onClick={() => onConfirm("Cancelar pedido", () => {})}
          >
            Cancelar pedido
          </button>
          <button
            className="button secondary"
            onClick={() =>
              exportExcel(
                order.numero,
                order.items.map((item) => ({
                  Descripción: item.descripcion,
                  Tipo: item.tipo,
                  Cantidad: item.cantidad,
                  Precio: money(item.precioUnitario),
                  Subtotal: money(item.subtotal),
                })),
              )
            }
          >
            Exportar Excel
          </button>
          <button
            className="button secondary"
            onClick={() => onConfirm("Duplicar pedido", () => {})}
          >
            Duplicar pedido
          </button>
          <button
            className="button danger-outline"
            onClick={() => onConfirm("Eliminar lógicamente", () => {})}
          >
            <Trash2 size={17} />
            Eliminar pedido
          </button>
        </aside>
      </section>
    </div>
  );
}
export function RecordsView({
  type,
}: {
  type: "clients" | "vehicles" | "catalog" | "audit";
}) {
  const config = {
    clients: {
      title: "Clientes",
      description: "Fichas, motos asociadas e historial comercial.",
      data: clients,
      rows: (row: (typeof clients)[number]) => [
        row.nombre,
        row.documento ?? "—",
        row.telefono,
        String(row.motos),
        row.activo ? "Activo" : "Inactivo",
      ],
      headers: ["Cliente", "DNI/CUIT", "Teléfono", "Motos", "Estado"],
    },
    vehicles: {
      title: "Motovehículos",
      description:
        "Un vehículo siempre conserva el vínculo con su cliente e historial.",
      data: vehicles,
      rows: (row: (typeof vehicles)[number]) => [
        `${row.marca} ${row.modelo}`,
        row.patente,
        row.cliente,
        String(row.kilometraje ?? "—"),
        row.activo ? "Activo" : "Inactivo",
      ],
      headers: ["Moto", "Patente", "Cliente", "Kilometraje", "Estado"],
    },
    catalog: {
      title: "Catálogo",
      description:
        "Piezas y trabajos con precios base independientes de los presupuestos históricos.",
      data: catalog,
      rows: (row: (typeof catalog)[number]) => [
        row.tipo,
        row.descripcion,
        row.categoria ?? "—",
        money(row.precioBase),
        row.activo ? "Activo" : "Inactivo",
      ],
      headers: ["Tipo", "Descripción", "Categoría", "Precio", "Estado"],
    },
    audit: {
      title: "Auditoría",
      description: "Registro de altas, ediciones, cambios de precio y estado.",
      data: audit,
      rows: (row: (typeof audit)[number]) => [
        row.fecha,
        row.usuario,
        row.modulo,
        row.accion,
        row.descripcion,
      ],
      headers: ["Fecha y hora", "Usuario", "Módulo", "Acción", "Descripción"],
    },
  }[type];
  const [query, setQuery] = useState("");
  const visible = config.data.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        {type !== "audit" && (
          <button className="button primary">
            <Plus size={19} />
            Nuevo registro
          </button>
        )}
      </div>
      <section className="panel table-panel">
        <div className="filter-bar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder={`Buscar en ${config.title.toLowerCase()}`}
          />
          <button
            className="button secondary"
            onClick={() =>
              exportExcel(
                type,
                visible.map((row) =>
                  Object.fromEntries(
                    config.headers.map((header, index) => [
                      header,
                      config.rows(row as never)[index],
                    ]),
                  ),
                ),
              )
            }
          >
            <Download size={17} />
            Exportar Excel
          </button>
        </div>
        <table>
          <thead>
            <tr>
              {config.headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={index}>
                {config.rows(row as never).map((cell, i) => (
                  <td key={i}>{cell}</td>
                ))}
                <td>
                  <button className="row-action" aria-label="Editar registro">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={1} total={1} onPage={() => {}} />
      </section>
    </div>
  );
}
export function ReportsView() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const reportPeriod: Record<string, string> = {
    Ene: "2026-01-01",
    Feb: "2026-02-01",
    Mar: "2026-03-01",
    Abr: "2026-04-01",
    May: "2026-05-01",
  };
  const visibleReportData = reportData.filter(
    (item) =>
      (!from || reportPeriod[item.etiqueta] >= from) &&
      (!to || reportPeriod[item.etiqueta] <= to),
  );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Reportes</h1>
          <p>Indicadores de presupuestos, pagos y actividad del taller.</p>
        </div>
        <button
          className="button secondary"
          onClick={() => exportExcel("reporte-mensual", visibleReportData)}
        >
          {" "}
          <Download size={17} />
          Exportar Excel
        </button>
      </div>
      <div className="metrics">
        <Metric label="Total presupuestado" value={money(615000)} tone="ink" />
        <Metric label="Total pagado" value={money(487200)} tone="green" />
        <Metric label="Ticket promedio" value={money(92500)} tone="blue" />
        <Metric label="Pedidos del mes" value="37" tone="blue" />
      </div>
      <section className="panel report-filters">
        <div>
          <h2>Período del informe</h2>
          <p>
            Los gráficos se recalcularán cuando el backend suministre datos
            reales.
          </p>
        </div>
        <label>
          Desde
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <button
          className="button secondary"
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          Limpiar
        </button>
      </section>
      <section className="desk-grid report-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Evolución mensual</h2>
              <p>Presupuestos y pagos en ARS.</p>
            </div>
          </div>
          <div className="bar-chart">
            {visibleReportData.map((item) => (
              <div key={item.etiqueta}>
                <i style={{ height: `${item.valor / 7500}px` }} />
                <span>{item.etiqueta}</span>
                <b>{money(item.valor)}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Más frecuentes</h2>
          {[
            "Service completo",
            "Cambio de aceite",
            "Diagnóstico eléctrico",
            "Cambio de pastillas",
          ].map((item, index) => (
            <div className="rank" key={item}>
              <b>0{index + 1}</b>
              <span>{item}</span>
              <strong>{[14, 12, 9, 8][index]}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="panel report-table">
        <div className="panel-head">
          <div>
            <h2>Clientes con más pedidos</h2>
            <p>Tabla exportable con datos de demostración.</p>
          </div>
          <button
            className="button secondary"
            onClick={() =>
              exportExcel(
                "clientes-con-pedidos",
                clients.map((client) => ({
                  Cliente: client.nombre,
                  Pedidos: client.pedidos,
                  Motos: client.motos,
                })),
              )
            }
          >
            <Download size={17} />
            Exportar tabla
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Pedidos</th>
              <th>Motos</th>
              <th>Total presupuestado</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client, index) => (
              <tr key={client.id}>
                <td>{client.nombre}</td>
                <td>{client.pedidos}</td>
                <td>{client.motos}</td>
                <td>{money([285000, 172000, 121000, 384000, 35000][index])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Download, FileDown, Filter, Plus } from "lucide-react";
import { api, download, objectUrl } from "../lib/api";
import { money } from "../lib/format";
import type {
  ClienteResponse,
  DashboardResponse,
  FichaItemResponse,
  FichaResponse,
  FichaStatus,
  NextServiceResponse,
  PageResponse,
  PagoStatus,
  PhotoResponse,
  TrabajoStatus,
} from "../lib/types";
import { EmptyState, Pagination, SearchBox, StatusBadge } from "./ui";

const date = (value: string) =>
  new Intl.DateTimeFormat("es-AR").format(new Date(value));
const errorMessage = (reason: unknown) =>
  reason instanceof Error ? reason.message : "No fue posible cargar la información.";
function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <section className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>Período seleccionado</small></section>;
}

function OrderPhotos({ photos, onChange }: { photos: PhotoResponse[]; onChange: () => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = photos.map((photo) => photo.id).join(",");
  useEffect(() => {
    let active = true;
    let loaded: Record<string, string> = {};
    void Promise.all(photos.map(async (photo) => [photo.id, await objectUrl(photo.url)] as const))
      .then((entries) => {
        loaded = Object.fromEntries(entries);
        if (active) setUrls(loaded);
        else Object.values(loaded).forEach(URL.revokeObjectURL);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      Object.values(loaded).forEach(URL.revokeObjectURL);
    };
  }, [key]);
  if (!photos.length) return null;
  return (
    <section className="order-photos">
      <h3>Fotos adjuntas</h3>
      <div>
        {photos.map((photo) =>
          urls[photo.id] ? (
            <a key={photo.id} href={urls[photo.id]} target="_blank" rel="noreferrer">
              <img src={urls[photo.id]} alt={photo.filename} />
            </a>
          ) : (
            <span key={photo.id}>Cargando foto...</span>
          ),
        )}
      </div>
      <button className="text-button" onClick={onChange}>Recargar</button>
    </section>
  );
}

const fichaStatuses: FichaStatus[] = [
  "Ingresada",
  "En trabajo",
  "Para control",
  "Para entrega",
  "Entregada",
  "Cancelada",
];
const pagoStatuses: PagoStatus[] = ["Pendiente", "Parcial", "Pagado"];
const trabajoStatuses: TrabajoStatus[] = [
  "Pendiente",
  "En proceso",
  "Realizado",
  "Cancelado",
];

export function Dashboard({
  onPage,
  onNewOrder,
  onSelect,
  userName,
}: {
  onPage: (page: string) => void;
  onNewOrder: () => void;
  onSelect: (ficha: FichaResponse) => void;
  userName?: string;
}) {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api<DashboardResponse>("/dashboard", {}, { fechaDesde: from, fechaHasta: to })
      .then(setData)
      .catch((reason) => setError(errorMessage(reason)));
  }, [from, to]);
  const max = Math.max(...(data?.evolucion.map((day) => day.total) ?? []), 1);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Buenos días, {userName}</h1>
          <p>Actividad y facturación del período seleccionado.</p>
        </div>
        <button className="button primary" onClick={onNewOrder}>
          <Plus size={19} />Nueva ficha
        </button>
      </div>
      <section className="panel dashboard-filters">
        <label>Desde<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>Hasta<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label>
      </section>
      {error && <p className="login-pending">{error}</p>}
      {data && (
        <>
          <div className="metrics">
            <Metric label="Fichas" value={String(data.pedidos)} tone="blue" />
            <Metric label="En proceso" value={String(data.enProceso)} tone="blue" />
            <Metric label="Presupuestado" value={money(data.presupuestado)} tone="ink" />
            <Metric label="Facturado" value={money(data.facturado)} tone="green" />
          </div>
          <section className="desk-grid">
            <div className="panel">
              <div className="panel-head">
                <div>
                  <h2>Facturación diaria</h2>
                  <p>Importe total de fichas creadas por día.</p>
                </div>
              </div>
              <div className="bar-chart">
                {data.evolucion.length
                  ? data.evolucion.map((day) => (
                      <div key={day.fecha}>
                        <i style={{ height: `${Math.max((day.total / max) * 180, 4)}px` }} />
                        <span>{day.fecha.slice(8)}</span>
                        <b>{money(day.total)}</b>
                      </div>
                    ))
                  : null}
                {!data.evolucion.length && <p>Sin fichas en este período.</p>}
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <div>
                  <h2>Fichas recientes</h2>
                  <p>Últimos movimientos del período.</p>
                </div>
                <button className="text-button" onClick={() => onPage("orders")}>Ver todas</button>
              </div>
              <div className="compact-orders">
                {data.recientes.map((ficha) => (
                  <button
                    key={ficha.id}
                    onClick={() =>
                      void api<FichaResponse>(`/fichas/${ficha.id}`).then(onSelect).catch((reason) => setError(errorMessage(reason)))
                    }
                  >
                    <div>
                      <strong>{ficha.numero}</strong>
                      <span>{ficha.cliente} · {ficha.moto}</span>
                    </div>
                    <StatusBadge status={ficha.estado} />
                    <strong>{money(ficha.total)}</strong>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export function FichasView({
  onNewOrder,
  onSelect,
  onEdit,
  onDelete,
}: {
  onNewOrder: () => void;
  onSelect: (ficha: FichaResponse) => void;
  onEdit: (ficha: FichaResponse) => void;
  onDelete: (ficha: FichaResponse) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"Todos" | FichaStatus>("Todos");
  const [result, setResult] = useState<PageResponse<FichaResponse> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api<PageResponse<FichaResponse>>(
      "/fichas",
      {},
      { q: query || undefined, estado: status === "Todos" ? undefined : status, page: page - 1, size: 20 },
    )
      .then(setResult)
      .catch((reason) => setError(errorMessage(reason)));
  }, [query, status, page]);
  const params = { q: query || undefined, estado: status === "Todos" ? undefined : status };
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Fichas de trabajo</h1>
          <p>Consultá y administrá las órdenes de trabajo del taller.</p>
        </div>
        <button className="button primary" onClick={onNewOrder}>
          <Plus size={19} />Nueva ficha
        </button>
      </div>
      {error && <p className="login-pending">{error}</p>}
      <section className="panel table-panel">
        <div className="filter-bar">
          <SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Número o cliente" />
          <label>
            <Filter size={16} />
            <select value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }}>
              <option>Todos</option>
              {fichaStatuses.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <button className="button secondary" onClick={() => void download("/fichas/export.xlsx", "fichas.xlsx", params).catch((reason) => setError(errorMessage(reason)))}>
            <Download size={17} />Exportar Excel
          </button>
        </div>
        {result?.content.length ? (
          <table>
            <thead>
              <tr><th>Ficha</th><th>Cliente</th><th>Moto</th><th>Estado</th><th>Pago</th><th>Total</th><th /></tr>
            </thead>
            <tbody>
              {result.content.map((ficha) => {
                const editable = ficha.estado !== "Entregada" && ficha.estado !== "Cancelada";
                return (
                  <tr key={ficha.id}>
                    <td>{ficha.numero}</td>
                    <td>{ficha.cliente}</td>
                    <td>{ficha.moto}<small>{ficha.patente}</small></td>
                    <td><StatusBadge status={ficha.estado} /></td>
                    <td><StatusBadge status={ficha.estadoPago} /></td>
                    <td>{money(ficha.total)}</td>
                    <td className="table-actions">
                      {editable ? (
                        <>
                          <button className="row-action" onClick={() => onEdit(ficha)}>Ver</button>
                          <button className="row-action danger-action" onClick={() => onDelete(ficha)}>Borrar</button>
                        </>
                      ) : (
                        <button className="row-action" onClick={() => onSelect(ficha)}>Ver</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No hay fichas" body="Creá una nueva o ajustá los filtros." />
        )}
        <Pagination page={page} total={result?.totalPages || 1} onPage={setPage} />
      </section>
    </div>
  );
}

function ItemRow({
  item,
  onState,
  locked,
}: {
  item: FichaItemResponse;
  onState: (estado: TrabajoStatus) => void;
  locked: boolean;
}) {
  const options = trabajoStatuses.filter((option) => option !== item.estadoTrabajo);
  return (
    <div className={`line-item ${item.estadoTrabajo === "Cancelado" ? "muted" : ""}`}>
      <div>
        <strong>{item.descripcion}</strong>
        <span>{item.tipo} · {item.cantidad} × {money(Number(item.precioUnitario))}{item.estadoTrabajo !== "Pendiente" && ` · ${item.estadoTrabajo}`}</span>
      </div>
      <strong>{money(Number(item.subtotal))}</strong>
      {!locked && (
        <select value="" onChange={(event) => event.target.value && onState(event.target.value as TrabajoStatus)}>
          <option value="">Estado trabajo…</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      )}
    </div>
  );
}

export function FichaDetail({
  fichaKey,
  onBack,
  onConfirm,
}: {
  fichaKey: string;
  onBack: () => void;
  onConfirm: (label: string, action: () => void | Promise<void>) => void;
}) {
  const [ficha, setFicha] = useState<FichaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () =>
    void api<FichaResponse>(`/fichas/${fichaKey}`)
      .then(setFicha)
      .catch((reason) => setError(errorMessage(reason)));
  useEffect(load, [fichaKey]);
  if (!ficha)
    return (
      <div className="page">
        <button className="back" onClick={onBack}>← Volver a fichas</button>
        {error ? <p className="login-pending">{error}</p> : <p>Cargando ficha…</p>}
      </div>
    );
  const update = async (path: string, body: Record<string, string>) => {
    try {
      const next = await api<FichaResponse>(path, { method: "PATCH", body: JSON.stringify(body) });
      setFicha(next);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };
  const current = ficha.estado;
  const estadoActions: { estado: FichaStatus; label: string }[] = [];
  if (current === "Ingresada") estadoActions.push({ estado: "En trabajo", label: "Iniciar trabajo" });
  if (current === "Ingresada" || current === "En trabajo") estadoActions.push({ estado: "Para control", label: "Enviar a control" });
  if (current === "Ingresada" || current === "En trabajo" || current === "Para control")
    estadoActions.push({ estado: "Para entrega", label: "Lista para entrega" });
  if (current === "Para entrega") estadoActions.push({ estado: "Entregada", label: "Entregar al cliente" });
  if (current !== "Entregada" && current !== "Cancelada") estadoActions.push({ estado: "Cancelada", label: "Cancelar ficha" });
  const locked = ficha.estado === "Cancelada" || ficha.estado === "Entregada";
  return (
    <div className="page">
      <button className="back" onClick={onBack}>← Volver a fichas</button>
      {error && <p className="login-pending">{error}</p>}
      <div className="detail-title">
        <div>
          <p>{ficha.numero}</p>
          <h1>{ficha.cliente}</h1>
          <span>{ficha.moto} · {ficha.patente}</span>
        </div>
        <div className="detail-stack">
          <StatusBadge status={ficha.estado} />
          <StatusBadge status={ficha.estadoPago} />
          <strong>{money(ficha.total)}</strong>
        </div>
      </div>
      <section className="detail-grid">
        <div className="form-stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Detalle de reparación</h2>
              <button className="button secondary" onClick={() => void download(`/fichas/${ficha.id}/pdf`, `${ficha.numero}.pdf`).catch((reason) => setError(errorMessage(reason)))}>
                <FileDown size={17} />PDF
              </button>
            </div>
            <p className="observation">{ficha.observaciones || "Sin observaciones."}</p>
            <div className="line-items-list">
              {ficha.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  locked={locked}
                  onState={(estado) => void update(`/fichas/${ficha.id}/items/${item.id}/estado`, { estado })}
                />
              ))}
            </div>
            <OrderPhotos photos={ficha.fotos} onChange={() => void load()} />
          </section>
        </div>
        <aside className="summary">
          <h3>Resumen monetario</h3>
          <div><span>Documento</span><strong>{ficha.documento}{ficha.iva ? " (IVA)" : ""}</strong></div>
          <div><span>Ingreso</span><strong>{ficha.fechaIngreso ? date(ficha.fechaIngreso) : "—"}</strong></div>
          <div><span>Entrega estimada</span><strong>{ficha.fechaEntregaEstimada ? date(ficha.fechaEntregaEstimada) : "—"}</strong></div>
          <div className="total"><span>Total final</span><strong>{money(ficha.total)}</strong></div>
          <div className="summary-actions">
            {pagoStatuses.filter((option) => option !== ficha.estadoPago).map((option) => (
              <button key={option} className="button secondary large" onClick={() => void update(`/fichas/${ficha.id}/pago`, { estadoPago: option })}>
                Marcar pago: {option}
              </button>
            ))}
            {estadoActions.map((action) => (
              <button
                key={action.estado}
                className={`button large ${action.estado === "Cancelada" ? "danger" : action.estado === "Entregada" ? "primary" : "secondary"}`}
                onClick={() =>
                  action.estado === "Cancelada"
                    ? onConfirm("Cancelar ficha", () => update(`/fichas/${ficha.id}/estado`, { estado: action.estado }))
                    : void update(`/fichas/${ficha.id}/estado`, { estado: action.estado })
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}

export function ReportsView() {
  const [rows, setRows] = useState<{ etiqueta: string; valor: number }[]>([]);
  const [clients, setClients] = useState<ClienteResponse[]>([]);
  useEffect(() => {
    void Promise.all([
      api<{ etiqueta: string; valor: number }[]>("/reportes/resumen"),
      api<PageResponse<ClienteResponse>>("/clientes", {}, { size: 20 }),
    ])
      .then(([nextSummary, page]) => { setRows(nextSummary); setClients(page.content); })
      .catch(() => undefined);
  }, []);
  return (
    <div className="page">
      <div className="page-heading"><div><h1>Reportes</h1><p>Indicadores actuales del taller.</p></div></div>
      <div className="metrics">
        {rows.map((item) => (
          <Metric key={item.etiqueta} label={item.etiqueta} value={money(item.valor)} tone="blue" />
        ))}
      </div>
      <section className="panel"><h2>Clientes</h2><table><tbody>{clients.map((client) => <tr key={client.id}><td>{client.nombre}</td><td>{client.pedidos} fichas</td></tr>)}</tbody></table></section>
    </div>
  );
}

export function ServicesView({ onOpenMoto }: { onOpenMoto: (id: string) => void }) {
  const [rows, setRows] = useState<NextServiceResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api<NextServiceResponse[]>("/services/proximos").then(setRows).catch((reason) => setError(errorMessage(reason)));
  }, []);
  const overdue = rows?.filter((row) => row.atrasadoKm || row.atrasadoFecha) ?? [];
  const withoutRef = rows?.filter((row) => row.sinReferencia && !row.atrasadoKm && !row.atrasadoFecha) ?? [];
  const upcoming = rows?.filter((row) => !row.sinReferencia && !row.atrasadoKm && !row.atrasadoFecha) ?? [];
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Service</h1>
          <p>Seguimiento del próximo service por motovehículo.</p>
        </div>
      </div>
      {error && <p className="login-pending">{error}</p>}
      {rows && (
        <div className="metrics">
          <Metric label="Atrasados" value={String(overdue.length)} tone="danger" />
          <Metric label="Próximos" value={String(upcoming.length)} tone="green" />
          <Metric label="Sin configurar" value={String(withoutRef.length)} tone="neutral" />
        </div>
      )}
      <section className="panel table-panel">
        {rows?.length ? (
          <table>
            <thead>
              <tr><th>Moto</th><th>Cliente</th><th>KM actual</th><th>Último service</th><th>Próximo</th><th>Estado</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.motoId}>
                  <td>{row.patente}<small>{row.moto}</small></td>
                  <td>{row.cliente}</td>
                  <td>{row.kilometraje != null ? row.kilometraje.toLocaleString("es-AR") : "—"}</td>
                  <td>{row.kmUltimoService != null ? `${row.kmUltimoService.toLocaleString("es-AR")} km` : "—"}</td>
                  <td>{row.sinReferencia || row.atrasadoKm || row.atrasadoFecha
                    ? <span>{row.proximKm ? `KM ${row.proximKm.toLocaleString("es-AR")}` : "—"}{row.proximaFecha ? ` · ${date(row.proximaFecha)}` : ""}</span>
                    : <span>{row.proximKm ? `KM ${row.proximKm.toLocaleString("es-AR")}` : "—"}{row.kmFaltan != null ? ` (faltan ${row.kmFaltan.toLocaleString("es-AR")})` : ""}{row.proximaFecha ? ` · ${date(row.proximaFecha)}` : ""}</span>}</td>
                  <td><StatusBadge status={row.sinReferencia ? "Sin configurar" : row.atrasadoKm || row.atrasadoFecha ? "Atrasado" : "Al día"} /></td>
                  <td><button className="row-action" onClick={() => onOpenMoto(row.motoId)}>Ver moto</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="Sin motovehículos" body="No hay motos para planificar el próximo service." />
        )}
      </section>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp, Download, Edit3, Eye, FileDown, Filter, Plus, Trash2 } from "lucide-react";
import { api, download, objectUrl } from "../lib/api";
import { money } from "../lib/format";
import { daysAgoInAr, todayInAr } from "../lib/dates";
import type {
  ClienteResponse,
  DashboardResponse,
  FichaResponse,
  FichaStatus,
  FichaTrabajoResponse,
  NextServiceResponse,
  PageResponse,
  PhotoResponse,
  RevisionControlState,
  RevisionResponse,
  TallerResponse,
  TrabajoStatus,
} from "../lib/types";
import { Dialog, EmptyState, Pagination, SearchBox, StatusBadge } from "./ui";

const date = (value: string) =>
  new Intl.DateTimeFormat("es-AR").format(new Date(value));
const errorMessage = (reason: unknown) =>
  reason instanceof Error ? reason.message : "No fue posible cargar la información.";
const tabKey = (estado: string) =>
  ({ "Carga": "carga", "En proceso": "en-proceso", "Revisión": "revision", "Entregada": "entregada", "Cancelada": "cancelada" } as Record<string, string>)[estado] ?? "carga";
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

const fichaStatuses: FichaStatus[] = ["Carga", "En proceso", "Revisión", "Entregada", "Cancelada"];
const trabajoStatuses: TrabajoStatus[] = ["Pendiente", "Realizado", "Cancelado"];

export function Dashboard({
  onPage,
  onNewOrder,
  onSelect,
  onOpenMoto,
  userName,
}: {
  onPage: (page: string) => void;
  onNewOrder: () => void;
  onSelect: (ficha: FichaResponse) => void;
  onOpenMoto: (id: string) => void;
  userName?: string;
}) {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [taller, setTaller] = useState<TallerResponse | null>(null);
  const [tab, setTab] = useState<FichaStatus>("Carga");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void Promise.all([
      api<DashboardResponse>("/dashboard", {}, { fechaDesde: from, fechaHasta: to }),
      api<TallerResponse>("/dashboard/taller"),
    ])
      .then(([nextData, nextTaller]) => { setData(nextData); setTaller(nextTaller); })
      .catch((reason) => setError(errorMessage(reason)));
  }, [from, to]);
  const talleres = taller?.estados ?? [];
  const motos = talleres.find((item) => item.estado === tab)?.motos ?? [];
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Buenos días, {userName}</h1>
          <p>Motos en el taller y actividad del período seleccionado.</p>
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
            <Metric label="Fichas" value={String(data.fichas)} tone="blue" />
          </div>
          <section className="panel table-panel taller-panel">
            <div className="panel-head">
              <div>
                <h2>Taller</h2>
                <p>Motos agrupadas por estado, las más recientes primero.</p>
              </div>
            </div>
            <nav className="tabs taller-tabs" aria-label="Estado de las motos">
              {talleres.map((item) => (
                <button
                  key={item.estado}
                  className={`${tab === item.estado ? "active" : ""} tab-${tabKey(item.estado)}`}
                  onClick={() => setTab(item.estado)}
                >
                  {item.estado}
                  <span className="tab-count">{item.motos.length}</span>
                </button>
              ))}
            </nav>
            {motos.length ? (
              <table>
                <thead>
                  <tr><th>Moto</th><th>Cliente</th><th>KM actual</th><th>Ingreso</th><th>Ficha</th><th>Estado</th><th /></tr>
                </thead>
                <tbody>
                  {motos.map((moto) => (
                    <tr key={moto.motoId}>
                      <td data-label="Moto">{moto.patente}<small>{moto.moto}</small></td>
                      <td data-label="Cliente">{moto.cliente}</td>
                      <td data-label="KM actual">{moto.kilometraje != null ? moto.kilometraje.toLocaleString("es-AR") : "—"}</td>
                      <td data-label="Ingreso">{moto.fechaIngreso ? date(moto.fechaIngreso) : "—"}</td>
                      <td data-label="Ficha">{moto.fichaNumero}</td>
                      <td data-label="Estado"><StatusBadge status={moto.estado} /></td>
                      <td data-label="Acción"><button className="row-action" onClick={() => onOpenMoto(moto.motoId)}>Ver moto</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title={`Sin motos en ${tab}`} body="No hay motos en este estado por el momento." />
            )}
          </section>
          <section className="panel">
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
            {!data.recientes.length && <p className="panel-empty">Sin fichas en este período.</p>}
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
  const [desde, setDesde] = useState(daysAgoInAr(30));
  const [hasta, setHasta] = useState(todayInAr());
  const [sortBy, setSortBy] = useState("fechaIngreso");
  const [direction, setDirection] = useState<"ASC" | "DESC">("DESC");
  const [result, setResult] = useState<PageResponse<FichaResponse> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api<PageResponse<FichaResponse>>(
      "/fichas",
      {},
      {
        q: query || undefined,
        estado: status === "Todos" ? undefined : status,
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        sortBy: sortBy || undefined,
        direction,
        page: page - 1,
        size: 20,
      },
    )
      .then(setResult)
      .catch((reason) => setError(errorMessage(reason)));
  }, [query, status, desde, hasta, sortBy, direction, page]);
  const params = {
    q: query || undefined,
    estado: status === "Todos" ? undefined : status,
    fechaDesde: desde || undefined,
    fechaHasta: hasta || undefined,
    sortBy: sortBy || undefined,
    direction,
  };
  const toggleDirection = () => setDirection((d) => (d === "ASC" ? "DESC" : "ASC"));
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
          <label>
            <span className="date-label">Desde</span>
            <input type="date" value={desde} onChange={(event) => { setDesde(event.target.value); setPage(1); }} />
          </label>
          <label>
            <span className="date-label">Hasta</span>
            <input type="date" value={hasta} onChange={(event) => { setHasta(event.target.value); setPage(1); }} />
          </label>
          <label>
            <Filter size={16} />
            <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }}>
              <option value="fechaIngreso">Fecha de ingreso</option>
              <option value="numero">Número</option>
              <option value="total">Total</option>
              <option value="estado">Estado</option>
            </select>
          </label>
          <button className="button secondary" onClick={() => { toggleDirection(); setPage(1); }} aria-label="Cambiar orden">
            <ArrowDownUp size={16} />
            {direction === "DESC" ? "Más recientes" : "Más antiguos"}
          </button>
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
                const editable = ficha.estado === "Carga" || ficha.estado === "En proceso";
                return (
                  <tr key={ficha.id}>
                    <td data-label="Ficha">{ficha.numero}</td>
                    <td data-label="Cliente">{ficha.cliente}</td>
                    <td data-label="Moto">{ficha.moto}<small>{ficha.patente}</small></td>
                    <td data-label="Estado"><StatusBadge status={ficha.estado} /></td>
                    <td data-label="Pago"><StatusBadge status={ficha.estadoPago} /></td>
                    <td data-label="Total">{money(ficha.total)}</td>
                    <td className="table-actions">
                      <button onClick={() => onSelect(ficha)} aria-label={`Ver ficha ${ficha.numero}`}><Eye size={17} /></button>
                      {editable ? (
                        <>
                          <button onClick={() => onEdit(ficha)} aria-label={`Editar ficha ${ficha.numero}`}><Edit3 size={17} /></button>
                          <button className="danger-action" onClick={() => onDelete(ficha)} aria-label={`Eliminar ficha ${ficha.numero}`}><Trash2 size={17} /></button>
                        </>
                      ) : null}
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
  item: FichaTrabajoResponse;
  onState: (estado: TrabajoStatus) => void;
  locked: boolean;
}) {
  const options = trabajoStatuses.filter((option) => option !== item.estadoTrabajo);
  return (
    <div className={`line-item ${item.estadoTrabajo === "Cancelado" ? "muted" : ""}`}>
      <div>
        <strong>{item.descripcion}</strong>
        <span>{money(Number(item.precioUnitario))}{item.descuento > 0 && ` · descuento ${money(Number(item.descuento))}`}{item.estadoTrabajo !== "Pendiente" && ` · ${item.estadoTrabajo}`}</span>
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
  const [pending, setPending] = useState<string | null>(null);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [serviceKm, setServiceKm] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [serviceSaving, setServiceSaving] = useState(false);
  const [revision, setRevision] = useState<RevisionResponse | null>(null);
  const load = () =>
    void api<FichaResponse>(`/fichas/${fichaKey}`)
      .then(setFicha)
      .catch((reason) => setError(errorMessage(reason)));
  useEffect(load, [fichaKey]);
  useEffect(() => {
    if (ficha?.estado !== "Revisión") { setRevision(null); return; }
    void api<RevisionResponse>(`/fichas/${fichaKey}/revision`)
      .then(setRevision)
      .catch(() => undefined);
  }, [ficha?.estado, fichaKey]);
  const aprobarRevision = () => {
    if (pending) return;
    setPending("aprobar-revision");
    void api(`/fichas/${fichaKey}/revision/aprobar`, {
      method: "POST",
      body: JSON.stringify({ forzada: false }),
    })
      .then(() => { setRevision(null); load(); })
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setPending(null));
  };
  const updateControl = (controlId: string, body: Record<string, string>) =>
    void api<RevisionResponse>(`/fichas/${fichaKey}/revision/controles/${controlId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
      .then(setRevision)
      .catch((reason) => setError(errorMessage(reason)));
  if (!ficha)
    return (
      <div className="page">
        <button className="back" onClick={onBack}>← Volver a fichas</button>
        {error ? <p className="login-pending">{error}</p> : <p>Cargando ficha…</p>}
      </div>
    );
  const update = async (path: string, body: Record<string, string>, id: string) => {
    if (pending) return;
    setPending(id);
    try {
      const next = await api<FichaResponse>(path, { method: "PATCH", body: JSON.stringify(body) });
      setFicha(next);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(null);
    }
  };
  const current = ficha.estado;
  const saveService = async () => {
    if (!serviceKm) return setError("Ingresá el kilometraje del service.");
    if (serviceSaving) return;
    setServiceSaving(true);
    try {
      await api(`/motovehiculos/${ficha.motoId}/services`, {
        method: "POST",
        body: JSON.stringify({
          fichaId: ficha.id,
          kilometraje: Number(serviceKm),
          fecha: serviceDate || null,
          observaciones: serviceNotes || null,
        }),
      });
      setServiceOpen(false);
      setServiceKm("");
      setServiceDate("");
      setServiceNotes("");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setServiceSaving(false);
    }
  };
  const locked = current === "Cancelada" || current === "Entregada";
  const flowSteps: FichaStatus[] = ["Carga", "En proceso", "Revisión", "Entregada"];
  const currentStep = flowSteps.indexOf(current);
  const bottomActions: { key: string; label: string; className: string; onClick: () => void }[] = [];
  if (current === "Carga")
    bottomActions.push({ key: "iniciar", label: "Comenzar trabajo", className: "primary", onClick: () => void update(`/fichas/${ficha.id}/estado`, { estado: "En proceso" }, "estado-en-proceso") });
  else if (current === "En proceso")
    bottomActions.push({ key: "revision", label: "Enviar a revisión", className: "primary", onClick: () => void update(`/fichas/${ficha.id}/estado`, { estado: "Revisión" }, "estado-revision") });
  else if (current === "Revisión")
    bottomActions.push({ key: "aprobar", label: "Aprobar revisión y entregar", className: "primary", onClick: () => void aprobarRevision() });
  else if (current === "Entregada")
    bottomActions.push({ key: "service", label: "Registrar service", className: "primary", onClick: () => { setServiceKm(ficha.kilometrajeIngreso != null ? String(ficha.kilometrajeIngreso) : ""); setServiceOpen(true); } });
  if (ficha.estadoPago !== "Pagado")
    bottomActions.push({ key: "pago", label: ficha.estadoPago === "Parcial" ? "Completar pago" : "Marcar como pagada", className: "secondary", onClick: () => void update(`/fichas/${ficha.id}/pago`, { estadoPago: "Pagado" }, "pago-pagado") });
  if (current !== "Entregada" && current !== "Cancelada")
    bottomActions.push({ key: "cancelar", label: "Cancelar ficha", className: "danger", onClick: () => onConfirm("Cancelar ficha", () => update(`/fichas/${ficha.id}/estado`, { estado: "Cancelada" }, "estado-cancelada")) });
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
      <ol className={`flow-steps${current === "Cancelada" ? " canceled" : ""}`}>
        {flowSteps.map((step) => {
          const index = flowSteps.indexOf(step);
          const done = current !== "Cancelada" && currentStep >= 0 && index < currentStep;
          const isCurrent = current !== "Cancelada" && index === currentStep;
          return (
            <li key={step} className={`flow-step${isCurrent ? " current" : ""}${done ? " done" : ""}`}>
              <span>{done ? "✓" : index + 1}</span>
              <strong>{step}</strong>
            </li>
          );
        })}
        {current === "Cancelada" && (
          <li className="flow-step flow-step-end current">
            <span>✕</span>
            <strong>Cancelada</strong>
          </li>
        )}
      </ol>
      {bottomActions.length > 0 && (
        <div className="ficha-actions">
          {bottomActions.map((action) => (
            <button key={action.key} className={`button large ${action.className}`} disabled={Boolean(pending)} onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      )}
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
              {ficha.trabajos.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  locked={locked}
                  onState={(estado) => void update(`/fichas/${ficha.id}/trabajos/${item.id}/estado`, { estado }, `item-${item.id}`)}
                />
              ))}
            </div>
            <OrderPhotos photos={ficha.fotos} onChange={() => void load()} />
            {revision && (
              <section className="revision-panel">
                <div className="panel-head">
                  <h3>Revisión</h3>
                  <span className="muted">{revision.estado === "APROBADA" ? `Aprobada${revision.forzada ? " (forzada)" : ""}${revision.aprobadoAt ? ` · ${date(revision.aprobadoAt)}` : ""}` : "Controles pendientes"}</span>
                </div>
                {revision.estado !== "APROBADA" && (
                  <div className="line-items-list">
                    {revision.controles.map((control) => (
                      <div key={control.id} className="line-item revision-control">
                        <div>
                          <strong>{control.control}</strong>
                          <span>{control.categorias}{control.obligatorio ? " · Obligatorio" : ""}</span>
                        </div>
                        <select
                          value={control.estado}
                          onChange={(event) => void updateControl(control.id, { estado: event.target.value as RevisionControlState })}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Revisado">Revisado</option>
                          <option value="No aplica">No aplica</option>
                        </select>
                        {control.estado !== "Pendiente" && (
                          <input
                            type="text"
                            placeholder="Observación"
                            defaultValue={control.observacion ?? ""}
                            onBlur={(event) => void updateControl(control.id, { estado: control.estado, observacion: event.target.value })}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </section>
        </div>
        <aside className="summary">
          <h3>Resumen monetario</h3>
          <div><span>Descuento global</span><strong>{ficha.descuentoGlobal > 0 ? money(ficha.descuentoGlobal) : "—"}</strong></div>
          <div><span>IVA</span><strong>{ficha.iva ? "Incluido" : "No aplica"}</strong></div>
          <div><span>Ingreso</span><strong>{ficha.fechaIngreso ? date(ficha.fechaIngreso) : "—"}</strong></div>
          <div><span>Entrega estimada</span><strong>{ficha.fechaEntregaEstimada ? date(ficha.fechaEntregaEstimada) : "—"}</strong></div>
          <div><span>Entrega real</span><strong>{ficha.fechaEntregaReal ? date(ficha.fechaEntregaReal) : "—"}</strong></div>
          <div className="total"><span>Total final</span><strong>{money(ficha.total)}</strong></div>
        </aside>
      </section>
      <Dialog open={serviceOpen} title="Registrar service" onClose={() => setServiceOpen(false)}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void saveService(); }}>
          <label>Kilometraje<input type="number" min="0" value={serviceKm} onChange={(event) => setServiceKm(event.target.value)} required /></label>
          <label>Fecha<input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} /></label>
          <label>Observación<input type="text" value={serviceNotes} onChange={(event) => setServiceNotes(event.target.value)} placeholder="Ej: cambio de aceite y filtros" /></label>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setServiceOpen(false)}>Cancelar</button><button className="button primary" disabled={serviceSaving}>{serviceSaving ? "Guardando..." : "Guardar"}</button></div>
        </form>
      </Dialog>
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
      <section className="panel"><h2>Clientes</h2><table><tbody>{clients.map((client) => <tr key={client.id}><td data-label="Cliente">{client.nombre}</td><td data-label="Fichas">{client.fichas} fichas</td></tr>)}</tbody></table></section>
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
          <Metric label="Sin services" value={String(withoutRef.length)} tone="neutral" />
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
                  <td data-label="Moto">{row.patente}<small>{row.moto}</small></td>
                  <td data-label="Cliente">{row.cliente}</td>
                  <td data-label="KM actual">{row.kilometraje != null ? row.kilometraje.toLocaleString("es-AR") : "—"}</td>
                  <td data-label="Último service">{row.kmUltimoService != null ? `${row.kmUltimoService.toLocaleString("es-AR")} km` : "—"}</td>
                  <td data-label="Próximo">{row.sinReferencia || row.atrasadoKm || row.atrasadoFecha
                    ? <span>{row.proximKm ? `KM ${row.proximKm.toLocaleString("es-AR")}` : "—"}{row.proximaFecha ? ` · ${date(row.proximaFecha)}` : ""}</span>
                    : <span>{row.proximKm ? `KM ${row.proximKm.toLocaleString("es-AR")}` : "—"}{row.kmFaltan != null ? ` (faltan ${row.kmFaltan.toLocaleString("es-AR")})` : ""}{row.proximaFecha ? ` · ${date(row.proximaFecha)}` : ""}</span>}</td>
                  <td data-label="Estado"><StatusBadge status={row.sinReferencia ? "Sin services" : row.atrasadoKm || row.atrasadoFecha ? "Atrasado" : "Al día"} /></td>
                  <td data-label="Acción"><button className="row-action" onClick={() => onOpenMoto(row.motoId)}>Ver moto</button></td>
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

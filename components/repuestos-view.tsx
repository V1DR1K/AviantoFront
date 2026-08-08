"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp, Download, Edit3, Eye, Filter, Plus, Trash2 } from "lucide-react";
import { api, download } from "../lib/api";
import { money, parsePrice, priceInput } from "../lib/format";
import { daysAgoInAr, todayInAr } from "../lib/dates";
import type {
  ClienteResponse,
  FichaResponse,
  MotovehiculoResponse,
  PageResponse,
  PagoStatus,
  RepuestoItemState,
  RepuestoResponse,
  RepuestoState,
} from "../lib/types";
import { ConfirmModal, Dialog, EmptyState, Pagination, SearchBox, StatusBadge } from "./ui";

const date = (value: string) => new Intl.DateTimeFormat("es-AR").format(new Date(value));
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible cargar la información.";

const repuestoStates: RepuestoState[] = ["En curso", "Completado", "Cancelado"];
const pagoStates: PagoStatus[] = ["No pagado", "Parcial", "Pagado"];
const itemStates: RepuestoItemState[] = ["Pendiente de pedir", "Pedido", "Recibido", "Entregado", "Cancelado"];

export function RepuestosView({
  onOpen,
  notify,
}: {
  onOpen: (repuesto: RepuestoResponse) => void;
  notify: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState<"Todos" | RepuestoState>("Todos");
  const [desde, setDesde] = useState(daysAgoInAr(30));
  const [hasta, setHasta] = useState(todayInAr());
  const [sortBy, setSortBy] = useState("fecha");
  const [direction, setDirection] = useState<"ASC" | "DESC">("DESC");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResponse<RepuestoResponse> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RepuestoResponse | null>(null);
  const [deleting, setDeleting] = useState<RepuestoResponse | null>(null);
  const [clients, setClients] = useState<ClienteResponse[]>([]);
  const repuestoParams = () => ({ estado: estado === "Todos" ? undefined : estado, q: query || undefined, fechaDesde: desde || undefined, fechaHasta: hasta || undefined, sortBy, direction });
  useEffect(() => { void api<PageResponse<RepuestoResponse>>("/repuestos", {}, { ...repuestoParams(), page: page - 1, size: 20 }).then(setResult).catch((err) => setError(errorMessage(err))); }, [query, estado, desde, hasta, sortBy, direction, page]);
  const loadClients = () => void api<PageResponse<ClienteResponse>>("/clientes", {}, { size: 100, activo: true }).then((r) => setClients(r.content)).catch(() => undefined);
  const refresh = () => void api<PageResponse<RepuestoResponse>>("/repuestos", {}, { ...repuestoParams(), page: page - 1, size: 20 }).then(setResult).catch((err) => setError(errorMessage(err)));
  const toggleDirection = () => setDirection((d) => (d === "ASC" ? "DESC" : "ASC"));
  return (
    <div className="page">
      <div className="page-heading">
        <div><h1>Pedidos de repuestos</h1><p>Control de compras, recepción y pago de repuestos y accesorios.</p></div>
        <button className="button primary" onClick={() => { setCreateOpen(true); loadClients(); }}><Plus size={19} />Nuevo pedido</button>
      </div>
      {error && <p className="login-pending">{error}</p>}
      <section className="panel table-panel">
        <div className="filter-bar">
          <SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Número, cliente o patente" />
          <label><Filter size={16} /><select value={estado} onChange={(event) => { setEstado(event.target.value as typeof estado); setPage(1); }}><option>Todos</option>{repuestoStates.map((option) => <option key={option}>{option}</option>)}</select></label>
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
              <option value="fecha">Fecha</option>
              <option value="total">Total</option>
              <option value="estado">Estado</option>
            </select>
          </label>
          <button className="button secondary" onClick={() => { toggleDirection(); setPage(1); }} aria-label="Cambiar orden">
            <ArrowDownUp size={16} />
            {direction === "DESC" ? "Más recientes" : "Más antiguos"}
          </button>
          <button className="button secondary" onClick={() => void download("/repuestos/export.xlsx", "repuestos.xlsx", repuestoParams()).catch((reason) => setError(errorMessage(reason)))}><Download size={17} />Exportar Excel</button>
        </div>
        {result?.content.length ? (
          <table>
            <thead><tr><th>Pedido</th><th>Moto</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th>Pago</th><th>Total</th><th /></tr></thead>
            <tbody>{result.content.map((repuesto) => {
              const editable = repuesto.estado !== "Cancelado" && repuesto.estado !== "Completado";
              return <tr key={repuesto.id}><td data-label="Pedido">{repuesto.numero}</td><td data-label="Moto">{repuesto.patente}</td><td data-label="Cliente">{repuesto.cliente}</td><td data-label="Fecha">{date(repuesto.fecha)}</td><td data-label="Estado"><StatusBadge status={repuesto.estado} /></td><td data-label="Pago"><StatusBadge status={repuesto.estadoPago} /></td><td data-label="Total">{money(repuesto.total)}</td><td className="table-actions">
                <button onClick={() => onOpen(repuesto)} aria-label={`Ver pedido ${repuesto.numero}`}><Eye size={17} /></button>
                {editable ? (
                  <>
                    <button onClick={() => { setEditing(repuesto); loadClients(); }} aria-label={`Editar pedido ${repuesto.numero}`}><Edit3 size={17} /></button>
                    <button className="danger-action" onClick={() => setDeleting(repuesto)} aria-label={`Eliminar pedido ${repuesto.numero}`}><Trash2 size={17} /></button>
                  </>
                ) : null}
              </td></tr>;
            })}</tbody>
          </table>
        ) : <EmptyState title="No hay pedidos de repuestos" body="Creá uno nuevo o ajustá los filtros." />}
        <Pagination page={page} total={result?.totalPages || 1} onPage={setPage} />
      </section>
      <CreateRepuestoDialog
        key={createOpen ? "create" : editing ? `edit-${editing.id}` : "closed"}
        open={createOpen || Boolean(editing)}
        initial={editing}
        clients={clients}
        notify={notify}
        onLoadVehicles={async (clienteId) => { const r = await api<PageResponse<MotovehiculoResponse>>("/motovehiculos", {}, { clienteId, size: 100, activo: true }); return r.content; }}
        onClose={() => { setCreateOpen(false); setEditing(null); }}
        onSaved={(repuesto) => { setCreateOpen(false); setEditing(null); refresh(); onOpen(repuesto); }}
        onError={setError}
      />
      <ConfirmModal
        open={Boolean(deleting)}
        title="Eliminar pedido de repuesto"
        body={`Vas a eliminar el pedido ${deleting?.numero ?? ""}. El historial conservará el registro para auditoría.`}
        confirmLabel="Eliminar pedido"
        onClose={() => setDeleting(null)}
        onConfirm={() => { const sel = deleting; if (!sel) return; setDeleting(null); void api(`/repuestos/${sel.id}`, { method: "DELETE" }).then(() => { refresh(); notify(`Pedido ${sel.numero} eliminado.`); }).catch((reason) => setError(errorMessage(reason))); }}
      />
    </div>
  );
}

function CreateRepuestoDialog({
  open,
  initial,
  clients,
  onLoadVehicles,
  onClose,
  onSaved,
  onError,
  notify,
}: {
  open: boolean;
  initial: RepuestoResponse | null;
  clients: ClienteResponse[];
  onLoadVehicles: (clienteId: string) => Promise<MotovehiculoResponse[]>;
  onClose: () => void;
  onSaved: (repuesto: RepuestoResponse) => void;
  onError: (message: string) => void;
  notify: (message: string) => void;
}) {
  const [clientId, setClientId] = useState(initial?.clienteId ?? "");
  const [motoId, setMotoId] = useState(initial?.motoId ?? "");
  const [proveedor, setProveedor] = useState(initial?.proveedor ?? "");
  const [motoOptions, setMotoOptions] = useState<MotovehiculoResponse[]>([]);
  const [fichas, setFichas] = useState<FichaResponse[]>([]);
  const [fichaId, setFichaId] = useState(initial?.fichaId ?? "");
  const [rows, setRows] = useState<{ key: string; descripcion: string; tipo: string; cantidad: string; precio: string; estado?: string; fichaTrabajoId?: string }[]>(initial?.items.length
    ? initial.items.map((item) => ({ key: crypto.randomUUID(), descripcion: item.descripcion, tipo: item.tipo === "ACCESORIO" ? "Accesorio" : "Repuesto", cantidad: String(item.cantidad), precio: String(item.precio), estado: item.estado, fichaTrabajoId: item.fichaTrabajoId ?? undefined }))
    : [{ key: crypto.randomUUID(), descripcion: "", tipo: "Repuesto", cantidad: "1", precio: "" }]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!clientId) return;
    void onLoadVehicles(clientId).then((loaded) => {
      setMotoOptions(loaded);
      if (initial?.motoId && !loaded.some((moto) => moto.id === initial.motoId)) {
        void api<MotovehiculoResponse>(`/motovehiculos/${initial.motoId}`).then((moto) => setMotoOptions((all) => all.some((vehicle) => vehicle.id === moto.id) ? all : [moto, ...all])).catch(() => undefined);
      }
    }).catch((reason) => onError(errorMessage(reason)));
  }, [clientId]);
  const changeClient = (value: string) => {
    setClientId(value);
    setMotoId("");
    setMotoOptions([]);
    setFichas([]);
    setFichaId("");
  };
  useEffect(() => {
    if (!motoId) { setFichas([]); setFichaId(""); return; }
    void api<PageResponse<FichaResponse>>("/fichas", {}, { motoId, size: 50 }).then((page) => {
      const open = page.content.filter((ficha) => ficha.estado !== "Entregada" && ficha.estado !== "Cancelada");
      setFichas(open);
      const keep = initial?.fichaId && page.content.some((ficha) => ficha.id === initial.fichaId) ? initial.fichaId : "";
      setFichaId(keep || open[0]?.id || "");
      if (initial?.fichaId && !page.content.some((ficha) => ficha.id === initial.fichaId)) {
        void api<FichaResponse>(`/fichas/${initial.fichaId}`).then((ficha) => { setFichas((all) => all.some((item) => item.id === ficha.id) ? all : [ficha, ...all]); setFichaId(ficha.id); }).catch(() => undefined);
      }
    }).catch((reason) => onError(errorMessage(reason)));
  }, [motoId]);
  const changeFicha = (value: string) => {
    setFichaId(value);
    setRows((all) => all.map((row) => {
      const valid = value ? (fichas.find((ficha) => ficha.id === value)?.trabajos ?? []).some((trabajo) => trabajo.id === row.fichaTrabajoId) : false;
      return { ...row, fichaTrabajoId: valid ? row.fichaTrabajoId : undefined };
    }));
  };
  const fichaTrabajos = fichas.find((ficha) => ficha.id === fichaId)?.trabajos ?? [];
  const subtotal = rows.reduce((sum, row) => sum + Number(row.cantidad) * parsePrice(row.precio), 0);
  const save = async () => {
    const items = rows.filter((row) => row.descripcion.trim() && Number(row.cantidad) > 0);
    if (!clientId || !motoId || !items.length) return onError("Seleccioná cliente, moto y al menos un ítem.");
    setSaving(true);
    try {
      const repuesto = initial
        ? await api<RepuestoResponse>(`/repuestos/${initial.id}`, {
            method: "PUT",
            body: JSON.stringify({ motoVehiculoId: motoId, clienteId: clientId, fichaId: fichaId || null, fecha: initial.fecha.slice(0, 10), proveedor: proveedor || null, observaciones: null, items: items.map((item) => ({ descripcion: item.descripcion, tipo: item.tipo === "Accesorio" ? "ACCESORIO" : "REPUESTO", cantidad: item.cantidad, precio: parsePrice(item.precio), fichaTrabajoId: item.fichaTrabajoId || null, estado: item.estado ?? "Pendiente de pedir" })) }),
          })
        : await api<RepuestoResponse>("/repuestos", {
            method: "POST",
            body: JSON.stringify({ motoVehiculoId: motoId, clienteId: clientId, fichaId: fichaId || null, fecha: new Date().toISOString().slice(0, 10), proveedor: proveedor || null, observaciones: null, items: items.map((item) => ({ descripcion: item.descripcion, tipo: item.tipo === "Accesorio" ? "ACCESORIO" : "REPUESTO", cantidad: item.cantidad, precio: parsePrice(item.precio), fichaTrabajoId: item.fichaTrabajoId || null, estado: "Pendiente de pedir" })) }),
          });
      notify(`Pedido ${repuesto.numero} ${initial ? "actualizado" : "creado"}.`);
      onSaved(repuesto);
    } catch (reason) { onError(errorMessage(reason)); } finally { setSaving(false); }
  };
  const setRow = (key: string, changes: Partial<typeof rows[number]>) => setRows((all) => all.map((row) => row.key === key ? { ...row, ...changes } : row));
  return (
    <Dialog open={open} title={initial ? "Editar pedido de repuesto" : "Nuevo pedido de repuesto"} onClose={onClose} wide>
      <form className="record-form repuesto-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <div className="repuesto-pick">
          <label>Cliente<select value={clientId} onChange={(event) => changeClient(event.target.value)} required><option value="">Seleccionar</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nombre}</option>)}</select></label>
          <label>Moto<select value={motoId} onChange={(event) => setMotoId(event.target.value)} required disabled={!clientId}><option value="">Seleccionar</option>{motoOptions.map((moto) => <option key={moto.id} value={moto.id}>{moto.marca} {moto.modelo} · {moto.patente}</option>)}</select></label>
          <label>Ficha (opcional)<select value={fichaId} onChange={(event) => changeFicha(event.target.value)} disabled={!motoId}><option value="">Sin ficha</option>{fichas.map((ficha) => <option key={ficha.id} value={ficha.id}>{ficha.numero} · {ficha.estado}</option>)}</select></label>
          <label>Proveedor<input value={proveedor} onChange={(event) => setProveedor(event.target.value)} /></label>
        </div>
        <div className="repuesto-items">
          <div className="repuesto-items-head"><span>Descripción</span><span>Tipo</span><span>Trabajo</span><span>Cant.</span><span>Precio</span><span>Total</span><span /></div>
          {rows.map((row) => (
            <div className="repuesto-item" key={row.key}>
              <input placeholder="Ej.: cubierta 110/90" value={row.descripcion} onChange={(event) => setRow(row.key, { descripcion: event.target.value })} />
              <select value={row.tipo} onChange={(event) => setRow(row.key, { tipo: event.target.value })} aria-label="Tipo"><option>Repuesto</option><option>Accesorio</option></select>
              <select value={row.fichaTrabajoId ?? ""} onChange={(event) => setRow(row.key, { fichaTrabajoId: event.target.value || undefined })} aria-label="Trabajo" disabled={!fichaId}><option value="">Sin trabajo</option>{fichaTrabajos.map((trabajo) => <option key={trabajo.id} value={trabajo.id}>{trabajo.descripcion}</option>)}</select>
              <input type="number" min="1" value={row.cantidad} onChange={(event) => setRow(row.key, { cantidad: String(event.target.value) })} aria-label="Cantidad" />
              <input inputMode="decimal" value={priceInput(row.precio)} onChange={(event) => setRow(row.key, { precio: event.target.value })} placeholder="Precio" aria-label="Precio" />
              <strong>{money(Number(row.cantidad) * parsePrice(row.precio))}</strong>
              <button type="button" className="remove-item" aria-label="Quitar ítem" onClick={() => setRows((all) => all.filter((r) => r.key !== row.key))}>×</button>
            </div>
          ))}
          <button type="button" className="text-button" onClick={() => setRows((all) => [...all, { key: crypto.randomUUID(), descripcion: "", tipo: "Repuesto", cantidad: "1", precio: "" }])}><Plus size={17} />Agregar ítem</button>
        </div>
        <div className="repuesto-total"><span>Total del pedido</span><strong>{money(subtotal)}</strong></div>
        <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando..." : initial ? "Guardar cambios" : "Guardar pedido"}</button></div>
      </form>
    </Dialog>
  );
}

export function RepuestoDetail({
  repuestoId,
  onBack,
  notify,
}: {
  repuestoId: string;
  onBack: () => void;
  notify: (message: string) => void;
}) {
  const [repuesto, setRepuesto] = useState<RepuestoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const load = () => void api<RepuestoResponse>(`/repuestos/${repuestoId}`).then(setRepuesto).catch((reason) => setError(errorMessage(reason)));
  useEffect(load, [repuestoId]);
  if (error) return <div className="page"><button className="back" onClick={onBack}>← Volver</button><p className="login-pending">{error}</p></div>;
  if (!repuesto) return <div className="page">Cargando…</div>;
  const locked = repuesto.estado === "Cancelado";
  const setItemState = async (itemId: string, estado: RepuestoItemState) => { if (pending) return; setPending(true); try { const next = await api<RepuestoResponse>(`/repuestos/${repuesto.id}/items/${itemId}/estado`, { method: "PATCH", body: JSON.stringify({ estado }) }); setRepuesto(next); } catch (reason) { setError(errorMessage(reason)); } finally { setPending(false); } };
  const patch = async (path: string, body: Record<string, string>) => { if (pending) return; setPending(true); try { const next = await api<RepuestoResponse>(path, { method: "PATCH", body: JSON.stringify(body) }); setRepuesto(next); return next; } catch (reason) { setError(errorMessage(reason)); return null; } finally { setPending(false); } };
  return (
    <div className="page">
      <button className="back" onClick={onBack}>← Volver a repuestos</button>
      <div className="detail-title">
        <div><p>{repuesto.numero}</p><h1>{repuesto.patente}</h1><span>{repuesto.cliente} · {date(repuesto.fecha)}</span></div>
        <div className="detail-stack"><StatusBadge status={repuesto.estado} /><StatusBadge status={repuesto.estadoPago} /><strong>{money(repuesto.total)}</strong></div>
      </div>
      <section className="detail-grid">
        <div className="form-stack">
          <section className="panel">
            <div className="panel-head"><h2>Ítems del pedido</h2></div>
            <table>
              <thead><tr><th>Ítem</th><th>Tipo</th><th>Cant.</th><th>Precio</th><th>Subtotal</th><th>Estado</th>{!locked ? <th /> : null}</tr></thead>
              <tbody>{repuesto.items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Ítem">{item.descripcion}</td><td data-label="Tipo">{item.tipo}</td><td data-label="Cant.">{Number(item.cantidad)}</td><td data-label="Precio">{money(item.precio)}</td><td data-label="Subtotal">{money(item.subtotal)}</td>
                  <td data-label="Estado"><StatusBadge status={item.estado} /></td>
                  {!locked && <td data-label="Cambiar">
                    <select value="" disabled={pending} onChange={(event) => event.target.value && void setItemState(item.id, event.target.value as RepuestoItemState)}>
                      <option value="">Cambiar…</option>
                      {itemStates.filter((option) => option !== item.estado).map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </td>}
                </tr>
              ))}</tbody>
            </table>
          </section>
        </div>
        <aside className="summary repuesto-summary">
          <h3>Resumen del pedido</h3>
          <dl className="summary-facts">
            <div><dt>Pedido</dt><dd>{repuesto.numero}</dd></div>
            <div><dt>Fecha</dt><dd>{date(repuesto.fecha)}</dd></div>
            <div><dt>Cliente</dt><dd>{repuesto.cliente}</dd></div>
            <div><dt>Proveedor</dt><dd>{repuesto.proveedor || "—"}</dd></div>
          </dl>
          <div className="total"><span>Total</span><strong>{money(repuesto.total)}</strong></div>
          <div className="summary-group">
            <h4>Estado del pedido</h4>
            <div className="summary-actions">
              {repuestoStates.filter((option) => option !== repuesto.estado && !(option === "Cancelado" && repuesto.estado === "Completado") && !(option === "Completado" && repuesto.estado === "Cancelado")).map((option) => (
                <button key={option} className="button secondary large" disabled={pending} onClick={() => { void patch(`/repuestos/${repuesto.id}/estado`, { estado: option }).then((next) => next && notify(`Pedido: ${option}`)); }}>Marcar {option}</button>
              ))}
            </div>
          </div>
          <div className="summary-group">
            <h4>Pago</h4>
            <div className="summary-actions">
              {pagoStates.filter((option) => option !== repuesto.estadoPago).map((option) => (
                <button key={option} className="button primary large" disabled={pending} onClick={() => { void patch(`/repuestos/${repuesto.id}/pago`, { estadoPago: option }).then((next) => next && notify(`Pago: ${option}`)); }}>Pago: {option}</button>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
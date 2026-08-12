"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp, Download, Edit3, Eye, Filter, Plus, Trash2 } from "lucide-react";
import { api, download } from "../lib/api";
import { integerInput, money, parseIntegerInput, parsePrice, priceInput } from "../lib/format";
import { daysAgoInAr, formatDateInAr, todayInAr } from "../lib/dates";
import type {
  ClienteResponse,
  FichaResponse,
  MotovehiculoResponse,
  PageResponse,
  RepuestoItemState,
  RepuestoResponse,
  RepuestoState,
} from "../lib/types";
import { ConfirmModal, Dialog, EmptyState, Pagination, SearchBox, SelectField, StatusBadge, type Notify } from "./ui";

const date = formatDateInAr;
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible cargar la información.";

const repuestoStates: RepuestoState[] = ["En curso", "Completado", "Cancelado"];

export function RepuestosView({
  onOpen,
  notify,
  createPrefill,
  startCreate = false,
  onPrefillHandled,
}: {
  onOpen: (repuesto: RepuestoResponse) => void;
  notify: Notify;
  createPrefill?: { motoId: string; clienteId?: string | null } | null;
  startCreate?: boolean;
  onPrefillHandled?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState<"Todos" | RepuestoState>("Todos");
  const [desde, setDesde] = useState(daysAgoInAr(30));
  const [hasta, setHasta] = useState(todayInAr());
  const [sortBy, setSortBy] = useState("fecha");
  const [direction, setDirection] = useState<"ASC" | "DESC">("DESC");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResponse<RepuestoResponse> | null>(null);
  const [createOpen, setCreateOpen] = useState(startCreate);
  const [editing, setEditing] = useState<RepuestoResponse | null>(null);
  const [deleting, setDeleting] = useState<RepuestoResponse | null>(null);
  const [clients, setClients] = useState<ClienteResponse[]>([]);
  const repuestoParams = () => ({ estado: estado === "Todos" ? undefined : estado, q: query || undefined, fechaDesde: desde || undefined, fechaHasta: hasta || undefined, sortBy, direction });
  useEffect(() => { void api<PageResponse<RepuestoResponse>>("/repuestos", {}, { ...repuestoParams(), page: page - 1, size: 20 }).then(setResult).catch((err) => notify(errorMessage(err), "error")); }, [query, estado, desde, hasta, sortBy, direction, page, notify]);
  const loadClients = () => void api<PageResponse<ClienteResponse>>("/clientes", {}, { size: 100, activo: true }).then((r) => setClients(r.content)).catch(() => undefined);
  const refresh = () => void api<PageResponse<RepuestoResponse>>("/repuestos", {}, { ...repuestoParams(), page: page - 1, size: 20 }).then(setResult).catch((err) => notify(errorMessage(err), "error"));
  const toggleDirection = () => setDirection((d) => (d === "ASC" ? "DESC" : "ASC"));
  useEffect(() => { if (createPrefill) loadClients(); }, [createPrefill]);
  return (
    <div className="page">
      <div className="page-heading">
        <div><h1>Pedidos de repuestos</h1><p>Control de compras, recepción y pago de repuestos y accesorios.</p></div>
        <button className="button primary" onClick={() => { setCreateOpen(true); loadClients(); }}><Plus size={19} />Nuevo pedido</button>
      </div>
      <section className="panel table-panel">
        <div className="filter-bar">
          <SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Número, cliente o patente" />
          <SelectField value={estado} onChange={(value) => { setEstado(value as typeof estado); setPage(1); }} options={repuestoStates.map((option) => ({ value: option, label: option }))} placeholder="Todos" icon={Filter} ariaLabel="Filtrar pedidos por estado" />
          <label>
            <span className="date-label">Desde</span>
            <input type="date" value={desde} onChange={(event) => { setDesde(event.target.value); setPage(1); }} />
          </label>
          <label>
            <span className="date-label">Hasta</span>
            <input type="date" value={hasta} onChange={(event) => { setHasta(event.target.value); setPage(1); }} />
          </label>
          <SelectField value={sortBy} onChange={(value) => { setSortBy(value); setPage(1); }} options={[{ value: "fecha", label: "Fecha" }, { value: "total", label: "Total" }, { value: "estado", label: "Estado" }]} icon={Filter} ariaLabel="Ordenar pedidos por" />
          <button className="button secondary" onClick={() => { toggleDirection(); setPage(1); }} aria-label="Cambiar orden">
            <ArrowDownUp size={16} />
            {direction === "DESC" ? "Más recientes" : "Más antiguos"}
          </button>
          <button className="button secondary" onClick={() => void download("/repuestos/export.xlsx", "repuestos.xlsx", repuestoParams()).catch((reason) => notify(errorMessage(reason), "error"))}><Download size={17} />Exportar Excel</button>
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
        key={createPrefill ? `create-${createPrefill.motoId}` : createOpen ? "create" : editing ? `edit-${editing.id}` : "closed"}
        open={createOpen || Boolean(editing) || Boolean(createPrefill)}
        initial={editing}
        prefill={createPrefill}
        clients={clients}
        notify={notify}
         onLoadVehicles={async (clienteId) => { const r = await api<PageResponse<MotovehiculoResponse>>("/motovehiculos", {}, { clienteId, size: 100, activo: true }); return r.content.filter((moto) => moto.ingresada && moto.seccion === "Taller"); }}
        onClose={() => { setCreateOpen(false); setEditing(null); onPrefillHandled?.(); }}
        onSaved={(repuesto) => { setCreateOpen(false); setEditing(null); onPrefillHandled?.(); refresh(); onOpen(repuesto); }}
          onError={(message) => notify(message, "error")}
      />
      <ConfirmModal
        open={Boolean(deleting)}
        title="Eliminar pedido de repuesto"
        body={`Vas a eliminar el pedido ${deleting?.numero ?? ""}. El historial conservará el registro para auditoría.`}
        confirmLabel="Eliminar pedido"
        onClose={() => setDeleting(null)}
        onConfirm={async () => { const sel = deleting; if (!sel) return; setDeleting(null); try { await api(`/repuestos/${sel.id}`, { method: "DELETE" }); refresh(); notify(`Pedido ${sel.numero} eliminado correctamente.`); } catch (reason) { notify(errorMessage(reason), "error"); } }}
      />
    </div>
  );
}

function CreateRepuestoDialog({
  open,
  initial,
  prefill,
  clients,
  onLoadVehicles,
  onClose,
  onSaved,
  onError,
  notify,
}: {
  open: boolean;
  initial: RepuestoResponse | null;
  prefill?: { motoId: string; clienteId?: string | null } | null;
  clients: ClienteResponse[];
  onLoadVehicles: (clienteId: string) => Promise<MotovehiculoResponse[]>;
  onClose: () => void;
  onSaved: (repuesto: RepuestoResponse) => void;
  onError: (message: string) => void;
  notify: Notify;
}) {
  const [clientId, setClientId] = useState(initial?.clienteId ?? prefill?.clienteId ?? "");
  const [motoId, setMotoId] = useState(initial?.motoId ?? prefill?.motoId ?? "");
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
      const selectedMotoId = initial?.motoId ?? prefill?.motoId;
      if (selectedMotoId && !loaded.some((moto) => moto.id === selectedMotoId)) {
        void api<MotovehiculoResponse>(`/motovehiculos/${selectedMotoId}`).then((moto) => setMotoOptions((all) => all.some((vehicle) => vehicle.id === moto.id) ? all : [moto, ...all])).catch(() => undefined);
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
  const changeMoto = (value: string) => {
    setMotoId(value);
    if (!value) { setFichas([]); setFichaId(""); }
  };
  useEffect(() => {
    if (!motoId) return;
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
             body: JSON.stringify({ motoVehiculoId: motoId, clienteId: clientId, fichaId: fichaId || null, fecha: todayInAr(), proveedor: proveedor || null, observaciones: null, items: items.map((item) => ({ descripcion: item.descripcion, tipo: item.tipo === "Accesorio" ? "ACCESORIO" : "REPUESTO", cantidad: item.cantidad, precio: parsePrice(item.precio), fichaTrabajoId: item.fichaTrabajoId || null, estado: "Pendiente de pedir" })) }),
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
          <SelectField label="Cliente" value={clientId} onChange={changeClient} required placeholder="Seleccionar" options={clients.map((client) => ({ value: client.id, label: client.nombre }))} />
          <SelectField label="Moto" value={motoId} onChange={changeMoto} required disabled={!clientId} placeholder="Seleccionar" options={motoOptions.map((moto) => ({ value: moto.id, label: `${moto.marca} ${moto.modelo} · ${moto.patente}` }))} />
          <SelectField label="Ficha (opcional)" value={fichaId} onChange={changeFicha} disabled={!motoId} placeholder="Sin ficha" options={fichas.map((ficha) => ({ value: ficha.id, label: `${ficha.numero} · ${ficha.estado} · ${date(ficha.fechaIngreso)}` }))} />
          <label>Proveedor<input value={proveedor} onChange={(event) => setProveedor(event.target.value)} /></label>
        </div>
        <div className="repuesto-items">
          <div className="repuesto-items-head"><span>Descripción</span><span>Tipo</span><span>Trabajo</span><span>Cant.</span><span>Precio</span><span>Total</span><span /></div>
          {rows.map((row) => (
            <div className="repuesto-item" key={row.key}>
              <input placeholder="Ej.: cubierta 110/90" value={row.descripcion} onChange={(event) => setRow(row.key, { descripcion: event.target.value })} />
              <SelectField value={row.tipo} onChange={(value) => setRow(row.key, { tipo: value as typeof row.tipo })} ariaLabel="Tipo" options={[{ value: "Repuesto", label: "Repuesto" }, { value: "Accesorio", label: "Accesorio" }]} />
              <SelectField value={row.fichaTrabajoId ?? ""} onChange={(value) => setRow(row.key, { fichaTrabajoId: value || undefined })} ariaLabel="Trabajo" disabled={!fichaId} placeholder="Sin trabajo" options={fichaTrabajos.map((trabajo) => ({ value: trabajo.id, label: trabajo.descripcion }))} />
              <input type="text" inputMode="numeric" min="1" value={integerInput(row.cantidad)} onChange={(event) => setRow(row.key, { cantidad: event.target.value })} onBlur={() => setRow(row.key, { cantidad: String(parseIntegerInput(row.cantidad)) })} aria-label="Cantidad" />
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
  notify: Notify;
}) {
  const [repuesto, setRepuesto] = useState<RepuestoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPaidItemIds, setSelectedPaidItemIds] = useState<string[]>([]);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    successMessage: string;
    action: () => Promise<unknown>;
  } | null>(null);
  const load = () => void api<RepuestoResponse>(`/repuestos/${repuestoId}`).then(setRepuesto).catch((reason) => { setError(errorMessage(reason)); notify(errorMessage(reason), "error"); });
  useEffect(load, [repuestoId, notify]);
  if (error) return <div className="page"><button className="back" onClick={onBack}>← Volver</button><EmptyState title="No se pudo cargar el pedido" body="Revisá la notificación y volvé a intentar." action={<button className="button secondary" onClick={load}>Reintentar</button>} /></div>;
  if (!repuesto) return <div className="page">Cargando…</div>;
  const locked = repuesto.estado === "Cancelado" || repuesto.estado === "Completado";
  const nextItemStates = (state: RepuestoItemState) => state === "Pendiente de pedir" ? ["Pedido", "Cancelado"] : state === "Pedido" ? ["Recibido", "Cancelado"] : state === "Recibido" ? ["Entregado", "Cancelado"] : [];
  const setItemState = async (itemId: string, estado: RepuestoItemState) => { if (pending) return; setPending(true); try { const next = await api<RepuestoResponse>(`/repuestos/${repuesto.id}/items/${itemId}/estado`, { method: "PATCH", body: JSON.stringify({ estado }) }); setRepuesto(next); notify(`Ítem marcado como ${estado}.`); } catch (reason) { notify(errorMessage(reason), "error"); } finally { setPending(false); } };
  const patch = async (path: string, body: Record<string, string>) => { if (pending) return; setPending(true); try { const next = await api<RepuestoResponse>(path, { method: "PATCH", body: JSON.stringify(body) }); setRepuesto(next); return next; } catch (reason) { notify(errorMessage(reason), "error"); throw reason; } finally { setPending(false); } };
  const openPartialPayment = () => { setSelectedPaidItemIds(repuesto.items.filter((item) => item.estado !== "Cancelado" && item.pagado).map((item) => item.id)); setPaymentOpen(true); };
  const savePartialPayment = async () => {
    if (paymentSaving) return;
    setPaymentSaving(true);
    try {
      const eligibleCount = repuesto.items.filter((item) => item.estado !== "Cancelado").length;
      const estadoPago = !selectedPaidItemIds.length ? "No pagado" : selectedPaidItemIds.length === eligibleCount ? "Pagado" : "Parcial";
      const next = await api<RepuestoResponse>(`/repuestos/${repuesto.id}/pago`, { method: "PATCH", body: JSON.stringify({ estadoPago, itemIds: selectedPaidItemIds }) });
      setRepuesto(next); setPaymentOpen(false);
    } catch (reason) { notify(errorMessage(reason), "error"); throw reason; }
    finally { setPaymentSaving(false); }
  };
  const confirmPartialPayment = () => {
    const eligibleCount = repuesto?.items.filter((item) => item.estado !== "Cancelado").length ?? 0;
    const nextStatus = !selectedPaidItemIds.length ? "No pagado" : selectedPaidItemIds.length === eligibleCount ? "Pagado" : "Parcial";
    setPaymentOpen(false);
    setConfirmation({
      title: "Guardar pago parcial",
      body: `El pedido quedará con el estado de pago ${nextStatus}. El cambio se registrará en auditoría.`,
      confirmLabel: "Guardar pago",
      successMessage: `Pago actualizado a ${nextStatus}.`,
      action: savePartialPayment,
    });
  };
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
                    <SelectField value="" disabled={pending} onChange={(value) => value && void setItemState(item.id, value as RepuestoItemState)} ariaLabel={`Cambiar estado de ${item.descripcion}`} placeholder="Cambiar…" options={nextItemStates(item.estado).map((option) => ({ value: option, label: option }))} />
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
                <button key={option} className="button secondary large" disabled={pending} onClick={() => setConfirmation({ title: `Marcar pedido como ${option}`, body: `El pedido ${repuesto.numero} pasará al estado ${option}.`, confirmLabel: `Marcar como ${option}`, successMessage: `Pedido marcado como ${option}.`, action: async () => { const next = await patch(`/repuestos/${repuesto.id}/estado`, { estado: option }); if (!next) throw new Error("No se pudo actualizar el estado del pedido."); } })}>Marcar {option}</button>
              ))}
            </div>
          </div>
          <div className="summary-group">
            <h4>Pago</h4>
            <div className="summary-actions">
              {repuesto.estadoPago === "Pagado" ? <button className="button secondary large" disabled={pending} onClick={() => setConfirmation({ title: "Revertir pago", body: `El pedido ${repuesto.numero} volverá a No pagado.`, confirmLabel: "Marcar como no pagado", successMessage: "Pago marcado como no pagado.", action: async () => { const next = await patch(`/repuestos/${repuesto.id}/pago`, { estadoPago: "No pagado" }); if (!next) throw new Error("No se pudo actualizar el pago."); } })}>Pago: No pagado</button> : <><button className="button primary large" disabled={pending} onClick={() => setConfirmation({ title: "Confirmar pago", body: `El pedido ${repuesto.numero} se marcará como Pagado.`, confirmLabel: "Marcar como pagado", successMessage: "Pago marcado como pagado.", action: async () => { const next = await patch(`/repuestos/${repuesto.id}/pago`, { estadoPago: "Pagado" }); if (!next) throw new Error("No se pudo actualizar el pago."); } })}>Pago: Pagado</button><button className="button secondary large" disabled={pending} onClick={openPartialPayment}>Pago: {repuesto.estadoPago === "Parcial" ? "Editar parcial" : "Parcial"}</button></>}
            </div>
          </div>
        </aside>
      </section>
      <Dialog open={paymentOpen} title="Registrar pago parcial" onClose={() => setPaymentOpen(false)}>
        <p>Seleccioná los ítems no cancelados que fueron pagados.</p>
        <div className="line-items-list">{repuesto.items.filter((item) => item.estado !== "Cancelado").map((item) => <label key={item.id} className="line-check"><input type="checkbox" checked={selectedPaidItemIds.includes(item.id)} onChange={(event) => {
           if (!event.target.checked && item.pagado) {
             setConfirmation({ title: "Desmarcar ítem pagado", body: `"${item.descripcion}" ya fue marcado y persistido como pagado. ¿Estás seguro de que querés desmarcarlo?`, confirmLabel: "Desmarcar como pagado", successMessage: "Ítem desmarcado del pago.", action: async () => { setSelectedPaidItemIds((ids) => ids.filter((id) => id !== item.id)); } });
             return;
           }
           setSelectedPaidItemIds((ids) => event.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id));
         }} />{item.descripcion}<strong>{money(item.subtotal)}</strong></label>)}</div>
        <div className="modal-actions"><button type="button" className="button secondary" onClick={() => {
           const persistedIds = repuesto.items.filter((item) => item.estado !== "Cancelado" && item.pagado && selectedPaidItemIds.includes(item.id)).map((item) => item.id);
           if (!persistedIds.length) { setSelectedPaidItemIds([]); return; }
           setConfirmation({ title: "Desmarcar ítems pagados", body: "Hay ítems que ya fueron marcados y persistidos como pagados. ¿Estás seguro de que querés desmarcarlos todos?", confirmLabel: "Desmarcar pagos", successMessage: "Ítems desmarcados del pago.", action: async () => { setSelectedPaidItemIds([]); } });
         }}>No pagar ninguno</button><button type="button" className="button secondary" onClick={() => setPaymentOpen(false)}>Cancelar</button><button type="button" className="button primary" disabled={paymentSaving} onClick={confirmPartialPayment}>{paymentSaving ? "Guardando..." : "Guardar pago"}</button></div>
      </Dialog>
      <ConfirmModal open={confirmation !== null} title={confirmation?.title ?? ""} body={confirmation?.body ?? ""} confirmLabel={confirmation?.confirmLabel ?? "Confirmar"} onClose={() => setConfirmation(null)} onConfirm={() => { const request = confirmation; setConfirmation(null); if (!request) return; return request.action().then(() => notify(request.successMessage)).catch((reason) => { notify(errorMessage(reason), "error"); throw reason; }); }} />
    </div>
  );
}

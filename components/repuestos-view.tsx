"use client";

import { useEffect, useState } from "react";
import { Download, Plus } from "lucide-react";
import { api, download } from "../lib/api";
import { money, parsePrice, priceInput } from "../lib/format";
import type {
  ClienteResponse,
  MotovehiculoResponse,
  PageResponse,

  RepuestoItemState,
  RepuestoPagoState,
  RepuestoResponse,
  RepuestoState,
} from "../lib/types";
import { Dialog, EmptyState, Pagination, SearchBox, StatusBadge } from "./ui";

const date = (value: string) => new Intl.DateTimeFormat("es-AR").format(new Date(value));
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible cargar la información.";

const repuestoStates: RepuestoState[] = ["En curso", "Completado", "Cancelado"];
const pagoStates: RepuestoPagoState[] = ["No pagado", "Pago parcial", "Pagado"];
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
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResponse<RepuestoResponse> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [clients, setClients] = useState<ClienteResponse[]>([]);
  useEffect(() => { void api<PageResponse<RepuestoResponse>>("/repuestos", {}, { estado: estado === "Todos" ? undefined : estado, q: query || undefined, page: page - 1, size: 20 }).then(setResult).catch((err) => setError(errorMessage(err))); }, [query, estado, page]);
  return (
    <div className="page">
      <div className="page-heading">
        <div><h1>Pedidos de repuestos</h1><p>Control de compras, recepción y pago de repuestos y accesorios.</p></div>
        <button className="button primary" onClick={() => { setCreateOpen(true); void api<PageResponse<ClienteResponse>>("/clientes", {}, { size: 100, activo: true }).then((r) => setClients(r.content)).catch(() => undefined); }}><Plus size={19} />Nuevo pedido</button>
      </div>
      {error && <p className="login-pending">{error}</p>}
      <section className="panel table-panel">
        <div className="filter-bar">
          <SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Número, cliente o patente" />
          <label><Download size={16} /><select value={estado} onChange={(event) => { setEstado(event.target.value as typeof estado); setPage(1); }}><option>Todos</option>{repuestoStates.map((option) => <option key={option}>{option}</option>)}</select></label>
          <button className="button secondary" onClick={() => void download("/repuestos/export.xlsx", "/repuestos.xlsx", { estado: estado === "Todos" ? undefined : estado, q: query || undefined }).catch((reason) => setError(errorMessage(reason)))}><Download size={17} />Exportar Excel</button>
        </div>
        {result?.content.length ? (
          <table>
            <thead><tr><th>Pedido</th><th>Moto</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th>Pago</th><th>Total</th><th /></tr></thead>
            <tbody>{result.content.map((repuesto) => <tr key={repuesto.id}><td>{repuesto.numero}</td><td>{repuesto.patente}</td><td>{repuesto.cliente}</td><td>{date(repuesto.fecha)}</td><td><StatusBadge status={repuesto.estado} /></td><td><StatusBadge status={repuesto.estadoPago} /></td><td>{money(repuesto.total)}</td><td><button className="row-action" onClick={() => onOpen(repuesto)}>Ver</button></td></tr>)}</tbody>
          </table>
        ) : <EmptyState title="No hay pedidos de repuestos" body="Creá uno nuevo o ajustá los filtros." />}
        <Pagination page={page} total={result?.totalPages || 1} onPage={setPage} />
      </section>
      <CreateRepuestoDialog
        key={String(createOpen)}
        open={createOpen}
        clients={clients}
        notify={notify}
        onLoadVehicles={async (clienteId) => { const r = await api<PageResponse<MotovehiculoResponse>>("/motovehiculos", {}, { clienteId, size: 100, activo: true }); return r.content; }}
        onClose={() => setCreateOpen(false)}
        onCreated={(repuesto) => { setCreateOpen(false); onOpen(repuesto); }}
        onError={setError}
      />
    </div>
  );
}

function CreateRepuestoDialog({
  open,
  clients,
  onLoadVehicles,
  onClose,
  onCreated,
  onError,
  notify,
}: {
  open: boolean;
  clients: ClienteResponse[];
  onLoadVehicles: (clienteId: string) => Promise<MotovehiculoResponse[]>;
  onClose: () => void;
  onCreated: (repuesto: RepuestoResponse) => void;
  onError: (message: string) => void;
  notify: (message: string) => void;
}) {
  const [clientId, setClientId] = useState("");
  const [motoId, setMotoId] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [motoOptions, setMotoOptions] = useState<MotovehiculoResponse[]>([]);
  const [rows, setRows] = useState<{ key: string; descripcion: string; tipo: string; cantidad: string; precio: string }[]>([{ key: crypto.randomUUID(), descripcion: "", tipo: "Repuesto", cantidad: "1", precio: "" }]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!clientId) return;
    void onLoadVehicles(clientId).then(setMotoOptions).catch((reason) => onError(errorMessage(reason)));
  }, [clientId]);
  const changeClient = (value: string) => {
    setClientId(value);
    setMotoId("");
    setMotoOptions([]);
  };
  const save = async () => {
    const items = rows.filter((row) => row.descripcion.trim() && Number(row.cantidad) > 0);
    if (!clientId || !motoId || !items.length) return onError("Seleccioná cliente, moto y al menos un ítem.");
    setSaving(true);
    try {
      const repuesto = await api<RepuestoResponse>("/repuestos", {
        method: "POST",
        body: JSON.stringify({ motoVehiculoId: motoId, clienteId: clientId, fecha: new Date().toISOString().slice(0, 10), proveedor: proveedor || null, observaciones: null, items: items.map((item) => { const rest = { descripcion: item.descripcion, tipo: item.tipo, cantidad: item.cantidad, precio: item.precio }; return { ...rest, precio: parsePrice(item.precio), estado: "Pendiente de pedir" }; }) }),
      });
      notify(`Pedido ${repuesto.numero} creado.`);
      onCreated(repuesto);
    } catch (reason) { onError(errorMessage(reason)); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} title="Nuevo pedido de repuesto" onClose={onClose} wide>
      <form className="record-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <label>Cliente<select value={clientId} onChange={(event) => changeClient(event.target.value)} required><option value="">Seleccionar</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nombre}</option>)}</select></label>
        <label>Moto<select value={motoId} onChange={(event) => setMotoId(event.target.value)} required disabled={!clientId}><option value="">Seleccionar</option>{motoOptions.map((moto) => <option key={moto.id} value={moto.id}>{moto.marca} {moto.modelo} · {moto.patente}</option>)}</select></label>
        <label>Proveedor<input value={proveedor} onChange={(event) => setProveedor(event.target.value)} /></label>
        <div className="nested-items">
          {rows.map((row) => (
            <div className="nested-row" key={row.key}>
              <input placeholder="Descripción" value={row.descripcion} onChange={(event) => setRows((all) => all.map((r) => r.key === row.key ? { ...r, descripcion: event.target.value } : r))} />
              <select value={row.tipo} onChange={(event) => setRows((all) => all.map((r) => r.key === row.key ? { ...r, tipo: event.target.value } : r))} aria-label="Tipo"><option>Repuesto</option><option>Accesorio</option></select>
              <input type="number" min="1" value={row.cantidad} onChange={(event) => setRows((all) => all.map((r) => r.key === row.key ? { ...r, cantidad: String(event.target.value) } : r))} aria-label="Cantidad" />
              <input inputMode="decimal" value={priceInput(row.precio)} onChange={(event) => setRows((all) => all.map((r) => r.key === row.key ? { ...r, precio: event.target.value } : r))} placeholder="Precio" aria-label="Precio" />
              <button type="button" aria-label="Quitar ítem" onClick={() => setRows((all) => all.filter((r) => r.key !== row.key))}>×</button>
            </div>
          ))}
        </div>
        <button type="button" className="text-button" onClick={() => setRows((all) => [...all, { key: crypto.randomUUID(), descripcion: "", tipo: "Repuesto", cantidad: "1", precio: "" }])}><Plus size={17} />Agregar ítem</button>
        <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando..." : "Guardar pedido"}</button></div>
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
  const load = () => void api<RepuestoResponse>(`/repuestos/${repuestoId}`).then(setRepuesto).catch((reason) => setError(errorMessage(reason)));
  useEffect(load, [repuestoId]);
  if (error) return <div className="page"><button className="back" onClick={onBack}>← Volver</button><p className="login-pending">{error}</p></div>;
  if (!repuesto) return <div className="page">Cargando…</div>;
  const locked = repuesto.estado === "Cancelado";
  const setItemState = async (itemId: string, estado: RepuestoItemState) => { try { const next = await api<RepuestoResponse>(`/repuestos/${repuesto.id}/items/${itemId}/estado`, { method: "PATCH", body: JSON.stringify({ estado }) }); setRepuesto(next); } catch (reason) { setError(errorMessage(reason)); } };
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
                  <td>{item.descripcion}</td><td>{item.tipo}</td><td>{Number(item.cantidad)}</td><td>{money(item.precio)}</td><td>{money(item.subtotal)}</td>
                  <td><StatusBadge status={item.estado} /></td>
                  {!locked && <td>
                    <select value="" onChange={(event) => event.target.value && void setItemState(item.id, event.target.value as RepuestoItemState)}>
                      <option value="">Cambiar…</option>
                      {itemStates.filter((option) => option !== item.estado).map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </td>}
                </tr>
              ))}</tbody>
            </table>
          </section>
        </div>
        <aside className="summary">
          <h3>{repuesto.proveedor ? `Proveedor: ${repuesto.proveedor}` : "Resumen del pedido"}</h3>
          <div className="total"><span>Total</span><strong>{money(repuesto.total)}</strong></div>
          <div className="summary-actions">
            {repuestoStates.filter((option) => option !== repuesto.estado && !(option === "Cancelado" && repuesto.estado === "Completado") && !(option === "Completado" && repuesto.estado === "Cancelado")).map((option) => (
              <button key={option} className="button secondary large" onClick={() => void api<RepuestoResponse>(`/repuestos/${repuesto.id}/estado`, { method: "PATCH", body: JSON.stringify({ estado: option }) }).then((next) => { setRepuesto(next); notify(`Pedido: ${option}`); }).catch((reason) => setError(errorMessage(reason)))}>Marcar {option}</button>
            ))}
            {pagoStates.filter((option) => option !== repuesto.estadoPago).map((option) => (
              <button key={option} className="button primary large" onClick={() => void api<RepuestoResponse>(`/repuestos/${repuesto.id}/pago`, { method: "PATCH", body: JSON.stringify({ estadoPago: option }) }).then((next) => { setRepuesto(next); notify(`Pago: ${option}`); }).catch((reason) => setError(errorMessage(reason)))}>Pago: {option}</button>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
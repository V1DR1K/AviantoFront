"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownUp, ArrowRightLeft, Download, Edit3, Eye, Filter, Plus, Trash2, X } from "lucide-react";
import { api, download } from "../lib/api";
import { todayInAr } from "../lib/dates";
import type { AutocompleteResponse, ClienteResponse, MotovehiculoResponse, PageResponse, TransferRequest, TransferResponse, TransferUpdateRequest } from "../lib/types";
import { AbmFormModal } from "./modal/abm-form-modal";
import { AutocompleteField, ConfirmModal, Dialog, EmptyState, FilterBar, Pagination, SearchBox, type Notify } from "./ui";

const date = (value?: string | null) => {
  if (!value) return "—";
  const source = value.includes("T") ? value : `${value}T12:00:00`;
  return new Intl.DateTimeFormat("es-AR").format(new Date(source));
};
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible completar la operación.";
const clientFields = [
  { key: "nombre", label: "Nombre y apellido / razón social", required: true, wide: true },
  { key: "telefono", label: "Teléfono", type: "tel" as const, required: true },
  { key: "documento", label: "DNI o CUIT" },
  { key: "email", label: "Email", type: "email" as const },
  { key: "direccion", label: "Dirección", wide: true },
  { key: "observaciones", label: "Observaciones", type: "textarea" as const, wide: true },
];

function TransferDialog({ open, initialMotoId, onClose, onSaved, notify }: { open: boolean; initialMotoId?: string; onClose: () => void; onSaved: () => void; notify: Notify }) {
  const [motoQuery, setMotoQuery] = useState("");
  const [selectedMoto, setSelectedMoto] = useState<MotovehiculoResponse | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<AutocompleteResponse | null>(null);
  const [fechaTransferencia, setFechaTransferencia] = useState(todayInAr());
  const [observaciones, setObservaciones] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !initialMotoId || selectedMoto) return;
    void api<MotovehiculoResponse>(`/motovehiculos/${initialMotoId}`)
      .then((moto) => { setSelectedMoto(moto); setMotoQuery(moto.patente); })
       .catch((reason) => notify(errorMessage(reason), "error"));
  }, [initialMotoId, open, selectedMoto, notify]);

  const reset = () => {
    setMotoQuery("");
    setSelectedMoto(null);
    setClientQuery("");
    setSelectedClient(null);
    setFechaTransferencia(todayInAr());
    setObservaciones("");
    setBusy(false);
  };
  const close = () => { if (!busy) { reset(); onClose(); } };
  const chooseMoto = async (item: AutocompleteResponse) => {
    setBusy(true);
    try {
      const moto = await api<MotovehiculoResponse>(`/motovehiculos/${item.id}`);
      setSelectedMoto(moto);
      setMotoQuery(moto.patente);
    } catch (reason) { notify(errorMessage(reason), "error"); } finally { setBusy(false); }
  };
  const chooseClient = (item: AutocompleteResponse) => {
    setSelectedClient(item);
    setClientQuery(item.label);
  };
  const createClient = async (values: Record<string, string>) => {
    try {
      const client = await api<ClienteResponse>("/clientes", { method: "POST", body: JSON.stringify(values) });
      chooseClient({ id: client.id, label: client.nombre, secondary: client.documento ?? client.telefono });
      setNewClientOpen(false);
      notify("Cliente creado.");
    } catch (reason) {
      const message = errorMessage(reason);
      notify(message, "error");
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedMoto) return notify("Seleccioná la moto que querés transferir.", "error");
    if (selectedMoto.seccion !== "Venta" || !selectedMoto.ingresada || selectedMoto.estado !== "En venta") return notify("La moto debe estar ingresada en Ventas y marcada En venta.", "error");
    if (!selectedMoto.propietarioId || !selectedMoto.propietario) return notify("La moto no tiene un propietario actual.", "error");
    if (!selectedClient) return notify("Seleccioná el nuevo cliente.", "error");
    if (selectedClient.id === selectedMoto.propietarioId) return notify("El nuevo cliente debe ser diferente al actual.", "error");
    setBusy(true);
    const payload: TransferRequest = { motoId: selectedMoto.id, clienteNuevoId: selectedClient.id, fechaTransferencia, observaciones: observaciones || undefined };
    try {
      await api<TransferResponse>("/transferencias", { method: "POST", body: JSON.stringify(payload) });
      reset();
      onClose();
        notify("Transferencia en proceso. Completá la venta desde el perfil de la moto.");
      onSaved();
    } catch (reason) { notify(errorMessage(reason), "error"); } finally { setBusy(false); }
  };

   const loadMotos = (query: string) => api<AutocompleteResponse[]>("/motovehiculos/autocomplete", {}, { q: query });
   const loadClients = (query: string) => api<AutocompleteResponse[]>("/clientes/autocomplete", {}, { q: query });
    return <Dialog open={open} title="Nueva transferencia" onClose={close} wide className="transfer-modal" dirty={Boolean(selectedClient || observaciones)}>
    <form className="transfer-form" onSubmit={(event) => void submit(event)}>
      <section className="transfer-step">
        <div className="transfer-step-number">1</div>
        <div className="transfer-step-content">
          <h3>Elegí la moto</h3>
          <p>Buscá por patente, marca o modelo.</p>
           <AutocompleteField value={motoQuery} onChange={(value) => { setMotoQuery(value); setSelectedMoto(null); }} onSelect={(item) => void chooseMoto(item)} onClear={() => setSelectedMoto(null)} selected={selectedMoto ? { id: selectedMoto.id, label: selectedMoto.patente, secondary: `${selectedMoto.marca} ${selectedMoto.modelo}` } : null} loadOptions={loadMotos} placeholder="Ej.: AA 123 AA" disabled={busy} />
          {selectedMoto && <div className="transfer-vehicle">
            <div><strong>{selectedMoto.patente}</strong><span>{selectedMoto.marca} {selectedMoto.modelo}</span></div>
            <div><small>Cliente actual</small><strong>{selectedMoto.propietario ?? "Sin propietario"}</strong></div>
             <button type="button" className="icon-button" aria-label="Cambiar moto" onClick={() => { setSelectedMoto(null); setMotoQuery(""); setSelectedClient(null); setClientQuery(""); }}><X size={17} /></button>
          </div>}
        </div>
      </section>
      <section className="transfer-step">
        <div className="transfer-step-number">2</div>
        <div className="transfer-step-content">
          <div className="transfer-client-head"><div><h3>Asigná el nuevo cliente</h3><p>El historial de fichas anteriores no se modifica.</p></div><button type="button" className="button secondary transfer-add-client" disabled={busy} onClick={() => setNewClientOpen(true)}>+ Agregar Cliente</button></div>
           <AutocompleteField value={clientQuery} onChange={(value) => { setClientQuery(value); setSelectedClient(null); }} onSelect={chooseClient} onClear={() => setSelectedClient(null)} selected={selectedClient} loadOptions={loadClients} placeholder="Buscar por nombre o documento" disabled={!selectedMoto || busy} />
          {selectedClient && <div className="transfer-selection"><span>Nuevo cliente</span><strong>{selectedClient.label}</strong><button type="button" className="icon-button" aria-label="Cambiar cliente" onClick={() => { setSelectedClient(null); setClientQuery(""); }}><X size={17} /></button></div>}
        </div>
      </section>
      <section className="transfer-step">
        <div className="transfer-step-number">3</div>
        <div className="transfer-step-content">
          <h3>Definí la vigencia</h3>
          <p>Usá la fecha real del cambio de titularidad.</p>
          <div className="two-col transfer-fields">
            <label>Fecha de transferencia<input type="date" value={fechaTransferencia} max={todayInAr()} onChange={(event) => setFechaTransferencia(event.target.value)} required /></label>
            <label>Observaciones <span className="field-optional">Opcional</span><textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} placeholder="Ej.: venta del vehículo" /></label>
          </div>
        </div>
      </section>
      <section className="transfer-summary" aria-live="polite">
        <div><span>Resumen</span><strong>{selectedMoto?.patente ?? "Sin moto seleccionada"}</strong></div>
        <div className="transfer-summary-flow"><strong>{selectedMoto?.propietario ?? "Cliente actual"}</strong><ArrowRightLeft size={18} aria-hidden="true" /><strong>{selectedClient?.label ?? "Nuevo cliente"}</strong></div>
        <small>La transferencia quedará registrada en el historial de la moto.</small>
      </section>
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={close} disabled={busy}>Cancelar</button>
        <button type="submit" className="button primary" disabled={busy || !selectedMoto || !selectedClient}><ArrowRightLeft size={17} />{busy ? "Registrando..." : "Confirmar transferencia"}</button>
      </div>
    </form>
    <AbmFormModal key={newClientOpen ? "transfer-client-open" : "transfer-client-closed"} open={newClientOpen} resource="cliente" mode="agregar" fields={clientFields} onClose={() => setNewClientOpen(false)} onSubmit={createClient} onError={(message) => notify(message, "error")} />
  </Dialog>;
}

function TransferEditDialog({ transfer, onClose, onSaved, notify }: { transfer: TransferResponse | null; onClose: () => void; onSaved: () => void; notify: Notify }) {
  const [clientQuery, setClientQuery] = useState(transfer?.clienteNuevo ?? "");
  const [selectedClient, setSelectedClient] = useState<AutocompleteResponse | null>(transfer ? { id: transfer.clienteNuevoId, label: transfer.clienteNuevo, secondary: "" } : null);
  const [fechaTransferencia, setFechaTransferencia] = useState(transfer?.fechaTransferencia ?? todayInAr());
  const [observaciones, setObservaciones] = useState(transfer?.observaciones ?? "");
  const [busy, setBusy] = useState(false);
  if (!transfer) return null;
  const close = () => { if (!busy) onClose(); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedClient) { notify("Seleccioná el nuevo cliente.", "error"); return; }
    setBusy(true);
    const payload: TransferUpdateRequest = { clienteNuevoId: selectedClient.id, fechaTransferencia, observaciones: observaciones || undefined };
    try {
      await api<TransferResponse>(`/transferencias/${transfer.id}`, { method: "PUT", body: JSON.stringify(payload) });
      onClose();
      onSaved();
      notify("Transferencia actualizada.");
    } catch (reason) {
      notify(errorMessage(reason), "error");
    } finally {
      setBusy(false);
    }
  };
  const loadClients = (query: string) => api<AutocompleteResponse[]>("/clientes/autocomplete", {}, { q: query });
  return <Dialog open title="Editar transferencia" onClose={close} wide className="transfer-modal" dirty={Boolean(selectedClient || observaciones)}>
    <form className="transfer-form" onSubmit={(event) => void submit(event)}>
      <section className="transfer-step"><div className="transfer-step-number">1</div><div className="transfer-step-content"><h3>{transfer.patente}</h3><p>{transfer.moto} · Cliente anterior: {transfer.clienteAnterior}</p></div></section>
       <section className="transfer-step"><div className="transfer-step-number">2</div><div className="transfer-step-content"><h3>Asigná el nuevo cliente</h3><AutocompleteField value={clientQuery} onChange={(value) => { setClientQuery(value); setSelectedClient(null); }} onSelect={(item) => { setSelectedClient(item); setClientQuery(item.label); }} onClear={() => setSelectedClient(null)} selected={selectedClient} loadOptions={loadClients} placeholder="Buscar por nombre o documento" disabled={busy} />{selectedClient && <div className="transfer-selection"><span>Nuevo cliente</span><strong>{selectedClient.label}</strong><button type="button" className="icon-button" aria-label="Cambiar cliente" onClick={() => { setSelectedClient(null); setClientQuery(""); }}><X size={17} /></button></div>}</div></section>
      <section className="transfer-step"><div className="transfer-step-number">3</div><div className="transfer-step-content"><h3>Definí la vigencia</h3><div className="two-col transfer-fields"><label>Fecha de transferencia<input type="date" value={fechaTransferencia} max={todayInAr()} onChange={(event) => setFechaTransferencia(event.target.value)} required /></label><label>Observaciones <span className="field-optional">Opcional</span><textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} /></label></div></div></section>
      <div className="modal-actions"><button type="button" className="button secondary" onClick={close} disabled={busy}>Cancelar</button><button type="submit" className="button primary" disabled={busy || !selectedClient}>{busy ? "Guardando..." : "Guardar cambios"}</button></div>
    </form>
  </Dialog>;
}

export function TransferenciasView({ canTransfer, initialMotoId, onOpenMoto, notify }: { canTransfer: boolean; initialMotoId?: string; onOpenMoto: (id: string) => void; notify: Notify }) {
  const [query, setQuery] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [direction, setDirection] = useState<"ASC" | "DESC">("DESC");
  const [result, setResult] = useState<PageResponse<TransferResponse> | null>(null);
  const [page, setPage] = useState(1);
  const [flowOpen, setFlowOpen] = useState(Boolean(initialMotoId));
  const [editing, setEditing] = useState<TransferResponse | null>(null);
  const [deleting, setDeleting] = useState<TransferResponse | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const params = { q: query || undefined, fechaDesde: desde || undefined, fechaHasta: hasta || undefined, sortBy: "fechaTransferencia", direction };
  useEffect(() => {
    void api<PageResponse<TransferResponse>>("/transferencias", {}, { q: query || undefined, fechaDesde: desde || undefined, fechaHasta: hasta || undefined, sortBy: "fechaTransferencia", direction, page: page - 1, size: 20 })
      .then(setResult)
      .catch((reason) => notify(errorMessage(reason), "error"));
  }, [query, desde, hasta, direction, page, reloadKey, notify]);
  const removeTransfer = async () => {
    if (!deleting) return;
    const selected = deleting;
    setDeleting(null);
    try {
      await api(`/transferencias/${selected.id}`, { method: "DELETE" });
      setReloadKey((value) => value + 1);
      notify("Transferencia eliminada y períodos recalculados.");
    } catch (reason) {
      const message = errorMessage(reason);
      notify(message, "error");
    }
  };
  return <div className="page">
    <div className="page-heading">
      <div><h1>Transferencias</h1><p>Historial de cambios de titularidad de las motos.</p></div>
      {canTransfer && <button className="button primary" onClick={() => setFlowOpen(true)}><Plus size={19} />Nueva transferencia</button>}
    </div>
    <section className="panel table-panel">
       <FilterBar primary={<SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Patente o cliente" />} activeCount={(desde ? 1 : 0) + (hasta ? 1 : 0)}>
         <label><Filter size={16} /><span className="date-label">Desde</span><input type="date" value={desde} onChange={(event) => { setDesde(event.target.value); setPage(1); }} /></label>
         <label><Filter size={16} /><span className="date-label">Hasta</span><input type="date" value={hasta} onChange={(event) => { setHasta(event.target.value); setPage(1); }} /></label>
         <button className="button secondary" onClick={() => { setDirection((value) => value === "DESC" ? "ASC" : "DESC"); setPage(1); }} aria-label="Cambiar orden de transferencias"><ArrowDownUp size={16} />{direction === "DESC" ? "Más recientes" : "Más antiguas"}</button>
           <button className="button secondary" onClick={() => void download("/transferencias/export.xlsx", "transferencias.xlsx", params).catch((reason) => notify(errorMessage(reason), "error"))}><Download size={17} />Exportar Excel</button>
       </FilterBar>
      {result?.content.length ? <table><thead><tr><th>Patente</th><th>Fecha</th><th>Cliente anterior</th><th>Cliente nuevo</th><th>Observaciones</th><th>Acciones</th></tr></thead><tbody>{result.content.map((transfer) => <tr key={transfer.id}><td data-label="Patente"><strong>{transfer.patente}</strong><small>{transfer.moto}</small></td><td data-label="Fecha">{date(transfer.fechaTransferencia)}</td><td data-label="Cliente anterior">{transfer.clienteAnterior}</td><td data-label="Cliente nuevo">{transfer.clienteNuevo}</td><td data-label="Observaciones">{transfer.observaciones || "—"}</td><td className="table-actions"><button onClick={() => onOpenMoto(transfer.motoId)} aria-label={`Ver moto ${transfer.patente}`}><Eye size={17} /></button>{canTransfer && <><button onClick={() => setEditing(transfer)} aria-label={`Editar transferencia de ${transfer.patente}`}><Edit3 size={17} /></button><button className="danger-action" onClick={() => setDeleting(transfer)} aria-label={`Eliminar transferencia de ${transfer.patente}`}><Trash2 size={17} /></button></>}</td></tr>)}</tbody></table> : result ? <EmptyState title="No hay transferencias" body="Probá ajustar los filtros o registrá una nueva transferencia." action={canTransfer ? <button className="button primary" onClick={() => setFlowOpen(true)}><Plus size={17} />Nueva transferencia</button> : undefined} /> : <div className="table-loading" role="status">Cargando transferencias...</div>}
      <Pagination page={page} total={result?.totalPages || 1} onPage={setPage} />
    </section>
     <TransferDialog open={flowOpen} initialMotoId={initialMotoId} onClose={() => setFlowOpen(false)} onSaved={() => { setPage(1); setReloadKey((value) => value + 1); }} notify={notify} />
    <TransferEditDialog key={editing?.id ?? "none"} transfer={editing} onClose={() => setEditing(null)} onSaved={() => { setPage(1); setReloadKey((value) => value + 1); }} notify={notify} />
    <ConfirmModal open={deleting !== null} title="Eliminar transferencia" body={`Se dará de baja la transferencia de ${deleting?.patente ?? "la moto seleccionada"} y se recalculará su historial de propietarios. Los registros no se borrarán de la base de datos.`} confirmLabel="Eliminar transferencia" onClose={() => setDeleting(null)} onConfirm={removeTransfer} />
  </div>;
}

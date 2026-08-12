"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp, Eye, Filter, LogIn, LogOut, Plus, Settings2, Tag } from "lucide-react";
import { api } from "../lib/api";
import { integerInput, money, parseIntegerInput } from "../lib/format";
import { todayInAr } from "../lib/dates";
import type {
  ClienteResponse,
  FichaResponse,
  MotovehiculoResponse,
  NextServiceResponse,
  PageResponse,
  PagoStatus,
  RepuestoResponse,
  RepuestoState,
  ServiceResponse,
  TransferResponse,
} from "../lib/types";
import { ConfirmModal, Dialog, EmptyState, FilterBar, Pagination, SelectField, StatusBadge, type Notify } from "./ui";

const date = (value?: string | null) => (value ? new Intl.DateTimeFormat("es-AR").format(new Date(value.includes("T") ? value : `${value}T12:00:00`)) : "—");
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible cargar la información.";
const fichaStates = ["Cargada", "En proceso", "Revisión", "Entregada", "Cancelada"] as const;
const pagoStates: PagoStatus[] = ["No pagado", "Parcial", "Pagado"];
const repuestoStates: RepuestoState[] = ["En curso", "Completado", "Cancelado"];

export function MotoDetail({
  id,
  initialTab,
  onBack,
  onOpenFicha,
  onOpenRepuesto,
  onNewFicha,
  onNewRepuesto,
  onIntake,
  notify,
}: {
  id: string;
  initialTab?: "general" | "client" | "services" | "fichas" | "repuestos";
  onBack: () => void;
  onOpenFicha: (ficha: FichaResponse) => void;
  onOpenRepuesto: (repuesto: RepuestoResponse) => void;
  onNewFicha: (prefill: { motoId: string; clienteId?: string | null }) => void;
  onNewRepuesto: (prefill: { motoId: string; clienteId?: string | null }) => void;
  onIntake: (plate?: string) => void;
  notify: Notify;
}) {
  const [tab, setTab] = useState<"general" | "client" | "services" | "fichas" | "repuestos">(initialTab ?? "general");
  const [moto, setMoto] = useState<MotovehiculoResponse | null>(null);
  const [client, setClient] = useState<ClienteResponse | null>(null);
  const [transfers, setTransfers] = useState<TransferResponse[]>([]);
  const [services, setServices] = useState<PageResponse<ServiceResponse> | null>(null);
  const [nextService, setNextService] = useState<NextServiceResponse | null>(null);
  const [fichas, setFichas] = useState<PageResponse<FichaResponse> | null>(null);
  const [repuestos, setRepuestos] = useState<PageResponse<RepuestoResponse> | null>(null);
  const [panelErrors, setPanelErrors] = useState<Record<string, string>>({});
  const [serviceDesde, setServiceDesde] = useState("");
  const [serviceHasta, setServiceHasta] = useState("");
  const [serviceSort, setServiceSort] = useState("fecha");
  const [serviceDirection, setServiceDirection] = useState<"ASC" | "DESC">("DESC");
  const [servicePage, setServicePage] = useState(1);
  const [fichaDesde, setFichaDesde] = useState("");
  const [fichaHasta, setFichaHasta] = useState("");
  const [fichaEstado, setFichaEstado] = useState("");
  const [fichaPago, setFichaPago] = useState("");
  const [fichaSort, setFichaSort] = useState("fechaIngreso");
  const [fichaDirection, setFichaDirection] = useState<"ASC" | "DESC">("DESC");
  const [fichaPage, setFichaPage] = useState(1);
  const [repuestoDesde, setRepuestoDesde] = useState("");
  const [repuestoHasta, setRepuestoHasta] = useState("");
  const [repuestoEstado, setRepuestoEstado] = useState("");
  const [repuestoPago, setRepuestoPago] = useState("");
  const [repuestoSort, setRepuestoSort] = useState("fecha");
  const [repuestoDirection, setRepuestoDirection] = useState<"ASC" | "DESC">("DESC");
  const [repuestoPage, setRepuestoPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [serviceKm, setServiceKm] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [serviceSaving, setServiceSaving] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [configKm, setConfigKm] = useState("");
  const [configMonths, setConfigMonths] = useState("");
  const [configNotes, setConfigNotes] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    successMessage: string;
    action: () => Promise<void>;
  } | null>(null);

  const load = () =>
    void api<MotovehiculoResponse>(`/motovehiculos/${id}`)
      .then((next) => { setMoto(next); if (next.propietarioId) void api<ClienteResponse>(`/clientes/${next.propietarioId}`).then(setClient).catch(() => setClient(null)); })
       .catch((reason) => { setError(errorMessage(reason)); notify(errorMessage(reason), "error"); });
  const panelError = (key: string, reason: unknown) => setPanelErrors((current) => ({ ...current, [key]: errorMessage(reason) }));
  const loadServices = () => void api<PageResponse<ServiceResponse>>(`/motovehiculos/${id}/services/historial`, {}, { fechaDesde: serviceDesde || undefined, fechaHasta: serviceHasta || undefined, page: servicePage - 1, size: 10, sortBy: serviceSort, direction: serviceDirection }).then((value) => { setServices(value); setPanelErrors((current) => ({ ...current, services: "" })); }).catch((reason) => panelError("services", reason));
  const loadFichas = () => void api<PageResponse<FichaResponse>>("/fichas", {}, { motoId: id, fechaDesde: fichaDesde || undefined, fechaHasta: fichaHasta || undefined, estado: fichaEstado || undefined, estadoPago: fichaPago || undefined, page: fichaPage - 1, size: 10, sortBy: fichaSort, direction: fichaDirection }).then((value) => { setFichas(value); setPanelErrors((current) => ({ ...current, fichas: "" })); }).catch((reason) => panelError("fichas", reason));
  const loadRepuestos = () => void api<PageResponse<RepuestoResponse>>("/repuestos", {}, { motoId: id, fechaDesde: repuestoDesde || undefined, fechaHasta: repuestoHasta || undefined, estado: repuestoEstado || undefined, estadoPago: repuestoPago || undefined, page: repuestoPage - 1, size: 10, sortBy: repuestoSort, direction: repuestoDirection }).then((value) => { setRepuestos(value); setPanelErrors((current) => ({ ...current, repuestos: "" })); }).catch((reason) => panelError("repuestos", reason));
  const loadNext = () => void api<NextServiceResponse[]>("/services/proximos").then((list) => { setNextService(list.find((next) => next.motoId === id) ?? null); setPanelErrors((current) => ({ ...current, next: "" })); }).catch((reason) => panelError("next", reason));
  useEffect(load, [id, notify]);
  useEffect(() => { loadServices(); }, [id, serviceDesde, serviceHasta, serviceSort, serviceDirection, servicePage, notify]);
  useEffect(() => { loadFichas(); }, [id, fichaDesde, fichaHasta, fichaEstado, fichaPago, fichaSort, fichaDirection, fichaPage, notify]);
  useEffect(() => { loadRepuestos(); }, [id, repuestoDesde, repuestoHasta, repuestoEstado, repuestoPago, repuestoSort, repuestoDirection, repuestoPage, notify]);
  useEffect(() => {
    loadNext();
    void api<TransferResponse[]>(`/motovehiculos/${id}/transferencias`).then(setTransfers).catch(() => undefined);
  }, [id, notify]);

  const addService = async () => {
    if (!serviceKm) return notify("Ingresá el kilometraje del service.", "error");
    if (serviceSaving) return;
    setServiceSaving(true);
    try {
      await api<ServiceResponse>(`/motovehiculos/${id}/services`, {
        method: "POST",
        body: JSON.stringify({ kilometraje: parseIntegerInput(serviceKm), fecha: serviceDate || null, observaciones: serviceNotes || null }),
      });
      loadServices();
      void api<MotovehiculoResponse>(`/motovehiculos/${id}`).then(setMoto);
      loadNext();
      setServiceOpen(false);
      setServiceKm("");
      setServiceDate("");
      setServiceNotes("");
      notify("Service registrado.");
    } catch (reason) { notify(errorMessage(reason), "error"); } finally { setServiceSaving(false); }
  };

  const saveConfig = async () => {
    if (configSaving) return;
    setConfigSaving(true);
    try {
      const next = await api<MotovehiculoResponse>(`/motovehiculos/${id}/config-service`, {
        method: "PATCH",
        body: JSON.stringify({
          kmServicePeriodo: configKm ? parseIntegerInput(configKm) : null,
          mesesServicePeriodo: configMonths ? parseIntegerInput(configMonths) : null,
          serviceObservaciones: configNotes || null,
        }),
      });
      setMoto(next);
      loadNext();
      setConfigOpen(false);
      notify("Configuración de service guardada.");
    } catch (reason) { notify(errorMessage(reason), "error"); } finally { setConfigSaving(false); }
  };

  const openConfig = () => {
    setConfigKm(moto?.kmServicePeriodo != null ? String(moto.kmServicePeriodo) : "");
    setConfigMonths(moto?.mesesServicePeriodo != null ? String(moto.mesesServicePeriodo) : "");
    setConfigNotes(moto?.serviceObservaciones ?? "");
    setConfigOpen(true);
  };
  const runMotoAction = async (path: string, options: RequestInit = {}) => {
    try { const next = await api<MotovehiculoResponse>(path, options); setMoto(next); }
    catch (reason) { notify(errorMessage(reason), "error"); throw reason; }
  };

  if (error) return <div className="page"><button className="back" onClick={onBack}>← Volver</button><EmptyState title="No se pudo cargar la moto" body="Revisá la notificación y volvé a intentar." action={<button className="button secondary" onClick={load}>Reintentar</button>} /></div>;
  if (!moto) return <div className="page"><div className="table-loading" role="status">Cargando moto...</div></div>;

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "general", label: "Datos" },
    { id: "client", label: "Clientes" },
    { id: "services", label: "Service" },
    { id: "fichas", label: "Ficha" },
    { id: "repuestos", label: "Repuestos" },
  ];
  return (
    <div className="page">
      <button className="back" onClick={onBack}>← Volver a perfiles</button>
      <div className="detail-title">
        <div>
          <p>{moto.patente}</p>
          <h1>{moto.marca} {moto.modelo}</h1>
          <span>{moto.propietario ?? "Sin propietario"} · KM {moto.kilometraje ?? "—"}</span>
        </div>
        <div className="detail-stack">
          <StatusBadge status={moto.estado} />
           {moto.estado === "Vendida" ? <span className="detail-note">Venta completada</span> : !moto.ingresada ? <button className="button secondary" onClick={() => onIntake(moto.patente)}><LogIn size={17} />Ingresar moto</button> : moto.seccion === "Venta" && moto.estado === "Ingresada Venta" ? <button className="button secondary" onClick={() => setConfirmation({ title: "Marcar moto en venta", body: `${moto.patente} pasará al estado En venta.`, confirmLabel: "Marcar en venta", successMessage: "Moto marcada como En venta.", action: () => runMotoAction(`/motovehiculos/${moto.id}/venta/estado`, { method: "PATCH", body: JSON.stringify({ estado: "En venta" }) }) })}><Tag size={17} />Marcar en venta</button> : moto.seccion === "Venta" && moto.estado === "Transferencia en curso" ? <button className="button primary" onClick={() => setConfirmation({ title: "Completar venta", body: `La venta de ${moto.patente} quedará completada y el cambio será auditado.`, confirmLabel: "Completar venta", successMessage: "Venta completada.", action: () => runMotoAction(`/motovehiculos/${moto.id}/venta/completar`, { method: "POST" }) })}><LogOut size={17} />Completar venta</button> : <span className="detail-note">La entrega se completa desde la revisión</span>}
          <strong>{moto.anio ?? "—"}</strong>
        </div>
      </div>
      <nav className="tabs">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </nav>
      {tab === "general" && (
        <section className="panel form-stack">
          <div className="panel-head">
            <h2>Datos del vehículo</h2>
          </div>
          <dl className="record-detail">
            <div><dt>Marca / modelo</dt><dd>{moto.marca} {moto.modelo}</dd></div>
            <div><dt>Patente</dt><dd>{moto.patente}</dd></div>
            <div><dt>Año</dt><dd>{moto.anio ?? "—"}</dd></div>
            <div><dt>Kilometraje</dt><dd>{moto.kilometraje ?? "—"}</dd></div>
            <div><dt>Estado</dt><dd>{moto.estado}</dd></div>
            <div><dt>Observaciones</dt><dd>{moto.observaciones || "—"}</dd></div>
          </dl>
        </section>
      )}
      {tab === "client" && (
        <section className="panel form-stack">
          <div className="panel-head"><div><h2>Clientes</h2><p>Propietario actual e historial de transferencias.</p></div></div>
          <dl className="record-detail">
            <div><dt>Nombre y apellido</dt><dd>{moto.propietario ?? "—"}</dd></div>
            <div><dt>Teléfono</dt><dd>{client?.telefono ?? "—"}</dd></div>
          </dl>
          <section className="table-panel"><div className="panel-head"><div><h3>Historial de transferencias</h3><p>Los clientes anteriores permanecen asociados a sus fichas históricas.</p></div></div>{transfers.length ? <table><thead><tr><th>Fecha</th><th>Cliente anterior</th><th>Cliente nuevo</th><th>Observaciones</th></tr></thead><tbody>{transfers.map((transfer) => <tr key={transfer.id}><td data-label="Fecha">{date(transfer.fechaTransferencia)}</td><td data-label="Cliente anterior">{transfer.clienteAnterior}</td><td data-label="Cliente nuevo">{transfer.clienteNuevo}</td><td data-label="Observaciones">{transfer.observaciones || "—"}</td></tr>)}</tbody></table> : <p>Esta moto no tiene transferencias registradas.</p>}</section>
        </section>
      )}
      {tab === "services" && (
        <section className="panel table-panel">
          <div className="panel-head">
            <h2>Services registrados</h2>
            <div className="panel-actions">
              <button className="button secondary" onClick={openConfig}><Settings2 size={17} />Configurar periodos</button>
              <button className="button secondary" disabled={serviceSaving} onClick={() => { setServiceKm(moto.kilometraje != null ? String(moto.kilometraje) : ""); setServiceDate(todayInAr()); setServiceOpen(true); }}><Plus size={17} />Registrar service</button>
            </div>
          </div>
          <div className="metrics service-kpis"><section className="metric"><span>Último service</span><strong>{moto.kmUltimoService != null ? `${moto.kmUltimoService.toLocaleString("es-AR")} km` : "—"}</strong><small>{date(moto.fechaUltimoService)}</small></section><section className="metric"><span>Período</span><strong>{moto.kmServicePeriodo ?? "—"} km</strong><small>{moto.mesesServicePeriodo ?? "—"} meses</small></section><section className="metric"><span>Próximo service</span><strong>{nextService?.proximKm != null ? `${nextService.proximKm.toLocaleString("es-AR")} km` : "—"}</strong><small>{nextService?.proximaFecha ? date(nextService.proximaFecha) : nextService?.sinReferencia ? "Sin referencia" : "—"}</small></section></div>
           <FilterBar activeCount={(serviceDesde ? 1 : 0) + (serviceHasta ? 1 : 0) + (serviceSort !== "fecha" ? 1 : 0)}>
             <label><span className="date-label">Desde</span><input type="date" value={serviceDesde} onChange={(event) => { setServiceDesde(event.target.value); setServicePage(1); }} /></label>
             <label><span className="date-label">Hasta</span><input type="date" value={serviceHasta} onChange={(event) => { setServiceHasta(event.target.value); setServicePage(1); }} /></label>
              <SelectField value={serviceSort} onChange={(value) => { setServiceSort(value); setServicePage(1); }} options={[{ value: "fecha", label: "Fecha" }, { value: "kilometraje", label: "Kilometraje" }]} icon={Filter} ariaLabel="Ordenar services por" />
             <button className="button secondary" onClick={() => { setServiceDirection((value) => value === "ASC" ? "DESC" : "ASC"); setServicePage(1); }} aria-label="Cambiar orden de services"><ArrowDownUp size={16} />{serviceDirection === "DESC" ? "Más recientes" : "Más antiguos"}</button>
           </FilterBar>
           {panelErrors.services ? <EmptyState title="No se pudo cargar el historial" body={panelErrors.services} action={<button className="button secondary" onClick={loadServices}>Reintentar</button>} /> : services?.content.length ? (
            <table>
              <thead><tr><th>Fecha</th><th>Kilometraje</th><th>Ficha</th><th>Observaciones</th></tr></thead>
              <tbody>{services.content.map((service) => <tr key={service.id}><td data-label="Fecha">{date(service.fecha)}</td><td data-label="Kilometraje">{service.kilometraje}</td><td data-label="Ficha">{service.fichaNumero ?? "—"}</td><td data-label="Observaciones">{service.observaciones || "—"}</td></tr>)}</tbody>
            </table>
          ) : <EmptyState title="Sin services" body="Registrá el primer service de la moto." />}
          <Pagination page={servicePage} total={services?.totalPages || 1} onPage={setServicePage} />
        </section>
      )}
      {tab === "fichas" && (
        <section className="panel table-panel">
           <div className="panel-head"><div><h2>Fichas</h2><p>Trabajo actual e historial de ingresos al taller.</p></div><button className="button secondary" disabled={!moto.ingresada || moto.seccion !== "Taller"} onClick={() => onNewFicha({ motoId: moto.id, clienteId: moto.propietarioId })}><Plus size={17} />Nueva ficha</button></div>
           <FilterBar activeCount={(fichaDesde ? 1 : 0) + (fichaHasta ? 1 : 0) + (fichaEstado ? 1 : 0) + (fichaPago ? 1 : 0) + (fichaSort !== "fechaIngreso" ? 1 : 0)}>
             <label><span className="date-label">Desde</span><input type="date" value={fichaDesde} onChange={(event) => { setFichaDesde(event.target.value); setFichaPage(1); }} /></label>
             <label><span className="date-label">Hasta</span><input type="date" value={fichaHasta} onChange={(event) => { setFichaHasta(event.target.value); setFichaPage(1); }} /></label>
              <SelectField value={fichaEstado} onChange={(value) => { setFichaEstado(value); setFichaPage(1); }} options={fichaStates.map((option) => ({ value: option, label: option }))} placeholder="Todos los estados" icon={Filter} ariaLabel="Filtrar fichas por estado" />
              <SelectField value={fichaPago} onChange={(value) => { setFichaPago(value); setFichaPage(1); }} options={pagoStates.map((option) => ({ value: option, label: option }))} placeholder="Todos los pagos" icon={Filter} ariaLabel="Filtrar fichas por pago" />
              <SelectField value={fichaSort} onChange={(value) => { setFichaSort(value); setFichaPage(1); }} options={[{ value: "fechaIngreso", label: "Fecha" }, { value: "estado", label: "Estado" }, { value: "estadoPago", label: "Pago" }]} icon={Filter} ariaLabel="Ordenar fichas por" />
             <button className="button secondary" onClick={() => { setFichaDirection((value) => value === "ASC" ? "DESC" : "ASC"); setFichaPage(1); }} aria-label="Cambiar orden de fichas"><ArrowDownUp size={16} />{fichaDirection === "DESC" ? "Más recientes" : "Más antiguos"}</button>
           </FilterBar>
           {panelErrors.fichas ? <EmptyState title="No se pudieron cargar las fichas" body={panelErrors.fichas} action={<button className="button secondary" onClick={loadFichas}>Reintentar</button>} /> : fichas?.content.length ? (
            <table>
              <thead><tr><th>Ficha</th><th>Ingreso</th><th>Estado</th><th>Pago</th><th>Total</th><th /></tr></thead>
              <tbody>{fichas.content.map((ficha) => <tr key={ficha.id}><td data-label="Ficha">{ficha.numero}</td><td data-label="Ingreso">{date(ficha.fechaIngreso)}</td><td data-label="Estado"><StatusBadge status={ficha.estado} /></td><td data-label="Pago"><StatusBadge status={ficha.estadoPago} /></td><td data-label="Total">{money(ficha.total)}</td><td className="table-actions"><button onClick={() => onOpenFicha(ficha)} aria-label={`Ver ficha ${ficha.numero}`}><Eye size={17} /></button></td></tr>)}</tbody>
            </table>
          ) : <EmptyState title="Sin fichas" body="Esta moto todavía no tiene ingresos de trabajo." />}
          <Pagination page={fichaPage} total={fichas?.totalPages || 1} onPage={setFichaPage} />
        </section>
      )}
      {tab === "repuestos" && (
        <section className="panel table-panel">
           <div className="panel-head"><h2>Pedidos de repuestos</h2><button className="button secondary" disabled={!moto.ingresada || moto.seccion !== "Taller"} onClick={() => onNewRepuesto({ motoId: moto.id, clienteId: moto.propietarioId })}><Plus size={17} />Nuevo pedido</button></div>
           <FilterBar activeCount={(repuestoDesde ? 1 : 0) + (repuestoHasta ? 1 : 0) + (repuestoEstado ? 1 : 0) + (repuestoPago ? 1 : 0) + (repuestoSort !== "fecha" ? 1 : 0)}>
             <label><span className="date-label">Desde</span><input type="date" value={repuestoDesde} onChange={(event) => { setRepuestoDesde(event.target.value); setRepuestoPage(1); }} /></label>
             <label><span className="date-label">Hasta</span><input type="date" value={repuestoHasta} onChange={(event) => { setRepuestoHasta(event.target.value); setRepuestoPage(1); }} /></label>
              <SelectField value={repuestoEstado} onChange={(value) => { setRepuestoEstado(value); setRepuestoPage(1); }} options={repuestoStates.map((option) => ({ value: option, label: option }))} placeholder="Todos los estados" icon={Filter} ariaLabel="Filtrar pedidos por estado" />
              <SelectField value={repuestoPago} onChange={(value) => { setRepuestoPago(value); setRepuestoPage(1); }} options={pagoStates.map((option) => ({ value: option, label: option }))} placeholder="Todos los pagos" icon={Filter} ariaLabel="Filtrar pedidos por pago" />
              <SelectField value={repuestoSort} onChange={(value) => { setRepuestoSort(value); setRepuestoPage(1); }} options={[{ value: "fecha", label: "Fecha" }, { value: "estado", label: "Estado" }, { value: "estadoPago", label: "Pago" }]} icon={Filter} ariaLabel="Ordenar pedidos por" />
             <button className="button secondary" onClick={() => { setRepuestoDirection((value) => value === "ASC" ? "DESC" : "ASC"); setRepuestoPage(1); }} aria-label="Cambiar orden de pedidos"><ArrowDownUp size={16} />{repuestoDirection === "DESC" ? "Más recientes" : "Más antiguos"}</button>
           </FilterBar>
           {panelErrors.repuestos ? <EmptyState title="No se pudieron cargar los pedidos" body={panelErrors.repuestos} action={<button className="button secondary" onClick={loadRepuestos}>Reintentar</button>} /> : repuestos?.content.length ? (
            <table>
              <thead><tr><th>Pedido</th><th>Fecha</th><th>Estado</th><th>Pago</th><th>Total</th><th /></tr></thead>
              <tbody>{repuestos.content.map((repuesto) => <tr key={repuesto.id}><td data-label="Pedido">{repuesto.numero}</td><td data-label="Fecha">{date(repuesto.fecha)}</td><td data-label="Estado"><StatusBadge status={repuesto.estado} /></td><td data-label="Pago"><StatusBadge status={repuesto.estadoPago} /></td><td data-label="Total">{money(repuesto.total)}</td><td className="table-actions"><button onClick={() => onOpenRepuesto(repuesto)} aria-label={`Ver pedido ${repuesto.numero}`}><Eye size={17} /></button></td></tr>)}</tbody>
            </table>
          ) : <EmptyState title="Sin repuestos" body="Aún no hay pedidos de repuestos para esta moto." />}
          <Pagination page={repuestoPage} total={repuestos?.totalPages || 1} onPage={setRepuestoPage} />
        </section>
      )}
      <Dialog open={serviceOpen} title="Registrar service" onClose={() => setServiceOpen(false)} dirty={Boolean(serviceNotes)}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void addService(); }}>
          <label>Kilometraje<input type="text" inputMode="numeric" value={integerInput(serviceKm)} onChange={(event) => setServiceKm(event.target.value)} required /></label>
          <label>Fecha<input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} /></label>
          <label>Observación<input type="text" value={serviceNotes} onChange={(event) => setServiceNotes(event.target.value)} placeholder="Ej: cambio de aceite y filtros" /></label>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setServiceOpen(false)}>Cancelar</button><button className="button primary" disabled={serviceSaving}>{serviceSaving ? "Guardando..." : "Guardar"}</button></div>
        </form>
      </Dialog>
      <Dialog open={configOpen} title="Configurar service" onClose={() => setConfigOpen(false)} dirty={Boolean(configNotes || configKm !== String(moto.kmServicePeriodo ?? "") || configMonths !== String(moto.mesesServicePeriodo ?? ""))}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void saveConfig(); }}>
          <label>Periodo en km<input type="text" inputMode="numeric" value={integerInput(configKm)} onChange={(event) => setConfigKm(event.target.value)} placeholder="Ej: 5.000" /></label>
          <label>Periodo en meses<input type="text" inputMode="numeric" value={integerInput(configMonths)} onChange={(event) => setConfigMonths(event.target.value)} placeholder="Ej: 6" /></label>
          <label>Observaciones<input type="text" value={configNotes} onChange={(event) => setConfigNotes(event.target.value)} /></label>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setConfigOpen(false)}>Cancelar</button><button className="button primary" disabled={configSaving}>{configSaving ? "Guardando..." : "Guardar"}</button></div>
        </form>
      </Dialog>
      <ConfirmModal open={confirmation !== null} title={confirmation?.title ?? ""} body={confirmation?.body ?? ""} confirmLabel={confirmation?.confirmLabel ?? "Confirmar"} onClose={() => setConfirmation(null)} onConfirm={() => { const request = confirmation; setConfirmation(null); if (!request) return; return request.action().then(() => notify(request.successMessage)).catch((reason) => { notify(errorMessage(reason), "error"); throw reason; }); }} />
    </div>
  );
}

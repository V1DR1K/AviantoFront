"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownUp, ArrowRightLeft, Eye, FileText, Filter, LogIn, Plus, Settings2 } from "lucide-react";
import { api } from "../lib/api";
import { integerInput, money, parseIntegerInput } from "../lib/format";
import { formatDateInAr, todayInAr } from "../lib/dates";
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
  VentaFichaResponse,
} from "../lib/types";
import { Dialog, EmptyState, FilterBar, Pagination, SelectField, StatusBadge, type Notify } from "./ui";
import { AviantoTabs, ServiceCard, VehicleField } from "./avianto-mobile";

const date = formatDateInAr;
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible cargar la información.";
const fichaStates = ["Pendiente", "En proceso", "En revisión", "Terminada", "Entregada", "Cancelada"] as const;
const pagoStates: PagoStatus[] = ["No pagado", "Parcial", "Pagado"];
const repuestoStates: RepuestoState[] = ["En curso", "Completado", "Cancelado"];

export function MotoDetail({
  id,
  initialTab,
  onBack,
  onOpenFicha,
  onOpenSale,
  onOpenRepuesto,
  onNewFicha,
  onNewRepuesto,
  onIntake,
  notify,
}: {
  id: string;
  initialTab?: "general" | "client" | "services" | "fichas" | "repuestos" | "venta";
  onBack: () => void;
  onOpenFicha: (ficha: FichaResponse) => void;
  onOpenSale: (id: string) => void;
  onOpenRepuesto: (repuesto: RepuestoResponse) => void;
  onNewFicha: (prefill: { motoId: string; clienteId?: string | null }) => void;
  onNewRepuesto: (prefill: { motoId: string; clienteId?: string | null; fichaId?: string }) => void;
  onIntake: (plate?: string) => void;
  notify: Notify;
}) {
  const [tab, setTab] = useState<"general" | "client" | "services" | "fichas" | "repuestos" | "venta">(initialTab ?? "general");
  const [moto, setMoto] = useState<MotovehiculoResponse | null>(null);
  const [client, setClient] = useState<ClienteResponse | null>(null);
  const [transfers, setTransfers] = useState<TransferResponse[]>([]);
  const [services, setServices] = useState<PageResponse<ServiceResponse> | null>(null);
  const [nextService, setNextService] = useState<NextServiceResponse | null>(null);
  const [fichas, setFichas] = useState<PageResponse<FichaResponse> | null>(null);
  const [repuestos, setRepuestos] = useState<PageResponse<RepuestoResponse> | null>(null);
  const [saleFicha, setSaleFicha] = useState<VentaFichaResponse | null>(null);
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
  const [circuitTarget, setCircuitTarget] = useState<"TALLER" | "VENTA" | null>(null);
  const [circuitReason, setCircuitReason] = useState("");
  const [circuitSaving, setCircuitSaving] = useState(false);

  const load = useCallback((signal?: AbortSignal) =>
    void api<MotovehiculoResponse>(`/motovehiculos/${id}`, { signal })
      .then((next) => { setMoto(next); if (next.propietarioId) void api<ClienteResponse>(`/clientes/${next.propietarioId}`, { signal }).then(setClient).catch(() => { if (!signal?.aborted) setClient(null); }); })
       .catch((reason) => { if (!signal?.aborted) { setError(errorMessage(reason)); notify(errorMessage(reason), "error"); } }), [id, notify]);
  const panelError = (key: string, reason: unknown) => setPanelErrors((current) => ({ ...current, [key]: errorMessage(reason) }));
  const loadServices = useCallback((signal?: AbortSignal) => void api<PageResponse<ServiceResponse>>(`/motovehiculos/${id}/services/historial`, { signal }, { fechaDesde: serviceDesde || undefined, fechaHasta: serviceHasta || undefined, page: servicePage - 1, size: 10, sortBy: serviceSort, direction: serviceDirection }).then((value) => { setServices(value); setPanelErrors((current) => ({ ...current, services: "" })); }).catch((reason) => { if (!signal?.aborted) panelError("services", reason); }), [id, serviceDesde, serviceHasta, servicePage, serviceSort, serviceDirection]);
  const loadFichas = useCallback((signal?: AbortSignal) => void api<PageResponse<FichaResponse>>("/fichas", { signal }, { motoId: id, fechaDesde: fichaDesde || undefined, fechaHasta: fichaHasta || undefined, estado: fichaEstado || undefined, estadoPago: fichaPago || undefined, page: fichaPage - 1, size: 10, sortBy: fichaSort, direction: fichaDirection }).then((value) => { setFichas(value); setPanelErrors((current) => ({ ...current, fichas: "" })); }).catch((reason) => { if (!signal?.aborted) panelError("fichas", reason); }), [id, fichaDesde, fichaHasta, fichaEstado, fichaPago, fichaPage, fichaSort, fichaDirection]);
  const loadRepuestos = useCallback((signal?: AbortSignal) => void api<PageResponse<RepuestoResponse>>("/repuestos", { signal }, { motoId: id, fechaDesde: repuestoDesde || undefined, fechaHasta: repuestoHasta || undefined, estado: repuestoEstado || undefined, estadoPago: repuestoPago || undefined, page: repuestoPage - 1, size: 10, sortBy: repuestoSort, direction: repuestoDirection }).then((value) => { setRepuestos(value); setPanelErrors((current) => ({ ...current, repuestos: "" })); }).catch((reason) => { if (!signal?.aborted) panelError("repuestos", reason); }), [id, repuestoDesde, repuestoHasta, repuestoEstado, repuestoPago, repuestoPage, repuestoSort, repuestoDirection]);
  const loadNext = useCallback((signal?: AbortSignal) => void api<NextServiceResponse[]>("/services/proximos", { signal }).then((list) => { setNextService(list.find((next) => next.motoId === id) ?? null); setPanelErrors((current) => ({ ...current, next: "" })); }).catch((reason) => { if (!signal?.aborted) panelError("next", reason); }), [id]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => { const controller = new AbortController(); loadServices(controller.signal); return () => controller.abort(); }, [loadServices]);
  useEffect(() => { const controller = new AbortController(); loadFichas(controller.signal); return () => controller.abort(); }, [loadFichas]);
  useEffect(() => { const controller = new AbortController(); loadRepuestos(controller.signal); return () => controller.abort(); }, [loadRepuestos]);
  useEffect(() => {
    const controller = new AbortController();
    loadNext(controller.signal);
    void api<TransferResponse[]>(`/motovehiculos/${id}/transferencias`, { signal: controller.signal }).then(setTransfers).catch(() => undefined);
    return () => controller.abort();
  }, [id, loadNext]);
  useEffect(() => {
    if (moto?.seccion !== "Venta") return;
    const controller = new AbortController();
    void api<VentaFichaResponse>(`/motovehiculos/${id}/venta`, { signal: controller.signal }).then(setSaleFicha).catch(() => { if (!controller.signal.aborted) setSaleFicha(null); });
    return () => controller.abort();
  }, [id, moto?.seccion]);

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
  const openCircuitChange = () => {
    if (!moto) return;
    setCircuitTarget(moto.seccion === "Venta" ? "TALLER" : "VENTA");
    setCircuitReason("");
  };
  const saveCircuitChange = async () => {
    if (!circuitTarget || !circuitReason.trim() || circuitSaving) return;
    setCircuitSaving(true);
    try {
      const next = await api<MotovehiculoResponse>(`/motovehiculos/${id}/circuito`, {
        method: "PATCH",
        body: JSON.stringify({ seccion: circuitTarget, motivo: circuitReason.trim() }),
      });
      setMoto(next);
      setCircuitTarget(null);
      setCircuitReason("");
      setTab("general");
      notify(circuitTarget === "TALLER" ? "La moto volvió al circuito Taller." : "La moto pasó al circuito Ventas.");
    } catch (reason) {
      notify(errorMessage(reason), "error");
    } finally {
      setCircuitSaving(false);
    }
  };
  if (error) return <div className="page"><button className="back" onClick={onBack}>← Volver</button><EmptyState title="No se pudo cargar la moto" body="Revisá la notificación y volvé a intentar." action={<button className="button secondary" onClick={load}>Reintentar</button>} /></div>;
  if (!moto) return <div className="page"><div className="table-loading" role="status">Cargando moto...</div></div>;

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "general", label: "Datos" },
    { id: "client", label: "Clientes" },
    { id: "services", label: "Service" },
    { id: "fichas", label: "Ficha" },
    { id: "repuestos", label: "Repuestos" },
    ...(moto.seccion === "Venta" ? [{ id: "venta" as const, label: "Venta" }] : []),
  ];
  const latestFicha = fichas?.content[0] ?? null;
  const latestService = servicePage === 1 ? services?.content[0] ?? null : null;
  const serviceHistory = servicePage === 1 ? services?.content.slice(1) ?? [] : services?.content ?? [];
  const serviceInterval = moto.kmServicePeriodo ?? null;
  return (
    <div className="page avianto-detail-page">
      <header className="moto-profile-hero">
        <button className="moto-profile-back" onClick={onBack}><span aria-hidden="true">←</span> Volver a perfiles</button>
        <div className="moto-profile-hero-inner">
          <h1>{moto.patente}</h1>
          <div className="moto-profile-summary" aria-label="Resumen de la moto">
            <VehicleField label="Moto" value={moto.marca} />
            <VehicleField label="Modelo" value={moto.modelo} />
            <VehicleField label="Km" value={moto.kilometraje?.toLocaleString("es-AR") ?? "—"} />
          </div>
          <div className="moto-profile-actions">
            {!moto.ingresada ? <button className="moto-profile-action" onClick={() => onIntake(moto.patente)}><LogIn size={20} />Ingresar moto</button> : moto.seccion === "Venta" ? <button className="moto-profile-action" onClick={() => saleFicha ? onOpenSale(saleFicha.id) : setTab("venta")}><FileText size={20} />Abrir ficha de venta</button> : moto.seccion === "Taller" ? <button className="moto-profile-action" onClick={() => setTab("fichas")}><FileText size={20} />Abrir ficha taller</button> : <span className="moto-profile-note">La entrega se completa desde la ficha terminada</span>}
            {moto.ingresada && moto.seccion && <button className="moto-profile-action" onClick={openCircuitChange}><ArrowRightLeft size={20} />{moto.seccion === "Venta" ? "Pasar a taller" : "Pasar a ventas"}</button>}
          </div>
          <div className="moto-profile-state"><span>Estado</span><StatusBadge status={moto.estado} /></div>
        </div>
      </header>
      <AviantoTabs tabs={tabs} active={tab} onChange={(value) => setTab(value as typeof tab)} />
      <div id="moto-tab-panel" className="moto-profile-content" role="tabpanel" tabIndex={0} aria-label={tabs.find((item) => item.id === tab)?.label}>
      {tab === "general" && (
        <section className="moto-profile-panel moto-profile-general">
          <h2 className="moto-section-title">Datos del vehículo</h2>
          <div className="moto-profile-fields">
            <VehicleField label="Moto" value={moto.marca} />
            <VehicleField label="Modelo" value={moto.modelo} />
            <VehicleField label="Año" value={moto.anio ?? "—"} />
            <VehicleField label="Cliente" value={moto.propietario ?? "Sin propietario"} />
            <VehicleField label="Estado" value={<StatusBadge status={moto.estado} />} tone="red" />
            <VehicleField label="Km" value={moto.kilometraje?.toLocaleString("es-AR") ?? "—"} />
            <VehicleField label="Fecha ingreso" value={date(latestFicha?.fechaIngreso)} />
            <VehicleField label="Ficha" value={latestFicha?.numero ?? "—"} />
          </div>
          {moto.observaciones && <div className="moto-profile-observations"><strong>Observaciones</strong><p>{moto.observaciones}</p></div>}
        </section>
      )}
      {tab === "client" && (
        <section className="moto-profile-panel moto-profile-client">
          <div className="moto-client-current">
            <h2 className="moto-section-title">Cliente actual</h2>
            <div className="moto-client-grid">
              <VehicleField label="Cliente" value={moto.propietario ?? "—"} />
              <VehicleField label="Teléfono" value={client?.telefono ?? "—"} />
              <VehicleField label="Dirección" value={client?.direccion ?? "—"} />
            </div>
          </div>
          <div className="moto-transfer-history">
            <h3 className="moto-section-title">Historial de transferencias</h3>
            {transfers.length ? <div className="moto-transfer-list">{transfers.map((transfer) => <article key={transfer.id} className="moto-transfer-card">
              <VehicleField label="Cliente" value={transfer.clienteAnterior} />
              <VehicleField label="Transferido a" value={transfer.clienteNuevo} />
              <VehicleField label="Desde" value={date(transfer.createdAt)} />
              <VehicleField label="Hasta" value={date(transfer.fechaTransferencia ?? transfer.finalizadaAt)} />
            </article>)}</div> : <EmptyState title="Sin transferencias" body="Esta moto todavía no registra transferencias." />}
          </div>
        </section>
      )}
      {tab === "venta" && moto.seccion === "Venta" && (
        <section className="moto-profile-panel sale-profile-entry">
           <div className="panel-head"><div><h2>Ficha de venta</h2><p>Carpeta, comprador y transferencia se gestionan desde una única ficha trazable.</p></div>{saleFicha && <button className="button primary" onClick={() => onOpenSale(saleFicha.id)}><FileText size={17} />Abrir ficha de venta</button>}</div>
          {saleFicha ? <dl className="record-detail"><div><dt>Ficha</dt><dd>{saleFicha.numero}</dd></div><div><dt>Estado</dt><dd><StatusBadge status={saleFicha.estado} /></dd></div><div><dt>Vendedor actual</dt><dd>{saleFicha.vendedor}</dd></div><div><dt>{saleFicha.estado === "Vendida" ? "Comprador final" : "Comprador prospectivo"}</dt><dd>{saleFicha.comprador ?? "Sin seleccionar"}</dd></div><div><dt>Carpeta de transferencia</dt><dd>{saleFicha.obligatoriosCompletos ? "Completa" : "Incompleta"}</dd></div><div><dt>Cita</dt><dd>{saleFicha.transferencia?.citaFecha ? `${date(saleFicha.transferencia.citaFecha)} · ${saleFicha.transferencia.citaHora?.slice(0, 5) ?? "—"}` : "Sin programar"}</dd></div></dl> : <div className="table-loading" role="status">Cargando resumen de venta...</div>}
        </section>
      )}
      {tab === "services" && (
        <section className="moto-profile-panel moto-profile-services">
          <div className="moto-service-head"><h2 className="moto-section-title">Último service</h2><button className="button secondary moto-service-config" onClick={openConfig}><Settings2 size={18} />Configurar periodos</button></div>
          <div className="moto-service-feature">
            <div className="moto-service-feature-grid">
              <VehicleField label="Fecha" value={date(latestService?.fecha ?? moto.fechaUltimoService)} />
              <VehicleField label="Km" value={(latestService?.kilometraje ?? moto.kmUltimoService)?.toLocaleString("es-AR") ?? "—"} />
              <VehicleField label="Próx. service" value={nextService?.proximaFecha ? date(nextService.proximaFecha) : serviceInterval ? `+${serviceInterval.toLocaleString("es-AR")} km` : "—"} />
              <VehicleField label="Próx. km" value={nextService?.proximKm?.toLocaleString("es-AR") ?? "—"} />
            </div>
            <div className="moto-service-notes"><strong>Observaciones ↓</strong><p>{latestService?.observaciones || moto.serviceObservaciones || "Sin observaciones."}</p></div>
          </div>
          <button className="moto-service-new" disabled={serviceSaving} onClick={() => { setServiceKm(moto.kilometraje != null ? String(moto.kilometraje) : ""); setServiceDate(todayInAr()); setServiceOpen(true); }}><Plus size={19} />Nuevo service</button>
          <h3 className="moto-section-title moto-history-title">Historial</h3>
          <div className="moto-service-filters"><FilterBar activeCount={(serviceDesde ? 1 : 0) + (serviceHasta ? 1 : 0) + (serviceSort !== "fecha" ? 1 : 0)}>
             <label><span className="date-label">Desde</span><input type="date" value={serviceDesde} onChange={(event) => { setServiceDesde(event.target.value); setServicePage(1); }} /></label>
             <label><span className="date-label">Hasta</span><input type="date" value={serviceHasta} onChange={(event) => { setServiceHasta(event.target.value); setServicePage(1); }} /></label>
              <SelectField value={serviceSort} onChange={(value) => { setServiceSort(value); setServicePage(1); }} options={[{ value: "fecha", label: "Fecha" }, { value: "kilometraje", label: "Kilometraje" }]} icon={Filter} ariaLabel="Ordenar services por" />
             <button className="button secondary" onClick={() => { setServiceDirection((value) => value === "ASC" ? "DESC" : "ASC"); setServicePage(1); }} aria-label="Cambiar orden de services"><ArrowDownUp size={16} />{serviceDirection === "DESC" ? "Más recientes" : "Más antiguos"}</button>
           </FilterBar></div>
           {panelErrors.services ? <EmptyState title="No se pudo cargar el historial" body={panelErrors.services} action={<button className="button secondary" onClick={loadServices}>Reintentar</button>} /> : serviceHistory.length ? <div className="moto-service-history">{serviceHistory.map((service) => <ServiceCard key={service.id} date={date(service.fecha)} km={service.kilometraje.toLocaleString("es-AR")} next={serviceInterval ? `+${serviceInterval.toLocaleString("es-AR")} km` : "—"} nextKm={serviceInterval ? (service.kilometraje + serviceInterval).toLocaleString("es-AR") : "—"} notes={service.observaciones} />)}</div> : <EmptyState title="Sin historial anterior" body="El último service registrado se muestra arriba." />}
          <Pagination page={servicePage} total={services?.totalPages || 1} onPage={setServicePage} />
        </section>
      )}
      {tab === "fichas" && (
        <section className="moto-profile-panel table-panel moto-profile-table">
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
        <section className="moto-profile-panel table-panel moto-profile-table">
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
      </div>
      <Dialog open={serviceOpen} title="Registrar Service" className="service-modal" onClose={() => setServiceOpen(false)} dirty={Boolean(serviceNotes)}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void addService(); }}>
          <label>Fecha<input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} /></label>
          <label>Kilometraje<input type="text" inputMode="numeric" value={integerInput(serviceKm)} onChange={(event) => setServiceKm(event.target.value)} required /></label>
          <div className="service-modal-summary"><VehicleField label="Próx. service" value={nextService?.proximaFecha ? date(nextService.proximaFecha) : "Sin referencia"} /><VehicleField label="Próx. km" value={nextService?.proximKm?.toLocaleString("es-AR") ?? "—"} /></div>
          <label className="service-modal-notes">Observaciones<textarea value={serviceNotes} onChange={(event) => setServiceNotes(event.target.value)} placeholder="Ej: cambio de aceite y filtros" /></label>
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
      <Dialog open={circuitTarget !== null} title={circuitTarget === "TALLER" ? "Pasar moto a Taller" : "Pasar moto a Ventas"} onClose={() => { if (!circuitSaving) setCircuitTarget(null); }} dirty={Boolean(circuitReason)}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void saveCircuitChange(); }}>
          <p className="form-notice">El cambio conserva el historial. Solo se permite cuando no hay ficha abierta, repuestos activos, pagos vigentes ni transferencia activa. Al volver a Taller, la ficha de venta abierta queda cancelada y auditada.</p>
          <label className="form-field-wide">Motivo del cambio<textarea value={circuitReason} maxLength={500} onChange={(event) => setCircuitReason(event.target.value)} placeholder="Ej.: se seleccionó el circuito incorrecto al ingresar la moto" required /></label>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setCircuitTarget(null)} disabled={circuitSaving}>Cancelar</button><button className="button primary" disabled={!circuitReason.trim() || circuitSaving}>{circuitSaving ? "Guardando..." : "Confirmar cambio"}</button></div>
        </form>
      </Dialog>
    </div>
  );
}
